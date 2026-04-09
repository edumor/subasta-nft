"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AuctionCard } from "@/components/AuctionCard";
import { BidForm } from "@/components/BidForm";
import { ActionButtons } from "@/components/ActionButtons";
import { BidHistory } from "@/components/BidHistory";
import { AdminPanel } from "@/components/AdminPanel";

export default function Home() {
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <div className="text-center py-4">
          <h2 className="text-3xl font-bold text-white mb-2">
            Subasta de NFTs Descentralizada
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Ofertá con WETH en Sepolia. Bids en ERC-20, precio en USD vía Chainlink.
            Extensión automática de 10 min si hay oferta al cierre. Contrato seguro y transparente.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <TechBadge emoji="🔷" label="Solidity 0.8.28" />
            <TechBadge emoji="💎" label="Bids en WETH (ERC-20)" />
            <TechBadge emoji="🛡️" label="CEI + ReentrancyGuard" />
            <TechBadge emoji="⏱️" label="Auto-extensión 10 min" />
            <TechBadge emoji="📈" label="USD via Chainlink" />
            <TechBadge emoji="🌐" label="Sepolia Testnet" />
          </div>
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────────────── */}
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

        {/* ── Admin Panel (seller only — auto-hidden for everyone else) ──────── */}
        <AdminPanel />

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
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
            · Ingeniero de Sistemas &amp; Blockchain Developer
          </p>
          <p>
            <a
              href="https://github.com/edumor/subasta-nft"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-violet-400 transition-colors"
            >
              Ver en GitHub ↗
            </a>
            {" · "}
            <a
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-violet-400 transition-colors"
            >
              Sepolia Etherscan ↗
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
          <span>Conectá MetaMask a la red <strong className="text-slate-300">Sepolia</strong></span>
        </div>
        <div className="flex gap-2">
          <span className="text-violet-400 font-bold">2.</span>
          <span>Aprobá el gasto de <strong className="text-slate-300">WETH</strong> para el contrato (un click)</span>
        </div>
        <div className="flex gap-2">
          <span className="text-violet-400 font-bold">3.</span>
          <span>Enviá tu oferta en WETH (mínimo 5% sobre la más alta)</span>
        </div>
        <div className="flex gap-2">
          <span className="text-violet-400 font-bold">4.</span>
          <span>Si ofertás en los últimos 10 min, la subasta se extiende 10 min más</span>
        </div>
        <div className="flex gap-2">
          <span className="text-violet-400 font-bold">5.</span>
          <span>Al cierre: el NFT va al ganador · Otros reclaman su depósito (−2% comisión)</span>
        </div>
      </div>
    </div>
  );
}
