import { useState, useEffect, useCallback } from "react";
import { accounts } from "@/utils/account-ids";
import { useRPC, viewFunction } from "@/stores/rpc-store";

export type AccountId = string;
export type U128 = string;

export type FarmStatus = "Active" | "Ended";

export interface FarmInfo {
  farm_id: number;
  staking_token: AccountId;
  reward_tokens: AccountId[];
  reward_per_session: U128[];
  session_interval_sec: number;
  start_at_sec: number;
  last_distribution_sec: number;
  total_staked: U128;
  reward_per_share: U128[];
  lockup_period_sec: number;
  remaining_reward: U128[];
  status: FarmStatus;
}

export interface StakeInfo {
  farm_id: number;
  amount: U128;
  lockup_end_sec: number;
  reward_debt: U128[];
  accrued_rewards: U128[];
  reward_tokens: AccountId[];
}

export const useGetFarms = (search?: string) => {
  const { provider } = useRPC();
  const [farms, setFarms] = useState<FarmInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0); // Start from 0, NEAR uses index-based pagination
  const [limit] = useState(9); // Number of items per page
  const [hasMore, setHasMore] = useState(true); // Whether more farms exist to load

  const fetchFarms = useCallback(
    async (pageNum = 0, search?: string) => {
      setLoading(true);
      setError(null);

      try {
        let result: FarmInfo[] = await viewFunction(provider, {
          contractId: accounts.SINGLE_FARM,
          methodName: "list_farms",
          args: {
            from_index: pageNum * limit,
            limit,
          },
        });

        if (result.length < limit) {
          setHasMore(false);
        }
        if (search) {
          result = result.filter((farm: FarmInfo) => {
            return (
              farm.staking_token.toLowerCase().includes(search.toLowerCase()) ||
              farm.reward_tokens.some((token) =>
                token.toLowerCase().includes(search.toLowerCase()),
              )
            );
          });
        }
        setFarms((prevFarms) => [...prevFarms, ...result]);
      } catch (err: any) {
        setError(err.message || "Failed to fetch farms");
      } finally {
        setLoading(false);
      }
    },
    [provider, limit],
  );

  useEffect(() => {
    setFarms([]);
    setPage(0);
    setHasMore(true);
    fetchFarms(0, search);
  }, [provider, search, fetchFarms]);

  useEffect(() => {
    if (page > 0) {
      fetchFarms(page);
    }
  }, [page, fetchFarms]);

  return {
    farms,
    loading,
    error,
    hasMore,
    loadMore: () => {
      if (hasMore) {
        setPage((prevPage) => prevPage + 1); // Load next batch of farms
      }
    },
  };
};

export const useGetFarmDetails = (id: string) => {
  const [farm, setFarm] = useState<FarmInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { provider } = useRPC();

  const fetchFarm = useCallback(async () => {
    if (!provider || id === undefined) return;

    setLoading(true);
    setError(null);

    try {
      const data: FarmInfo = await viewFunction(provider, {
        contractId: accounts.SINGLE_FARM,
        methodName: "get_farm",
        args: { farm_id: parseInt(id) },
      });
      setFarm(data);
    } catch (err: any) {
      console.log(err);
      setFarm(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id, provider]);

  useEffect(() => {
    if (id !== undefined) {
      fetchFarm();
    }
  }, [id, fetchFarm]);

  return { farm, loading, error };
};
