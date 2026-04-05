"use client";

import { useAccount, useWriteContract } from "wagmi";
import { AUCTION_ABI } from "@/config/abi";
import { AUCTION_CONTRACT_ADDRESS } from "@/config/wagmi";
import { useAuctionState, useUserDeposit, formatEth } from "@/hooks/useAuction";

export function ActionButtons({ onAction }: { onAction: () => void }) {
  const { address, isConnected } = useAccount();
  const { data: auctionData, refetch } = useAuctionState();
  const { writeContractAsync, isPending } = useWriteContract();

  const owner         = auctionData?.[0]?.result as `0x${string}` | undefined;
  const highestBidder = auctionData?.[1]?.result as `0x${string}` | undefined;
  const highestBid    = auctionData?.[2]?.result as bigint | undefined;
  const ended         = auctionData?.[3]?.result as boolean | undefined;
  const cancelled     = auctionData?.[4]?.result as boolean | undefined;

  const { data: myDeposit } = useUserDeposit(address);

  if (!isConnected || !address || !auctionData) return null;

  const isOwner   = !!owner && address.toLowerCase() === owner.toLowerCase();
  const isWinner  = !!highestBidder && address.toLowerCase() === highestBidder.toLowerCase();
  const isLoser   = !isWinner && (myDeposit ?? 0n) > 0n;
  const isEnded   = !!ended || !!cancelled;
  const isActive  = !ended && !cancelled;
  const hasNoBids = !highestBid || highestBid === 0n;

  async function call(fn: string) {
    try {
      await writeContractAsync({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
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

  // Owner actions
  if (isActive && isOwner && hasNoBids) {
    buttons.push({ label: "Cancelar Subasta", fn: "cancelAuction", variant: "danger" });
  }
  if (isActive && isOwner) {
    buttons.push({ label: "Finalizar Subasta Ahora", fn: "endAuction", variant: "secondary" });
  }
  if (isEnded && !cancelled && isOwner && !hasNoBids) {
    buttons.push({ label: "Retirar Fondos Ganadores", fn: "withdrawFunds", variant: "primary" });
  }
  if (isEnded && !cancelled && isOwner) {
    buttons.push({ label: "Devolver Depósitos (−2%)", fn: "withdrawDeposits", variant: "secondary" });
  }
  if (isEnded && cancelled && isOwner) {
    buttons.push({ label: "Retiro de Emergencia", fn: "emergencyWithdraw", variant: "danger" });
  }

  // Participant actions
  if (isActive && !isWinner && (myDeposit ?? 0n) > (myDeposit ?? 0n)) {
    // partialWithdraw: only if deposit > lastBid — hard to know without reading lastBid here,
    // show it always when active and has deposit
  }
  if (isActive && (myDeposit ?? 0n) > 0n) {
    buttons.push({ label: "Retiro Parcial de Exceso", fn: "partialWithdraw", variant: "secondary" });
  }
  if (cancelled && (myDeposit ?? 0n) > 0n) {
    buttons.push({ label: "Retirar Depósito (cancelación)", fn: "withdrawDepositOnCancel", variant: "secondary" });
  }

  if (buttons.length === 0) return null;

  return (
    <div className="card space-y-4">
      <h2 className="font-bold text-white text-lg">Acciones</h2>

      {(myDeposit ?? 0n) > 0n && (
        <div className="bg-slate-900 rounded-lg p-3 text-sm">
          <p className="text-slate-400 text-xs mb-1">Tu depósito en el contrato</p>
          <p className="text-white font-medium">{formatEth(myDeposit!)} ETH</p>
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
            {isPending ? "Procesando…" : b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
