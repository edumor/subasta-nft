import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo_project_id";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
        "https://rpc.sepolia.org"
    ),
  },
});

/** Active AuctionNFT contract (from env var or fallback for dev). */
export const DEFAULT_AUCTION_ADDRESS =
  (process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS as `0x${string}`) ??
  "0x0000000000000000000000000000000000000000";

/** AuctionFactory contract — deployed once, creates new auctions from the UI. */
export const FACTORY_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS as `0x${string}`) ??
  "0x0000000000000000000000000000000000000000";

/** Chainlink ETH/USD price feed on Sepolia. */
export const CHAINLINK_ETH_USD_SEPOLIA =
  "0x694AA1769357215DE4FAC081bf1f309aDC325306";

/** WETH on Sepolia (default payment token). */
export const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9" as `0x${string}`;

export const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";
