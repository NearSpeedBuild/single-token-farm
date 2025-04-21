import React, { useEffect, useState } from "react";
import { utils } from "near-api-js";
import { RxTriangleDown } from "react-icons/rx";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
} from "@chakra-ui/react";
import { useWalletSelector } from "@/context/wallet-selector";
import { XCircleIcon } from "@heroicons/react/24/outline";
import {
  formatNumberWithSuffix,
  formatValueInDecimals,
  toNonDivisibleNumber,
  formatWithoutTrailingZeros,
} from "@/utils/conversion";
import toast from "react-hot-toast";
import { accounts } from "@/utils/account-ids";
import { useRPC, viewFunction } from "@/stores/rpc-store";
import Balance from "@/components/Balance";
import { Transaction, FunctionCallAction } from "@near-wallet-selector/core";
import { getTokenBalance } from "@/utils/balances";
import { getTokenMetadata } from "@/utils/tokens";

const AddReward = ({
  open,
  setOpen,
  farm,
}: {
  open: boolean;
  farm: any;
  setOpen: (open: boolean) => void;
}) => {
  const { accountId, selector } = useWalletSelector();
  const { provider } = useRPC();
  const [token, setToken] = useState<any>(null);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [rewardTokens, setRewardTokens] = useState([]);

  const handleSetToken = (token: any) => {
    setToken(token);
    setTokenOpen(false);
  };

  const getBalance = async (token: any) => {
    try {
      if (accountId && typeof accountId === "string") {
        const balance = await getTokenBalance(
          provider,
          token?.address,
          accountId,
          token?.isNear,
        );
        const formattedBalance = formatValueInDecimals(
          balance,
          token?.isNear ? 24 : token?.decimals,
        );
        setBalance(formattedBalance);
      }
    } catch (error) {
      console.log(error);
      setBalance("0");
    }
  };

  useEffect(() => {
    if (token) {
      getBalance(token);
    }
  }, [token]);

  const rewardTx = (
    token: string,
    amount: string,
    farmId: string,
  ): Transaction => {
    const contract = accounts.SINGLE_FARM;
    const gas = "300000000000000";

    if (!accountId) {
      throw new Error("Account ID is required");
    }

    const actions: FunctionCallAction[] = [
      {
        type: "FunctionCall", // Ensure TypeScript understands this as a FunctionCallAction
        params: {
          methodName: "ft_transfer_call",
          args: {
            receiver_id: contract,
            amount: amount,
            msg: `ADD_REWARD:${farmId}`,
          },
          gas,
          deposit: "1",
        },
      },
    ];

    const transaction: Transaction = {
      signerId: accountId as string, // Ensure accountId is not null
      receiverId: token,
      actions: actions,
    };
    return transaction;
  };

  const registerAccount = async (
    token: string,
  ): Promise<Transaction | null> => {
    const gas = "30000000000000";
    const contract = accounts.SINGLE_FARM;
    const deposit = utils.format.parseNearAmount("0.00125") as string;
    try {
      const storageCheck = await viewFunction(provider, {
        contractId: token,
        methodName: "storage_balance_of",
        args: {
          account_id: contract!,
        },
      });

      if (!storageCheck) {
        let actions: FunctionCallAction[] = [
          {
            type: "FunctionCall",
            params: {
              methodName: "storage_deposit",
              args: {
                registration_only: true,
                account_id: contract,
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
      } else {
        return null;
      }
    } catch (err) {
      console.log(err);
      return null;
    }
  };

  const handleAddReward = async () => {
    if (!token) {
      toast.error("Please Select Token");
      return;
    }
    if (Number(amount) <= 0) {
      toast.error("Amount is Required");
      return;
    }
    if (Number(amount) > Number(balance)) {
      toast.error("Insufficient Balance");
      return;
    }
    let transactions: Transaction[] = [];
    let _amount = toNonDivisibleNumber(token?.decimals, amount);
    let tx = await registerAccount(token?.address);
    if (tx) {
      transactions.push(tx);
    }

    let tx0 = rewardTx(token?.address, _amount, farm?.farm_id);
    transactions.push(tx0);
    await (
      await selector.wallet()
    ).signAndSendTransactions({
      transactions,
    });
    window.location.reload();
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "-") {
      e.preventDefault();
    }
  };

  const getTokensMetadata = async (addresses) => {
    if (!addresses || addresses.length === 0) return;

    try {
      const metadataPromises = addresses.map((address) =>
        getTokenMetadata(provider, address),
      );

      const metadataResults = await Promise.all(metadataPromises);
      // Combine addresses with metadata
      const tokensWithMetadata = addresses.map((address, index) => ({
        address,
        ...metadataResults[index], // Includes symbol, decimals, icon, etc.
      }));
      setRewardTokens(tokensWithMetadata);
    } catch (error) {
      console.error("Failed to fetch token metadata:", error);
    }
  };

  useEffect(() => {
    if (farm?.reward_tokens?.length) {
      getTokensMetadata(farm.reward_tokens);
    }
  }, [farm]);

  const onMaxClick = () => {
    setAmount(formatWithoutTrailingZeros(balance));
  };

  return (
    <Modal isCentered isOpen={open} onClose={() => setOpen(false)}>
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)" />
      <ModalContent
        bg="linear-gradient(135deg, #2D1934 0%, #1F1427 100%)"
        maxW="500px"
        width="95%"
        borderRadius="2xl"
        border="1px solid"
        borderColor="whiteAlpha.200"
        pb={6}
      >
        <ModalHeader className="border-b border-white/10">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl text-white font-bold">Add Reward</h2>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-white/10 p-2 rounded-full transition-colors duration-200"
            >
              <XCircleIcon className="w-6 h-6 text-white/70 hover:text-white" />
            </button>
          </div>
        </ModalHeader>
        <ModalBody className="p-6">
          <div className="space-y-6">
            {/* Input Container */}
            <div className="bg-white/5 rounded-xl px-4 pb-2 pt-1 border border-white/10 mt-4">
              <div className="flex items-center">
                <section
                  onClick={() => setTokenOpen(true)}
                  role="button"
                  className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 mt-2 hover:bg-white/20 transition-colors duration-200"
                >
                  <img
                    className="w-[20px] h-[20px]"
                    src={token?.icon ?? "/near.png"}
                  />
                  <p className="text-[14px] md:text-[16px] text-white font-normal">
                    {token ? token?.symbol : "Select Token"}
                  </p>
                  <RxTriangleDown className="text-white/70" />
                </section>
                <input
                  className="flex-1 min-w-0 bg-transparent text-white font-bold text-2xl
                  placeholder-white/30 border-none focus:outline-none focus:ring-0
                  hover:border-none text-right"
                  placeholder="0.0"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={0}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={onMaxClick}
                  className="text-[#CD7FF0] hover:text-[#B15FD1] font-semibold text-sm 
                  bg-[#CD7FF0]/10 px-2 py-1 rounded-lg transition-colors duration-200
                  whitespace-nowrap ml-8"
                >
                  MAX
                </button>
              </div>
              <div className="flex justify-end">
                <span className="text-white/30 text-xs">
                  Balance: {formatNumberWithSuffix(Number(balance))}{" "}
                  {token?.symbol || ""}
                </span>
              </div>
            </div>

            {/* Add Reward Button */}
            <button
              onClick={handleAddReward}
              className="w-full py-4 rounded-xl font-bold text-lg
              bg-gradient-to-r from-[#CD7FF0] to-[#B15FD1] 
              hover:from-[#B15FD1] hover:to-[#9A4FBA]
              disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed
              text-white transition-all duration-200 transform hover:scale-[1.02]
              hover:shadow-[0_0_20px_rgba(205,127,240,0.3)]"
            >
              Add Reward
            </button>
          </div>
          <RewardTokenList
            open={tokenOpen}
            setOpen={setTokenOpen}
            tokens={rewardTokens}
            setToken={handleSetToken}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default AddReward;

export const RewardTokenList = ({ open, setOpen, tokens, setToken }) => {
  const { account } = useRPC();

  return (
    <Modal isCentered isOpen={open} onClose={() => setOpen(false)}>
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
              Select Token
            </h2>
            <button onClick={() => setOpen(false)}>
              <XCircleIcon className="w-6 h-6 text-white hover:text-gray-300" />
            </button>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="w-full h-auto relative">
            {tokens.length ? (
              tokens?.map((token: any) => {
                let updatedToken = { ...token, address: token?.address };
                return (
                  <div
                    className="flex items-center justify-between mb-4 cursor-pointer hover:text-gray-300 transition-colors duration-200 rounded-sm p-2"
                    key={updatedToken.address}
                    onClick={() => setToken(token)}
                  >
                    <div className="flex items-center">
                      {token?.icon ? (
                        <img
                          src={token?.icon}
                          style={{ height: "28px", width: "28px" }}
                          className="mr-2 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#594661] border border-white border-opacity-20 mr-2"></div>
                      )}
                      <Text fontSize={16}>{token?.symbol}</Text>
                    </div>
                    {account && (
                      <Text
                        fontSize="14px"
                        height="20px"
                        color="#9c94a7"
                        fontWeight="bold"
                        textAlign="right"
                      >
                        <Balance
                          connectedAccount={account!.accountId}
                          token={updatedToken}
                        />
                      </Text>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center mt-8 mb-8">
                <Text fontWeight="extrabold">
                  You don't have any reward token to deposit
                </Text>
              </div>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
