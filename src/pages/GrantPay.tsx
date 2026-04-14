import { useState, useEffect } from "react";
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
  User,
  Search,
  Check,
  Lock,
  FileText,
  X,
  BarChart3,
  Copy,
  LayoutTemplate,
} from "lucide-react";
import algosdk from "algosdk";
import networks from "@/config/networks";
import { CONTRACT, abi } from "ulujs";
import BigNumber from "bignumber.js";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { APP_SPEC as compensationFactoryAppSpec } from "@/clients/CompensationFactoryClient";

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
  const [recentRecipients, setRecentRecipients] = useState<string[]>([]);
  const [incentiveNotes, setIncentiveNotes] = useState<
    Array<{ note: string; prefix: string | null; transaction: any }>
  >([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAppId, setCreatedAppId] = useState<number | null>(null);

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
    return (
      !!getRecipientAddress() &&
      amount &&
      parseFloat(amount) > 0 &&
      vestingMonths &&
      activeAccount
    );
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
    const startDate = `${year}-${month}-${day}`;
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

    // Handle form submission here
    console.log("Grant Pay Form:", {
      address: recipient,
      amount,
      lockupMonths,
      vestingMonths,
      note,
    });

    const factoryAppId = networks.voimain.facttory;

    const indexerClient = new algosdk.Indexer(
      "",
      "https://mainnet-idx.voi.nodely.dev",
      443
    );

    const factoryABI = {
      name: "",
      desc: "",
      methods: [
        {
          name: "create",
          args: [
            {
              type: "address",
              name: "owner",
            },
            {
              type: "uint64",
              name: "years",
            },
          ],
          readonly: false,
          returns: {
            type: "uint64",
          },
          desc: "Create compensation contract.\nArguments: - owner, who is the beneficiary - period, vesting period\nReturns: - app id",
        },
      ],
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
    };

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
        await builder.factory.create(
          recipient,
          parseInt(lockupMonths),
          parseInt(vestingMonths)
        )
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

    setCreatedAppId(appId);
    setShowSuccessModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#1EAEDB] to-[#00eeff] bg-clip-text text-transparent">
            Grant Pay
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            Create a new grant payment with vesting schedule
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl">Grant Payment Details</CardTitle>
              <CardDescription className="text-gray-400">
                Fill in the details to create a grant payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identity Display */}
                {activeAccount && (
                  <div className="flex items-center gap-3 bg-black/20 rounded-lg px-4 py-3 mb-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-[#1EAEDB] to-violet-400 text-sm">
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
                      className="border-[#1EAEDB] text-[#1EAEDB] hover:bg-[#1EAEDB]/10 h-8 px-3 text-sm"
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
                    <Wallet className="w-4 h-4 text-[#1EAEDB]" />
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
                      className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#1EAEDB]"
                      required
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />

                    {/* Search Results Dropdown */}
                    {showDropdown && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((result, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 cursor-pointer transition-colors"
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
                              <Check className="w-4 h-4 text-[#1EAEDB]" />
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
                    <DollarSign className="w-4 h-4 text-[#1EAEDB]" />
                    Grant Amount
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter grant amount"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className={`bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#1EAEDB] pr-20 ${
                        amountError ? "border-red-500 focus:border-red-500" : ""
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
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 px-3 text-xs bg-[#1EAEDB] hover:bg-[#00eeff] text-black font-semibold"
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
                      <span className="text-[#1EAEDB] font-medium">
                        {isLoadingBalance
                          ? "Loading..."
                          : `${balance.toFixed(4)} ALGO`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lockup Months Field */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#1EAEDB]" />
                    Lockup (Months)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[0, 3, 6, 9, 12].map((month) => (
                      <Button
                        key={month}
                        type="button"
                        onClick={() => setLockupMonths(month.toString())}
                        variant={
                          lockupMonths === month.toString()
                            ? "default"
                            : "outline"
                        }
                        className={`flex-1 min-w-[60px] ${
                          lockupMonths === month.toString()
                            ? "bg-[#1EAEDB] hover:bg-[#00eeff] text-black"
                            : "border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-[#1EAEDB]"
                        }`}
                      >
                        {month}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Vesting Years Field */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#1EAEDB]" />
                    Vesting (Months)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[0, 12, 24, 36, 48, 60].map((year) => (
                      <Button
                        key={year}
                        type="button"
                        onClick={() => setVestingMonths(year.toString())}
                        variant={
                          vestingMonths === year.toString()
                            ? "default"
                            : "outline"
                        }
                        className={`flex-1 min-w-[60px] ${
                          vestingMonths === year.toString()
                            ? "bg-[#1EAEDB] hover:bg-[#00eeff] text-black"
                            : "border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-[#1EAEDB]"
                        }`}
                      >
                        {year}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Note Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="note" className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1EAEDB]" />
                      Note
                    </Label>
                    {note && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNote("")}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
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
                    className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#1EAEDB] min-h-[80px]"
                    rows={3}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="inline-flex border-gray-600 text-gray-200 hover:bg-gray-800 hover:text-white hover:border-[#1EAEDB]"
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
                            className="text-left px-3 py-2 bg-black/20 border border-gray-700 rounded-lg hover:bg-black/40 hover:border-[#1EAEDB] transition-colors text-sm text-gray-300"
                          >
                            {item.prefix ? (
                              <div>
                                <span className="text-[#1EAEDB] font-medium">
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
                      className="w-full border-[#1EAEDB] text-[#1EAEDB] hover:bg-[#1EAEDB] hover:text-black font-semibold"
                      size="lg"
                      onClick={() => setShowPreview(true)}
                    >
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Preview Grant
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-[#1EAEDB] hover:bg-[#00eeff] text-black font-semibold"
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
        <DialogContent className="max-w-3xl bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-[#1EAEDB] to-[#00eeff] bg-clip-text text-transparent">
              Grant Payment Preview
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Review your grant payment details and schedule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Chart Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vesting Schedule</h3>
              <div className="h-64 bg-black/30 rounded-lg border border-gray-800 relative p-6">
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
                          stroke="#1EAEDB"
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
                      <stop offset="0%" stopColor="#1EAEDB" />
                      <stop offset="100%" stopColor="#00eeff" />
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
                  <div className="w-4 h-4 bg-gray-700 rounded"></div>
                  <span>
                    Lockup Period ({lockupMonths} month
                    {parseInt(lockupMonths) !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-t from-[#1EAEDB] to-[#00eeff] rounded"></div>
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

            {/* Close Button */}
            <div className="pt-4">
              <Button
                className="w-full bg-[#1EAEDB] hover:bg-[#00eeff] text-black font-semibold"
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
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-[#1EAEDB] to-[#00eeff] bg-clip-text text-transparent">
              Grant Payment Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Your grant payment contract has been deployed
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-black/30 rounded-lg p-6 border border-gray-800">
              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Application ID</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-950 px-4 py-3 rounded-lg font-mono text-lg text-[#1EAEDB] border border-gray-800">
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
                    className="border-gray-700 hover:bg-gray-800"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold"
                onClick={() => setShowSuccessModal(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1 bg-[#1EAEDB] hover:bg-[#00eeff] text-black font-semibold"
                onClick={() => {
                  setShowSuccessModal(false);
                  // Reset form
                  setAddress("");
                  setAddressInput("");
                  setAmount("");
                  setNote("");
                }}
              >
                Create Another
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GrantPay;
