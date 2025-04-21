import { useState, useEffect } from "react";
import PageContainer from "@/components/PageContainer";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";
import { SuccessToast } from "@/components/shared/success-toast";
import { ErrorToast } from "@/components/shared/error-toast";
import { TopCard } from "@/components/shared/top-card";
import { Skeleton } from "@chakra-ui/react";
import BigNumber from "bignumber.js";
import { readableValue } from "@/utils/pool-utils";
import { StakeInfo, useGetFarmDetails } from "@/hooks/modules/farms/hooks";
import { formatNumberWithSuffix, toReadableNumber } from "@/utils/conversion";
import { useWalletSelector } from "@/context/wallet-selector";
import { accounts, NEAR_BLOCK_URL } from "@/utils/account-ids";
import { useRPC, viewFunction } from "@/stores/rpc-store";
import { Transaction, FunctionCallAction } from "@near-wallet-selector/core";
import { getTxRec } from "@/tools/modules/transactions";
import TokenWithSymbol from "@/components/modules/farms/Token";
import TokenIcon from "@/components/modules/farms/TokenIcon";
import AddReward from "@/components/modules/farms/AddReward";
import { getTokenMetadata, TokenMetadata } from "@/utils/tokens";
import { utils } from "near-api-js";

const RewardLeft = ({
  token,
  amount,
  decimals,
  rewardPerSession,
  sessionIntervalSec,
}: {
  token: string;
  amount: string;
  decimals: number;
  rewardPerSession: string;
  sessionIntervalSec: number;
}) => {
  const [formattedAmount, setFormattedAmount] = useState<string>("");
  const [symbol, setSymbol] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [timeColor, setTimeColor] = useState<string>("#FFFFFF");
  const { provider } = useRPC();

  useEffect(() => {
    const getTokenInfo = async () => {
      try {
        console.log("123");
        const metadata = await getTokenMetadata(provider, token);
        const readableAmount = toReadableNumber(decimals, amount);
        setFormattedAmount(formatNumberWithSuffix(Number(readableAmount)));
        setSymbol(metadata.symbol);

        // Calculate time remaining
        const remainingAmount = new BigNumber(amount);
        if (remainingAmount.isZero()) {
          setTimeLeft("Ran Out");
          setTimeColor("#F87171"); // Using the same red color as for low time
        } else {
          const rewardPerSessionBN = new BigNumber(rewardPerSession);
          if (rewardPerSessionBN.isZero()) {
            setTimeLeft("∞");
            setTimeColor("#FFFFFF");
          } else {
            const sessionsLeft = remainingAmount.dividedBy(rewardPerSessionBN);
            const secondsLeft = sessionsLeft.multipliedBy(sessionIntervalSec);
            const hoursLeft = secondsLeft.dividedBy(3600);
            const daysLeft = hoursLeft.dividedBy(24);
            console.log(daysLeft.toString());

            // Format time remaining
            if (daysLeft.gte(7)) {
              setTimeLeft(`≈ ${daysLeft.toFixed(1)} days`);
              setTimeColor("#FFFFFF");
            } else if (daysLeft.gte(1)) {
              setTimeLeft(`≈ ${daysLeft.toFixed(1)} days`);
              setTimeColor("#FACC15");
            } else {
              setTimeLeft(`≈ ${hoursLeft.toFixed(1)} hours`);
              setTimeColor("#F87171");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching token info:", error);
      }
    };

    getTokenInfo();
  }, [token, amount, decimals, provider, rewardPerSession, sessionIntervalSec]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="rounded-lg">
          <TokenIcon address={token} />
        </div>
        <span className="text-white font-medium">
          {formattedAmount} {symbol}
        </span>
      </div>
      <span className="font-medium" style={{ color: timeColor }}>
        {timeLeft}
      </span>
    </div>
  );
};

const FarmDetails = () => {
  const [searchParams] = useSearchParams();
  let { id } = useParams();
  const navigate = useNavigate();
  const { accountId, selector } = useWalletSelector();
  const { provider } = useRPC();
  const [stakeToken, setStakeToken] = useState<TokenMetadata | null>(null);
  const { farm, loading } = useGetFarmDetails(id!);
  const [myPower, setMyPower] = useState<StakeInfo | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardTokensMetadata, setRewardTokensMetadata] = useState<
    TokenMetadata[]
  >([]);

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

  const AccruedRewardAmount = ({ address, _amount }) => {
    const { provider } = useRPC();
    const [amount, setAmount] = useState("");

    const getMetadata = async () => {
      if (!address) return;

      try {
        const metadata = await getTokenMetadata(provider, address);
        setAmount(
          formatNumberWithSuffix(
            Number(toReadableNumber(metadata.decimals, _amount)),
          ),
        );
      } catch (error) {
        console.error("Failed to fetch token metadata:", error);
      }
    };

    useEffect(() => {
      getMetadata();
    }, [provider, farm]);

    return <p>{amount}</p>;
  };

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

  useEffect(() => {
    const errorCode = searchParams.get("errorCode");

    if (errorCode) {
      toast.dismiss(); // Dismiss any existing toasts

      if (errorCode === "userRejected") {
        setTimeout(() => {
          toast.error("Transaction was canceled by the user.");
        }, 1000);
      } else {
        setTimeout(() => {
          toast.error("An error occurred. Please try again.");
        });
      }

      // Clear the URL after displaying the toast
      navigate(window.location.pathname, { replace: true });
    }
  }, []);

  const handleTransaction = async () => {
    const tx = searchParams.get("transactionHashes");
    if (tx) {
      let link = `${NEAR_BLOCK_URL}/${tx}`;
      let isError = await getTxRec(tx, accountId!);
      toast.dismiss();
      if (isError) {
        setTimeout(() => {
          toast.custom(<ErrorToast link={link} />);
        }, 1000);
      } else {
        setTimeout(() => {
          toast.custom(<SuccessToast link={link} />);
        }, 1000);
      }
    }
  };
  useEffect(() => {
    if (accountId) {
      handleTransaction();
    }
  }, [accountId]);

  const getMyPower = async (farmId: number, accountId: string) => {
    try {
      const stakeInfo = await viewFunction(provider, {
        contractId: accounts.SINGLE_FARM,
        methodName: "get_stake_info",
        args: {
          account_id: accountId,
          farm_id: farmId,
        },
      });
      setMyPower(stakeInfo);
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

  const convertSecondsToDate = (seconds: number) => {
    return new Date(seconds * 1000).toLocaleDateString();
  };

  const checkStorageRegistered = async (
    token: string
  ): Promise<Transaction | null> => {
    const gas = "30000000000000";
    const deposit = utils.format.parseNearAmount("0.00125") as string;

    try {
      const storageCheck = await viewFunction(provider, {
        contractId: token,
        methodName: "storage_balance_of",
        args: { account_id: accountId },
      });

      if (!storageCheck) {
        let actions: FunctionCallAction[] = [
          {
            type: "FunctionCall",
            params: {
              methodName: "storage_deposit",
              args: {
                registration_only: true,
              },
              gas,
              deposit,
            },
          },
        ];
        
        let tx = {
          signerId: accountId!,
          receiverId: token,
          actions: actions,
        };

        return tx;
      }
      return null;
    } catch (err) {
      console.error("Error checking storage:", err);
      return null;
    }
  };

  const claimTx = (farmId: number): Transaction => {
    const contract = accounts.SINGLE_FARM;
    const gas = "300000000000000";

    if (!accountId) {
      throw new Error("Account ID is required");
    }

    const actions: FunctionCallAction[] = [
      {
        type: "FunctionCall", // Ensure TypeScript understands this as a FunctionCallAction
        params: {
          methodName: "claim_rewards",
          args: {
            farm_id: farmId,
          },
          gas,
          deposit: "1",
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

  const handleClaim = async () => {
    if (!accountId) {
      toast.error("Please Connect Wallet");
      return;
    }
    
    const allZero = myPower?.accrued_rewards.every((value) => value === "0");
    if (allZero) {
      toast.error("Rewards are not available.");
      return;
    }
    
    let transactions: Transaction[] = [];
    
    // Check storage registration for each reward token
    if (myPower?.reward_tokens?.length) {
      for (let i = 0; i < myPower.reward_tokens.length; i++) {
        // Only check tokens that have accrued rewards
        if (myPower.accrued_rewards[i] !== "0") {
          const token = myPower.reward_tokens[i];
          const storageTx = await checkStorageRegistered(token);
          if (storageTx) {
            transactions.push(storageTx);
          }
        }
      }
    }
    
    // Add claim transaction
    let tx = claimTx(farm!.farm_id);
    transactions.push(tx);
    
    try {
      await (
        await selector.wallet()
      ).signAndSendTransactions({
        transactions,
      });
      window.location.reload();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <PageContainer>
      <div className="mt-12" />
      <TopCard
        bigText="Deposit Tokens to Earn Token Rewards"
        bottomDescription="Use tokens received from staking tokens. Stake tokens to earn protocol rewards."
        gradientText="Steak Farms"
      />
      <div className="flex items-center justify-center">
        <div className="w-full md:w-[60%]">
          <div>
            <Link to="/">
              <span className="cursor-pointer">{"<"}- Farms</span>
            </Link>{" "}
            / Farm Details
          </div>
          {/* header section */}
          {loading ? (
            <div className="pb-4">
              {Array(8)
                .fill(0)
                .map((t, i) => (
                  <Skeleton
                    startColor="#4b2354"
                    endColor="#9a476f"
                    className="mb-4"
                    height="20px"
                    key={i}
                  />
                ))}
            </div>
          ) : (
            ""
          )}
          {farm ? (
            <div className="w-full flex items-center justify-between mt-4">
              <div className="flex items-center justify-start">
                <TokenWithSymbol address={farm.staking_token} />
              </div>
            </div>
          ) : (
            ""
          )}
          {/* Box section */}
          {farm ? (
            <div className="w-full h-auto rounded-lg bg-white-600 mt-4 p-4">
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-white-600 p-4">
                  <section className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2">
                    <h5 className="text-white-400 font-bolder text-md">
                      Start At
                    </h5>
                    <h4 className="text-white font-bold text-lg">
                      {convertSecondsToDate(farm?.start_at_sec)}
                    </h4>
                  </section>
                  <section className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2">
                    <h5 className="text-white-400 font-bolder text-md">
                      Total Staked
                    </h5>
                    <h4 className="text-white font-bold">
                      {stakeToken &&
                        `${readableValue(
                          stakeToken?.decimals,
                          new BigNumber(farm?.total_staked),
                        )} ${stakeToken.symbol}`}
                    </h4>
                  </section>
                </div>
                <section className="rounded-lg bg-white-600 flex items-start justify-between gap-8 p-4">
                  <div className="w-full">
                    <h5 className="text-white-400 font-bolder text-md mb-4">
                      Rewards not distributed / claimed yet
                    </h5>
                    <div className="space-y-3">
                      {farm.reward_tokens.map((token, index) => (
                        <RewardLeft
                          key={token}
                          token={token}
                          amount={farm.remaining_reward[index]}
                          decimals={rewardTokensMetadata[index]?.decimals || 24}
                          rewardPerSession={farm.reward_per_session[index]}
                          sessionIntervalSec={farm.session_interval_sec}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        if (!accountId) {
                          toast.error("Please Connect Wallet");
                          return;
                        }
                        setRewardOpen(true);
                      }}
                      className="bg-[#CD7FF0] hover:bg-[#B15FD1] transition-all duration-200 text-white font-bold text-sm px-6 py-2 rounded-sm mt-4 w-full shadow-sm hover:shadow-md"
                    >
                      Refill Rewards
                    </button>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            ""
          )}
          {/* Last Single box */}
          {myPower && myPower.reward_tokens.length ? (
            <div className="rounded-lg bg-white-600 p-4 mt-4">
              <h5 className="text-white font-bold text-md">
                Unclaimed Rewards
              </h5>

              <section className="flex flex-col md:flex-row items-start justify-between gap-2 md:gap-6">
                <div className="flex flex-row md:flex-col items-start justify-start">
                  {myPower && myPower.reward_tokens?.length && accountId
                    ? myPower?.reward_tokens.map((t, i) => {
                        return (
                          <div className="flex items-center mb-2 mr-2" key={i}>
                            <TokenIcon address={t} />
                            <h5 className="text-white-400 font-bold text-md ml-4">
                              {myPower && (
                                <AccruedRewardAmount
                                  _amount={myPower?.accrued_rewards[i]}
                                  address={t}
                                />
                              )}
                            </h5>
                          </div>
                        );
                      })
                    : ""}
                </div>
                <button
                  onClick={handleClaim}
                  className="bg-[#CD7FF0] hover:bg-[#B15FD1] transition-all duration-200 text-white font-bold text-sm min-w-[150px] rounded-xl shadow-sm hover:shadow-md p-4"
                >
                  Claim Rewards
                </button>
              </section>
            </div>
          ) : (
            ""
          )}
        </div>
      </div>
      <div className="w-full h-auto relative">
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <button className="text-white font-bold text-sm hover:text-[#CD7FF0] transition-colors duration-200">
              ← Back
            </button>
          </Link>
        </div>
      </div>
      <AddReward farm={farm} open={rewardOpen} setOpen={setRewardOpen} />
      <div className="pb-32" />
    </PageContainer>
  );
};

export default FarmDetails;
