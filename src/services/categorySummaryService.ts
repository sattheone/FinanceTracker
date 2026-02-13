import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, increment, writeBatch, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Transaction } from '../types';

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
 */
export const incrementCategorySummary = async (
  userId: string,
  transaction: Transaction
): Promise<void> => {
  const date = new Date(transaction.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-based month
  const categoryId = transaction.category || 'uncategorized';
  
  const summaryId = getSummaryId(year, month, categoryId);
  const summaryRef = doc(db, `users/${userId}/categorySummaries`, summaryId);
  
  try {
    const summaryDoc = await getDoc(summaryRef);
    
    if (summaryDoc.exists()) {
      // Update existing summary
      await updateDoc(summaryRef, {
        totalSpent: increment(transaction.amount),
        transactionCount: increment(1),
        lastUpdated: new Date(),
      });
    } else {
      // Create new summary
      await setDoc(summaryRef, {
        userId,
        year,
        month,
        categoryId,
        totalSpent: transaction.amount,
        transactionCount: 1,
        lastUpdated: new Date(),
      });
    }
  } catch (error) {
    console.error('Error updating category summary:', error);
    // Don't throw - allow transaction to succeed even if summary fails
  }
};

/**
 * Update category summary when a transaction is deleted
 */
export const decrementCategorySummary = async (
  userId: string,
  transaction: Transaction
): Promise<void> => {
  const date = new Date(transaction.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const categoryId = transaction.category || 'uncategorized';
  
  const summaryId = getSummaryId(year, month, categoryId);
  const summaryRef = doc(db, `users/${userId}/categorySummaries`, summaryId);
  
  try {
    const summaryDoc = await getDoc(summaryRef);
    
    if (summaryDoc.exists()) {
      const currentData = summaryDoc.data();
      const newCount = Math.max(0, (currentData.transactionCount || 1) - 1);
      const newTotal = Math.max(0, (currentData.totalSpent || transaction.amount) - transaction.amount);
      
      if (newCount <= 0 || newTotal <= 0.01) {
        // Remove summary if no transactions left
        try {
          await deleteDoc(summaryRef);
        } catch (deleteError) {
          // Document may have already been deleted, ignore
          console.debug('Category summary already deleted or not found:', summaryId);
        }
      } else {
        try {
          await updateDoc(summaryRef, {
            totalSpent: increment(-transaction.amount),
            transactionCount: increment(-1),
            lastUpdated: new Date(),
          });
        } catch (updateError: any) {
          // If document doesn't exist, it's already been cleaned up - that's fine
          if (updateError?.code === 'not-found' || updateError?.message?.includes('No document to update')) {
            console.debug('Category summary not found for update, already cleaned up:', summaryId);
          } else {
            throw updateError;
          }
        }
      }
    } else {
      // Document doesn't exist - nothing to decrement, this is fine
      console.debug('Category summary does not exist, nothing to decrement:', summaryId);
    }
  } catch (error) {
    // Don't log as error if it's a "document not found" issue - that's expected in some cases
    console.debug('Decrement category summary skipped:', summaryId, error);
  }
};

/**
 * Update category summary when a transaction is modified
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
        await updateDoc(summaryRef, {
          totalSpent: increment(amountDiff),
          lastUpdated: new Date(),
        });
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
  lastUpdated: Date;
}

// Module-level cache for monthly summaries (survives component remounts)
const monthlySummaryCache = new Map<string, MonthlySummary | null>();

/**
 * Clear the category summary cache (call after transactions are added/updated/deleted)
 */
export const clearCategorySummaryCache = () => {
  monthlySummaryCache.clear();
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
  
  const summaryRef = doc(db, `users/${userId}/monthlySummaries`, summaryId);
  
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

/**
 * Get category totals for a specific month using optimized structure (1 read)
 */
export const getOptimizedCategorySummariesByMonth = async (
  userId: string,
  year: number,
  month: number
): Promise<Map<string, number>> => {
  console.log(`[CategorySummary] Loading optimized summary for ${year}-${month} (1 read)`);
  const summary = await getOptimizedMonthlySummary(userId, year, month);
  
  if (summary?.categoryTotals) {
    return new Map(Object.entries(summary.categoryTotals));
  }
  
  return new Map();
};

/**
 * Get category totals for a year using optimized structure (12 reads max)
 */
export const getOptimizedCategorySummariesByYear = async (
  userId: string,
  year: number
): Promise<Map<string, number>> => {
  console.log(`[CategorySummary] Loading optimized summaries for year ${year} (12 reads max)`);
  const categoryTotals = new Map<string, number>();
  const promises: Promise<MonthlySummary | null>[] = [];
  
  // Fetch all 12 months
  for (let month = 1; month <= 12; month++) {
    promises.push(getOptimizedMonthlySummary(userId, year, month));
  }
  
  const results = await Promise.all(promises);
  
  results.forEach(summary => {
    if (summary?.categoryTotals) {
      Object.entries(summary.categoryTotals).forEach(([categoryId, amount]) => {
        categoryTotals.set(categoryId, (categoryTotals.get(categoryId) || 0) + amount);
      });
    }
  });
  
  return categoryTotals;
};

/**
 * Rebuild optimized monthly summaries (one doc per month)
 */
export const rebuildOptimizedMonthlySummaries = async (
  userId: string,
  transactions: Transaction[]
): Promise<void> => {
  // Aggregate by month
  const monthlyData = new Map<string, {
    year: number;
    month: number;
    categoryTotals: Record<string, number>;
    totalSpent: number;
  }>();
  
  transactions.forEach((txn) => {
    const date = new Date(txn.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-based
    const categoryId = txn.category || 'uncategorized';
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        year,
        month,
        categoryTotals: {},
        totalSpent: 0
      });
    }
    
    const summary = monthlyData.get(monthKey)!;
    summary.categoryTotals[categoryId] = (summary.categoryTotals[categoryId] || 0) + txn.amount;
    summary.totalSpent += txn.amount;
  });
  
  // Write all summaries
  const batch = writeBatch(db);
  let batchCount = 0;
  
  monthlyData.forEach((data, monthKey) => {
    const summaryRef = doc(db, `users/${userId}/monthlySummaries`, monthKey);
    batch.set(summaryRef, {
      userId,
      ...data,
      lastUpdated: new Date(),
    });
    batchCount++;
  });
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ Rebuilt ${batchCount} optimized monthly summaries`);
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

/**
 * Call Cloud Function to rebuild monthly summaries
 * This is more efficient and runs server-side
 */
export const rebuildMonthlySummariesCloud = async (): Promise<{ success: boolean; summariesCount: number; transactionsProcessed: number }> => {
  const functions = getFunctions();
  const rebuildFn = httpsCallable<void, { success: boolean; summariesCount: number; transactionsProcessed: number }>(
    functions, 
    'rebuildMonthlySummaries'
  );
  
  const result = await rebuildFn();
  console.log('✅ Monthly summaries rebuilt via Cloud Function:', result.data);
  return result.data;
};