import { connect, keyStores } from "near-api-js";
import { getTokenMetadata } from "@/utils/tokens";

export const nearNetwork = import.meta.env.VITE_NEAR_NETWORK;

const mainnetConfig = {
  networkId: "mainnet",
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: "https://rpc.mainnet.near.org",
  walletUrl: "https://wallet.near.org",
  helperUrl: "https://api.kitwallet.app",
  explorerUrl: "https://nearblocks.io",
};

const testnetConfig = {
  networkId: "testnet",
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://testnet.mynearwallet.com/",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://testnet.nearblocks.io",
};

const config = {
  testnet: testnetConfig,
  mainnet: mainnetConfig,
};

// Retrieve the selectedRPC value from localStorage (if it exists)
const selectedRPC = (() => {
  try {
    return JSON.parse(localStorage.getItem("selectedRPC") || "{}");
  } catch {
    return {};
  }
})();

// Use the selectedRPC URL if available; otherwise, use the default nodeUrl
export const rpcUrl =
  selectedRPC?.url && selectedRPC?.url !== ""
    ? selectedRPC.url
    : config[nearNetwork].nodeUrl;

// Create the nearConfigs object dynamically with the updated RPC URL
export const nearConfigs = {
  ...config[nearNetwork],
  nodeUrl: rpcUrl, // Override the default nodeUrl with the selectedRPC URL if it exists
};

/**
 * Connect to NEAR with the given config
 * @param config Configuration for NEAR connection
 * @returns NEAR instance
 */
export const connectDefaultNear = async (config) => {
  const near = await connect(config);
  return near;
};

export const tokens_without_images = [
  {
    icon: "https://s2.coinmarketcap.com/static/img/coins/64x64/11808.png",
    symbol: "wNEAR",
  },
  {
    icon: "https://img.ref.finance/images/2396.png",
    symbol: "WETH",
  },
  {
    icon: "https://img.ref.finance/images/8104.png",
    symbol: "1INCH",
  },
  {
    icon: "https://img.ref.finance/images/6719.png",
    symbol: "GRT",
  },
  {
    icon: "https://img.ref.finance/images/2502.png",
    symbol: "HT",
  },
  {
    icon: "https://img.ref.finance/images/10052.png",
    symbol: "GTC",
  },
  {
    icon: "https://img.ref.finance/images/sFRAX_coin.svg",
    symbol: "sFRAX",
  },
  {
    icon: "https://img.ref.finance/images/SOLWormhole.svg",
    symbol: "SOL",
  },
  {
    icon: "https://ref-new-1.s3.amazonaws.com/token/05572f4bf6b5cede28daa0cf039769dc.svg",
    symbol: "USDC",
  },
  {
    icon: "https://img.ref.finance/images/truNEAR-logo.svg",
    symbol: "TruNEAR",
  },
  {
    icon: "https://assets.coingecko.com/coins/images/53347/standard/POP.jpg?1736173283",
    symbol: "PRESENCE",
  },
];

/**
 * Fetch all available tokens from cache and RPC
 * @param near NEAR instance
 * @returns List of all tokens with metadata
 */
export const getWhitelistedTokens = async (near) => {
  const provider = near.connection.provider;
  const metadataExtractedTokens: string[] = [];

  // Get all tokens from cache first
  const db = await openIndexedDB();
  const allTokens = await getAllTokensFromDB(db);

  for (const token of allTokens) {
    try {
      const metadata = await getTokenMetadata(provider, token);
      if (metadata) {
        metadataExtractedTokens.push(metadata.address);
      }
    } catch {
      continue;
    }
  }

  return metadataExtractedTokens;
};

async function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("TokenMetadataDB", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getAllTokensFromDB(db: IDBDatabase): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("ft_metadata", "readonly");
    const store = transaction.objectStore("ft_metadata");
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(Array.from(request.result as string[]));
  });
}
