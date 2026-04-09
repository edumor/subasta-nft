// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/AggregatorV3Interface.sol";

/**
 * @title AuctionNFT
 * @author Eduardo J. Moreno
 * @notice Decentralized NFT auction with ERC-20 bidding, Chainlink USD price feed, and creator royalties.
 * @dev Features:
 *   - Auction a single ERC-721 NFT
 *   - Bids accepted in any ERC-20 token (WETH, USDC, etc.)
 *   - Live USD valuation via Chainlink AggregatorV3Interface
 *   - Creator royalties (EIP-2981 style, configurable at deploy)
 *   - Auto-extension: 10-min extension if bid in last 10 minutes (up to original duration)
 *   - Partial withdraw during auction (excess above current bid)
 *   - Checks-Effects-Interactions pattern throughout
 *   - ReentrancyGuard on all state-changing functions
 */
contract AuctionNFT is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Structs ───────────────────────────────────────────────────────────────

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    // ─── State variables ───────────────────────────────────────────────────────

    address public immutable seller;
    IERC721 public immutable nftContract;
    uint256 public immutable nftTokenId;
    IERC20 public immutable paymentToken;
    AggregatorV3Interface public immutable priceFeed;

    address public immutable royaltyRecipient;
    uint256 public immutable royaltyBps; // basis points (e.g. 250 = 2.5%)

    uint256 public startTime;
    uint256 public auctionEndTime;
    uint256 public immutable originalEndTime; // Original planned end (never changes)

    address public highestBidder;
    uint256 public highestBid;

    mapping(address => uint256) public deposits;
    mapping(address => uint256) public lastBid;
    mapping(address => uint256) public lastBidTime;
    mapping(address => bool) private hasBid;
    mapping(address => uint256) private bidIndex;

    Bid[] public bidHistory;

    bool public ended;
    bool public cancelled;
    bool private nftTransferred;
    bool private fundsWithdrawn;

    uint256 private constant EXTENSION_WINDOW = 10 minutes;
    uint256 private constant MIN_BID_INCREMENT_BPS = 500; // 5%
    uint256 private constant REFUND_FEE_BPS = 200;        // 2%
    uint256 private constant BPS_BASE = 10_000;
    uint256 private constant MAX_ROYALTY_BPS = 1_000;     // 10% max royalty
    uint256 private constant STALE_PRICE_THRESHOLD = 1 hours;

    // ─── Events (extra) ────────────────────────────────────────────────────────
    // (declared here so they appear before use)
    event NFTReclaimed(address indexed seller);

    // ─── Events ────────────────────────────────────────────────────────────────

    event AuctionStarted(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId,
        address paymentToken,
        uint256 startTime,
        uint256 endTime
    );
    event NewBid(address indexed bidder, uint256 amount, uint256 usdValue);
    event AuctionExtended(uint256 newEndTime);
    event AuctionEnded(address indexed winner, uint256 winningBid, uint256 usdValue);
    event AuctionCancelled();
    event PartialWithdrawal(address indexed bidder, uint256 amount);
    event DepositRefunded(address indexed bidder, uint256 amount, uint256 fee);
    event RoyaltyPaid(address indexed recipient, uint256 amount);
    event SellerPaid(address indexed seller, uint256 amount);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlySeller() {
        require(msg.sender == seller, "AuctionNFT: not seller");
        _;
    }

    modifier onlyActive() {
        require(block.timestamp >= startTime, "AuctionNFT: auction not started yet");
        require(block.timestamp < auctionEndTime, "AuctionNFT: auction ended");
        require(!ended, "AuctionNFT: already ended");
        require(!cancelled, "AuctionNFT: cancelled");
        _;
    }

    modifier onlyEnded() {
        require(
            block.timestamp >= auctionEndTime || ended || cancelled,
            "AuctionNFT: not ended yet"
        );
        _;
    }

    /**
     * @dev Ensures the NFT is actually held by this contract before allowing bids.
     *      Protects bidders from paying for an auction where the asset was never deposited.
     */
    modifier nftDeposited() {
        require(
            nftContract.ownerOf(nftTokenId) == address(this),
            "AuctionNFT: NFT not deposited in contract"
        );
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    /**
     * @notice Deploy a new NFT auction.
     * @param _nftContract      Address of the ERC-721 contract.
     * @param _tokenId          Token ID to auction.
     * @param _paymentToken     ERC-20 token accepted for bids (e.g. WETH, USDC).
     * @param _priceFeed        Chainlink AggregatorV3 feed for paymentToken/USD.
     * @param _startTime        Unix timestamp for auction start (0 = start immediately).
     * @param _endTime          Unix timestamp for auction end.
     * @param _royaltyRecipient Address that receives creator royalties.
     * @param _royaltyBps       Royalty in basis points (max 1000 = 10%).
     */
    constructor(
        address _nftContract,
        uint256 _tokenId,
        address _paymentToken,
        address _priceFeed,
        uint256 _startTime,
        uint256 _endTime,
        address _royaltyRecipient,
        uint256 _royaltyBps
    ) {
        require(_nftContract != address(0), "AuctionNFT: zero nft address");
        require(_paymentToken != address(0), "AuctionNFT: zero token address");
        require(_priceFeed != address(0), "AuctionNFT: zero feed address");
        require(_royaltyRecipient != address(0), "AuctionNFT: zero royalty address");
        require(_endTime > block.timestamp, "AuctionNFT: end time in past");
        require(_royaltyBps <= MAX_ROYALTY_BPS, "AuctionNFT: royalty too high");

        uint256 resolvedStart = _startTime == 0 ? block.timestamp : _startTime;
        require(_startTime == 0 || _startTime >= block.timestamp, "AuctionNFT: start time in past");
        require(_endTime > resolvedStart, "AuctionNFT: end must be after start");

        seller = msg.sender;
        nftContract = IERC721(_nftContract);
        nftTokenId = _tokenId;
        paymentToken = IERC20(_paymentToken);
        priceFeed = AggregatorV3Interface(_priceFeed);
        royaltyRecipient = _royaltyRecipient;
        royaltyBps = _royaltyBps;

        startTime = resolvedStart;
        auctionEndTime = _endTime;
        originalEndTime = _endTime; // Immutable reference for the 10-min extension cap

        emit AuctionStarted(
            msg.sender,
            _nftContract,
            _tokenId,
            _paymentToken,
            resolvedStart,
            _endTime
        );
    }

    // ─── Core bidding ──────────────────────────────────────────────────────────

    /**
     * @notice Place a bid using ERC-20 payment tokens.
     * @dev Caller must approve this contract to spend `amount` tokens first.
     * @param amount Amount of paymentToken to add to your cumulative bid.
     */
    function bid(uint256 amount) external nonReentrant onlyActive nftDeposited {
        require(msg.sender != seller, "AuctionNFT: seller cannot bid");
        require(amount > 0, "AuctionNFT: zero amount");
        require(
            block.timestamp > lastBidTime[msg.sender] + 1 minutes,
            "AuctionNFT: wait 1 min between bids"
        );

        uint256 newTotal = lastBid[msg.sender] + amount;
        uint256 minRequired = highestBid == 0
            ? 0
            : highestBid + (highestBid * MIN_BID_INCREMENT_BPS) / BPS_BASE;

        require(newTotal > minRequired, "AuctionNFT: bid too low (min 5% increment)");
        require(msg.sender != highestBidder, "AuctionNFT: already highest bidder");

        // Effects
        lastBidTime[msg.sender] = block.timestamp;
        deposits[msg.sender] += amount;
        lastBid[msg.sender] = newTotal;
        highestBidder = msg.sender;
        highestBid = newTotal;

        if (hasBid[msg.sender]) {
            bidHistory[bidIndex[msg.sender]].amount = newTotal;
            bidHistory[bidIndex[msg.sender]].timestamp = block.timestamp;
        } else {
            bidHistory.push(Bid(msg.sender, newTotal, block.timestamp));
            bidIndex[msg.sender] = bidHistory.length - 1;
            hasBid[msg.sender] = true;
        }

        // Auto-extension: if bid lands in the last 10 minutes, push the end time
        // to (now + 10 min), but never beyond (originalEndTime + 10 min).
        // This means the auction always closes at most 10 minutes after its
        // originally scheduled end, regardless of how many bids arrive.
        if (block.timestamp + EXTENSION_WINDOW > auctionEndTime) {
            uint256 newEnd = block.timestamp + EXTENSION_WINDOW;
            uint256 maxEnd = originalEndTime + EXTENSION_WINDOW;
            if (newEnd > maxEnd) newEnd = maxEnd;
            if (newEnd > auctionEndTime) {
                auctionEndTime = newEnd;
                emit AuctionExtended(auctionEndTime);
            }
        }

        // Interactions
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 usdVal = _getUsdValue(newTotal);
        emit NewBid(msg.sender, newTotal, usdVal);
    }

    /**
     * @notice Withdraw excess tokens above your current highest bid, during the auction.
     */
    function partialWithdraw() external nonReentrant onlyActive {
        uint256 deposit = deposits[msg.sender];
        uint256 myBid = lastBid[msg.sender];
        require(deposit > myBid, "AuctionNFT: no excess to withdraw");

        uint256 excess = deposit - myBid;

        // Effects
        deposits[msg.sender] = myBid;

        // Interactions
        paymentToken.safeTransfer(msg.sender, excess);

        emit PartialWithdrawal(msg.sender, excess);
    }

    // ─── Settlement ────────────────────────────────────────────────────────────

    /**
     * @notice Settle the auction: transfer NFT to winner, pay royalties and seller.
     * @dev Callable by anyone after auction ends (incentivizes settlement).
     */
    function settleAuction() external nonReentrant onlyEnded {
        require(!cancelled, "AuctionNFT: auction was cancelled");
        require(!nftTransferred, "AuctionNFT: already settled");
        require(highestBid > 0, "AuctionNFT: no bids");

        nftTransferred = true;
        fundsWithdrawn = true;

        uint256 winningBid = highestBid;
        address winner = highestBidder;

        // Zero out winner's deposit
        deposits[winner] = 0;

        // Calculate royalty and seller payment
        uint256 royalty = (winningBid * royaltyBps) / BPS_BASE;
        uint256 sellerAmount = winningBid - royalty;

        uint256 usdVal = _getUsdValue(winningBid);
        emit AuctionEnded(winner, winningBid, usdVal);

        // Transfer NFT to winner
        nftContract.safeTransferFrom(address(this), winner, nftTokenId);

        // Pay royalty
        if (royalty > 0) {
            paymentToken.safeTransfer(royaltyRecipient, royalty);
            emit RoyaltyPaid(royaltyRecipient, royalty);
        }

        // Pay seller
        paymentToken.safeTransfer(seller, sellerAmount);
        emit SellerPaid(seller, sellerAmount);
    }

    /**
     * @notice Refund all non-winning bidders (minus 2% fee to seller). Callable by seller.
     * @dev Pull refunds are better UX but loop is acceptable for small-scale auctions.
     */
    function refundLosers() external nonReentrant onlySeller onlyEnded {
        require(!cancelled, "AuctionNFT: auction was cancelled");

        uint256 len = bidHistory.length;
        for (uint256 i = 0; i < len; ) {
            address bidder = bidHistory[i].bidder;
            if (bidder != highestBidder) {
                uint256 amount = deposits[bidder];
                if (amount > 0) {
                    // Effects
                    deposits[bidder] = 0;
                    uint256 fee = (amount * REFUND_FEE_BPS) / BPS_BASE;
                    uint256 payout = amount - fee;

                    // Interactions
                    if (payout > 0) paymentToken.safeTransfer(bidder, payout);
                    if (fee > 0) paymentToken.safeTransfer(seller, fee);

                    emit DepositRefunded(bidder, payout, fee);
                }
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Pull-based refund: individual bidder claims their own refund after auction ends.
     * @dev Alternative to refundLosers() — each loser can claim individually.
     */
    function claimRefund() external nonReentrant onlyEnded {
        require(!cancelled, "AuctionNFT: use withdrawOnCancel");
        require(msg.sender != highestBidder, "AuctionNFT: winner cannot claim refund");

        uint256 amount = deposits[msg.sender];
        require(amount > 0, "AuctionNFT: nothing to refund");

        // Effects
        deposits[msg.sender] = 0;
        uint256 fee = (amount * REFUND_FEE_BPS) / BPS_BASE;
        uint256 payout = amount - fee;

        // Interactions
        if (payout > 0) paymentToken.safeTransfer(msg.sender, payout);
        if (fee > 0) paymentToken.safeTransfer(seller, fee);

        emit DepositRefunded(msg.sender, payout, fee);
    }

    // ─── Cancellation ──────────────────────────────────────────────────────────

    /**
     * @notice Cancel a scheduled auction BEFORE it starts (during the pending window).
     * @dev The onlyActive modifier requires block.timestamp >= startTime, so it cannot
     *      be used here. This function fills that gap: the seller can abort a future-dated
     *      auction at any point before startTime.
     *      No bids are possible yet, so no refunds are needed — only the NFT must go back.
     */
    function cancelBeforeStart() external nonReentrant onlySeller {
        require(block.timestamp < startTime, "AuctionNFT: auction already started");
        require(!cancelled, "AuctionNFT: already cancelled");
        require(!ended, "AuctionNFT: already ended");

        // Effects
        ended = true;
        cancelled = true;

        emit AuctionCancelled();

        // Return NFT to seller if it was already deposited
        if (nftContract.ownerOf(nftTokenId) == address(this)) {
            nftContract.safeTransferFrom(address(this), seller, nftTokenId);
        }
    }

    /**
     * @notice Cancel the auction during the active window (only if no bids). Returns NFT to seller.
     */
    function cancelAuction() external nonReentrant onlySeller onlyActive {
        require(highestBid == 0, "AuctionNFT: cannot cancel with active bids");

        // Effects
        ended = true;
        cancelled = true;

        emit AuctionCancelled();

        // Return NFT to seller
        nftContract.safeTransferFrom(address(this), seller, nftTokenId);
    }

    /**
     * @notice Seller reclaims the NFT when the auction ends with zero bids.
     * @dev Protects against the NFT being permanently locked in the contract.
     *      Only callable when:
     *        - The auction has ended (by time or manual endAuction)
     *        - It was NOT cancelled (cancelAuction already returns the NFT)
     *        - Nobody placed a bid (highestBid == 0)
     *        - The NFT has not already been transferred
     */
    function reclaimNFT() external nonReentrant onlySeller onlyEnded {
        require(!cancelled, "AuctionNFT: use withdrawOnCancel path");
        require(highestBid == 0, "AuctionNFT: auction has bids — use settleAuction");
        require(!nftTransferred, "AuctionNFT: NFT already transferred");

        // Effects
        nftTransferred = true;

        emit NFTReclaimed(seller);

        // Interactions — return NFT to seller
        nftContract.safeTransferFrom(address(this), seller, nftTokenId);
    }

    /**
     * @notice Withdraw deposit if auction was cancelled.
     */
    function withdrawOnCancel() external nonReentrant {
        require(cancelled, "AuctionNFT: not cancelled");
        uint256 amount = deposits[msg.sender];
        require(amount > 0, "AuctionNFT: nothing to withdraw");

        // Effects
        deposits[msg.sender] = 0;

        // Interactions
        paymentToken.safeTransfer(msg.sender, amount);
    }

    // ─── Seller controls ───────────────────────────────────────────────────────

    /**
     * @notice Seller manually ends the auction before scheduled time.
     */
    function endAuction() external onlySeller onlyActive {
        ended = true;
        uint256 usdVal = highestBid > 0 ? _getUsdValue(highestBid) : 0;
        emit AuctionEnded(highestBidder, highestBid, usdVal);
    }

    // ─── View functions ────────────────────────────────────────────────────────

    /**
     * @notice Get the current highest bid value in USD (8 decimals).
     * @return usdValue USD value of the highest bid.
     */
    function getHighestBidUsd() external view returns (uint256 usdValue) {
        if (highestBid == 0) return 0;
        return _getUsdValue(highestBid);
    }

    /**
     * @notice Get USD value for any token amount.
     * @param tokenAmount Amount in payment token's decimals.
     * @return usdValue Approximate USD value (8 decimals).
     */
    function getUsdValue(uint256 tokenAmount) external view returns (uint256 usdValue) {
        return _getUsdValue(tokenAmount);
    }

    /**
     * @notice Returns the latest Chainlink price and timestamp.
     */
    function getLatestPrice() external view returns (int256 price, uint256 updatedAt) {
        (, price, , updatedAt, ) = priceFeed.latestRoundData();
    }

    /**
     * @notice Total number of unique bidders.
     */
    function getBidCount() external view returns (uint256) {
        return bidHistory.length;
    }

    /**
     * @notice Paginated bid history.
     * @param offset Starting index.
     * @param limit  Number of entries to return.
     */
    function getBidHistory(
        uint256 offset,
        uint256 limit
    ) external view returns (Bid[] memory page) {
        uint256 len = bidHistory.length;
        require(offset < len, "AuctionNFT: offset out of bounds");
        uint256 end = offset + limit > len ? len : offset + limit;
        page = new Bid[](end - offset);
        for (uint256 i = offset; i < end; ) {
            page[i - offset] = bidHistory[i];
            unchecked { ++i; }
        }
    }

    /**
     * @notice Returns winner address and winning bid amount.
     */
    function getWinner() external view returns (address winner, uint256 winningBid) {
        return (highestBidder, highestBid);
    }

    /**
     * @notice Returns true if this contract currently holds the NFT to be auctioned.
     * @dev A false result during the active window means bidders should NOT place bids,
     *      as there is no asset to win. The frontend should surface this as a warning.
     */
    function isNFTDeposited() external view returns (bool) {
        try nftContract.ownerOf(nftTokenId) returns (address owner) {
            return owner == address(this);
        } catch {
            return false;
        }
    }

    /**
     * @notice Returns true if the auction hasn't started yet.
     */
    function isPending() external view returns (bool) {
        return block.timestamp < startTime;
    }

    /**
     * @notice Seconds until auction starts (0 if already started).
     */
    function timeUntilStart() external view returns (uint256) {
        if (block.timestamp >= startTime) return 0;
        return startTime - block.timestamp;
    }

    /**
     * @notice Seconds remaining in the auction (0 if ended).
     */
    function timeRemaining() external view returns (uint256) {
        if (block.timestamp >= auctionEndTime) return 0;
        return auctionEndTime - block.timestamp;
    }

    /**
     * @notice Returns full auction status summary.
     */
    function getAuctionInfo()
        external
        view
        returns (
            address _seller,
            address _nft,
            uint256 _tokenId,
            address _paymentToken,
            uint256 _highestBid,
            address _highestBidder,
            uint256 _startTime,
            uint256 _endTime,
            bool _ended,
            bool _cancelled,
            uint256 _bidCount
        )
    {
        return (
            seller,
            address(nftContract),
            nftTokenId,
            address(paymentToken),
            highestBid,
            highestBidder,
            startTime,
            auctionEndTime,
            ended || block.timestamp >= auctionEndTime,
            cancelled,
            bidHistory.length
        );
    }

    // ─── ERC-721 receiver ──────────────────────────────────────────────────────

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ─── Internal ──────────────────────────────────────────────────────────────

    /**
     * @dev Computes USD value using Chainlink price feed.
     *      Assumes paymentToken has 18 decimals (WETH) or adjusts for USDC (6 decimals).
     *      For simplicity: returns amount * price / 1e18 (18-decimal tokens).
     *      Price feed returns 8-decimal USD price.
     */
    function _getUsdValue(uint256 tokenAmount) internal view returns (uint256) {
        try priceFeed.latestRoundData() returns (
            uint80,
            int256 price,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            if (price <= 0) return 0;
            if (block.timestamp - updatedAt > STALE_PRICE_THRESHOLD) return 0;
            // price has 8 decimals, tokenAmount has 18 decimals -> result has 8 decimals
            return (tokenAmount * uint256(price)) / 1e18;
        } catch {
            return 0;
        }
    }
}
