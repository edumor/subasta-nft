"use client";

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_AUCTION_ADDRESS } from "@/config/wagmi";

const STORAGE_KEY = "auction_config_v1";

export interface AuctionDisplayConfig {
  /** Active auction contract address (overrides the env-var default). */
  contractAddress: `0x${string}`;
  /** Human-friendly name for the NFT being auctioned. */
  nftName: string;
  /** Short description of the asset. */
  nftDescription: string;
  /** Direct URL to the NFT image (HTTPS or IPFS gateway URL). */
  nftImageUrl: string;
  /** External link (e.g. OpenSea or creator website). */
  externalLink: string;
}

const DEFAULT_CONFIG: AuctionDisplayConfig = {
  contractAddress: DEFAULT_AUCTION_ADDRESS,
  nftName: "",
  nftDescription: "",
  nftImageUrl: "",
  externalLink: "",
};

/**
 * Persists auction display configuration in localStorage.
 *
 * - `contractAddress` lets the admin switch the active auction without a
 *   re-deploy of the frontend.
 * - NFT metadata fields allow overriding (or supplying) the tokenURI data
 *   so the UI always looks polished.
 */
export function useAuctionConfig() {
  const [config, setConfigState] = useState<AuctionDisplayConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AuctionDisplayConfig>;
        setConfigState({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch {
      // ignore malformed data
    }
    setLoaded(true);
  }, []);

  const updateConfig = useCallback((patch: Partial<AuctionDisplayConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage quota exceeded or private mode
      }
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConfigState(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    contractAddress: config.contractAddress as `0x${string}`,
    loaded,
    updateConfig,
    resetConfig,
  };
}
