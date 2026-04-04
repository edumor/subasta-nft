"use client";

import { useBidHistory, useAuctionInfo, useTokenInfo, formatBid, shortenAddress } from "@/hooks/useAuction";
import { SEPOLIA_EXPLORER } from "@/config/wagmi";

export function BidHistory() {
  const { data: auctionData } = useAuctionInfo();
  const info = auctionData
    ? {
        paymentToken: auctionData[3] as `0x${string}`,
        highestBidder: auctionData[5] as `0x${string}`,
        bidCount: auctionData[9] as bigint,
      }
    : null;

  const { symbol, decimals } = useTokenInfo(info?.paymentToken);
  const tokenDecimals = decimals ?? 18;

  const { data: bids, isLoading } = useBidHistory(0n, 20n);

  if (isLoading || !bids || bids.length === 0) {
    return (
      <div className="card">
        <h2 className="font-bold text-white text-lg mb-4">Bid History</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 bg-slate-700 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No bids yet. Be the first!</p>
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
        <h2 className="font-bold text-white text-lg">Bid History</h2>
        <span className="text-slate-400 text-sm">{(info?.bidCount ?? 0n).toString()} bidder(s)</span>
      </div>

      <div className="space-y-2">
        {sorted.map((bid, i) => {
          const isLeader =
            bid.bidder.toLowerCase() === info?.highestBidder.toLowerCase();
          const date = new Date(Number(bid.timestamp) * 1000);
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
                <div>
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
                  <p className="text-xs text-slate-500">{date.toLocaleString()}</p>
                </div>
                {isLeader && (
                  <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full">
                    Leader
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-white font-semibold text-sm">
                  {formatBid(bid.amount, tokenDecimals)} {symbol ?? "WETH"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {(info?.bidCount ?? 0n) > 20n && (
        <p className="text-center text-slate-500 text-xs mt-3">
          Showing top 20 bids
        </p>
      )}
    </div>
  );
}
