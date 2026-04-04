"use client";

import { useAccount, useWriteContract } from "wagmi";
import { AUCTION_NFT_ABI } from "@/config/abi";
import { AUCTION_CONTRACT_ADDRESS } from "@/config/wagmi";
import { useAuctionInfo, useUserDeposit, formatBid, useTokenInfo } from "@/hooks/useAuction";

export function ActionButtons({ onAction }: { onAction: () => void }) {
  const { address, isConnected } = useAccount();
  const { data: auctionData, refetch } = useAuctionInfo();
  const { writeContractAsync, isPending } = useWriteContract();

  const info = auctionData
    ? {
        seller: auctionData[0] as `0x${string}`,
        paymentToken: auctionData[3] as `0x${string}`,
        highestBid: auctionData[4] as bigint,
        highestBidder: auctionData[5] as `0x${string}`,
        ended: auctionData[7] as boolean,
        cancelled: auctionData[8] as boolean,
      }
    : null;

  const { data: myDeposit } = useUserDeposit(address);
  const { symbol, decimals } = useTokenInfo(info?.paymentToken);

  if (!isConnected || !address || !info) return null;

  const isSeller = address.toLowerCase() === info.seller.toLowerCase();
  const isWinner = address.toLowerCase() === info.highestBidder.toLowerCase();
  const isLoser = !isWinner && (myDeposit ?? 0n) > 0n;
  const isEnded = info.ended || info.cancelled;
  const isActive = !info.ended && !info.cancelled;

  async function call(fn: string) {
    try {
      await writeContractAsync({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_NFT_ABI,
        functionName: fn as any,
        args: [],
      });
      await refetch();
      onAction();
    } catch (e) {
      console.error(e);
    }
  }

  const buttons: { label: string; fn: string; variant: "primary" | "secondary" | "danger" }[] = [];

  if (isActive && isSeller && info.highestBid === 0n) {
    buttons.push({ label: "Cancel Auction", fn: "cancelAuction", variant: "danger" });
  }
  if (isActive && isSeller) {
    buttons.push({ label: "End Auction Early", fn: "endAuction", variant: "secondary" });
  }
  if (isEnded && !info.cancelled && info.highestBid > 0n) {
    buttons.push({ label: "Settle Auction", fn: "settleAuction", variant: "primary" });
  }
  if (isEnded && !info.cancelled && isLoser) {
    buttons.push({ label: "Claim Refund", fn: "claimRefund", variant: "secondary" });
  }
  if (isEnded && !info.cancelled && isSeller) {
    buttons.push({ label: "Refund All Losers", fn: "refundLosers", variant: "secondary" });
  }
  if (info.cancelled && (myDeposit ?? 0n) > 0n) {
    buttons.push({ label: "Withdraw Deposit", fn: "withdrawOnCancel", variant: "secondary" });
  }
  if (isActive && !isWinner && (myDeposit ?? 0n) > (myDeposit ?? 0n)) {
    // partialWithdraw only makes sense if deposit > lastBid
    buttons.push({ label: "Partial Withdraw Excess", fn: "partialWithdraw", variant: "secondary" });
  }

  if (buttons.length === 0) return null;

  return (
    <div className="card space-y-4">
      <h2 className="font-bold text-white text-lg">Actions</h2>

      {myDeposit && myDeposit > 0n && (
        <div className="bg-slate-900 rounded-lg p-3 text-sm">
          <p className="text-slate-400 text-xs mb-1">Your deposit</p>
          <p className="text-white font-medium">
            {formatBid(myDeposit, decimals ?? 18)} {symbol ?? "WETH"}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {buttons.map((b) => (
          <button
            key={b.fn}
            disabled={isPending}
            onClick={() => call(b.fn)}
            className={
              b.variant === "primary"
                ? "btn-primary"
                : b.variant === "danger"
                ? "bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                : "btn-secondary"
            }
          >
            {isPending ? "Processing…" : b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
