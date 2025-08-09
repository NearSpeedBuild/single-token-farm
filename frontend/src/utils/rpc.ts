const nearNetwork = import.meta.env.VITE_NEAR_NETWORK;

interface DefaultRPCType {
  name: string;
  url: string;
  ping: number;
}

export const rpcData: DefaultRPCType[] =
  nearNetwork.toLowerCase() === "mainnet"
    ? [
        {
          name: "Intear RPC",
          url: "https://rpc.intea.rs",
          ping: 0,
        },
        {
          name: "Shitzu RPC",
          url: "https://rpc.shitzuapes.xyz",
          ping: 0,
        },
        {
          name: "Near.org RPC",
          url: "https://rpc.mainnet.near.org",
          ping: 0,
        },
        {
          name: "FastNear Free RPC",
          url: "https://free.rpc.fastnear.com",
          ping: 0,
        },
      ]
    : [
        {
          name: "Near.org RPC",
          url: "https://rpc.testnet.near.org",
          ping: 0,
        },
      ];
