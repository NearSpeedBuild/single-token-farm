import { useState } from "react";
import { utils } from "near-api-js";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Text,
} from "@chakra-ui/react";
import { useWalletSelector } from "@/context/wallet-selector";
import { SimpleSelect } from "@/components/shared/simple-select";
import { XCircleIcon } from "@heroicons/react/24/outline";
import { toNonDivisibleNumber } from "@/utils/conversion";
import toast from "react-hot-toast";
import { accounts } from "@/utils/account-ids";
import { Transaction, FunctionCallAction } from "@near-wallet-selector/core";
import TokenSelector from "@/components/TokenSelector";
import RewardTokenList from "./RewardTokenList";
import { TokenMetadata } from "@/utils/tokens";
import { BigNumber } from "bignumber.js";

const gradientStyle = {
  background:
    "radial-gradient(circle, rgba(174,108,198,1) 65%, rgba(112,112,238,1) 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  color: "transparent",
  display: "inline",
};

interface RewardToken {
  token: TokenMetadata;
  rewardPerDay: string;
}

const CreateFarm = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const { accountId, selector } = useWalletSelector();

  const [stakingToken, setStakingToken] = useState<null | TokenMetadata>(null);
  const [rewardTokens, setRewardTokens] = useState<RewardToken[]>([]);
  const [lockupPeriod, setLockupPeriod] = useState("");

  const storageDeposit = () => {
    let txStorage: Transaction = {
      signerId: accountId!,
      receiverId: accounts.SINGLE_FARM,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "storage_deposit",
            args: {},
            gas: "100000000000000",
            deposit: utils.format.parseNearAmount("1") as string,
          },
        },
      ],
    };
    return txStorage;
  };

  const createFarm = (
    stakingToken: string,
    rewardTokens: string[],
    rewardPerSession: string[],
    lockupPeriodSec: number,
    startAt: number,
  ): Transaction => {
    const contract = accounts.SINGLE_FARM;
    const gas = "300000000000000";
    const deposit = "1";

    if (!accountId) {
      throw new Error("Account ID is required");
    }

    const actions: FunctionCallAction[] = [
      {
        type: "FunctionCall",
        params: {
          methodName: "create_farm",
          args: {
            input: {
              staking_token: stakingToken,
              reward_tokens: rewardTokens,
              lockup_period_sec: lockupPeriodSec,
              reward_per_session: rewardPerSession,
              session_interval_sec: 60,
              start_at_sec: startAt,
            },
          },
          gas,
          deposit,
        },
      },
    ];

    const transaction: Transaction = {
      signerId: accountId as string, // Ensure accountId is not null
      receiverId: contract,
      actions: actions,
    };

    return transaction;
  };

  const handleCreateFarm = async () => {
    if (!stakingToken) {
      toast.error("Please select a staking token.");
      return;
    }

    if (rewardTokens.length === 0) {
      toast.error("Please add at least one reward token.");
      return;
    }

    for (const reward of rewardTokens) {
      if (!reward.rewardPerDay || Number(reward.rewardPerDay) <= 0) {
        toast.error(`Invalid reward amount for ${reward.token.symbol}.`);
        return;
      }
    }

    if (!lockupPeriod) {
      toast.error("Please select a lockup period.");
      return;
    }

    const farmData = {
      staking_token: stakingToken.address,
      reward_tokens: rewardTokens.map((rt) => rt.token.address),
      reward_per_session: rewardTokens.map((rt) =>
        BigNumber(toNonDivisibleNumber(rt.token?.decimals, rt.rewardPerDay))
          .div(24)
          .div(60)
          .toFixed(0),
      ),
      lockup_period_sec: Number(lockupPeriod),
      start_at_sec: Math.floor(Date.now() / 1000),
    };
    let transactions: Transaction[] = [];
    try {
      let storageTx = storageDeposit();
      transactions.push(storageTx);
      const createFarmTx = createFarm(
        farmData.staking_token,
        farmData.reward_tokens,
        farmData.reward_per_session,
        farmData.lockup_period_sec,
        farmData.start_at_sec,
      );
      transactions.push(createFarmTx);
      await (
        await selector.wallet()
      ).signAndSendTransactions({
        transactions,
      });
      window.location.reload();
    } catch (error) {
      console.error("Error creating farm:", error);
      toast.error("Failed to create farm.");
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleRewardTokens = (token: TokenMetadata) => {
    let tokens_copy = [...rewardTokens];
    if (
      !tokens_copy.some(
        (existingToken) => existingToken.token.address === token.address,
      )
    ) {
      tokens_copy.push({ token, rewardPerDay: "" });
    }
    setRewardTokens(tokens_copy);
  };

  const handleRemoveRewardToken = (token: TokenMetadata) => {
    let tokens_copy = [...rewardTokens];
    // Filter out the token with the matching address
    tokens_copy = tokens_copy.filter(
      (existingToken) => existingToken.token.address !== token.address,
    );
    setRewardTokens(tokens_copy);
  };

  const handleRewardPerSessionChange = (address: string, newReward: string) => {
    setRewardTokens((prevTokens) =>
      prevTokens.map((rewardToken) =>
        rewardToken.token.address === address
          ? { ...rewardToken, rewardPerDay: newReward }
          : rewardToken,
      ),
    );
  };

  return (
    <>
      <Modal isCentered isOpen={open} onClose={handleClose}>
        <ModalOverlay />
        <ModalContent
          backgroundColor="#5F456A"
          maxW="600px"
          minW="400px"
          width="90%"
        >
          <ModalHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl text-white tracking-tighter font-bolder leading-6 flex items-center">
                Create New Farm
              </h2>
              <button onClick={handleClose}>
                <XCircleIcon className="w-6 h-6 text-white hover:text-gray-300" />
              </button>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="w-full h-auto relative">
              <p className="text-[#9CA3AF] font-semibold text-sm">
                Select rewards & duration for your existing staking pool to
                create a farm
              </p>

              <div className="w-full flex items-center justify-between px-1">
                <p className="text-white font-bold text-md mb-2 mt-4">
                  Stake Token
                </p>
              </div>
              <div className="w-full rounded-lg bg-[#ffffff1a]  p-4 ">
                <TokenSelector
                  token={stakingToken}
                  setToken={setStakingToken}
                  tokenToFilter={{}}
                  key="stakingToken"
                />
              </div>

              {/* REWARD TOKEN */}
              <div className="w-full flex items-center justify-between px-1">
                <p className="text-white font-bold text-md mb-2 mt-4">
                  Reward Tokens Per Day
                </p>
              </div>
              {rewardTokens.length ? (
                <RewardTokenList
                  tokens={rewardTokens}
                  handleRemove={handleRemoveRewardToken}
                  handleRewardPerSessionChange={handleRewardPerSessionChange}
                />
              ) : (
                ""
              )}
              <div className="w-full rounded-lg bg-[#ffffff1a] mt-4 p-4 ">
                <TokenSelector
                  token={{}}
                  setToken={(t) => handleRewardTokens(t)}
                  tokenToFilter={{}}
                  key="rewardToken"
                />
              </div>
              {/* INTERVAL SECTION */}

              <div className="w-full flex items-center justify-between px-1">
                <p className="text-white font-bold text-md mb-2 mt-4 max-w-[75%]">
                  Minimum Stake Duration (until unstake available)
                </p>
              </div>
              <div className="w-full h-auto  rounded-lg bg-[#ffffff1a] py-2 px-3">
                <div className="w-full flex items-center justify-between">
                  <SimpleSelect
                    options={[
                      { label: "No Lockup", value: "1" },
                      { label: "1 Hour", value: "3600" },
                      { label: "1 Day", value: "86400" },
                      { label: "1 Week", value: "604800" },
                    ]}
                    selectedValue={lockupPeriod}
                    onChange={(e) => setLockupPeriod(e)}
                    text=""
                    placeholder="Select Duration"
                  />
                </div>
              </div>

              {/* Button section */}
              <Button
                bg="#2b011a"
                size="lg"
                width="full"
                height="54px"
                my={6}
                rounded="lg"
                fontWeight="bold"
                variant="outline"
                _hover={{ bg: "#3b112a" }}
                onClick={handleCreateFarm}
              >
                <Text sx={{ ...gradientStyle, fontSize: "24px" }}>
                  Create Farm
                </Text>
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CreateFarm;
