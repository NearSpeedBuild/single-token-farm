import { Buffer } from "buffer";

import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { theme } from "./theme";
import "./index.css";
import App from "./app";
import { WalletSelectorContextProvider } from "./context/wallet-selector";
import { WalletSelectorModal } from "./modals/wallet-selector/modal";
import { RPCProvider } from "./stores/rpc-store";

// TODO: Find a better way to handle this buffer error
window.Buffer = window.Buffer || Buffer;
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ChakraProvider theme={theme}>
    <WalletSelectorContextProvider>
      <RPCProvider>
        <WalletSelectorModal />
        <App />
      </RPCProvider>
    </WalletSelectorContextProvider>
  </ChakraProvider>,
);
