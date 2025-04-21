import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  PropsWithChildren,
} from "react";
import { Account, providers } from "near-api-js";
import { rpcData } from "@/utils/rpc";
import { CodeResult } from "near-api-js/lib/providers/provider";

interface RPC {
  name: string;
  url: string;
  ping: number;
}

interface RPCContextValue {
  account: Account | null;
  rpcList: RPC[];
  selectedRPC: RPC;
  provider: providers.Provider;
  addRPC: (rpc: RPC) => void;
  selectRPC: (rpc: RPC) => void;
  setDefaultRPCs: (defaultRPCs: RPC[]) => void;
  setAccount: (account: Account) => void;
}

function createFailoverProvider(rpcData: RPC[]) {
  return new providers.FailoverRpcProvider(
    rpcData.map((rpc) => new providers.JsonRpcProvider({ url: rpc.url })),
  );
}

export async function viewFunction(
  provider: providers.Provider,
  {
    contractId,
    methodName,
    args,
  }: {
    contractId: string;
    methodName: string;
    args: object;
  },
) {
  const argsBase64 = args
    ? Buffer.from(JSON.stringify(args)).toString("base64")
    : "";

  const viewCallResult = await provider.query<CodeResult>({
    request_type: "call_function",
    account_id: contractId,
    method_name: methodName,
    args_base64: argsBase64,
    finality: "optimistic",
  });

  return JSON.parse(Buffer.from(viewCallResult.result).toString());
}

const RPCContext = createContext<RPCContextValue | null>(null);

export const RPCProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [account, setAccountState] = useState<Account | null>(null);
  const [rpcList, setRpcList] = useState<RPC[]>(rpcData);
  const [selectedRPC, setSelectedRPC] = useState<RPC>(() => {
    const savedRPC = localStorage.getItem("selectedRPC");
    if (savedRPC) {
      return JSON.parse(savedRPC);
    }
    return JSON.parse(JSON.stringify(rpcData[0]));
  });
  const [provider, setProvider] = useState<providers.Provider>(() =>
    createFailoverProvider(rpcData),
  );

  const addRPC = useCallback(
    (rpc: RPC) => {
      const updatedRpcList = [...rpcList, rpc];
      localStorage.setItem("rpcList", JSON.stringify(updatedRpcList));
      setRpcList(updatedRpcList);
      setProvider(createFailoverProvider(updatedRpcList));
    },
    [rpcList],
  );

  const selectRPC = useCallback(
    (rpc: RPC) => {
      localStorage.setItem("selectedRPC", JSON.stringify(rpc));
      setSelectedRPC(rpc);
      setProvider(
        createFailoverProvider([
          rpc,
          ...rpcList.filter((r) => r.url !== rpc.url),
        ]),
      );
    },
    [rpcList],
  );

  const setDefaultRPCs = useCallback((defaultRPCs: RPC[]) => {
    setRpcList(defaultRPCs);
    setProvider(createFailoverProvider(defaultRPCs));
  }, []);

  const setAccount = useCallback((account: Account) => {
    setAccountState(account);
  }, []);

  return (
    <RPCContext.Provider
      value={{
        account,
        rpcList,
        selectedRPC,
        provider,
        addRPC,
        selectRPC,
        setDefaultRPCs,
        setAccount,
      }}
    >
      {children}
    </RPCContext.Provider>
  );
};

export function useRPC() {
  const context = useContext(RPCContext);
  if (!context) {
    throw new Error("useRPC must be used within a RPCProvider");
  }
  return context;
}
