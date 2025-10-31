import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import IdentitySheet from "@/components/IdentitySheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWallet } from "@txnlab/use-wallet-react";
import { APP_SPEC as VNSRegistrySpec } from "@/clients/VNSRegistryClient";
import { APP_SPEC as VNSPublicResolverSpec } from "@/clients/VNSPublicResolverClient";
import { CONTRACT, abi } from "ulujs";
import { namehash, stringToUint8Array } from "@/utils/namehash";
import { stripTrailingZeroBytes } from "@/utils/string";
import {
  Unlock,
  Coins,
  Shield,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
  ArrowRight,
  Wallet,
  PawPrint,
  User,
  Loader2,
  Filter,
  Lock,
  X,
} from "lucide-react";
import {
  stakingContractService,
  FormattedStakingContract,
} from "@/services/stakingContractService";
import algosdk from "algosdk";

export default function ExitLab() {
  const { activeAccount, activeWallet, algodClient, signTransactions } =
    useWallet();
  const [showIdentitySheet, setShowIdentitySheet] = useState(false);
  const [enVOIName, setEnVOIName] = useState<string | null>(null);
  const [enVOIAvatar, setEnVOIAvatar] = useState<string>("");
  const navigate = useNavigate();

  // Helper function to get the best display name
  const getDisplayName = () => {
    if (enVOIName) return enVOIName;
    return `${activeAccount?.address.slice(
      0,
      6
    )}...${activeAccount?.address.slice(-4)}`;
  };

  // Resolve enVOI name
  useEffect(() => {
    if (!algodClient || !activeAccount) {
      setEnVOIName(null);
      setEnVOIAvatar("");
      return;
    }

    const resolveEnVOIName = async () => {
      try {
        const resolverAppId = 797608;
        const registryAppId = 797607;

        const resolver = new CONTRACT(
          resolverAppId,
          algodClient,
          undefined,
          { ...VNSPublicResolverSpec.contract, events: [] },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          }
        );

        const registry = new CONTRACT(
          registryAppId,
          algodClient,
          undefined,
          { ...VNSRegistrySpec.contract, events: [] },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(),
          }
        );

        const reverseAddressHash = await namehash(
          `${activeAccount.address}.addr.reverse`
        );
        const nameR = await resolver.name(reverseAddressHash);

        if (nameR.success) {
          const name = stripTrailingZeroBytes(nameR.returnValue);
          const nameHash = await namehash(name);
          const owner = await registry.ownerOf(nameHash);

          if (owner.success && owner.returnValue === activeAccount.address) {
            setEnVOIName(name);

            // Try to get avatar
            const avatarR = await resolver.text(
              nameHash,
              stringToUint8Array("avatar", 22)
            );
            if (avatarR.success) {
              setEnVOIAvatar(stripTrailingZeroBytes(avatarR.returnValue));
            }
          } else {
            setEnVOIName(null);
            setEnVOIAvatar("");
          }
        } else {
          setEnVOIName(null);
          setEnVOIAvatar("");
        }
      } catch (error) {
        console.log("No enVOI name found for this address");
        setEnVOIName(null);
        setEnVOIAvatar("");
      }
    };

    resolveEnVOIName();
  }, [algodClient, activeAccount?.address]);

  const [contracts, setContracts] = useState<FormattedStakingContract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "locked" | "vesting" | "ready"
  >("all");
  const [readyUnlocksPage, setReadyUnlocksPage] = useState(1);
  const [stakingContractsPage, setStakingContractsPage] = useState(1);
  const [showCloseAllModal, setShowCloseAllModal] = useState(false);
  const [contractBalances, setContractBalances] = useState<
    Record<string, { balance: number; loading: boolean; error?: string }>
  >({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const fetchingBalancesRef = useRef(false);
  const lastModalStateRef = useRef(false);
  const [isClosingAll, setIsClosingAll] = useState(false);
  const [closingProgress, setClosingProgress] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [closeAllSummary, setCloseAllSummary] = useState<{
    totalContracts: number;
    successfulChunks: number;
    failedChunks: number;
    successfulContracts: number;
    failedContracts: number;
  } | null>(null);

  const ITEMS_PER_PAGE = 5;
  const ITEMS_PER_PAGE_STAKING = 3;

  // Reset pagination when contracts change
  useEffect(() => {
    setReadyUnlocksPage(1);
    setStakingContractsPage(1);
  }, [contracts]);

  // Reset staking contracts pagination when filter changes
  useEffect(() => {
    setStakingContractsPage(1);
  }, [filterStatus]);

  // Ready contracts for modal and display (filtered to exclude 0 balance)
  const readyContractsUnfiltered = contracts.filter(
    (c) => c.status === "ready"
  );
  const readyContracts = readyContractsUnfiltered.filter((contract) => {
    const balanceInfo = contractBalances[contract.contractAddress];
    // Include if balance data not available yet, or if balance > 0
    if (!balanceInfo || balanceInfo.loading) {
      return true; // Include while loading so we can filter later
    }
    return balanceInfo.balance > 0;
  });

  // Fetch balances for all contracts automatically (API response may be outdated)
  useEffect(() => {
    if (contracts.length > 0 && algodClient && !fetchingBalancesRef.current) {
      // Check if we already have balance data for all contracts
      const allBalancesLoaded = contracts.every((contract) => {
        const balanceInfo = contractBalances[contract.contractAddress];
        return balanceInfo && !balanceInfo.loading;
      });

      // Only fetch if we don't have all balances loaded
      if (!allBalancesLoaded) {
        fetchingBalancesRef.current = true;

        const fetchContractBalances = async () => {
          const balances: Record<
            string,
            { balance: number; loading: boolean; error?: string }
          > = { ...contractBalances };

          // Identify contracts that need balance fetching
          const contractsToFetch = contracts.filter((contract) => {
            const existing = balances[contract.contractAddress];
            return !existing || existing.loading;
          });

          // Initialize missing contracts as loading
          contractsToFetch.forEach((contract) => {
            if (!balances[contract.contractAddress]) {
              balances[contract.contractAddress] = {
                balance: 0,
                loading: true,
              };
            }
          });
          setContractBalances(balances);

          // Fetch each contract's balance with timeout (only for missing ones)
          await Promise.allSettled(
            contractsToFetch.map(async (contract) => {
              try {
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("Request timeout")), 10000)
                );

                const accountInfoPromise = algodClient
                  .accountInformation(contract.contractAddress)
                  .do();
                const accountInfo = (await Promise.race([
                  accountInfoPromise,
                  timeoutPromise,
                ])) as any;

                const balanceMicro = accountInfo.amount || 0;
                const balanceVOI = balanceMicro / 1_000_000;

                balances[contract.contractAddress] = {
                  balance: balanceVOI,
                  loading: false,
                };
              } catch (error: any) {
                console.error(
                  `Error fetching balance for ${contract.contractAddress}:`,
                  error
                );
                balances[contract.contractAddress] = {
                  balance: 0,
                  loading: false,
                  error: error.message || "Failed to fetch balance",
                };
              }
            })
          );

          setContractBalances({ ...balances });
          fetchingBalancesRef.current = false;
        };

        fetchContractBalances();
      }
    }
  }, [contracts, algodClient]); // Fetch when contracts change

  // Update loading state for modal (balances are fetched automatically for all contracts)
  useEffect(() => {
    if (!showCloseAllModal) {
      lastModalStateRef.current = false;
      setLoadingBalances(false);
      return;
    }

    if (!lastModalStateRef.current) {
      lastModalStateRef.current = true;
    }

    // Check if ready contracts have balances loaded
    const readyContractsForCheck = contracts.filter(
      (c) => c.status === "ready"
    );

    if (readyContractsForCheck.length > 0) {
      // Check if any ready contracts are still loading
      const anyLoading = readyContractsForCheck.some((contract) => {
        const balanceInfo = contractBalances[contract.contractAddress];
        return !balanceInfo || balanceInfo.loading;
      });

      setLoadingBalances(anyLoading);
    } else {
      setLoadingBalances(false);
    }
  }, [showCloseAllModal, contracts, contractBalances]);

  // Fetch staking contracts when component mounts or owner changes
  useEffect(() => {
    const fetchContracts = async () => {
      // Only fetch if we have an active account
      if (!activeAccount?.address) {
        setContracts([]);
        return;
      }

      setIsLoadingContracts(true);

      try {
        // Use active account address in the API query
        const formattedContracts =
          await stakingContractService.getFormattedContractsForOwner(
            activeAccount.address
          );

        // Also fetch raw contracts for detailed inspection
        const rawContracts =
          await stakingContractService.fetchContractsForOwner(
            activeAccount.address
          );

        // Log formatted contracts for inspection
        console.group("📋 Staking Contracts - Formatted");
        console.log("Total Contracts:", formattedContracts.length);
        console.table(formattedContracts);
        console.log("Full Formatted Contracts Data:", formattedContracts);
        console.groupEnd();

        // Log raw contracts for detailed inspection
        console.group("🔍 Staking Contracts - Raw Data");
        console.log("Total Raw Contracts:", rawContracts.length);
        console.table(rawContracts);
        console.log("Full Raw Contracts Data:", rawContracts);
        console.groupEnd();

        // Log vesting calculations for each contract
        console.group("⏱️ Vesting Calculations");
        rawContracts.forEach((contract, index) => {
          const now = Date.now() / 1000; // Current time in seconds

          // Calculate each component separately for debugging
          const lockupDuration =
            contract.global_period_seconds * contract.global_lockup_delay;
          const distributionDuration =
            contract.global_distribution_count *
            contract.global_period *
            contract.global_distribution_seconds;
          const fullVestingTimeSeconds =
            contract.global_deadline + lockupDuration + distributionDuration;

          const secondsRemaining = Math.max(0, fullVestingTimeSeconds - now);
          const daysRemaining = Math.floor(secondsRemaining / (60 * 60 * 24));
          const canWithdrawLocal = secondsRemaining < 3600; // Less than 1 hour remaining

          console.log(`\nContract #${contract.contractId}:`);
          console.log("  Raw Values:");
          console.log("    - createRound:", contract.createRound);
          console.log(
            "    - global_deadline:",
            contract.global_deadline,
            contract.global_deadline > 1000000000
              ? "(likely Unix timestamp)"
              : contract.global_deadline === 0
              ? "(zero - might be from creation)"
              : "(small value - might be offset)"
          );
          console.log(
            "    - global_period_seconds:",
            contract.global_period_seconds
          );
          console.log(
            "    - global_lockup_delay:",
            contract.global_lockup_delay
          );
          console.log(
            "    - global_distribution_count:",
            contract.global_distribution_count
          );
          console.log("    - global_period:", contract.global_period);
          console.log(
            "    - global_distribution_seconds:",
            contract.global_distribution_seconds
          );

          console.log("\n  Calculation Components:");
          console.log(
            `    - Lockup: ${contract.global_period_seconds} * ${
              contract.global_lockup_delay
            } = ${lockupDuration} sec (${(lockupDuration / 86400).toFixed(
              2
            )} days)`
          );
          console.log(
            `    - Distribution: ${contract.global_distribution_count} * ${
              contract.global_period
            } * ${
              contract.global_distribution_seconds
            } = ${distributionDuration} sec (${(
              distributionDuration / 86400
            ).toFixed(2)} days)`
          );
          console.log(
            `    - Total Duration: ${
              lockupDuration + distributionDuration
            } sec (${((lockupDuration + distributionDuration) / 86400).toFixed(
              2
            )} days)`
          );
          console.log(
            `    - Formula Result: ${contract.global_deadline} + ${lockupDuration} + ${distributionDuration} = ${fullVestingTimeSeconds} seconds`
          );

          console.log("\n  Time Analysis:");
          console.log(
            `    - Base (global_deadline): ${contract.global_deadline} ${
              contract.global_deadline > 1000000000
                ? `(${new Date(contract.global_deadline * 1000).toISOString()})`
                : ""
            }`
          );
          console.log(
            `    - Full Vesting Time: ${fullVestingTimeSeconds} seconds`
          );
          if (fullVestingTimeSeconds > 1000000000) {
            console.log(
              `      Date: ${new Date(
                fullVestingTimeSeconds * 1000
              ).toISOString()}`
            );
          } else {
            console.log(`      ⚠️  Value too small to be a valid timestamp!`);
          }
          console.log(
            `    - Current Time: ${now} seconds (${new Date(
              now * 1000
            ).toISOString()})`
          );
          console.log(
            `    - Time Difference: ${(fullVestingTimeSeconds - now).toFixed(
              0
            )} seconds`
          );
          if (fullVestingTimeSeconds < now) {
            console.log(
              `      ⚠️  Vesting time is in the PAST! This contract should be ready to withdraw.`
            );
          } else if (fullVestingTimeSeconds - now < 3600) {
            console.log(
              `      ✓ Less than 1 hour remaining - contract is ready!`
            );
          }

          console.log("\n  Results:");
          console.log(`    - Seconds Remaining: ${secondsRemaining}`);
          console.log(`    - Days Remaining: ${daysRemaining}`);
          console.log(`    - Can Withdraw: ${canWithdrawLocal}`);
          console.log(
            `    - Status: ${secondsRemaining < 3600 ? "ready" : "vesting"}`
          );
        });
        console.groupEnd();

        setContracts(formattedContracts);
      } catch (error) {
        console.error("Error fetching staking contracts:", error);
        // Keep contracts as empty array on error
        setContracts([]);
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [activeAccount?.address]);

  // Filter out ready contracts with zero balance from overview stats
  const contractsForOverview = contracts.filter((contract) => {
    // If it's not a ready contract, include it
    if (contract.status !== "ready") {
      return true;
    }
    // If it's a ready contract, check balance
    const balanceInfo = contractBalances[contract.contractAddress];
    // Include if balance data not available yet, or if balance > 0
    if (!balanceInfo || balanceInfo.loading) {
      return true; // Include while loading
    }
    return balanceInfo.balance > 0;
  });

  const totalStaked = contractsForOverview.reduce((sum, contract) => {
    const balanceInfo = contractBalances[contract.contractAddress];
    const balance = balanceInfo?.balance || 0;
    return sum + balance;
  }, 0);

  const readyToWithdraw = contractsForOverview.filter(
    (c) => c.canWithdraw
  ).length;

  // Filter contracts based on selected status
  // Exclude ready contracts since they're shown in "Your Ready Unlocks" section
  const filteredContracts = contracts.filter((contract) => {
    // Always exclude ready contracts from this section
    if (contract.status === "ready") return false;

    if (filterStatus === "all") return true;
    return contract.status === filterStatus;
  });

  // Contracts excluding ready ones (for filter button counts)
  const contractsExcludingReady = contracts.filter((c) => c.status !== "ready");

  // Paginate staking contracts
  const stakingTotalPages = Math.ceil(
    filteredContracts.length / ITEMS_PER_PAGE_STAKING
  );
  const stakingStartIndex = (stakingContractsPage - 1) * ITEMS_PER_PAGE_STAKING;
  const stakingEndIndex = stakingStartIndex + ITEMS_PER_PAGE_STAKING;
  const paginatedFilteredContracts = filteredContracts.slice(
    stakingStartIndex,
    stakingEndIndex
  );

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (
      filteredContracts.length > 0 &&
      stakingContractsPage > stakingTotalPages
    ) {
      setStakingContractsPage(1);
    }
  }, [filteredContracts.length, stakingContractsPage, stakingTotalPages]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "vesting":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "locked":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="w-4 h-4" />;
      case "vesting":
        return <Clock className="w-4 h-4" />;
      case "locked":
        return <Lock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Helper function to get visible page numbers (max 5)
  const getVisiblePages = (
    currentPage: number,
    totalPages: number
  ): number[] => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // Adjust if we're near the end
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  // Handler for closing all ready contracts
  const handleCloseAll = async () => {
    // Get valid contracts (those without errors)
    const validContracts = readyContracts.filter((contract) => {
      const balanceInfo = contractBalances[contract.contractAddress];
      return balanceInfo && !balanceInfo.error && !balanceInfo.loading;
    });

    // Calculate combined balance
    const combinedBalance = validContracts.reduce((sum, contract) => {
      const balanceInfo = contractBalances[contract.contractAddress];
      return sum + (balanceInfo?.balance || 0);
    }, 0);

    // Only include service fee if combined balance >= 1000 VOI
    const includeServiceFee = combinedBalance >= 1000;

    // split validContracts into chunks of 10
    const chunkSize = 5;
    const chunks = validContracts.reduce((acc, contract, index) => {
      const chunkIndex = Math.floor(index / chunkSize);
      if (!acc[chunkIndex]) {
        acc[chunkIndex] = [];
      }
      acc[chunkIndex].push(contract);
      return acc;
    }, []);

    // Initialize progress tracking
    setIsClosingAll(true);
    setClosingProgress(0);
    setCurrentChunkIndex(0);
    setTotalChunks(chunks.length);

    // Track results
    let successfulChunks = 0;
    let failedChunks = 0;
    let successfulContracts = 0;
    let failedContracts = 0;
    const totalContracts = validContracts.length;

    try {
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        setCurrentChunkIndex(chunkIndex + 1);
        setClosingProgress(
          Math.round(((chunkIndex + 1) / chunks.length) * 100)
        );

        try {
          const buildN = [];
          let successContracts = 0;
          for (const contract of chunk) {
            const abi = {
              name: "staking",
              desc: "Staking contract",
              methods: [
                {
                  name: "close",
                  args: [],
                  readonly: false,
                  returns: {
                    type: "void",
                  },
                },
              ],
              events: [],
            };
            const ci = new CONTRACT(
              contract.contractId,
              algodClient,
              undefined,
              abi,
              {
                addr: activeAccount?.address,
                sk: new Uint8Array(),
              }
            );
            const builer = {
              staking: new CONTRACT(
                contract.contractId,
                algodClient,
                undefined,
                abi,
                {
                  addr: activeAccount?.address,
                  sk: new Uint8Array(),
                },
                true,
                false,
                true
              ),
            };
            {
              ci.setOnComplete(5);
              ci.setFee(3000);
              const closeR = await ci.close();
              console.log("closeR", closeR);
              if (!closeR.success) {
                continue;
              }
              const txnO = (await builer.staking.close())?.obj;
              successContracts++;
              buildN.push({
                ...txnO,
                onComplete: 5,
                note: new TextEncoder().encode(
                  `Close contract ${contract.contractId}`
                ),
              });
            }
          }
          console.log("buildN", buildN);
          const ci = new CONTRACT(
            chunk[0].contractId,
            algodClient,
            undefined,
            abi.custom,
            {
              addr: activeAccount?.address,
              sk: new Uint8Array(),
            }
          );
          if (buildN.length === 0) {
            failedChunks++;
            failedContracts += chunk.length;
            continue;
          }
          // Only set transfers (service fee) if combined balance >= 1000 VOI
          if (includeServiceFee && successContracts > 0) {
            ci.setTransfers([
              [
                100e6 * successContracts,
                "IDY5IIRYF75FFXGA7K4TS2YZFQSKW7PVJ4PTEKVV2IHA7CG56HDJ3HA2UY",
              ],
            ]);
          }
          ci.setFee(3000);
          ci.setExtraTxns(buildN);
          ci.setEnableGroupResourceSharing(true);
          const customR = await ci.custom();

          console.log("customR", customR);

          if (!customR.success) {
            failedChunks++;
            failedContracts += chunk.length;
            continue;
          }

          const stxns = await signTransactions(
            customR.txns.map((txn: string) => {
              const binaryString = atob(txn);
              return new Uint8Array(
                binaryString.split("").map((c) => c.charCodeAt(0))
              );
            })
          );

          await algodClient.sendRawTransaction(stxns).do();

          successfulChunks++;
          successfulContracts += chunk.length;
        } catch (chunkError) {
          console.error(
            `Error processing chunk ${chunkIndex + 1}:`,
            chunkError
          );
          failedChunks++;
          failedContracts += chunk.length;
        }
      }

      setClosingProgress(100);

      // Set summary and show success modal
      setCloseAllSummary({
        totalContracts,
        successfulChunks,
        failedChunks,
        successfulContracts,
        failedContracts,
      });
      setShowCloseAllModal(false);
      setIsClosingAll(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error closing contracts:", error);
      // Set summary even on error to show what was processed
      setCloseAllSummary({
        totalContracts,
        successfulChunks,
        failedChunks,
        successfulContracts,
        failedContracts,
      });
      setShowCloseAllModal(false);
      setIsClosingAll(false);
      setShowSuccessModal(true);
    } finally {
      // Reset progress after a short delay
      setTimeout(() => {
        setClosingProgress(0);
        setCurrentChunkIndex(0);
        setTotalChunks(0);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <PawPrint className="w-6 h-6 text-[#1EAEDB]" />
                <h1 className="text-2xl font-bold text-[#1EAEDB]">ExitLab</h1>
              </div>
              <div className="hidden md:block h-6 w-px bg-gray-600"></div>
              <Button
                variant="ghost"
                onClick={() => navigate("/staking")}
                className="hidden md:flex text-gray-400 hover:text-white"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Staking Contracts
              </Button>
            </div>
            <div className="flex items-center gap-4">
              {activeAccount ? (
                <div className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2">
                  <Avatar className="w-8 h-8">
                    {enVOIAvatar && (
                      <AvatarImage
                        src={enVOIAvatar}
                        alt={enVOIName || "enVOI avatar"}
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-teal-400 to-violet-400 text-sm">
                      {getDisplayName().slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-base font-medium text-white">
                    {getDisplayName()}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="neon-glow-teal h-7 px-3 text-sm"
                    onClick={() => setShowIdentitySheet(true)}
                  >
                    <User className="w-4 h-4 mr-1.5" />
                    Identity
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="neon-glow-teal h-7 px-3 text-sm"
                  onClick={() => setShowIdentitySheet(true)}
                >
                  <User className="w-4 h-4 mr-1.5" />
                  Identity
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#1EAEDB] to-[#00eeff] bg-clip-text text-transparent">
            ExitLab Portal
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Your laboratory for exiting staking positions and recovering vested
            funds from VOI incentivized testnet and grant funding. Close out
            contracts and withdraw your rewards with precision.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-[#1EAEDB] mb-2">
                  {contractsForOverview.length}
                </div>
                <div className="text-gray-400">Active Contracts</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {readyToWithdraw}
                </div>
                <div className="text-gray-400">Ready to Withdraw</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {totalStaked.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-gray-400">Total Staked (VOI)</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Unlock Schedule Visualization */}
        {(() => {
          // Get contracts with future unlock dates (excluding ready ones)
          const futureContracts = contractsForOverview
            .filter((c) => c.status !== "ready" && c.vestedDate !== "N/A")
            .map((contract) => {
              const vestedDate = new Date(contract.vestedDate);
              const balanceInfo = contractBalances[contract.contractAddress];
              const balance = balanceInfo?.balance || 0;
              return {
                ...contract,
                vestedDateObj: vestedDate,
                balance,
              };
            })
            .sort(
              (a, b) => a.vestedDateObj.getTime() - b.vestedDateObj.getTime()
            )
            .slice(0, 10); // Show next 10 unlocks

          if (futureContracts.length === 0) return null;

          const now = new Date();
          const maxDate =
            futureContracts[futureContracts.length - 1].vestedDateObj;
          const minDate = Math.min(
            now.getTime(),
            futureContracts[0].vestedDateObj.getTime()
          );
          const dateRange = maxDate.getTime() - minDate;
          const totalBalance = futureContracts.reduce(
            (sum, c) => sum + c.balance,
            0
          );

          return (
            <div className="mb-12">
              <h3 className="text-2xl font-bold flex items-center gap-2 mb-6">
                <Clock className="w-6 h-6 text-[#1EAEDB]" />
                Unlock Schedule
              </h3>
              <Card className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border-gray-700">
                <CardContent className="p-8">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-[#1EAEDB]/50 via-[#00eeff]/50 to-[#1EAEDB]/50 rounded-full top-8"></div>

                    {/* Timeline markers */}
                    <div className="relative min-h-[120px]">
                      {futureContracts.map((contract, index) => {
                        const position =
                          dateRange > 0
                            ? ((contract.vestedDateObj.getTime() - minDate) /
                                dateRange) *
                              100
                            : 0;
                        const isPast =
                          contract.vestedDateObj.getTime() < now.getTime();
                        const daysUntil = Math.ceil(
                          (contract.vestedDateObj.getTime() - now.getTime()) /
                            (1000 * 60 * 60 * 24)
                        );

                        return (
                          <div
                            key={contract.id}
                            className="absolute flex flex-col items-center"
                            style={{
                              left: `${Math.max(2, Math.min(98, position))}%`,
                              transform: "translateX(-50%)",
                            }}
                          >
                            {/* Marker with expanded hover area */}
                            <div className="relative group">
                              {/* Expanded invisible hover area to prevent blinking */}
                              <div className="absolute -inset-6 z-10 cursor-pointer"></div>
                              <div
                                className={`relative w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                                  isPast
                                    ? "bg-green-400 border-green-400 shadow-lg shadow-green-400/50"
                                    : contract.status === "vesting"
                                    ? "bg-yellow-400 border-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse"
                                    : "bg-blue-400 border-blue-400 shadow-lg shadow-blue-400/50"
                                }`}
                              >
                              </div>
                              {/* Tooltip - positioned above marker */}
                              <div
                                className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 rounded-lg px-3 py-2 border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none whitespace-nowrap shadow-xl`}
                              >
                                <div className="text-xs font-semibold text-white mb-1">
                                  {contract.name}
                                </div>
                                <div className="text-xs text-gray-300">
                                  {contract.vestedDateObj.toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )}
                                </div>
                                <div className="text-xs text-green-400 mt-1">
                                  {contract.balance.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  VOI
                                </div>
                                {/* Tooltip arrow pointing down */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-r border-b border-gray-700 rotate-45"></div>
                              </div>
                            </div>

                            {/* Date label */}
                            <div className="mt-6 text-center">
                              <div
                                className={`text-xs font-semibold ${
                                  isPast
                                    ? "text-green-400"
                                    : contract.status === "vesting"
                                    ? "text-yellow-400"
                                    : "text-blue-400"
                                }`}
                              >
                                {contract.vestedDateObj.toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </div>
                              {!isPast && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {daysUntil > 0 ? `${daysUntil}d` : "Today"}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary */}
                    <div className="mt-12 pt-6 border-t border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-400">
                            Total Scheduled
                          </div>
                          <div className="text-lg font-semibold text-white mt-1">
                            {futureContracts.length} unlock
                            {futureContracts.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-400">
                            Total Amount
                          </div>
                          <div className="text-lg font-semibold text-[#1EAEDB] mt-1">
                            {totalBalance.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                              minimumFractionDigits: 2,
                            })}{" "}
                            VOI
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-400">
                            Next Unlock
                          </div>
                          <div className="text-lg font-semibold text-green-400 mt-1">
                            {futureContracts[0].vestedDateObj.toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Ready Unlocks Section */}
        {(() => {
          const totalPages = Math.ceil(readyContracts.length / ITEMS_PER_PAGE);
          const startIndex = (readyUnlocksPage - 1) * ITEMS_PER_PAGE;
          const endIndex = startIndex + ITEMS_PER_PAGE;
          const paginatedContracts = readyContracts.slice(startIndex, endIndex);

          // Reset to page 1 if current page is out of bounds
          if (readyContracts.length > 0 && readyUnlocksPage > totalPages) {
            setReadyUnlocksPage(1);
          }

          return (
            readyContracts.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Unlock className="w-6 h-6 text-green-400" />
                    Your Ready Unlocks ({readyContracts.length})
                  </h3>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setShowCloseAllModal(true)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Close All
                  </Button>
                </div>

                <Card className="bg-gradient-to-r from-green-900/30 to-green-800/20 border-green-500/50">
                  <CardContent className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-green-500/30">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-green-400">
                              Contract
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-green-400">
                              Staked Amount
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-green-400">
                              Vested Date
                            </th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-green-400">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedContracts.map((contract) => (
                            <tr
                              key={contract.id}
                              className="border-b border-green-500/10 hover:bg-green-500/5 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-white">
                                    {contract.name}
                                  </span>
                                  <span className="text-xs text-gray-400 mt-1 font-mono">
                                    {contract.contractAddress.slice(0, 8)}...
                                    {contract.contractAddress.slice(-6)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="font-semibold">
                                  {(() => {
                                    const balanceInfo =
                                      contractBalances[
                                        contract.contractAddress
                                      ];
                                    if (!balanceInfo || balanceInfo.loading) {
                                      return (
                                        <span className="text-gray-500">
                                          Loading...
                                        </span>
                                      );
                                    }
                                    const balance = balanceInfo.balance || 0;
                                    return (
                                      balance.toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                        minimumFractionDigits: 2,
                                      }) + " VOI"
                                    );
                                  })()}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-[#1EAEDB]">
                                  {contract.vestedDate !== "N/A"
                                    ? new Date(
                                        contract.vestedDate
                                      ).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "N/A"}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      navigator.clipboard.writeText(
                                        contract.contractAddress
                                      )
                                    }
                                    className="h-8 w-8 p-0 hover:bg-green-500/20"
                                    title="Copy Address"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      window.open(
                                        `https://voiager.xyz/account/${contract.contractAddress}`,
                                        "_blank"
                                      )
                                    }
                                    className="h-8 w-8 p-0 hover:bg-green-500/20"
                                    title="View Contract"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-green-500/20">
                        <div className="text-sm text-gray-400">
                          Showing {startIndex + 1} to{" "}
                          {Math.min(endIndex, readyContracts.length)} of{" "}
                          {readyContracts.length} contracts
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReadyUnlocksPage((prev) =>
                                Math.max(1, prev - 1)
                              )
                            }
                            disabled={readyUnlocksPage === 1}
                            className="border-green-500/50 hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {getVisiblePages(readyUnlocksPage, totalPages).map(
                              (page) => (
                                <Button
                                  key={page}
                                  variant={
                                    readyUnlocksPage === page
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setReadyUnlocksPage(page)}
                                  className={
                                    readyUnlocksPage === page
                                      ? "bg-green-600 hover:bg-green-700 text-white"
                                      : "border-green-500/50 hover:bg-green-500/10"
                                  }
                                >
                                  {page}
                                </Button>
                              )
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReadyUnlocksPage((prev) =>
                                Math.min(totalPages, prev + 1)
                              )
                            }
                            disabled={readyUnlocksPage === totalPages}
                            className="border-green-500/50 hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          );
        })()}

        {/* Contract Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#1EAEDB]" />
              Your Staking Contracts
            </h3>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
                className={
                  filterStatus === "all"
                    ? "bg-[#1EAEDB] hover:bg-[#00eeff] text-black"
                    : ""
                }
              >
                <Filter className="w-4 h-4 mr-2" />
                All ({contractsExcludingReady.length})
              </Button>
              <Button
                variant={filterStatus === "locked" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("locked")}
                className={
                  filterStatus === "locked"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : ""
                }
              >
                <Lock className="w-4 h-4 mr-2" />
                Locked ({contracts.filter((c) => c.status === "locked").length})
              </Button>
              <Button
                variant={filterStatus === "vesting" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("vesting")}
                className={
                  filterStatus === "vesting"
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : ""
                }
              >
                <Clock className="w-4 h-4 mr-2" />
                Vesting (
                {contracts.filter((c) => c.status === "vesting").length})
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingContracts && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#1EAEDB] animate-spin" />
              <span className="ml-3 text-lg text-gray-400">
                Loading staking contracts...
              </span>
            </div>
          )}

          <div className="grid gap-6">
            {!isLoadingContracts &&
              paginatedFilteredContracts.map((contract) => (
                <Card
                  key={contract.id}
                  className="bg-gray-900/50 border-gray-800 hover:border-[#1EAEDB]/50 transition-colors"
                >
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl">
                          {contract.name}
                        </CardTitle>
                        <CardDescription className="text-gray-400 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                          <span className="whitespace-nowrap">
                            {contract.network}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-mono text-xs sm:text-sm truncate">
                            <span className="hidden sm:inline">
                              {contract.contractAddress}
                            </span>
                            <span className="sm:hidden">
                              {contract.contractAddress.slice(0, 8)}...
                              {contract.contractAddress.slice(-6)}
                            </span>
                          </span>
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(contract.status)}>
                        {getStatusIcon(contract.status)}
                        <span className="ml-2 capitalize">
                          {contract.status}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-400">
                          Staked Amount
                        </div>
                        <div className="font-semibold text-sm sm:text-base">
                          {(() => {
                            const balanceInfo =
                              contractBalances[contract.contractAddress];
                            if (!balanceInfo || balanceInfo.loading) {
                              return (
                                <span className="text-gray-500">
                                  Loading...
                                </span>
                              );
                            }
                            const balance = balanceInfo.balance || 0;
                            return (
                              balance.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                                minimumFractionDigits: 2,
                              }) + " VOI"
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">
                          Vesting Period
                        </div>
                        <div className="font-semibold text-sm sm:text-base">
                          {contract.vestingPeriod}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">
                          Days Remaining
                        </div>
                        <div className="font-semibold text-sm sm:text-base">
                          {contract.daysRemaining}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Vested Date</div>
                        <div className="font-semibold text-[#1EAEDB] text-sm sm:text-base">
                          {contract.vestedDate !== "N/A"
                            ? new Date(contract.vestedDate).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )
                            : "N/A"}
                        </div>
                      </div>
                    </div>

                    {(contract.status === "vesting" ||
                      contract.status === "locked") &&
                      contract.vestingDays > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span>
                              {contract.status === "locked"
                                ? "Lockup Progress"
                                : "Vesting Progress"}
                            </span>
                            <span>
                              {Math.round(
                                ((contract.vestingDays -
                                  contract.daysRemaining) /
                                  contract.vestingDays) *
                                  100
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={
                              ((contract.vestingDays - contract.daysRemaining) /
                                contract.vestingDays) *
                              100
                            }
                            className="h-2"
                          />
                        </div>
                      )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              contract.contractAddress
                            )
                          }
                          className="flex-1 sm:flex-initial"
                        >
                          <Copy className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Copy Address</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `https://voiager.xyz/account/${contract.contractAddress}`,
                              "_blank"
                            )
                          }
                          className="flex-1 sm:flex-initial"
                        >
                          <ExternalLink className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">
                            View Contract
                          </span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {!isLoadingContracts &&
              filteredContracts.length === 0 &&
              contracts.length > 0 && (
                <div className="text-center py-12">
                  <Filter className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No contracts match this filter
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Try selecting a different filter to see your contracts
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setFilterStatus("all")}
                    className="mt-4"
                  >
                    Show All Contracts
                  </Button>
                </div>
              )}

            {!isLoadingContracts && contracts.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  No staking contracts found
                </h3>
                <p className="text-gray-500 mb-4">
                  {!activeAccount
                    ? "Connect your wallet to see your staking contracts"
                    : "You don't have any staking contracts yet"}
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls for Staking Contracts */}
          {!isLoadingContracts &&
            filteredContracts.length > ITEMS_PER_PAGE_STAKING && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                <div className="text-sm text-gray-400">
                  Showing {stakingStartIndex + 1} to{" "}
                  {Math.min(stakingEndIndex, filteredContracts.length)} of{" "}
                  {filteredContracts.length} contracts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setStakingContractsPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={stakingContractsPage === 1}
                    className="border-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {getVisiblePages(
                      stakingContractsPage,
                      stakingTotalPages
                    ).map((page) => (
                      <Button
                        key={page}
                        variant={
                          stakingContractsPage === page ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setStakingContractsPage(page)}
                        className={
                          stakingContractsPage === page
                            ? "bg-[#1EAEDB] hover:bg-[#00eeff] text-black"
                            : "border-gray-700 hover:bg-gray-800"
                        }
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setStakingContractsPage((prev) =>
                        Math.min(stakingTotalPages, prev + 1)
                      )
                    }
                    disabled={stakingContractsPage === stakingTotalPages}
                    className="border-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
        </div>

        {/* Action Buttons */}
        {/*<div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/staking")}
              className="bg-[#1EAEDB] hover:bg-[#00eeff] text-black font-semibold"
            >
              <Unlock className="w-5 h-5 mr-2" />
              Manage Staking Contracts
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/recovery")}
              className="border-[#1EAEDB] text-[#1EAEDB] hover:bg-[#1EAEDB] hover:text-black"
            >
              <Coins className="w-5 h-5 mr-2" />
              Fund Recovery Center
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>*/}
      </div>

      {/* Identity Sheet */}
      <IdentitySheet
        isOpen={showIdentitySheet}
        onOpenChange={setShowIdentitySheet}
      />

      {/* Close All Modal */}
      <Dialog
        open={showCloseAllModal}
        onOpenChange={(open) => {
          if (!isClosingAll) {
            setShowCloseAllModal(open);
          }
        }}
      >
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <X className="w-6 h-6 text-green-400" />
              Close All Ready Contracts
            </DialogTitle>
            <DialogDescription className="text-gray-400 pt-2">
              {(() => {
                const validContracts = loadingBalances
                  ? readyContracts
                  : readyContracts.filter((contract) => {
                      const balanceInfo =
                        contractBalances[contract.contractAddress];
                      return (
                        balanceInfo &&
                        !balanceInfo.error &&
                        !balanceInfo.loading
                      );
                    });
                const count = validContracts.length;
                return `You are about to close ${count} ready contract${
                  count !== 1 ? "s" : ""
                }. This will navigate you to the Fund Recovery Center where you can complete the closing process.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {(() => {
              const validContracts = loadingBalances
                ? readyContracts
                : readyContracts.filter((contract) => {
                    const balanceInfo =
                      contractBalances[contract.contractAddress];
                    return (
                      balanceInfo && !balanceInfo.error && !balanceInfo.loading
                    );
                  });
              const count = validContracts.length;

              // Calculate combined balance
              const combinedBalance = !loadingBalances
                ? validContracts.reduce((sum, contract) => {
                    const balanceInfo =
                      contractBalances[contract.contractAddress];
                    return sum + (balanceInfo?.balance || 0);
                  }, 0)
                : 0;

              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">
                        Ready to close:
                      </div>
                      <div className="text-lg font-semibold text-green-400">
                        {count} contract{count !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">
                        Combined Balance:
                      </div>
                      <div className="text-lg font-semibold text-green-400">
                        {loadingBalances ? (
                          <Loader2 className="w-4 h-4 inline animate-spin" />
                        ) : (
                          `${combinedBalance.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })} VOI`
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Service Fee - Only show if combined balance >= 1000 VOI */}
                  {combinedBalance >= 1000 && (
                    <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">
                            Service Fee:
                          </div>
                          <div className="text-xs text-gray-500">
                            {count} contract{count !== 1 ? "s" : ""} × 100 VOI per
                            contract
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-semibold text-blue-400">
                            {(count * 100).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{" "}
                            VOI
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contract Balances */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {loadingBalances ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-green-400 animate-spin mr-2" />
                        <span className="text-gray-400">
                          Loading contract balances...
                        </span>
                      </div>
                    ) : validContracts.length === 0 ? (
                      <div className="flex items-center justify-center py-4 text-gray-400">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        <span>No contracts available to close</span>
                      </div>
                    ) : (
                      validContracts.map((contract) => {
                        const balanceInfo =
                          contractBalances[contract.contractAddress];
                        const balance = balanceInfo?.balance || 0;

                        return (
                          <div
                            key={contract.id}
                            className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white truncate">
                                  {contract.name}
                                </div>
                                <div className="text-xs text-gray-400 font-mono truncate mt-1">
                                  {contract.contractAddress.slice(0, 8)}...
                                  {contract.contractAddress.slice(-6)}
                                </div>
                              </div>
                              <div className="ml-4 text-right">
                                <div>
                                  <div className="text-sm font-semibold text-green-400">
                                    {balance.toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    VOI
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Balance
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}

            {/* Progress Indicator */}
            {isClosingAll && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Processing chunk {currentChunkIndex} of {totalChunks}
                  </span>
                  <span className="text-green-400 font-semibold">
                    {closingProgress}%
                  </span>
                </div>
                <Progress value={closingProgress} className="h-2" />
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Closing contracts... Please do not close this window.
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCloseAllModal(false)}
                className="border-gray-700 hover:bg-gray-800"
                disabled={isClosingAll}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  isClosingAll ||
                  (!loadingBalances &&
                    (() => {
                      const validContracts = readyContracts.filter(
                        (contract) => {
                          const balanceInfo =
                            contractBalances[contract.contractAddress];
                          return (
                            balanceInfo &&
                            !balanceInfo.error &&
                            !balanceInfo.loading
                          );
                        }
                      );
                      return validContracts.length === 0;
                    })())
                }
                onClick={handleCloseAll}
              >
                {isClosingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Closing...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Close All
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {closeAllSummary && closeAllSummary.failedContracts === 0 ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  All Contracts Closed Successfully
                </>
              ) : (
                <>
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  Close All Operation Complete
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400 pt-2">
              {closeAllSummary && closeAllSummary.failedContracts === 0
                ? "All contracts have been successfully closed."
                : "The close all operation has completed. Review the summary below."}
            </DialogDescription>
          </DialogHeader>

          {closeAllSummary && (
            <div className="mt-4 space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                  <div className="text-sm text-gray-400 mb-2">
                    Total Contracts
                  </div>
                  <div className="text-2xl font-semibold text-white">
                    {closeAllSummary.totalContracts}
                  </div>
                </div>
                <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/30">
                  <div className="text-sm text-gray-400 mb-2">
                    Successfully Closed
                  </div>
                  <div className="text-2xl font-semibold text-green-400">
                    {closeAllSummary.successfulContracts}
                  </div>
                </div>
                {closeAllSummary.failedContracts > 0 && (
                  <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-500/30">
                    <div className="text-sm text-gray-400 mb-2">
                      Failed Closures
                    </div>
                    <div className="text-2xl font-semibold text-yellow-400">
                      {closeAllSummary.failedContracts}
                    </div>
                  </div>
                )}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                  <div className="text-sm text-gray-400 mb-2">
                    Total Chunks Processed
                  </div>
                  <div className="text-2xl font-semibold text-white">
                    {closeAllSummary.successfulChunks +
                      closeAllSummary.failedChunks}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <div className="text-sm font-semibold text-gray-300 mb-3">
                  Breakdown
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Successful Chunks:</span>
                    <span className="text-green-400 font-semibold">
                      {closeAllSummary.successfulChunks}
                    </span>
                  </div>
                  {closeAllSummary.failedChunks > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Failed Chunks:</span>
                      <span className="text-yellow-400 font-semibold">
                        {closeAllSummary.failedChunks}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                    <span className="text-gray-400">Success Rate:</span>
                    <span
                      className={`font-semibold ${
                        closeAllSummary.successfulContracts ===
                        closeAllSummary.totalContracts
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {Math.round(
                        (closeAllSummary.successfulContracts /
                          closeAllSummary.totalContracts) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {closeAllSummary.failedContracts > 0 && (
                <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-yellow-400 mb-1">
                        Some contracts could not be closed
                      </div>
                      <div className="text-xs text-gray-400">
                        {closeAllSummary.failedContracts} contract
                        {closeAllSummary.failedContracts !== 1 ? "s" : ""}{" "}
                        failed to close. You may need to close them individually
                        or check for any issues.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setShowSuccessModal(false);
                // Refresh contracts data
                if (activeAccount?.address) {
                  window.location.reload();
                }
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
