const { ethers } = require("hardhat");

/**
 * CONFIGURACIÓN DE DIRECCIONES
 */
const FACTORY_ADDRESS  = "0x754D3F1232F2ddbF8471C2604Cf6Aed45fEdf4C6";
const NFT_ADDRESS      = "0xf0344Af8CB990B9a7ebBE97b7fef3D4A6f61e7ca";
const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const WETH_SEPOLIA     = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
const TOKEN_ID         = 0n;
const ROYALTY_BPS      = 250; // 2.5%

// TU WALLET PERSONAL (La que quieres que sea titular en Vercel)
const MI_WALLET_PERSONAL = "0x4829f4f3aadee47Cb1cc795B2eC78A166042e918";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Iniciando despliegue con la cuenta:", deployer.address);

  // Configuración de tiempos (7 días de duración)
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + 60 * 60 * 24 * 7;

  // Instanciar contratos existentes
  const factory = await ethers.getContractAt("AuctionFactory", FACTORY_ADDRESS);
  const nft = await ethers.getContractAt("MockNFT", NFT_ADDRESS);

  console.log("---------------------------------------------------------");
  console.log("Creando nueva subasta vía Factory...");

  /**
   * IMPORTANTE: Pasamos MI_WALLET_PERSONAL como el 9no argumento (_seller).
   * Asegúrate de que AuctionFactory.sol acepte este argumento en createAuction.
   */
  const tx = await factory.createAuction(
    NFT_ADDRESS, 
    TOKEN_ID, 
    WETH_SEPOLIA, 
    CHAINLINK_ETH_USD_SEPOLIA,
    0,           // startTime (0 = ahora)
    endTime, 
    deployer.address, // royaltyRecipient (puede ser la misma wallet u otra)
    ROYALTY_BPS,
    MI_WALLET_PERSONAL // <--- Aquí definimos quién es el SELLER
  );

  console.log("Esperando confirmación de la transacción...");
  await tx.wait();

  // Obtener la dirección de la subasta recién creada
  const auctions = await factory.getSellerAuctions(MI_WALLET_PERSONAL);
  const auctionAddress = auctions[auctions.length - 1];
  
  console.log("✅ AuctionNFT desplegada con éxito en:", auctionAddress);
  console.log("Titular (Seller) asignado:", MI_WALLET_PERSONAL);

  /**
   * TRANSFERENCIA DEL NFT AL CONTRATO
   * Nota: Tu wallet debe poseer el NFT y haber dado 'approve' al contrato o factory
   */
  console.log("---------------------------------------------------------");
  console.log("Transfiriendo NFT al contrato de subasta...");
  const transferTx = await nft.safeTransferFrom(deployer.address, auctionAddress, TOKEN_ID);
  await transferTx.wait();
  console.log("✅ NFT transferido. La subasta ya tiene el activo.");

  // Variables de entorno para tu proyecto en Vercel
  console.log("\n=========================================================");
  console.log("COPIA ESTO PARA TUS VARIABLES DE ENTORNO EN VERCEL:");
  console.log("=========================================================");
  console.log(`NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=${auctionAddress}`);
  console.log(`NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS=${FACTORY_ADDRESS}`);
  console.log("=========================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error durante el despliegue:", error);
    process.exit(1);
  });
