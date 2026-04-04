# AuctionNFT — Decentralized NFT Auction with DeFi Features

[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=flat&logo=solidity)](https://soliditylang.org)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22-FFF100?style=flat)](https://hardhat.org)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.x-4E5EE4?style=flat)](https://openzeppelin.com/contracts)
[![Chainlink](https://img.shields.io/badge/Chainlink-Price_Feed-375BD2?style=flat)](https://chain.link)
[![Tests](https://img.shields.io/badge/Tests-54%20passing-brightgreen?style=flat)](#testing)
[![Network](https://img.shields.io/badge/Network-Sepolia-3C3C3D?style=flat&logo=ethereum)](https://sepolia.etherscan.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

A fully on-chain NFT auction system with ERC-20 bidding, real-time USD valuation via Chainlink, and creator royalties. Built with Hardhat, OpenZeppelin, and a 54-test suite covering all edge cases.

---

## Features

| Feature | Details |
|---|---|
| **NFT auction** | Auction any ERC-721 token — seller deposits NFT at deploy time |
| **ERC-20 bidding** | Accept WETH, USDC, or any ERC-20 as payment (configurable) |
| **Chainlink price feed** | Live USD valuation of bids via AggregatorV3Interface |
| **Creator royalties** | Configurable basis-point royalty paid on settlement (max 10%) |
| **Auto-extension** | 10-minute extension if bid placed in last 10 minutes |
| **Partial withdrawal** | Bidders recover excess deposit above current bid during auction |
| **Pull refunds** | Each loser claims their own refund after auction ends |
| **Batch refunds** | Seller can refund all losers in one transaction |
| **Cancellation** | Seller cancels with no bids — NFT automatically returned |
| **Reentrancy guard** | OpenZeppelin ReentrancyGuard on all state-changing functions |
| **CEI pattern** | Checks-Effects-Interactions throughout — no reentrancy vectors |
| **SafeERC20** | All ERC-20 transfers use OpenZeppelin SafeERC20 |

---

## Architecture

```
contracts/
├── AuctionNFT.sol              # Main contract
├── interfaces/
│   └── AggregatorV3Interface.sol  # Chainlink feed interface
└── mocks/
    ├── MockNFT.sol             # ERC-721 mock for testing
    ├── MockERC20.sol           # ERC-20 mock (WETH/USDC simulation)
    └── MockV3Aggregator.sol    # Chainlink price feed mock

scripts/
└── deploy.js                  # Sepolia deployment script

test/
└── AuctionNFT.test.js         # 54 tests — full coverage
```

---

## How It Works

### 1. Deploy

```js
new AuctionNFT(
  nftContract,      // ERC-721 address
  tokenId,          // Token to auction
  paymentToken,     // ERC-20 for bids (e.g. WETH)
  priceFeed,        // Chainlink AggregatorV3 address
  durationMinutes,  // Auction duration
  royaltyRecipient, // Creator address
  royaltyBps        // Royalty in basis points (250 = 2.5%)
)
```

After deployment, the seller transfers the NFT to the contract via `safeTransferFrom`.

### 2. Bidding flow

```
bidder → approve(auctionAddress, amount)
bidder → bid(amount)
  └─ Must exceed highestBid + 5%
  └─ Cumulative: your total = previous deposits + new amount
  └─ 1-minute cooldown between bids per address
  └─ Auto-extends auction by 10 min if bid in last 10 min
```

### 3. Settlement

```
Anyone → settleAuction()    (after auction ends)
  └─ NFT transferred to winner
  └─ Royalty paid to royaltyRecipient
  └─ Remaining amount paid to seller

Losers → claimRefund()      (individually, minus 2% fee)
  OR
Seller → refundLosers()     (batch refund all losers)
```

### 4. USD valuation

Every bid emits `NewBid(bidder, amount, usdValue)` where `usdValue` is computed in real time using Chainlink:

```
usdValue = (tokenAmount × chainlinkPrice) / 1e18
```

---

## Contracts & Addresses (Sepolia)

| Contract | Address |
|---|---|
| AuctionNFT | _deploy with `npx hardhat run scripts/deploy.js --network sepolia`_ |
| Chainlink ETH/USD feed | `0x694AA1769357215DE4FAC081bf1f309aDC325306` |
| WETH (Sepolia) | `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9` |

---

## Installation

```bash
git clone https://github.com/edumor/subasta-nft
cd subasta-nft
npm install
cp .env.example .env
# Fill in your SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
```

---

## Testing

```bash
npx hardhat test
```

**Result: 54 tests passing**

```
AuctionNFT
  Deployment          (7 tests)
  Bidding             (11 tests)
  Auto-extension      (3 tests)
  Partial withdraw    (3 tests)
  Settlement          (6 tests)
  Refund losers       (3 tests)
  Cancellation        (4 tests)
  Seller controls     (2 tests)
  Chainlink Feed      (6 tests)
  View functions      (7 tests)
  Security            (2 tests)

54 passing
```

Test coverage includes:
- Valid and invalid bids, increment enforcement, cooldown period
- Auction auto-extension in the last 10 minutes
- Full settlement flow: NFT transfer, royalty payment, seller payout
- Refund paths: pull (claimRefund) and push (refundLosers)
- Cancellation with NFT return
- Chainlink stale price and negative price handling
- Double-claim prevention (reentrancy protection)
- Edge cases: zero amount, zero address, out-of-bounds pagination

---

## Deployment to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Set up `.env` first:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

---

## Key Design Decisions

### ERC-20 bids instead of ETH
Native ETH transfers have edge cases (receive/fallback hooks) that make reentrancy harder to reason about. Using ERC-20 with `SafeERC20` + CEI eliminates this attack surface.

### Chainlink for USD valuation
On-chain USD values in events (`NewBid`, `AuctionEnded`) make it trivial to build frontends without additional off-chain price calls. Stale price detection (> 1 hour) defaults to 0 to avoid showing incorrect values.

### Pull + Push refunds
`claimRefund()` (pull) is the safest pattern — each user controls their own refund timing. `refundLosers()` (push) is a convenience for the seller to batch-refund a small number of participants.

### Royalties in basis points
Matches the EIP-2981 spirit without the full interface overhead. Capped at 10% to prevent abuse.

---

## Security Considerations

| Risk | Mitigation |
|---|---|
| Reentrancy | `ReentrancyGuard` on all write functions + CEI pattern |
| ERC-20 transfer failures | `SafeERC20` wraps all transfers |
| Stale oracle price | Staleness check (1 hour threshold) |
| Negative oracle price | `price <= 0` returns 0 USD value |
| Gas limit on batch refund | `refundLosers` uses `unchecked { ++i }` — gas-efficient for reasonable participant counts |
| Front-running bids | Inherent to public auctions on Ethereum; not mitigated by design |
| Large bidder count | For production scale, use a pure pull-refund pattern |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.28 |
| Development | Hardhat 2.22 |
| Token standards | OpenZeppelin ERC-721, ERC-20, ReentrancyGuard, SafeERC20 |
| Oracle | Chainlink AggregatorV3Interface |
| Testing | Hardhat Network Helpers, Chai, Mocha |
| Deployment | Hardhat scripts + Etherscan verification |
| Network | Ethereum Sepolia testnet |

---

## Author

**Eduardo Moreno** — Software Architect · Blockchain & Web3 Developer

- GitHub: [@edumor](https://github.com/edumor)
- LinkedIn: [linkedin.com/in/eduardo-moreno-15813b19b](https://linkedin.com/in/eduardo-moreno-15813b19b)
- Email: [eduardomoreno2503@gmail.com](mailto:eduardomoreno2503@gmail.com)

Part of the [ETH-KIPU](https://ethkipu.org) Blockchain Development Program.

---

## Evolution from Subasta.sol

This project evolves the original `Subasta.sol` / `Subasta2.sol` auction contracts with:

| Feature | Subasta (original) | AuctionNFT (v2) |
|---|---|---|
| Payment | ETH | ERC-20 (WETH/USDC) |
| Item | Generic ETH prize | ERC-721 NFT |
| USD valuation | None | Chainlink live feed |
| Royalties | None | Configurable (basis points) |
| Refund pattern | Owner-only push | Pull (individual) + Push (batch) |
| Tooling | Remix IDE | Hardhat + full test suite |
| Test coverage | None | 54 tests |
| Reentrancy guard | CEI only | ReentrancyGuard + CEI |
