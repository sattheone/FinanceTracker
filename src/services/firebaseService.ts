import {
  collection,
  doc,
  getDocs as firestoreGetDocs,
  getDoc as firestoreGetDoc,
  addDoc as firestoreAddDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  setDoc as firestoreSetDoc,
  query,
  where,
  limit,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Asset, Insurance, Goal, MonthlyBudget, Transaction, BankAccount, Liability, RecurringTransaction, Bill, CategoryRule, SIPRule } from '../types';
import { UserProfile } from '../types/user';
import { getMerchantKeyFromDescription } from '../utils/merchantSimilarity';
import {
  incrementFirestoreBatches,
  incrementFirestoreReads,
  incrementFirestoreWrites
} from '../debug/firestoreUsageMonitor';

const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
};

const getDoc = async (...args: Parameters<typeof firestoreGetDoc>) => {
  const snapshot = await firestoreGetDoc(...args);
  incrementFirestoreReads(1);
  return snapshot;
};

const getDocs = async (...args: Parameters<typeof firestoreGetDocs>) => {
  const snapshot = await firestoreGetDocs(...args);
  incrementFirestoreReads(snapshot.size);
  return snapshot;
};

const addDoc = async (...args: Parameters<typeof firestoreAddDoc>) => {
  const docRef = await firestoreAddDoc(...args);
  incrementFirestoreWrites(1);
  return docRef;
};

// NOTE: firestore setDoc/updateDoc/deleteDoc are overloaded; Parameters<> picks only one overload.
// These wrappers keep runtime behavior while avoiding TS overload issues.
const setDoc: typeof firestoreSetDoc = (async (...args: any[]) => {
  const result = await (firestoreSetDoc as any)(...args);
  incrementFirestoreWrites(1);
  return result;
}) as any;

const updateDoc: typeof firestoreUpdateDoc = (async (...args: any[]) => {
  const result = await (firestoreUpdateDoc as any)(...args);
  incrementFirestoreWrites(1);
  return result;
}) as any;

const deleteDoc: typeof firestoreDeleteDoc = (async (...args: any[]) => {
  const result = await (firestoreDeleteDoc as any)(...args);
  incrementFirestoreWrites(1);
  return result;
}) as any;

export class FirebaseService {
  private static chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }
  // Collection names
  private static COLLECTIONS = {
    USERS: 'users',
    TRANSACTIONS: 'transactions',
    ASSETS: 'assets',
    INSURANCE: 'insurance',
    GOALS: 'goals',
    LIC_POLICIES: 'licPolicies',
    MONTHLY_BUDGETS: 'monthlyBudgets',
    BANK_ACCOUNTS: 'bankAccounts',
    LIABILITIES: 'liabilities',
    RECURRING_TRANSACTIONS: 'recurringTransactions',
    BILLS: 'bills',
    CATEGORY_RULES: 'categoryRules',
    CATEGORIES: 'categories',
    SIP_RULES: 'sipRules',
    TAGS: 'tags'
  };

  // User Profile Operations
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, this.COLLECTIONS.USERS, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  static async updateUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.USERS, userId);

      // Check if document exists first
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Update existing document
        // Filter out undefined values as Firebase doesn't support them
        const cleanProfile = removeUndefined(profile as any);

        await updateDoc(docRef, {
          ...cleanProfile,
          updatedAt: serverTimestamp() as any
        });
      } else {
        // Create new document
        await setDoc(docRef, {
          ...profile,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any
        });
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  static async createUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.USERS, userId);
      await setDoc(docRef, {
        ...profile,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Transaction Operations
  static async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.TRANSACTIONS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      // Sort on client side temporarily until indexes are created
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Transaction[];

      return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  static async getTransactionsPage(
    userId: string,
    options?: {
      pageSize?: number;
      startDate?: string;
      cursor?: { date: string; id: string };
    }
  ): Promise<{
    transactions: Transaction[];
    nextCursor?: { date: string; id: string };
    hasMore: boolean;
  }> {
    try {
      const pageSize = options?.pageSize ?? 500;

      // Simple query - no composite index needed
      const constraints: any[] = [
        where('userId', '==', userId),
        limit(pageSize + 50)
      ];

      const q = query(collection(db, this.COLLECTIONS.TRANSACTIONS), ...constraints);
      const querySnapshot = await getDocs(q);

      let transactions = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as any)
      })) as Transaction[];

      // Sort client-side by date descending (newest first)
      transactions.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.id.localeCompare(a.id);
      });

      // If we have a cursor, filter to only transactions before it
      if (options?.cursor) {
        transactions = transactions.filter(t =>
          t.date < options.cursor!.date ||
          (t.date === options.cursor!.date && t.id < options.cursor!.id)
        );
      }

      // Trim to requested page size
      const hasMore = transactions.length > pageSize;
      if (hasMore) {
        transactions = transactions.slice(0, pageSize);
      }

      const last = transactions[transactions.length - 1];
      const nextCursor = hasMore && last?.date ? { date: last.date, id: last.id } : undefined;

      return { transactions, nextCursor, hasMore };
    } catch (error) {
      console.error('Error getting transactions page:', error);
      throw error;
    }
  }

  static async getTransactionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Transaction[]> {
    try {
      // Note: This requires a composite index on [userId, date]
      const q = query(
        collection(db, this.COLLECTIONS.TRANSACTIONS),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const querySnapshot = await getDocs(q);
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Transaction[];

      return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting transactions by range:', error);
      // Fallback if index missing: fetch all (recent) and filter client side? 
      // Better to throw so we know index is needed, but for better UX we could try a simpler fetch.
      throw error;
    }
  }

  static async getTransactionsByMerchantKeyPage(
    userId: string,
    merchantKey: string,
    options?: {
      pageSize?: number;
      cursor?: { date: string; id: string };
    }
  ): Promise<{
    transactions: Transaction[];
    nextCursor?: { date: string; id: string };
    hasMore: boolean;
  }> {
    try {
      if (!merchantKey) {
        return { transactions: [], hasMore: false };
      }

      const pageSize = options?.pageSize ?? 100;
      const constraints: any[] = [
        where('userId', '==', userId),
        where('merchantKey', '==', merchantKey),
        limit(pageSize + 20)
      ];

      const q = query(collection(db, this.COLLECTIONS.TRANSACTIONS), ...constraints);
      const querySnapshot = await getDocs(q);

      let transactions = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as any)
      })) as Transaction[];

      transactions.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.id.localeCompare(a.id);
      });

      if (options?.cursor) {
        transactions = transactions.filter(t =>
          t.date < options.cursor!.date ||
          (t.date === options.cursor!.date && t.id < options.cursor!.id)
        );
      }

      const hasMore = transactions.length > pageSize;
      if (hasMore) {
        transactions = transactions.slice(0, pageSize);
      }

      const last = transactions[transactions.length - 1];
      const nextCursor = hasMore && last?.date ? { date: last.date, id: last.id } : undefined;

      return { transactions, nextCursor, hasMore };
    } catch (error) {
      console.error('Error getting transactions by merchant key page:', error);
      throw error;
    }
  }

  static async getTransactionsByCategoryAndDateRange(
    userId: string,
    category: string,
    startDate: string,
    endDate: string
  ): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.TRANSACTIONS),
        where('userId', '==', userId),
        where('category', '==', category),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const querySnapshot = await getDocs(q);
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Transaction[];

      return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting transactions by category and range:', error);
      throw error;
    }
  }

  static async addTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Promise<string> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanTransaction = removeUndefined({
        ...transaction,
        merchantKey: getMerchantKeyFromDescription(transaction.description || '')
      } as any) as Record<string, any>;

      const docRef = await addDoc(collection(db, this.COLLECTIONS.TRANSACTIONS), {
        ...cleanTransaction,
        userId,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  static async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<void> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const updatesWithMerchantKey = {
        ...updates,
        ...(typeof updates.description === 'string'
          ? { merchantKey: getMerchantKeyFromDescription(updates.description) }
          : {})
      };

      const cleanUpdates = removeUndefined(updatesWithMerchantKey as any);

      const docRef = doc(db, this.COLLECTIONS.TRANSACTIONS, transactionId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp() as any
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  static async deleteTransaction(transactionId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.TRANSACTIONS, transactionId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  static async bulkAddTransactions(
    userId: string,
    transactions: Omit<Transaction, 'id'>[],
    onProgress?: (progress: number, total: number) => void
  ): Promise<Transaction[]> {
    try {
      const BATCH_SIZE = 450; // Firestore limit is 500, keeping safety margin
      const total = transactions.length;
      let processed = 0;
      const createdTransactions: Transaction[] = [];
      const now = new Date().toISOString();

      for (const chunk of this.chunkArray(transactions, BATCH_SIZE)) {
        const batch = writeBatch(db);

        chunk.forEach(transaction => {
          // Filter out undefined values as Firebase doesn't support them
          const cleanTransaction = removeUndefined({
            ...transaction,
            merchantKey: getMerchantKeyFromDescription(transaction.description || '')
          } as any) as Record<string, any>;

          const docRef = doc(collection(db, this.COLLECTIONS.TRANSACTIONS));
          batch.set(docRef, {
            ...cleanTransaction,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          createdTransactions.push({
            id: docRef.id,
            ...transaction,
            userId,
            createdAt: now,
            updatedAt: now
          } as Transaction);
        });

        await batch.commit();
        incrementFirestoreBatches(1);
        incrementFirestoreWrites(chunk.length);
        processed += chunk.length;

        if (onProgress) {
          onProgress(processed, total);
        }

        // Small delay to prevent rate limiting if many batches
        if (total > 1000) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      return createdTransactions;
    } catch (error) {
      console.error('Error bulk adding transactions:', error);
      throw error;
    }
  }

  static async bulkUpdateTransactions(ids: string[], update: Partial<Transaction>): Promise<void> {
    if (ids.length === 0) return;

    const updateWithMerchantKey = {
      ...update,
      ...(typeof update.description === 'string'
        ? { merchantKey: getMerchantKeyFromDescription(update.description) }
        : {})
    };

    const cleanUpdates = removeUndefined(updateWithMerchantKey as any) as Record<string, any>;

    if (!('updatedAt' in cleanUpdates)) {
      cleanUpdates.updatedAt = serverTimestamp() as any;
    }

    const BATCH_SIZE = 450;
    const chunks = this.chunkArray(ids, BATCH_SIZE);

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(id => {
        const docRef = doc(db, this.COLLECTIONS.TRANSACTIONS, id);
        batch.update(docRef, cleanUpdates);
      });
      await batch.commit();

      // Count as 1 batch operation, not N writes
      incrementFirestoreBatches(1);
      // Don't count individual writes - batch pricing is flat
      // incrementFirestoreWrites(chunk.length);
    }
  }

  static async bulkUpdateTransactionsById(updatesById: Record<string, Partial<Transaction>>): Promise<void> {
    const entries = Object.entries(updatesById);
    if (entries.length === 0) return;

    const BATCH_SIZE = 450;
    const chunks = this.chunkArray(entries, BATCH_SIZE);

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(([id, updates]) => {
        const updatesWithMerchantKey = {
          ...updates,
          ...(typeof updates.description === 'string'
            ? { merchantKey: getMerchantKeyFromDescription(updates.description) }
            : {})
        };

        const cleanUpdates = removeUndefined(updatesWithMerchantKey as any) as Record<string, any>;
        if (!('updatedAt' in cleanUpdates)) {
          cleanUpdates.updatedAt = serverTimestamp() as any;
        }
        const docRef = doc(db, this.COLLECTIONS.TRANSACTIONS, id);
        batch.update(docRef, cleanUpdates);
      });
      await batch.commit();

      // Count as 1 batch operation, not N writes (batches are same cost regardless of size)
      incrementFirestoreBatches(1);
      // Don't count individual writes - batch pricing is flat
      // incrementFirestoreWrites(chunk.length);
    }
  }

  static async bulkDeleteTransactions(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const BATCH_SIZE = 450;
    const chunks = this.chunkArray(ids, BATCH_SIZE);

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(id => {
        const docRef = doc(db, this.COLLECTIONS.TRANSACTIONS, id);
        batch.delete(docRef);
      });
      await batch.commit();

      // Count as 1 batch operation, not N deletes
      incrementFirestoreBatches(1);
      // Don't count individual deletes - batch pricing is flat
      // incrementFirestoreWrites(chunk.length);
    }
  }

  static async bulkUpdateBankAccounts(
    updates: Array<{ id: string; update: Partial<BankAccount> }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const BATCH_SIZE = 450;
    for (const chunk of this.chunkArray(updates, BATCH_SIZE)) {
      const batch = writeBatch(db);
      chunk.forEach(({ id, update }) => {
        const cleanUpdates = removeUndefined(update as any) as Record<string, any>;
        if (!('updatedAt' in cleanUpdates)) {
          cleanUpdates.updatedAt = serverTimestamp() as any;
        }
        const docRef = doc(db, this.COLLECTIONS.BANK_ACCOUNTS, id);
        batch.update(docRef, cleanUpdates);
      });
      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(chunk.length);
    }
  }

  // Asset Operations
  static async getAssets(userId: string): Promise<Asset[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.ASSETS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      // Sort on client side temporarily until indexes are created
      const assets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Asset[];

      return assets.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error getting assets:', error);
      throw error;
    }
  }

  static async addAsset(userId: string, asset: Omit<Asset, 'id'>): Promise<string> {
    try {
      // Filter out undefined values
      const cleanAsset = removeUndefined(asset as any) as Record<string, any>;

      const docRef = await addDoc(collection(db, this.COLLECTIONS.ASSETS), {
        ...cleanAsset,
        userId,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding asset:', error);
      throw error;
    }
  }

  static async updateAsset(assetId: string, updates: Partial<Asset>): Promise<void> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanUpdates = removeUndefined(updates as any) as Record<string, any>;

      const docRef = doc(db, this.COLLECTIONS.ASSETS, assetId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp() as any
      });
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  }

  static async deleteAsset(assetId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.ASSETS, assetId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  }

  // Insurance Operations
  static async getInsurance(userId: string): Promise<Insurance[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.INSURANCE),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      // Sort on client side temporarily until indexes are created
      const insurance = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Insurance[];

      return insurance.sort((a, b) => a.policyName.localeCompare(b.policyName));
    } catch (error) {
      console.error('Error getting insurance:', error);
      throw error;
    }
  }

  static async addInsurance(userId: string, insurance: Omit<Insurance, 'id'>): Promise<string> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanInsurance = removeUndefined(insurance as any) as Record<string, any>;

      const docRef = await addDoc(collection(db, this.COLLECTIONS.INSURANCE), {
        ...cleanInsurance,
        userId,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding insurance:', error);
      throw error;
    }
  }

  static async updateInsurance(insuranceId: string, updates: Partial<Insurance>): Promise<void> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanUpdates = removeUndefined(updates as any) as Record<string, any>;

      const docRef = doc(db, this.COLLECTIONS.INSURANCE, insuranceId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp() as any
      });
    } catch (error) {
      console.error('Error updating insurance:', error);
      throw error;
    }
  }

  static async deleteInsurance(insuranceId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.INSURANCE, insuranceId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting insurance:', error);
      throw error;
    }
  }

  // Goal Operations
  static async getGoals(userId: string): Promise<Goal[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.GOALS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      // Sort on client side temporarily until indexes are created
      const goals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Goal[];

      return goals.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
    } catch (error) {
      console.error('Error getting goals:', error);
      throw error;
    }
  }

  static async addGoal(userId: string, goal: Omit<Goal, 'id'>): Promise<string> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanGoal = removeUndefined(goal as any) as Record<string, any>;

      const docRef = await addDoc(collection(db, this.COLLECTIONS.GOALS), {
        ...cleanGoal,
        userId,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  }

  static async updateGoal(goalId: string, updates: Partial<Goal>): Promise<void> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanUpdates = removeUndefined(updates as any) as Record<string, any>;

      const docRef = doc(db, this.COLLECTIONS.GOALS, goalId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp() as any
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  static async deleteGoal(goalId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.GOALS, goalId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  // Monthly Budget Operations
  static async getMonthlyBudget(userId: string): Promise<MonthlyBudget | null> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.MONTHLY_BUDGETS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0];
        return docData.data() as MonthlyBudget;
      }
      return null;
    } catch (error) {
      console.error('Error getting monthly budget:', error);
      throw error;
    }
  }

  static async updateMonthlyBudget(userId: string, budget: MonthlyBudget): Promise<void> {
    try {
      // Check if budget exists
      const q = query(
        collection(db, this.COLLECTIONS.MONTHLY_BUDGETS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Update existing
        const docRef = querySnapshot.docs[0].ref;
        // Filter out undefined values as Firebase doesn't support them
        const cleanBudget = Object.fromEntries(
          Object.entries(budget).filter(([_, value]) => value !== undefined)
        );

        await updateDoc(docRef, {
          ...cleanBudget,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new
        // Filter out undefined values as Firebase doesn't support them
        const cleanBudget = Object.fromEntries(
          Object.entries(budget).filter(([_, value]) => value !== undefined)
        );

        await addDoc(collection(db, this.COLLECTIONS.MONTHLY_BUDGETS), {
          ...cleanBudget,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating monthly budget:', error);
      throw error;
    }
  }

  // Bank Account Operations
  static async getBankAccounts(userId: string): Promise<BankAccount[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.BANK_ACCOUNTS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      const accounts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as BankAccount[];

      return accounts.sort((a, b) => a.bank.localeCompare(b.bank));
    } catch (error) {
      console.error('Error getting bank accounts:', error);
      throw error;
    }
  }

  static async addBankAccount(userId: string, account: Omit<BankAccount, 'id'>): Promise<string> {
    try {
      // Filter out undefined values
      const cleanAccount = Object.fromEntries(
        Object.entries(account).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.BANK_ACCOUNTS), {
        ...cleanAccount,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw error;
    }
  }

  static async updateBankAccount(accountId: string, updates: Partial<BankAccount>): Promise<void> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, this.COLLECTIONS.BANK_ACCOUNTS, accountId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw error;
    }
  }

  static async deleteBankAccount(accountId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.BANK_ACCOUNTS, accountId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw error;
    }
  }

  // Liability Operations
  static async getLiabilities(userId: string): Promise<Liability[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.LIABILITIES),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      const liabilities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Liability[];

      return liabilities.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error getting liabilities:', error);
      throw error;
    }
  }

  static async addLiability(userId: string, liability: Omit<Liability, 'id'>): Promise<string> {
    try {
      // Filter out undefined values
      const cleanLiability = Object.fromEntries(
        Object.entries(liability).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.LIABILITIES), {
        ...cleanLiability,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding liability:', error);
      throw error;
    }
  }

  static async updateLiability(liabilityId: string, updates: Partial<Liability>): Promise<void> {
    try {
      // Filter out undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, this.COLLECTIONS.LIABILITIES, liabilityId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating liability:', error);
      throw error;
    }
  }

  static async deleteLiability(liabilityId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.LIABILITIES, liabilityId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting liability:', error);
      throw error;
    }
  }

  // Real-time listeners
  static subscribeToTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    const q = query(
      collection(db, this.COLLECTIONS.TRANSACTIONS),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (querySnapshot) => {
      incrementFirestoreReads(querySnapshot.size);
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Transaction[];

      // Sort on client side temporarily until indexes are created
      const sortedTransactions = transactions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      callback(sortedTransactions);
    });
  }

  static subscribeToAssets(userId: string, callback: (assets: Asset[]) => void) {
    const q = query(
      collection(db, this.COLLECTIONS.ASSETS),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (querySnapshot) => {
      incrementFirestoreReads(querySnapshot.size);
      const assets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Asset[];

      // Sort on client side temporarily until indexes are created
      const sortedAssets = assets.sort((a, b) => a.name.localeCompare(b.name));
      callback(sortedAssets);
    });
  }

  // Check if user has any existing data (for onboarding skip logic)
  static async hasUserData(userId: string): Promise<boolean> {
    try {
      // Check if user has any transactions, assets, insurance, goals, bank accounts, or liabilities
      // Using limit(1) to minimize reads - we only need to know if ANY data exists
      const collections = [
        this.COLLECTIONS.TRANSACTIONS,
        this.COLLECTIONS.ASSETS,
        this.COLLECTIONS.INSURANCE,
        this.COLLECTIONS.GOALS,
        this.COLLECTIONS.BANK_ACCOUNTS,
        this.COLLECTIONS.LIABILITIES
      ];

      for (const collectionName of collections) {
        const q = query(
          collection(db, collectionName),
          where('userId', '==', userId),
          limit(1) // Only check for existence, don't load all documents
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          return true; // User has data in at least one collection
        }
      }

      return false; // No data found
    } catch (error) {
      console.error('Error checking user data:', error);
      return false;
    }
  }


  // Recurring Transactions Operations
  static async getRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.RECURRING_TRANSACTIONS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as RecurringTransaction));
    } catch (error) {
      console.error('Error getting recurring transactions:', error);
      throw error;
    }
  }

  static async addRecurringTransaction(userId: string, recurringTransaction: Omit<RecurringTransaction, 'id'>): Promise<string> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanRecurringTransaction = Object.fromEntries(
        Object.entries(recurringTransaction).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.RECURRING_TRANSACTIONS), {
        ...cleanRecurringTransaction,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding recurring transaction:', error);
      throw error;
    }
  }

  static async updateRecurringTransaction(id: string, recurringTransaction: Partial<RecurringTransaction>): Promise<void> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanRecurringTransaction = Object.fromEntries(
        Object.entries(recurringTransaction).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, this.COLLECTIONS.RECURRING_TRANSACTIONS, id);
      await updateDoc(docRef, {
        ...cleanRecurringTransaction,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      throw error;
    }
  }

  static async deleteRecurringTransaction(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.RECURRING_TRANSACTIONS, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      throw error;
    }
  }

  // Bills Operations
  static async getBills(userId: string): Promise<Bill[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.BILLS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Bill));
    } catch (error) {
      console.error('Error getting bills:', error);
      throw error;
    }
  }

  static async addBill(userId: string, bill: Omit<Bill, 'id'>): Promise<string> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanBill = Object.fromEntries(
        Object.entries(bill).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.BILLS), {
        ...cleanBill,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding bill:', error);
      throw error;
    }
  }

  static async updateBill(id: string, bill: Partial<Bill>): Promise<void> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanBill = Object.fromEntries(
        Object.entries(bill).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, this.COLLECTIONS.BILLS, id);
      await updateDoc(docRef, {
        ...cleanBill,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating bill:', error);
      throw error;
    }
  }

  static async deleteBill(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.BILLS, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting bill:', error);
      throw error;
    }
  }

  // SIP Transaction Operations (stub methods for now)
  static async addSIPTransaction(userId: string, sipTransaction: any): Promise<string> {
    // TODO: Implement SIP transaction storage
    console.log('SIP transaction add requested for user:', userId, sipTransaction);
    return 'temp-id-' + Date.now();
  }

  static async updateSIPTransaction(sipTransactionId: string, updates: any): Promise<void> {
    // TODO: Implement SIP transaction update
    console.log('SIP transaction update requested:', sipTransactionId, updates);
  }

  static async deleteSIPTransaction(sipTransactionId: string): Promise<void> {
    // TODO: Implement SIP transaction deletion
    console.log('SIP transaction delete requested:', sipTransactionId);
  }

  // Bulk Deletion Operations
  static async deleteAllTransactions(userId: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all transactions for user:', userId);
      const q = query(
        collection(db, FirebaseService.COLLECTIONS.TRANSACTIONS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No transactions to delete');
        return 0;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(querySnapshot.size);
      console.log(`✅ Deleted ${querySnapshot.size} transactions`);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error deleting all transactions:', error);
      throw error;
    }
  }

  static async deleteAllBankAccounts(userId: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all bank accounts for user:', userId);
      const q = query(
        collection(db, FirebaseService.COLLECTIONS.BANK_ACCOUNTS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No bank accounts to delete');
        return 0;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(querySnapshot.size);
      console.log(`✅ Deleted ${querySnapshot.size} bank accounts`);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error deleting all bank accounts:', error);
      throw error;
    }
  }

  static async deleteAllAssets(userId: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all assets for user:', userId);
      const q = query(
        collection(db, FirebaseService.COLLECTIONS.ASSETS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No assets to delete');
        return 0;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(querySnapshot.size);
      console.log(`✅ Deleted ${querySnapshot.size} assets`);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error deleting all assets:', error);
      throw error;
    }
  }

  static async deleteAllLiabilities(userId: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all liabilities for user:', userId);
      const q = query(
        collection(db, FirebaseService.COLLECTIONS.LIABILITIES),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No liabilities to delete');
        return 0;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(querySnapshot.size);
      console.log(`✅ Deleted ${querySnapshot.size} liabilities`);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error deleting all liabilities:', error);
      throw error;
    }
  }

  static async deleteAllGoals(userId: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all goals for user:', userId);
      const q = query(
        collection(db, FirebaseService.COLLECTIONS.GOALS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No goals to delete');
        return 0;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(querySnapshot.size);
      console.log(`✅ Deleted ${querySnapshot.size} goals`);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error deleting all goals:', error);
      throw error;
    }
  }

  static async deleteAllInsurance(userId: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all insurance policies for user:', userId);
      const q = query(
        collection(db, FirebaseService.COLLECTIONS.INSURANCE),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No insurance policies to delete');
        return 0;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(querySnapshot.size);
      console.log(`✅ Deleted ${querySnapshot.size} insurance policies`);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error deleting all insurance:', error);
      throw error;
    }
  }

  static async deleteAllRecurringTransactions(userId: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all recurring transactions for user:', userId);
      const q = query(
        collection(db, FirebaseService.COLLECTIONS.RECURRING_TRANSACTIONS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No recurring transactions to delete');
        return 0;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(querySnapshot.size);
      console.log(`✅ Deleted ${querySnapshot.size} recurring transactions`);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error deleting all recurring transactions:', error);
      throw error;
    }
  }

  static async deleteAllBills(userId: string): Promise<number> {
    try {
      console.log('🗑️ Deleting all bills for user:', userId);
      const q = query(
        collection(db, FirebaseService.COLLECTIONS.BILLS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No bills to delete');
        return 0;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(querySnapshot.size);
      console.log(`✅ Deleted ${querySnapshot.size} bills`);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error deleting all bills:', error);
      throw error;
    }
  }

  // User Account Deletion
  static async deleteAllUserData(userId: string): Promise<void> {
    try {
      console.log('🗑️ Starting complete user data deletion for:', userId);
      const batch = writeBatch(db);
      let deletedCount = 0;

      // Delete all collections for the user
      const collections = [
        this.COLLECTIONS.TRANSACTIONS,
        this.COLLECTIONS.ASSETS,
        this.COLLECTIONS.INSURANCE,
        this.COLLECTIONS.GOALS,
        this.COLLECTIONS.MONTHLY_BUDGETS,
        this.COLLECTIONS.BANK_ACCOUNTS,
        this.COLLECTIONS.LIABILITIES,
        this.COLLECTIONS.RECURRING_TRANSACTIONS,
        this.COLLECTIONS.BILLS,
        this.COLLECTIONS.CATEGORY_RULES
      ];

      for (const collectionName of collections) {
        console.log(`🗑️ Deleting ${collectionName} for user:`, userId);
        const q = query(
          collection(db, collectionName),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);

        querySnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          deletedCount++;
        });
      }

      // Delete user profile
      const userDocRef = doc(db, this.COLLECTIONS.USERS, userId);
      batch.delete(userDocRef);
      deletedCount++;

      // Commit all deletions
      await batch.commit();
      incrementFirestoreBatches(1);
      incrementFirestoreWrites(deletedCount);
      console.log(`✅ Successfully deleted ${deletedCount} documents for user:`, userId);
    } catch (error) {
      console.error('❌ Error deleting user data:', error);
      throw error;
    }
  }

  // Category Rule Operations
  static async getCategoryRules(userId: string): Promise<CategoryRule[]> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() as any;
      const stored = Array.isArray(data?.categoryRules) ? data.categoryRules : null;

      if (stored) {
        return stored as CategoryRule[];
      }

      // Legacy fallback: read collection once, then migrate to user doc
      const q = query(
        collection(db, this.COLLECTIONS.CATEGORY_RULES),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const legacy = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as CategoryRule[];

      if (legacy.length > 0) {
        await setDoc(userRef, {
          categoryRules: legacy,
          categoryRulesUpdatedAt: serverTimestamp()
        }, { merge: true });
      }

      return legacy;
    } catch (error) {
      console.error('Error getting category rules:', error);
      throw error;
    }
  }

  static async addCategoryRule(userId: string, rule: Omit<CategoryRule, 'id'>): Promise<string> {
    try {
      const newId = doc(collection(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.CATEGORY_RULES)).id;
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() as any;
      const existing = Array.isArray(data?.categoryRules) ? data.categoryRules : [];
      const nowIso = new Date().toISOString();

      const newRule = {
        ...rule,
        id: newId,
        userId,
        createdAt: nowIso,
        updatedAt: nowIso
      } as CategoryRule;

      const updated = [...existing.filter((r: any) => r.id !== newId), newRule];

      await setDoc(userRef, {
        categoryRules: updated,
        categoryRulesUpdatedAt: serverTimestamp()
      }, { merge: true });

      return newId;
    } catch (error) {
      console.error('Error adding category rule:', error);
      throw error;
    }
  }

  static async updateCategoryRule(userId: string, ruleId: string, updates: Partial<CategoryRule>): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() as any;
      const existing = Array.isArray(data?.categoryRules) ? data.categoryRules : [];

      const updated = [...existing];
      const index = updated.findIndex((r: any) => r.id === ruleId);

      const sanitized: Record<string, any> = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          sanitized[key] = value;
        }
      });

      const base = index >= 0 ? updated[index] : { id: ruleId, userId };
      const next = { ...base, ...sanitized, updatedAt: new Date().toISOString() };

      if (updates.transactionType === undefined && 'transactionType' in base) {
        delete (next as any).transactionType;
      }

      if (index >= 0) {
        updated[index] = next;
      } else {
        updated.push(next);
      }

      await setDoc(userRef, {
        categoryRules: updated,
        categoryRulesUpdatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating category rule:', error);
      throw error;
    }
  }

  static async deleteCategoryRule(userId: string, ruleId: string): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() as any;
      const existing = Array.isArray(data?.categoryRules) ? data.categoryRules : [];
      const updated = existing.filter((r: any) => r.id !== ruleId);

      await setDoc(userRef, {
        categoryRules: updated,
        categoryRulesUpdatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error deleting category rule:', error);
      throw error;
    }
  }

  static async bulkAddCategoryRules(
    userId: string,
    rules: CategoryRule[]
  ): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const nowIso = new Date().toISOString();

      const normalized = rules.map(rule => {
        const { id, ...rest } = rule as any;
        const cleanRuleData = Object.fromEntries(
          Object.entries(rest).filter(([_, value]) => value !== undefined)
        );
        return {
          id,
          userId,
          ...cleanRuleData,
          createdAt: (rule as any).createdAt || nowIso,
          updatedAt: nowIso
        } as unknown as CategoryRule;
      });

      await setDoc(userRef, {
        categoryRules: normalized,
        categoryRulesUpdatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error bulk adding category rules:', error);
      throw error;
    }
  }

  // SIP Rules Operations
  static async getSIPRules(userId: string): Promise<SIPRule[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.SIP_RULES),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as SIPRule));
    } catch (error) {
      console.error('Error getting SIP rules:', error);
      throw error;
    }
  }

  static async addSIPRule(userId: string, rule: Omit<SIPRule, 'id'>): Promise<string> {
    try {
      // Filter out undefined values
      const cleanRule = Object.fromEntries(
        Object.entries(rule).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.SIP_RULES), {
        ...cleanRule,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding SIP rule:', error);
      throw error;
    }
  }

  static async updateSIPRule(id: string, rule: Partial<SIPRule>): Promise<void> {
    try {
      // Filter out undefined values
      const cleanRule = Object.fromEntries(
        Object.entries(rule).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, this.COLLECTIONS.SIP_RULES, id);
      await updateDoc(docRef, {
        ...cleanRule,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating SIP rule:', error);
      throw error;
    }
  }

  static async deleteSIPRule(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.SIP_RULES, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting SIP rule:', error);
      throw error;
    }
  }

  // ==================== Category Operations ====================

  // Get default categories from consolidated config document (1 read instead of 50+)
  static async getDefaultCategories(): Promise<any[]> {
    try {
      const docRef = doc(db, 'config', 'categories');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        return data.categories || [];
      }

      // Fallback: if config doc doesn't exist, return empty (will use local defaults)
      console.warn('[FirebaseService] Config categories document not found, using local defaults');
      return [];
    } catch (error) {
      console.error('Error getting default categories:', error);
      return [];
    }
  }

  // Get user's custom categories only (stored in a single user document field)
  // Falls back to legacy subcollection once and migrates to the user doc.
  static async getUserCustomCategories(userId: string): Promise<any[]> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() as any;
      const stored = Array.isArray(data?.categories) ? data.categories : null;

      if (stored) {
        return stored;
      }

      // Legacy fallback: read subcollection once, then migrate to user doc
      const q = query(
        collection(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.CATEGORIES)
      );
      const snapshot = await getDocs(q);
      const legacy = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

      if (legacy.length > 0) {
        await setDoc(userRef, {
          categories: legacy,
          categoriesUpdatedAt: serverTimestamp()
        }, { merge: true });
      }

      return legacy;
    } catch (error) {
      console.error('Error getting user categories:', error);
      throw error;
    }
  }

  // Legacy method - now combines default + custom categories
  static async getCategories(userId: string): Promise<any[]> {
    try {
      const [defaultCats, customCats] = await Promise.all([
        this.getDefaultCategories(),
        this.getUserCustomCategories(userId)
      ]);

      // Merge: defaults + user custom categories (user can override defaults by ID)
      const customIds = new Set(customCats.map(c => c.id));
      const merged = [
        ...defaultCats.filter(c => !customIds.has(c.id)),
        ...customCats
      ];

      return merged;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  static async addCategory(userId: string, category: any): Promise<string> {
    try {
      const cleanCategory = Object.fromEntries(
        Object.entries(category).filter(([_, value]) => value !== undefined)
      );

      // Generate ID without creating a document
      const newId = doc(collection(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.CATEGORIES)).id;
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() as any;
      const existing = Array.isArray(data?.categories) ? data.categories : [];

      const nowIso = new Date().toISOString();
      const newCategory = {
        ...cleanCategory,
        id: newId,
        userId,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      const updated = [...existing.filter((c: any) => c.id !== newId), newCategory];

      await setDoc(userRef, {
        categories: updated,
        categoriesUpdatedAt: serverTimestamp()
      }, { merge: true });

      return newId;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  static async addCategoryWithId(userId: string, categoryId: string, category: any): Promise<void> {
    try {
      const cleanCategory = Object.fromEntries(
        Object.entries(category).filter(([_, value]) => value !== undefined)
      );

      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() as any;
      const existing = Array.isArray(data?.categories) ? data.categories : [];

      const nowIso = new Date().toISOString();
      const newCategory = {
        ...cleanCategory,
        id: categoryId,
        userId,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      const updated = [...existing.filter((c: any) => c.id !== categoryId), newCategory];

      await setDoc(userRef, {
        categories: updated,
        categoriesUpdatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error adding category with ID:', error);
      throw error;
    }
  }

  static async updateCategory(userId: string, categoryId: string, updates: any): Promise<void> {
    try {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() as any;
      const existing = Array.isArray(data?.categories) ? data.categories : [];

      const updated = [...existing];
      const index = updated.findIndex((c: any) => c.id === categoryId);
      const next = {
        ...(index >= 0 ? updated[index] : { id: categoryId, userId }),
        ...cleanUpdates,
        updatedAt: new Date().toISOString()
      };

      if (index >= 0) {
        updated[index] = next;
      } else {
        updated.push(next);
      }

      await setDoc(userRef, {
        categories: updated,
        categoriesUpdatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  static async deleteCategory(userId: string, categoryId: string): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() as any;
      const existing = Array.isArray(data?.categories) ? data.categories : [];
      const updated = existing.filter((c: any) => c.id !== categoryId);

      await setDoc(userRef, {
        categories: updated,
        categoriesUpdatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // ==================== Tag Operations ====================

  static async getTags(userId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.TAGS)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    } catch (error) {
      console.error('Error getting tags:', error);
      throw error;
    }
  }

  static async addTag(userId: string, tag: any): Promise<string> {
    try {
      const cleanTag = Object.fromEntries(
        Object.entries(tag).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.TAGS), {
        ...cleanTag,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  }

  static async updateTag(userId: string, tagId: string, updates: any): Promise<void> {
    try {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      await updateDoc(doc(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.TAGS, tagId), {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating tag:', error);
      throw error;
    }
  }

  static async deleteTag(userId: string, tagId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.TAGS, tagId));
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }

  // Generic document operations for email notifications
  static async addDocument(collectionName: string, data: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  }

  static getCurrentUserId(): string | null {
    // This should be set from the auth context
    // For now, we'll get it from localStorage or return null
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || null;
  }
}

export default FirebaseService;