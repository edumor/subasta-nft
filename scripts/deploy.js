// deploy.js — Deploy AuctionNFT to Sepolia testnet
// Usage: npx hardhat run scripts/deploy.js --network sepolia

const { ethers } = require("hardhat");

// ─── Configuration ────────────────────────────────────────────────────────────
// Sepolia Chainlink ETH/USD price feed
const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

// Sepolia WETH (use this or deploy your own ERC-20)
// For a real deployment, use an existing WETH or USDC on Sepolia
// This address is a common WETH on Sepolia testnets
const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

// Auction parameters
const DURATION_MINUTES = 60 * 24 * 7; // 7 days
const ROYALTY_BPS = 250;              // 2.5%
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("─".repeat(60));
  console.log("Deploying AuctionNFT");
  console.log("─".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // ── 1. Deploy MockNFT (or use an existing NFT) ────────────────────────────
  console.log("\n[1/4] Deploying MockNFT...");
  const MockNFT = await ethers.getContractFactory("MockNFT");
  const nft = await MockNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("  MockNFT deployed at:", nftAddress);

  // Mint token #0 to deployer (to be auctioned)
  const tx = await nft.mint(deployer.address);
  await tx.wait();
  const tokenId = 0n;
  console.log(`  Minted NFT #${tokenId} to ${deployer.address}`);

  // ── 2. Deploy AuctionNFT ──────────────────────────────────────────────────
  console.log("\n[2/4] Deploying AuctionNFT...");
  const AuctionNFT = await ethers.getContractFactory("AuctionNFT");
  const auction = await AuctionNFT.deploy(
    nftAddress,
    tokenId,
    WETH_SEPOLIA,
    CHAINLINK_ETH_USD_SEPOLIA,
    DURATION_MINUTES,
    deployer.address, // royalty recipient
    ROYALTY_BPS
  );
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("  AuctionNFT deployed at:", auctionAddress);

  // ── 3. Transfer NFT to auction contract ───────────────────────────────────
  console.log("\n[3/4] Transferring NFT to auction contract...");
  const transferTx = await nft.safeTransferFrom(
    deployer.address,
    auctionAddress,
    tokenId
  );
  await transferTx.wait();
  console.log("  NFT transferred. Auction is live!");

  // ── 4. Summary ────────────────────────────────────────────────────────────
  console.log("\n[4/4] Deployment summary");
  console.log("─".repeat(60));
  console.log("MockNFT:       ", nftAddress);
  console.log("AuctionNFT:    ", auctionAddress);
  console.log("Payment token: ", WETH_SEPOLIA);
  console.log("Price feed:    ", CHAINLINK_ETH_USD_SEPOLIA);
  console.log("Duration:      ", DURATION_MINUTES, "minutes (7 days)");
  console.log("Royalty:       ", ROYALTY_BPS / 100, "%");
  console.log("─".repeat(60));

  // Verify on Etherscan (optional, requires ETHERSCAN_API_KEY in .env)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nWaiting 30s for Etherscan to index...");
    await new Promise((r) => setTimeout(r, 30_000));
    try {
      await run("verify:verify", {
        address: auctionAddress,
        constructorArguments: [
          nftAddress,
          tokenId,
          WETH_SEPOLIA,
          CHAINLINK_ETH_USD_SEPOLIA,
          DURATION_MINUTES,
          deployer.address,
          ROYALTY_BPS,
        ],
      });
      console.log("Contract verified on Etherscan!");
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
