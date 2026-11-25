import { Transaction, RecurringTransaction } from '../types';
import { Category, getCategoryTransactionType } from '../constants/categories';
import { extractMerchant, normalizeMerchant } from '../utils/merchantSimilarity';

/**
 * Detects monthly recurring payments (rent, EMIs, subscriptions, chit, SIPs, bills)
 * from transaction history so the user can promote them to recurring items.
 *
 * Pure and synchronous: works only on transactions already in memory.
 */

export interface RecurringSuggestion {
  /** Stable id used for dismissals */
  id: string;
  name: string;
  category: string;
  type: Transaction['type'];
  /** Typical (median) amount */
  amount: number;
  minAmount: number;
  maxAmount: number;
  /** True when the amount moves noticeably month to month (e.g. electricity) */
  amountVaries: boolean;
  /** Typical day of the month the payment lands on */
  dayOfMonth: number;
  /** Number of distinct months the payment was seen in */
  monthsSeen: number;
  firstDate: string;
  lastDate: string;
  nextDueDate: string;
  bankAccountId?: string;
  confidence: 'high' | 'medium';
  /** Matched transactions, newest first */
  transactions: Transaction[];
}

// Outgoing money only — income and transfers between own accounts are not bills.
const OUTFLOW_TYPES = new Set<Transaction['type']>(['expense', 'insurance', 'investment']);

const MIN_MONTHS = 3;
const MAX_TXNS_PER_MONTH = 1.34;   // allows the odd duplicate/split month
const MIN_REGULARITY = 0.75;       // months seen / months spanned
const MAX_MONTH_GAP = 2;           // a single skipped month is tolerated
const STABLE_AMOUNT_TOLERANCE = 0.15;
const STRICT_AMOUNT_TOLERANCE = 0.05; // sub-groups of a frequently used merchant must be near-exact
const VARIABLE_AMOUNT_TOLERANCE = 0.5;
const MAX_DAY_DEVIATION = 6;       // mean distance (days) from the typical day
const AMOUNT_CLUSTER_RATIO = 1.25; // same merchant, different plans → separate items

const parseLocalDate = (value: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
};

const formatLocalDate = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const mode = <T,>(values: T[]): T | undefined => {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) || 0) + 1;
    counts.set(v, c);
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
};

/** Distance between two days of the month, treating the month as circular (30 → 1 is close). */
const dayDistance = (a: number, b: number) => {
  const diff = Math.abs(a - b);
  return Math.min(diff, 30.4 - diff);
};

/** Typical day + mean deviation, robust to payments that straddle the month boundary. */
const typicalDay = (days: number[]): { day: number; deviation: number } => {
  let bestDay = days[0];
  let bestCost = Infinity;
  for (let candidate = 1; candidate <= 31; candidate++) {
    const cost = days.reduce((sum, d) => sum + dayDistance(d, candidate), 0);
    if (cost < bestCost) { bestCost = cost; bestDay = candidate; }
  }
  return { day: bestDay, deviation: bestCost / days.length };
};

const merchantKeyOf = (t: Transaction): string =>
  normalizeMerchant(t.merchantKey || extractMerchant(t.description || ''));

const NOISE_WORDS = /\b(COM|WWW|IN|PVT|LTD|PRIVATE|LIMITED)\b/g;

const displayName = (text: string) =>
  text
    .toUpperCase()
    .replace(NOISE_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, c => c.toUpperCase());

/** First due date on or after today, starting the billing month after the last payment. */
const nextDueAfter = (lastBillingMonth: number, day: number, today: Date): Date => {
  const build = (index: number) => {
    const year = Math.floor(index / 12);
    const month = index % 12;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, daysInMonth));
  };
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let index = lastBillingMonth + 1;
  let next = build(index);
  while (next < startOfToday) next = build(++index);
  return next;
};

/** Split one merchant's payments into groups of similar amount (e.g. two plans from the same telco). */
const clusterByAmount = (txns: Transaction[]): Transaction[][] => {
  const sorted = [...txns].sort((a, b) => a.amount - b.amount);
  const clusters: Transaction[][] = [];
  let current: Transaction[] = [];
  for (const t of sorted) {
    if (current.length === 0 || t.amount <= current[0].amount * AMOUNT_CLUSTER_RATIO) {
      current.push(t);
    } else {
      clusters.push(current);
      current = [t];
    }
  }
  if (current.length) clusters.push(current);
  return clusters;
};

interface Evaluation {
  suggestion: Omit<RecurringSuggestion, 'id' | 'name' | 'category' | 'type'>;
}

const evaluate = (txns: Transaction[], today: Date, strictAmount = false): Evaluation | null => {
  const dated = txns
    .map(t => ({ t, d: parseLocalDate(t.date) }))
    .filter(x => !Number.isNaN(x.d.getTime()))
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  if (dated.length < MIN_MONTHS) return null;

  const { day, deviation } = typicalDay(dated.map(x => x.d.getDate()));
  if (deviation > MAX_DAY_DEVIATION) return null;

  // Bucket by "billing month" centred on the typical day, so a bill normally paid
  // on the 30th that slips to the 1st still counts for the month it belongs to.
  const billingMonth = (d: Date) =>
    monthIndex(new Date(d.getFullYear(), d.getMonth(), d.getDate() + (15 - day)));
  const months = [...new Set(dated.map(x => billingMonth(x.d)))].sort((a, b) => a - b);
  if (months.length < MIN_MONTHS) return null;
  if (dated.length / months.length > MAX_TXNS_PER_MONTH) return null;

  // Still active: seen this month or within the last two months
  if (months[months.length - 1] < monthIndex(today) - 2) return null;

  const span = months[months.length - 1] - months[0] + 1;
  if (months.length / span < MIN_REGULARITY) return null;
  for (let i = 1; i < months.length; i++) {
    if (months[i] - months[i - 1] > MAX_MONTH_GAP) return null;
  }

  const amounts = dated.map(x => x.t.amount);
  const typicalAmount = median(amounts);
  if (typicalAmount <= 0) return null;
  const relDiff = (a: number) => Math.abs(a - typicalAmount) / typicalAmount;
  if (strictAmount && !amounts.every(a => relDiff(a) <= STRICT_AMOUNT_TOLERANCE)) return null;
  const withinStable = amounts.filter(a => relDiff(a) <= STABLE_AMOUNT_TOLERANCE).length;
  const stable = withinStable / amounts.length >= 0.8;
  const withinVariable = amounts.every(a => relDiff(a) <= VARIABLE_AMOUNT_TOLERANCE);
  if (!stable && !(withinVariable && months.length >= 4)) return null;

  const regularity = months.length / span;
  const confidence: 'high' | 'medium' =
    stable && deviation <= 3 && months.length >= 4 && regularity >= 0.9 ? 'high' : 'medium';

  const first = dated[0];
  const last = dated[dated.length - 1];

  return {
    suggestion: {
      amount: Math.round(typicalAmount),
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
      amountVaries: !stable,
      dayOfMonth: day,
      monthsSeen: months.length,
      firstDate: formatLocalDate(first.d),
      lastDate: formatLocalDate(last.d),
      nextDueDate: formatLocalDate(nextDueAfter(months[months.length - 1], day, today)),
      bankAccountId: mode(dated.map(x => x.t.bankAccountId).filter(Boolean) as string[]),
      confidence,
      transactions: dated.map(x => x.t).reverse(),
    },
  };
};

/** True when an existing recurring item already covers this merchant. */
const coveredByExisting = (merchantKey: string, existing: RecurringTransaction[]): boolean =>
  existing.some(rt => {
    const keys = [rt.vendor, rt.name, rt.description]
      .filter(Boolean)
      .map(v => normalizeMerchant(extractMerchant(v as string)))
      .filter(k => k.length >= 3);
    return keys.some(k => k === merchantKey || (merchantKey.length >= 4 && (k.includes(merchantKey) || merchantKey.includes(k))));
  });

export const detectRecurringExpenses = (
  transactions: Transaction[],
  categories: Category[],
  existingRecurring: RecurringTransaction[],
  today: Date = new Date()
): RecurringSuggestion[] => {
  const typeCache = new Map<string, string>();
  const resolveType = (categoryId: string) => {
    if (!typeCache.has(categoryId)) typeCache.set(categoryId, getCategoryTransactionType(categoryId, categories));
    return typeCache.get(categoryId) as Transaction['type'];
  };

  // 1. Candidate payments grouped by merchant
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.isSplitParent || t.recurringTransactionId || !(t.amount > 0)) continue;
    if (!t.category || t.category === 'transfer') continue;
    if (!OUTFLOW_TYPES.has(resolveType(t.category))) continue;
    const key = merchantKeyOf(t);
    if (key.length < 3) continue;
    const list = byMerchant.get(key);
    if (list) list.push(t); else byMerchant.set(key, [t]);
  }

  const suggestions: RecurringSuggestion[] = [];

  for (const [merchantKey, txns] of byMerchant) {
    if (txns.length < MIN_MONTHS) continue;
    if (coveredByExisting(merchantKey, existingRecurring)) continue;

    // Try the merchant as one item first (handles variable bills); if it's paid
    // several times a month, look for regular sub-groups by amount instead.
    const whole = evaluate(txns, today);
    const groups: { evaluation: Evaluation; clustered: boolean }[] = whole
      ? [{ evaluation: whole, clustered: false }]
      : clusterByAmount(txns)
          .map(cluster => evaluate(cluster, today, true))
          .filter((e): e is Evaluation => e !== null)
          .map(evaluation => ({ evaluation, clustered: true }));

    for (const { evaluation, clustered } of groups) {
      const matched = evaluation.suggestion.transactions;
      const category = mode(matched.map(t => t.category)) || matched[0].category;
      const merchantLabel = extractMerchant(matched[0].description || '');
      const name = (displayName(merchantLabel.length >= 3 ? merchantLabel : matched[0].description) || matched[0].description).slice(0, 60);
      const amountBucket = Math.round(Math.log(evaluation.suggestion.amount) / Math.log(AMOUNT_CLUSTER_RATIO));

      suggestions.push({
        ...evaluation.suggestion,
        id: clustered ? `${merchantKey}@${amountBucket}` : merchantKey,
        name,
        category,
        type: resolveType(category),
      });
    }
  }

  return suggestions.sort((a, b) =>
    a.confidence === b.confidence ? b.amount - a.amount : a.confidence === 'high' ? -1 : 1
  );
};
