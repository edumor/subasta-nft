const { ethers } = require("hardhat");

/**
 * CONFIGURACIÓN DE DIRECCIONES Y CONSTANTES
 */
const FACTORY_ADDRESS  = "0x754D3F1232F2ddbF8471C2604Cf6Aed45fEdf4C6";
const NFT_ADDRESS      = "0xf0344Af8CB990B9a7ebBE97b7fef3D4A6f61e7ca";
const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const WETH_SEPOLIA     = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
const TOKEN_ID         = 0n;
const ROYALTY_BPS      = 250; // 2.5%

async function main() {
  // Obtenemos la cuenta que firma la transacción (tu wallet configurada en hardhat.config.js)
  const [deployer] = await ethers.getSigners();
  
  console.log("=========================================================");
  console.log("INICIANDO DESPLIEGUE DE SUBASTA");
  console.log("Ejecutado por wallet:", deployer.address);
  console.log("=========================================================");

  // Configuración de tiempo: 7 días desde ahora
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + (60 * 60 * 24 * 7);

  // Instanciar contratos existentes
  const factory = await ethers.getContractAt("AuctionFactory", FACTORY_ADDRESS);
  const nft = await ethers.getContractAt("MockNFT", NFT_ADDRESS);

  console.log("1. Creando instancia de subasta en la Factory...");

  /**
   * Llamada a createAuction con los 8 parámetros definidos en tu AuctionFactory.sol
   * La Factory usará msg.sender (tu wallet) como el Seller del contrato AuctionNFT.
   */
  const tx = await factory.createAuction(
    NFT_ADDRESS, 
    TOKEN_ID, 
    WETH_SEPOLIA, 
    CHAINLINK_ETH_USD_SEPOLIA,
    0,           // startTime (0 = empieza ya)
    endTime, 
    deployer.address, // royaltyRecipient
    ROYALTY_BPS
  );

  console.log("   Esperando confirmación en la red Sepolia...");
  await tx.wait();

  // Recuperar la dirección de la nueva subasta desde la Factory
  const auctions = await factory.getSellerAuctions(deployer.address);
  const auctionAddress = auctions[auctions.length - 1];
  
  console.log("✅ Subasta creada exitosamente en:", auctionAddress);

  /**
   * TRANSFERENCIA DEL NFT
   * Para que la subasta sea válida, el contrato AuctionNFT debe poseer el NFT.
   */
  console.log("---------------------------------------------------------");
  console.log("2. Transfiriendo NFT al contrato de subasta...");
  
  const transferTx = await nft.safeTransferFrom(deployer.address, auctionAddress, TOKEN_ID);
  await transferTx.wait();
  
  console.log("✅ NFT transferido. El contrato ahora es el custodio del activo.");

  // Resultados finales para configurar el Frontend
  console.log("\n=========================================================");
  console.log("COPIA ESTO PARA TU CONFIGURACIÓN EN VERCEL / FRONTEND:");
  console.log("=========================================================");
  console.log(`NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=${auctionAddress}`);
  console.log(`NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS=${FACTORY_ADDRESS}`);
  console.log("=========================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error durante el proceso:");
    console.error(error);
    process.exit(1);
  });
