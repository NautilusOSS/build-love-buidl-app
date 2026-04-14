/**
 * Matches and parses "Council Compensation" grant notes produced by Grant Pay
 * (`applyCouncilCompensationNoteTemplate` in GrantPay.tsx).
 *
 * Wallets / Arc may prepend a framework tag before the VF line, e.g.
 * `arccjs-v2.10.6:u custom VF-2026-04-8980 — Council Compensation — …`
 *
 * Shape (after optional prefix):
 *   VF-YYYY-MM-#### — Council Compensation — {name}
 *
 *   Council Pay | Cliff: {n}m | Duration: {n}m | Amount: {x} VOI | Start: YYYY-MM-DD
 */

export type CouncilCompensationParsed = {
  vfPrefix: string;
  displayName: string;
  cliffMonths: number;
  durationMonths: number;
  /** Amount as written in the note (number or placeholder like "X"). */
  amountDisplay: string;
  startDate: string;
};

const DASH = "[\\u2014\\u2013-]"; // em dash, en dash, ASCII hyphen

/** Header: VF-… — Council Compensation — … */
const HEADER_RE = new RegExp(
  `^(VF-\\d{4}-\\d{2}-\\d+)\\s*${DASH}\\s*Council Compensation\\s*${DASH}\\s*(.+)$`,
  "im"
);

/** Body: Council Pay | Cliff: … | Duration: … | Amount: … VOI | Start: … */
const BODY_RE = new RegExp(
  "^Council Pay\\s*\\|\\s*Cliff:\\s*(\\d+)m\\s*\\|\\s*Duration:\\s*(\\d+)m\\s*\\|\\s*Amount:\\s*(.+?)\\s*VOI\\s*\\|\\s*Start:\\s*(\\d{4}-\\d{2}-\\d{2})\\s*$",
  "im"
);

const VF_TOKEN_RE = /(VF-\d{4}-\d{2}-\d+)/;

function normalizeNoteWhitespace(note: string): string {
  return note.replace(/^\ufeff/, "").replace(/\r\n/g, "\n").trim();
}

/**
 * Arc / txn libraries may prefix the user note; council fields always include `VF-…`.
 */
function sliceFromVfToken(text: string): string {
  const m = VF_TOKEN_RE.exec(text);
  if (!m || m.index === undefined) return "";
  return text.slice(m.index);
}

function councilNoteCore(note: string): string | null {
  const n = normalizeNoteWhitespace(note);
  if (!n) return null;
  const core = sliceFromVfToken(n);
  if (!core) return null;
  if (!core.includes("Council Compensation") || !core.includes("Council Pay")) {
    return null;
  }
  if (!/^VF-\d{4}-\d{2}-\d+/m.test(core)) return null;
  return core;
}

export function matchCouncilCompensationNote(note: string): boolean {
  return councilNoteCore(note) != null;
}

export function parseCouncilCompensationNote(
  note: string
): CouncilCompensationParsed | null {
  const core = councilNoteCore(note);
  if (!core) return null;

  const headerMatch = core.match(HEADER_RE);
  const bodyMatch = core.match(BODY_RE);
  if (!headerMatch || !bodyMatch) return null;

  return {
    vfPrefix: headerMatch[1].trim(),
    displayName: headerMatch[2].trim(),
    cliffMonths: parseInt(bodyMatch[1], 10),
    durationMonths: parseInt(bodyMatch[2], 10),
    amountDisplay: bodyMatch[3].trim(),
    startDate: bodyMatch[4].trim(),
  };
}
