import { nearNetwork } from "./config";

export const accounts = {
  SINGLE_FARM: import.meta.env.VITE_SINGLE_FARM_CONTRACT as string,
};

export const NEAR_BLOCK_URL =
  nearNetwork === "mainnet"
    ? "https://nearblocks.io/txns"
    : "https://testnet.nearblocks.io/txns";
