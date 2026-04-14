# UI specification (for tools like Lovable, v0, etc.)

Use this document as a **single source of truth** when generating or recreating screens that match this app. It describes **visual language**, **layout patterns**, **components**, and **copy cues** without requiring you to read the codebase.

---

## Stack to assume

- **Framework:** React (function components, TypeScript optional).
- **Styling:** Tailwind CSS.
- **Component primitives:** shadcn/ui style — **Radix**-based accessible components (`Button`, `Card`, `Dialog`, `Input`, `Label`, `Table`, `Avatar`, `Sheet`/`Drawer` for side panels).
- **Icons:** **lucide-react** (outline icons at `w-4 h-4` or `w-5 h-5` next to labels).
- **Charts (optional):** Inline **SVG** for simple vesting visuals, or Recharts if matching existing charts elsewhere.

---

## Brand and mood

- **Theme:** **Dark / OLED-first** — black backgrounds, high contrast, subtle “tech” glow (teal + violet accents). Not light mode by default.
- **Vibe:** Blockchain / DeFi tooling — precise numbers (monospace where helpful), clear form labels, wallet connection as a first-class action.
- **Key accent:** **Cyan / teal** used for primary actions, focus rings, links, and gradient headlines — **not** pure Material blue.

---

## Core colors (use these hex values in Tailwind arbitrary classes)

| Role | Hex | Usage |
|------|-----|--------|
| Primary / brand | `#1EAEDB` | Headline gradients start, borders, icon tint, “MAX” button, focus border on inputs, outline buttons |
| Primary hover / gradient end | `#00eeff` | Hover on solid primary buttons, gradient text end, chart stroke gradient |
| Page background (Grant Pay) | `gray-900` → `black` | Vertical gradient: `bg-gradient-to-b from-gray-900 to-black` |
| Surfaces | `gray-900/50`, `black/50`, `black/20` | Cards, inputs, identity strip |
| Borders | `gray-800`, `gray-700` | Card and input borders |
| Muted text | `gray-400` | Descriptions, helper text, table headers |
| Body text | `white` | Primary copy on dark surfaces |
| Error | `red-400` / `red-500` | Validation messages, error borders |
| Sidebar chrome (wallet shell) | `#0088ff33` | Subtle blue border on top bar (33 = ~20% opacity) |

**Gradient headlines (signature look):**

- Title: `bg-gradient-to-r from-[#1EAEDB] to-[#00eeff] bg-clip-text text-transparent` with `font-bold` (e.g. `text-4xl` for page title).
- Avatar fallback (connected user): `bg-gradient-to-br from-[#1EAEDB] to-violet-400`.

---

## Global CSS tokens (if implementing `:root` / shadcn theme)

The app’s **default theme** in CSS variables is **black background**, **white text**, **teal primary** (HSL `180 100% 50%`), **violet secondary**, **rounded corners** `--radius: 0.75rem`. Body uses **pure black** `#000` with a subtle **dot “constellation”** pattern (teal/violet/silver specks) — class concept: `constellation-bg` + `text-white antialiased`.

**Reusable utility concepts** (map to Tailwind `@apply` or equivalent):

- **Glass cards:** `backdrop-blur-xl`, dark translucent bg, thin **teal** or **violet** border at ~20% opacity, soft colored shadow.
- **Neon outline:** `outline` / focus visible: **violet** `#8B5CF6`, 2px, 2px offset (buttons).

---

## Typography

| Element | Pattern |
|---------|---------|
| Page title | Large, bold, **cyan gradient text** (see above) |
| Subtitle | `text-lg text-gray-400` under title |
| Section titles | `text-2xl` (card titles), `text-lg font-semibold` (subsections) |
| Form labels | Default weight; often paired with a **small cyan icon** (lucide) |
| Addresses / hashes | `font-mono text-sm` in tables or summaries |
| Table headers | `text-gray-400` |

---

## Layout patterns

### A. Full-screen “Grant Pay” style (primary marketing form)

1. **Root:** `min-h-screen`, vertical gradient background **gray-900 → black**, `text-white`.
2. **Header band:** Full width, `border-b border-gray-800/50`, `bg-black/50 backdrop-blur-xl`, generous padding (`px-6 py-8`), **centered container** (`container mx-auto`).
3. **Hero:** Gradient **“Grant Pay”** title + one-line **gray-400** subtitle (“Create a new grant payment with vesting schedule” or equivalent).
4. **Main column:** `container mx-auto px-6 py-8`, inner **max width** `max-w-2xl mx-auto` for the form card (single-column, focused).
5. **Card:** shadcn `Card` with `bg-gray-900/50 border-gray-800`, `CardHeader` + `CardTitle` + `CardDescription` (muted), `CardContent` with `space-y-6` form fields.

### B. Wallet shell (sidebar layout)

Used when the route is **not** the full-screen home pattern in the reference app:

1. **Sidebar** (left): Collapsible; flashy **purple → cyan → magenta** gradient background with blur and white/20 border (`sidebar-flashy-bg` concept). Menu items with icons; mobile: overlay drawer, 44px min touch height.
2. **Main:** `SidebarInset` — column flex, **max height** screen, scroll inside content.
3. **Top bar:** Horizontal strip with **sidebar trigger** (hamburger), right side **muted label** “Wallet Management”, **bottom border** `border-[#0088ff33]`, padding `p-4`.
4. **Content area:** `flex-1 overflow-auto p-4`.

### C. Alternate page wrapper (`PageLayout` pattern)

Some pages use a **diagonal dark gradient** background: `bg-gradient-to-br from-[#1A1F2C] via-[#131522] to-[#0c0c13]`, full width, optional **breadcrumb** row with **cyan** links (`#1EAEDB`), bold segment labels.

---

## Component recipes

### Primary button

- Filled: `bg-[#1EAEDB] hover:bg-[#00eeff] text-black font-semibold`, large size, full width when stacked.
- Outline: `border-[#1EAEDB] text-[#1EAEDB] hover:bg-[#1EAEDB]/10` (or `hover:bg-[#1EAEDB] hover:text-black` for emphasis).

### Text inputs (dark)

- `bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#1EAEDB]`
- Optional **right icon** (e.g. search) absolutely positioned, `text-gray-400`.

### Identity / wallet row

- Horizontal flex: **Avatar** (gradient fallback with initials) + two-line address (truncated) + **outline** “Manage” button (cyan border).

### Combobox / search dropdown

- Absolutely positioned below input, `z-10`, `bg-gray-900 border border-gray-700 rounded-lg shadow-lg`, `max-h-60 overflow-y-auto`, rows `hover:bg-gray-800`, optional avatar + name + truncated address.

### Modal (preview / success)

- `DialogContent`: `max-w-3xl` (wide preview), `bg-gray-900 border-gray-800 text-white`.
- Modal title: same **cyan gradient text** as page hero.
- Success state: celebratory copy + optional app ID in monospace.

### Data table (inside modal)

- `Table` with `TableHead` cells in **gray-400**, value cells **white** or **font-mono** for addresses/amounts.

### Vesting preview chart (inline SVG)

- Chart area: `h-64 bg-black/30 rounded-lg border border-gray-800 p-6`.
- Line stroke `#1EAEDB`, fill under curve with **linear gradient** `#1EAEDB` → `#00eeff` at ~30% opacity.
- Grid: subtle gray dashed lines. Y-axis label rotated: “Locked Amount” in `text-xs text-gray-400`.

---

## Iconography

- **Wallet / recipient:** `Wallet`
- **Amount:** `DollarSign`
- **Search:** `Search` (input affordance)
- **User / identity:** `User`
- **Preview:** `BarChart3`
- **Check / success:** `Check` (cyan when selected)
- **Copy:** `Copy`

Keep icons **small** and **cyan-tinted** (`text-[#1EAEDB]`) next to labels.

---

## Mobile behavior

- **Sidebar:** Fixed overlay on small screens; slide-in animation; content scrolls inside sidebar.
- **Sheets / drawers:** Full viewport height on iOS; use safe-area-friendly max heights where Radix allows.
- **Touch:** Menu buttons **min-height ~44px**, comfortable padding.

---

## Copy patterns (for placeholder text)

- Page: **“Grant Pay”** + subtitle about **vesting schedule** / **grant payment**.
- Form: **“Grant Payment Details”**, **“Recipient Address or enVOI Name”**, **“Grant Amount”**, **“Preview Grant”**, **“Create Grant Payment”** / **“Connect Wallet”**.
- Connected user line: **“Connected Account”**.
- Wallet layout header: **“Wallet Management”**.

Adjust wording for your product, but **keep structure**: hero → single card form → primary CTA → optional preview dialog.

---

## What to tell Lovable (example prompt fragment)

> Build a **dark** React + Tailwind + shadcn UI page: **black / gray-900** gradient background, **cyan (#1EAEDB)** and **bright cyan (#00eeff)** gradient titles, **max-w-2xl** centered **Card** with semi-transparent **gray-900** surface and **gray-800** borders. Form uses **white** text, **gray-400** descriptions, inputs with **black/50** background and **cyan** focus ring. Primary button: **cyan fill**, **black** text, hover to **#00eeff**. Secondary actions: **cyan outline**. Include **lucide** icons beside labels. Optional **Dialog** preview with **Table** and a simple **SVG** vesting chart in cyan. Match a **DeFi wallet** aesthetic — no light theme.

---

## File map (reference implementation)

| Area | Location in repo |
|------|------------------|
| Global theme & utilities | `src/index.css` (`:root`, `.constellation-bg`, glass helpers) |
| Tailwind theme | `tailwind.config.ts` |
| Grant Pay screen | `src/pages/GrantPay.tsx` |
| Wallet chrome | `src/App.tsx` (sidebar layout), `src/components/AppSidebar.tsx` |
| Shared page wrapper | `src/components/PageLayout.tsx` |
| shadcn config | `components.json` |

This UI doc is **descriptive**; implementation details may differ slightly in code, but **colors, spacing hierarchy, and component choices** should stay aligned for a consistent rebuild.
