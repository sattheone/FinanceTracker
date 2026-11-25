/**
 * Monthly summary math (schema v2).
 *
 * KEEP IN SYNC with functions/src/summaryMath.ts (Cloud Functions). The client
 * uses the same rules to patch summaries optimistically, so the two copies
 * must produce identical numbers.
 *
 * Doc: users/{userId}/monthlySummaries/{YYYY-MM}
 *   byType        { [rawType]: { [categoryId]: amount } }  - every transaction, transfers included,
 *                 keyed by the transaction's raw `type` so the client can re-resolve the
 *                 financial role with its category definitions (resolveTransactionType).
 *   categoryTotals { [categoryId]: amount }  - non-transfer only (legacy, used by CategoryOverview)
 *   expense / income / investment            - non-transfer totals by raw type
 *   totalSpent                               - expense + investment
 *   txCount                                  - number of transactions in the month
 */

export const SUMMARY_SCHEMA_VERSION = 2;

/** Transactions with a full timestamp are bucketed in this zone (the app's users are in India). */
export const SUMMARY_TIME_ZONE = "Asia/Kolkata";

export type SummaryTxType = "expense" | "income" | "investment" | "transfer";

export interface SummaryTx {
  amount?: number;
  category?: string;
  type?: string;
  date?: string;
}

export interface SummaryDelta {
  year: number;
  month: number;
  byType: Record<string, Record<string, number>>;
  categoryTotals: Record<string, number>;
  expense: number;
  income: number;
  investment: number;
  totalSpent: number;
  txCount: number;
}

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SUMMARY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});

/** "YYYY-MM" for a transaction date, or null when the date is unusable. */
export function summaryMonthKey(date: string | undefined | null): string | null {
  if (!date) return null;
  // Date-only strings are calendar dates: take them literally.
  const dateOnly = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}`;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = monthFormatter.formatToParts(parsed);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return year && month ? `${year}-${month}` : null;
}

export function normalizeSummaryType(type: string | undefined): SummaryTxType {
  if (type === "income" || type === "investment" || type === "transfer") return type;
  return "expense";
}

function emptyDelta(monthKey: string): SummaryDelta {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    year, month, byType: {}, categoryTotals: {},
    expense: 0, income: 0, investment: 0, totalSpent: 0, txCount: 0,
  };
}

/**
 * Add (sign = 1) or remove (sign = -1) one transaction's contribution
 * into a map of per-month deltas.
 */
export function accumulateSummaryDelta(
  deltas: Map<string, SummaryDelta>,
  tx: SummaryTx,
  sign: 1 | -1
): void {
  const monthKey = summaryMonthKey(tx.date);
  if (!monthKey) return;
  const amount = (Number(tx.amount) || 0) * sign;
  const categoryId = tx.category || "uncategorized";
  const type = normalizeSummaryType(tx.type);

  let delta = deltas.get(monthKey);
  if (!delta) {
    delta = emptyDelta(monthKey);
    deltas.set(monthKey, delta);
  }

  delta.txCount += sign;
  const typeMap = delta.byType[type] || (delta.byType[type] = {});
  typeMap[categoryId] = (typeMap[categoryId] || 0) + amount;

  const isTransfer = type === "transfer" || categoryId === "transfer";
  if (isTransfer) return;

  delta.categoryTotals[categoryId] = (delta.categoryTotals[categoryId] || 0) + amount;
  if (type === "income") {
    delta.income += amount;
  } else if (type === "investment") {
    delta.investment += amount;
    delta.totalSpent += amount;
  } else {
    delta.expense += amount;
    delta.totalSpent += amount;
  }
}

/** True when the delta changes nothing (e.g. an edit that touched no summary field). */
export function isEmptyDelta(delta: SummaryDelta): boolean {
  if (delta.txCount !== 0 || delta.expense !== 0 || delta.income !== 0 || delta.investment !== 0) return false;
  for (const typeMap of Object.values(delta.byType)) {
    for (const value of Object.values(typeMap)) if (value !== 0) return false;
  }
  return true;
}
