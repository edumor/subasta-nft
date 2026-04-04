"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { shortenAddress } from "@/hooks/useAuction";
import { SEPOLIA_EXPLORER, AUCTION_CONTRACT_ADDRESS } from "@/config/wagmi";

export function Header() {
  const { address, isConnected, chain } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-lg">
            🔨
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">AuctionNFT</h1>
            <a
              href={`${SEPOLIA_EXPLORER}/address/${AUCTION_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-violet-400 transition-colors"
            >
              {shortenAddress(AUCTION_CONTRACT_ADDRESS)} ↗
            </a>
          </div>
        </div>

        {/* Network + Wallet */}
        <div className="flex items-center gap-3">
          {/* Network pill */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-300">
              {chain?.name ?? "Sepolia"}
            </span>
          </div>

          {/* Wallet button */}
          {isConnected && address ? (
            <button
              onClick={() => disconnect()}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:border-violet-500 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-slate-200">{shortenAddress(address)}</span>
              <span className="text-slate-500 text-xs">✕</span>
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="btn-primary text-sm py-2 px-4"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
