import { useReadContract, useReadContracts } from "wagmi";
import { AUCTION_CONTRACT_ADDRESS } from "@/config/wagmi";
import { AUCTION_NFT_ABI, ERC20_ABI } from "@/config/abi";
import { formatUnits } from "viem";

export type AuctionInfo = {
  seller: `0x${string}`;
  nft: `0x${string}`;
  tokenId: bigint;
  paymentToken: `0x${string}`;
  highestBid: bigint;
  highestBidder: `0x${string}`;
  endTime: bigint;
  ended: boolean;
  cancelled: boolean;
  bidCount: bigint;
};

export type BidEntry = {
  bidder: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
};

export function useAuctionInfo() {
  return useReadContract({
    address: AUCTION_CONTRACT_ADDRESS,
    abi: AUCTION_NFT_ABI,
    functionName: "getAuctionInfo",
    query: { refetchInterval: 10_000 },
  });
}

export function useTimeRemaining() {
  return useReadContract({
    address: AUCTION_CONTRACT_ADDRESS,
    abi: AUCTION_NFT_ABI,
    functionName: "timeRemaining",
    query: { refetchInterval: 5_000 },
  });
}

export function useHighestBidUsd() {
  return useReadContract({
    address: AUCTION_CONTRACT_ADDRESS,
    abi: AUCTION_NFT_ABI,
    functionName: "getHighestBidUsd",
    query: { refetchInterval: 15_000 },
  });
}

export function useBidHistory(offset: bigint, limit: bigint) {
  return useReadContract({
    address: AUCTION_CONTRACT_ADDRESS,
    abi: AUCTION_NFT_ABI,
    functionName: "getBidHistory",
    args: [offset, limit],
    query: { refetchInterval: 10_000 },
  });
}

export function useUserDeposit(address: `0x${string}` | undefined) {
  return useReadContract({
    address: AUCTION_CONTRACT_ADDRESS,
    abi: AUCTION_NFT_ABI,
    functionName: "deposits",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
}

export function useTokenInfo(tokenAddress: `0x${string}` | undefined) {
  const results = useReadContracts({
    contracts: tokenAddress
      ? [
          {
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "symbol",
          },
          {
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "decimals",
          },
        ]
      : [],
    query: { enabled: !!tokenAddress },
  });

  return {
    symbol: results.data?.[0]?.result as string | undefined,
    decimals: results.data?.[1]?.result as number | undefined,
  };
}

export function useAllowance(
  tokenAddress: `0x${string}` | undefined,
  owner: `0x${string}` | undefined
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      owner && tokenAddress
        ? [owner, AUCTION_CONTRACT_ADDRESS]
        : undefined,
    query: {
      enabled: !!owner && !!tokenAddress,
      refetchInterval: 5_000,
    },
  });
}

export function useTokenBalance(
  tokenAddress: `0x${string}` | undefined,
  owner: `0x${string}` | undefined
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: {
      enabled: !!owner && !!tokenAddress,
      refetchInterval: 10_000,
    },
  });
}

// Helpers
export function formatBid(amount: bigint, decimals: number = 18): string {
  const val = parseFloat(formatUnits(amount, decimals));
  return val.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function formatUsd(usdValue: bigint): string {
  // usdValue has 8 decimals from Chainlink
  const val = parseFloat(formatUnits(usdValue, 8));
  return val.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
