import React, { useState, useEffect } from "react";
import {
  Flex,
  Input,
  Text,
  Box,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  InputGroup,
  InputLeftElement,
  Tabs,
  TabList,
  Tab,
} from "@chakra-ui/react";
import { IoSearch } from "react-icons/io5";
import { getTokenMetadata, useTokens } from "@/utils/tokens";
import { TokenMetadata } from "@/utils/tokens";
import Balance from "@/components/Balance";
import { useRPC } from "@/stores/rpc-store";
import TokenIcon from "../modules/farms/TokenIcon";

interface TokenListProp {
  open: boolean;
  setOpen: (o: boolean) => void;
  setSelectedToken: (token: TokenMetadata) => void;
  tokenToFilter?: TokenMetadata;
}

type TabType = "verified" | "active" | "all";

const TokenList = ({
  open,
  setOpen,
  setSelectedToken,
  tokenToFilter,
}: TokenListProp) => {
  const { account, provider } = useRPC();
  const { tokens } = useTokens();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredTokens, setFilteredTokens] = useState<TokenMetadata[]>([]);
  const [selectedTab, setSelectedTab] = useState<TabType>("verified");

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    (async function () {
      const allTokensMetadata = await Promise.all(
        tokens.map(async (token) => await getTokenMetadata(provider, token)),
      );

      let filtered = allTokensMetadata.filter(filterTokens);

      filtered = filtered.filter((token) => {
        switch (selectedTab) {
          case "verified":
            return (
              token.reputation === "NotFake" || token.reputation === "Reputable"
            );
          case "active":
            return token.volume_usd_24h ?? 0 > 1.0;
          default:
            return true;
        }
      });

      // Apply search filter if query exists
      if (query) {
        filtered = filtered.filter(
          (token) =>
            token.name.toLowerCase().includes(query) ||
            token.address.toLowerCase().includes(query) ||
            token.symbol.toLowerCase().includes(query),
        );
      }

      setFilteredTokens(filtered);
    })();
  }, [searchQuery, tokens, selectedTab]);

  const filterTokens = (t: TokenMetadata) => {
    if (!tokenToFilter) {
      return true;
    }
    if (tokenToFilter.isNear) {
      return t.address !== tokenToFilter.address || !t.isNear;
    }
    return t.address !== tokenToFilter.address || t.isNear;
  };

  return (
    <Modal isCentered isOpen={open} onClose={() => setOpen(false)}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select Token</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <InputGroup mb={4}>
            <InputLeftElement pointerEvents="none">
              <Icon as={IoSearch} color="gray.300" />
            </InputLeftElement>
            <Input
              type="text"
              placeholder="Search by name or paste address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          <Tabs
            onChange={(index) =>
              setSelectedTab(["verified", "active", "all"][index] as TabType)
            }
            mb={4}
          >
            <TabList>
              <Tab>Verified</Tab>
              <Tab>Active</Tab>
              <Tab>All</Tab>
            </TabList>
          </Tabs>

          <Box>
            {filteredTokens.map((token) => (
              <Flex
                key={token.address}
                alignItems="center"
                justifyContent="space-between"
                p={2}
                className="hover:bg-gray-600 cursor-pointer rounded-sm transition-colors duration-200"
                onClick={() => {
                  setSelectedToken(token);
                  setOpen(false);
                }}
              >
                <Flex alignItems="center" className="px-2">
                  <TokenIcon address={token.address} />
                  <Box className="pl-2">
                    <Text fontWeight="bold">{token.symbol}</Text>
                    <Text fontSize="sm">{token.name}</Text>
                    {token.price_usd && (
                      <Text fontSize="xs" color="gray.400">
                        ${parseFloat(token.price_usd).toFixed(4)}
                      </Text>
                    )}
                  </Box>
                </Flex>
                <Flex alignItems="center" className="pr-2">
                  {account && (
                    <Balance
                      token={token}
                      connectedAccount={account.accountId}
                    />
                  )}
                </Flex>
              </Flex>
            ))}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default TokenList;
