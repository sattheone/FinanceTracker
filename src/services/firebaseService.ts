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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Asset, Insurance, Goal, MonthlyBudget, Transaction, BankAccount, Liability } from '../types';
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
    LIABILITIES: 'liabilities'
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
        await updateDoc(docRef, {
          ...profile,
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
      const docRef = await addDoc(collection(db, this.COLLECTIONS.TRANSACTIONS), {
        ...transaction,
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
      const docRef = doc(db, this.COLLECTIONS.TRANSACTIONS, transactionId);
      await updateDoc(docRef, {
        ...updates,
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

  static async bulkAddTransactions(userId: string, transactions: Omit<Transaction, 'id'>[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      transactions.forEach(transaction => {
        const docRef = doc(collection(db, this.COLLECTIONS.TRANSACTIONS));
        batch.set(docRef, {
          ...transaction,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
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
      const docRef = doc(db, this.COLLECTIONS.ASSETS, assetId);
      await updateDoc(docRef, {
        ...updates,
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
      const docRef = await addDoc(collection(db, this.COLLECTIONS.INSURANCE), {
        ...insurance,
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
      const docRef = doc(db, this.COLLECTIONS.INSURANCE, insuranceId);
      await updateDoc(docRef, {
        ...updates,
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
      const docRef = await addDoc(collection(db, this.COLLECTIONS.GOALS), {
        ...goal,
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
      const docRef = doc(db, this.COLLECTIONS.GOALS, goalId);
      await updateDoc(docRef, {
        ...updates,
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
        await updateDoc(docRef, {
          ...budget,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new
        await addDoc(collection(db, this.COLLECTIONS.MONTHLY_BUDGETS), {
          ...budget,
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
      const docRef = doc(db, this.COLLECTIONS.BANK_ACCOUNTS, accountId);
      await updateDoc(docRef, {
        ...updates,
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

  // Utility functions
  static async deleteAllUserData(userId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Get all collections for the user
      const collections = [
        this.COLLECTIONS.TRANSACTIONS,
        this.COLLECTIONS.ASSETS,
        this.COLLECTIONS.INSURANCE,
        this.COLLECTIONS.GOALS,
        this.COLLECTIONS.MONTHLY_BUDGETS,
        this.COLLECTIONS.LIABILITIES
      ];
      
      for (const collectionName of collections) {
        const q = query(
          collection(db, collectionName),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        
        querySnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }
      
      // Delete user profile
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      batch.delete(userRef);
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }
}

export default FirebaseService;