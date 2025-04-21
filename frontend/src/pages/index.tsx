import { useState, useEffect } from "react";
import PageContainer from "@/components/PageContainer";
import { TopCard } from "@/components/shared/top-card";
import { useWalletSelector } from "@/context/wallet-selector";
import { Search } from "@/components/shared/search";
import { ErrorToast } from "@/components/shared/error-toast";
import { SuccessToast } from "@/components/shared/success-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import AllFarms from "@/components/modules/farms/AllFarms";
import CreateFarm from "@/components/modules/farms/CreateFarm";
import { getTxRec } from "@/tools/modules/transactions";
import toast from "react-hot-toast";
import { NEAR_BLOCK_URL } from "@/utils/account-ids";
import { initializeMetadataCache } from "@/utils/tokens";
import { Checkbox } from "@chakra-ui/react";

const Farms = () => {
  const { accountId } = useWalletSelector();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [showExpiredFarms, setShowExpiredFarms] = useState(false);

  initializeMetadataCache();

  useEffect(() => {
    const errorCode = searchParams.get("errorCode");

    if (errorCode) {
      toast.dismiss(); // Dismiss any existing toasts

      if (errorCode === "userRejected") {
        setTimeout(() => {
          toast.error("Transaction was canceled by the user.");
        }, 1000);
      } else {
        setTimeout(() => {
          toast.error("An error occurred. Please try again.");
        });
      }

      // Clear the URL after displaying the toast
      navigate(window.location.pathname, { replace: true });
    }
  }, []);

  const handleTransaction = async () => {
    const tx = searchParams.get("transactionHashes");
    if (tx) {
      // Split the transaction hashes into an array
      const txArray = tx.split(",");

      // Get the second transaction hash (index 1)
      const secondTx = txArray[1];

      // Check if the second transaction exists
      if (secondTx) {
        const link = `${NEAR_BLOCK_URL}/${secondTx}`;
        const isError = await getTxRec(secondTx, accountId!);
        toast.dismiss();
        setTimeout(() => {
          if (isError) {
            toast.custom(<ErrorToast link={link} />);
          } else {
            toast.custom(<SuccessToast link={link} />);
          }
        }, 1000);
      } else {
        // No second transaction hash found
      }
    } else {
      // No transaction hashes found in the URL
    }
  };

  useEffect(() => {
    if (accountId) {
      handleTransaction();
    }
  }, [accountId]);

  return (
    <PageContainer>
      <div className="mt-12" />
      <TopCard
        bigText="Deposit Tokens to Earn Token Rewards"
        bottomDescription="Use tokens received from staking tokens. Stake tokens to earn protocol rewards."
        gradientText="Steak Farms"
      />
      <div className="w-full h-auto relative">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-[14px] md:text-[20px] font-bold pb-1 border-b-4 border-violet">
            All Farms
          </div>

          <div className="w-full md:w-auto mt-4 md:mt-0 flex items-center justify-start gap-4">
            <button
              onClick={() => {
                if (!accountId) {
                  toast.error("Please connect wallet");
                  return;
                }
                setOpen(true);
              }}
              className="bg-[#CD7FF0] hover:bg-[#B15FD1] transition-colors duration-200 text-white font-bold text-sm py-3 px-6 rounded-sm whitespace-nowrap"
            >
              + Create Farm
            </button>

            <Checkbox 
              colorScheme="purple" 
              onChange={(e) => setShowExpiredFarms(e.target.checked)}
              isChecked={showExpiredFarms}
              size="lg"
              sx={{
                '.chakra-checkbox__control': {
                  width: '24px',
                  height: '24px',
                },
                '.chakra-checkbox__label': {
                  fontSize: '16px',
                  fontWeight: 'bold',
                }
              }}
            >
              Show expired
            </Checkbox>

            <Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Farms"
            />
          </div>
        </div>

        <AllFarms search={search} accountId={accountId} showExpiredFarms={showExpiredFarms} />
      </div>
      <div className="pb-16" />
      <CreateFarm open={open} setOpen={setOpen} />
    </PageContainer>
  );
};

export default Farms;
