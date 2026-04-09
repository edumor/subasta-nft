"use client";

import { useAccount, useWriteContract } from "wagmi";
import { AUCTION_ABI } from "@/config/abi";
import { useAuctionConfig } from "@/hooks/useAuctionConfig";
import { useAuctionState, useUserDeposit, formatToken } from "@/hooks/useAuction";
import { useTokenSymbol, useTokenDecimals } from "@/hooks/useAuction";

export function ActionButtons({ onAction }: { onAction: () => void }) {
  const { address, isConnected } = useAccount();
  const { contractAddress } = useAuctionConfig();
  const { data: auctionData, refetch } = useAuctionState();
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  const seller         = auctionData?.[0]?.result as `0x${string}` | undefined;
  const highestBidder  = auctionData?.[1]?.result as `0x${string}` | undefined;
  const highestBid     = auctionData?.[2]?.result as bigint | undefined;
  const ended          = auctionData?.[3]?.result as boolean | undefined;
  const cancelled      = auctionData?.[4]?.result as boolean | undefined;
  const auctionEndTime = auctionData?.[6]?.result as bigint | undefined;
  const startTime      = auctionData?.[7]?.result as bigint | undefined;
  const paymentToken   = auctionData?.[8]?.result as `0x${string}` | undefined;
  const nftDeposited   = auctionData?.[11]?.result as boolean | undefined;

  const { data: myDeposit } = useUserDeposit(address);
  const { data: tokenSymbol } = useTokenSymbol(paymentToken);
  const { data: tokenDecimals } = useTokenDecimals(paymentToken);

  if (!isConnected || !address || !auctionData) return null;

  const decimals = typeof tokenDecimals === "number" ? tokenDecimals : 18;
  const symbol   = (tokenSymbol as string | undefined) ?? "TOKEN";

  const now        = BigInt(Math.floor(Date.now() / 1000));
  const isPending  = startTime !== undefined && now < startTime;
  const isSeller   = !!seller && address.toLowerCase() === seller.toLowerCase();
  const isWinner   = !!highestBidder && address.toLowerCase() === highestBidder.toLowerCase();
  const hasNoBids  = !highestBid || highestBid === 0n;
  const isEnded    = !!ended || !!cancelled ||
    (auctionEndTime !== undefined && now >= auctionEndTime);
  const isActive   = !isEnded && !isPending;

  async function call(fn: string) {
    try {
      await writeContractAsync({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: fn as any,
        args: [],
      });
      await refetch();
      onAction();
    } catch (e: any) {
      console.error(`[ActionButtons] ${fn} failed:`, e?.shortMessage ?? e?.message);
    }
  }

  type Variant = "primary" | "secondary" | "danger";
  const buttons: { label: string; fn: string; variant: Variant; tooltip?: string }[] = [];

  // ── Seller actions ──────────────────────────────────────────────────────────

  // cancelBeforeStart: only during the pending window (before startTime)
  if (isPending && isSeller) {
    buttons.push({
      label: "Cancelar Subasta (antes del inicio)",
      fn: "cancelBeforeStart",
      variant: "danger",
      tooltip: "Cancelá la subasta programada antes de que comience",
    });
  }

  if (isActive && isSeller && hasNoBids) {
    buttons.push({
      label: "Cancelar Subasta",
      fn: "cancelAuction",
      variant: "danger",
      tooltip: "Solo posible si no hay ofertas",
    });
  }

  if (isActive && isSeller) {
    buttons.push({
      label: "Finalizar Subasta Ahora",
      fn: "endAuction",
      variant: "secondary",
      tooltip: "Termina la subasta antes del tiempo programado",
    });
  }

  // settleAuction: anyone can call it (incentivises settlement), but show it to seller
  if (isEnded && !cancelled && !hasNoBids) {
    buttons.push({
      label: "Liquidar Subasta (NFT → Ganador)",
      fn: "settleAuction",
      variant: "primary",
      tooltip: "Transfiere el NFT al ganador y paga al vendedor",
    });
  }

  // refundLosers: seller batch-refunds all non-winners (−2% fee)
  if (isEnded && !cancelled && isSeller) {
    buttons.push({
      label: `Devolver Depósitos (−2%) — Todos`,
      fn: "refundLosers",
      variant: "secondary",
      tooltip: "Devuelve depósitos a todos los que no ganaron (descuenta 2% de comisión)",
    });
  }

  // ── Participant actions ─────────────────────────────────────────────────────

  // partialWithdraw: refund excess over current winning bid while auction is active
  if (isActive && (myDeposit ?? 0n) > 0n && !isWinner) {
    buttons.push({
      label: "Retiro Parcial de Exceso",
      fn: "partialWithdraw",
      variant: "secondary",
      tooltip: "Recuperá los tokens por encima de tu oferta actual",
    });
  }

  // claimRefund: pull-based refund for individual non-winners after auction ends
  if (isEnded && !cancelled && !isWinner && (myDeposit ?? 0n) > 0n) {
    buttons.push({
      label: `Reclamar Reembolso (−2%)`,
      fn: "claimRefund",
      variant: "secondary",
      tooltip: "Recuperá tu depósito (se descuenta 2% de comisión)",
    });
  }

  // reclaimNFT: seller recovers NFT when auction ended with zero bids
  if (isEnded && !cancelled && hasNoBids && isSeller) {
    buttons.push({
      label: "Recuperar NFT (sin ofertas)",
      fn: "reclaimNFT",
      variant: "secondary",
      tooltip: "La subasta terminó sin ofertas — recuperá el NFT al contrato del seller",
    });
  }

  // withdrawOnCancel: full refund when auction is cancelled
  if (cancelled && (myDeposit ?? 0n) > 0n) {
    buttons.push({
      label: "Retirar Depósito (subasta cancelada)",
      fn: "withdrawOnCancel",
      variant: "secondary",
      tooltip: "Recuperá tu depósito completo, la subasta fue cancelada",
    });
  }

  if (buttons.length === 0) return null;

  return (
    <div className="card space-y-4">
      <h2 className="font-bold text-white text-lg">Acciones</h2>

      {/* User's deposit summary */}
      {(myDeposit ?? 0n) > 0n && (
        <div className="bg-slate-900 rounded-lg p-3 text-sm">
          <p className="text-slate-400 text-xs mb-1">Tu depósito en el contrato</p>
          <p className="text-white font-medium">{formatToken(myDeposit! as bigint, decimals)} {symbol}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {buttons.map((b) => (
          <button
            key={b.fn}
            disabled={isTxPending}
            onClick={() => call(b.fn)}
            title={b.tooltip}
            className={
              b.variant === "primary"
                ? "btn-primary"
                : b.variant === "danger"
                ? "bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                : "btn-secondary"
            }
          >
            {isTxPending ? "Procesando…" : b.label}
          </button>
        ))}
      </div>

      {isSeller && isEnded && !cancelled && (
        <p className="text-xs text-slate-500">
          💡 Podés usar "Devolver Depósitos" para reembolsar a todos en una sola tx, o dejar que cada uno use "Reclamar Reembolso" individualmente.
        </p>
      )}
    </div>
  );
}
