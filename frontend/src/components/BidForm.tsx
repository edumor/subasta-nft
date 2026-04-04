"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { AUCTION_NFT_ABI, ERC20_ABI } from "@/config/abi";
import { AUCTION_CONTRACT_ADDRESS } from "@/config/wagmi";
import {
  useAuctionInfo,
  useAllowance,
  useTokenBalance,
  useTokenInfo,
  useUserDeposit,
  formatBid,
  formatUsd,
} from "@/hooks/useAuction";
import { useHighestBidUsd } from "@/hooks/useAuction";

export function BidForm() {
  const { address, isConnected } = useAccount();
  const [bidInput, setBidInput] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "bidding">("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { data: auctionData } = useAuctionInfo();
  const info = auctionData
    ? {
        paymentToken: auctionData[3] as `0x${string}`,
        highestBid: auctionData[4] as bigint,
        ended: auctionData[7] as boolean,
        cancelled: auctionData[8] as boolean,
      }
    : null;

  const { symbol, decimals } = useTokenInfo(info?.paymentToken);
  const tokenDecimals = decimals ?? 18;

  const { data: allowance, refetch: refetchAllowance } = useAllowance(info?.paymentToken, address);
  const { data: balance } = useTokenBalance(info?.paymentToken, address);
  const { data: myDeposit } = useUserDeposit(address);
  const { data: usdPreview } = useHighestBidUsd();

  const { writeContractAsync } = useWriteContract();
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash });

  const isActive = info && !info.ended && !info.cancelled;
  const bidAmountBig = bidInput
    ? (() => { try { return parseUnits(bidInput, tokenDecimals); } catch { return 0n; } })()
    : 0n;

  const minRequired =
    info && info.highestBid > 0n
      ? info.highestBid + (info.highestBid * 500n) / 10000n
      : 0n;
  const myCurrentBid = myDeposit ?? 0n;
  const additionalNeeded =
    minRequired > myCurrentBid ? minRequired - myCurrentBid : 0n;

  const needsApproval =
    allowance !== undefined && bidAmountBig > 0n && allowance < bidAmountBig;

  async function handleApprove() {
    if (!info || !address) return;
    setStep("approving");
    try {
      const hash = await writeContractAsync({
        address: info.paymentToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AUCTION_CONTRACT_ADDRESS, bidAmountBig],
      });
      setTxHash(hash);
      await refetchAllowance();
    } catch (e) {
      console.error(e);
    }
    setStep("idle");
  }

  async function handleBid() {
    if (!info || !address || bidAmountBig === 0n) return;
    setStep("bidding");
    try {
      const hash = await writeContractAsync({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_NFT_ABI,
        functionName: "bid",
        args: [bidAmountBig],
      });
      setTxHash(hash);
      setBidInput("");
    } catch (e) {
      console.error(e);
    }
    setStep("idle");
  }

  if (!isConnected) {
    return (
      <div className="card text-center py-8">
        <p className="text-2xl mb-2">🔗</p>
        <p className="text-slate-300 font-medium">Connect your wallet to bid</p>
        <p className="text-slate-500 text-sm mt-1">Make sure you are on Sepolia testnet</p>
      </div>
    );
  }

  if (!isActive) {
    return null;
  }

  const isProcessing = step !== "idle" || isTxPending;

  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white text-lg">Place a Bid</h2>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-1">Your Balance</p>
          <p className="text-white font-medium">
            {balance !== undefined ? formatBid(balance, tokenDecimals) : "—"} {symbol ?? "WETH"}
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-1">Your Current Bid</p>
          <p className="text-white font-medium">
            {myCurrentBid > 0n ? formatBid(myCurrentBid, tokenDecimals) : "None"} {myCurrentBid > 0n ? symbol ?? "WETH" : ""}
          </p>
        </div>
      </div>

      {/* Min bid hint */}
      {additionalNeeded > 0n && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-300">
            Min additional bid:{" "}
            <strong>{formatBid(additionalNeeded, tokenDecimals)} {symbol ?? "WETH"}</strong>
            <span className="text-slate-400"> (current + 5% increment)</span>
          </p>
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <label className="text-slate-400 text-sm">Amount to add ({symbol ?? "WETH"})</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.001"
            value={bidInput}
            onChange={(e) => setBidInput(e.target.value)}
            placeholder={`e.g. ${formatBid(additionalNeeded > 0n ? additionalNeeded : 10n ** BigInt(tokenDecimals - 3), tokenDecimals)}`}
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-violet-500 outline-none rounded-lg px-4 py-3 text-white placeholder-slate-600 transition-colors"
            disabled={isProcessing}
          />
          <span className="flex items-center px-3 text-slate-400 bg-slate-800 border border-slate-700 rounded-lg text-sm">
            {symbol ?? "WETH"}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {needsApproval ? (
          <button
            className="btn-primary flex-1"
            onClick={handleApprove}
            disabled={isProcessing || bidAmountBig === 0n}
          >
            {step === "approving" ? "Approving…" : `Approve ${symbol ?? "WETH"}`}
          </button>
        ) : (
          <button
            className="btn-primary flex-1"
            onClick={handleBid}
            disabled={isProcessing || bidAmountBig === 0n}
          >
            {step === "bidding" ? "Submitting Bid…" : "Place Bid"}
          </button>
        )}
      </div>

      {/* Step info */}
      <p className="text-xs text-slate-500">
        Step 1: Approve {symbol ?? "WETH"} spend → Step 2: Place bid on-chain
      </p>
    </div>
  );
}
