import { useEffect, useState } from "react";

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  Box,
  Flex,
  Input,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useRPC } from "@/stores/rpc-store";

interface DefaultRPCType {
  name: string;
  url: string;
  ping: number;
}

interface RPCSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const calculateRPCPing = async (rpcUrl: string) => {
  const start = performance.now();
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "ping",
        method: "health",
        params: [],
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    await response.json();
    const end = performance.now();
    return end - start;
  } catch (error) {
    console.error(`Error pinging ${rpcUrl}:`, error);
    return null;
  }
};

const fixDecimalPoints = (value: number) => {
  if (value) {
    return parseFloat(value.toFixed(2));
  } else {
    return 0;
  }
};

export const RPCSelector = ({ isOpen, onClose }: RPCSelectorProps) => {
  let initialPingSelected = false;

  const [customRPCName, setCustomRPCName] = useState<string>("");
  const [customRPCUrl, setCustomRPCUrl] = useState<string>("");
  const { rpcList, selectedRPC, addRPC, selectRPC, setDefaultRPCs } = useRPC();

  useEffect(() => {
    const pingEndpoints = async () => {
      if (!initialPingSelected) {
        let newRpcs: DefaultRPCType[] = [];
        for (const rpc of rpcList) {
          const ping = await calculateRPCPing(rpc.url);
          newRpcs.push({
            name: rpc.name,
            url: rpc.url,
            ping: fixDecimalPoints(ping!),
          });
        }
        setDefaultRPCs(newRpcs);

        initialPingSelected = true;
      }
    };
    pingEndpoints();
  }, [initialPingSelected]);

  const addCustomRPC = async () => {
    let exist = rpcList.filter((r) => r.url === customRPCUrl);
    if (exist.length) {
      toast.error("RPC already exist");
      return;
    }

    const ping = await calculateRPCPing(customRPCUrl);
    if (!ping) {
      toast.error("Rpc not available to connect, can not ping the rpc url.");
    } else {
      addRPC({
        name: customRPCName,
        url: customRPCUrl,
        ping: fixDecimalPoints(ping),
      });
      setCustomRPCName("");
      setCustomRPCUrl("");
      onClose();
    }
  };

  const rpcListRenderer = () => {
    return (
      <>
        {rpcList?.map(({ name, url, ping }, index) => (
          <Flex
            key={name}
            id={`${index + 1}`}
            bg="#47272d"
            borderRadius="xl"
            align="center"
            justify="space-between"
            mt={5}
            mb={5}
            as="button"
            width="full"
            pl={6}
            pr={6}
            className="relative"
            onClick={() => {
              // if (selectedRPC && selectedRPC.url !== url) {
              selectRPC({
                name,
                url,
                ping: ping,
              });
              // }
              onClose();
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }}
          >
            <Text py={2} fontSize={14} fontWeight="bold">
              {name}
            </Text>
            <Flex align="center" justifyContent="flex-end">
              <div
                style={{
                  width: "1em",
                  height: "1em",
                  background:
                    "radial-gradient(circle, rgb(174, 108, 198) 50%, rgb(112, 112, 238) 100%)",
                  mask: 'url("data:image/svg+xml;utf8,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%20stroke-width%3D%220%22%20viewBox%3D%220%200%20512%20512%22%20height%3D%221em%22%20width%3D%221em%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M256%208C119%208%208%20119%208%20256s111%20248%20248%20248%20248-111%20248-248S393%208%20256%208z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E") center center / contain no-repeat',
                }}
              />
              <Text ml={1} fontWeight="bold" color={"#a89d9e"}>
                {ping} ms
              </Text>
              {selectedRPC?.url === url ? (
                <div className="ml-2 rounded-full bg-green p-2 w-4 h-4 flex items-center justify-center">
                  <small className="text-xs">✓</small>
                </div>
              ) : (
                ""
              )}
            </Flex>
          </Flex>
        ))}
      </>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent backgroundColor="#4d3059" color="white" mt={40}>
        <ModalHeader pb={0}>RPC Selector</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box bg="#2B011A" mt={4} borderRadius="xl" p={4}>
            {rpcListRenderer()}
          </Box>
          <Box pl={3} fontSize={14} mt={4} fontWeight="bold">
            <Text m={1}>Network Name</Text>
            <Input
              borderRadius="xl"
              bg="#47272d"
              border="none"
              value={customRPCName}
              onChange={(e) => setCustomRPCName(e.target.value)}
            />
            <Text m={1} mt={4}>
              RPC Url
            </Text>
            <Input
              borderRadius="xl"
              bg="#47272d"
              border="none"
              value={customRPCUrl}
              onChange={(e) => setCustomRPCUrl(e.target.value)}
            />
            <Flex justifyContent="center" mt={4}>
              <Button
                bg="#71597a"
                h="44px"
                w="84px"
                borderRadius="xl"
                fontSize={16}
                fontWeight="medium"
                onClick={() => {
                  addCustomRPC();
                }}
              >
                Add
              </Button>
            </Flex>
          </Box>
        </ModalBody>
        <ModalFooter pb={0} />
      </ModalContent>
    </Modal>
  );
};
