import { useRPC } from "@/stores/rpc-store";
import { getTokenMetadata, TokenMetadata } from "@/utils/tokens";
import { useEffect, useState } from "react";

const TokenWithSymbol = ({ address }: { address: string }) => {
  const { provider } = useRPC();
  const [token, setToken] = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchMetadata = async () => {
      try {
        const metadata = await getTokenMetadata(provider, address, true);
        setToken(metadata);
      } catch (error) {
        console.error("Failed to fetch token metadata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [provider, address]);

  return (
    <div className="flex items-center">
      {/* Token Icon */}
      <div className="flex items-center justify-start">
        {loading ? (
          <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-full"></div>
        ) : (
          <img
            src={token?.icon ?? ""}
            className="w-8 h-8 rounded-full"
            alt={token?.symbol ?? ""}
          />
        )}
      </div>

      {/* Token Symbol */}
      <div className="flex flex-col items-start justify-start pl-2 sm:pl-4">
        <h1 className="text-md sm:text-lg tracking-tighter font-bold leading-6">
          {loading ? "Loading..." : token?.symbol || "Unknown"}
        </h1>
      </div>
    </div>
  );
};

export default TokenWithSymbol;
