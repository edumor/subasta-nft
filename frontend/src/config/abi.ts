/**
 * ABI for AuctionNFT.sol
 * ERC-20 bidding (WETH/USDC), Chainlink USD feed, creator royalties, auto-extension.
 * ⚠️  This file was fully regenerated to match AuctionNFT.sol — the old ABI
 *     was for a different contract (Subasta2.sol, native-ETH bids).
 */
export const AUCTION_ABI = [
  // ─── Public state variable getters ─────────────────────────────────────────
  {
    name: "seller",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "nftContract",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "nftTokenId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "paymentToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "priceFeed",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "royaltyRecipient",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "royaltyBps",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "startTime",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "auctionEndTime",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "originalEndTime",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "highestBidder",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "highestBid",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ended",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "cancelled",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "deposits",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "lastBid",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "lastBidTime",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },

  // ─── View functions ────────────────────────────────────────────────────────
  {
    name: "isNFTDeposited",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "isPending",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "timeUntilStart",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "timeRemaining",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getBidCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getBidHistory",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit",  type: "uint256" },
    ],
    outputs: [
      {
        name: "page",
        type: "tuple[]",
        components: [
          { name: "bidder",    type: "address" },
          { name: "amount",    type: "uint256" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getWinner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "winner",     type: "address" },
      { name: "winningBid", type: "uint256" },
    ],
  },
  {
    name: "getHighestBidUsd",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "usdValue", type: "uint256" }],
  },
  {
    name: "getUsdValue",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenAmount", type: "uint256" }],
    outputs: [{ name: "usdValue", type: "uint256" }],
  },
  {
    name: "getLatestPrice",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "price",     type: "int256" },
      { name: "updatedAt", type: "uint256" },
    ],
  },
  {
    name: "getAuctionInfo",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "_seller",       type: "address" },
      { name: "_nft",          type: "address" },
      { name: "_tokenId",      type: "uint256" },
      { name: "_paymentToken", type: "address" },
      { name: "_highestBid",   type: "uint256" },
      { name: "_highestBidder",type: "address" },
      { name: "_startTime",    type: "uint256" },
      { name: "_endTime",      type: "uint256" },
      { name: "_ended",        type: "bool" },
      { name: "_cancelled",    type: "bool" },
      { name: "_bidCount",     type: "uint256" },
    ],
  },

  // ─── Write functions ───────────────────────────────────────────────────────

  /**
   * bid(uint256 amount)
   * ⚠️  ERC-20: caller must first approve(auctionAddress, amount) on the payment token.
   *     amount = tokens to ADD to your cumulative deposit in this tx.
   */
  {
    name: "bid",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "partialWithdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  /**
   * settleAuction() — transfer NFT to winner, pay royalties + seller.
   * Callable by anyone once auction ends (incentivises settlement).
   */
  {
    name: "settleAuction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  /**
   * refundLosers() — loops through all non-winning bidders and refunds them (−2%).
   * Only seller can call this.
   */
  {
    name: "refundLosers",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  /**
   * claimRefund() — individual non-winner pulls their own refund (−2%).
   */
  {
    name: "claimRefund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "endAuction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "cancelAuction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  /**
   * cancelBeforeStart() — seller cancels a future-dated auction before startTime.
   *   No bids exist yet, NFT (if deposited) is returned to seller.
   */
  {
    name: "cancelBeforeStart",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  /**
   * reclaimNFT() — seller recovers the NFT if the auction ended with zero bids.
   *   Prevents the NFT from being permanently locked when nobody bid.
   */
  {
    name: "reclaimNFT",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  /**
   * withdrawOnCancel() — bidder withdraws their full deposit if auction was cancelled.
   */
  {
    name: "withdrawOnCancel",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  // ─── Events ────────────────────────────────────────────────────────────────
  {
    name: "AuctionStarted",
    type: "event",
    inputs: [
      { name: "seller",       type: "address", indexed: true  },
      { name: "nftContract",  type: "address", indexed: true  },
      { name: "tokenId",      type: "uint256", indexed: true  },
      { name: "paymentToken", type: "address", indexed: false },
      { name: "startTime",    type: "uint256", indexed: false },
      { name: "endTime",      type: "uint256", indexed: false },
    ],
  },
  {
    name: "NewBid",
    type: "event",
    inputs: [
      { name: "bidder",   type: "address", indexed: true  },
      { name: "amount",   type: "uint256", indexed: false },
      { name: "usdValue", type: "uint256", indexed: false },
    ],
  },
  {
    name: "AuctionExtended",
    type: "event",
    inputs: [
      { name: "newEndTime", type: "uint256", indexed: false },
    ],
  },
  {
    name: "AuctionEnded",
    type: "event",
    inputs: [
      { name: "winner",     type: "address", indexed: true  },
      { name: "winningBid", type: "uint256", indexed: false },
      { name: "usdValue",   type: "uint256", indexed: false },
    ],
  },
  {
    name: "AuctionCancelled",
    type: "event",
    inputs: [],
  },
  {
    name: "PartialWithdrawal",
    type: "event",
    inputs: [
      { name: "bidder", type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "DepositRefunded",
    type: "event",
    inputs: [
      { name: "bidder", type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fee",    type: "uint256", indexed: false },
    ],
  },
  {
    name: "RoyaltyPaid",
    type: "event",
    inputs: [
      { name: "recipient", type: "address", indexed: true  },
      { name: "amount",    type: "uint256", indexed: false },
    ],
  },
  {
    name: "SellerPaid",
    type: "event",
    inputs: [
      { name: "seller", type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "NFTReclaimed",
    type: "event",
    inputs: [
      { name: "seller", type: "address", indexed: true },
    ],
  },
] as const;

// ─── Minimal ERC-20 ABI (approve + allowance + balanceOf + symbol + decimals) ─
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value",   type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

// ─── AuctionFactory ABI ───────────────────────────────────────────────────────
export const FACTORY_ABI = [
  {
    name: "createAuction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_nftContract",      type: "address" },
      { name: "_tokenId",          type: "uint256" },
      { name: "_paymentToken",     type: "address" },
      { name: "_priceFeed",        type: "address" },
      { name: "_startTime",        type: "uint256" },
      { name: "_endTime",          type: "uint256" },
      { name: "_royaltyRecipient", type: "address" },
      { name: "_royaltyBps",       type: "uint256" },
    ],
    outputs: [{ name: "auction", type: "address" }],
  },
  {
    name: "getAuctionCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getSellerAuctions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_seller", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getAuctions",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit",  type: "uint256" },
    ],
    outputs: [{ name: "page", type: "address[]" }],
  },
  {
    name: "AuctionCreated",
    type: "event",
    inputs: [
      { name: "auction",      type: "address", indexed: true  },
      { name: "seller",       type: "address", indexed: true  },
      { name: "nftContract",  type: "address", indexed: true  },
      { name: "tokenId",      type: "uint256", indexed: false },
      { name: "paymentToken", type: "address", indexed: false },
      { name: "startTime",    type: "uint256", indexed: false },
      { name: "endTime",      type: "uint256", indexed: false },
    ],
  },
] as const;

// ─── Minimal ERC-721 ABI (tokenURI + ownerOf) ────────────────────────────────
export const ERC721_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
