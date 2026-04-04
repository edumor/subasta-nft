# AuctionNFT — Decentralized NFT Auction with DeFi Features

[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=flat&logo=solidity)](https://soliditylang.org)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22-FFF100?style=flat)](https://hardhat.org)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.x-4E5EE4?style=flat)](https://openzeppelin.com/contracts)
[![Chainlink](https://img.shields.io/badge/Chainlink-Price_Feed-375BD2?style=flat)](https://chain.link)
[![Tests](https://img.shields.io/badge/Tests-54%20passing-brightgreen?style=flat)](#testing)
[![Network](https://img.shields.io/badge/Network-Sepolia-3C3C3D?style=flat&logo=ethereum)](https://sepolia.etherscan.io)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?style=flat&logo=next.js)](./frontend)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

> **Live Demo:** [subasta-nft.vercel.app](https://subasta-nft.vercel.app) _(deploy your own instance — see [frontend setup](#frontend))_

A fully on-chain NFT auction system built with Solidity, featuring ERC-20 bidding, real-time USD valuation via Chainlink Price Feeds, creator royalties, and a Next.js + wagmi frontend deployed on Vercel. Backed by 54 tests covering all edge cases and security scenarios.

---

## Architecture

```
subasta-nft/
│
├── contracts/
│   ├── AuctionNFT.sol                  # Core auction contract
│   ├── interfaces/
│   │   └── AggregatorV3Interface.sol   # Chainlink feed interface
│   └── mocks/
│       ├── MockNFT.sol                 # ERC-721 for testing
│       ├── MockERC20.sol               # ERC-20 mock (WETH/USDC)
│       └── MockV3Aggregator.sol        # Chainlink price feed mock
│
├── frontend/                           # Next.js 14 + wagmi + viem
│   ├── src/
│   │   ├── app/                        # Next.js App Router pages
│   │   ├── components/                 # UI components (AuctionCard, BidForm, BidHistory…)
│   │   ├── config/                     # ABI, wagmi config, contract addresses
│   │   └── hooks/                      # useAuction, useTokenInfo, useAllowance…
│   └── vercel.json
│
├── scripts/
│   └── deploy.js                       # Hardhat deploy to Sepolia
│
└── test/
    └── AuctionNFT.test.js              # 54 tests — full coverage
```

---

## Auction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUCTION LIFECYCLE                        │
└─────────────────────────────────────────────────────────────────┘

  SELLER                     CONTRACT                    BIDDERS
    │                           │                           │
    │── deploy(nft, token, ──►  │                           │
    │        feed, duration)    │                           │
    │── safeTransferFrom ──────►│ holds NFT                 │
    │                           │                           │
    │                           │ ◄─── approve + bid() ─────│
    │                           │      (min 5% increment)   │
    │                           │                           │
    │                           │ [last 10 min bid?]        │
    │                           │──► auto-extend +10 min    │
    │                           │                           │
    │                           │  ── time expires ──►      │
    │                           │                           │
    │                           │ ◄─── settleAuction() ─────│ (anyone)
    │                           │                           │
    │◄── sellerAmount ──────────│                           │
    │◄── royaltyRecipient ──────│                           │
    │                           │──── NFT ────────────────► winner
    │                           │                           │
    │                           │ ◄── claimRefund() ────────│ losers
    │                           │     (pull, −2% fee)       │
    │── refundLosers() ────────►│──── batch refund ────────►│ (push)
```

---

## Features

| Feature | Details |
|---|---|
| **ERC-721 NFT auction** | Seller deposits any ERC-721 token at deploy time |
| **ERC-20 bidding** | Accepts WETH, USDC, or any ERC-20 as payment (configurable) |
| **Chainlink USD pricing** | Live USD valuation of bids via AggregatorV3Interface |
| **Creator royalties** | Configurable basis-point royalty at settlement (max 10%) |
| **Auto-extension** | +10 min if a bid arrives in the last 10 minutes |
| **Partial withdrawal** | Bidders recover excess deposit above their active bid |
| **Pull refunds** | Each loser individually claims their refund (−2% fee) |
| **Batch refunds** | Seller can refund all losers in a single transaction |
| **Cancellation** | Seller cancels with no bids — NFT automatically returned |
| **CEI pattern** | Checks-Effects-Interactions throughout — no reentrancy vectors |
| **ReentrancyGuard** | OpenZeppelin guard on every state-changing function |
| **SafeERC20** | All token transfers wrapped with SafeERC20 |

---

## Smart Contract

### Key functions

| Function | Caller | Description |
|---|---|---|
| `bid(amount)` | Bidder | Add to cumulative bid (min +5% over current leader) |
| `partialWithdraw()` | Bidder | Withdraw excess tokens above your active bid |
| `settleAuction()` | Anyone | After end: transfer NFT, pay royalty and seller |
| `claimRefund()` | Loser | Pull-based individual refund (−2% fee) |
| `refundLosers()` | Seller | Batch refund all non-winning bidders |
| `cancelAuction()` | Seller | Cancel if no bids placed — returns NFT |
| `endAuction()` | Seller | Force-end auction before scheduled time |
| `getAuctionInfo()` | View | Full auction state in one call |
| `getBidHistory(offset, limit)` | View | Paginated bid history |
| `getHighestBidUsd()` | View | Real-time USD value via Chainlink |

### Constants

| Parameter | Value |
|---|---|
| Min bid increment | 5% above current leader |
| Refund fee | 2% (retained by seller) |
| Max royalty | 10% (1000 basis points) |
| Auto-extension window | 10 minutes |
| Oracle stale threshold | 1 hour |

---

## Frontend

Built with **Next.js 14 (App Router)**, **wagmi v2**, **viem**, and **Tailwind CSS**.

### Features
- Live auction countdown timer with auto-refresh
- Real-time highest bid display in token + USD (Chainlink)
- Connect MetaMask (or any injected wallet) via wagmi
- Approve + bid in a guided 2-step flow
- Bid history ranked by amount with Etherscan links
- Role-based action buttons: settle, claim refund, cancel, end early
- Responsive dark UI optimized for Web3 users

### Setup

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=0xYourDeployedContractAddress
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
```

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
```

### Deploy to Vercel

```bash
cd frontend
npx vercel --prod
```

Set the following environment variables in your Vercel project:
- `NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`

---

## Contracts & Addresses (Sepolia)

| Contract | Address |
|---|---|
| AuctionNFT | Deploy with `npx hardhat run scripts/deploy.js --network sepolia` |
| Chainlink ETH/USD feed | `0x694AA1769357215DE4FAC081bf1f309aDC325306` |
| WETH (Sepolia) | `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9` |

---

## Installation & Testing

```bash
git clone https://github.com/edumor/subasta-nft
cd subasta-nft
npm install
cp .env.example .env
# Fill in SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
```

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

---

## Deployment to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

`.env` required:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

---

## Key Design Decisions

**ERC-20 bids instead of ETH** — Native ETH transfers involve `receive`/`fallback` hooks that complicate reentrancy reasoning. ERC-20 + `SafeERC20` + CEI eliminates this attack surface entirely.

**Chainlink for USD valuation** — On-chain USD values in events (`NewBid`, `AuctionEnded`) allow frontends to display prices without any additional off-chain calls. Stale price detection (> 1 hour) defaults to 0 USD to avoid showing stale data.

**Pull + Push refunds** — `claimRefund()` (pull) is the safest pattern: each user controls their own refund timing. `refundLosers()` (push) is a seller convenience for small participant counts.

**Cumulative bidding** — Bids are cumulative deposits, not full replacements. This lets bidders incrementally raise their bid without re-approving the full amount each time.

**Royalties in basis points** — Matches the EIP-2981 spirit without the full interface overhead. Capped at 10% to prevent abuse.

---

## Security

| Risk | Mitigation |
|---|---|
| Reentrancy | `ReentrancyGuard` on all write functions + CEI pattern |
| ERC-20 transfer failures | `SafeERC20` wraps all transfers |
| Stale oracle price | Staleness check (1 hour threshold) |
| Negative oracle price | `price <= 0` returns 0 USD |
| Gas limit on batch refund | `unchecked { ++i }` — gas-efficient for small participant counts |
| Front-running | Inherent to public blockchains; mitigated by 1-minute bid cooldown |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity 0.8.28 |
| Contract framework | Hardhat 2.22 |
| Token standards | OpenZeppelin ERC-721, ERC-20, ReentrancyGuard, SafeERC20 |
| Oracle | Chainlink AggregatorV3Interface |
| Testing | Hardhat Network Helpers, Chai, Mocha |
| Frontend | Next.js 14, wagmi v2, viem, Tailwind CSS |
| Deploy | Vercel (frontend) + Hardhat scripts (contracts) |
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

| Feature | Subasta (v1) | AuctionNFT (v2) |
|---|---|---|
| Payment | ETH | ERC-20 (WETH/USDC) |
| Item | Generic ETH prize | ERC-721 NFT |
| USD valuation | None | Chainlink live feed |
| Royalties | None | Configurable (basis points) |
| Refund pattern | Owner-only push | Pull (individual) + Push (batch) |
| Frontend | None | Next.js + wagmi + Vercel |
| Tooling | Remix IDE | Hardhat |
| Test coverage | None | 54 tests |
| Reentrancy guard | CEI only | ReentrancyGuard + CEI |
