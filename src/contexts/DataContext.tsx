import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Asset, Insurance, Goal, LICPolicy, MonthlyBudget, Transaction, BankAccount, Liability } from '../types';
import { UserProfile } from '../types/user';
import { useAuth } from './AuthContext';
import FirebaseService from '../services/firebaseService';

interface DataContextType {
  // User Profile
  userProfile: UserProfile | null;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  
  // Financial Data
  assets: Asset[];
  insurance: Insurance[];
  goals: Goal[];
  licPolicies: LICPolicy[];
  monthlyBudget: MonthlyBudget;
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  liabilities: Liability[];
  
  // CRUD Operations
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  
  addInsurance: (insurance: Omit<Insurance, 'id'>) => void;
  updateInsurance: (id: string, insurance: Partial<Insurance>) => void;
  deleteInsurance: (id: string) => void;
  
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addTransactionsBulk: (transactions: Omit<Transaction, 'id'>[]) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, account: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  
  addLiability: (liability: Omit<Liability, 'id'>) => void;
  updateLiability: (id: string, liability: Partial<Liability>) => void;
  deleteLiability: (id: string) => void;
  
  updateMonthlyBudget: (budget: Partial<MonthlyBudget>) => void;
  
  // Utility
  resetUserData: () => void;
  isDataLoaded: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

const getDefaultUserProfile = (): UserProfile => ({
  personalInfo: {
    name: '',
    email: '',
    dateOfBirth: '',
    spouseName: '',
    spouseDateOfBirth: '',
    children: [],
  },
  financialInfo: {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    retirementAge: 60,
    currentAge: 30,
  },
  onboardingStep: 0,
});

const getDefaultMonthlyBudget = (): MonthlyBudget => ({
  income: 0,
  expenses: {
    household: 0,
    insurance: 0,
    loans: 0,
    investments: 0,
    other: 0,
  },
  surplus: 0,
});

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Financial Data
  const [assets, setAssets] = useState<Asset[]>([]);
  const [insurance, setInsurance] = useState<Insurance[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [licPolicies, setLicPolicies] = useState<LICPolicy[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<MonthlyBudget>(getDefaultMonthlyBudget());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      loadUserData(user.id);
    } else {
      resetUserData();
    }
  }, [user]);

  const loadUserData = async (userId: string) => {
    try {
      setIsDataLoaded(false);
      
      // Load user profile
      const profile = await FirebaseService.getUserProfile(userId);
      if (profile) {
        setUserProfile(profile);
      } else {
        // Initialize with default data
        const defaultProfile = getDefaultUserProfile();
        if (user) {
          defaultProfile.personalInfo.name = user.name;
          defaultProfile.personalInfo.email = user.email;
        }
        setUserProfile(defaultProfile);
        await FirebaseService.createUserProfile(userId, defaultProfile);
      }

      // Load all financial data
      const [
        assetsData,
        insuranceData,
        goalsData,
        transactionsData,
        budgetData,
        bankAccountsData,
        liabilitiesData
      ] = await Promise.all([
        FirebaseService.getAssets(userId),
        FirebaseService.getInsurance(userId),
        FirebaseService.getGoals(userId),
        FirebaseService.getTransactions(userId),
        FirebaseService.getMonthlyBudget(userId),
        FirebaseService.getBankAccounts(userId),
        FirebaseService.getLiabilities(userId)
      ]);

      setAssets(assetsData);
      setInsurance(insuranceData);
      setGoals(goalsData);
      setTransactions(transactionsData);
      setMonthlyBudget(budgetData || getDefaultMonthlyBudget());
      setLicPolicies([]); // TODO: Implement LIC policies if needed
      
      // Load bank accounts and liabilities from Firebase
      setBankAccounts(bankAccountsData);
      setLiabilities(liabilitiesData);
      
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error loading user data:', error);
      resetUserData();
    }
  };

  const updateUserProfile = async (profile: Partial<UserProfile>) => {
    if (!user) return;
    
    const updatedProfile = userProfile ? { ...userProfile, ...profile } : getDefaultUserProfile();
    setUserProfile(updatedProfile);
    
    try {
      await FirebaseService.updateUserProfile(user.id, updatedProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  // Asset operations
  const addAsset = async (asset: Omit<Asset, 'id'>) => {
    if (!user) return;
    
    try {
      const id = await FirebaseService.addAsset(user.id, asset);
      const newAsset: Asset = { ...asset, id };
      setAssets(prev => [...prev, newAsset]);
    } catch (error) {
      console.error('Error adding asset:', error);
    }
  };

  const updateAsset = async (id: string, asset: Partial<Asset>) => {
    try {
      await FirebaseService.updateAsset(id, asset);
      setAssets(prev => prev.map(a => a.id === id ? { ...a, ...asset } : a));
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await FirebaseService.deleteAsset(id);
      setAssets(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  // Insurance operations
  const addInsurance = async (insurance: Omit<Insurance, 'id'>) => {
    if (!user) return;
    
    try {
      const id = await FirebaseService.addInsurance(user.id, insurance);
      const newInsurance: Insurance = { ...insurance, id };
      setInsurance(prev => [...prev, newInsurance]);
    } catch (error) {
      console.error('Error adding insurance:', error);
    }
  };

  const updateInsurance = async (id: string, insurance: Partial<Insurance>) => {
    try {
      await FirebaseService.updateInsurance(id, insurance);
      setInsurance(prev => prev.map(i => i.id === id ? { ...i, ...insurance } : i));
    } catch (error) {
      console.error('Error updating insurance:', error);
    }
  };

  const deleteInsurance = async (id: string) => {
    try {
      await FirebaseService.deleteInsurance(id);
      setInsurance(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting insurance:', error);
    }
  };

  // Goal operations
  const addGoal = async (goal: Omit<Goal, 'id'>) => {
    if (!user) return;
    
    try {
      const id = await FirebaseService.addGoal(user.id, goal);
      const newGoal: Goal = { ...goal, id };
      setGoals(prev => [...prev, newGoal]);
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const updateGoal = async (id: string, goal: Partial<Goal>) => {
    try {
      await FirebaseService.updateGoal(id, goal);
      setGoals(prev => prev.map(g => g.id === id ? { ...g, ...goal } : g));
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await FirebaseService.deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  // Transaction operations
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    
    try {
      const id = await FirebaseService.addTransaction(user.id, transaction);
      const newTransaction: Transaction = { ...transaction, id };
      setTransactions(prev => [...prev, newTransaction]);
      
      // Update bank account balance when transaction is added
      if (transaction.bankAccountId) {
        const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        await updateBankAccountBalance(transaction.bankAccountId, balanceChange);
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    try {
      const oldTransaction = transactions.find(t => t.id === id);
      await FirebaseService.updateTransaction(id, transaction);
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transaction } : t));
      
      // Update bank account balances if transaction amount or type changed
      if (oldTransaction && (transaction.amount !== undefined || transaction.type !== undefined || transaction.bankAccountId !== undefined)) {
        // Reverse old transaction effect
        if (oldTransaction.bankAccountId) {
          const oldBalanceChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
          await updateBankAccountBalance(oldTransaction.bankAccountId, oldBalanceChange);
        }
        
        // Apply new transaction effect
        const updatedTransaction = { ...oldTransaction, ...transaction };
        if (updatedTransaction.bankAccountId) {
          const newBalanceChange = updatedTransaction.type === 'income' ? updatedTransaction.amount : -updatedTransaction.amount;
          await updateBankAccountBalance(updatedTransaction.bankAccountId, newBalanceChange);
        }
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const addTransactionsBulk = async (transactions: Omit<Transaction, 'id'>[]) => {
    if (!user) return;
    
    try {
      await FirebaseService.bulkAddTransactions(user.id, transactions);
      
      // Update bank account balances for bulk transactions
      const balanceUpdates: Record<string, number> = {};
      transactions.forEach(transaction => {
        if (transaction.bankAccountId) {
          const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
          balanceUpdates[transaction.bankAccountId] = (balanceUpdates[transaction.bankAccountId] || 0) + balanceChange;
        }
      });
      
      // Apply balance updates
      for (const [accountId, balanceChange] of Object.entries(balanceUpdates)) {
        await updateBankAccountBalance(accountId, balanceChange);
      }
      
      // Reload transactions to get the new ones with IDs
      const updatedTransactions = await FirebaseService.getTransactions(user.id);
      setTransactions(updatedTransactions);
    } catch (error) {
      console.error('Error bulk adding transactions:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const transaction = transactions.find(t => t.id === id);
      await FirebaseService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      // Reverse transaction effect on bank account balance
      if (transaction && transaction.bankAccountId) {
        const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
        await updateBankAccountBalance(transaction.bankAccountId, balanceChange);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  // Bank Account operations
  const addBankAccount = async (account: Omit<BankAccount, 'id'>) => {
    if (!user) return;
    
    try {
      const id = await FirebaseService.addBankAccount(user.id, account);
      const newAccount: BankAccount = { ...account, id };
      setBankAccounts(prev => [...prev, newAccount]);
    } catch (error) {
      console.error('Error adding bank account:', error);
    }
  };

  const updateBankAccount = async (id: string, account: Partial<BankAccount>) => {
    try {
      await FirebaseService.updateBankAccount(id, account);
      setBankAccounts(prev => prev.map(a => a.id === id ? { ...a, ...account } : a));
    } catch (error) {
      console.error('Error updating bank account:', error);
    }
  };

  const deleteBankAccount = async (id: string) => {
    try {
      await FirebaseService.deleteBankAccount(id);
      setBankAccounts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting bank account:', error);
    }
  };

  // Helper function to update bank account balance
  const updateBankAccountBalance = async (accountId: string, balanceChange: number) => {
    try {
      const account = bankAccounts.find(acc => acc.id === accountId);
      if (account) {
        const newBalance = account.balance + balanceChange;
        await FirebaseService.updateBankAccount(accountId, { balance: newBalance });
        setBankAccounts(prev => prev.map(acc => 
          acc.id === accountId ? { ...acc, balance: newBalance } : acc
        ));
      }
    } catch (error) {
      console.error('Error updating bank account balance:', error);
    }
  };

  // Liability operations
  const addLiability = async (liability: Omit<Liability, 'id'>) => {
    if (!user) return;
    
    try {
      const id = await FirebaseService.addLiability(user.id, liability);
      const newLiability: Liability = { ...liability, id };
      setLiabilities(prev => [...prev, newLiability]);
    } catch (error) {
      console.error('Error adding liability:', error);
    }
  };

  const updateLiability = async (id: string, liability: Partial<Liability>) => {
    try {
      await FirebaseService.updateLiability(id, liability);
      setLiabilities(prev => prev.map(l => l.id === id ? { ...l, ...liability } : l));
    } catch (error) {
      console.error('Error updating liability:', error);
    }
  };

  const deleteLiability = async (id: string) => {
    try {
      await FirebaseService.deleteLiability(id);
      setLiabilities(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting liability:', error);
    }
  };

  const updateMonthlyBudget = async (budget: Partial<MonthlyBudget>) => {
    if (!user) return;
    
    const updatedBudget = { ...monthlyBudget, ...budget };
    setMonthlyBudget(updatedBudget);
    
    try {
      await FirebaseService.updateMonthlyBudget(user.id, updatedBudget);
    } catch (error) {
      console.error('Error updating monthly budget:', error);
    }
  };

  const resetUserData = () => {
    setUserProfile(getDefaultUserProfile());
    setAssets([]);
    setInsurance([]);
    setGoals([]);
    setLicPolicies([]);
    setMonthlyBudget(getDefaultMonthlyBudget());
    setTransactions([]);
    setBankAccounts([]);
    setLiabilities([]);
    setIsDataLoaded(false);
  };

  const value: DataContextType = {
    userProfile,
    updateUserProfile,
    assets,
    insurance,
    goals,
    licPolicies,
    monthlyBudget,
    transactions,
    bankAccounts,
    liabilities,
    addAsset,
    updateAsset,
    deleteAsset,
    addInsurance,
    updateInsurance,
    deleteInsurance,
    addGoal,
    updateGoal,
    deleteGoal,
    addTransaction,
    addTransactionsBulk,
    updateTransaction,
    deleteTransaction,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addLiability,
    updateLiability,
    deleteLiability,
    updateMonthlyBudget,
    resetUserData,
    isDataLoaded,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};