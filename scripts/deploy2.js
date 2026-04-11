const { ethers } = require("hardhat");

const FACTORY_ADDRESS  = "0x754D3F1232F2ddbF8471C2604Cf6Aed45fEdf4C6";
const NFT_ADDRESS      = "0xf0344Af8CB990B9a7ebBE97b7fef3D4A6f61e7ca";
const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const WETH_SEPOLIA     = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
const TOKEN_ID         = 0n;
const ROYALTY_BPS      = 250;

async function main() {
  const [deployer] = await ethers.getSigners();
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + 60 * 60 * 24 * 7;

  const factory = await ethers.getContractAt("AuctionFactory", FACTORY_ADDRESS);
  const nft     = await ethers.getContractAt("MockNFT", NFT_ADDRESS);

  console.log("Creando subasta via Factory...");
  const tx = await factory.createAuction(
    NFT_ADDRESS, TOKEN_ID, WETH_SEPOLIA, CHAINLINK_ETH_USD_SEPOLIA,
    0, endTime, deployer.address, ROYALTY_BPS
  );
  await tx.wait();

  const auctions = await factory.getSellerAuctions(deployer.address);
  const auctionAddress = auctions[auctions.length - 1];
  console.log("AuctionNFT desplegada en:", auctionAddress);

  console.log("Transfiriendo NFT al contrato...");
  const transferTx = await nft.safeTransferFrom(deployer.address, auctionAddress, TOKEN_ID);
  await transferTx.wait();
  console.log("NFT transferido. Subasta activa!");

  console.log("\n✅ Variables para Vercel:");
  console.log("NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=" + auctionAddress);
  console.log("NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS=" + FACTORY_ADDRESS);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
