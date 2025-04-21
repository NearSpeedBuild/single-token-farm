import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { setupWalletSelector } from "@near-wallet-selector/core";
import type {
  WalletSelector,
  AccountState,
  Network,
} from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { providers } from "near-api-js";
import { rpcUrl } from "@/utils/config";
import { setupBitteWallet } from "@near-wallet-selector/bitte-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMeteorWalletApp } from "@near-wallet-selector/meteor-wallet-app";
import { setupLedger } from "@near-wallet-selector/ledger";
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";

interface WalletSelectorContextValue {
  selector: WalletSelector;
  accounts: AccountState[];
  accountId: string | null;
  showModal: boolean;
  signOut: () => Promise<void>;
  toggleModal: () => void;
  viewMethod: any;
  callMethod: any;
  callMethodMulti: any;
  callMethodMultiActions: any;
}

const WalletSelectorContext =
  React.createContext<WalletSelectorContextValue | null>(null);

export const WalletSelectorContextProvider: React.FC<
  PropsWithChildren<Record<any, any>>
> = ({ children }) => {
  const [accountId, setAccountId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [selector, setSelector] = useState<WalletSelector | null>(null);

  const toggleModal = () => setShowModal(!showModal);

  const signOut = async () => {
    if (!selector) {
      return;
    }

    const wallet = await selector.wallet();

    wallet.signOut();
  };

  const init = useCallback(async () => {
    const _selector = await setupWalletSelector({
      network: {
        networkId: import.meta.env.VITE_NEAR_NETWORK || "testnet",
        nodeUrl: rpcUrl,
      } as Network,
      debug: false,
      modules: [
        setupMeteorWallet(),
        setupMyNearWallet(),
        setupHotWallet(),
        // setupNightly(), freezes the page for a few seconds before load
        setupSender(),
        setupMeteorWalletApp({ contractId: "" }),
        setupLedger(),
        // @ts-ignore
        setupBitteWallet(),
      ],
    });

    const state = _selector.store.getState();

    setAccounts(state.accounts);
    setSelector(_selector);
  }, []);

  useEffect(() => {
    init().catch((err) => {
      console.error("Failed to initialize wallet selector", err);
      alert("Failed to initialize wallet selector");
    });
  }, [init]);

  useEffect(() => {
    if (!selector) {
      return;
    }

    const subscription = selector.store.observable.subscribe((state) => {
      const prevAccounts = accounts;
      const nextAccounts = state.accounts;

      // Only update if accounts have changed (implementing distinctUntilChanged manually)
      if (JSON.stringify(prevAccounts) !== JSON.stringify(nextAccounts)) {
        setAccounts(nextAccounts);
        setShowModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [selector]);

  useEffect(() => {
    const newAccount =
      accounts.find((account) => account.active)?.accountId || "";

    setAccountId(newAccount);
  }, [accounts]);

  if (!selector) {
    return null;
  }

  async function viewMethod(contractId, methodName, args) {
    const { network } = (selector as any).options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });
    const res = await provider.query({
      request_type: "call_function",
      account_id: contractId,
      method_name: methodName,
      args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      finality: "optimistic",
    });

    return JSON.parse(Buffer.from((res as any).result).toString());
  }
  async function callMethod(
    contractId,
    methodName,
    args,
    gas,
    amount,
    callBackUrl,
  ) {
    if (!accountId) {
      // toast.warn("Please connect wallet");
      throw new Error("ERR_NOT_SIGNED_IN");
    }
    const { contract } = (selector as any).store.getState();
    const wallet = await (selector as any).wallet();

    const transactions: any[] = [];
    transactions.push({
      signerId: accountId,
      receiverId: contractId || contract.contractId,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: methodName || "add_message",
            args: args || { message: "Hello World" },
            gas: gas ? gas : "250000000000000",
            deposit: amount ? amount.toString() : "1",
          },
        },
      ],
    });

    const res = await wallet
      .signAndSendTransactions({
        transactions,
        callbackUrl: callBackUrl || "",
      })
      .catch((err) => {
        throw err;
      });
    window.location.reload();
    return res;
  }
  async function callMethodMultiActions(contractId, actions, callBackUrl) {
    if (!accountId) {
      // toast.warn("Please connect wallet");
      throw new Error("ERR_NOT_SIGNED_IN");
    }
    const { contract } = (selector as any).store.getState();
    const wallet = await (selector as any).wallet();

    const transactions: any[] = [];
    transactions.push({
      signerId: accountId,
      receiverId: contractId || contract.contractId,
      actions: actions,
    });

    const res = await wallet
      .signAndSendTransactions({
        transactions,
        callbackUrl: callBackUrl || "",
      })
      .catch((err) => {
        throw err;
      });
    window.location.reload();
    return res;
  }
  async function callMethodMulti(params, metadata, callbackUrl) {
    if (!accountId) {
      // toast.warn("Please connect wallet");
      throw new Error("ERR_NOT_SIGNED_IN");
    }
    const { contract } = (selector as any).store.getState();
    const wallet = await (selector as any).wallet();

    const transactions: any = [];
    for (const param of params) {
      transactions.push({
        signerId: accountId,
        receiverId: param.contractId || contract.contractId,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: param.methodName || "add_message",
              args: param.args || { message: "Hello World" },
              gas: param.gas ? param.gas : "250000000000000",
              deposit: param.amount ? param.amount.toString() : "0",
            },
          },
        ],
      });
    }

    const res = await wallet
      .signAndSendTransactions({
        transactions,
        metadata: JSON.stringify(metadata),
        callbackUrl: callbackUrl || "",
      })
      .catch((err) => {
        throw err;
      });
    window.location.reload();
    return res;
  }

  return (
    <WalletSelectorContext.Provider
      value={{
        selector,
        accounts,
        accountId,
        showModal,
        signOut,
        toggleModal,
        viewMethod,
        callMethod,
        callMethodMulti,
        callMethodMultiActions,
      }}
    >
      {children}
    </WalletSelectorContext.Provider>
  );
};

export function useWalletSelector() {
  const context = useContext(WalletSelectorContext);

  if (!context) {
    throw new Error(
      "useWalletSelector must be used within a WalletSelectorContextProvider",
    );
  }

  return context;
}
