"use client";

import { useState, useMemo } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import { AUCTION_ABI, ERC20_ABI } from "@/config/abi";
import { useAuctionConfig } from "@/hooks/useAuctionConfig";
import {
  useAuctionState,
  useUserDeposit,
  useUserLastBid,
  useUserLastBidTime,
  useTokenAllowance,
  useTokenBalance,
  useTokenSymbol,
  useTokenDecimals,
  formatToken,
} from "@/hooks/useAuction";

type Step = "idle" | "approving" | "approved" | "bidding" | "done";

export function BidForm() {
  const { address, isConnected } = useAccount();
  const { contractAddress } = useAuctionConfig();

  const [bidInput, setBidInput] = useState("");
  const [step, setStep]         = useState<Step>("idle");
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [bidTxHash, setBidTxHash]         = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  // ── Chain reads ─────────────────────────────────────────────────────────────
  const { data: auctionData, refetch: refetchAuction } = useAuctionState();
  const highestBid    = auctionData?.[2]?.result as bigint | undefined;
  const ended         = auctionData?.[3]?.result as boolean | undefined;
  const cancelled     = auctionData?.[4]?.result as boolean | undefined;
  const auctionEndTime= auctionData?.[6]?.result as bigint | undefined;
  const startTime     = auctionData?.[7]?.result as bigint | undefined;
  const paymentToken  = auctionData?.[8]?.result as `0x${string}` | undefined;
  const nftDeposited  = auctionData?.[11]?.result as boolean | undefined;

  const { data: myDeposit,   refetch: refetchDeposit  } = useUserDeposit(address);
  const { data: myLastBid                              } = useUserLastBid(address);
  const { data: lastBidTime                            } = useUserLastBidTime(address);
  const { data: allowance,   refetch: refetchAllowance } = useTokenAllowance(paymentToken, address);
  const { data: tokenBalance                           } = useTokenBalance(paymentToken, address);
  const { data: tokenSymbol                            } = useTokenSymbol(paymentToken);
  const { data: tokenDecimals                          } = useTokenDecimals(paymentToken);

  const { writeContractAsync } = useWriteContract();

  // Watch approve tx
  const { isLoading: isApproving, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  // Watch bid tx
  const { isLoading: isBidding, isSuccess: bidConfirmed } =
    useWaitForTransactionReceipt({ hash: bidTxHash });

  // ── Derived values ───────────────────────────────────────────────────────────
  const decimals  = typeof tokenDecimals === "number" ? tokenDecimals : 18;
  const symbol    = (tokenSymbol as string | undefined) ?? "TOKEN";

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isPending = startTime !== undefined && now < startTime;
  const isActive  = !ended && !cancelled && !isPending &&
    (auctionEndTime === undefined || now < auctionEndTime);

  const myCurrentDeposit = (myDeposit ?? 0n) as bigint;

  // Minimum total bid (existing deposit + this call must exceed highestBid + 5%)
  const minTotal = highestBid && highestBid > 0n
    ? highestBid + (highestBid * 5n) / 100n
    : parseUnits("0.001", decimals);

  // How much more the user needs to send this tx
  const additionalNeeded = minTotal > myCurrentDeposit
    ? minTotal - myCurrentDeposit
    : 0n;

  // 1-min cooldown check
  const waitUntil   = lastBidTime ? (lastBidTime as bigint) + 60n : 0n;
  const mustWait    = lastBidTime && (lastBidTime as bigint) > 0n && now < waitUntil;
  const waitSeconds = mustWait ? Number(waitUntil - now) : 0;

  // Parse user's typed bid amount
  const bidAmountRaw = useMemo(() => {
    if (!bidInput) return 0n;
    const normalized = bidInput.replace(",", ".");
    try { return parseUnits(normalized, decimals); } catch { return 0n; }
  }, [bidInput, decimals]);

  // Does the user have enough allowance for this bid?
  const currentAllowance = (allowance ?? 0n) as bigint;
  const needsApproval = bidAmountRaw > 0n && currentAllowance < bidAmountRaw;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleApprove() {
    if (!address || !paymentToken || bidAmountRaw === 0n) return;
    setError(null);
    setStep("approving");
    try {
      const hash = await writeContractAsync({
        address: paymentToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [contractAddress, maxUint256], // approve max so user doesn't need to approve each time
      });
      setApproveTxHash(hash);
      // step transitions to "approved" once tx confirms (handled by useEffect below)
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Aprobación fallida");
      setStep("idle");
    }
  }

  async function handleBid() {
    if (!address || bidAmountRaw === 0n) return;
    setError(null);
    setStep("bidding");
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: "bid",
        args: [bidAmountRaw],
        // ⚠️  No `value` here — this is an ERC-20 transfer, not native ETH
      });
      setBidTxHash(hash);
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Transacción fallida");
      setStep(needsApproval ? "approved" : "idle");
    }
  }

  // Transition to "approved" once approve tx confirms
  if (approveConfirmed && step === "approving") {
    setStep("approved");
    refetchAllowance();
  }

  // Transition to "done" once bid tx confirms
  if (bidConfirmed && step === "bidding") {
    setStep("done");
    setBidInput("");
    refetchDeposit();
    refetchAuction();
  }

  // ── Render guards ─────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="card text-center py-8">
        <p className="text-2xl mb-2">🔗</p>
        <p className="text-slate-300 font-medium">Conectá tu wallet para ofertar</p>
        <p className="text-slate-500 text-sm mt-1">Asegurate de estar en la red Sepolia</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="card text-center py-8">
        <p className="text-2xl mb-2">⏳</p>
        <p className="text-slate-300 font-medium">La subasta aún no comenzó</p>
        <p className="text-slate-500 text-sm mt-1">Volvé cuando inicie para poder ofertar</p>
      </div>
    );
  }

  if (!isActive) return null;

  // NFT not deposited — block bidding before even showing the form
  if (nftDeposited === false) {
    return (
      <div className="card border-red-500/30 text-center py-8">
        <p className="text-2xl mb-2">🔒</p>
        <p className="text-red-300 font-medium">NFT no depositado</p>
        <p className="text-slate-500 text-sm mt-1">
          El vendedor aún no transfirió el NFT al contrato. Las ofertas están deshabilitadas.
        </p>
      </div>
    );
  }

  const isProcessing = isApproving || isBidding || step === "approving" || step === "bidding";

  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white text-lg">Realizar Oferta</h2>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-1">Tu Balance ({symbol})</p>
          <p className="text-white font-medium">
            {tokenBalance !== undefined ? formatToken(tokenBalance as bigint, decimals) : "—"} {symbol}
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-1">Tu Depósito Actual</p>
          <p className="text-white font-medium">
            {myCurrentDeposit > 0n ? `${formatToken(myCurrentDeposit, decimals)} ${symbol}` : "Ninguno"}
          </p>
        </div>
      </div>

      {/* Min bid hint */}
      {additionalNeeded > 0n && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-300">
            Mínimo a enviar:{" "}
            <strong>{formatToken(additionalNeeded, decimals)} {symbol}</strong>
            <span className="text-slate-400"> (oferta actual + 5%)</span>
          </p>
        </div>
      )}

      {/* Wait warning */}
      {mustWait && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm">
          <p className="text-orange-300">
            ⏳ Debés esperar {waitSeconds}s antes de volver a ofertar (mínimo 1 minuto entre ofertas)
          </p>
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <label className="text-slate-400 text-sm">{symbol} a enviar</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.001"
            value={bidInput}
            onChange={(e) => {
              setBidInput(e.target.value);
              if (step === "done") setStep("idle");
            }}
            placeholder={`mín. ${formatToken(additionalNeeded > 0n ? additionalNeeded : parseUnits("0.001", decimals), decimals)}`}
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-violet-500 outline-none rounded-lg px-4 py-3 text-white placeholder-slate-600 transition-colors"
            disabled={isProcessing}
          />
          <span className="flex items-center px-3 text-slate-400 bg-slate-800 border border-slate-700 rounded-lg text-sm">
            {symbol}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Success */}
      {step === "done" && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-300">
          ✅ ¡Oferta enviada exitosamente!
        </div>
      )}

      {/* ── Two-step ERC-20 flow ────────────────────────────────────────────── */}

      {/* Step 1 — Approve (only when allowance is insufficient) */}
      {needsApproval && step !== "approved" && step !== "done" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white font-bold text-[10px]">1</span>
            Primero aprobá el gasto de {symbol}
          </div>
          <button
            className="btn-primary w-full"
            onClick={handleApprove}
            disabled={isProcessing || bidAmountRaw === 0n || !!mustWait}
          >
            {step === "approving" || isApproving ? "Aprobando…" : `Aprobar ${symbol}`}
          </button>
        </div>
      )}

      {/* Step 2 — Bid (shown once approved, or if allowance was already enough) */}
      {(!needsApproval || step === "approved" || step === "done") && (
        <div className="space-y-2">
          {needsApproval && step === "approved" && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white font-bold text-[10px]">2</span>
              Aprobación confirmada — enviá tu oferta
            </div>
          )}
          <button
            className="btn-primary w-full"
            onClick={handleBid}
            disabled={isProcessing || bidAmountRaw === 0n || !!mustWait}
          >
            {step === "bidding" || isBidding ? "Enviando oferta…" : "Ofertar"}
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Los tokens {symbol} se transfieren al contrato vía ERC-20. Mínimo 5% sobre la oferta más alta. 1 minuto entre ofertas del mismo usuario.
      </p>
    </div>
  );
}
