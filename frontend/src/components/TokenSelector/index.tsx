import { useState } from "react";
import { RxTriangleDown } from "react-icons/rx";
import TokenList from "@/components/TokenList";

const TokenSelector = ({ token, setToken, tokenToFilter }) => {
  const [open, setOpen] = useState(false);

  return (
    <section
      onClick={() => setOpen(true)}
      role="button"
      className="bg-[#00000033] rounded-sm min-w-full md:min-w-[185px] min-h-[36px] flex items-center justify-between p-2"
    >
      <div className="flex items-center justify-start p-1">
        <img className="w-[20px] h-[20px]" src={token?.icon ?? "/near.png"} />
        <p className="text-[14px] md:text-[16px] text-white font-normal pl-2">
          {token && token.symbol ? token?.symbol : "Select Token"}
        </p>
      </div>
      <RxTriangleDown />
      <TokenList
        open={open}
        setOpen={setOpen}
        setSelectedToken={(token) => setToken(token)}
        tokenToFilter={tokenToFilter}
      />
    </section>
  );
};

export default TokenSelector;
