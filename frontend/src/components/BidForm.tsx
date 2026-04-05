"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { AUCTION_ABI } from "@/config/abi";
import { AUCTION_CONTRACT_ADDRESS } from "@/config/wagmi";
import {
  useAuctionState,
  useUserDeposit,
  useUserLastBid,
  useUserLastBidTime,
  useWalletBalance,
  formatEth,
} from "@/hooks/useAuction";

export function BidForm() {
  const { address, isConnected } = useAccount();
  const [bidInput, setBidInput] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  const { data: auctionData } = useAuctionState();
  const highestBid  = auctionData?.[2]?.result as bigint | undefined;
  const ended       = auctionData?.[3]?.result as boolean | undefined;
  const cancelled   = auctionData?.[4]?.result as boolean | undefined;

  const { data: myDeposit } = useUserDeposit(address);
  const { data: myLastBid } = useUserLastBid(address);
  const { data: lastBidTime } = useUserLastBidTime(address);
  const { data: walletBalance } = useWalletBalance(address);

  const { writeContractAsync } = useWriteContract();
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash });

  const isActive = !ended && !cancelled;

  // Minimum bid: highestBid + 5% (or 0.001 ETH if no bids yet)
  const minBid = highestBid && highestBid > 0n
    ? highestBid + (highestBid * 5n) / 100n
    : parseEther("0.001");

  // How much more ETH the user needs to send (minBid - existing deposit)
  const myCurrentDeposit = myDeposit ?? 0n;
  const additionalNeeded = minBid > myCurrentDeposit ? minBid - myCurrentDeposit : 0n;

  // Can bid again?
  const now = BigInt(Math.floor(Date.now() / 1000));
  const waitUntil = lastBidTime ? (lastBidTime as bigint) + 60n : 0n;
  const mustWait = lastBidTime && (lastBidTime as bigint) > 0n && now < waitUntil;
  const waitSeconds = mustWait ? Number(waitUntil - now) : 0;

  const bidAmountEth = bidInput
    ? (() => { try { return parseEther(bidInput); } catch { return 0n; } })()
    : 0n;

  async function handleBid() {
    if (!address || bidAmountEth === 0n) return;
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: "bid",
        value: bidAmountEth,
      });
      setTxHash(hash);
      setBidInput("");
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Transaction failed");
    }
  }

  if (!isConnected) {
    return (
      <div className="card text-center py-8">
        <p className="text-2xl mb-2">🔗</p>
        <p className="text-slate-300 font-medium">Conectá tu wallet para ofertar</p>
        <p className="text-slate-500 text-sm mt-1">Asegurate de estar en la red Sepolia</p>
      </div>
    );
  }

  if (!isActive) return null;

  const isProcessing = isTxPending;

  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white text-lg">Realizar Oferta</h2>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-1">Tu Balance</p>
          <p className="text-white font-medium">
            {walletBalance ? formatEth(walletBalance.value) : "—"} ETH
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-1">Tu Depósito Actual</p>
          <p className="text-white font-medium">
            {myCurrentDeposit > 0n ? `${formatEth(myCurrentDeposit)} ETH` : "Ninguno"}
          </p>
        </div>
      </div>

      {/* Min bid hint */}
      {additionalNeeded > 0n && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-300">
            Mínimo a enviar:{" "}
            <strong>{formatEth(additionalNeeded)} ETH</strong>
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
        <label className="text-slate-400 text-sm">ETH a enviar</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.001"
            value={bidInput}
            onChange={(e) => setBidInput(e.target.value)}
            placeholder={`mín. ${formatEth(additionalNeeded > 0n ? additionalNeeded : parseEther("0.001"))} ETH`}
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-violet-500 outline-none rounded-lg px-4 py-3 text-white placeholder-slate-600 transition-colors"
            disabled={isProcessing || !!mustWait}
          />
          <span className="flex items-center px-3 text-slate-400 bg-slate-800 border border-slate-700 rounded-lg text-sm">
            ETH
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        className="btn-primary w-full"
        onClick={handleBid}
        disabled={isProcessing || bidAmountEth === 0n || !!mustWait}
      >
        {isProcessing ? "Enviando oferta…" : "Ofertar"}
      </button>

      <p className="text-xs text-slate-500">
        El ETH se envía directamente al contrato. Mínimo 5% sobre la oferta más alta. 1 minuto entre ofertas del mismo usuario.
      </p>
    </div>
  );
}
