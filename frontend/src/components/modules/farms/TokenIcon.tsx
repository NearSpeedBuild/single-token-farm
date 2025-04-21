import { useState, useEffect } from "react";
import { useRPC } from "@/stores/rpc-store";
import { getTokenMetadata } from "@/utils/tokens";

const TokenIcon = ({ address }: { address: string }) => {
  const { provider } = useRPC();
  const [icon, setIcon] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metadata = await getTokenMetadata(provider, address, true);
        if (!metadata.icon) {
          setIcon(null);
        } else {
          setIcon(metadata.icon);
        }
      } catch (error) {
        console.error("Failed to fetch token metadata:", error);
      }
    };

    fetchMetadata();
  }, [address]);

  return (
    <div>
      {icon ? (
        <img className="w-8 h-8 rounded-full" src={icon} />
      ) : (
        <img className="w-8 h-8 rounded-full" src="unknown" />
      )}
    </div>
  );
};

export default TokenIcon;
