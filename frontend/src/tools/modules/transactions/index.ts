import { providers } from "near-api-js";

const rpcProviders = {
  testnet: "https://archival-rpc.testnet.near.org",
  mainnet: "https://archival-rpc.mainnet.near.org",
};

const provider = new providers.JsonRpcProvider(
  rpcProviders[import.meta.env.VITE_NEAR_NETWORK],
);

export const getTransactionState = async (txHash: string, accountId: string) =>
  await provider.txStatus(txHash, accountId);

export const getTxRec = async (tx: string, accountId: string) => {
  try {
    const res: any = await getTransactionState(tx, accountId!);
    const outcomes = res.receipts_outcome;

    let firstError: string = "";

    for (const outcome of outcomes) {
      const status = outcome.outcome.status;

      if (status && status.Failure) {
        // Drill down to get the specific execution error message
        const errorMessage =
          status.Failure?.ActionError?.kind?.FunctionCallError?.ExecutionError;

        if (errorMessage) {
          firstError = `Transaction with receipt ID ${outcome.id} failed with error: ${errorMessage}`;
        } else {
          firstError = `Transaction with receipt ID ${outcome.id} failed with an unknown error.`;
        }
        break; // Stop after finding the first error
      }
    }
    return firstError;
  } catch (error) {
    console.error("Error fetching transaction state:", error);
  }
};
