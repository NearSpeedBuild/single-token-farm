import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWalletSelector } from "@/context/wallet-selector";
import { useRPC, viewFunction } from "@/stores/rpc-store";
import { accounts } from "@/utils/account-ids";
import { FarmInfo, StakeInfo } from "@/hooks/modules/farms/hooks";
import StakeModal from "./StakeModal";
import TokenWithSymbol from "./Token";
import TokenIcon from "./TokenIcon";
import { readableValue } from "@/utils/pool-utils";
import toast from "react-hot-toast";
import BigNumber from "bignumber.js";
import UnStakeModal from "@/components/modules/farms/UnstakeModal";
import RewardAmount from "@/components/RewardAmount";
import { getTokenMetadata, TokenMetadata } from "@/utils/tokens";
import { toReadableNumber } from "@/utils/conversion";

const lockuptimeObj = {
  "1": "Immediately",
  "3600": "1 Hour",
  "86400": "1 Day",
  "604800": "1 Week",
};

const calculateDailyReward = (
  rewardPerSession: string,
  sessionIntervalSec: number,
) => {
  const secondsInDay = 86400;
  const sessionsPerDay = secondsInDay / sessionIntervalSec;
  return new BigNumber(rewardPerSession)
    .multipliedBy(sessionsPerDay)
    .toFixed(0);
};

const Farm = ({ farm }: { farm: FarmInfo }) => {
  const { provider } = useRPC();
  const navigate = useNavigate();
  const [stakeToken, setStakeToken] = useState<TokenMetadata | null>(null);
  const { accountId } = useWalletSelector();
  const [unstakeOpen, setUnstakeOpen] = useState(false);
  const [stakeOpen, setStakeOpen] = useState(false);
  const [isChecking, setChecking] = useState(false);
  const [myPower, setMyPower] = useState<StakeInfo | null>(null);
  const [rewardTokensMetadata, setRewardTokensMetadata] = useState<
    TokenMetadata[]
  >([]);
  const [apr, setApr] = useState<string>("0");

  const convertSecondsToDate = (seconds: number) => {
    return new Date(seconds * 1000).toLocaleDateString();
  };

  const getMyPower = async (farmId: number, accountId: string) => {
    try {
      if (accountId) {
        const stakeInfo = await viewFunction(provider, {
          contractId: accounts.SINGLE_FARM,
          methodName: "get_stake_info",
          args: {
            account_id: accountId,
            farm_id: farmId,
          },
        });
        setMyPower(stakeInfo);
      }
    } catch (error) {
      console.error("Error fetching stake info:", error);
      return null;
    }
  };

  useEffect(() => {
    if (farm) {
      getMyPower(farm.farm_id, accountId!);
    }
  }, [provider, farm]);

  const getMetadata = async (tokenAddress) => {
    if (!tokenAddress) return;

    try {
      const metadata = await getTokenMetadata(provider, tokenAddress);
      setStakeToken({ ...metadata, address: tokenAddress });
    } catch (error) {
      console.error("Failed to fetch token metadata:", error);
    }
  };

  useEffect(() => {
    if (farm?.staking_token) {
      getMetadata(farm.staking_token);
    }
  }, [provider, farm]);

  const isLockupEnded = (lockupEndSec) => {
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= lockupEndSec;
  };

  const handleUnstakeModal = async (e) => {
    e.stopPropagation();
    try {
      if (farm?.farm_id !== undefined) {
        setChecking(true);
        let isEnded = isLockupEnded(myPower?.lockup_end_sec);
        setChecking(false);
        if (isEnded) {
          setUnstakeOpen(true);
        } else {
          toast.error("You cannot unstake until the locking period ends.");
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const calculateAPR = async () => {
    if (!stakeToken || !farm || !rewardTokensMetadata.length) return;

    try {
      // Calculate total staked value in USD
      const totalStakedReadable = new BigNumber(
        toReadableNumber(stakeToken.decimals, farm.total_staked),
      );
      const totalStakedUSD = totalStakedReadable.multipliedBy(
        stakeToken.price_usd || 0,
      );

      if (totalStakedUSD.isZero()) {
        setApr("∞");
        return;
      }

      // Calculate daily rewards value in USD
      let dailyRewardsUSD = new BigNumber(0);
      farm.reward_tokens.forEach((token: string, index: number) => {
        const rewardToken = rewardTokensMetadata?.[index];
        if (rewardToken) {
          const dailyReward = calculateDailyReward(
            farm.reward_per_session[index],
            farm.session_interval_sec,
          );
          const dailyRewardReadable = new BigNumber(
            toReadableNumber(rewardToken.decimals, dailyReward),
          );
          const rewardValueUSD = dailyRewardReadable.multipliedBy(
            rewardToken.price_usd || 0,
          );
          dailyRewardsUSD = dailyRewardsUSD.plus(rewardValueUSD);
        }
      });

      // Calculate APR: (daily rewards * 365 * 100) / total staked
      const aprValue = dailyRewardsUSD
        .multipliedBy(365)
        .multipliedBy(100)
        .dividedBy(totalStakedUSD);
      setApr(aprValue.gt(1000) ? ">1000" : aprValue.toFixed(2));
    } catch (error) {
      console.error("Error calculating APR:", error);
      setApr("0");
    }
  };

  useEffect(() => {
    calculateAPR();
  }, [stakeToken, farm, rewardTokensMetadata]);

  const getRewardTokensMetadata = async () => {
    if (!farm?.reward_tokens?.length) return;

    try {
      const metadataPromises = farm.reward_tokens.map((token: string) =>
        getTokenMetadata(provider, token),
      );
      const metadata = await Promise.all(metadataPromises);
      setRewardTokensMetadata(metadata);
    } catch (error) {
      console.error("Error fetching reward tokens metadata:", error);
    }
  };

  useEffect(() => {
    if (farm?.reward_tokens) {
      getRewardTokensMetadata();
    }
  }, [provider, farm]);

  return (
    <div
      onClick={() => navigate(`/farms/${farm?.farm_id}`)}
      className="w-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-2xl p-6 cursor-pointer h-full flex flex-col 
      hover:shadow-[0px_8px_32px_rgba(205,127,240,0.15)] transition-all duration-300 border border-[#3a3a3a]"
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 px-4 bg-[#3a3a3a] rounded-xl">
            <TokenWithSymbol address={farm.staking_token} />
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="bg-[#CD7FF0]/10 px-4 py-2 rounded-lg">
            <p className="text-[#CD7FF0] text-sm font-medium mb-1">APR</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{apr}%</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#2a2a2a] rounded-xl p-4">
          <p className="text-[#888] text-sm mb-2">Total Staked</p>
          <p className="text-white font-bold">
            {stakeToken &&
              `${readableValue(
                stakeToken?.decimals,
                new BigNumber(farm?.total_staked),
              )} ${stakeToken.symbol}`}
          </p>
        </div>
        <div className="bg-[#2a2a2a] rounded-xl p-4">
          <p className="text-[#888] text-sm mb-2">My Stake</p>
          <p className="text-white font-bold">
            {myPower?.amount
              ? stakeToken &&
                `${readableValue(
                  stakeToken?.decimals,
                  new BigNumber(myPower.amount),
                )} ${stakeToken.symbol}`
              : "0"}
          </p>
        </div>
      </div>

      {/* Rewards Section */}
      <div className="bg-[#2a2a2a] rounded-xl p-4 mb-8">
        <p className="text-[#888] text-sm mb-4">Daily Rewards</p>
        <div className="space-y-4">
          {farm.reward_tokens?.map(
            (token: any, index: number) =>
              rewardTokensMetadata?.[index] && (
                <div
                  key={token}
                  className="flex items-center justify-between bg-[#3a3a3a] p-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#4a4a4a] rounded-lg">
                      <TokenIcon address={token} />
                    </div>
                    <RewardAmount
                      token={token}
                      amount={calculateDailyReward(
                        farm?.reward_per_session[index],
                        farm.session_interval_sec,
                      )}
                      decimals={rewardTokensMetadata[index].decimals}
                    />
                  </div>
                </div>
              ),
          )}
        </div>
      </div>

      {/* Time Info */}
      <div className="bg-[#2a2a2a] rounded-xl p-4 mb-8">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[#888] text-sm">Min Stake Time</p>
          <p className="text-white font-medium">
            {lockuptimeObj[farm.lockup_period_sec.toString()] ??
              `${farm.lockup_period_sec} seconds`}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[#888] text-sm">Start At</p>
          <p className="text-white font-medium">
            {convertSecondsToDate(farm?.start_at_sec)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto space-y-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!accountId) {
              toast.error("Please Connect Wallet");
              return;
            }
            setStakeOpen(true);
          }}
          className="bg-gradient-to-r from-[#CD7FF0] to-[#B15FD1] hover:from-[#B15FD1] hover:to-[#9A4FBA] 
          transition-all duration-300 text-white font-bold text-sm w-full py-3 rounded-xl"
        >
          Stake
        </button>

        {myPower && parseFloat(myPower?.amount) > 0 && accountId && (
          <button
            onClick={handleUnstakeModal}
            className="bg-gradient-to-r from-[#7B1FA2] to-[#5F1880] hover:from-[#5F1880] hover:to-[#4A1262]
            transition-all duration-300 text-white font-bold text-sm w-full py-3 rounded-xl
            disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={parseFloat(myPower?.amount) <= 0 || isChecking}
          >
            {isChecking ? "Loading..." : "Unstake"}
          </button>
        )}
      </div>

      {myPower && (
        <UnStakeModal
          staked={readableValue(
            stakeToken?.decimals || 0,
            new BigNumber(myPower.amount),
          )}
          farm={farm}
          open={unstakeOpen}
          setOpen={setUnstakeOpen}
        />
      )}
      <StakeModal farm={farm} open={stakeOpen} setOpen={setStakeOpen} />
    </div>
  );
};

export default Farm;
