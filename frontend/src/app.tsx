import { Toaster } from "react-hot-toast";
import { Box, Flex, Text, useColorModeValue } from "@chakra-ui/react";
import { Header } from "@/components/shared/header";
import { BrowserRouter as Router, useRoutes } from "react-router-dom";
import { useWalletSelector } from "@/context/wallet-selector";
import { getTransactionState } from "@/tools/modules/transactions";
import routes from "virtual:generated-pages-react";
import { useEffect, useState } from "react";
import { connectDefaultNear, nearConfigs } from "@/utils/config";
import { RPCSelector, calculateRPCPing } from "@/components/RPCSelector";
import { GiSettingsKnobs } from "react-icons/gi";
import { useTheme } from "./hooks/theme";
import { useRPC } from "@/stores/rpc-store";

const Pages = () => {
  const filteredRoutes = routes.map((item) => {
    if (item.children) {
      return {
        ...item,
        children: item.children?.filter((children) => {
          if (
            !children.path?.includes("tutorial") &&
            !children.path?.includes("config")
          ) {
            return children;
          }
        }),
      };
    }

    return item;
  });
  return useRoutes(filteredRoutes);
};

const transactionHashes = new URLSearchParams(window.location.search).get(
  "transactionHashes",
);

function App() {
  let rpcPingRetries = 0;
  const allowedRPCPingRetries = 3;
  const { accountId } = useWalletSelector();
  const [isRPCSelectorOpen, setIsRPCSelectorOpen] = useState<boolean>(false);
  const { jumpGradient } = useTheme();

  const { selectedRPC, selectRPC, account, setAccount } = useRPC();

  useEffect(() => {
    if (!accountId || !transactionHashes) {
      return;
    }

    (async () => {
      if (transactionHashes) {
        window.localStorage.setItem("lastTransactionHashes", transactionHashes);
      }

      const transactions = transactionHashes.split(",");

      const states: any[] = [];

      for (let i = 0; i < transactions.length; i++) {
        const state = await getTransactionState(transactions[i], accountId);

        states.push(state);
      }
    })();
  }, [accountId]);

  // calculate rpc ping and set rpc.
  useEffect(() => {
    if (!selectedRPC.ping) {
      if (rpcPingRetries < allowedRPCPingRetries) {
        rpcPingRetries = rpcPingRetries + 1;
        calculateRPCPing(selectedRPC.url).then((value) => {
          selectRPC({
            ...selectedRPC,
            ping: parseFloat(value?.toFixed(2) || "0"),
          });
        });
      }
    }
  }, [selectedRPC, rpcPingRetries]);

  const setConnectedAccount = async () => {
    if (accountId) {
      if (!account || !account?.accountId) {
        const near = await connectDefaultNear(nearConfigs);
        const response = await near.account(accountId as string);
        setAccount(response);
      }
    }
  };

  useEffect(() => {
    setConnectedAccount();
  }, [accountId]);

  const cardBg = useColorModeValue(jumpGradient, jumpGradient);

  return (
    <Router>
      <Flex
        align="center"
        onClick={() => {
          setIsRPCSelectorOpen(true);
        }}
        fontWeight="bold"
        fontSize="14px"
        my={2}
        pl="20px"
        pr="20px"
        color="#B4A3A9"
        as="button"
        bg={cardBg}
        borderRadius="lg"
        className="fixed bottom-[20px] right-[24px] z-40 cursor-pointer hover:opacity-[0.95] space-x-[12px]"
      >
        <Text ml="4px" mr="4px">
          {selectedRPC?.name}
        </Text>
        <div
          style={{
            width: "1em",
            height: "1em",
            background:
              "radial-gradient(circle, rgb(174, 108, 198) 50%, rgb(112, 112, 238) 100%)",
            mask: 'url("data:image/svg+xml;utf8,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%20stroke-width%3D%220%22%20viewBox%3D%220%200%20512%20512%22%20height%3D%221em%22%20width%3D%221em%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M256%208C119%208%208%20119%208%20256s111%20248%20248%20248%20248-111%20248-248S393%208%20256%208z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E") center center / contain no-repeat',
          }}
        />
        <Text ml="4px">{selectedRPC?.ping}(ms)</Text>
        <Box ml="4px">
          <GiSettingsKnobs
            style={{ transform: "rotate(-90deg)", color: "white" }}
          />
        </Box>
      </Flex>
      <Header />
      <Pages />
      <Toaster position="top-center" />
      <RPCSelector
        isOpen={isRPCSelectorOpen}
        onClose={() => {
          setIsRPCSelectorOpen(false);
        }}
      />
      <footer style={{ textAlign: "center", padding: "1rem", fontSize: "0.9rem", color: "#B4A3A9" }}>
        Built by <a href="https://jumpdefi.xyz" target="_blank" rel="noopener noreferrer" style={{ color: "#AE6CC6", fontWeight: "bold", textDecoration: "none" }}>Trove Labs</a> for <a href="https://t.me/speedbuild" target="_blank" rel="noopener noreferrer" style={{ color: "#7070EE", fontWeight: "bold", textDecoration: "none" }}>SpeedBuild</a><br/>
        <a href="https://github.com/SpeedBuild/single-token-farm" target="_blank" rel="noopener noreferrer" style={{ background: "linear-gradient(90deg, #AE6CC6 0%, #7070EE 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "bold" }}>Fork me on GitHub</a>
      </footer>
    </Router>
  );
}

export default App;
