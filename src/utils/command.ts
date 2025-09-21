import {
  PowGovernanceClient,
  APP_SPEC as PowGovernanceAppSpec,
} from "../clients/PowGovernanceClient";
import { ATokenClient } from "../clients/ATokenClient";

import algosdk from "algosdk";
import { CONTRACT, abi } from "ulujs";

// Helper functions to replace Buffer operations
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const stringToUint8Array = (str: string): Uint8Array => {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
};

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const uint8ArrayToString = (bytes: Uint8Array): string => {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
};

function stripTrailingZeroBytes(input: string): string {
  return input.replace(/\0+$/, "");
}

function padStringWithZeroBytes(input: string, length: number): string {
  const paddingLength = length - input.length;

  if (paddingLength > 0) {
    const zeroBytes = "\0".repeat(paddingLength);
    return input + zeroBytes;
  }

  return input; // Return the original string if it's already long enough
}

// DEVNET
const ALGO_SERVER = "http://localhost";
const ALGO_PORT = 4001;
const ALGO_INDEXER_SERVER = "http://localhost";
const ALGO_INDEXER_PORT = 8980;

// TESTNET
// const ALGO_SERVER = "https://testnet-api.voi.nodely.dev";
// const ALGO_INDEXER_SERVER = "https://testnet-idx.voi.nodely.dev";

// MAINNET
// const ALGO_SERVER = "https://mainnet-api.voi.nodely.dev";
// const ALGO_INDEXER_SERVER = "https://mainnet-idx.voi.nodely.dev";

const algodServerURL = ALGO_SERVER;
const algodServerPort = ALGO_PORT;
export const algodClient = new algosdk.Algodv2(
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  algodServerURL,
  algodServerPort
);

const indexerServerURL = ALGO_INDEXER_SERVER;
const indexerServerPort = ALGO_INDEXER_PORT;
export const indexerClient = new algosdk.Indexer(
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  indexerServerURL,
  indexerServerPort
);

const signSendAndConfirm = async (txns: string[], sk: any) => {
  const stxns = txns
    .map((t) => base64ToUint8Array(t))
    .map((t) => {
      const txn = algosdk.decodeUnsignedTransaction(t);
      return txn;
    })
    .map((t: any) => algosdk.signTransaction(t, sk));
  const res = await algodClient
    .sendRawTransaction(stxns.map((txn: any) => txn.blob))
    .do();
  console.log(res);
  return await Promise.all(
    stxns.map((res: any) =>
      algosdk.waitForConfirmation(algodClient, res.txID, 4)
    )
  );
};

const makeCustomContract = (
  appId: number,
  acc: { addr: string; sk: Uint8Array },
  algod?: algosdk.Algodv2,
  indexer?: algosdk.Indexer
) => {
  return new CONTRACT(
    appId,
    algod || algodClient,
    indexer || indexerClient,
    abi.custom,
    acc
  );
};

const makeContract = (
  appId: number,
  appSpec: any,
  acc: { addr: string; sk: Uint8Array },
  algod?: algosdk.Algodv2,
  indexer?: algosdk.Indexer
) => {
  return new CONTRACT(
    appId,
    algod || algodClient,
    indexer || indexerClient,
    {
      name: "",
      desc: "",
      methods: appSpec.contract.methods,
      events: [],
    },
    {
      addr: acc.addr,
      sk: acc.sk,
    }
  );
};

const makeConstructor = (
  appId: number,
  appSpec: any,
  acc: { addr: string; sk: Uint8Array }
) => {
  return new CONTRACT(
    appId,
    algodClient,
    indexerClient,
    {
      name: "",
      desc: "",
      methods: appSpec.contract.methods,
      events: [],
    },
    acc,
    true,
    false,
    true
  );
};

const makeConstructorFromABI = (
  appId: number,
  abi: any,
  acc: { addr: string; sk: Uint8Array }
) => {
  return new CONTRACT(
    appId,
    algodClient,
    indexerClient,
    abi,
    acc,
    true,
    false,
    true
  );
};

type DeployType = "PowGovernance" | "AToken";

interface DeployOptions {
  type: DeployType;
  name: string;
  debug?: boolean;
  addr?: string;
  sk?: string;
}

export const deploy: any = async (options: DeployOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const deployer = {
    addr: options.addr || "",
    sk: options.sk || new Uint8Array(),
  };
  let Client;
  switch (options.type) {
    case "PowGovernance": {
      Client = PowGovernanceClient;
      break;
    }
    case "AToken": {
      Client = ATokenClient;
      break;
    }
  }
  const clientParams: any = {
    resolveBy: "creatorAndName",
    findExistingUsing: indexerClient,
    creatorAddress: deployer.addr,
    name: options.name || "",
    sender: deployer,
  };
  const appClient = Client ? new Client(clientParams, algodClient) : null;
  if (appClient) {
    const app = await appClient.deploy({
      deployTimeParams: {},
      onUpdate: "update",
      onSchemaBreak: "fail",
    });
    return { appId: app.appId, appClient: appClient };
  }
};

interface ProposeOptions {
  appId: number;
  title: string;
  description: string;
  category: number;
  addr?: string;
  sk?: string;
  debug?: boolean;
  simulate?: boolean;
}

export const propose: any = async (options: ProposeOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || "";
  const sk: any = options.sk || new Uint8Array();
  const acc = { addr, sk };
  const ci = makeContract(Number(options.appId), PowGovernanceAppSpec, acc);
  ci.setEnableRawBytes(true);
  const proposeR = await ci.propose(
    stringToUint8Array(padStringWithZeroBytes(options.title, 64)),
    stringToUint8Array(padStringWithZeroBytes(options.description, 512)),
    Number(options.category)
  );
  if (options.debug) {
    console.log({ proposeR });
  }
  if (proposeR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(proposeR.txns, sk);
    }
  }
  return proposeR;
};

export const VOTE_NO = 0;
export const VOTE_YES = 1;

interface CastVoteOptions {
  appId: number;
  proposalNode: string;
  support: number;
  addr?: string;
  sk?: string;
  debug?: boolean;
  simulate?: boolean;
}

export const castVote: any = async (options: CastVoteOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || "";
  const sk: any = options.sk || new Uint8Array();
  const acc = { addr, sk };
  const ci = makeContract(Number(options.appId), PowGovernanceAppSpec, acc);
  ci.setEnableRawBytes(true);
  const castVoteR = await ci.cast_vote(
    base64ToUint8Array(options.proposalNode),
    options.support
  );
  if (options.debug) {
    console.log({ castVoteR });
  }
  if (castVoteR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(castVoteR.txns, sk);
    }
  }
  return castVoteR;
};

// Election voting interface
export interface CastElectionVoteOptions {
  appId: number;
  electionNode: string;
  candidateIds: number[];
  addr?: string;
  sk?: string;
  debug?: boolean;
  simulate?: boolean;
}

export const castElectionVote: any = async (options: CastElectionVoteOptions) => {
  if (options.debug) {
    console.log("CastElectionVote options:", options);
  }
  
  const addr = options.addr || "";
  const sk: any = options.sk || new Uint8Array();
  const acc = { addr, sk };
  const ci = makeContract(Number(options.appId), PowGovernanceAppSpec, acc);
  ci.setEnableRawBytes(true);
  
  // Convert election node to bytes
  const electionNodeBytes = base64ToUint8Array(options.electionNode);
  
  // For now, we'll use a placeholder election voting function
  // This would need to be implemented in the contract
  const castElectionVoteR = await ci.cast_election_vote?.(
    electionNodeBytes,
    options.candidateIds
  );
  
  if (options.debug) {
    console.log({ castElectionVoteR });
  }
  
  if (castElectionVoteR?.success) {
    if (!options.simulate) {
      await signSendAndConfirm(castElectionVoteR.txns, sk);
    }
  }
  
  return castElectionVoteR || { success: false, error: "Election voting not implemented" };
};

interface ActivateProposalOptions {
  appId: number;
  proposalNode: string;
  addr?: string;
  sk?: string;
  debug?: boolean;
  simulate?: boolean;
}

export const activateProposal: any = async (
  options: ActivateProposalOptions
) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || "";
  const sk: any = options.sk || new Uint8Array();
  const acc = { addr, sk };
  const ci = makeContract(Number(options.appId), PowGovernanceAppSpec, acc);
  const activateProposalR = await ci.activate_proposal(
    base64ToUint8Array(options.proposalNode)
  );
  if (options.debug) {
    console.log({ activateProposalR });
  }
  if (activateProposalR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(activateProposalR.txns, sk);
    }
  }
  return activateProposalR;
};

interface RejectProposalOptions {
  appId: number;
  proposalNode: string;
  addr?: string;
  sk?: string;
  debug?: boolean;
  simulate?: boolean;
}

export const rejectProposal: any = async (options: RejectProposalOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr || "";
  const sk: any = options.sk || new Uint8Array();
  const acc = { addr, sk };
  const ci = makeContract(Number(options.appId), PowGovernanceAppSpec, acc);
  const rejectProposalR = await ci.reject_proposal(
    base64ToUint8Array(options.proposalNode)
  );
  if (options.debug) {
    console.log({ rejectProposalR });
  }
  if (rejectProposalR.success) {
    if (!options.simulate) {
      await signSendAndConfirm(rejectProposalR.txns, sk);
    }
  }
  return rejectProposalR;
};

interface GetProposalNodeOptions {
  appId: number;
  title: string;
  description: string;
  addr?: string;
  sk?: string;
  debug?: boolean;
}

export const getProposalNode: any = async (options: GetProposalNodeOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr;
  const sk: any = options.sk;
  const acc = { addr, sk };
  const ci = makeContract(Number(options.appId), PowGovernanceAppSpec, acc);
  ci.setEnableRawBytes(true);
  const getProposalNodeR = await ci.get_proposal_node(
    stringToUint8Array(options.title),
    stringToUint8Array(options.description)
  );
  if (options.debug) {
    console.log({ getProposalNodeR });
  }
  return getProposalNodeR;
};

export interface Proposal {
  proposalIndex: BigInt;
  proposalStatus: BigInt;
  proposer: string;
  proposalTitle: string;
  proposalDescription: string;
  proposalNode: string;
  proposalCategoryId: BigInt;
  proposalTotalVotes: BigInt;
  proposalYesVotes: BigInt;
  proposalTotalPower: BigInt;
  proposalActivationPower: BigInt;
  createdAtTimestamp: BigInt;
  votingStartTimestamp: BigInt;
  votingEndTimestamp: BigInt;
  proposalActionHash: string;
  executedAtTimestamp: BigInt;
  executionTxnId: BigInt;
  proposalActivationTimestamp: BigInt;
  proposalQuorumThreshold: BigInt;
  proposalQuorumMet: boolean;
  proposalQuorumStatus: BigInt;
  proposalYesPower: BigInt;
}

export const decodeProposal = (proposal: any): Proposal => {
  return {
    proposalIndex: proposal[0],
    proposalStatus: proposal[1],
    proposer: proposal[2],
    proposalTitle: stripTrailingZeroBytes(
      uint8ArrayToString(proposal[3])
    ),
    proposalDescription: stripTrailingZeroBytes(
      uint8ArrayToString(proposal[4])
    ),
    proposalNode: uint8ArrayToBase64(proposal[5]),
    proposalCategoryId: proposal[6],
    proposalTotalVotes: proposal[7],
    proposalYesVotes: proposal[8],
    proposalTotalPower: proposal[9],
    proposalActivationPower: proposal[10],
    createdAtTimestamp: proposal[11],
    votingStartTimestamp: proposal[12],
    votingEndTimestamp: proposal[13],
    proposalActionHash: uint8ArrayToBase64(proposal[14]),
    executedAtTimestamp: proposal[15],
    executionTxnId: proposal[16],
    proposalActivationTimestamp: proposal[17],
    proposalQuorumThreshold: proposal[18],
    proposalQuorumMet: proposal[19],
    proposalQuorumStatus: proposal[20],
    proposalYesPower: proposal[21],
  };
};

interface GetProposalOptions {
  appId: number;
  proposalNode: string;
  addr?: string;
  sk?: string;
  debug?: boolean;
  algod?: algosdk.Algodv2;
  indexer?: algosdk.Indexer;
}

export const getProposal: any = async (options: GetProposalOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr;
  const sk: any = options.sk;
  const acc = { addr, sk };
  const ci = makeContract(Number(options.appId), PowGovernanceAppSpec, acc);
  ci.setEnableRawBytes(true);
  const getProposalR = await ci.get_proposal(
    base64ToUint8Array(options.proposalNode)
  );
  if (options.debug) {
    console.log({ getProposalR });
  }
  return decodeProposal(getProposalR.returnValue);
};

interface Voter {
  voterAddress: string;
  votePower: BigInt;
  voteTimestamp: BigInt;
  proposalsParticipated: BigInt;
  lastParticipationTimestamp: BigInt;
  lastProposalNode: string;
}

export const decodeVoter = (voter: any): Voter => {
  console.log({ voter });
  return {
    voterAddress: voter[0],
    votePower: voter[1],
    voteTimestamp: voter[2],
    proposalsParticipated: voter[3],
    lastParticipationTimestamp: voter[4],
    lastProposalNode: uint8ArrayToBase64(voter[5]),
  };
};

interface GetVoterOptions {
  appId: number;
  addr: string;
  sk?: string;
  debug?: boolean;
  algod?: algosdk.Algodv2;
}

export const getVoter: any = async (options: GetVoterOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr;
  const sk: any = options.sk;
  const acc = { addr, sk };
  const ci = makeContract(
    Number(options.appId),
    PowGovernanceAppSpec,
    acc,
    options.algod
  );
  const getVoterR = await ci.get_voter(addr);
  if (options.debug) {
    console.log({ getVoterR });
  }
  return decodeVoter(getVoterR.returnValue);
};

interface LockPowerOptions {
  appId: number;
  powerSourceId: number;
  powerSourceAmount: number;
  powerUnlockTimestamp: number;
  beaconId: number;
  addr?: string;
  sk?: string;
  debug?: boolean;
  simulate?: boolean;
  algod?: algosdk.Algodv2;
  indexer?: algosdk.Indexer;
}

export const lockPower: any = async (options: LockPowerOptions) => {
  if (options.debug) {
    console.log(options);
  }
  const addr = options.addr;
  const sk: any = options.sk;
  const acc = { addr, sk };
  const ci = makeCustomContract(
    Number(options.appId),
    acc,
    options.algod,
    options.indexer
  );
  const builder = {
    token: makeConstructorFromABI(
      Number(options.powerSourceId),
      abi.nt200,
      acc
    ),
    governance: makeConstructor(
      Number(options.appId),
      PowGovernanceAppSpec,
      acc
    ),
  };
  const buildN = [];
  {
    const txnO = (
      await builder.token.arc200_approve(
        algosdk.getApplicationAddress(options.appId),
        options.powerSourceAmount
      )
    ).obj;
    buildN.push({ ...txnO, payment: 1e5 }); // est payment
  }
  {
    const txnO = (
      await builder.governance.lock_power(
        options.powerSourceId,
        options.powerSourceAmount,
        options.powerUnlockTimestamp
      )
    ).obj;
    buildN.push({
      ...txnO,
    });
  }
  console.log(buildN);
  ci.setFee(2000);
  ci.setEnableGroupResourceSharing(true);
  ci.setExtraTxns(buildN);
  if (options.beaconId) {
    ci.setBeaconId(options.beaconId);
  }
  const customR = await ci.custom();
  if (options.debug) {
    console.log({ customR });
  }
  if (customR.success) {
    // if (!options.simulate) {
    //   await signSendAndConfirm(customR.txns, sk);
    // }
  }
  return customR;
};
