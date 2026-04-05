"use client";

import { useAuctionState, formatEth, shortenAddress } from "@/hooks/useAuction";
import { SEPOLIA_EXPLORER, AUCTION_CONTRACT_ADDRESS } from "@/config/wagmi";

export function AuctionCard({ onRefresh }: { onRefresh: () => void }) {
  const { data, isLoading, error } = useAuctionState();

  const owner       = data?.[0]?.result as `0x${string}` | undefined;
  const highestBidder = data?.[1]?.result as `0x${string}` | undefined;
  const highestBid  = data?.[2]?.result as bigint | undefined;
  const ended       = data?.[3]?.result as boolean | undefined;
  const cancelled   = data?.[4]?.result as boolean | undefined;
  const bidCount    = data?.[5]?.result as bigint | undefined;

  const isActive = !ended && !cancelled;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const hasNoBids = !highestBid || highestBid === 0n;

  const statusBadge = cancelled
    ? <span className="badge-cancelled">Cancelada</span>
    : ended
    ? <span className="badge-ended">Finalizada</span>
    : <span className="badge-active">Activa</span>;

  if (isLoading) {
    return (
      <div className="card animate-pulse space-y-4">
        <div className="h-6 bg-slate-700 rounded w-1/3" />
        <div className="h-12 bg-slate-700 rounded" />
        <div className="h-8 bg-slate-700 rounded w-1/2" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card border-red-500/30">
        <p className="text-red-400 text-sm">
          No se pudo cargar el estado de la subasta. Verificá que la dirección del contrato sea correcta.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-2xl">
            🔨
          </div>
          <div>
            <p className="text-white font-bold text-lg">Subasta Segura</p>
            <a
              href={`${SEPOLIA_EXPLORER}/address/${AUCTION_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-violet-400 transition-colors font-mono"
            >
              {shortenAddress(AUCTION_CONTRACT_ADDRESS)} ↗
            </a>
          </div>
        </div>
        {statusBadge}
      </div>

      {/* Bid info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-lg p-4 space-y-1">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Oferta Más Alta</p>
          {hasNoBids ? (
            <p className="text-slate-300 font-semibold">Sin ofertas</p>
          ) : (
            <p className="text-white font-bold text-xl">
              {formatEth(highestBid!)} ETH
            </p>
          )}
        </div>

        <div className="bg-slate-900 rounded-lg p-4 space-y-1">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Líder</p>
          {!highestBidder || highestBidder === zeroAddress || hasNoBids ? (
            <p className="text-slate-300 font-semibold">Ninguno</p>
          ) : (
            <a
              href={`${SEPOLIA_EXPLORER}/address/${highestBidder}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 font-mono text-sm transition-colors"
            >
              {shortenAddress(highestBidder)} ↗
            </a>
          )}
          <p className="text-slate-500 text-xs">{(bidCount ?? 0n).toString()} ofertante(s)</p>
        </div>
      </div>

      {/* Status info */}
      {!isActive && (
        <div className={`rounded-lg p-3 text-sm ${cancelled ? "bg-red-500/10 border border-red-500/20" : "bg-emerald-500/10 border border-emerald-500/20"}`}>
          <p className={cancelled ? "text-red-300" : "text-emerald-300"}>
            {cancelled
              ? "⚠️ La subasta fue cancelada. Los postores pueden retirar sus depósitos."
              : ended
              ? `✅ Subasta finalizada. Ganador: ${highestBidder && highestBidder !== zeroAddress ? shortenAddress(highestBidder) : "ninguno"} con ${hasNoBids ? "0" : formatEth(highestBid!)} ETH.`
              : ""}
          </p>
        </div>
      )}

      {/* Owner */}
      <div className="pt-2 border-t border-slate-700 text-xs text-slate-500">
        <span>
          Propietario:{" "}
          <a
            href={`${SEPOLIA_EXPLORER}/address/${owner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-violet-400 font-mono transition-colors"
          >
            {owner ? shortenAddress(owner) : "—"} ↗
          </a>
        </span>
      </div>
    </div>
  );
}
