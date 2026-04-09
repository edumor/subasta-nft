const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// ─── Constants ────────────────────────────────────────────────────────────────
const ETH_PRICE_USD  = 3_000n;
const INITIAL_PRICE  = ETH_PRICE_USD * 10n ** 8n; // 8-decimal Chainlink feed
const ONE_ETHER      = ethers.parseEther("1");
const DURATION_SECS  = 3600n;   // 1 hour in seconds
const ROYALTY_BPS    = 250n;    // 2.5%
const REFUND_FEE_BPS = 200n;    // 2%
const BPS_BASE       = 10_000n;
const ONE_MIN        = 60n;
const TEN_MIN        = 600n;

// ─── Helper: deploy a full auction ───────────────────────────────────────────
async function setupAuction(overrides = {}) {
  const [deployer, seller, bidder1, bidder2, bidder3, royaltyRecipient] =
    await ethers.getSigners();

  const MockNFT        = await ethers.getContractFactory("MockNFT");
  const MockERC20      = await ethers.getContractFactory("MockERC20");
  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const AuctionNFT     = await ethers.getContractFactory("AuctionNFT");

  const nft  = await MockNFT.deploy();
  const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
  const feed = await MockV3Aggregator.deploy(8, INITIAL_PRICE);

  // Mint NFT to seller
  const tokenId = await nft.mint.staticCall(seller.address);
  await nft.mint(seller.address);

  // Fund bidders with WETH
  const BIDDER_BALANCE = ethers.parseEther("100");
  await weth.mint(bidder1.address, BIDDER_BALANCE);
  await weth.mint(bidder2.address, BIDDER_BALANCE);
  await weth.mint(bidder3.address, BIDDER_BALANCE);

  // Compute start / end times
  const now       = BigInt(await time.latest());
  const startTime = overrides.startTime ?? 0n;          // 0 = immediate
  const duration  = overrides.duration  ?? DURATION_SECS;
  const resolvedStart = startTime === 0n ? now : startTime;
  const endTime   = overrides.endTime   ?? (resolvedStart + duration);

  const royaltyBps = overrides.royaltyBps ?? ROYALTY_BPS;

  const auction = await AuctionNFT.connect(seller).deploy(
    await nft.getAddress(),
    tokenId,
    await weth.getAddress(),
    await feed.getAddress(),
    startTime,   // _startTime (0 = start immediately)
    endTime,     // _endTime   (unix timestamp)
    royaltyRecipient.address,
    royaltyBps
  );

  // Transfer NFT to auction contract (unless overrides.skipNFTDeposit)
  if (!overrides.skipNFTDeposit) {
    await nft
      .connect(seller)
      .safeTransferFrom(seller.address, await auction.getAddress(), tokenId);
  }

  // Convenience: approve + bid in one call
  const placeBid = async (bidder, amount) => {
    await weth.connect(bidder).approve(await auction.getAddress(), amount);
    return auction.connect(bidder).bid(amount);
  };

  return {
    deployer, seller, bidder1, bidder2, bidder3, royaltyRecipient,
    nft, weth, feed, auction, tokenId,
    startTime: resolvedStart, endTime,
    placeBid,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("AuctionNFT", function () {

  // ── 1. Deployment ──────────────────────────────────────────────────────────
  describe("Deployment", function () {

    it("stores seller, nft, tokenId, paymentToken, priceFeed", async function () {
      const { seller, nft, weth, feed, auction, tokenId } = await setupAuction();
      expect(await auction.seller()).to.equal(seller.address);
      expect(await auction.nftContract()).to.equal(await nft.getAddress());
      expect(await auction.nftTokenId()).to.equal(tokenId);
      expect(await auction.paymentToken()).to.equal(await weth.getAddress());
      expect(await auction.priceFeed()).to.equal(await feed.getAddress());
    });

    it("stores royalty recipient and bps", async function () {
      const { auction, royaltyRecipient } = await setupAuction();
      expect(await auction.royaltyRecipient()).to.equal(royaltyRecipient.address);
      expect(await auction.royaltyBps()).to.equal(ROYALTY_BPS);
    });

    it("sets auctionEndTime ≈ now + duration", async function () {
      const { auction, endTime } = await setupAuction();
      expect(await auction.auctionEndTime()).to.equal(endTime);
    });

    it("startTime = block.timestamp when _startTime = 0", async function () {
      const { auction } = await setupAuction({ startTime: 0n });
      const now = BigInt(await time.latest());
      expect(await auction.startTime()).to.be.closeTo(now, 2n);
    });

    it("accepts a future startTime and starts in pending state", async function () {
      const now        = BigInt(await time.latest());
      const futureStart = now + 3600n;   // 1 hour from now
      const futureEnd   = futureStart + DURATION_SECS;
      const { auction } = await setupAuction({ startTime: futureStart, endTime: futureEnd });
      expect(await auction.startTime()).to.equal(futureStart);
      expect(await auction.isPending()).to.equal(true);
    });

    it("reverts when _endTime is in the past", async function () {
      const [seller] = await ethers.getSigners();
      const MockNFT  = await ethers.getContractFactory("MockNFT");
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const MockV3   = await ethers.getContractFactory("MockV3Aggregator");
      const AuctionNFT = await ethers.getContractFactory("AuctionNFT");
      const nft  = await MockNFT.deploy();
      const weth = await MockERC20.deploy("W","W",18);
      const feed = await MockV3.deploy(8, INITIAL_PRICE);
      const pastTime = BigInt(await time.latest()) - 1n;
      await expect(
        AuctionNFT.connect(seller).deploy(
          await nft.getAddress(), 0, await weth.getAddress(),
          await feed.getAddress(), 0, pastTime, seller.address, 250
        )
      ).to.be.revertedWith("AuctionNFT: end time in past");
    });

    it("reverts on royalty > 10%", async function () {
      const [seller] = await ethers.getSigners();
      const MockNFT = await ethers.getContractFactory("MockNFT");
      const nft  = await MockNFT.deploy();
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const weth = await MockERC20.deploy("W","W",18);
      const MockV3 = await ethers.getContractFactory("MockV3Aggregator");
      const feed = await MockV3.deploy(8, INITIAL_PRICE);
      const AuctionNFT = await ethers.getContractFactory("AuctionNFT");
      const endTime = BigInt(await time.latest()) + 3600n;
      await expect(
        AuctionNFT.connect(seller).deploy(
          await nft.getAddress(), 0, await weth.getAddress(),
          await feed.getAddress(), 0, endTime, seller.address, 1001
        )
      ).to.be.revertedWith("AuctionNFT: royalty too high");
    });

    it("holds the NFT after deposit", async function () {
      const { auction, nft, tokenId } = await setupAuction();
      expect(await nft.ownerOf(tokenId)).to.equal(await auction.getAddress());
      expect(await auction.isNFTDeposited()).to.equal(true);
    });

    it("isNFTDeposited returns false when NFT not deposited", async function () {
      const { auction } = await setupAuction({ skipNFTDeposit: true });
      expect(await auction.isNFTDeposited()).to.equal(false);
    });
  });

  // ── 2. Bidding ──────────────────────────────────────────────────────────────
  describe("Bidding", function () {

    it("accepts a valid first bid and emits NewBid", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      await expect(placeBid(bidder1, ONE_ETHER))
        .to.emit(auction, "NewBid")
        .withArgs(bidder1.address, ONE_ETHER, (usd) => usd > 0n);
      expect(await auction.highestBid()).to.equal(ONE_ETHER);
      expect(await auction.highestBidder()).to.equal(bidder1.address);
    });

    it("transfers ERC-20 tokens from bidder to contract", async function () {
      const { auction, weth, bidder1, placeBid } = await setupAuction();
      const before = await weth.balanceOf(await auction.getAddress());
      await placeBid(bidder1, ONE_ETHER);
      const after = await weth.balanceOf(await auction.getAddress());
      expect(after - before).to.equal(ONE_ETHER);
    });

    it("allows a second bidder to outbid by ≥ 5%", async function () {
      const { auction, bidder1, bidder2, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      const minBid = ONE_ETHER + (ONE_ETHER * 500n) / BPS_BASE + 1n;
      await placeBid(bidder2, minBid);
      expect(await auction.highestBidder()).to.equal(bidder2.address);
    });

    it("allows cumulative bids from the same user", async function () {
      const { auction, bidder1, bidder2, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      await placeBid(bidder2, ethers.parseEther("1.1"));
      await time.increase(Number(ONE_MIN) + 1);
      // bidder1 adds 0.2 ETH → total 1.2 ETH > 1.1 + 5%
      await placeBid(bidder1, ethers.parseEther("0.2"));
      expect(await auction.highestBidder()).to.equal(bidder1.address);
      expect(await auction.highestBid()).to.equal(ethers.parseEther("1.2"));
    });

    it("reverts if seller tries to bid", async function () {
      const { auction, seller, weth } = await setupAuction();
      await weth.mint(seller.address, ONE_ETHER);
      await weth.connect(seller).approve(await auction.getAddress(), ONE_ETHER);
      await expect(auction.connect(seller).bid(ONE_ETHER))
        .to.be.revertedWith("AuctionNFT: seller cannot bid");
    });

    it("reverts on zero amount", async function () {
      const { auction, bidder1, weth } = await setupAuction();
      await weth.connect(bidder1).approve(await auction.getAddress(), ONE_ETHER);
      await expect(auction.connect(bidder1).bid(0n))
        .to.be.revertedWith("AuctionNFT: zero amount");
    });

    it("reverts if increment < 5%", async function () {
      const { auction, bidder1, bidder2, weth, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await weth.connect(bidder2).approve(await auction.getAddress(), ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      await expect(auction.connect(bidder2).bid(ONE_ETHER))
        .to.be.revertedWith("AuctionNFT: bid too low (min 5% increment)");
    });

    it("reverts if current highest bidder tries to bid again", async function () {
      const { auction, bidder1, weth, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await weth.connect(bidder1).approve(await auction.getAddress(), ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      await expect(auction.connect(bidder1).bid(ONE_ETHER))
        .to.be.revertedWith("AuctionNFT: already highest bidder");
    });

    it("reverts if same bidder bids again before 1 minute", async function () {
      const { auction, bidder1, bidder2, weth, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await placeBid(bidder2, ethers.parseEther("1.1"));
      await weth.connect(bidder1).approve(await auction.getAddress(), ONE_ETHER);
      await expect(auction.connect(bidder1).bid(ONE_ETHER))
        .to.be.revertedWith("AuctionNFT: wait 1 min between bids");
    });

    it("reverts after auctionEndTime passes", async function () {
      const { auction, bidder1, weth } = await setupAuction();
      await time.increase(Number(DURATION_SECS) + 1);
      await weth.connect(bidder1).approve(await auction.getAddress(), ONE_ETHER);
      await expect(auction.connect(bidder1).bid(ONE_ETHER))
        .to.be.revertedWith("AuctionNFT: auction ended");
    });

    it("reverts if auction not started yet (pending)", async function () {
      const now         = BigInt(await time.latest());
      const futureStart = now + 3600n;
      const futureEnd   = futureStart + DURATION_SECS;
      const { auction, bidder1, weth } = await setupAuction({ startTime: futureStart, endTime: futureEnd });
      await weth.connect(bidder1).approve(await auction.getAddress(), ONE_ETHER);
      await expect(auction.connect(bidder1).bid(ONE_ETHER))
        .to.be.revertedWith("AuctionNFT: auction not started yet");
    });

    // ── NFT custody guard ───────────────────────────────────────────────────
    it("reverts bid if NFT not deposited in contract", async function () {
      const { auction, bidder1, weth } = await setupAuction({ skipNFTDeposit: true });
      await weth.connect(bidder1).approve(await auction.getAddress(), ONE_ETHER);
      await expect(auction.connect(bidder1).bid(ONE_ETHER))
        .to.be.revertedWith("AuctionNFT: NFT not deposited in contract");
    });
  });

  // ── 3. Auto-extension (closes ≤ endTime + 10 min) ────────────────────────
  describe("Auto-extension — closes at most endTime + 10 min", function () {

    it("extends by 10 min when a bid arrives in the last 10 minutes", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      const endTime = await auction.auctionEndTime();
      // Jump to 5 min before close
      await time.increaseTo(Number(endTime) - 5 * 60);
      const prevEnd = await auction.auctionEndTime();
      await placeBid(bidder1, ONE_ETHER);
      const newEnd = await auction.auctionEndTime();
      expect(newEnd - prevEnd).to.equal(TEN_MIN);
    });

    it("emits AuctionExtended with the new endTime", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      const endTime = await auction.auctionEndTime();
      await time.increaseTo(Number(endTime) - 5 * 60);
      await expect(placeBid(bidder1, ONE_ETHER))
        .to.emit(auction, "AuctionExtended");
    });

    it("does NOT extend when bid arrives early (> 10 min remaining)", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      const prevEnd = await auction.auctionEndTime();
      await placeBid(bidder1, ONE_ETHER);
      expect(await auction.auctionEndTime()).to.equal(prevEnd);
    });

    it("caps total extension at exactly 10 minutes beyond original endTime", async function () {
      const { auction, bidder1, bidder2, bidder3, placeBid } = await setupAuction();
      const originalEnd = await auction.auctionEndTime();

      // First bid: 5 min before close → extends 10 min
      await time.increaseTo(Number(originalEnd) - 5 * 60);
      await placeBid(bidder1, ONE_ETHER);
      expect(await auction.auctionEndTime()).to.equal(originalEnd + TEN_MIN);

      // Second bid: now in the extended window — should NOT extend again (cap reached)
      await time.increase(Number(ONE_MIN) + 1);
      const before2 = await auction.auctionEndTime();
      await placeBid(bidder2, ethers.parseEther("1.1"));
      expect(await auction.auctionEndTime()).to.equal(before2); // no further extension

      // Third bid: same — cap already hit
      await time.increase(Number(ONE_MIN) + 1);
      const before3 = await auction.auctionEndTime();
      await placeBid(bidder3, ethers.parseEther("1.3"));
      expect(await auction.auctionEndTime()).to.equal(before3);

      // Final close = originalEnd + 10 min (exactly)
      expect(await auction.auctionEndTime()).to.equal(originalEnd + TEN_MIN);
    });

    it("auction is fully closed right after endTime + 10 min", async function () {
      const { auction, bidder1, weth, placeBid } = await setupAuction();
      const originalEnd = await auction.auctionEndTime();

      // Trigger the extension
      await time.increaseTo(Number(originalEnd) - 5 * 60);
      await placeBid(bidder1, ONE_ETHER);

      // Jump past originalEnd + 10 min
      await time.increaseTo(Number(originalEnd) + Number(TEN_MIN) + 1);
      expect(await auction.timeRemaining()).to.equal(0n);

      // No more bids accepted
      await weth.connect(bidder1).approve(await auction.getAddress(), ONE_ETHER);
      await expect(auction.connect(bidder1).bid(ONE_ETHER))
        .to.be.revertedWith("AuctionNFT: auction ended");
    });
  });

  // ── 4. Partial withdraw ───────────────────────────────────────────────────
  describe("Partial withdraw", function () {

    it("reverts when there is no excess deposit", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await expect(auction.connect(bidder1).partialWithdraw())
        .to.be.revertedWith("AuctionNFT: no excess to withdraw");
    });

    it("reverts after auction ends", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(DURATION_SECS) + 1);
      await expect(auction.connect(bidder1).partialWithdraw())
        .to.be.revertedWith("AuctionNFT: auction ended");
    });
  });

  // ── 5. Settlement ─────────────────────────────────────────────────────────
  describe("Settlement", function () {

    it("transfers NFT to winner", async function () {
      const { auction, nft, bidder1, bidder2, tokenId, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      await placeBid(bidder2, ethers.parseEther("1.1"));
      await time.increase(Number(DURATION_SECS) + 1);
      await auction.settleAuction();
      expect(await nft.ownerOf(tokenId)).to.equal(bidder2.address);
    });

    it("pays royalty to royaltyRecipient", async function () {
      const { auction, weth, bidder1, royaltyRecipient, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(DURATION_SECS) + 1);
      const before = await weth.balanceOf(royaltyRecipient.address);
      await auction.settleAuction();
      const expectedRoyalty = (ONE_ETHER * ROYALTY_BPS) / BPS_BASE;
      expect(await weth.balanceOf(royaltyRecipient.address) - before).to.equal(expectedRoyalty);
    });

    it("pays correct amount to seller after royalty", async function () {
      const { auction, weth, seller, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(DURATION_SECS) + 1);
      const before = await weth.balanceOf(seller.address);
      await auction.settleAuction();
      const royalty = (ONE_ETHER * ROYALTY_BPS) / BPS_BASE;
      expect(await weth.balanceOf(seller.address) - before).to.equal(ONE_ETHER - royalty);
    });

    it("emits AuctionEnded, RoyaltyPaid, SellerPaid", async function () {
      const { auction, bidder1, royaltyRecipient, seller, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(DURATION_SECS) + 1);
      await expect(auction.settleAuction())
        .to.emit(auction, "AuctionEnded")
        .and.to.emit(auction, "RoyaltyPaid").withArgs(royaltyRecipient.address, (v) => v > 0n)
        .and.to.emit(auction, "SellerPaid").withArgs(seller.address, (v) => v > 0n);
    });

    it("reverts if settled twice", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(DURATION_SECS) + 1);
      await auction.settleAuction();
      await expect(auction.settleAuction()).to.be.revertedWith("AuctionNFT: already settled");
    });

    it("reverts if no bids", async function () {
      const { auction } = await setupAuction();
      await time.increase(Number(DURATION_SECS) + 1);
      await expect(auction.settleAuction()).to.be.revertedWith("AuctionNFT: no bids");
    });
  });

  // ── 6. reclaimNFT — recover NFT when auction ends with zero bids ──────────
  describe("reclaimNFT — zero-bid recovery", function () {

    it("seller reclaims NFT if auction expired with no bids", async function () {
      const { auction, seller, nft, tokenId } = await setupAuction();
      await time.increase(Number(DURATION_SECS) + 1);
      await expect(auction.connect(seller).reclaimNFT())
        .to.emit(auction, "NFTReclaimed");
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
    });

    it("reclaimNFT reverts if there were bids", async function () {
      const { auction, seller, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(DURATION_SECS) + 1);
      await expect(auction.connect(seller).reclaimNFT())
        .to.be.revertedWith("AuctionNFT: auction has bids — use settleAuction");
    });

    it("reclaimNFT reverts before auction ends", async function () {
      const { auction, seller } = await setupAuction();
      await expect(auction.connect(seller).reclaimNFT())
        .to.be.revertedWith("AuctionNFT: not ended yet");
    });

    it("reclaimNFT reverts if NFT already reclaimed", async function () {
      const { auction, seller } = await setupAuction();
      await time.increase(Number(DURATION_SECS) + 1);
      await auction.connect(seller).reclaimNFT();
      await expect(auction.connect(seller).reclaimNFT())
        .to.be.revertedWith("AuctionNFT: NFT already transferred");
    });

    it("non-seller cannot call reclaimNFT", async function () {
      const { auction, bidder1 } = await setupAuction();
      await time.increase(Number(DURATION_SECS) + 1);
      await expect(auction.connect(bidder1).reclaimNFT())
        .to.be.revertedWith("AuctionNFT: not seller");
    });
  });

  // ── 7. Cancellation ───────────────────────────────────────────────────────
  describe("Cancellation", function () {

    // cancelAuction — during active period
    it("seller cancels active auction with no bids, NFT returned", async function () {
      const { auction, seller, nft, tokenId } = await setupAuction();
      await expect(auction.connect(seller).cancelAuction())
        .to.emit(auction, "AuctionCancelled");
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
      expect(await auction.cancelled()).to.equal(true);
    });

    it("cancelAuction reverts if bids exist", async function () {
      const { auction, seller, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await expect(auction.connect(seller).cancelAuction())
        .to.be.revertedWith("AuctionNFT: cannot cancel with active bids");
    });

    // cancelBeforeStart — during pending period
    it("seller cancels a pending (future-start) auction before it begins", async function () {
      const now         = BigInt(await time.latest());
      const futureStart = now + 3600n;
      const futureEnd   = futureStart + DURATION_SECS;
      const { auction, seller, nft, tokenId } =
        await setupAuction({ startTime: futureStart, endTime: futureEnd });
      await expect(auction.connect(seller).cancelBeforeStart())
        .to.emit(auction, "AuctionCancelled");
      // NFT returned to seller (it was deposited)
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
      expect(await auction.cancelled()).to.equal(true);
    });

    it("cancelBeforeStart reverts after startTime has passed", async function () {
      const { auction, seller } = await setupAuction(); // startTime = now
      await expect(auction.connect(seller).cancelBeforeStart())
        .to.be.revertedWith("AuctionNFT: auction already started");
    });

    it("cancelBeforeStart reverts for non-seller", async function () {
      const now         = BigInt(await time.latest());
      const futureStart = now + 3600n;
      const { auction, bidder1 } =
        await setupAuction({ startTime: futureStart, endTime: futureStart + DURATION_SECS });
      await expect(auction.connect(bidder1).cancelBeforeStart())
        .to.be.revertedWith("AuctionNFT: not seller");
    });

    // withdrawOnCancel
    it("withdrawOnCancel reverts when auction is not cancelled", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(DURATION_SECS) + 1);
      await expect(auction.connect(bidder1).withdrawOnCancel())
        .to.be.revertedWith("AuctionNFT: not cancelled");
    });
  });

  // ── 8. Refunds ────────────────────────────────────────────────────────────
  describe("Refunds", function () {

    it("refundLosers sends back deposits minus 2% fee", async function () {
      const { auction, weth, seller, bidder1, bidder2, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      await placeBid(bidder2, ethers.parseEther("1.1"));
      await time.increase(Number(DURATION_SECS) + 1);
      await auction.settleAuction();

      const before = await weth.balanceOf(bidder1.address);
      await auction.connect(seller).refundLosers();
      const fee = (ONE_ETHER * REFUND_FEE_BPS) / BPS_BASE;
      expect(await weth.balanceOf(bidder1.address) - before).to.equal(ONE_ETHER - fee);
    });

    it("claimRefund works for individual non-winner", async function () {
      const { auction, weth, bidder1, bidder2, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      await placeBid(bidder2, ethers.parseEther("1.1"));
      await time.increase(Number(DURATION_SECS) + 1);
      await auction.settleAuction();

      const before = await weth.balanceOf(bidder1.address);
      await auction.connect(bidder1).claimRefund();
      const fee = (ONE_ETHER * REFUND_FEE_BPS) / BPS_BASE;
      expect(await weth.balanceOf(bidder1.address) - before).to.equal(ONE_ETHER - fee);
    });

    it("winner cannot call claimRefund", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(DURATION_SECS) + 1);
      await auction.settleAuction();
      await expect(auction.connect(bidder1).claimRefund())
        .to.be.revertedWith("AuctionNFT: winner cannot claim refund");
    });
  });

  // ── 9. Seller controls ────────────────────────────────────────────────────
  describe("Seller controls", function () {

    it("seller can manually end the auction early", async function () {
      const { auction, seller, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await expect(auction.connect(seller).endAuction())
        .to.emit(auction, "AuctionEnded");
      expect(await auction.ended()).to.equal(true);
    });

    it("non-seller cannot call endAuction", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await expect(auction.connect(bidder1).endAuction())
        .to.be.revertedWith("AuctionNFT: not seller");
    });
  });

  // ── 10. Chainlink price feed ───────────────────────────────────────────────
  describe("Chainlink Price Feed", function () {

    it("getHighestBidUsd returns non-zero after a bid", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      expect(await auction.getHighestBidUsd()).to.be.gt(0n);
    });

    it("getUsdValue computes correctly: 1 ETH at $3000 = 300_000_000_000 (8 dec)", async function () {
      const { auction } = await setupAuction();
      const usd = await auction.getUsdValue(ONE_ETHER);
      expect(usd).to.equal((ONE_ETHER * INITIAL_PRICE) / 10n ** 18n);
    });

    it("getHighestBidUsd returns 0 for stale price (> 1 hour)", async function () {
      const { auction, feed, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      const staleTime = BigInt(await time.latest()) - 3700n;
      await feed.setStaleTimestamp(staleTime);
      expect(await auction.getHighestBidUsd()).to.equal(0n);
    });

    it("getHighestBidUsd returns 0 for negative price", async function () {
      const { auction, feed, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await feed.updateAnswer(-1);
      expect(await auction.getHighestBidUsd()).to.equal(0n);
    });
  });

  // ── 11. View functions ────────────────────────────────────────────────────
  describe("View functions", function () {

    it("getBidCount tracks unique bidders", async function () {
      const { auction, bidder1, bidder2, placeBid } = await setupAuction();
      expect(await auction.getBidCount()).to.equal(0n);
      await placeBid(bidder1, ONE_ETHER);
      expect(await auction.getBidCount()).to.equal(1n);
      await time.increase(Number(ONE_MIN) + 1);
      await placeBid(bidder2, ethers.parseEther("1.1"));
      expect(await auction.getBidCount()).to.equal(2n);
    });

    it("getBidHistory returns paginated bids with timestamp", async function () {
      const { auction, bidder1, bidder2, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      await placeBid(bidder2, ethers.parseEther("1.1"));
      const page = await auction.getBidHistory(0, 2);
      expect(page.length).to.equal(2);
      expect(page[0].bidder).to.equal(bidder1.address);
      expect(page[0].timestamp).to.be.gt(0n);
      expect(page[1].bidder).to.equal(bidder2.address);
    });

    it("getBidHistory reverts on out-of-bounds offset", async function () {
      const { auction, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await expect(auction.getBidHistory(5, 2))
        .to.be.revertedWith("AuctionNFT: offset out of bounds");
    });

    it("getWinner returns correct winner and bid", async function () {
      const { auction, bidder1, bidder2, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      await placeBid(bidder2, ethers.parseEther("1.1"));
      const [winner, winBid] = await auction.getWinner();
      expect(winner).to.equal(bidder2.address);
      expect(winBid).to.equal(ethers.parseEther("1.1"));
    });

    it("timeRemaining decreases and hits 0 after end", async function () {
      const { auction } = await setupAuction();
      const t1 = await auction.timeRemaining();
      await time.increase(60);
      expect(await auction.timeRemaining()).to.be.lt(t1);
      await time.increase(Number(DURATION_SECS) + 10);
      expect(await auction.timeRemaining()).to.equal(0n);
    });

    it("isPending returns false once startTime passes", async function () {
      const now         = BigInt(await time.latest());
      const futureStart = now + 300n; // 5 min from now
      const { auction } = await setupAuction({ startTime: futureStart, endTime: futureStart + DURATION_SECS });
      expect(await auction.isPending()).to.equal(true);
      await time.increaseTo(Number(futureStart) + 1);
      expect(await auction.isPending()).to.equal(false);
    });

    it("isNFTDeposited reflects actual NFT custody", async function () {
      const { auction, nft, seller, tokenId } = await setupAuction();
      expect(await auction.isNFTDeposited()).to.equal(true);
      // After cancel, NFT goes back to seller
      await auction.connect(seller).cancelAuction();
      expect(await auction.isNFTDeposited()).to.equal(false);
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
    });

    it("getAuctionInfo returns all fields including startTime", async function () {
      const { auction, seller, nft, weth, tokenId, bidder1, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      const info = await auction.getAuctionInfo();
      expect(info._seller).to.equal(seller.address);
      expect(info._nft).to.equal(await nft.getAddress());
      expect(info._tokenId).to.equal(tokenId);
      expect(info._paymentToken).to.equal(await weth.getAddress());
      expect(info._highestBid).to.equal(ONE_ETHER);
      expect(info._startTime).to.be.gt(0n);
      expect(info._ended).to.equal(false);
      expect(info._cancelled).to.equal(false);
    });
  });

  // ── 12. Security ──────────────────────────────────────────────────────────
  describe("Security", function () {

    it("deposits cannot be double-claimed via claimRefund", async function () {
      const { auction, bidder1, bidder2, placeBid } = await setupAuction();
      await placeBid(bidder1, ONE_ETHER);
      await time.increase(Number(ONE_MIN) + 1);
      await placeBid(bidder2, ethers.parseEther("1.1"));
      await time.increase(Number(DURATION_SECS) + 1);
      await auction.settleAuction();
      await auction.connect(bidder1).claimRefund();
      await expect(auction.connect(bidder1).claimRefund())
        .to.be.revertedWith("AuctionNFT: nothing to refund");
    });

    it("settleAuction reverts on cancelled auction", async function () {
      const { auction, seller } = await setupAuction();
      await auction.connect(seller).cancelAuction();
      await expect(auction.settleAuction())
        .to.be.revertedWith("AuctionNFT: auction was cancelled");
    });

    it("reclaimNFT prevents double-reclaim", async function () {
      const { auction, seller } = await setupAuction();
      await time.increase(Number(DURATION_SECS) + 1);
      await auction.connect(seller).reclaimNFT();
      await expect(auction.connect(seller).reclaimNFT())
        .to.be.revertedWith("AuctionNFT: NFT already transferred");
    });
  });
});
