import { useState, useEffect } from "react";

import {
  connectDefaultNear,
  getWhitelistedTokens as getAllTokens,
  nearConfigs,
} from "./config";
import { viewFunction } from "@/stores/rpc-store";
import Token from "@/assets/logo.png";

export interface TokenMetadata {
  symbol: string;
  decimals: number;
  icon: string | null;
  name: string;
  price_usd?: string;
  has_icon: boolean;
  address: string;
  reputation: "Spam" | "Unknown" | "NotFake" | "Reputable";
  volume_usd_24h?: string;
  [key: string]: any;
}

// Memory cache for fast access
const memoryCache: { [tokenAddress: string]: TokenMetadata } = {};
let hasInitializedCache = false;

// IndexedDB setup
const DB_NAME = "TokenMetadataDB";
const STORE_NAME = "ft_metadata";
const DB_VERSION = 1;

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getFromCache(
  tokenAddress: string,
): Promise<TokenMetadata | null> {
  // Check memory cache first
  if (memoryCache[tokenAddress]) {
    return memoryCache[tokenAddress];
  }

  try {
    // If not in memory, check IndexedDB
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(tokenAddress);

      request.onerror = () => {
        console.error(
          `IndexedDB error for token ${tokenAddress}:`,
          request.error,
        );
        resolve(null);
      };
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update memory cache
          memoryCache[tokenAddress] = result;
        }
        resolve(result || null);
      };
    });
  } catch (error) {
    console.error(
      `Failed to access IndexedDB for token ${tokenAddress}:`,
      error,
    );
    return null;
  }
}

async function saveToCache(
  tokenAddress: string,
  metadata: TokenMetadata,
): Promise<void> {
  if (!tokenAddress || !metadata) {
    console.warn(
      "Attempted to save to cache with invalid token address or metadata",
    );
    return;
  }

  // Update memory cache immediately
  memoryCache[tokenAddress] = metadata;

  try {
    // Also persist to IndexedDB
    const db = await openDB();
    return new Promise(resolve => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(metadata, tokenAddress);

      request.onerror = () => {
        console.error(
          `Failed to save metadata for token ${tokenAddress}:`,
          request.error,
        );
        resolve();
      };
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error(
      `Failed to access IndexedDB for saving token ${tokenAddress}:`,
      error,
    );
  }
}

async function fetchFromRPC(
  provider: any,
  tokenAddress: string,
): Promise<TokenMetadata> {
  const metadata = await viewFunction(provider, {
    contractId: tokenAddress,
    methodName: "ft_metadata",
    args: {},
  });

  // Check cache for price
  let cachedData = await getFromCache(tokenAddress);
  return {
    ...cachedData,
    ...metadata,
    has_icon: true,
  };
}

export async function initializeMetadataCache() {
  if (hasInitializedCache) return;
  hasInitializedCache = true;

  try {
    const isTestnet = nearConfigs.networkId === "testnet";
    const pricesUrl = `https://prices${isTestnet ? "-testnet" : ""}.intear.tech/tokens`;
    const data = await (await fetch(pricesUrl)).json();

    // Process and save each token's metadata to both caches
    const savePromises = Object.entries(data).map(
      async ([address, tokenData]: [string, any]) => {
        if (tokenData.metadata && !tokenData.deleted) {
          const metadata = {
            ...tokenData.metadata,
            price_usd: tokenData.price_usd,
            has_icon: false,
            address: address,
            reputation: tokenData.reputation,
            volume_usd_24h: tokenData.volume_usd_24h,
          };
          if (!(await getFromCache(address))) {
            await saveToCache(address, metadata);
          }
        }
      },
    );

    await Promise.all(savePromises);
  } catch (error) {
    console.error(
      "Failed to initialize metadata cache from prices API:",
      error,
    );
  }
}

export async function getTokenMetadata(
  provider: any,
  tokenAddress: string,
  needs_icon: boolean = false,
): Promise<TokenMetadata> {
  if (!tokenAddress) {
    throw new Error("Token address is required");
  }
  await initializeMetadataCache();

  try {
    // Check cache first
    const cachedMetadata = await getFromCache(tokenAddress);
    if (cachedMetadata && (!needs_icon || cachedMetadata.has_icon)) {
      return validate(cachedMetadata);
    }

    // Fetch from RPC if not cached or need icon
    const metadata = await fetchFromRPC(provider, tokenAddress);
    await saveToCache(tokenAddress, metadata);
    return validate(metadata);
  } catch (error) {
    console.error(`Failed to fetch metadata for token ${tokenAddress}:`, error);
    // Return cached data if available, otherwise throw
    const cachedMetadata = await getFromCache(tokenAddress);
    if (cachedMetadata) {
      return validate(cachedMetadata);
    }
    throw error;
  }
}

function validate(metadata: TokenMetadata): TokenMetadata {
  if (!metadata.icon?.startsWith("data:")) {
    metadata.icon = Token;
  }
  if (metadata.address === "wrap.testnet" || metadata.address === "wrap.near") {
    metadata.icon = "/near.png";
  }
  return metadata;
}

export const useTokens = (): {
  tokens: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} => {
  const [tokens, setTokens] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [flag, setFlag] = useState(false);

  // Load tokens from localStorage
  useEffect(() => {
    const loadFromStorage = () => {
      const storedTokens = localStorage.getItem("tokens");

      if (storedTokens) {
        const parsedTokens = [...JSON.parse(storedTokens)];
        setTokens(parsedTokens);
        setLoading(false);
      }
    };

    loadFromStorage();
  }, [flag]);

  // Initialize tokens from network
  useEffect(() => {
    const initTokens = async () => {
      try {
        const near = await connectDefaultNear(nearConfigs);
        const allTokens = await getAllTokens(near);

        setTokens(allTokens);
        localStorage.setItem("tokens", JSON.stringify(allTokens));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initTokens();
  }, []);

  return {
    tokens,
    loading,
    error,
    refetch: () => setFlag(!flag),
  };
};
