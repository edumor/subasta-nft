import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuctionNFT — Decentralized NFT Auction",
  description:
    "On-chain NFT auction with ERC-20 bidding, Chainlink USD price feeds and creator royalties. Built on Ethereum Sepolia.",
  openGraph: {
    title: "AuctionNFT — Decentralized NFT Auction",
    description: "Bid with WETH. Prices in USD via Chainlink. Creator royalties on-chain.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
