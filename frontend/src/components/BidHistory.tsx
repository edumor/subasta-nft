"use client";

import { useBidHistory, useAuctionState, useTokenSymbol, formatEth, shortenAddress } from "@/hooks/useAuction";
import { SEPOLIA_EXPLORER } from "@/config/wagmi";

export function BidHistory() {
  const { data: auctionData } = useAuctionState();
  const highestBidder = auctionData?.[1]?.result as `0x${string}` | undefined;
  const bidCount      = auctionData?.[5]?.result as bigint | undefined;
  const paymentToken  = auctionData?.[8]?.result as `0x${string}` | undefined;
  const { data: tokenSymbol } = useTokenSymbol(paymentToken);
  const symbol = (tokenSymbol as string | undefined) ?? "TOKEN";

  const { data: bids, isLoading } = useBidHistory(0n, 20n);

  if (isLoading || !bids || bids.length === 0) {
    return (
      <div className="card">
        <h2 className="font-bold text-white text-lg mb-4">Historial de Ofertas</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 bg-slate-700 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Aún no hay ofertas. ¡Sé el primero!</p>
        )}
      </div>
    );
  }

  // Sort by amount desc
  const sorted = [...bids].sort((a, b) =>
    a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white text-lg">Historial de Ofertas</h2>
        <span className="text-slate-400 text-sm">{(bidCount ?? 0n).toString()} ofertante(s)</span>
      </div>

      <div className="space-y-2">
        {sorted.map((bid, i) => {
          const isLeader =
            highestBidder &&
            bid.bidder.toLowerCase() === highestBidder.toLowerCase();

          return (
            <div
              key={bid.bidder}
              className={`flex items-center justify-between rounded-lg p-3 ${
                isLeader
                  ? "bg-violet-500/10 border border-violet-500/30"
                  : "bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-xs w-5">#{i + 1}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`${SEPOLIA_EXPLORER}/address/${bid.bidder}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-mono text-sm transition-colors ${
                      isLeader
                        ? "text-violet-300 hover:text-violet-200"
                        : "text-slate-300 hover:text-violet-400"
                    }`}
                  >
                    {shortenAddress(bid.bidder)} ↗
                  </a>
                  {isLeader && (
                    <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full">
                      Líder
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold text-sm">
                  {formatEth(bid.amount)} {symbol}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {(bidCount ?? 0n) > 20n && (
        <p className="text-center text-slate-500 text-xs mt-3">
          Mostrando las 20 ofertas más altas
        </p>
      )}
    </div>
  );
}
