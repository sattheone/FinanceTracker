import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, increment, writeBatch, Timestamp, serverTimestamp, DocumentData, DocumentReference } from 'firebase/firestore';
import { Transaction } from '../types';
import { accumulateSummaryDelta, isEmptyDelta, SummaryDelta, SummaryTx, SUMMARY_SCHEMA_VERSION, NO_CATEGORY_KEY } from './summaryMath';

export interface CategorySummary {
  id: string;
  userId: string;
  year: number;
  month: number;
  categoryId: string;
  totalSpent: number;
  transactionCount: number;
  lastUpdated: Date;
}

/**
 * Generate a unique ID for a category summary document
 */
const getSummaryId = (year: number, month: number, categoryId: string): string => {
  return `${year}-${String(month).padStart(2, '0')}-${categoryId}`;
};

/**
 * Update category summary when a transaction is added
 * Uses setDoc with merge to avoid a read — works whether doc exists or not.
 */
export const incrementCategorySummary = async (
  userId: string,
  transaction: Transaction
): Promise<void> => {
  // Transfers are net-neutral and do not count toward category spending totals
  if (transaction.type === 'transfer' || transaction.category === 'transfer') return;

  const date = new Date(transaction.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-based month
  const categoryId = transaction.category || 'uncategorized';
  
  const summaryId = getSummaryId(year, month, categoryId);
  const summaryRef = doc(db, `users/${userId}/categorySummaries`, summaryId);
  
  try {
    // setDoc with merge: creates if missing, updates if existing — 1 write, 0 reads
    await setDoc(summaryRef, {
      userId,
      year,
      month,
      categoryId,
      totalSpent: increment(transaction.amount),
      transactionCount: increment(1),
      lastUpdated: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating category summary:', error);
  }
};

/**
 * Update category summary when a transaction is deleted
 * Uses increment(-amount) to avoid a read — single write operation.
 */
export const decrementCategorySummary = async (
  userId: string,
  transaction: Transaction
): Promise<void> => {
  // Transfers are net-neutral
  if (transaction.type === 'transfer' || transaction.category === 'transfer') return;

  const date = new Date(transaction.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const categoryId = transaction.category || 'uncategorized';
  
  const summaryId = getSummaryId(year, month, categoryId);
  const summaryRef = doc(db, `users/${userId}/categorySummaries`, summaryId);
  
  try {
    // Use setDoc with merge + increment to avoid reading first.
    // If tranCount goes to 0, a cleanup pass on next sync can remove empty docs.
    await setDoc(summaryRef, {
      userId,
      year,
      month,
      categoryId,
      totalSpent: increment(-transaction.amount),
      transactionCount: increment(-1),
      lastUpdated: new Date(),
    }, { merge: true });
  } catch (error) {
    console.debug('Decrement category summary skipped:', summaryId, error);
  }
};

/**
 * Update category summary when a transaction is modified
 * Uses setDoc with merge + increment for zero-read updates.
 */
export const updateCategorySummary = async (
  userId: string,
  oldTransaction: Transaction,
  newTransaction: Transaction
): Promise<void> => {
  const oldDate = new Date(oldTransaction.date);
  const newDate = new Date(newTransaction.date);
  
  const oldYear = oldDate.getFullYear();
  const oldMonth = oldDate.getMonth() + 1;
  const oldCategory = oldTransaction.category || 'uncategorized';
  
  const newYear = newDate.getFullYear();
  const newMonth = newDate.getMonth() + 1;
  const newCategory = newTransaction.category || 'uncategorized';
  
  // If month, year, or category changed, need to update two summaries
  if (oldYear !== newYear || oldMonth !== newMonth || oldCategory !== newCategory) {
    await decrementCategorySummary(userId, oldTransaction);
    await incrementCategorySummary(userId, newTransaction);
  } else {
    // Same period and category, just update the amount difference
    const amountDiff = newTransaction.amount - oldTransaction.amount;
    
    if (Math.abs(amountDiff) > 0.01) {
      const summaryId = getSummaryId(newYear, newMonth, newCategory);
      const summaryRef = doc(db, `users/${userId}/categorySummaries`, summaryId);
      
      try {
        await setDoc(summaryRef, {
          userId,
          year: newYear,
          month: newMonth,
          categoryId: newCategory,
          totalSpent: increment(amountDiff),
          lastUpdated: new Date(),
        }, { merge: true });
      } catch (error) {
        console.error('Error updating category summary amount:', error);
      }
    }
  }
};

/**
 * Get category summaries for a specific year
 */
export const getCategorySummariesByYear = async (
  userId: string,
  year: number
): Promise<Map<string, number>> => {
  const summariesRef = collection(db, `users/${userId}/categorySummaries`);
  const q = query(summariesRef, where('year', '==', year));
  
  try {
    const snapshot = await getDocs(q);
    const categoryTotals = new Map<string, number>();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const currentTotal = categoryTotals.get(data.categoryId) || 0;
      categoryTotals.set(data.categoryId, currentTotal + data.totalSpent);
    });
    
    return categoryTotals;
  } catch (error) {
    console.error('Error fetching category summaries:', error);
    return new Map();
  }
};

/**
 * Get category summaries for a specific month
 */
export const getCategorySummariesByMonth = async (
  userId: string,
  year: number,
  month: number
): Promise<Map<string, number>> => {
  const summariesRef = collection(db, `users/${userId}/categorySummaries`);
  const q = query(
    summariesRef,
    where('year', '==', year),
    where('month', '==', month)
  );
  
  try {
    const snapshot = await getDocs(q);
    const categoryTotals = new Map<string, number>();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      categoryTotals.set(data.categoryId, data.totalSpent);
    });
    
    return categoryTotals;
  } catch (error) {
    console.error('Error fetching category summaries:', error);
    return new Map();
  }
};

/**
 * Get monthly spending totals for the chart (last N months)
 * Optimized: Uses monthly aggregate documents instead of per-category queries
 */
export const getMonthlySpendings = async (
  userId: string,
  monthsCount: number = 12
): Promise<{ year: number; month: number; totalSpent: number }[]> => {
  // For the chart, we can calculate from the category summaries we already fetch
  // This function is now a convenience wrapper
  const summaries = await getCategorySummariesForMonths(userId, monthsCount);
  
  // Aggregate by month
  const monthlyTotals = new Map<string, { year: number; month: number; total: number }>();
  
  summaries.forEach(s => {
    const key = `${s.year}-${s.month}`;
    if (!monthlyTotals.has(key)) {
      monthlyTotals.set(key, { year: s.year, month: s.month, total: 0 });
    }
    monthlyTotals.get(key)!.total += s.totalSpent;
  });
  
  return Array.from(monthlyTotals.values())
    .map(({ year, month, total }) => ({ year, month, totalSpent: total }))
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
};

/**
 * Get all category summaries for multiple months (for CategoryOverview)
 */
export const getCategorySummariesForMonths = async (
  userId: string,
  monthsCount: number = 12
): Promise<CategorySummary[]> => {
  const summariesRef = collection(db, `users/${userId}/categorySummaries`);
  
  try {
    const now = new Date();
    const startYear = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1).getFullYear();
    
    const q = query(summariesRef, where('year', '>=', startYear));
    const snapshot = await getDocs(q);
    
    const summaries: CategorySummary[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      summaries.push({
        id: doc.id,
        userId: data.userId,
        year: data.year,
        month: data.month,
        categoryId: data.categoryId,
        totalSpent: data.totalSpent,
        transactionCount: data.transactionCount,
        lastUpdated: data.lastUpdated?.toDate?.() || new Date()
      });
    });
    
    return summaries;
  } catch (error) {
    console.error('Error fetching category summaries:', error);
    return [];
  }
};

// ============================================================
// OPTIMIZED MONTHLY SUMMARY - One document per month
// This reduces reads from ~400 (40 cats × 12 months) to ~12
// ============================================================

export interface MonthlySummary {
  id: string; // Format: "YYYY-MM"
  userId: string;
  year: number;
  month: number; // 1-12
  categoryTotals: Record<string, number>; // { categoryId: totalSpent }
  totalSpent: number; // Sum of all categories
  expense: number; // Total expense amount
  income: number; // Total income amount
  investment: number; // Total investment amount
  /** v2: { [rawTransactionType]: { [categoryId]: amount } }, transfers included */
  byType?: Record<string, Record<string, number>>;
  /** v3: { [bankAccountId]: month's balance effect } */
  accountNet?: Record<string, number>;
  txCount?: number;
  schemaVersion?: number;
  lastUpdated: Date;
}

interface YearlySummary {
  id: string; // Format: "YYYY"
  userId: string;
  year: number;
  categoryTotals: Record<string, number>;
  totalSpent: number;
  lastUpdated: Date;
}

// Module-level cache for monthly summaries (survives component remounts)
const monthlySummaryCache = new Map<string, MonthlySummary | null>();
const monthlySummaryInFlight = new Map<string, Promise<MonthlySummary | null>>();
const yearlySummaryCache = new Map<string, YearlySummary | null>();
const yearlySummaryInFlight = new Map<string, Promise<YearlySummary | null>>();

// Cache for getAllOptimizedMonthlySummaries (keyed by userId)
let allMonthlySummariesCache = new Map<string, MonthlySummary[]>();
let allMonthlySummariesInFlight = new Map<string, Promise<MonthlySummary[]>>();

// Track current userId so clearCategorySummaryCache can evict the right LS key
let _currentUserId: string | null = null;
export const setCurrentUserId = (userId: string | null) => { _currentUserId = userId; };

const MONTHLY_SUMMARIES_LS_KEY = (userId: string) => `allMonthlySummaries:v1:${userId}`;

/**
 * Clear the category summary cache (call after transactions are added/updated/deleted)
 */
export const clearCategorySummaryCache = () => {
  monthlySummaryCache.clear();
  monthlySummaryInFlight.clear();
  yearlySummaryCache.clear();
  yearlySummaryInFlight.clear();
  allMonthlySummariesCache.clear();
  allMonthlySummariesInFlight.clear();
  if (_currentUserId) {
    try { localStorage.removeItem(MONTHLY_SUMMARIES_LS_KEY(_currentUserId)); } catch { /* ignore */ }
  }
};



/**
 * Get optimized monthly summary for a specific month (1 read, cached)
 */
export const getOptimizedMonthlySummary = async (
  userId: string,
  year: number,
  month: number
): Promise<MonthlySummary | null> => {
  const summaryId = `${year}-${String(month).padStart(2, '0')}`;
  const cacheKey = `${userId}:${summaryId}`;
  
  // Return from cache if available
  if (monthlySummaryCache.has(cacheKey)) {
    return monthlySummaryCache.get(cacheKey)!;
  }

  const inFlight = monthlySummaryInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }
  
  const summaryRef = doc(db, `users/${userId}/monthlySummaries`, summaryId);
  
  const request = (async () => {
    try {
      const summaryDoc = await getDoc(summaryRef);
      if (summaryDoc.exists()) {
        const data = summaryDoc.data();
        const result: MonthlySummary = {
          id: summaryDoc.id,
          userId: data.userId,
          year: data.year,
          month: data.month,
          categoryTotals: data.categoryTotals || {},
          totalSpent: data.totalSpent || 0,
          expense: data.expense || 0,
          income: data.income || 0,
          investment: data.investment || 0,
          lastUpdated: data.lastUpdated?.toDate?.() || new Date()
        };
        monthlySummaryCache.set(cacheKey, result);
        return result;
      }
      monthlySummaryCache.set(cacheKey, null);
      return null;
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      return null;
    }
  })();

  monthlySummaryInFlight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    monthlySummaryInFlight.delete(cacheKey);
  }
};

/**
 * Get optimized monthly summaries for the last N months (N reads max)
 */
export const getOptimizedMonthlySummaries = async (
  userId: string,
  monthsCount: number = 12
): Promise<MonthlySummary[]> => {
  console.log(`[CategorySummary] Loading ${monthsCount} optimized monthly summaries`);
  const now = new Date();
  const summaries: MonthlySummary[] = [];
  const promises: Promise<MonthlySummary | null>[] = [];
  
  // Generate month keys for the range
  for (let i = 0; i < monthsCount; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    promises.push(getOptimizedMonthlySummary(userId, date.getFullYear(), date.getMonth() + 1));
  }
  
  const results = await Promise.all(promises);
  results.forEach(summary => {
    if (summary) {
      summaries.push(summary);
    }
  });
  
  return summaries;
};

export const getAllOptimizedMonthlySummaries = async (
  userId: string
): Promise<MonthlySummary[]> => {
  // Return from memory cache if available (survives component remounts)
  if (allMonthlySummariesCache.has(userId)) {
    return allMonthlySummariesCache.get(userId)!;
  }

  // Check localStorage cache (survives page refresh — offline-first)
  try {
    const ls = localStorage.getItem(MONTHLY_SUMMARIES_LS_KEY(userId));
    if (ls) {
      const parsed: MonthlySummary[] = JSON.parse(ls);
      const withDates = parsed.map(s => ({ ...s, lastUpdated: new Date(s.lastUpdated) }));
      allMonthlySummariesCache.set(userId, withDates);
      return withDates;
    }
  } catch { /* ignore parse errors */ }

  // Deduplicate concurrent requests
  const inFlight = allMonthlySummariesInFlight.get(userId);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    try {
      const summariesRef = collection(db, `users/${userId}/monthlySummaries`);
      const snapshot = await getDocs(summariesRef);
      const summaries: MonthlySummary[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const result: MonthlySummary = {
          id: docSnap.id,
          userId: data.userId,
          year: data.year,
          month: data.month,
          categoryTotals: data.categoryTotals || {},
          totalSpent: data.totalSpent || 0,
          expense: data.expense || 0,
          income: data.income || 0,
          investment: data.investment || 0,
          byType: data.byType,
          accountNet: data.accountNet,
          txCount: data.txCount,
          schemaVersion: data.schemaVersion,
          lastUpdated: data.lastUpdated?.toDate?.() || new Date()
        };

        summaries.push(result);
        monthlySummaryCache.set(`${userId}:${docSnap.id}`, result);
      });

      const sorted = summaries.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      allMonthlySummariesCache.set(userId, sorted);
      try { localStorage.setItem(MONTHLY_SUMMARIES_LS_KEY(userId), JSON.stringify(sorted)); } catch { /* quota exceeded — ignore */ }
      return sorted;
    } catch (error) {
      console.error('Error fetching all optimized monthly summaries:', error);
      return [];
    }
  })();

  allMonthlySummariesInFlight.set(userId, request);

  try {
    return await request;
  } finally {
    allMonthlySummariesInFlight.delete(userId);
  }
};

/**
 * Get category totals for a specific month using optimized structure (1 read)
 */
export const getOptimizedCategorySummariesByMonth = async (
  userId: string,
  year: number,
  month: number
): Promise<Map<string, number>> => {
  console.log(`[CategorySummary] Loading live category summary for ${year}-${month}`);
  const categoryTotals = new Map<string, number>();
  
  try {
    const summariesRef = collection(db, `users/${userId}/categorySummaries`);
    const q = query(
      summariesRef,
      where('year', '==', year),
      where('month', '==', month)
    );
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const categoryId = data.categoryId || 'uncategorized';
      const amount = data.totalSpent || 0;
      categoryTotals.set(categoryId, (categoryTotals.get(categoryId) || 0) + amount);
    });
  } catch (error) {
    console.error('Error fetching monthly category summaries from collection:', error);
  }
  
  return categoryTotals;
};

/**
 * Get category totals for a year using optimized structure
 */
export const getOptimizedCategorySummariesByYear = async (
  userId: string,
  year: number
): Promise<Map<string, number>> => {
  console.log(`[CategorySummary] Loading live category summaries for year ${year}`);

  const categoryTotals = new Map<string, number>();
  
  try {
    const summariesRef = collection(db, `users/${userId}/categorySummaries`);
    const q = query(summariesRef, where('year', '==', year));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const categoryId = data.categoryId || 'uncategorized';
      const amount = data.totalSpent || 0;
      categoryTotals.set(categoryId, (categoryTotals.get(categoryId) || 0) + amount);
    });
  } catch (error) {
    console.error('Error fetching yearly category summaries from collection:', error);
  }
  
  return categoryTotals;
};

/**
 * Rebuild optimized monthly summaries (one doc per month)
 */
export const rebuildOptimizedMonthlySummaries = async (
  userId: string,
  _transactions: Transaction[]
): Promise<void> => {
  // Always rebuild from every transaction in Firestore, not the (possibly partial) loaded set.
  await rebuildMonthlySummariesClient(userId);
  clearCategorySummaryCache();
  await refreshMonthlySummaries(userId, { full: true });
};

/**
 * Rebuild all summaries for a user (for migration or data fix)
 */
export const rebuildCategorySummaries = async (
  userId: string,
  transactions: Transaction[]
): Promise<void> => {
  const summaries = new Map<string, {
    year: number;
    month: number;
    categoryId: string;
    totalSpent: number;
    transactionCount: number;
  }>();
  
  // Aggregate all transactions
  transactions.forEach((txn) => {
    if (txn.type === 'transfer' || txn.category === 'transfer') return;

    const date = new Date(txn.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const categoryId = txn.category || 'uncategorized';
    const summaryId = getSummaryId(year, month, categoryId);
    
    if (!summaries.has(summaryId)) {
      summaries.set(summaryId, {
        year,
        month,
        categoryId,
        totalSpent: 0,
        transactionCount: 0,
      });
    }
    
    const summary = summaries.get(summaryId)!;
    summary.totalSpent += txn.amount;
    summary.transactionCount += 1;
  });
  
  // Write all summaries in batches
  const batch = writeBatch(db);
  let batchCount = 0;
  
  summaries.forEach((summary, summaryId) => {
    const summaryRef = doc(db, `users/${userId}/categorySummaries`, summaryId);
    batch.set(summaryRef, {
      userId,
      ...summary,
      lastUpdated: new Date(),
    });
    batchCount++;
    
    // Firestore batch limit is 500 operations
    if (batchCount >= 400) {
      batch.commit();
      batchCount = 0;
    }
  });
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ Rebuilt ${summaries.size} category summaries`);
};



// ============================================================
// v2 helpers: incremental refresh + optimistic patching
// ============================================================

const SUMMARY_SYNC_LS_KEY = (userId: string) => `monthlySummariesSync:v1:${userId}`;
const FULL_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

interface SummarySyncState {
  /** Highest lastUpdated (ms) seen from the server */
  lastSeen: number;
  /** When the whole collection was last fetched (ms) */
  lastFull: number;
  /** Summary schema the local copy was fetched with; a newer schema forces a full fetch */
  schema?: number;
}

const readSyncState = (userId: string): SummarySyncState | null => {
  try {
    const raw = localStorage.getItem(SUMMARY_SYNC_LS_KEY(userId));
    return raw ? JSON.parse(raw) as SummarySyncState : null;
  } catch { return null; }
};

const writeSyncState = (userId: string, state: SummarySyncState) => {
  try { localStorage.setItem(SUMMARY_SYNC_LS_KEY(userId), JSON.stringify(state)); } catch { /* ignore */ }
};

const sortSummaries = (list: MonthlySummary[]) =>
  [...list].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));

const docToSummary = (id: string, data: any): MonthlySummary => ({
  id,
  userId: data.userId,
  year: data.year,
  month: data.month,
  categoryTotals: data.categoryTotals || {},
  totalSpent: data.totalSpent || 0,
  expense: data.expense || 0,
  income: data.income || 0,
  investment: data.investment || 0,
  byType: data.byType,
  accountNet: data.accountNet,
  txCount: data.txCount,
  schemaVersion: data.schemaVersion,
  lastUpdated: data.lastUpdated?.toDate?.() || new Date(),
});

/** Replace the in-memory + localStorage copy of all monthly summaries. */
export const storeMonthlySummaries = (userId: string, summaries: MonthlySummary[]) => {
  const sorted = sortSummaries(summaries);
  allMonthlySummariesCache.set(userId, sorted);
  try { localStorage.setItem(MONTHLY_SUMMARIES_LS_KEY(userId), JSON.stringify(sorted)); } catch { /* ignore */ }
  return sorted;
};

const readStoredSummaries = (userId: string): MonthlySummary[] | null => {
  const mem = allMonthlySummariesCache.get(userId);
  if (mem) return mem;
  try {
    const ls = localStorage.getItem(MONTHLY_SUMMARIES_LS_KEY(userId));
    if (!ls) return null;
    return (JSON.parse(ls) as MonthlySummary[]).map(s => ({ ...s, lastUpdated: new Date(s.lastUpdated) }));
  } catch { return null; }
};

/**
 * Bring monthly summaries up to date with the server at minimal cost:
 * only docs whose lastUpdated moved since the last sync are read
 * (usually 0-2 reads). A full read happens on first use, when `full`
 * is set, or once a week (to drop months deleted by a rebuild).
 */
export const refreshMonthlySummaries = async (
  userId: string,
  options: { full?: boolean } = {}
): Promise<MonthlySummary[]> => {
  const stored = readStoredSummaries(userId);
  const sync = readSyncState(userId);
  const now = Date.now();
  const needFull = options.full || !stored || !sync || sync.schema !== SUMMARY_SCHEMA_VERSION ||
    now - sync.lastFull > FULL_REFRESH_INTERVAL_MS;
  const summariesRef = collection(db, `users/${userId}/monthlySummaries`);

  if (needFull) {
    const snapshot = await getDocs(summariesRef);
    let lastSeen = 0;
    const list: MonthlySummary[] = [];
    snapshot.forEach(d => {
      const s = docToSummary(d.id, d.data({ serverTimestamps: 'estimate' }));
      if (!d.metadata.hasPendingWrites) lastSeen = Math.max(lastSeen, s.lastUpdated.getTime());
      list.push(s);
    });
    writeSyncState(userId, { lastSeen, lastFull: now, schema: SUMMARY_SCHEMA_VERSION });
    return storeMonthlySummaries(userId, list);
  }

  const snapshot = await getDocs(query(summariesRef, where('lastUpdated', '>', Timestamp.fromMillis(sync!.lastSeen))));
  if (snapshot.empty) return stored!;
  const byId = new Map(stored!.map(s => [s.id, s]));
  let lastSeen = sync!.lastSeen;
  snapshot.forEach(d => {
    const s = docToSummary(d.id, d.data({ serverTimestamps: 'estimate' }));
    if (!d.metadata.hasPendingWrites) lastSeen = Math.max(lastSeen, s.lastUpdated.getTime());
    byId.set(d.id, s);
  });
  writeSyncState(userId, { lastSeen, lastFull: sync!.lastFull, schema: SUMMARY_SCHEMA_VERSION });
  return storeMonthlySummaries(userId, [...byId.values()]);
};

/**
 * Apply local transaction changes to summaries using the same math as the
 * Cloud Function, so the UI is correct before the server catches up.
 */
export const patchMonthlySummaries = (
  userId: string,
  summaries: MonthlySummary[],
  removed: SummaryTx[],
  added: SummaryTx[]
): MonthlySummary[] => {
  const deltas = new Map<string, SummaryDelta>();
  removed.forEach(t => accumulateSummaryDelta(deltas, t, -1));
  added.forEach(t => accumulateSummaryDelta(deltas, t, 1));
  if (deltas.size === 0) return summaries;

  const byId = new Map(summaries.map(s => [s.id, s]));
  deltas.forEach((delta, monthKey) => {
    const existing = byId.get(monthKey);
    const base: MonthlySummary = existing
      ? { ...existing, categoryTotals: { ...existing.categoryTotals }, byType: existing.byType ? { ...existing.byType } : existing.byType, accountNet: { ...(existing.accountNet || {}) } }
      : {
          id: monthKey, userId, year: delta.year, month: delta.month,
          categoryTotals: {}, totalSpent: 0, expense: 0, income: 0, investment: 0,
          byType: {}, accountNet: {}, txCount: 0, lastUpdated: new Date(),
        };
    if (base.byType) {
      for (const [type, cats] of Object.entries(delta.byType)) {
        const typeMap = { ...(base.byType[type] || {}) };
        for (const [cat, amount] of Object.entries(cats)) typeMap[cat] = (typeMap[cat] || 0) + amount;
        base.byType[type] = typeMap;
      }
    }
    for (const [cat, amount] of Object.entries(delta.categoryTotals)) {
      base.categoryTotals[cat] = (base.categoryTotals[cat] || 0) + amount;
    }
    const accountNet = base.accountNet || (base.accountNet = {});
    for (const [accountId, amount] of Object.entries(delta.accountNet)) {
      accountNet[accountId] = (accountNet[accountId] || 0) + amount;
    }
    base.expense += delta.expense;
    base.income += delta.income;
    base.investment += delta.investment;
    base.totalSpent += delta.totalSpent;
    base.txCount = (base.txCount || 0) + delta.txCount;
    byId.set(monthKey, base);
  });
  return storeMonthlySummaries(userId, [...byId.values()]);
};

/**
 * Per-category totals for one calendar year from v2 summaries, split the
 * same way the Categories page splits raw transactions. `resolveType`
 * receives a synthetic { type, category } and must return the role.
 * Returns null when any month of that year lacks v2 data.
 */
export const yearTotalsFromSummaries = (
  summaries: MonthlySummary[],
  year: number,
  resolveType: (tx: { type: string; category: string }) => 'expense' | 'income' | 'investment' | 'transfer'
): Record<'expense' | 'income' | 'investment' | 'transfer', Record<string, number>> | null => {
  const out = { expense: {}, income: {}, investment: {}, transfer: {} } as Record<'expense' | 'income' | 'investment' | 'transfer', Record<string, number>>;
  for (const s of summaries) {
    if (s.year !== year) continue;
    if (!s.byType) return null;
    for (const [type, cats] of Object.entries(s.byType)) {
      for (const [key, amount] of Object.entries(cats)) {
        if (!amount) continue;
        const noCategory = key === NO_CATEGORY_KEY;
        const role = resolveType({ type, category: noCategory ? '' : key });
        const category = noCategory ? 'uncategorized' : key;
        out[role][category] = (out[role][category] || 0) + amount;
      }
    }
  }
  // Drop rounding dust left by add/remove pairs
  for (const role of Object.keys(out) as Array<keyof typeof out>) {
    for (const [cat, value] of Object.entries(out[role])) {
      if (Math.abs(value) < 0.005) delete out[role][cat];
    }
  }
  return out;
};

/**
 * A month's income / expense / investment totals from its summary doc, classified like
 * the Dashboard (resolveType; transfers left out). Month is 1-12. A month with no doc
 * had no transactions. Null when the month's doc predates byType.
 */
export const monthTotalsFromSummaries = (
  summaries: MonthlySummary[],
  year: number,
  month: number,
  resolveType: (tx: { type: string; category: string }) => 'expense' | 'income' | 'investment' | 'transfer'
): { income: number; expense: number; investment: number } | null => {
  const totals = yearTotalsFromSummaries(summaries.filter(s => s.year === year && s.month === month), year, resolveType);
  if (!totals) return null;
  const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
  return { income: sum(totals.income), expense: sum(totals.expense), investment: sum(totals.investment) };
};

export { SUMMARY_SCHEMA_VERSION };

// ============================================================
// Client-maintained summaries (no Cloud Function: the project is on the Spark plan).
// Every transaction change made by the app writes matching increments here.
// ============================================================

let rebuildRunning = false;
let rebuildDirty = false;

/** Firestore increment payload for one month (empty maps left out: under merge they would replace). */
const deltaToWrite = (userId: string, delta: SummaryDelta): DocumentData => {
  const byType: Record<string, Record<string, ReturnType<typeof increment>>> = {};
  for (const [type, cats] of Object.entries(delta.byType)) {
    for (const [categoryId, amount] of Object.entries(cats)) {
      if (amount === 0) continue;
      (byType[type] = byType[type] || {})[categoryId] = increment(amount);
    }
  }
  const categoryTotals: Record<string, ReturnType<typeof increment>> = {};
  for (const [categoryId, amount] of Object.entries(delta.categoryTotals)) {
    if (amount !== 0) categoryTotals[categoryId] = increment(amount);
  }
  const data: DocumentData = {
    userId,
    year: delta.year,
    month: delta.month,
    expense: increment(delta.expense),
    income: increment(delta.income),
    investment: increment(delta.investment),
    totalSpent: increment(delta.totalSpent),
    txCount: increment(delta.txCount),
    lastUpdated: serverTimestamp(),
  };
  if (Object.keys(byType).length > 0) data.byType = byType;
  if (Object.keys(categoryTotals).length > 0) data.categoryTotals = categoryTotals;
  const accountNet: Record<string, ReturnType<typeof increment>> = {};
  for (const [accountId, amount] of Object.entries(delta.accountNet)) {
    if (amount !== 0) accountNet[accountId] = increment(amount);
  }
  if (Object.keys(accountNet).length > 0) data.accountNet = accountNet;
  return data;
};

/**
 * Persist the summary effect of local transaction changes with atomic increments
 * (one batched write, no reads). Works offline: the batch is queued like the
 * transaction writes themselves. Don't await it in offline mode.
 */
export const writeSummaryDeltas = async (
  userId: string,
  removed: SummaryTx[],
  added: SummaryTx[]
): Promise<void> => {
  if (rebuildRunning) {
    // The running rebuild will re-read all transactions, including this change.
    rebuildDirty = true;
    return;
  }
  const deltas = new Map<string, SummaryDelta>();
  removed.forEach(t => accumulateSummaryDelta(deltas, t, -1));
  added.forEach(t => accumulateSummaryDelta(deltas, t, 1));
  const batch = writeBatch(db);
  let writes = 0;
  deltas.forEach((delta, monthKey) => {
    if (isEmptyDelta(delta)) return;
    batch.set(doc(db, `users/${userId}/monthlySummaries`, monthKey), deltaToWrite(userId, delta), { merge: true });
    writes++;
  });
  if (writes > 0) await batch.commit();
};

/**
 * Rebuild every monthly summary from all of the user's transactions and mark the
 * summaries complete (users/{uid}.summariesVersion). One read per transaction, once.
 * Changes made on this device while it runs trigger another pass, so none are lost
 * or counted twice.
 */
export const rebuildMonthlySummariesClient = async (
  userId: string
): Promise<{ summariesCount: number; transactionsProcessed: number }> => {
  if (rebuildRunning) throw new Error('A summary rebuild is already running');
  rebuildRunning = true;
  try {
    for (let pass = 1; pass <= 3; pass++) {
      rebuildDirty = false;
      const txSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', userId)));
      const deltas = new Map<string, SummaryDelta>();
      txSnap.forEach(d => accumulateSummaryDelta(deltas, d.data() as SummaryTx, 1));

      const summariesCol = collection(db, `users/${userId}/monthlySummaries`);
      const existing = await getDocs(summariesCol);
      const ops: Array<{ ref: DocumentReference; data?: DocumentData }> = [];
      deltas.forEach((delta, monthKey) => ops.push({
        ref: doc(summariesCol, monthKey),
        data: { userId, ...delta, schemaVersion: SUMMARY_SCHEMA_VERSION, lastUpdated: serverTimestamp() },
      }));
      existing.forEach(d => { if (!deltas.has(d.id)) ops.push({ ref: d.ref }); });

      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach(op => (op.data ? batch.set(op.ref, op.data) : batch.delete(op.ref)));
        await batch.commit();
      }

      if (!rebuildDirty) {
        rebuildRunning = false; // synchronous with the check: no change can slip in between
        await setDoc(doc(db, 'users', userId), {
          summariesVersion: SUMMARY_SCHEMA_VERSION,
          summariesRebuiltAt: serverTimestamp(),
        }, { merge: true });
        return { summariesCount: deltas.size, transactionsProcessed: txSnap.size };
      }
      console.log(`[summaries] Transactions changed during pass ${pass}; rebuilding again`);
    }
    throw new Error('Transactions kept changing during the summary rebuild; try again');
  } finally {
    rebuildRunning = false;
  }
};

/** Remove every monthly summary (used when all transactions are deleted). */
export const deleteAllMonthlySummaries = async (userId: string): Promise<void> => {
  const snap = await getDocs(collection(db, `users/${userId}/monthlySummaries`));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  clearCategorySummaryCache();
  try { localStorage.removeItem(SUMMARY_SYNC_LS_KEY(userId)); } catch { /* ignore */ }
};

/**
 * Net effect of all transactions on each bank account, summed over every month.
 * Balance = initialBalance + this. Only meaningful when summaries are complete (v3).
 */
export const accountNetFromSummaries = (summaries: MonthlySummary[]): Record<string, number> => {
  const net: Record<string, number> = {};
  for (const s of summaries) {
    for (const [accountId, amount] of Object.entries(s.accountNet || {})) {
      net[accountId] = (net[accountId] || 0) + amount;
    }
  }
  return net;
};
