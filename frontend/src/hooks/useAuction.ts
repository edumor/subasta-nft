import { useReadContract, useReadContracts } from "wagmi";
import { useBalance } from "wagmi";
import { AUCTION_CONTRACT_ADDRESS } from "@/config/wagmi";
import { AUCTION_ABI } from "@/config/abi";
import { formatEther } from "viem";

export type BidEntry = {
  bidder: `0x${string}`;
  amount: bigint;
};

// Reads all key auction state in one batch
export function useAuctionState() {
  return useReadContracts({
    contracts: [
      { address: AUCTION_CONTRACT_ADDRESS, abi: AUCTION_ABI, functionName: "owner" },
      { address: AUCTION_CONTRACT_ADDRESS, abi: AUCTION_ABI, functionName: "highestBidder" },
      { address: AUCTION_CONTRACT_ADDRESS, abi: AUCTION_ABI, functionName: "highestBid" },
      { address: AUCTION_CONTRACT_ADDRESS, abi: AUCTION_ABI, functionName: "ended" },
      { address: AUCTION_CONTRACT_ADDRESS, abi: AUCTION_ABI, functionName: "cancelled" },
      { address: AUCTION_CONTRACT_ADDRESS, abi: AUCTION_ABI, functionName: "getBidCount" },
    ],
    query: { refetchInterval: 8_000 },
  });
}

export function useBidHistory(offset: bigint, limit: bigint) {
  return useReadContract({
    address: AUCTION_CONTRACT_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "getBidHistory",
    args: [offset, limit],
    query: { refetchInterval: 10_000 },
  });
}

export function useUserDeposit(address: `0x${string}` | undefined) {
  return useReadContract({
    address: AUCTION_CONTRACT_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "deposits",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
}

export function useUserLastBid(address: `0x${string}` | undefined) {
  return useReadContract({
    address: AUCTION_CONTRACT_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "lastBid",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
}

export function useUserLastBidTime(address: `0x${string}` | undefined) {
  return useReadContract({
    address: AUCTION_CONTRACT_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "lastBidTime",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
}

export function useWalletBalance(address: `0x${string}` | undefined) {
  return useBalance({
    address,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
}

// Helpers
export function formatEth(amount: bigint): string {
  const val = parseFloat(formatEther(amount));
  return val.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
