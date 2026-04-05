// ABI for Subasta2.sol (contract name: Auction)
// Deployed on Sepolia: 0x1d7c0f3fe4604deeb3d3f3af1e18d98a8fa661cf
// ETH-based auction — bids in native ETH, no ERC-20, no NFT, no Chainlink

export const AUCTION_ABI = [
  // ─── Public state variables ────────────────────────────────────────────────
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
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
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "lastBid",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "lastBidTime",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ─── View functions ────────────────────────────────────────────────────────
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
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "bidder", type: "address" },
          { name: "amount", type: "uint256" },
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
      { name: "", type: "address" },
      { name: "", type: "uint256" },
    ],
  },
  // ─── Write functions ───────────────────────────────────────────────────────
  {
    name: "bid",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "partialWithdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "withdrawDeposits",
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
    name: "withdrawFunds",
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
  {
    name: "withdrawDepositOnCancel",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "emergencyWithdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // ─── Events ────────────────────────────────────────────────────────────────
  {
    name: "NewBid",
    type: "event",
    inputs: [
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "AuctionEnded",
    type: "event",
    inputs: [
      { name: "winner", type: "address", indexed: false },
      { name: "winningAmount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PartialWithdrawal",
    type: "event",
    inputs: [
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "DepositWithdrawn",
    type: "event",
    inputs: [
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    name: "AuctionCancelled",
    type: "event",
    inputs: [],
  },
  {
    name: "FeeTransferred",
    type: "event",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "DepositWithdrawnOnCancel",
    type: "event",
    inputs: [
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "EmergencyWithdrawal",
    type: "event",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
