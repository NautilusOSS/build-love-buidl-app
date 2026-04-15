import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import IdentitySheet from "@/components/IdentitySheet";
import {
  Wallet,
  DollarSign,
  Calendar,
  Clock,
  User,
  Search,
  Check,
  Lock,
  FileText,
  X,
  BarChart3,
  Copy,
  LayoutTemplate,
  Circle,
} from "lucide-react";
import algosdk from "algosdk";
import networks from "@/config/networks";
import { CONTRACT, abi } from "ulujs";
import BigNumber from "bignumber.js";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { APP_SPEC as compensationFactoryAppSpec } from "@/clients/CompensationFactoryClient";
import { upsertGrant } from "@/lib/grantStorage";
import { projectFactoryClaimMilestones } from "@/lib/airdropVesting";

interface EnVOIResult {
  name: string;
  address: string | null;
  metadata: {
    avatar?: string;
    url?: string;
    [key: string]: any;
  };
}

const GrantPay = () => {
  /** Factory schedule caps: lockup/cliff 0–12 mo, vesting 0–60 mo (`docs/APP.md`). Use literals below to avoid bundler/HMR scope bugs. */
  function validateScheduleMonths(raw: string, max: number): string | null {
    const t = raw.trim();
    if (t === "") return `Enter months (0–${max})`;
    const n = parseInt(t, 10);
    if (Number.isNaN(n)) return "Enter a whole number";
    if (n < 0 || n > max) return `Must be between 0 and ${max} months`;
    return null;
  }

  function formatDatetimeLocalValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function validateFundingDeadline(raw: string): string | null {
    const t = raw.trim();
    if (t === "") return "Choose a start of funding";
    const ms = new Date(t).getTime();
    if (Number.isNaN(ms)) return "Invalid date";
    return null;
  }

  const { activeAccount, algodClient, signTransactions } = useWallet();
  const [showIdentitySheet, setShowIdentitySheet] = useState(false);
  const [address, setAddress] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [amount, setAmount] = useState("");
  const [lockupMonths, setLockupMonths] = useState("12");
  const [vestingMonths, setVestingMonths] = useState("");
  const [note, setNote] = useState("");
  const [searchResults, setSearchResults] = useState<EnVOIResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [amountError, setAmountError] = useState<string>("");
  const [lockupError, setLockupError] = useState("");
  const [vestingError, setVestingError] = useState("");
  const [fundingDeadlineLocal, setFundingDeadlineLocal] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    d.setHours(23, 59, 0, 0);
    return formatDatetimeLocalValue(d);
  });
  const [fundingDeadlineError, setFundingDeadlineError] = useState("");
  const [recentRecipients, setRecentRecipients] = useState<string[]>([]);
  const [incentiveNotes, setIncentiveNotes] = useState<
    Array<{ note: string; prefix: string | null; transaction: any }>
  >([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTimeMs, setPreviewTimeMs] = useState(() => Date.now());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAppId, setCreatedAppId] = useState<number | null>(null);

  const fundingStartInputRef = useRef<HTMLInputElement>(null);

  const openFundingStartPicker = () => {
    const el = fundingStartInputRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  };

  useEffect(() => {
    if (showPreview) setPreviewTimeMs(Date.now());
  }, [showPreview]);

  const previewClaimMilestones = useMemo(() => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return [];
    const lockupN = parseInt(lockupMonths, 10);
    const vestingN = parseInt(vestingMonths, 10);
    if (Number.isNaN(lockupN) || Number.isNaN(vestingN)) return [];
    const ms = new Date(fundingDeadlineLocal).getTime();
    if (Number.isNaN(ms)) return [];
    const fundingUnix = Math.floor(ms / 1000);
    return projectFactoryClaimMilestones({
      fundingUnix,
      lockupMonths: lockupN,
      vestingMonths: vestingN,
      totalVoi: amt,
      nowMs: previewTimeMs,
    });
  }, [
    amount,
    lockupMonths,
    vestingMonths,
    fundingDeadlineLocal,
    previewTimeMs,
  ]);

  const searchEnVOINames = async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.envoi.sh/api/search?pattern=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
      setShowDropdown(true);
    } catch (error) {
      console.error("Error searching enVOI names:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (addressInput) {
        searchEnVOINames(addressInput);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timer);
  }, [addressInput]);

  // Fetch balance when account changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAccount || !algodClient) {
        setBalance(0);
        return;
      }

      setIsLoadingBalance(true);
      try {
        const accountInfo = await algodClient
          .accountInformation(activeAccount.address)
          .do();
        const balanceMicro = accountInfo.amount || 0;
        const minBalance = accountInfo.minBalance || 0;
        const availableBalance = Math.max(
          0,
          Number(balanceMicro) - Number(minBalance) + 2e5
        );
        setBalance(availableBalance / 1e6);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance(0);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [activeAccount, algodClient]);

  // Fetch recent transactions to autofill recipient
  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (!activeAccount || !algodClient) {
        setRecentRecipients([]);
        setIncentiveNotes([]);
        return;
      }

      try {
        const indexerClient = new algosdk.Indexer(
          "",
          "https://mainnet-idx.voi.nodely.dev",
          443
        );
        const transactions = await indexerClient
          .lookupAccountTransactions(activeAccount.address)
          .limit(11)
          .do();

        const incentives = [
          "JKMG6YUDH7VY4ZSRFJR2SJELG5OI3K2MISH5R5IKZT6NZEGEHO6JOUE2AE", // early
          "JKMG6YUDH7VY4ZSRFJR2SJELG5OI3K2MISH5R5IKZT6NZEGEHO6JOUE2AE", // mid
          "JKMG6YUDH7VY4ZSRFJR2SJELG5OI3K2MISH5R5IKZT6NZEGEHO6JOUE2AE", // late
        ];

        const mIncentivesNotes = transactions.transactions
          .filter((transaction: any) => incentives.includes(transaction.sender))
          .map((transaction: any) => {
            const decodedNote = atob(transaction.note);
            // Look for prefix pattern like VF-2025-AUGUST-0027
            const prefixMatch = decodedNote.match(/VF-\d{4}-\w+-\d+/);
            if (prefixMatch) {
              return {
                note: decodedNote,
                prefix: prefixMatch[0],
                transaction: transaction,
              };
            }
            return {
              note: decodedNote,
              prefix: null,
              transaction: transaction,
            };
          });

        console.log({ mIncentivesNotes });
        setIncentiveNotes(mIncentivesNotes);

        // If there are no incentive notes, clear recent recipients
        setRecentRecipients([]);
        return;
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        setRecentRecipients([]);
        setIncentiveNotes([]);
      }
    };

    fetchRecentTransactions();
  }, [activeAccount, algodClient, address]);

  const handleSelectResult = (result: EnVOIResult) => {
    if (result.address) {
      setAddress(result.address);
      setAddressInput(result.name);
    } else {
      // If no address in result, use the name directly
      setAddress(result.name);
      setAddressInput(result.name);
    }
    setShowDropdown(false);
  };

  /** Raw address in the field, or address chosen from enVOI (input may show the name). */
  const getRecipientAddress = (): string | null => {
    const t = addressInput.trim();
    if (t && algosdk.isValidAddress(t)) return t;
    if (address && algosdk.isValidAddress(address)) return address;
    return null;
  };

  const isFormComplete = () => {
    if (
      !getRecipientAddress() ||
      !amount ||
      parseFloat(amount) <= 0 ||
      !vestingMonths?.trim() ||
      !activeAccount
    ) {
      return false;
    }
    if (validateScheduleMonths(lockupMonths, 12)) {
      return false;
    }
    if (validateScheduleMonths(vestingMonths, 60)) {
      return false;
    }
    if (validateFundingDeadline(fundingDeadlineLocal)) {
      return false;
    }
    return true;
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);

    if (!value) {
      setAmountError("");
      return;
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      setAmountError("Please enter a valid number");
      return;
    }

    if (numValue <= 0) {
      setAmountError("Amount must be greater than 0");
      return;
    }

    if (activeAccount && numValue > balance) {
      setAmountError(
        `Amount exceeds available balance of ${balance.toFixed(4)} ALGO`
      );
      return;
    }

    setAmountError("");
  };

  /** VF-YYYY-MM-#### prefix uses local date; #### is a random 4-digit id. */
  const applyCouncilCompensationNoteTemplate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const fundingParsed = new Date(fundingDeadlineLocal.trim());
    const startDate = !Number.isNaN(fundingParsed.getTime())
      ? `${fundingParsed.getFullYear()}-${String(fundingParsed.getMonth() + 1).padStart(2, "0")}-${String(fundingParsed.getDate()).padStart(2, "0")}`
      : `${year}-${month}-${day}`;
    const seq = String(Math.floor(1000 + Math.random() * 9000));
    const vfPrefix = `VF-${year}-${month}-${seq}`;

    const trimmedInput = addressInput.trim();
    const displayName =
      trimmedInput && !algosdk.isValidAddress(trimmedInput)
        ? trimmedInput
        : "[Name]";

    const cliffM = lockupMonths || "0";
    const durM = vestingMonths || "0";
    const amt =
      amount && !Number.isNaN(parseFloat(amount)) && parseFloat(amount) > 0
        ? amount
        : "X";

    const header = `${vfPrefix} — Council Compensation — ${displayName}`;
    const body = `Council Pay | Cliff: ${cliffM}m | Duration: ${durM}m | Amount: ${amt} VOI | Start: ${startDate}`;
    setNote(`${header}\n\n${body}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const recipient = getRecipientAddress();
    if (!recipient) {
      setAmountError("Please enter a valid recipient address or select an enVOI name");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setAmountError("Please enter a valid grant amount");
      return;
    }

    if (amountError) {
      return;
    }

    const lockupErr = validateScheduleMonths(lockupMonths, 12);
    const vestingErr = validateScheduleMonths(vestingMonths, 60);
    const fundingErr = validateFundingDeadline(fundingDeadlineLocal);
    setLockupError(lockupErr ?? "");
    setVestingError(vestingErr ?? "");
    setFundingDeadlineError(fundingErr ?? "");
    if (lockupErr || vestingErr || fundingErr) {
      return;
    }

    const lockupN = parseInt(lockupMonths, 10);
    const vestingN = parseInt(vestingMonths, 10);
    const fundingUnix = Math.floor(new Date(fundingDeadlineLocal).getTime() / 1000);

    // Handle form submission here
    console.log("Grant Pay Form:", {
      address: recipient,
      amount,
      lockupMonths,
      vestingMonths,
      fundingUnix,
      note,
    });

    const factoryAppId = networks.voimain.facttory;

    const indexerClient = new algosdk.Indexer(
      "",
      "https://mainnet-idx.voi.nodely.dev",
      443
    );

    const ci = new CONTRACT(factoryAppId, algodClient, undefined, abi.custom, {
      addr: activeAccount.address,
      sk: new Uint8Array(),
    });

    const ciFactory = new CONTRACT(
      factoryAppId,
      algodClient,
      indexerClient,
      {
        ...compensationFactoryAppSpec.contract,
        events: [
          {
            name: "FactoryCreated",
            args: [
              {
                type: "uint64",
                name: "appId",
              },
            ],
          },
        ],
      },
      {
        addr: activeAccount.address,
        sk: new Uint8Array(),
      }
    );

    const builder = {
      factory: new CONTRACT(
        factoryAppId,
        algodClient,
        indexerClient,
        {
          ...compensationFactoryAppSpec.contract,
          events: [
            {
              name: "FactoryCreated",
              args: [
                {
                  type: "uint64",
                  name: "appId",
                },
              ],
            },
          ],
        },
        {
          addr: activeAccount.address,
          sk: new Uint8Array(),
        },
        true,
        false,
        true
      ),
    };

    const buildN = [];

    {
      const payment =
        BigInt(new BigNumber(amount).multipliedBy(1e6).toFixed(0)) +
        BigInt(1334500);
      const txnO = (
        await builder.factory.create(fundingUnix, recipient, lockupN, vestingN)
      ).obj;
      buildN.push({ ...txnO, payment, note: new TextEncoder().encode(note) });
    }

    ci.setFee(6000);
    ci.setExtraTxns(buildN);
    ci.setEnableGroupResourceSharing(true);
    const customR = await ci.custom();

    console.log({ customR });

    if (!customR.success) {
      toast({
        variant: "destructive",
        description: customR.error.slice(0, 100) + "...",
        duration: 3000,
        action: (
          <ToastAction
            altText="Copy error to clipboard"
            onClick={() => {
              navigator.clipboard.writeText(customR.error);
            }}
          >
            Copy
          </ToastAction>
        ),
      });
      return;
    }

    const stxns = await signTransactions(
      customR.txns.map((txn: string) => {
        const decoded = atob(txn);
        return new Uint8Array(
          decoded.split("").map((char) => char.charCodeAt(0))
        );
      })
    );

    const res = await algodClient.sendRawTransaction(stxns).do();

    const status = await algodClient.status().do();
    const lastRound = status.lastRound;

    await algosdk.waitForConfirmation(algodClient, res.txid, 4);

    let events: any[];
    do {
      const eventResponse = await ciFactory.getEvents({
        minRound: Number(lastRound),
      });
      events =
        eventResponse.find((e: any) => e.name === "FactoryCreated")?.events ||
        [];

      if (events.length > 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (1);

    console.log({ events });

    const appId = Number(events[0][3]);

    const recipientLabel =
      addressInput.trim() && !algosdk.isValidAddress(addressInput.trim())
        ? addressInput.trim()
        : undefined;
    upsertGrant({
      id: appId,
      recipientAddress: recipient,
      recipientLabel,
      totalAmountVoi: parseFloat(amount),
      lockupMonths: lockupN,
      vestingMonths: vestingN,
      createdAt: new Date().toISOString(),
      creationTxId: res.txid,
      claims: [],
    });

    setCreatedAppId(appId);
    setShowSuccessModal(true);
  };

  return (
    <div className="grant-shell">
      {/* Header */}
      <div className="grant-shell-header">
        <div className="container mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="grant-title-sub mb-2">Create</p>
            <h1 className="grant-title text-4xl">Grant Pay</h1>
            <p className="text-slate-500 mt-3 text-sm max-w-md leading-relaxed">
              New compensation grant with cliff and vesting — settled on Voi.
            </p>
          </div>
          <Link to="/" className="grant-link text-sm shrink-0">
            ← Grant dashboard
          </Link>
        </div>
        <div className="grant-hairline" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="grant-panel shadow-none">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-100">
                Grant payment details
              </CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Required fields for factory <span className="font-mono text-slate-400">create</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identity Display */}
                {activeAccount && (
                  <div className="flex items-center gap-3 grant-panel-muted px-4 py-3 mb-4 rounded-sm">
                    <Avatar className="w-10 h-10 rounded-sm">
                      <AvatarFallback className="bg-gradient-to-br from-sky-600 to-slate-800 text-sm text-white rounded-sm">
                        {activeAccount.address.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-base font-medium text-white">
                        {activeAccount.address.slice(0, 6)}...
                        {activeAccount.address.slice(-4)}
                      </div>
                      <div className="text-sm text-gray-400">
                        Connected Account
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="grant-btn-outline border-sky-800 h-8 px-3 text-sm"
                      onClick={() => setShowIdentitySheet(true)}
                    >
                      <User className="w-4 h-4 mr-1.5" />
                      Manage
                    </Button>
                  </div>
                )}

                {/* Address Field */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-sky-400" />
                    Recipient Address or enVOI Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="address"
                      type="text"
                      placeholder="Enter address or search enVOI name..."
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      onFocus={() => addressInput && setShowDropdown(true)}
                      className="grant-input placeholder:text-slate-600"
                      required
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />

                    {/* Search Results Dropdown */}
                    {showDropdown && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 grant-panel border-sky-950/60 rounded-sm shadow-xl max-h-60 overflow-y-auto">
                        {searchResults.map((result, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-sky-950/30 cursor-pointer transition-colors"
                            onClick={() => handleSelectResult(result)}
                          >
                            {result.metadata.avatar && (
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>
                                  <img
                                    src={result.metadata.avatar}
                                    alt={result.name}
                                    className="w-full h-full object-cover"
                                  />
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex-1">
                              <div className="text-white font-medium">
                                {result.name}
                              </div>
                              {result.address && (
                                <div className="text-xs text-gray-400">
                                  {result.address.slice(0, 6)}...
                                  {result.address.slice(-4)}
                                </div>
                              )}
                            </div>
                            {getRecipientAddress() === result.address ||
                            address === result.name ? (
                              <Check className="w-4 h-4 text-sky-400" />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {(() => {
                    const r = getRecipientAddress();
                    if (!r) return null;
                    const display =
                      r.length > 40
                        ? `${r.slice(0, 20)}...${r.slice(-20)}`
                        : r;
                    return (
                      <p className="text-xs text-gray-400">
                        Selected: {display}
                      </p>
                    );
                  })()}
                </div>

                {/* Amount Field */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-sky-400" />
                    Grant Amount
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter grant amount"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className={`grant-input placeholder:text-slate-600 pr-20 ${
                        amountError ? "border-red-500 focus-visible:ring-red-500/30" : ""
                      }`}
                      required
                      min="0"
                      step="0.000001"
                    />
                    {activeAccount && (
                      <Button
                        type="button"
                        onClick={() => {
                          setAmount(balance.toFixed(4));
                          setAmountError("");
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 text-xs grant-btn-primary rounded-sm"
                      >
                        MAX
                      </Button>
                    )}
                  </div>
                  {amountError && (
                    <p className="text-xs text-red-400 px-2">{amountError}</p>
                  )}
                  {activeAccount && !amountError && (
                    <div className="flex items-center justify-between text-sm px-2">
                      <span className="text-gray-400">Available Balance:</span>
                      <span className="text-sky-400 font-medium">
                        {isLoadingBalance
                          ? "Loading..."
                          : `${balance.toFixed(4)} ALGO`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Factory create: funding (uint64 unix) */}
                <div className="space-y-2">
                  <Label
                    htmlFor="funding-start"
                    className="flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4 text-sky-400" />
                    Start of funding
                  </Label>
                  <p className="text-xs text-slate-500 px-0.5">
                    On-chain{" "}
                    <span className="font-mono text-slate-400">funding</span>{" "}
                    timestamp (Unix seconds).
                  </p>
                  <div className="relative">
                    <Input
                      ref={fundingStartInputRef}
                      id="funding-start"
                      type="datetime-local"
                      step={60}
                      value={fundingDeadlineLocal}
                      onChange={(e) => {
                        setFundingDeadlineLocal(e.target.value);
                        setFundingDeadlineError("");
                      }}
                      onBlur={() =>
                        setFundingDeadlineError(
                          validateFundingDeadline(fundingDeadlineLocal) ?? ""
                        )
                      }
                      className={`grant-input placeholder:text-slate-600 pr-11 ${
                        fundingDeadlineError
                          ? "border-red-500 focus-visible:ring-red-500/30"
                          : ""
                      }`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-sm text-slate-400 hover:bg-sky-950/40 hover:text-sky-300"
                      onClick={openFundingStartPicker}
                      aria-label="Open date and time picker"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                  {fundingDeadlineError && (
                    <p className="text-xs text-red-400 px-2">
                      {fundingDeadlineError}
                    </p>
                  )}
                </div>

                {/* Lockup / cliff (months) — factory max 12 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-sky-400" />
                    Lockup / cliff (months)
                  </Label>
                  <p className="text-xs text-slate-500 px-0.5">
                    Custom value from 0 to 12 months.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[0, 3, 6, 9, 12].map((month) => (
                      <Button
                        key={month}
                        type="button"
                        onClick={() => {
                          setLockupMonths(month.toString());
                          setLockupError("");
                        }}
                        variant={
                          lockupMonths === month.toString()
                            ? "default"
                            : "outline"
                        }
                        className={`flex-1 min-w-[60px] rounded-sm font-medium ${
                          lockupMonths === month.toString()
                            ? "bg-sky-500/20 border border-sky-500/50 text-sky-200"
                            : "border border-slate-700 bg-slate-950/50 text-slate-400 hover:border-sky-900 hover:bg-sky-950/25"
                        }`}
                      >
                        {month}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <Input
                      id="lockup-custom"
                      type="number"
                      min={0}
                      max={12}
                      step={1}
                      inputMode="numeric"
                      placeholder="Custom months"
                      value={lockupMonths}
                      onChange={(e) => {
                        setLockupMonths(e.target.value);
                        setLockupError("");
                      }}
                      onBlur={() =>
                        setLockupError(
                          validateScheduleMonths(lockupMonths, 12) ?? ""
                        )
                      }
                      className="grant-input sm:max-w-[200px]"
                    />
                  </div>
                  {lockupError && (
                    <p className="text-xs text-red-400 px-0.5">{lockupError}</p>
                  )}
                </div>

                {/* Vesting (months) — factory max 60 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    Vesting (months)
                  </Label>
                  <p className="text-xs text-slate-500 px-0.5">
                    Custom value from 0 to 60 months.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[0, 12, 24, 36, 48, 60].map((m) => (
                      <Button
                        key={m}
                        type="button"
                        onClick={() => {
                          setVestingMonths(m.toString());
                          setVestingError("");
                        }}
                        variant={
                          vestingMonths === m.toString() ? "default" : "outline"
                        }
                        className={`flex-1 min-w-[60px] rounded-sm font-medium ${
                          vestingMonths === m.toString()
                            ? "bg-sky-500/20 border border-sky-500/50 text-sky-200"
                            : "border border-slate-700 bg-slate-950/50 text-slate-400 hover:border-sky-900 hover:bg-sky-950/25"
                        }`}
                      >
                        {m}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <Input
                      id="vesting-custom"
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      inputMode="numeric"
                      placeholder="Custom months"
                      value={vestingMonths}
                      onChange={(e) => {
                        setVestingMonths(e.target.value);
                        setVestingError("");
                      }}
                      onBlur={() =>
                        setVestingError(
                          validateScheduleMonths(vestingMonths, 60) ?? ""
                        )
                      }
                      className="grant-input sm:max-w-[200px]"
                    />
                  </div>
                  {vestingError && (
                    <p className="text-xs text-red-400 px-0.5">
                      {vestingError}
                    </p>
                  )}
                </div>

                {/* Note Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="note" className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-400" />
                      Note
                    </Label>
                    {note && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNote("")}
                        className="h-6 w-6 p-0 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="note"
                    placeholder="Add an optional note..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="grant-input placeholder:text-slate-600 min-h-[80px]"
                    rows={3}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="grant-btn-outline inline-flex"
                    onClick={applyCouncilCompensationNoteTemplate}
                  >
                    <LayoutTemplate className="w-4 h-4 mr-2 shrink-0" />
                    Council Compensation
                  </Button>
                  {incentiveNotes.length > 0 && !note && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 px-2">
                        Recent Incentive Notes:
                      </p>
                      <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                        {incentiveNotes.map((item, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setNote(item.note)}
                            className="text-left px-3 py-2 rounded-sm border border-slate-800 bg-[#050a14]/60 hover:border-sky-900/60 hover:bg-sky-950/20 transition-colors text-sm text-slate-300"
                          >
                            {item.prefix ? (
                              <div>
                                <span className="text-sky-400 font-medium">
                                  {item.prefix}
                                </span>
                                {item.note.length > 100
                                  ? ` - ${item.note.substring(0, 100)}...`
                                  : item.note}
                              </div>
                            ) : (
                              <div className="truncate">{item.note}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                  {isFormComplete() && (
                    <Button
                      type="button"
                      variant="outline"
                      className="grant-btn-outline w-full font-semibold border-sky-700/50 hover:bg-sky-950/40 hover:text-sky-100"
                      size="lg"
                      onClick={() => setShowPreview(true)}
                    >
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Preview Grant
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="w-full grant-btn-primary"
                    size="lg"
                    onClick={
                      !activeAccount
                        ? (e) => {
                            e.preventDefault();
                            setShowIdentitySheet(true);
                          }
                        : undefined
                    }
                  >
                    {activeAccount ? "Create Grant Payment" : "Connect Wallet"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Identity Sheet */}
      <IdentitySheet
        isOpen={showIdentitySheet}
        onOpenChange={setShowIdentitySheet}
      />

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl grant-panel border-sky-950/60 text-slate-200">
          <DialogHeader>
            <DialogTitle className="grant-title text-2xl">
              Grant payment preview
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Review details before signing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Chart Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vesting Schedule</h3>
              <div className="h-64 grant-panel-muted rounded-sm relative p-6">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((line) => (
                    <line
                      key={line}
                      x1="0"
                      y1={line * 2}
                      x2="400"
                      y2={line * 2}
                      stroke="#374151"
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                    />
                  ))}

                  {/* Line chart showing locked amount */}
                  {vestingMonths &&
                    parseInt(vestingMonths) > 0 &&
                    (() => {
                      const lockupNum = parseInt(lockupMonths) / 12; // Convert months to years
                      const vestingNum = parseInt(vestingMonths);
                      const totalNum = lockupNum + vestingNum;
                      const lockupX = (lockupNum / totalNum) * 400;
                      const lockupXStr = lockupX.toString();
                      return (
                        <polyline
                          points={`0,0 ${lockupXStr},0 400,200`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="3"
                        />
                      );
                    })()}

                  {/* Fill area */}
                  {vestingMonths &&
                    parseInt(vestingMonths) > 0 &&
                    (() => {
                      const lockupNum = parseInt(lockupMonths) / 12; // Convert months to years
                      const vestingNum = parseInt(vestingMonths);
                      const totalNum = lockupNum + vestingNum;
                      const lockupX = (lockupNum / totalNum) * 400;
                      const lockupXStr = lockupX.toString();
                      return (
                        <polygon
                          points={`0,0 ${lockupXStr},0 400,200 400,200 0,200`}
                          fill="url(#gradient)"
                          opacity="0.3"
                        />
                      );
                    })()}

                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>

                  {/* Year labels */}
                  {vestingMonths && parseInt(vestingMonths) > 0 && (
                    <>
                      <text x="10" y="195" fill="#9CA3AF" fontSize="10">
                        0
                      </text>
                      <text
                        x={`${
                          400 *
                          (parseInt(lockupMonths) /
                            12 /
                            (parseInt(lockupMonths) / 12 +
                              parseInt(vestingMonths)))
                        }`}
                        y="195"
                        fill="#9CA3AF"
                        fontSize="10"
                      >
                        {parseInt(lockupMonths) / 12}
                      </text>
                      <text x="380" y="195" fill="#9CA3AF" fontSize="10">
                        {parseInt(lockupMonths) / 12 + parseInt(vestingMonths)}
                      </text>
                    </>
                  )}
                </svg>

                {/* Y-axis label */}
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-400">
                  Locked Amount
                </div>
              </div>
              <div className="flex gap-4 text-sm text-gray-400 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-700 rounded-sm"></div>
                  <span>
                    Lockup Period ({lockupMonths} month
                    {parseInt(lockupMonths) !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-t from-sky-500 to-sky-700 rounded-sm"></div>
                  <span>Vesting Period ({vestingMonths || 0} months)</span>
                </div>
              </div>
            </div>

            {/* Details Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Grant Details</h3>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHead className="text-gray-400">Recipient</TableHead>
                    <TableCell className="font-mono text-sm">
                      {getRecipientAddress() ?? addressInput}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableCell className="font-semibold">
                      {amount} ALGO
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-gray-400">
                      Start of funding
                    </TableHead>
                    <TableCell>
                      {fundingDeadlineLocal
                        ? (() => {
                            const ms = new Date(fundingDeadlineLocal).getTime();
                            return Number.isNaN(ms)
                              ? fundingDeadlineLocal
                              : new Date(ms).toLocaleString();
                          })()
                        : "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-gray-400">
                      Lockup Period
                    </TableHead>
                    <TableCell>
                      {lockupMonths} month
                      {parseInt(lockupMonths) !== 1 ? "s" : ""}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-gray-400">
                      Vesting Period
                    </TableHead>
                    <TableCell>
                      {vestingMonths || 0} month
                      {vestingMonths && parseInt(vestingMonths) !== 1
                        ? "s"
                        : ""}
                    </TableCell>
                  </TableRow>
                  {note && (
                    <TableRow>
                      <TableHead className="text-gray-400">Note</TableHead>
                      <TableCell className="text-sm">{note}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Claim history (projected, matches on-chain grant detail timeline) */}
            {previewClaimMilestones.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Claim history</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Projected distribution dates (factory schedule: monthly
                    slices after cliff)
                  </p>
                </div>
                <div className="relative pl-8 space-y-0 max-h-96 overflow-y-auto pr-1">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-sky-950/80" />
                  {previewClaimMilestones.map((m) => (
                    <div
                      key={m.id}
                      className="relative pb-10 last:pb-2 flex gap-4"
                    >
                      <div className="absolute left-0 top-1.5">
                        {m.state === "available" && (
                          <div className="w-6 h-6 rounded-sm bg-emerald-950/50 border border-emerald-500/60 flex items-center justify-center animate-pulse shadow-[0_0_14px_rgba(16,185,129,0.35)]">
                            <Circle className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                          </div>
                        )}
                        {m.state === "upcoming" && (
                          <div className="w-6 h-6 rounded-sm bg-slate-900/80 border border-slate-700/60 opacity-50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5 pl-11">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-medium text-slate-200">
                            {m.label}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-500">
                            {m.state}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 tabular-nums">
                          {new Date(m.dateMs).toLocaleString()}
                        </p>
                        <p className="text-sky-400 tabular-nums mt-1">
                          {m.amountVoi.toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}{" "}
                          VOI
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-4">
              <Button
                className="w-full grant-btn-primary"
                size="lg"
                onClick={() => setShowPreview(false)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md grant-panel border-sky-950/60 text-slate-200">
          <DialogHeader>
            <DialogTitle className="grant-title text-2xl">
              Grant created
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Contract deployed on chain
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grant-panel-muted rounded-sm p-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Application ID
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#020617] px-4 py-3 rounded-sm font-mono text-lg text-sky-400 border border-sky-950/60">
                    {createdAppId}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        createdAppId?.toString() || ""
                      );
                      toast({
                        description: "App ID copied to clipboard",
                        duration: 2000,
                      });
                    }}
                    className="grant-btn-outline border-slate-700 h-10 w-10 p-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                asChild
                className="w-full grant-btn-primary"
              >
                <Link
                  to={
                    createdAppId != null
                      ? `/grant/${createdAppId}`
                      : "/"
                  }
                  onClick={() => setShowSuccessModal(false)}
                >
                  View grant details
                </Link>
              </Button>
              <div className="flex gap-3">
                <Button
                  className="flex-1 rounded-sm bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 font-medium"
                  onClick={() => setShowSuccessModal(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 grant-btn-outline"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setAddress("");
                    setAddressInput("");
                    setAmount("");
                    setNote("");
                  }}
                >
                  Create another
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GrantPay;
