# Contracts and on-chain references

This document lists **known application IDs**, **token contract IDs**, and **behaviors** the frontend uses. Values are taken from the repo as of the last edit; verify on-chain before relying on them for production operations.

**Default chain in `App.tsx`:** **Voi mainnet** (`voi-mainnet`, Algod `https://mainnet-api.voi.nodely.dev`).

---

## Summary tables

### Algorand / Voi **application** IDs (stateful contracts)

| Purpose | App ID | Config / usage |
|--------|--------|------------------|
| **Compensation factory** (grant schedules) | **47562540** | `src/config/networks.ts` → `networks.voimain.facttory` (typo in property name). Used by **`GrantPay`**. Previous factory **46895982** is commented in the same file (older lock/vesting rules). |
| **VNS registry** (name resolution) | **797607** | Hardcoded in `IdentitySheet`, `ExitLab`, `FundRecovery`, `StakingContracts`, `Voting` when resolving EnVOI-style names on-chain. |
| **VNS public resolver** | **797608** | Same files as registry; paired with **797607** for lookups. |
| **POW governance** | **45489275** | `src/constants/appIds.ts` → `APP_IDS[VOIMAIN].GOVERNANCE`. Used by governance/election-related code (e.g. `electionInfoService`, `ProposalDetail`). |
| **A token (governance-related)** | **45489277** | `APP_IDS[VOIMAIN].ATOKEN`. Used with `ATokenClient` where wired. |
| **Localnet governance / A token (dev)** | **3612** / **3614** | `APP_IDS[LOCALNET]` in `appIds.ts`. |

Other networks in `APP_IDS` (testnet, Algorand mainnet) are mostly **placeholders (0)** unless you set them.

---

### ARC-200-style **token contracts** (applications implementing the token ABI)

Used heavily in **`Wallet.tsx`** for balance and transfer logic — **not** the same as ASA IDs below; the code picks **both** an ASA and a token **app** id per network.

| Network | Token contract (app) id | ASA id (POW-style asset) |
|---------|-------------------------|---------------------------|
| Algorand mainnet | **3080081069** | **2994233666** |
| Voi mainnet | **40153155** | **40152679** |

These pairs appear when building `CONTRACT` instances with `abi.nt200` and related paths in `Wallet.tsx`.

---

## Compensation factory (Grant Pay)

- **Client spec:** `src/clients/CompensationFactoryClient.ts` (Algokit-generated `APP_SPEC`; ABI includes admin methods such as `set_version`, `approve_update`, `grant_upgrader`, `transfer`, and **`create(address,uint64,uint64)uint64`**).
- **Factory app ID:** `networks.voimain.facttory` → **47562540**.
- **What the UI does (`GrantPay`):**
  - Calls **`create`** with **(recipient address, lockup months, vesting months)** — see inline `builder.factory.create(address, parseInt(lockupMonths), parseInt(vestingMonths))`.
  - Attaches **payment** in micro-units: user amount × 1e6 plus **1334500** (contract-required overhead / MBR-style requirement in app logic).
  - Listens for indexer event **`FactoryCreated`** and reads the **new child application id** from the event payload (used in the success UI).
- **Comment in `networks.ts`:** current factory supports roughly **0–12 month** cliff and **0–60 month** vesting (vs older factory with different ranges).

---

## VNS (registry + resolver)

- **797607** (registry) and **797608** (resolver) are used with `ulujs` `CONTRACT` + `VNSRegistryClient` / `VNSPublicResolverClient` specs where the app resolves names for the connected account.
- Name search for typing **also** uses the public HTTP API **`https://api.envoi.sh/api/search`** (off-chain helper; not an on-chain contract id).

---

## Governance stack (`PowGovernance` + `AToken`)

- **Specs:** `src/clients/PowGovernanceClient.ts`, `src/clients/ATokenClient.ts`.
- **IDs:** from `getGovernanceAppId` / `getATokenAppId` in `src/constants/appIds.ts` (**45489275** / **45489277** on Voi mainnet).
- **Usage:** proposal flows, election info service, etc. Many related **pages are not mounted** in the current `App.tsx` router; the clients remain in the tree for those features.

---

## Staking / “money stream” contracts

- **Indexing:** `src/services/stakingContractService.ts` loads **per-user staking contract instances** from **`https://mainnet-idx.nautilus.sh/v1/scs`** (SCS API), not from a single hardcoded app id.
- **Client specs:** `StakingRegistrarClient.ts` and related VNS/staking clients under `src/clients/` describe ABIs for **registrar**-style apps; deployment ids for those are **not** centralized in `networks.ts` in the same way as the factory.

---

## Generated clients (no deployment id inside file)

These files export **`APP_SPEC`** for tooling and typing; **runtime app id** is always passed when constructing `CONTRACT` / clients:

| File | Contract name (from spec) |
|------|-----------------------------|
| `CompensationFactoryClient.ts` | CompensationFactory |
| `PowGovernanceClient.ts` | PowGovernance |
| `ATokenClient.ts` | (A token contract) |
| `VNSRegistryClient.ts` | Registry |
| `VNSPublicResolverClient.ts` | PublicResolver |
| `VNSRegistrarClient.ts` | Registrar |
| `StakingRegistrarClient.ts` | StakingRegistrar |
| `ReverseRegistrarClient.ts` | ReverseRegistrar |
| `CollectionRegistrarClient.ts` | CollectionRegistrar |

---

## Operational notes

1. **Changing factory or governance ids:** update `src/config/networks.ts` (factory) and/or `src/constants/appIds.ts` (governance, A token, localnet).
2. **VNS hardcoded ids:** scattered in components/pages; search for **`797607`** / **`797608`** to update all call sites.
3. **Duplicates / ABI quirks:** `CompensationFactoryClient.ts` may show generator warnings (e.g. duplicate `create`); the app still builds — treat the spec as generated, not hand-edited.
4. **Not all clients are used** by the **currently routed** screens; unused specs are legacy or for future routes.

---

## Related docs

- High-level app behavior: [`index.md`](./index.md)
- UI reproduction: [`UI.md`](./UI.md)
