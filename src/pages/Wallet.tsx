import React, { useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useParams } from "react-router-dom";
import algosdk from "algosdk";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONTRACT, abi } from "ulujs";
import BigNumber from "bignumber.js";

const whitelist = [
  419744, // BUIDL
  8471125, // bVOI
  8364792, // BUIDL/VOI
];

const TREASURY_ADDRESS =
  "742YB2CM53GGSHFQXAWXXVG2ZECZA2Y65JU5TM43RQMPDAICGVOYNXHFNE";

const Home: React.FC = () => {
  const { address } = useParams();
  const { activeAccount, algodClient, signTransactions } = useWallet();
  const [balances, setBalances] = useState<any[]>([]);
  const [voiBalance, setVoiBalance] = useState<number>(0);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [aUSDCPrice, setAUSDCPrice] = useState<number>(1);
  const [poolTotalSupply, setPoolTotalSupply] = useState<number>(0);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<number>(0);
  const [minBalanceRequired, setMinBalanceRequired] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<string>("");

  const fetchPrices = async () => {
    try {
      const response = await fetch(
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/prices"
      );
      const data = await response.json();
      const priceMap: Record<string, number> = {};
      let foundAUSDCPrice = 1;

      // First find aUSDC price
      data.prices.forEach((pool: any) => {
        if (pool.symbolA === "aUSDC") {
          foundAUSDCPrice = pool.price;
        } else if (pool.symbolB === "aUSDC") {
          foundAUSDCPrice = 1 / pool.price;
        }
      });

      setAUSDCPrice(foundAUSDCPrice);

      // Then calculate other prices in terms of aUSD
      data.prices.forEach((pool: any) => {
        if (pool.symbolA === "BUIDL") {
          priceMap["BUIDL"] = pool.price * foundAUSDCPrice;
        } else if (pool.symbolB === "BUIDL") {
          priceMap["BUIDL"] = (1 / pool.price) * foundAUSDCPrice;
        }
      });
      priceMap["VOI"] = foundAUSDCPrice;
      priceMap["bVOI"] = foundAUSDCPrice;
      const arc200ltPool = data.prices.find(
        (pool: any) => pool.contractId === 8364792
      );
      priceMap["ARC200LT"] =
        (Number(arc200ltPool.poolBalA) *
          Number(priceMap[arc200ltPool.symbolA]) +
          Number(arc200ltPool.poolBalB) *
            Number(priceMap[arc200ltPool.symbolB])) /
        poolTotalSupply;
      setPrices(priceMap);
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  const fetchBalances = async () => {
    if (!address) return;
    try {
      const response = await fetch(
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/balances?accountId=${address}`
      );
      const data = await response.json();
      const filteredBalances = data.balances.filter((balance: any) =>
        whitelist.includes(balance.contractId)
      );

      const orderMap: Record<string, number> = {
        BUIDL: 1,
        ARC200LT: 2,
        bVOI: 3,
      };

      const sortedBalances = filteredBalances.sort(
        (a: any, b: any) =>
          (orderMap[a.symbol] || 999) - (orderMap[b.symbol] || 999)
      );

      setBalances(sortedBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  const fetchVoiBalance = async () => {
    if (!address) return;
    try {
      const response = await fetch(
        `https://mainnet-api.voi.nodely.dev/v2/accounts/${address}`
      );
      const data = await response.json();
      const amount = data.amount;
      const minBalance = data["min-balance"];
      const availableBalance = amount - minBalance;
      setVoiBalance(availableBalance / 1e6);
    } catch (error) {
      console.error("Error fetching VOI balance:", error);
    }
  };

  const fetchPoolBalances = async () => {
    try {
      const response = await fetch(
        "https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/balances?contractId=8364792"
      );
      const data = await response.json();
      setPoolTotalSupply(
        data.balances
          .filter(
            (balance: any) =>
              balance.accountId !== algosdk.getApplicationAddress(8364792) &&
              balance.accountId !==
                "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"
          )
          .reduce((acc, val) => {
            return acc + Number(val.balance);
          }, 0) / 1e6
      );
    } catch (error) {
      console.error("Error fetching pool balances:", error);
    }
  };

  const fetchTransfers = async () => {
    if (!address) return;
    try {
      const response = await fetch(
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/transfers?contractId=419744&from=${TREASURY_ADDRESS}&to=${address}`
      );
      const data = await response.json();

      const filteredTransfers = data.transfers
        .filter((transfer) => whitelist.includes(transfer.contractId))
        .sort((a, b) => b.round - a.round);

      const earnings = filteredTransfers.reduce((acc, transfer) => {
        return acc + Number(transfer.amount) / 10 ** 8;
      }, 0);

      setEarnings(earnings);
      setMinBalanceRequired(earnings / 4);

      setTransfers(filteredTransfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
    }
  };

  // Update useEffects to use the exposed functions
  useEffect(() => {
    fetchPrices();
  }, [poolTotalSupply]);

  useEffect(() => {
    fetchBalances();
  }, [address]);

  useEffect(() => {
    fetchVoiBalance();
  }, [address]);

  useEffect(() => {
    fetchPoolBalances();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [address]);

  useEffect(() => {
    let total = voiBalance * (prices["VOI"] || 0);
    balances.forEach((balance) => {
      total +=
        (balance.balance / 10 ** balance.decimals) *
        (prices[balance.symbol] || 0);
    });
    setPortfolioValue(total);
  }, [balances, prices, voiBalance]);

  // Add a new function to refetch all data
  const refetchAll = () => {
    fetchBalances();
    fetchVoiBalance();
    fetchPoolBalances();
    fetchTransfers();
    fetchPrices();
  };

  const breadCrumb = [
    {
      to: "/bounties",
      label: "[BUIDL]",
    },
    {
      label: address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : "Wallet",
      isCurrentPage: true,
    },
  ];
  return (
    <PageLayout breadcrumb={breadCrumb}>
      <div className="w-full flex flex-col items-start justify-start gap-4">
        {(balances.length > 0 || voiBalance > 0 || poolTotalSupply > 0) && (
          <div className="w-full mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Token Balances:</h2>
              <div className="text-xl font-bold text-card-foreground">
                Portfolio Value: ${portfolioValue.toFixed(2)}
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full">
              {voiBalance > 0 && (
                <div className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card hover:bg-card/80 transition-colors w-full">
                  <div className="flex justify-between mb-2">
                    <div className="text-lg font-semibold text-card-foreground">
                      VOI
                    </div>
                    <div className="text-lg text-card-foreground">
                      {voiBalance.toLocaleString()}
                      <span className="text-sm text-card-foreground/80 ml-2">
                        (${(voiBalance * aUSDCPrice || 0).toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200/20 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-blue-500"
                      style={{
                        width: `${Math.max(
                          1,
                          Math.min(
                            ((voiBalance * prices["VOI"]) / portfolioValue) *
                              100,
                            100
                          )
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
              {balances.map((balance, index) => (
                <div
                  key={index}
                  className="p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card hover:bg-card/80 transition-colors w-full"
                >
                  <div className="flex justify-between mb-2">
                    <div className="text-lg font-semibold text-card-foreground">
                      {balance.symbol}
                    </div>
                    <div className="text-lg text-card-foreground">
                      {(
                        balance.balance /
                        10 ** balance.decimals
                      ).toLocaleString()}
                      {prices[balance.symbol] && (
                        <span className="text-sm text-card-foreground/80 ml-2">
                          ($
                          {(
                            (balance.balance / 10 ** balance.decimals) *
                            prices[balance.symbol]
                          ).toFixed(2)}
                          )
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200/20 rounded-full h-2.5 relative">
                    <div
                      className="h-2.5 rounded-full bg-blue-500"
                      style={{
                        width: `${Math.max(
                          1,
                          Math.min(
                            (((balance.balance / 10 ** balance.decimals) *
                              prices[balance.symbol]) /
                              portfolioValue) *
                              100,
                            100
                          )
                        )}%`,
                      }}
                    ></div>
                    {balance.symbol === "bVOI" && minBalanceRequired > 0 && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-red-500 group cursor-help"
                        style={{
                          left: `${Math.min(
                            ((minBalanceRequired * prices["bVOI"]) /
                              portfolioValue) *
                              100,
                            100
                          )}%`,
                        }}
                      >
                        <div className="absolute top-1/2 left-2 transform -translate-y-1/2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Minimum Required:{" "}
                          {minBalanceRequired.toLocaleString()} bVOI
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {earnings > 0 && (
          <div className="w-full mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Earnings:</h2>
              <div className="text-xl font-bold text-card-foreground">
                {earnings.toLocaleString()} BUIDL
                {prices["BUIDL"] && (
                  <span className="text-sm text-card-foreground/80 ml-2">
                    (${(earnings * prices["BUIDL"]).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {earnings > 0 && (
          <div className="w-full mb-4 p-6 rounded-xl border border-gray-200/20 shadow-lg bg-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Min Balance Required:</h2>
              <div className="text-xl font-bold text-card-foreground">
                {minBalanceRequired.toLocaleString()} bVOI
                {prices["bVOI"] && (
                  <span className="text-sm text-card-foreground/80 ml-2">
                    (${(minBalanceRequired * prices["bVOI"]).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
            {balances.find((b) => b.symbol === "bVOI")?.balance / 1e6 >=
            minBalanceRequired ? (
              <div className="text-green-500">
                ✓ Minimum balance requirement met
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-red-500">✗ Insufficient bVOI balance</div>
                {(false || activeAccount?.address === address) && (
                  <div className="flex flex-col gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <h3 className="text-lg font-semibold">
                      Deposit VOI for bVOI
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder={`Amount of VOI (Need: ${Math.max(
                          0,
                          minBalanceRequired -
                            (balances.find((b) => b.symbol === "bVOI")
                              ?.balance / 1e6 || 0)
                        ).toFixed(2)})`}
                        className="flex-1 px-4 py-2 rounded-lg bg-gray-700"
                        min="0"
                        step="0.1"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                        onClick={async () => {
                          if (!activeAccount || !depositAmount) {
                            return;
                          }
                          try {
                            const ciC = new CONTRACT(
                              8471125,
                              algodClient,
                              null,
                              abi.custom,
                              {
                                addr: activeAccount.address,
                                sk: Uint8Array.from([]),
                              }
                            );
                            const ci = new CONTRACT(
                              8471125,
                              algodClient,
                              null,
                              abi.nt200,
                              {
                                addr: activeAccount.address,
                                sk: Uint8Array.from([]),
                              },
                              true,
                              false,
                              true
                            );
                            const amountBI = BigInt(
                              new BigNumber(Number(depositAmount))
                                .multipliedBy(10 ** 6)
                                .toFixed(0)
                            );
                            let customR;
                            for (const p0 of [0, 1]) {
                              const buildN = [];
                              if (p0 > 0) {
                                const txnO = (
                                  await ci.createBalanceBox(address)
                                ).obj;
                                buildN.push({
                                  ...txnO,
                                  payment: 28500,
                                  note: new Uint8Array(
                                    Buffer.from("createBalanceBox")
                                  ),
                                });
                              }
                              {
                                const txn0 = (await ci.deposit(amountBI)).obj;
                                buildN.push({
                                  ...txn0,
                                  payment: amountBI,
                                  note: new Uint8Array(Buffer.from("Deposit")),
                                });
                              }
                              ciC.setEnableGroupResourceSharing(true);
                              ciC.setExtraTxns(buildN);
                              customR = await ciC.custom();
                              if (customR.success) {
                                break;
                              }
                            }
                            console.log({ customR });
                            if (!customR?.success) {
                              return;
                            }
                            if (activeAccount?.address === address) {
                              const stxns = await signTransactions(
                                customR.txns.map(
                                  (t: string) =>
                                    new Uint8Array(Buffer.from(t, "base64"))
                                )
                              );
                              const [stxn] = stxns;
                              const dstxn = algosdk.decodeSignedTransaction(
                                stxn as Uint8Array
                              );
                              const txId = dstxn.txn.txID();
                              await algodClient
                                .sendRawTransaction(stxns as Uint8Array[])
                                .do();
                              await algosdk.waitForConfirmation(
                                algodClient,
                                txId,
                                4
                              );
                              await new Promise((resolve) =>
                                setTimeout(resolve, 4_000)
                              );
                              refetchAll();
                            }
                          } catch (error) {
                            console.error("Error depositing:", error);
                          } finally {
                          }
                        }}
                      >
                        Deposit
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">
                      1 VOI = 1 bVOI (minus fees)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Home;
