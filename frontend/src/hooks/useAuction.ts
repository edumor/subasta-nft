import { useReadContract, useReadContracts } from "wagmi";
import { useReadContract as useReadSingle } from "wagmi";
import { AUCTION_ABI, ERC20_ABI } from "@/config/abi";
import { formatUnits } from "viem";
import { useAuctionConfig } from "./useAuctionConfig";

export type BidEntry = {
  bidder: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
};

/**
 * Reads all key auction state in a single batched call.
 * Index map:
 *   0  → seller
 *   1  → highestBidder
 *   2  → highestBid
 *   3  → ended
 *   4  → cancelled
 *   5  → getBidCount
 *   6  → auctionEndTime
 *   7  → startTime
 *   8  → paymentToken
 *   9  → nftContract
 *  10  → nftTokenId
 *  11  → isNFTDeposited   ← custody guard
 *  12  → originalEndTime  ← for extension detection
 */
export function useAuctionState() {
  const { contractAddress } = useAuctionConfig();

  return useReadContracts({
    contracts: [
      { address: contractAddress, abi: AUCTION_ABI, functionName: "seller" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "highestBidder" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "highestBid" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "ended" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "cancelled" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "getBidCount" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "auctionEndTime" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "startTime" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "paymentToken" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "nftContract" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "nftTokenId" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "isNFTDeposited" },
      { address: contractAddress, abi: AUCTION_ABI, functionName: "originalEndTime" },
    ],
    query: { refetchInterval: 8_000 },
  });
}

/** Paginated bid history from the contract. */
export function useBidHistory(offset: bigint, limit: bigint) {
  const { contractAddress } = useAuctionConfig();
  return useReadContract({
    address: contractAddress,
    abi: AUCTION_ABI,
    functionName: "getBidHistory",
    args: [offset, limit],
    query: { refetchInterval: 10_000 },
  });
}

/** Current deposit the connected user has in the auction contract. */
export function useUserDeposit(address: `0x${string}` | undefined) {
  const { contractAddress } = useAuctionConfig();
  return useReadContract({
    address: contractAddress,
    abi: AUCTION_ABI,
    functionName: "deposits",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
}

/** Last bid total the user submitted. */
export function useUserLastBid(address: `0x${string}` | undefined) {
  const { contractAddress } = useAuctionConfig();
  return useReadContract({
    address: contractAddress,
    abi: AUCTION_ABI,
    functionName: "lastBid",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
}

/** Timestamp of the user's last bid (for the 1-min cooldown). */
export function useUserLastBidTime(address: `0x${string}` | undefined) {
  const { contractAddress } = useAuctionConfig();
  return useReadContract({
    address: contractAddress,
    abi: AUCTION_ABI,
    functionName: "lastBidTime",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
}

/** ERC-20 allowance the user has granted to the auction contract. */
export function useTokenAllowance(
  tokenAddress: `0x${string}` | undefined,
  ownerAddress: `0x${string}` | undefined
) {
  const { contractAddress } = useAuctionConfig();
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: ownerAddress && tokenAddress ? [ownerAddress, contractAddress] : undefined,
    query: { enabled: !!ownerAddress && !!tokenAddress, refetchInterval: 5_000 },
  });
}

/** ERC-20 token balance for the user. */
export function useTokenBalance(
  tokenAddress: `0x${string}` | undefined,
  ownerAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: ownerAddress ? [ownerAddress] : undefined,
    query: { enabled: !!ownerAddress && !!tokenAddress, refetchInterval: 8_000 },
  });
}

/** ERC-20 token symbol (e.g. "WETH", "USDC"). */
export function useTokenSymbol(tokenAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!tokenAddress },
  });
}

/** ERC-20 token decimals. */
export function useTokenDecimals(tokenAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!tokenAddress },
  });
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

/** Format a bigint token amount with the given number of decimals. */
export function formatToken(amount: bigint, decimals = 18): string {
  const val = parseFloat(formatUnits(amount, decimals));
  return val.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** Shorten a hex address: 0x1234…abcd */
export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Format unix timestamp to locale date + time string. */
export function formatDateTime(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString();
}

/** Legacy alias kept for existing component refs that used formatEth. */
export const formatEth = (amount: bigint) => formatToken(amount, 18);
