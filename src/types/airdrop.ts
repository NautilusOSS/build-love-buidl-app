// Define the type for airdrop data
export interface AirdropEntry {
  Address: string;
  Voi: number;
  Algo: number;
  Total: number;
}

// Define the type for airdrop index data
export interface AirdropIndexEntry {
  id: string;
  name: string;
  description: string;
  eligibility: string;
  image: string;
  start_date: string;
  period: string;
  status: string;
  url: string | null;
  airdrop_address: string;
  networks: string[];
  type: string;
  asset_ids?: { [key: string]: number };
  token_ids?: { [key: string]: number };
  token_id?: string;
} 