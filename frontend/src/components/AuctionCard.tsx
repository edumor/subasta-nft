"use client";

import { useAuctionInfo, useHighestBidUsd, useTokenInfo, formatBid, formatUsd, shortenAddress } from "@/hooks/useAuction";
import { CountdownTimer } from "./CountdownTimer";
import { SEPOLIA_EXPLORER } from "@/config/wagmi";

export function AuctionCard({ onRefresh }: { onRefresh: () => void }) {
  const { data, isLoading, error } = useAuctionInfo();
  const { data: usdValue } = useHighestBidUsd();

  // Parse result tuple
  const info = data
    ? {
        seller: data[0] as `0x${string}`,
        nft: data[1] as `0x${string}`,
        tokenId: data[2] as bigint,
        paymentToken: data[3] as `0x${string}`,
        highestBid: data[4] as bigint,
        highestBidder: data[5] as `0x${string}`,
        endTime: data[6] as bigint,
        ended: data[7] as boolean,
        cancelled: data[8] as boolean,
        bidCount: data[9] as bigint,
      }
    : null;

  const { symbol, decimals } = useTokenInfo(info?.paymentToken);

  const statusBadge = info?.cancelled
    ? <span className="badge-cancelled">Cancelled</span>
    : info?.ended
    ? <span className="badge-ended">Ended</span>
    : <span className="badge-active">Live</span>;

  if (isLoading) {
    return (
      <div className="card animate-pulse space-y-4">
        <div className="h-6 bg-slate-700 rounded w-1/3" />
        <div className="h-12 bg-slate-700 rounded" />
        <div className="h-8 bg-slate-700 rounded w-1/2" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="card border-red-500/30">
        <p className="text-red-400 text-sm">
          Could not load auction data. Make sure the contract address is set correctly in your environment.
        </p>
      </div>
    );
  }

  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const hasNoBids = info.highestBid === 0n;
  const isActive = !info.ended && !info.cancelled;

  return (
    <div className="card space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-2xl">
            🖼️
          </div>
          <div>
            <p className="text-slate-400 text-xs">NFT Token ID</p>
            <p className="text-white font-bold text-lg">#{info.tokenId.toString()}</p>
            <a
              href={`${SEPOLIA_EXPLORER}/address/${info.nft}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
            >
              {shortenAddress(info.nft)} ↗
            </a>
          </div>
        </div>
        {statusBadge}
      </div>

      {/* Bid info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-lg p-4 space-y-1">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Highest Bid</p>
          {hasNoBids ? (
            <p className="text-slate-300 font-semibold">No bids yet</p>
          ) : (
            <>
              <p className="text-white font-bold text-xl">
                {formatBid(info.highestBid, decimals ?? 18)} {symbol ?? "WETH"}
              </p>
              {usdValue !== undefined && (
                <p className="text-emerald-400 text-sm">{formatUsd(usdValue)}</p>
              )}
            </>
          )}
        </div>

        <div className="bg-slate-900 rounded-lg p-4 space-y-1">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Leader</p>
          {info.highestBidder === zeroAddress || hasNoBids ? (
            <p className="text-slate-300 font-semibold">None</p>
          ) : (
            <a
              href={`${SEPOLIA_EXPLORER}/address/${info.highestBidder}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 font-mono text-sm transition-colors"
            >
              {shortenAddress(info.highestBidder)} ↗
            </a>
          )}
          <p className="text-slate-500 text-xs">{info.bidCount.toString()} bidder(s)</p>
        </div>
      </div>

      {/* Countdown */}
      {isActive && (
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Time Remaining</p>
          <CountdownTimer endTime={info.endTime} onExpire={onRefresh} />
        </div>
      )}

      {/* Seller */}
      <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
        <span>
          Seller:{" "}
          <a
            href={`${SEPOLIA_EXPLORER}/address/${info.seller}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-violet-400 font-mono transition-colors"
          >
            {shortenAddress(info.seller)} ↗
          </a>
        </span>
        <span>
          Royalty: {(Number(info.royaltyBps ?? 0n) / 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
