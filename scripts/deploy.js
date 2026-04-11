// deploy.js — Deploy AuctionFactory + a sample AuctionNFT on Sepolia
// Usage: npx hardhat run scripts/deploy.js --network sepolia

const { ethers } = require("hardhat");

// ─── Sepolia addresses ────────────────────────────────────────────────────────
const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const WETH_SEPOLIA              = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

// ─── Auction timing ───────────────────────────────────────────────────────────
const START_TIME   = 0;             // 0 = immediate start
const DURATION_SEC = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Royalty ──────────────────────────────────────────────────────────────────
const ROYALTY_BPS = 250; // 2.5%

async function main() {
  const [deployer] = await ethers.getSigners();
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + DURATION_SEC;

  console.log("─".repeat(60));
  console.log("Iniciando despliegue de Subasta (Corregido)");
  console.log("─".repeat(60));
  console.log("Deployer  :", deployer.address);
  console.log("Balance   :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ── 1. Deploy AuctionFactory ──────────────────────────────────────────────
  console.log("\n[1/5] Desplegando AuctionFactory...");
  const Factory = await ethers.getContractFactory("AuctionFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("  AuctionFactory desplegado en:", factoryAddress);

  // ── 2. Deploy MockNFT ─────────────────────────────────────────────────────
  console.log("\n[2/5] Desplegando MockNFT...");
  const MockNFT = await ethers.getContractFactory("MockNFT");
  const nft = await MockNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("  MockNFT desplegado en:", nftAddress);

  // Mint token #0 al deployer
  const mintTx = await nft.mint(deployer.address);
  await mintTx.wait();
  const tokenId = 0n;
  console.log(`  NFT #${tokenId} minteado para ${deployer.address}`);

  // ── 3. Create auction via Factory ─────────────────────────────────────────
  console.log("\n[3/5] Creando subasta via AuctionFactory...");
  const createTx = await factory.createAuction(
    nftAddress,
    tokenId,
    WETH_SEPOLIA,
    CHAINLINK_ETH_USD_SEPOLIA,
    START_TIME,
    endTime,
    deployer.address,
    ROYALTY_BPS
  );
  const receipt = await createTx.wait();

  // PARCHE CRÍTICO: Extracción robusta del evento AuctionCreated
  const iface = factory.interface;
  const event = receipt.logs
    .map((log) => {
      try { return iface.parseLog(log); } catch (e) { return null; }
    })
    .find((parsed) => parsed && parsed.name === "AuctionCreated");

  if (!event) {
    throw new Error("No se pudo encontrar el evento AuctionCreated en los logs de la transacción.");
  }

  const auctionAddress = event.args.auction;
  console.log("  AuctionNFT (Instancia) creada en:", auctionAddress);

  // ── 4. Transfer NFT to auction contract ───────────────────────────────────
  console.log("\n[4/5] Transfiriendo NFT al contrato de subasta...");
  const transferTx = await nft.safeTransferFrom(deployer.address, auctionAddress, tokenId);
  await transferTx.wait();
  console.log("  NFT transferido con éxito. ¡Subasta activa!");

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log("\n[5/5] Resumen de Despliegue");
  console.log("─".repeat(60));
  console.log("AuctionFactory  :", factoryAddress);
  console.log("AuctionNFT      :", auctionAddress);
  console.log("─".repeat(60));
  console.log("\n✅ COPIÁ ESTAS VARIABLES A TU ENTORNO (VERCEL):");
  console.log(`NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=${auctionAddress}`);
  console.log(`NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS=${factoryAddress}`);

  // Verificación opcional en Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nEsperando 30s para indexación en Etherscan...");
    await new Promise((r) => setTimeout(r, 30000));
    try {
      await run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [],
      });
    } catch (e) {
      console.log("Aviso de verificación:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error en el proceso:", err);
    process.exit(1);
  });
