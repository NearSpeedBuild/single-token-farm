import { useEffect, useState } from "react";
import FarmContainer from "@/components/modules/farms/FarmContainer";
import Farm from "./Farm";
import { Text, Spinner, Checkbox, Flex } from "@chakra-ui/react";
import { useGetFarms } from "@/hooks/modules/farms/hooks";
import { useRPC, viewFunction } from "@/stores/rpc-store";
import { accounts } from "@/utils/account-ids";
import BigNumber from "bignumber.js";

const AllFarms = ({ search, accountId, showExpiredFarms }) => {
  const { farms, loading, hasMore, loadMore } = useGetFarms(search);
  const { provider } = useRPC();
  const [sortedFarms, setSortedFarms] = useState<any[]>([]);

  // Check if farm has any rewards left
  const hasRewardsLeft = (farm: any): boolean => {
    return farm.remaining_reward.some((amount: string) =>
      new BigNumber(amount).gt(0),
    );
  };

  // Check if farm should be shown (has rewards OR user has stake, so that they can unstake)
  const shouldShowFarm = (farm: any): boolean => {
    const hasStake = new BigNumber(farm.myStake || "0").gt(0);
    return hasRewardsLeft(farm) || hasStake || showExpiredFarms;
  };

  // Get stake info for all farms
  const getStakeInfo = async (farms: any[]) => {
    if (!accountId) {
      // When not logged in, show farms with rewards and expired farms if toggled on
      const filteredFarms = showExpiredFarms ? farms : farms.filter(hasRewardsLeft);
      setSortedFarms(filteredFarms);
      return;
    }

    try {
      const stakeInfoPromises = farms.map(
        (farm) =>
          viewFunction(provider, {
            contractId: accounts.SINGLE_FARM,
            methodName: "get_stake_info",
            args: {
              account_id: accountId,
              farm_id: farm.farm_id,
            },
          }).catch(() => null), // Handle errors for individual farms
      );

      const stakeInfos = await Promise.all(stakeInfoPromises);

      // Combine farms with their stake info
      const farmsWithStake = farms.map((farm, index) => ({
        ...farm,
        myStake: stakeInfos[index]?.amount || "0",
      }));

      // Filter farms: show if they have rewards OR user has stake
      const relevantFarms = farmsWithStake.filter(shouldShowFarm);

      // Sort: farms with stake first, then the rest
      const sorted = relevantFarms.sort((a, b) => {
        const aStake = BigInt(a.myStake || "0");
        const bStake = BigInt(b.myStake || "0");
        if (aStake === 0n && bStake === 0n) return 0;
        if (aStake > 0n && bStake === 0n) return -1;
        if (aStake === 0n && bStake > 0n) return 1;
        return bStake > aStake ? 1 : -1;
      });

      setSortedFarms(sorted);
    } catch (error) {
      console.error("Error fetching stake info:", error);
      // If there's an error, apply the same filtering logic
      const filteredFarms = showExpiredFarms ? farms : farms.filter(hasRewardsLeft);
      setSortedFarms(filteredFarms);
    }
  };

  // Update sorted farms when farms change or when the showExpiredFarms toggle changes
  useEffect(() => {
    if (farms && farms.length > 0) {
      getStakeInfo(farms);
    } else {
      setSortedFarms([]);
    }
  }, [farms, accountId, showExpiredFarms]);

  // Infinite scroll logic
  useEffect(() => {
    const handleScroll = () => {
      if (sortedFarms && sortedFarms.length) {
        const scrollTop = document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        // Check if the user has scrolled near the bottom of the page
        if (scrollTop + clientHeight >= scrollHeight - 50) {
          if (hasMore && !loading) {
            loadMore();
          }
        }
      }
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Clean up the scroll event listener on unmount
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hasMore, loading, loadMore, sortedFarms]);

  return (
    <FarmContainer>
      <div className="md:p-4 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {sortedFarms && sortedFarms.length
            ? [...new Set(sortedFarms.map((farm) => farm.farm_id))].map(
                (farm_id) => {
                  const farm = sortedFarms.find(
                    (farm) => farm.farm_id === farm_id,
                  );
                  return <Farm key={farm.farm_id} farm={farm} />;
                },
              )
            : ""}
        </div>
        {accountId && sortedFarms && !sortedFarms.length && !loading ? (
          <div className="flex items-center justify-center mt-8">
            <Text fontWeight="extrabold">No Data Found</Text>
          </div>
        ) : (
          ""
        )}
        {loading ? (
          <div className="w-full flex items-center justify-center p-12">
            <Spinner
              thickness="4px"
              speed="0.65s"
              emptyColor="gray.200"
              color="#4b2354"
              size="xl"
            />
          </div>
        ) : (
          ""
        )}
      </div>
    </FarmContainer>
  );
};

export default AllFarms;
