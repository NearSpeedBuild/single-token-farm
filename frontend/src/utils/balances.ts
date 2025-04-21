import { viewFunction } from "@/stores/rpc-store";
import { providers } from "near-api-js";
import { AccountView } from "near-api-js/lib/providers/provider";

interface TokenBalance {
  balance: string;
  timestamp: number;
  accountId: string;
}

// Memory cache for balances with token_address:account_id as key
const balanceCache: { [key: string]: TokenBalance } = {};

// Cache for in-flight requests to prevent duplicate RPC calls
const inFlightRequests: { [key: string]: Promise<string> } = {};

// Cache expiry time (30 seconds)
const CACHE_EXPIRY_MS = 30 * 1000;

// Generate cache key from token address and account id
function getCacheKey(tokenAddress: string, accountId: string): string {
  return `${tokenAddress}:${accountId}`;
}

// Check if cached balance is still valid
function isBalanceValid(balance: TokenBalance): boolean {
  return Date.now() - balance.timestamp < CACHE_EXPIRY_MS;
}

async function fetchBalanceFromRPC(
  provider: providers.Provider,
  tokenAddress: string,
  accountId: string,
  isNearToken: boolean,
): Promise<string> {
  try {
    if (isNearToken) {
      // For NEAR token, use account query
      const accountInfo = await provider.query<AccountView>({
        request_type: "view_account",
        account_id: accountId,
        finality: "optimistic",
      });
      return accountInfo.amount;
    } else {
      // For other tokens, use ft_balance_of
      return await viewFunction(provider, {
        contractId: tokenAddress,
        methodName: "ft_balance_of",
        args: {
          account_id: accountId,
        },
      });
    }
  } catch (error) {
    console.error(`Failed to fetch balance for token ${tokenAddress}:`, error);
    return "0";
  }
}

export async function getTokenBalance(
  provider: any,
  tokenAddress: string,
  accountId: string,
  isNearToken: boolean = false,
): Promise<string> {
  if (!tokenAddress) {
    throw new Error("Token address is required");
  }
  const cacheKey = getCacheKey(tokenAddress, accountId);

  // Check memory cache first
  const cachedBalance = balanceCache[cacheKey];
  if (cachedBalance && isBalanceValid(cachedBalance)) {
    return cachedBalance.balance;
  }

  // Check if there's already an in-flight request for this token/account pair
  const existingRequest = inFlightRequests[cacheKey];
  if (existingRequest !== undefined) {
    return existingRequest;
  }

  // Create new request and store in inFlightRequests
  const request = (async () => {
    try {
      const balance = await fetchBalanceFromRPC(
        provider,
        tokenAddress,
        accountId,
        isNearToken,
      );

      // Update cache
      balanceCache[cacheKey] = {
        balance,
        timestamp: Date.now(),
        accountId,
      };

      return balance;
    } finally {
      // Clean up the in-flight request after it completes (success or failure)
      delete inFlightRequests[cacheKey];
    }
  })();

  // Store the promise in the in-flight cache
  inFlightRequests[cacheKey] = request;

  return request;
}

// Invalidate cache for a specific token/account pair
export function invalidateBalance(
  tokenAddress: string,
  accountId: string,
): void {
  const cacheKey = getCacheKey(tokenAddress, accountId);
  delete balanceCache[cacheKey];
  delete inFlightRequests[cacheKey];
}

// Invalidate all balances for an account
export function invalidateAccountBalances(accountId: string): void {
  Object.keys(balanceCache).forEach((key) => {
    if (balanceCache[key].accountId === accountId) {
      delete balanceCache[key];
      delete inFlightRequests[key];
    }
  });
}

// Invalidate all balances for a token
export function invalidateTokenBalances(tokenAddress: string): void {
  Object.keys(balanceCache).forEach((key) => {
    if (key.startsWith(`${tokenAddress}:`)) {
      delete balanceCache[key];
      delete inFlightRequests[key];
    }
  });
}

// Clear entire cache
export function clearBalanceCache(): void {
  Object.keys(balanceCache).forEach((key) => {
    delete balanceCache[key];
  });
  Object.keys(inFlightRequests).forEach((key) => {
    delete inFlightRequests[key];
  });
}
