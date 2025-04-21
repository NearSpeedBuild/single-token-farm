import { Fragment } from "react";
import { WalletIcon } from "@/assets/svg/wallet";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useWalletSelector } from "@/context/wallet-selector";
import { Square2StackIcon } from "@heroicons/react/24/outline";
import { LogoutIcon } from "@/assets/svg/logout";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";

const shortenAddress = (address: string, chars = 16): string => {
  if (!address) {
    return "";
  }
  if (address.length <= chars * 2) {
    return address;
  }

  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const Wallet = () => {
  const { accountId, toggleModal, signOut } = useWalletSelector();

  if (!accountId) {
    return (
      <button
        onClick={async () => {
          let tokens = localStorage.getItem("tokens");

          if (!tokens) {
            tokens = JSON.stringify([]);
            localStorage.setItem("tokens", tokens);
          }

          toggleModal();
        }}
        className="bg-[#894DA0] hover:bg-[#7B1FA2] transition-all duration-200 text-white font-semibold text-sm py-2.5 px-4 rounded-lg shadow-[0px_4px_12px_rgba(139,77,160,0.25)] hover:shadow-[0px_4px_16px_rgba(139,77,160,0.35)] flex items-center gap-x-2"
      >
        <WalletIcon className="h-5 w-5" />
        Connect Wallet
      </button>
    );
  }

  return (
    <Menu as="div" className="relative text-left inline-block">
      <Menu.Button as="div">
        <button className="bg-[#5F456A] hover:bg-[#4D3059] transition-all duration-200 text-white font-semibold text-sm py-2.5 px-4 rounded-lg shadow-[0px_4px_12px_rgba(95,69,106,0.25)] hover:shadow-[0px_4px_16px_rgba(95,69,106,0.35)] flex items-center gap-x-2">
          <span className="text-white">{shortenAddress(accountId)}</span>
          <ChevronDownIcon className="w-5 h-5 text-white opacity-80" />
        </button>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          as="div"
          className="absolute right-0 mt-2 w-[300px] origin-top-right rounded-xl bg-[#5F456A] shadow-[0px_8px_30px_rgba(0,0,0,0.25)] focus:outline-none overflow-hidden"
        >
          <div className="p-4 space-y-4">
            <CopyToClipboard
              text={accountId}
              onCopy={() => toast.success("Address copied to clipboard")}
            >
              <button className="w-full flex items-center justify-between px-4 py-3 bg-[#4D3059] hover:bg-[#3B2347] transition-colors duration-200 rounded-lg text-white">
                <span className="font-medium">{shortenAddress(accountId)}</span>
                <Square2StackIcon className="w-5 h-5 text-white opacity-70" />
              </button>
            </CopyToClipboard>
          </div>

          <div className="border-t border-[#ffffff1a]">
            <button
              onClick={async () => {
                await signOut();
                let tokens = localStorage.getItem("tokens");
                let rpc = localStorage.getItem("selectedRPC");

                localStorage.clear();
                localStorage.setItem("tokens", tokens!);
                localStorage.setItem("selectedRPC", rpc!);
                await new Promise((resolve) => setTimeout(resolve, 700));
                window.location.reload();
              }}
              className="w-full flex items-center gap-x-2 px-4 py-3 text-[#FF5C5C] hover:bg-[#4D3059] transition-colors duration-200"
            >
              <LogoutIcon />
              <span className="font-medium">Disconnect</span>
            </button>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
