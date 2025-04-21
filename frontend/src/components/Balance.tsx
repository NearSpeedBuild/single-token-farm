import { useState, useEffect } from "react";
import { useRPC } from "@/stores/rpc-store";
import { formatNumberWithSuffix, toReadableNumber } from "@/utils/conversion";
import { getTokenBalance } from "@/utils/balances";
import { TokenMetadata } from "@/utils/tokens";

interface BalanceProps {
  token: TokenMetadata;
  connectedAccount: string;
}

const Balance = ({ token, connectedAccount }: BalanceProps) => {
  const { provider } = useRPC();
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const rawBalance = await getTokenBalance(
          provider,
          token.address,
          connectedAccount,
          false,
        );
        const formattedBalance = formatNumberWithSuffix(
          Number(toReadableNumber(token.decimals, rawBalance)),
        );
        setBalance(formattedBalance);
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance("0");
      }
    };

    if (connectedAccount && token?.address) {
      fetchBalance();
    }
  }, [provider, token, connectedAccount]);

  return <span>{balance}</span>;
};

export default Balance;
