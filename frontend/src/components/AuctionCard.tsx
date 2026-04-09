"use client";

import { useCallback } from "react";
import { useAuctionState, formatToken, formatDateTime, shortenAddress } from "@/hooks/useAuction";
import { useAuctionConfig } from "@/hooks/useAuctionConfig";
import { useTokenSymbol } from "@/hooks/useAuction";
import { CountdownTimer } from "./CountdownTimer";
import { SEPOLIA_EXPLORER } from "@/config/wagmi";

export function AuctionCard({ onRefresh }: { onRefresh: () => void }) {
  const { data, isLoading, error, refetch } = useAuctionState();
  const { config } = useAuctionConfig();

  const seller          = data?.[0]?.result as `0x${string}` | undefined;
  const highestBidder   = data?.[1]?.result as `0x${string}` | undefined;
  const highestBid      = data?.[2]?.result as bigint | undefined;
  const ended           = data?.[3]?.result as boolean | undefined;
  const cancelled       = data?.[4]?.result as boolean | undefined;
  const bidCount        = data?.[5]?.result as bigint | undefined;
  const auctionEndTime  = data?.[6]?.result as bigint | undefined;
  const startTime       = data?.[7]?.result as bigint | undefined;
  const paymentToken    = data?.[8]?.result as `0x${string}` | undefined;
  const nftContractAddr = data?.[9]?.result as `0x${string}` | undefined;
  const nftTokenId      = data?.[10]?.result as bigint | undefined;
  const nftDeposited    = data?.[11]?.result as boolean | undefined;
  const originalEndTime = data?.[12]?.result as bigint | undefined;

  const { data: tokenSymbol } = useTokenSymbol(paymentToken);

  const symbol = (tokenSymbol as string | undefined) ?? "TOKEN";

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isPending  = startTime !== undefined && now < startTime;
  const isActive   = !ended && !cancelled && !isPending;
  const isEnded    = (ended || (auctionEndTime !== undefined && now >= auctionEndTime)) && !cancelled;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const hasNoBids  = !highestBid || highestBid === 0n;
  // True when at least one late bid triggered the 10-minute auto-extension
  const isExtended = originalEndTime !== undefined &&
    auctionEndTime !== undefined &&
    auctionEndTime > originalEndTime;

  const handleExpire = useCallback(() => {
    refetch();
    onRefresh();
  }, [refetch, onRefresh]);

  // ── Status badge ─────────────────────────────────────────────────────────────
  const statusBadge = cancelled
    ? <span className="badge-cancelled">Cancelada</span>
    : isPending
    ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">⏳ Pendiente</span>
    : isActive
    ? <span className="badge-active">Activa</span>
    : <span className="badge-ended">Finalizada</span>;

  // ── Loading skeleton ─────────────────────────────────────────────────────────
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

      {/* ── Header: NFT visual + status ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {/* NFT image (from admin config) or placeholder */}
          {config.nftImageUrl ? (
            <img
              src={config.nftImageUrl}
              alt={config.nftName || "NFT"}
              className="w-16 h-16 rounded-xl object-cover border border-slate-700 shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-3xl shadow-lg">
              🔨
            </div>
          )}
          <div>
            <p className="text-white font-bold text-lg leading-tight">
              {config.nftName || "Subasta Descentralizada"}
            </p>
            {config.nftDescription && (
              <p className="text-slate-400 text-xs mt-0.5 max-w-xs line-clamp-2">
                {config.nftDescription}
              </p>
            )}
            <a
              href={`${SEPOLIA_EXPLORER}/address/${config.contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-violet-400 transition-colors font-mono mt-1 inline-block"
            >
              {shortenAddress(config.contractAddress)} ↗
            </a>
          </div>
        </div>
        {statusBadge}
      </div>

      {/* ── NFT custody warning ───────────────────────────────────────────────── */}
      {nftDeposited === false && !cancelled && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
          <p className="text-red-300 font-medium">⚠️ El NFT no está depositado en el contrato</p>
          <p className="text-red-400/80 text-xs mt-1">
            El vendedor aún no transfirió el NFT al contrato de subasta. Las ofertas están bloqueadas hasta que el NFT sea depositado.
          </p>
        </div>
      )}

      {/* ── NFT contract info ─────────────────────────────────────────────────── */}
      {nftContractAddr && nftContractAddr !== zeroAddress && (
        <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            NFT:{" "}
            <a
              href={`${SEPOLIA_EXPLORER}/address/${nftContractAddr}`}
              target="_blank" rel="noopener noreferrer"
              className="font-mono text-slate-300 hover:text-violet-400 transition-colors"
            >
              {shortenAddress(nftContractAddr)} ↗
            </a>
          </span>
          {nftTokenId !== undefined && (
            <span>Token ID: <span className="text-slate-300 font-mono">#{nftTokenId.toString()}</span></span>
          )}
          {config.externalLink && (
            <a href={config.externalLink} target="_blank" rel="noopener noreferrer"
               className="text-violet-400 hover:text-violet-300 transition-colors">
              Ver en colección ↗
            </a>
          )}
        </div>
      )}

      {/* ── Countdown ─────────────────────────────────────────────────────────── */}
      {isPending && startTime !== undefined && (
        <div className="space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Inicia en</p>
          <CountdownTimer endTime={startTime} onExpire={handleExpire} />
          <p className="text-slate-500 text-xs">
            Inicio programado: {formatDateTime(startTime)}
          </p>
        </div>
      )}

      {isActive && auctionEndTime !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Tiempo restante</p>
            {isExtended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ⏱️ Extendida +10 min
              </span>
            )}
          </div>
          <CountdownTimer endTime={auctionEndTime} onExpire={handleExpire} />
          <div className="text-slate-500 text-xs space-y-0.5">
            <p>Cierre: <span className="text-slate-400">{formatDateTime(auctionEndTime)}</span></p>
            {isExtended && originalEndTime !== undefined && (
              <p className="text-amber-500/70">
                Cierre original: <span className="text-amber-400/80 line-through">{formatDateTime(originalEndTime)}</span>
                {" "}— extendida por oferta tardía
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Bid stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-lg p-4 space-y-1">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Oferta más alta</p>
          {hasNoBids ? (
            <p className="text-slate-300 font-semibold">Sin ofertas</p>
          ) : (
            <p className="text-white font-bold text-xl">
              {formatToken(highestBid!)} {symbol}
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

      {/* ── End / Cancel messages ─────────────────────────────────────────────── */}
      {!isActive && !isPending && (
        <div className={`rounded-lg p-3 text-sm ${
          cancelled
            ? "bg-red-500/10 border border-red-500/20"
            : "bg-emerald-500/10 border border-emerald-500/20"
        }`}>
          <p className={cancelled ? "text-red-300" : "text-emerald-300"}>
            {cancelled
              ? "⚠️ La subasta fue cancelada. Los postores pueden retirar sus depósitos."
              : `✅ Subasta finalizada. Ganador: ${
                  highestBidder && highestBidder !== zeroAddress
                    ? shortenAddress(highestBidder)
                    : "ninguno"
                } con ${hasNoBids ? "0" : formatToken(highestBid!)} ${symbol}.`}
          </p>
        </div>
      )}

      {/* ── Seller ────────────────────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-slate-700 text-xs text-slate-500">
        Vendedor:{" "}
        <a
          href={`${SEPOLIA_EXPLORER}/address/${seller}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-violet-400 font-mono transition-colors"
        >
          {seller ? shortenAddress(seller) : "—"} ↗
        </a>
        {auctionEndTime && (
          <span className="ml-4">
            Cierre: <span className="text-slate-400">{formatDateTime(auctionEndTime)}</span>
            {isExtended && <span className="ml-1 text-amber-500/70 text-xs">(extendida)</span>}
          </span>
        )}
      </div>
    </div>
  );
}
