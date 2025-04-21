import { useState, useEffect } from "react";
import { useRPC } from "@/stores/rpc-store";
import { formatNumberWithSuffix, toReadableNumber } from "@/utils/conversion";
import { getTokenMetadata } from "@/utils/tokens";

interface RewardAmountProps {
  token: string;
  amount: string;
  decimals: number;
}

const RewardAmount = ({ token, amount, decimals }: RewardAmountProps) => {
  const { provider } = useRPC();
  const [metadata, setMetadata] = useState<{
    symbol?: string;
    price_usd?: string;
  }>({ symbol: "", price_usd: "0" });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const data = await getTokenMetadata(provider, token);
        setMetadata(data);
      } catch (error) {
        console.error("Failed to fetch token metadata:", error);
      }
    };

    fetchMetadata();
  }, [token]);

  const tokenAmount = Number(toReadableNumber(decimals, amount));
  const usdAmount = tokenAmount * Number(metadata?.price_usd || 0);

  return (
    <div className="flex items-center gap-2">
      <span className="text-white font-normal text-sm">
        {formatNumberWithSuffix(tokenAmount)} {metadata?.symbol || ""}
      </span>
      {usdAmount > 0 && (
        <span className="text-white-400 font-normal text-sm">
          (${formatNumberWithSuffix(usdAmount)})
        </span>
      )}
    </div>
  );
};

export default RewardAmount;
