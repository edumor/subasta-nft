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

// Subasta2.sol deployed on Sepolia
export const AUCTION_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS as `0x${string}`) ??
  "0x1d7c0f3fe4604deeb3d3f3af1e18d98a8fa661cf";

export const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";
