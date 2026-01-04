import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Asset, Insurance, Goal, MonthlyBudget, Transaction, BankAccount, Liability, RecurringTransaction, Bill, CategoryRule, SIPRule } from '../types';
import { UserProfile } from '../types/user';

export class FirebaseService {
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
        const cleanProfile = Object.fromEntries(
          Object.entries(profile).filter(([_, value]) => value !== undefined)
        );

        await updateDoc(docRef, {
          ...cleanProfile,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new document
        await setDoc(docRef, {
          ...profile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
        ...doc.data()
      })) as Transaction[];

      return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  static async addTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Promise<string> {
    try {
      // Filter out undefined values as Firebase doesn't support them
      const cleanTransaction = Object.fromEntries(
        Object.entries(transaction).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.TRANSACTIONS), {
        ...cleanTransaction,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, this.COLLECTIONS.TRANSACTIONS, transactionId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
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
  ): Promise<void> {
    try {
      const BATCH_SIZE = 450; // Firestore limit is 500, keeping safety margin
      const total = transactions.length;
      let processed = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = transactions.slice(i, i + BATCH_SIZE);

        chunk.forEach(transaction => {
          // Filter out undefined values as Firebase doesn't support them
          const cleanTransaction = Object.fromEntries(
            Object.entries(transaction).filter(([_, value]) => value !== undefined)
          );

          const docRef = doc(collection(db, this.COLLECTIONS.TRANSACTIONS));
          batch.set(docRef, {
            ...cleanTransaction,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });

        await batch.commit();
        processed += chunk.length;

        if (onProgress) {
          onProgress(processed, total);
        }

        // Small delay to prevent rate limiting if many batches
        if (total > 1000) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error bulk adding transactions:', error);
      throw error;
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
        ...doc.data()
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
      const cleanAsset = Object.fromEntries(
        Object.entries(asset).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.ASSETS), {
        ...cleanAsset,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, this.COLLECTIONS.ASSETS, assetId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
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
        ...doc.data()
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
      const cleanInsurance = Object.fromEntries(
        Object.entries(insurance).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.INSURANCE), {
        ...cleanInsurance,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, this.COLLECTIONS.INSURANCE, insuranceId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
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
        ...doc.data()
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
      const cleanGoal = Object.fromEntries(
        Object.entries(goal).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(collection(db, this.COLLECTIONS.GOALS), {
        ...cleanGoal,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, this.COLLECTIONS.GOALS, goalId);
      await updateDoc(docRef, {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
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
        ...doc.data()
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
        ...doc.data()
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
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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
      const assets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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
          where('userId', '==', userId)
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
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringTransaction));
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
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
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
      console.log(`✅ Successfully deleted ${deletedCount} documents for user:`, userId);
    } catch (error) {
      console.error('❌ Error deleting user data:', error);
      throw error;
    }
  }

  // Category Rule Operations
  static async getCategoryRules(userId: string): Promise<CategoryRule[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.CATEGORY_RULES),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CategoryRule[];
    } catch (error) {
      console.error('Error getting category rules:', error);
      throw error;
    }
  }

  static async addCategoryRule(userId: string, rule: Omit<CategoryRule, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTIONS.CATEGORY_RULES), {
        ...rule,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding category rule:', error);
      throw error;
    }
  }

  static async updateCategoryRule(ruleId: string, updates: Partial<CategoryRule>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.CATEGORY_RULES, ruleId);
      // Sanitize undefineds and map to deleteField where needed
      const sanitized: Record<string, any> = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined) {
          if (key === 'transactionType') {
            sanitized[key] = deleteField();
          }
          // omit other undefined keys
        } else {
          sanitized[key] = value;
        }
      });
      await updateDoc(docRef, {
        ...sanitized,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating category rule:', error);
      throw error;
    }
  }

  static async deleteCategoryRule(ruleId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.CATEGORY_RULES, ruleId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting category rule:', error);
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
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SIPRule));
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

  static async getCategories(userId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.CATEGORIES)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

      const docRef = await addDoc(collection(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.CATEGORIES), {
        ...cleanCategory,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
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

      const docRef = doc(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.CATEGORIES, categoryId);
      await setDoc(docRef, {
        ...cleanCategory,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
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

      await updateDoc(doc(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.CATEGORIES, categoryId), {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  static async deleteCategory(userId: string, categoryId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTIONS.USERS, userId, this.COLLECTIONS.CATEGORIES, categoryId));
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
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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