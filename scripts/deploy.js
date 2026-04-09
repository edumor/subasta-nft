// deploy.js — Deploy AuctionFactory + a sample AuctionNFT on Sepolia
// Usage: npx hardhat run scripts/deploy.js --network sepolia

const { ethers } = require("hardhat");

// ─── Sepolia addresses ────────────────────────────────────────────────────────
const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const WETH_SEPOLIA              = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

// ─── Auction timing ───────────────────────────────────────────────────────────
// startTime = 0 means "start immediately" (resolved to block.timestamp inside constructor)
// endTime   = now + 7 days
const START_TIME   = 0;            // 0 = immediate start
const DURATION_SEC = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Royalty ──────────────────────────────────────────────────────────────────
const ROYALTY_BPS = 250; // 2.5%

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + DURATION_SEC;

  console.log("─".repeat(60));
  console.log("Deploying AuctionFactory + sample AuctionNFT");
  console.log("─".repeat(60));
  console.log("Deployer  :", deployer.address);
  console.log("Balance   :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Start time:", START_TIME === 0 ? "Immediate (block.timestamp)" : new Date(START_TIME * 1000).toISOString());
  console.log("End time  :", new Date(endTime * 1000).toISOString());

  // ── 1. Deploy AuctionFactory ──────────────────────────────────────────────
  console.log("\n[1/5] Deploying AuctionFactory...");
  const Factory = await ethers.getContractFactory("AuctionFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("  AuctionFactory deployed at:", factoryAddress);

  // ── 2. Deploy MockNFT ─────────────────────────────────────────────────────
  console.log("\n[2/5] Deploying MockNFT...");
  const MockNFT = await ethers.getContractFactory("MockNFT");
  const nft = await MockNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("  MockNFT deployed at:", nftAddress);

  // Mint token #0 to deployer
  const mintTx = await nft.mint(deployer.address);
  await mintTx.wait();
  const tokenId = 0n;
  console.log(`  Minted NFT #${tokenId} to ${deployer.address}`);

  // ── 3. Create auction via Factory ─────────────────────────────────────────
  console.log("\n[3/5] Creating auction via AuctionFactory...");
  const createTx = await factory.createAuction(
    nftAddress,
    tokenId,
    WETH_SEPOLIA,
    CHAINLINK_ETH_USD_SEPOLIA,
    START_TIME,
    endTime,
    deployer.address, // royalty recipient
    ROYALTY_BPS
  );
  const receipt = await createTx.wait();

  // Extract auction address from AuctionCreated event
  const iface = new ethers.Interface([
    "event AuctionCreated(address indexed auction, address indexed seller, address indexed nftContract, uint256 tokenId, address paymentToken, uint256 startTime, uint256 endTime)"
  ]);
  const log = receipt.logs.find((l) => {
    try { iface.parseLog(l); return true; } catch { return false; }
  });
  const parsed = iface.parseLog(log);
  const auctionAddress = parsed.args.auction;
  console.log("  AuctionNFT deployed at:", auctionAddress);

  // ── 4. Transfer NFT to auction contract ───────────────────────────────────
  console.log("\n[4/5] Transferring NFT to auction contract...");
  const transferTx = await nft.safeTransferFrom(deployer.address, auctionAddress, tokenId);
  await transferTx.wait();
  console.log("  NFT transferred. Auction is live!");

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log("\n[5/5] Deployment summary");
  console.log("─".repeat(60));
  console.log("AuctionFactory  :", factoryAddress);
  console.log("MockNFT         :", nftAddress);
  console.log("AuctionNFT      :", auctionAddress);
  console.log("Payment token   :", WETH_SEPOLIA);
  console.log("Price feed      :", CHAINLINK_ETH_USD_SEPOLIA);
  console.log("Start time      :", START_TIME === 0 ? "Immediate" : new Date(START_TIME * 1000).toISOString());
  console.log("End time        :", new Date(endTime * 1000).toISOString());
  console.log("Royalty         :", ROYALTY_BPS / 100, "%");
  console.log("─".repeat(60));
  console.log("\n✅ Copy these addresses to your Vercel env vars:");
  console.log(`NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=${auctionAddress}`);
  console.log(`NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS=${factoryAddress}`);

  // Optionally verify on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting 30s for Etherscan to index...");
    await new Promise((r) => setTimeout(r, 30_000));
    try {
      await run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [],
      });
      console.log("AuctionFactory verified on Etherscan!");
    } catch (e) {
      console.log("Etherscan verification failed:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
