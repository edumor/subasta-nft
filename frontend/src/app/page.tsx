"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AuctionCard } from "@/components/AuctionCard";
import { BidForm } from "@/components/BidForm";
import { ActionButtons } from "@/components/ActionButtons";
import { BidHistory } from "@/components/BidHistory";

export default function Home() {
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center py-4">
          <h2 className="text-3xl font-bold text-white mb-2">
            Subasta Descentralizada en ETH
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Ofertá con ETH nativo en Sepolia. Extensión automática de 10 min si hay oferta al final.
            Comisión del 2% al owner al devolver depósitos. Contrato seguro y transparente.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <TechBadge emoji="🔷" label="Solidity 0.8.20" />
            <TechBadge emoji="💎" label="Bids en ETH" />
            <TechBadge emoji="🛡️" label="CEI Pattern" />
            <TechBadge emoji="⏱️" label="Auto-extensión" />
            <TechBadge emoji="🌐" label="Sepolia Testnet" />
          </div>
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Auction info + Bid history */}
          <div className="lg:col-span-3 space-y-6">
            <AuctionCard onRefresh={handleRefresh} />
            <BidHistory />
          </div>

          {/* Right: Actions */}
          <div className="lg:col-span-2 space-y-6">
            <BidForm />
            <ActionButtons onAction={handleRefresh} />
            <InfoPanel />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-slate-800 text-slate-500 text-xs space-y-1">
          <p>
            Desarrollado por{" "}
            <a
              href="https://linkedin.com/in/eduardo-moreno-15813b19b"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Eduardo Moreno
            </a>{" "}
            · Ingeniero de Sistemas & Blockchain Developer
          </p>
          <p>
            <a
              href="https://github.com/edumor/Subasta"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-violet-400 transition-colors"
            >
              Ver en GitHub ↗
            </a>
            {" · "}
            <a
              href="https://sepolia.etherscan.io/address/0x1d7c0f3fe4604deeb3d3f3af1e18d98a8fa661cf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-violet-400 transition-colors"
            >
              Contrato en Etherscan ↗
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

function TechBadge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-xs text-slate-300">
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

function InfoPanel() {
  return (
    <div className="card space-y-3 text-sm">
      <h3 className="font-semibold text-white">¿Cómo funciona?</h3>
      <div className="space-y-2 text-slate-400">
        <div className="flex gap-2">
          <span className="text-violet-400 font-bold">1.</span>
          <span>Conectá MetaMask a la red Sepolia</span>
        </div>
        <div className="flex gap-2">
          <span className="text-violet-400 font-bold">2.</span>
          <span>Enviá ETH directamente como oferta (mín. 5% sobre la más alta)</span>
        </div>
        <div className="flex gap-2">
          <span className="text-violet-400 font-bold">3.</span>
          <span>Si ofertás en los últimos 10 min, la subasta se extiende 10 min más</span>
        </div>
        <div className="flex gap-2">
          <span className="text-violet-400 font-bold">4.</span>
          <span>El owner finaliza la subasta y devuelve depósitos (−2% comisión)</span>
        </div>
        <div className="flex gap-2">
          <span className="text-violet-400 font-bold">5.</span>
          <span>El ganador retiene su depósito · Los no ganadores lo recuperan</span>
        </div>
      </div>
    </div>
  );
}
