# Build Love / BUIDL App — documentation

## Overview

This is a **Vite + React + TypeScript** web app for **Voi** (AVM-compatible chain). The **live home route** (`/`) renders **Grant Pay**: a flow to create **compensation / grant** schedules via an on-chain **Compensation Factory** contract, with configurable **lockup** and **vesting** (in months), optional notes, and **EnVOI** name lookup for recipients (`api.envoi.sh`).

A second routed surface is **`/wallet/:address`**, which provides **wallet management** (balances, transfers, and related tooling) in a sidebar layout.

The HTML shell still references legacy **“enChain Elections”** metadata; the **Grant Pay** UI is the primary product surface in the current router.

---

## Tech stack

| Area | Choice |
|------|--------|
| Build | [Vite](https://vitejs.dev/) 5 |
| UI | React 18, [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (Radix primitives) |
| Data / async | [@tanstack/react-query](https://tanstack.com/query) |
| Routing | [react-router-dom](https://reactrouter.com/) v6 |
| Chain / wallet | [algosdk](https://github.com/algorand/js-algorand-sdk), [@txnlab/use-wallet-react](https://github.com/TxnLab/use-wallet), [ulujs](https://github.com/TxnLab/ulujs) for contract calls |
| Forms / validation | react-hook-form, zod |

---

## Running locally

From the project directory:

```sh
npm install
npm run dev
```

- **Dev server**: Vite (see `vite.config.ts`).
- **Production build**: `npm run build`, preview with `npm run preview`.
- **Lint**: `npm run lint`.

### Optional: localnet `.env`

`npm run setup-env` creates a `.env` if missing, with placeholders for local Algod (`VITE_LOCALNET_*`, `VITE_GENESIS_MNEMONIC`). Use this when pointing the app at a **local** AVM network instead of public Voi mainnet APIs.

---

## Networks and wallets

### Default network

`App.tsx` configures **Voi mainnet** (`voi-mainnet`) with public Algod at `https://mainnet-api.voi.nodely.dev` and registers it with the wallet manager.

### Supported wallet connectors (current `WalletManager` setup)

- **Kibisis** (`WalletId.KIBISIS`)
- **Lute** — site name `"POW App"`
- **Biatec** — WalletConnect project metadata (`ExitLab` branding in options)
- **WalletConnect** — same metadata pattern

Pera and Defly are commented out in source.

---

## Routing (what is actually mounted)

Defined in `src/App.tsx`:

| Path | Page | Layout |
|------|------|--------|
| `/` | `GrantPay` | Full screen (no app sidebar) |
| `/wallet/:address` | `Wallet` | Sidebar + main content |
| `*` (under sidebar tree) | `NotFound` | Sidebar layout |

**Note:** The repo still contains many other pages (for example `ExitLab`, `StakingContracts`, `FundRecovery`, `Voting`, `Airdrop`, etc.) and shared components. Those are **not** registered in `App.tsx` at this time; only the routes above are active.

---

## Grant Pay (home)

**File:** `src/pages/GrantPay.tsx`

- Connects a wallet, reads **VOI balance**, and builds transactions against the **Compensation Factory** using the generated client `src/clients/CompensationFactoryClient.ts` and `ulujs` `CONTRACT` / ABI helpers.
- **Factory application ID** for Voi mainnet is centralized in `src/config/networks.ts` (see `voimain.facttory` — typo preserved in code).
- Resolves human-friendly recipients via **EnVOI** search (`https://api.envoi.sh/api/search`).
- Supports preview and success flows (including a created app id when applicable).

---

## Wallet page

**File:** `src/pages/Wallet.tsx`

- Deep wallet UX: network switching, **Algorand mainnet** vs **Voi** asset/token IDs, balance queries, internal and **external** transfer flows, bridge-related steps, and opt-in checks — all scoped to the `:address` route param and `useWallet()`.

---

## Contracts and clients

Generated / hand-maintained **Algorand ABI app clients** live under `src/clients/`, including:

- `CompensationFactoryClient.ts` — grant factory (used by Grant Pay)
- VNS / registrar / staking-related clients — used by pages that are not currently routed

Treat `src/config/networks.ts` as the **source of truth** for which factory app ID Grant Pay targets on Voi mainnet.

---

## Versioning and storage

`src/main.tsx` compares `APP_VERSION` (`src/constants/version.ts`) to a key in **localStorage**. On mismatch it clears **localStorage** and **IndexedDB**, sets the new version, and **reloads** so users do not keep stale state across releases.

---

## Backend / Supabase

- `supabase/` includes config and an edge function (`sync-github-bounties`). Nothing in the **current** `App.tsx` routing depends on these paths for the Grant Pay / wallet flows; they may support other features or future integration.

---

## Project metadata

The root `README.md` still describes a **Lovable**-hosted template workflow. Local development does not require Lovable; use `npm run dev` as above.

---

## Quick file map

| Path | Role |
|------|------|
| `src/App.tsx` | Wallet provider, query client, routes, Voi network + wallets |
| `src/pages/GrantPay.tsx` | Grant Pay UI and factory calls |
| `src/pages/Wallet.tsx` | Wallet management at `/wallet/:address` |
| `src/config/networks.ts` | Voi factory app id |
| `src/clients/*.ts` | AVM app specs / clients |
| `scripts/setup-env.js` | Scaffold `.env` for localnet |
