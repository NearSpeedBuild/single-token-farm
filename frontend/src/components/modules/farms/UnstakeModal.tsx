import { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@chakra-ui/react";
import { useWalletSelector } from "@/context/wallet-selector";
import { XCircleIcon } from "@heroicons/react/24/outline";
import BigNumber from "bignumber.js";

import {
  toNonDivisibleNumber,
  formatNumberWithSuffix,
  formatWithoutTrailingZeros,
} from "@/utils/conversion";
import toast from "react-hot-toast";
import { accounts } from "@/utils/account-ids";
import { useRPC } from "@/stores/rpc-store";
import { Transaction, FunctionCallAction } from "@near-wallet-selector/core";
import { getTokenMetadata, TokenMetadata } from "@/utils/tokens";
import TokenIcon from "./TokenIcon";

const UnStakeModal = ({
  open,
  setOpen,
  farm,
  staked,
}: {
  open: boolean;
  farm: any;
  setOpen: (open: boolean) => void;
  staked: string;
}) => {
  const { accountId, selector } = useWalletSelector();
  const { provider } = useRPC();
  const [amount, setAmount] = useState("");
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(
    null,
  );

  const onMaxClick = () => {
    setAmount(formatWithoutTrailingZeros(staked));
  };

  const unstakeTx = (amount: string, farmId: number): Transaction => {
    const contract = accounts.SINGLE_FARM;
    const gas = "300000000000000";

    if (!accountId) {
      throw new Error("Account ID is required");
    }

    const actions: FunctionCallAction[] = [
      {
        type: "FunctionCall", // Ensure TypeScript understands this as a FunctionCallAction
        params: {
          methodName: "withdraw",
          args: {
            amount: amount,
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

  const handleUnstake = async () => {
    if (!amount) {
      toast.error("Enter Amount");
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    if (new BigNumber(amount).gt(new BigNumber(staked))) {
      toast.error("Not enough balance");
      return;
    }

    let transactions: Transaction[] = [];

    let _shares = toNonDivisibleNumber(tokenMetadata?.decimals || 0, amount);
    let tx3 = unstakeTx(_shares, farm?.farm_id);
    transactions.push(tx3);

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

  const checkDisabaled = () => {
    if (new BigNumber(amount).gt(new BigNumber(staked))) {
      return true;
    }
    return false;
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "-") {
      e.preventDefault();
    }
  };

  const handleClose = () => {
    setAmount("");
    setOpen(false);
  };

  const getUSDValue = (amount: string): string => {
    if (!amount || !tokenMetadata?.price_usd) return "$0.00";
    const value = new BigNumber(amount).multipliedBy(tokenMetadata.price_usd);
    return value.lt(0.01) ? "< $0.01" : `$${value.toFixed(2)}`;
  };

  useEffect(() => {
    if (farm) {
      getTokenMetadata(provider, farm.staking_token).then((metadata) => {
        setTokenMetadata(metadata);
      });
    }
  }, [provider, farm]);

  return (
    <Modal isCentered isOpen={open} onClose={handleClose}>
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
            <div className="flex items-center gap-3">
              <TokenIcon address={farm.staking_token} />
              <h2 className="text-2xl text-white font-bold">
                Unstake {tokenMetadata?.symbol || ""}
              </h2>
            </div>
            <button
              onClick={handleClose}
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
                <input
                  className="flex-1 min-w-0 bg-transparent text-white font-bold text-2xl
                  placeholder-white/30 border-none focus:outline-none focus:ring-0
                  hover:border-none text-left pl-0"
                  placeholder="0.0"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
              <div className="flex justify-between">
                <span className="text-white/30 text-xs">{getUSDValue(amount)}</span>
                <span className="text-white/30 text-xs">
                  {formatNumberWithSuffix(Number(staked || 0))}{" "}
                  {tokenMetadata?.symbol}
                </span>
              </div>
            </div>

            {/* Unstake Button */}
            <button
              onClick={handleUnstake}
              disabled={checkDisabaled()}
              className={`w-full py-4 rounded-xl font-bold text-lg
              bg-gradient-to-r from-[#7B1FA2] to-[#5F1880]
              hover:from-[#5F1880] hover:to-[#4A1262]
              disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed
              text-white transition-all duration-200 transform hover:scale-[1.02]
              ${!checkDisabaled() && "hover:shadow-[0_0_20px_rgba(123,31,162,0.3)]"}`}
            >
              Unstake
            </button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default UnStakeModal;
