import React, { createContext, useContext, useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import { Asset, Insurance, Goal, LICPolicy, MonthlyBudget, Transaction, BankAccount, Liability, RecurringTransaction, Bill, SIPTransaction, CategoryRule, SIPRule, Tag } from '../types';
import { Category } from '../constants/categories';
import { UserProfile } from '../types/user';
import { useAuth } from './AuthContext';
import FirebaseService from '../services/firebaseService';
import GoalMigrationService from '../services/goalMigration';
import CategoryRuleService from '../services/categoryRuleService';
import SIPAutoUpdateService from '../services/sipAutoUpdateService';
import { incrementCategorySummary, decrementCategorySummary, updateCategorySummary, clearCategorySummaryCache } from '../services/categorySummaryService';


// Utility function to calculate next due date
const calculateNextDueDate = (currentDueDate: string, frequency: RecurringTransaction['frequency']): string => {
  const date = new Date(currentDueDate);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
};

const getMonthKey = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'invalid-date';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

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
  recurringTransactions: RecurringTransaction[];
  bills: Bill[];

  sipTransactions: SIPTransaction[];
  categoryRules: CategoryRule[];
  sipRules: SIPRule[];
  categories: Category[];
  tags: Tag[];

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
  addTransactionsBulk: (transactions: Omit<Transaction, 'id'>[], options?: { isHistorical?: boolean; skipDuplicateCheck?: boolean }) => Promise<{ success: boolean; summary?: any; error?: string }>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  bulkUpdateTransactions: (ids: string[], update: Partial<Transaction>) => Promise<void>;
  bulkUpdateTransactionsById: (updatesById: Record<string, Partial<Transaction>>) => Promise<void>;
  deleteTransaction: (id: string) => void;
  bulkDeleteTransactions: (ids: string[]) => Promise<void>;

  // Transaction paging (industry standard: don't load all history on cold start)
  loadMoreTransactions: () => Promise<void>;
  hasMoreTransactions: boolean;
  isLoadingMoreTransactions: boolean;

  // Helper to compute account balance from initialBalance + transactions
  getAccountBalance: (accountId: string) => number;

  addBankAccount: (account: Omit<BankAccount, 'id'>) => Promise<string | undefined>;
  updateBankAccount: (id: string, account: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;

  addLiability: (liability: Omit<Liability, 'id'>) => void;
  updateLiability: (id: string, liability: Partial<Liability>) => void;
  deleteLiability: (id: string) => void;

  addRecurringTransaction: (recurringTransaction: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurringTransaction: (id: string, recurringTransaction: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;

  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markBillAsPaid: (id: string, paidAmount?: number, paidDate?: string) => void;

  addSIPTransaction: (sipTransaction: Omit<SIPTransaction, 'id'>) => void;
  updateSIPTransaction: (id: string, sipTransaction: Partial<SIPTransaction>) => void;
  deleteSIPTransaction: (id: string) => void;

  addCategoryRule: (rule: Omit<CategoryRule, 'id'>) => void;
  updateCategoryRule: (id: string, rule: Partial<CategoryRule>) => void;
  deleteCategoryRule: (id: string) => void;
  applyRuleToTransactions: (ruleId: string) => Promise<void>;
  initializeDefaultCategoryRules: () => Promise<void>;

  // SIP Rules
  addSIPRule: (rule: Omit<SIPRule, 'id'>) => void;
  updateSIPRule: (id: string, rule: Partial<SIPRule>) => void;
  deleteSIPRule: (id: string) => void;

  // Category Operations
  addCategory: (category: Omit<Category, 'id'>) => Promise<string | undefined>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  // Grouping helpers
  ungroupChildren: (parentId: string) => Promise<void>;

  // Tag Operations
  addTag: (tag: Omit<Tag, 'id'>) => Promise<Tag | undefined>;
  updateTag: (id: string, tag: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;

  updateMonthlyBudget: (budget: Partial<MonthlyBudget>) => void;

  // Recurring transaction utilities
  processRecurringTransactions: () => void;
  getUpcomingBills: (days?: number) => Bill[];
  getOverdueBills: () => Bill[];

  // Utility
  resetUserData: () => void;
  isDataLoaded: boolean;
  indexes: {
    categoriesById: Map<string, Category>;
    bankAccountsById: Map<string, BankAccount>;
    transactionsById: Map<string, Transaction>;
    transactionsByAccountId: Map<string, Transaction[]>;
    transactionsByCategoryId: Map<string, Transaction[]>;
    transactionsByMonth: Map<string, Transaction[]>;
  };

  // Lazy loading functions
  loadGoals: () => Promise<void>;
  loadAssets: () => Promise<void>;
  loadInsurance: () => Promise<void>;
  loadLiabilities: () => Promise<void>;
  loadRecurringTransactions: () => Promise<void>;
  loadBills: () => Promise<void>;
  loadSIPRules: () => Promise<void>;
  loadMonthlyBudget: () => Promise<void>;
  loadInitialTransactions: () => Promise<void>;

  // Explicitly fetch transactions for a specific period (e.g., for reports/dashboard)
  loadTransactionsForPeriod: (startDate: string, endDate: string) => Promise<void>;
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
  },
  financialInfo: {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    retirementAge: 60,
    currentAge: 30,
  },
  displayPreferences: {
    defaultTimePeriod: 'current',
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
  const initialTransactionsLoadedRef = useRef(false);
  const loadedTransactionMonthsRef = useRef<Set<string>>(new Set());

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const userProfileRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  const updateUserProfile = (profilePatch: Partial<UserProfile>) => {
    if (!user) return;

    const base = userProfileRef.current ?? getDefaultUserProfile();
    const merged: UserProfile = {
      ...base,
      ...profilePatch,
      personalInfo: {
        ...base.personalInfo,
        ...(profilePatch.personalInfo ?? {})
      },
      financialInfo: {
        ...base.financialInfo,
        ...(profilePatch.financialInfo ?? {})
      }
    };

    setUserProfile(merged);

    // Fire-and-forget; UI state updates immediately.
    void FirebaseService.updateUserProfile(user.id, merged).catch(error => {
      console.error('Error updating user profile:', error);
    });
  };

  // Financial Data
  const [assets, setAssets] = useState<Asset[]>([]);
  const [insurance, setInsurance] = useState<Insurance[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [licPolicies, setLicPolicies] = useState<LICPolicy[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<MonthlyBudget>(getDefaultMonthlyBudget());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsCursor, setTransactionsCursor] = useState<{ date: string; id: string } | null>(null);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [sipTransactions, setSipTransactions] = useState<SIPTransaction[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [sipRules, setSipRules] = useState<SIPRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const indexes = useMemo(() => {
    const categoriesById = new Map<string, Category>();
    categories.forEach(category => {
      categoriesById.set(category.id, category);
    });

    const bankAccountsById = new Map<string, BankAccount>();
    bankAccounts.forEach(account => {
      bankAccountsById.set(account.id, account);
    });

    const transactionsById = new Map<string, Transaction>();
    const transactionsByAccountId = new Map<string, Transaction[]>();
    const transactionsByCategoryId = new Map<string, Transaction[]>();
    const transactionsByMonth = new Map<string, Transaction[]>();

    transactions.forEach(transaction => {
      transactionsById.set(transaction.id, transaction);

      if (transaction.bankAccountId) {
        const list = transactionsByAccountId.get(transaction.bankAccountId) || [];
        list.push(transaction);
        transactionsByAccountId.set(transaction.bankAccountId, list);
      }

      if (transaction.category) {
        const list = transactionsByCategoryId.get(transaction.category) || [];
        list.push(transaction);
        transactionsByCategoryId.set(transaction.category, list);
      }

      const monthKey = getMonthKey(transaction.date);
      const list = transactionsByMonth.get(monthKey) || [];
      list.push(transaction);
      transactionsByMonth.set(monthKey, list);
    });

    return {
      categoriesById,
      bankAccountsById,
      transactionsById,
      transactionsByAccountId,
      transactionsByCategoryId,
      transactionsByMonth
    };
  }, [categories, bankAccounts, transactions]);

  // Track if SIP auto-update has run this session
  const sipAutoUpdateRan = useRef(false);

  // Update localStorage for notification scheduler whenever data changes
  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('bills', JSON.stringify(bills));
      localStorage.setItem('recurringTransactions', JSON.stringify(recurringTransactions));
      localStorage.setItem('transactions', JSON.stringify(transactions));
    }
  }, [bills, recurringTransactions, transactions, isDataLoaded]);

  // Cache essential data to localStorage for offline-first loading
  useEffect(() => {
    if (isDataLoaded && bankAccounts.length > 0) {
      localStorage.setItem('bankAccounts', JSON.stringify(bankAccounts));
    }
  }, [bankAccounts, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded && categoryRules.length > 0) {
      localStorage.setItem('categoryRules', JSON.stringify(categoryRules));
    }
  }, [categoryRules, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded && userProfile) {
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
    }
  }, [userProfile, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded && categories.length > 0) {
      // Only cache custom categories (non-default)
      const customCats = categories.filter(c => (c as any).isCustom || (c as any).userId);
      if (customCats.length > 0) {
        localStorage.setItem('customCategories', JSON.stringify(customCats));
      }
    }
  }, [categories, isDataLoaded]);

  // Auto-update SIP investments when data is loaded (runs once per session)
  useEffect(() => {
    if (!isDataLoaded || sipAutoUpdateRan.current || !user) return;

    const todayKey = new Date().toISOString().slice(0, 10);
    const lastRun = localStorage.getItem('sipAutoUpdateLastRun');
    if (lastRun === todayKey) return;

    const processAutoSIP = async () => {
      sipAutoUpdateRan.current = true;
      localStorage.setItem('sipAutoUpdateLastRun', todayKey);

      try {
        const { updates, results } = await SIPAutoUpdateService.processAllDueSIPs(assets, true);

        if (results.length > 0) {
          console.log(`📊 SIP Auto-Update: Processing ${results.length} SIP(s)`);

          // Apply updates to each asset
          for (const [assetId, update] of updates) {
            await FirebaseService.updateAsset(assetId, update);
            setAssets(prev => {
              const updated = prev.map(a => a.id === assetId ? { ...a, ...update } : a);
              localStorage.setItem('assets', JSON.stringify(updated));
              return updated;
            });
          }

          // Log summary
          const totalAdded = results.reduce((sum, r) => sum + r.addedAmount, 0);
          console.log(`✅ SIP Auto-Update complete: Added ₹${totalAdded.toLocaleString()} across ${results.length} SIP(s)`);
        }
      } catch (error) {
        console.error('SIP Auto-Update failed:', error);
      }
    };

    processAutoSIP();
  }, [isDataLoaded, user, assets]);

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
      initialTransactionsLoadedRef.current = false;
      loadedTransactionMonthsRef.current = new Set();

      // Initialize empty collections - will be loaded lazily by respective pages
      setAssets([]);
      setInsurance([]);
      setGoals([]);
      setLiabilities([]);
      setRecurringTransactions([]);
      setBills([]);
      setSipRules([]);
      setMonthlyBudget(getDefaultMonthlyBudget());
      setLicPolicies([]);
      setTags([]);

      // ── PHASE 1: Load from localStorage cache (0 Firestore reads) ──
      let hasCachedData = false;

      // Load cached user profile
      try {
        const cachedProfile = localStorage.getItem('userProfile');
        if (cachedProfile) {
          setUserProfile(JSON.parse(cachedProfile));
          hasCachedData = true;
        }
      } catch (e) { console.warn('Error parsing cached user profile', e); }

      // Load cached bank accounts
      try {
        const cachedBankAccounts = localStorage.getItem('bankAccounts');
        if (cachedBankAccounts) {
          const parsed = JSON.parse(cachedBankAccounts);
          if (parsed.length > 0) {
            setBankAccounts(parsed);
            hasCachedData = true;
          }
        }
      } catch (e) { console.warn('Error parsing cached bank accounts', e); }

      // Load cached category rules
      try {
        const cachedRules = localStorage.getItem('categoryRules');
        if (cachedRules) {
          const parsed = JSON.parse(cachedRules);
          if (parsed.length > 0) {
            setCategoryRules(parsed);
          }
        }
      } catch (e) { console.warn('Error parsing cached category rules', e); }

      // Load cached transactions
      let hasCachedTransactions = false;
      try {
        const cachedTransactions = localStorage.getItem('transactions');
        if (cachedTransactions) {
          const parsed = JSON.parse(cachedTransactions);
          if (parsed.length > 0) {
            console.log(`[DataContext] Loaded ${parsed.length} transactions from local cache`);
            setTransactions(parsed);
            hasCachedTransactions = true;
            hasCachedData = true;

            // Pre-populate month cache from cached transactions so period loads are skipped
            parsed.forEach((t: Transaction) => {
              if (t.date) {
                const monthKey = getMonthKey(t.date);
                if (monthKey !== 'invalid-date') {
                  loadedTransactionMonthsRef.current.add(monthKey);
                }
              }
            });
            // Mark initial load as done since we have cache
            initialTransactionsLoadedRef.current = true;
            console.log(`[DataContext] Pre-populated ${loadedTransactionMonthsRef.current.size} month(s) from cache`);
          }
        }
      } catch (e) {
        console.error('Error parsing cached transactions', e);
      }

      if (!hasCachedTransactions) {
        setTransactions([]);
      }
      setTransactionsCursor(null);
      setHasMoreTransactions(false);

      // Load categories (defaults + cached custom categories)
      const { defaultCategories } = await import('../constants/categories');
      let customCategories: Category[] = [];
      try {
        const cachedCustomCats = localStorage.getItem('customCategories');
        if (cachedCustomCats) {
          customCategories = JSON.parse(cachedCustomCats);
        }
      } catch (e) { console.warn('Error parsing cached custom categories', e); }

      const customIds = new Set(customCategories.map(c => c.id));
      const mergedCategories = [
        ...defaultCategories.filter(c => !customIds.has(c.id)),
        ...customCategories
      ];
      setCategories(mergedCategories);

      // Mark as loaded immediately if we have cached data
      if (hasCachedData) {
        console.log('[DataContext] ✅ Loaded from cache (0 Firestore reads). Syncing in background...');
        setIsDataLoaded(true);
      }

      // ── PHASE 2: Background sync from Firestore (updates cache silently) ──
      // Only sync if cache is stale (older than 5 minutes) or no cache exists
      const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
      const lastSyncTime = parseInt(localStorage.getItem('lastSyncTimestamp') || '0', 10);
      const now = Date.now();
      const shouldSync = !hasCachedData || (now - lastSyncTime) > SYNC_INTERVAL_MS;

      if (shouldSync) {
      try {
        const [profile, bankAccountsData, categoryRulesData] = await Promise.all([
          FirebaseService.getUserProfile(userId),
          FirebaseService.getBankAccounts(userId),
          FirebaseService.getCategoryRules(userId),
        ]);

        if (profile) {
          setUserProfile(profile);
        } else if (!hasCachedData) {
          // First-time user with no cache
          const defaultProfile = getDefaultUserProfile();
          if (user) {
            defaultProfile.personalInfo.name = user.name;
            defaultProfile.personalInfo.email = user.email;
          }
          setUserProfile(defaultProfile);
          await FirebaseService.createUserProfile(userId, defaultProfile);
        }

        setBankAccounts(bankAccountsData);
        setCategoryRules(categoryRulesData);

        // Sync custom categories from Firestore
        try {
          if (user?.id) {
            const freshCustomCategories = await FirebaseService.getUserCustomCategories(user.id) as Category[];
            const freshCustomIds = new Set(freshCustomCategories.map(c => c.id));
            const freshMerged = [
              ...defaultCategories.filter(c => !freshCustomIds.has(c.id)),
              ...freshCustomCategories
            ];
            setCategories(freshMerged);
          }
        } catch (err) {
          console.warn('[DataContext] Failed to sync custom categories:', err);
        }

        localStorage.setItem('lastSyncTimestamp', String(Date.now()));
        console.log('[DataContext] ✅ Background sync complete');
      } catch (error) {
        console.error('[DataContext] Background sync error:', error);
      }
      } else {
        console.log('[DataContext] ⏭️ Skipping background sync (last sync was recent)');
      }

      if (!hasCachedData) {
        setIsDataLoaded(true);
      }
    } catch (error) {
      console.error('[DataContext] Error loading user data:', error);
      setIsDataLoaded(true);
    }
  };

  // Lazy loading functions for page-specific data
  // Each uses ref-based guard + localStorage cache to minimize Firestore reads
  const lazyLoadedRef = useRef<Set<string>>(new Set());

  const loadGoals = async () => {
    if (!user || lazyLoadedRef.current.has('goals')) return;
    lazyLoadedRef.current.add('goals');
    try {
      // Load from cache first
      const cached = localStorage.getItem('goals');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0 && goals.length === 0) {
          const migrated = GoalMigrationService.migrateGoals(parsed);
          setGoals(migrated);
        }
      }
      // Background sync from Firestore
      const goalsData = await FirebaseService.getGoals(user.id);
      const migratedGoals = GoalMigrationService.migrateGoals(goalsData);
      setGoals(migratedGoals);
      localStorage.setItem('goals', JSON.stringify(goalsData));
    } catch (error) {
      lazyLoadedRef.current.delete('goals');
      console.error('[DataContext] Error loading goals:', error);
    }
  };

  const loadAssets = async () => {
    if (!user || lazyLoadedRef.current.has('assets')) return;
    lazyLoadedRef.current.add('assets');
    try {
      const cached = localStorage.getItem('assets');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0 && assets.length === 0) {
          setAssets(parsed);
        }
      }
      const assetsData = await FirebaseService.getAssets(user.id);
      setAssets(assetsData);
      localStorage.setItem('assets', JSON.stringify(assetsData));
    } catch (error) {
      lazyLoadedRef.current.delete('assets');
      console.error('[DataContext] Error loading assets:', error);
    }
  };

  const loadInsurance = async () => {
    if (!user || lazyLoadedRef.current.has('insurance')) return;
    lazyLoadedRef.current.add('insurance');
    try {
      const cached = localStorage.getItem('insurance');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0 && insurance.length === 0) {
          setInsurance(parsed);
        }
      }
      const insuranceData = await FirebaseService.getInsurance(user.id);
      setInsurance(insuranceData);
      localStorage.setItem('insurance', JSON.stringify(insuranceData));
    } catch (error) {
      lazyLoadedRef.current.delete('insurance');
      console.error('[DataContext] Error loading insurance:', error);
    }
  };

  const loadLiabilities = async () => {
    if (!user || lazyLoadedRef.current.has('liabilities')) return;
    lazyLoadedRef.current.add('liabilities');
    try {
      const cached = localStorage.getItem('liabilities');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0 && liabilities.length === 0) {
          setLiabilities(parsed);
        }
      }
      const liabilitiesData = await FirebaseService.getLiabilities(user.id);
      setLiabilities(liabilitiesData);
      localStorage.setItem('liabilities', JSON.stringify(liabilitiesData));
    } catch (error) {
      lazyLoadedRef.current.delete('liabilities');
      console.error('[DataContext] Error loading liabilities:', error);
    }
  };

  const loadRecurringTransactions = async () => {
    if (!user || lazyLoadedRef.current.has('recurring')) return;
    lazyLoadedRef.current.add('recurring');
    try {
      const cached = localStorage.getItem('recurringTransactions');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0 && recurringTransactions.length === 0) {
          setRecurringTransactions(parsed);
        }
      }
      const data = await FirebaseService.getRecurringTransactions(user.id);
      setRecurringTransactions(data);
      localStorage.setItem('recurringTransactions', JSON.stringify(data));
    } catch (error) {
      lazyLoadedRef.current.delete('recurring');
      console.error('[DataContext] Error loading recurring transactions:', error);
    }
  };

  const loadBills = async () => {
    if (!user || lazyLoadedRef.current.has('bills')) return;
    lazyLoadedRef.current.add('bills');
    try {
      const cached = localStorage.getItem('bills');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0 && bills.length === 0) {
          setBills(parsed);
        }
      }
      const data = await FirebaseService.getBills(user.id);
      setBills(data);
      localStorage.setItem('bills', JSON.stringify(data));
    } catch (error) {
      lazyLoadedRef.current.delete('bills');
      console.error('[DataContext] Error loading bills:', error);
    }
  };

  const loadSIPRules = async () => {
    if (!user || lazyLoadedRef.current.has('sipRules')) return;
    lazyLoadedRef.current.add('sipRules');
    try {
      const data = await FirebaseService.getSIPRules(user.id);
      setSipRules(data);
    } catch (error) {
      lazyLoadedRef.current.delete('sipRules');
      console.error('[DataContext] Error loading SIP rules:', error);
    }
  };

  const loadMonthlyBudget = async () => {
    if (!user || lazyLoadedRef.current.has('budget')) return;
    lazyLoadedRef.current.add('budget');
    try {
      const cached = localStorage.getItem('monthlyBudget');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          setMonthlyBudget(parsed);
        }
      }
      const budgetData = await FirebaseService.getMonthlyBudget(user.id);
      const budget = budgetData || getDefaultMonthlyBudget();
      setMonthlyBudget(budget);
      localStorage.setItem('monthlyBudget', JSON.stringify(budget));
    } catch (error) {
      lazyLoadedRef.current.delete('budget');
      console.error('[DataContext] Error loading monthly budget:', error);
    }
  };

  const loadInitialTransactions = async () => {
    if (!user) return;
    if (initialTransactionsLoadedRef.current) return;
    // Mark immediately to prevent duplicate calls
    initialTransactionsLoadedRef.current = true;
    try {
      console.log(`[DataContext] Lazy loading initial transactions`);
      // Always fetch fresh data for page 1 to ensure sync
      const initialPage = await FirebaseService.getTransactionsPage(user.id, {
        pageSize: 50
      });

      setTransactions(prev => {
        // Merge strategy:
        // 1. Create Map of new items
        // 2. Override existing items with new ones (updates)
        // 3. Keep existing items that are NOT in the new batch (assuming they are older or not in this page)
        // But since we are fetching "Page 1" (most recent), we should prepend/merge carefully.

        // Actually, easiest way for Page 1 is: 
        // Take new items, add any existing items that are OLDER than the new items.
        // But if we have a gap, it is risky. 
        // Safer: Just dedup by ID.

        const newMap = new Map(initialPage.transactions.map(t => [t.id, t]));
        const merged = [...initialPage.transactions];

        prev.forEach(t => {
          if (!newMap.has(t.id)) {
            merged.push(t);
          }
        });

        // Final Sort
        return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      setTransactionsCursor(initialPage.nextCursor ?? null);
      setHasMoreTransactions(initialPage.hasMore);
      console.log(`[DataContext] Loaded ${initialPage.transactions.length} transactions`);
    } catch (error) {
      // Rollback so it can be retried
      initialTransactionsLoadedRef.current = false;
      console.error('[DataContext] Error loading transactions:', error);
      setTransactions([]);
      setTransactionsCursor(null);
      setHasMoreTransactions(false);
    }
  };

  const loadMoreTransactions = async () => {
    if (!user || isLoadingMoreTransactions || !hasMoreTransactions) return;
    if (!transactionsCursor) return;

    setIsLoadingMoreTransactions(true);
    try {
      const page = await FirebaseService.getTransactionsPage(user.id, {
        pageSize: 800,
        cursor: transactionsCursor
      });

      if (page.transactions.length > 0) {
        setTransactions(prev => {
          const seen = new Set(prev.map(t => t.id));
          const merged = [...prev];
          for (const transaction of page.transactions) {
            if (!seen.has(transaction.id)) merged.push(transaction);
          }
          return merged;
        });
      }

      setTransactionsCursor(page.nextCursor ?? null);
      setHasMoreTransactions(page.hasMore);
    } finally {
      setIsLoadingMoreTransactions(false);
    }
  };

  const loadTransactionsForPeriod = async (startDate: string, endDate: string) => {
    if (!user) return;
    const monthKey = getMonthKey(startDate);
    if (loadedTransactionMonthsRef.current.has(monthKey)) return;
    // Mark immediately to prevent duplicate parallel fetches
    loadedTransactionMonthsRef.current.add(monthKey);
    try {
      console.log(`[DataContext] Loading transactions for period: ${startDate} to ${endDate}`);
      const periodTransactions = await FirebaseService.getTransactionsByDateRange(user.id, startDate, endDate);

      if (periodTransactions.length > 0) {
        setTransactions(prev => {
          const seen = new Set(prev.map(t => t.id));
          const merged = [...prev];
          let addedCount = 0;

          for (const transaction of periodTransactions) {
            if (!seen.has(transaction.id)) {
              merged.push(transaction);
              seen.add(transaction.id);
              addedCount++;
            }
          }

          // Keep sorted
          if (addedCount > 0) {
            merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            console.log(`[DataContext] Added ${addedCount} new transactions from period fetch`);
            return merged;
          }
          return prev;
        });
      }
    } catch (error) {
      // Rollback so it can be retried
      loadedTransactionMonthsRef.current.delete(monthKey);
      console.error('[DataContext] Error loading detailed period transactions:', error);
    }
  };

  // Asset operations
  const addAsset = async (asset: Omit<Asset, 'id'>) => {
    if (!user) return;

    try {
      const id = await FirebaseService.addAsset(user.id, asset);
      const newAsset: Asset = { ...asset, id };
      setAssets(prev => {
        const updated = [...prev, newAsset];
        localStorage.setItem('assets', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error adding asset:', error);
    }
  };

  const updateAsset = async (id: string, asset: Partial<Asset>) => {
    try {
      await FirebaseService.updateAsset(id, asset);
      setAssets(prev => {
        const updated = prev.map(a => a.id === id ? { ...a, ...asset } : a);
        localStorage.setItem('assets', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await FirebaseService.deleteAsset(id);
      setAssets(prev => {
        const updated = prev.filter(a => a.id !== id);
        localStorage.setItem('assets', JSON.stringify(updated));
        return updated;
      });
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

      // Update category summary
      incrementCategorySummary(user.id, newTransaction).catch(err =>
        console.warn('Failed to update category summary:', err)
      );
      clearCategorySummaryCache();

      // No need to update bank account balance - it's computed from initialBalance + transactions
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    if (!user) return;

    const oldTransaction = transactions.find(t => t.id === id);
    const optimisticTransaction = oldTransaction ? { ...oldTransaction, ...transaction } : undefined;

    // Optimistic local update for immediate UI feedback (list + summary views)
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transaction } : t));
    clearCategorySummaryCache();

    // Keep derived category summaries in sync with optimistic update
    if (oldTransaction && optimisticTransaction) {
      updateCategorySummary(user.id, oldTransaction, optimisticTransaction).catch(err =>
        console.warn('Failed to update category summary:', err)
      );
    }

    try {
      await FirebaseService.updateTransaction(id, transaction);
      // No need to update bank account balance - it's computed from initialBalance + transactions
    } catch (error) {
      console.error('Error updating transaction:', error);

      // Roll back local transaction state on persistence failure
      if (oldTransaction) {
        setTransactions(prev => prev.map(t => t.id === id ? oldTransaction : t));
        clearCategorySummaryCache();

        // Best-effort rollback for summary docs as well
        if (optimisticTransaction) {
          updateCategorySummary(user.id, optimisticTransaction, oldTransaction).catch(err =>
            console.warn('Failed to rollback category summary after transaction update error:', err)
          );
        }
      }
    }
  };

  const bulkUpdateTransactions = async (ids: string[], update: Partial<Transaction>) => {
    if (!user) return;
    
    try {
      // Get old transactions for category summary updates
      const oldTransactionsMap = new Map<string, Transaction>();
      ids.forEach(id => {
        const t = transactions.find(tx => tx.id === id);
        if (t) oldTransactionsMap.set(id, t);
      });

      // 1. Update in Firebase (Batch)
      await FirebaseService.bulkUpdateTransactions(ids, update);

      // 2. Compute new state locally *once*
      const updatedTransactions = transactions.map(t =>
        ids.includes(t.id) ? { ...t, ...update } : t
      );

      setTransactions(updatedTransactions);

      // 3. Update category summaries if category changed
      if (update.category) {
        for (const id of ids) {
          const oldTransaction = oldTransactionsMap.get(id);
          const newTransaction = updatedTransactions.find(t => t.id === id);
          if (oldTransaction && newTransaction && oldTransaction.category !== newTransaction.category) {
            updateCategorySummary(user.id, oldTransaction, newTransaction).catch(err =>
              console.warn('Failed to update category summary for bulk update:', err)
            );
          }
        }
      }
      clearCategorySummaryCache();

      // No need to update bank account balance - it's computed from initialBalance + transactions

    } catch (error) {
      console.error('Error bulk updating transactions:', error);
    }
  };

  const bulkUpdateTransactionsById = async (updatesById: Record<string, Partial<Transaction>>) => {
    if (!user) return;
    
    try {
      const ids = Object.keys(updatesById);
      if (ids.length === 0) return;

      // Get old transactions for category summary updates
      const oldTransactionsMap = new Map<string, Transaction>();
      ids.forEach(id => {
        const t = transactions.find(tx => tx.id === id);
        if (t) oldTransactionsMap.set(id, t);
      });

      await FirebaseService.bulkUpdateTransactionsById(updatesById);

      const updatedTransactions = transactions.map(t =>
        updatesById[t.id] ? { ...t, ...updatesById[t.id] } : t
      );
      setTransactions(updatedTransactions);

      // Update category summaries for transactions where category changed
      for (const id of ids) {
        const update = updatesById[id];
        if (update.category) {
          const oldTransaction = oldTransactionsMap.get(id);
          const newTransaction = updatedTransactions.find(t => t.id === id);
          if (oldTransaction && newTransaction && oldTransaction.category !== newTransaction.category) {
            updateCategorySummary(user.id, oldTransaction, newTransaction).catch(err =>
              console.warn('Failed to update category summary for bulk update by ID:', err)
            );
          }
        }
      }
      clearCategorySummaryCache();

      // No need to update bank account balance - it's computed from initialBalance + transactions
    } catch (error) {
      console.error('Error bulk updating transactions by ID:', error);
    }
  };

  const addTransactionsBulk = async (
    newTransactions: Omit<Transaction, 'id'>[],
    options?: { isHistorical?: boolean; skipDuplicateCheck?: boolean }
  ): Promise<{ success: boolean; summary?: any; error?: string }> => {
    console.log('addTransactionsBulk called with', newTransactions.length, 'transactions');
    console.log('Current user:', user);

    if (!user) {
      console.error('User is not authenticated in addTransactionsBulk');
      return { success: false, error: 'User not authenticated' };
    }

    if (!user.id) {
      console.error('User ID is missing in addTransactionsBulk', user);
      return { success: false, error: 'User ID is missing' };
    }

    try {
      // Check user's duplicate detection preferences
      const duplicateSettings = JSON.parse(localStorage.getItem('duplicateDetectionSettings') || '{"enabled": true, "smartMode": true, "strictMode": false}');

      let transactionsToImport: Omit<Transaction, 'id'>[] = newTransactions;
      let duplicateCheck: any = null;

      // Only check for duplicates if user has it enabled
      if (duplicateSettings.enabled && !options?.skipDuplicateCheck) {
        const { default: duplicateDetectionService } = await import('../services/duplicateDetectionService');

        // Convert to full transactions for duplicate checking
        const fullTransactions: Transaction[] = newTransactions.map(t => ({
          ...t,
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));

        // Determine mode based on user preferences
        const useSmartMode = duplicateSettings.smartMode && !duplicateSettings.strictMode;

        // Check for duplicates against EXISTING transactions (from state)
        duplicateCheck = duplicateDetectionService.checkBulkDuplicates(fullTransactions, transactions, useSmartMode);

        if (duplicateCheck.duplicateTransactions > 0) {
          // If we have duplicates, we need to handle them
          // For now, we'll just return the duplicate check result and let the UI handle it
          // The UI should show a dialog to resolve duplicates
          return {
            success: false,
            summary: duplicateCheck
          };
        }
      }

      console.log('Calling FirebaseService.bulkAddTransactions with userId:', user.id);

      // Validate and fix category IDs - ensure all categories exist
      const categoryIds = new Set(categories.map(c => c.id));
      const categoryNames = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
      
      const validatedTransactions = transactionsToImport.map(transaction => {
        let categoryId = transaction.category;
        
        // If category exists as ID, use it
        if (categoryId && categoryIds.has(categoryId)) {
          return transaction;
        }
        
        // If category is a name (not ID), try to find matching category by name
        if (categoryId) {
          const matchedId = categoryNames.get(categoryId.toLowerCase());
          if (matchedId) {
            console.log(`Mapped category name "${categoryId}" to ID "${matchedId}"`);
            return { ...transaction, category: matchedId };
          }
        }
        
        // If category not found, default to 'uncategorized' or 'other'
        const fallbackCategory = categoryIds.has('uncategorized') ? 'uncategorized' : 
                                  categoryIds.has('other') ? 'other' : 
                                  categories[0]?.id || 'other';
        console.log(`Category "${categoryId}" not found, using fallback: "${fallbackCategory}"`);
        return { ...transaction, category: fallbackCategory };
      });

      // Clean transactions by removing undefined values
      const cleanedTransactions = validatedTransactions.map(transaction => {
        const cleaned = Object.fromEntries(
          Object.entries(transaction).filter(([_, value]) => value !== undefined)
        );
        return cleaned as Omit<Transaction, 'id'>;
      });

      const createdTransactions = await FirebaseService.bulkAddTransactions(user.id, cleanedTransactions);
      const mergedTransactions = [...transactions, ...createdTransactions];
      setTransactions(mergedTransactions);

      // Recalculate balance for affected bank accounts
      // Group transactions by bank account
      const accountsToUpdate = new Set(transactionsToImport.map(t => t.bankAccountId).filter(Boolean));

      if (accountsToUpdate.size > 0) {
        setBankAccounts(prev => prev.map(account => {
          if (!accountsToUpdate.has(account.id)) return account;

          // Calculate new balance from initialBalance + all transactions
          const accountTransactions = mergedTransactions.filter(t => t.bankAccountId === account.id);
          const totalTransactionAmount = accountTransactions.reduce((sum, t) => {
            return sum + (t.type === 'income' ? t.amount : -t.amount);
          }, 0);

          let initialBalance = account.initialBalance ?? account.balance ?? 0;

          // If historical import, adjust initialBalance so that the FINAL balance remains unchanged
          if (options?.isHistorical) {
            const importedForAccount = cleanedTransactions.filter(t => t.bankAccountId === account.id);
            const netImported = importedForAccount.reduce((sum, t) => {
              return sum + (t.type === 'income' ? t.amount : -t.amount);
            }, 0);
            initialBalance -= netImported;
          }

          const newBalance = initialBalance + totalTransactionAmount;

          // Update both balance and initialBalance if not set
          return {
            ...account,
            balance: newBalance,
            initialBalance: initialBalance
          };
        }));
      }

      if (accountsToUpdate.size > 0) {
        const accountUpdates = bankAccounts
          .filter(account => accountsToUpdate.has(account.id))
          .map(account => {



            let initialBalance = account.initialBalance ?? 0;

            if (options?.isHistorical) {
              const importedForAccount = cleanedTransactions.filter(t => t.bankAccountId === account.id);
              const netImported = importedForAccount.reduce((sum, t) => {
                return sum + (t.type === 'income' ? t.amount : -t.amount);
              }, 0);
              initialBalance -= netImported;
            }



            return {
              id: account.id,
              update: {
                initialBalance
              }
            };
          });

        await FirebaseService.bulkUpdateBankAccounts(accountUpdates);

        setBankAccounts(prev => prev.map(account => {
          const updateEntry = accountUpdates.find(entry => entry.id === account.id);
          if (!updateEntry) return account;
          return {
            ...account,
            ...updateEntry.update
          };
        }));
      }

      clearCategorySummaryCache();

      return {
        success: true,
        summary: duplicateCheck || {
          totalTransactions: newTransactions.length,
          newTransactions: transactionsToImport.length,
          duplicateTransactions: 0
        }
      };
    } catch (error) {
      console.error('Error bulk adding transactions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    
    try {
      // Get the transaction before deleting for summary update
      const transactionToDelete = transactions.find(t => t.id === id);
      
      await FirebaseService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));

      // Update category summary
      if (transactionToDelete) {
        decrementCategorySummary(user.id, transactionToDelete).catch(err =>
          console.warn('Failed to update category summary:', err)
        );
      }
      clearCategorySummaryCache();

      // No need to update bank account balance - it's computed from initialBalance + transactions
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const bulkDeleteTransactions = async (ids: string[]) => {
    try {
      // 1. Delete from Firebase (Batch)
      await FirebaseService.bulkDeleteTransactions(ids);

      // 2. Update local state
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      clearCategorySummaryCache();

      // No need to update bank account balance - it's computed from initialBalance + transactions

    } catch (error) {
      console.error('Error bulk deleting transactions:', error);
    }
  };

  // Bank Account operations
  const addBankAccount = async (account: Omit<BankAccount, 'id'>) => {
    if (!user) return;

    try {
      const id = await FirebaseService.addBankAccount(user.id, account);
      const newAccount: BankAccount = { ...account, id };
      setBankAccounts(prev => [...prev, newAccount]);
      return id;
    } catch (error) {
      console.error('Error adding bank account:', error);
    }
  };

  const updateBankAccount = async (id: string, account: Partial<BankAccount>) => {
    try {
      // Only update the initialBalance field - balance is computed from transactions
      const updateData = { ...account };

      await FirebaseService.updateBankAccount(id, updateData);
      setBankAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updateData } : a));
    } catch (error) {
      console.error('Error updating bank account:', error);
    }
  };

  // Helper function to compute account balance from initialBalance + transactions
  // Formula: currentBalance = initialBalance + sum(income) - sum(expenses)
  const getAccountBalance = (accountId: string): number => {
    const account = bankAccounts.find(a => a.id === accountId);
    if (!account) return 0;

    const accountTransactions = transactions.filter(t => t.bankAccountId === accountId);
    const totalTransactionAmount = accountTransactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    return account.initialBalance + totalTransactionAmount;
  };

  const deleteBankAccount = async (id: string) => {
    try {
      await FirebaseService.deleteBankAccount(id);
      setBankAccounts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting bank account:', error);
    }
  };

  // Helper function to update bank account balance - DEPRECATED
  // Balances are now calculated dynamically

  const addSIPRule = async (rule: Omit<SIPRule, 'id'>) => {
    if (!user) return;
    try {
      const id = await FirebaseService.addSIPRule(user.id, rule);
      setSipRules(prev => [...prev, { ...rule, id }]);
    } catch (error) {
      console.error('Error adding SIP rule:', error);
    }
  };

  const updateSIPRule = async (id: string, rule: Partial<SIPRule>) => {
    try {
      await FirebaseService.updateSIPRule(id, rule);
      setSipRules(prev => prev.map(r => r.id === id ? { ...r, ...rule } : r));
    } catch (error) {
      console.error('Error updating SIP rule:', error);
    }
  };

  const deleteSIPRule = async (id: string) => {
    try {
      await FirebaseService.deleteSIPRule(id);
      setSipRules(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting SIP rule:', error);
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
    console.log('DataContext: Updating liability', id, liability);
    try {
      await FirebaseService.updateLiability(id, liability);
      console.log('DataContext: Firebase update success');
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

  // Recurring Transactions operations
  const addRecurringTransaction = async (recurringTransaction: Omit<RecurringTransaction, 'id'>) => {
    if (!user) return;

    try {
      const id = await FirebaseService.addRecurringTransaction(user.id, recurringTransaction);
      const newRecurringTransaction: RecurringTransaction = { ...recurringTransaction, id };
      setRecurringTransactions(prev => [...prev, newRecurringTransaction]);
    } catch (error) {
      console.error('Error adding recurring transaction:', error);
    }
  };

  const updateRecurringTransaction = async (id: string, recurringTransaction: Partial<RecurringTransaction>) => {
    try {
      await FirebaseService.updateRecurringTransaction(id, recurringTransaction);
      setRecurringTransactions(prev => prev.map(rt => rt.id === id ? { ...rt, ...recurringTransaction } : rt));
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
    }
  };

  const deleteRecurringTransaction = async (id: string) => {
    try {
      await FirebaseService.deleteRecurringTransaction(id);
      setRecurringTransactions(prev => prev.filter(rt => rt.id !== id));
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
    }
  };

  // Bills operations
  const addBill = async (bill: Omit<Bill, 'id'>) => {
    if (!user) return;

    try {
      const id = await FirebaseService.addBill(user.id, bill);
      const newBill: Bill = { ...bill, id };
      setBills(prev => [...prev, newBill]);
    } catch (error) {
      console.error('Error adding bill:', error);
    }
  };

  const updateBill = async (id: string, bill: Partial<Bill>) => {
    try {
      await FirebaseService.updateBill(id, bill);
      setBills(prev => prev.map(b => b.id === id ? { ...b, ...bill } : b));
    } catch (error) {
      console.error('Error updating bill:', error);
    }
  };

  const deleteBill = async (id: string) => {
    try {
      await FirebaseService.deleteBill(id);
      setBills(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const markBillAsPaid = async (id: string, paidAmount?: number, paidDate?: string) => {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    const updatedBill = {
      isPaid: true,
      paidAmount: paidAmount || bill.amount,
      paidDate: paidDate || new Date().toISOString().split('T')[0],
      isOverdue: false
    };

    await updateBill(id, updatedBill);

    // Create a transaction for the payment
    if (bill.bankAccountId) {
      const transaction: Omit<Transaction, 'id'> = {
        date: updatedBill.paidDate,
        description: `Bill Payment: ${bill.name}`,
        category: bill.category,
        type: 'expense',
        amount: updatedBill.paidAmount,
        bankAccountId: bill.bankAccountId,
        recurringTransactionId: bill.recurringTransactionId
      };
      await addTransaction(transaction);
    }
  };

  // SIP Transaction operations
  const addSIPTransaction = async (sipTransaction: Omit<SIPTransaction, 'id'>) => {
    if (!user) return;

    try {
      const id = await FirebaseService.addSIPTransaction(user.id, sipTransaction);
      const newSIPTransaction: SIPTransaction = { ...sipTransaction, id };
      setSipTransactions(prev => [...prev, newSIPTransaction]);
    } catch (error) {
      console.error('Error adding SIP transaction:', error);
    }
  };

  const updateSIPTransaction = async (id: string, sipTransaction: Partial<SIPTransaction>) => {
    try {
      await FirebaseService.updateSIPTransaction(id, sipTransaction);
      setSipTransactions(prev => prev.map(s => s.id === id ? { ...s, ...sipTransaction } : s));
    } catch (error) {
      console.error('Error updating SIP transaction:', error);
    }
  };

  const deleteSIPTransaction = async (id: string) => {
    try {
      await FirebaseService.deleteSIPTransaction(id);
      setSipTransactions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting SIP transaction:', error);
    }
  };

  // Category Operations
  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!user) return;

    try {
      const id = await FirebaseService.addCategory(user.id, category);
      const newCategory: Category = { ...category, id };
      setCategories(prev => [...prev, newCategory]);
      return id;
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    if (!user) return;
    console.log('[DataContext] updateCategory called:', { id, category });
    try {
      console.log('[DataContext] Calling FirebaseService.updateCategory...');
      await FirebaseService.updateCategory(user.id, id, category);
      console.log('[DataContext] Firebase update successful, updating local state');
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...category } : c));
      console.log('[DataContext] Local state updated');
    } catch (error) {
      console.error('[DataContext] Error updating category:', error);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;

    // Check if system category
    const categoryToDelete = categories.find(c => c.id === id);
    if (categoryToDelete?.isSystem) {
      alert('System categories (like Transfer) cannot be deleted.');
      return;
    }

    try {
      // If deleting a parent group, first ungroup its children (make them standalone)
      const children = categories.filter(c => c.parentId === id);
      if (children.length > 0) {
        await Promise.all(children.map(child => updateCategory(child.id, { parentId: undefined })));
      }

      await FirebaseService.deleteCategory(user.id, id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Helper: Ungroup all children of a parent (keep the parent group even if empty)
  const ungroupChildren = async (parentId: string) => {
    if (!user) return;

    try {
      const children = categories.filter(c => c.parentId === parentId);
      if (children.length === 0) {
        // Nothing to ungroup; keep the parent as an empty group
        return;
      }

      // Update all children in Firebase first
      await Promise.all(children.map(child => FirebaseService.updateCategory(user.id, child.id, { parentId: undefined })));

      // Compute new categories snapshot where children are ungrouped
      const newCategories = categories.map(c => c.parentId === parentId ? { ...c, parentId: undefined } as Category : c);
      setCategories(newCategories);
    } catch (error) {
      console.error('[DataContext] Error ungrouping children:', error);
    }
  };

  // Tag Operations
  const addTag = async (tag: Omit<Tag, 'id'>) => {
    if (!user) return;

    try {
      const id = await FirebaseService.addTag(user.id, tag);
      const newTag: Tag = { ...tag, id };
      setTags(prev => [...prev, newTag]);
      return newTag;
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const updateTag = async (id: string, tag: Partial<Tag>) => {
    if (!user) return;

    try {
      await FirebaseService.updateTag(user.id, id, tag);
      setTags(prev => prev.map(t => t.id === id ? { ...t, ...tag } : t));
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const deleteTag = async (id: string) => {
    if (!user) return;

    try {
      await FirebaseService.deleteTag(user.id, id);
      setTags(prev => prev.filter(t => t.id !== id));

      // Remove tag from all transactions
      const transactionsWithTag = transactions.filter(t => t.tags?.includes(id));
      for (const transaction of transactionsWithTag) {
        const updatedTags = transaction.tags?.filter(tagId => tagId !== id) || [];
        updateTransaction(transaction.id, { tags: updatedTags });
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  // Utility functions
  const processRecurringTransactions = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    for (const rt of recurringTransactions) {
      if (!rt.isActive || !rt.autoCreate) continue;

      const nextDue = new Date(rt.nextDueDate);
      if (nextDue <= today && rt.lastProcessedDate !== todayStr) {
        // Create transaction
        const transaction: Omit<Transaction, 'id'> = {
          date: todayStr,
          description: rt.description,
          category: rt.category,
          type: rt.type,
          amount: rt.amount,
          bankAccountId: rt.bankAccountId,
          paymentMethod: rt.paymentMethod,
          recurringTransactionId: rt.id
        };

        await addTransaction(transaction);

        // Calculate next due date
        const nextDueDate = calculateNextDueDate(rt.nextDueDate, rt.frequency);

        // Update recurring transaction
        await updateRecurringTransaction(rt.id, {
          nextDueDate,
          lastProcessedDate: todayStr
        });
      }
    }
  };

  const getUpcomingBills = (days: number = 7): Bill[] => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return bills.filter(bill => {
      if (bill.isPaid) return false;
      const dueDate = new Date(bill.dueDate);
      return dueDate >= today && dueDate <= futureDate;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const getOverdueBills = (): Bill[] => {
    const today = new Date();
    return bills.filter(bill => {
      if (bill.isPaid) return false;
      const dueDate = new Date(bill.dueDate);
      return dueDate < today;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  // Category Rules operations
  // Category Rules operations
  const addCategoryRule = async (rule: Omit<CategoryRule, 'id'>) => {
    if (!user) return;

    try {
      // 1. Apply rule to existing transactions first to get match count
      // We need a temp rule object for matching logic
      const tempRule: CategoryRule = { ...rule, id: 'temp' };

      const updatesById: Record<string, Partial<Transaction>> = {};
      const matchCount = CategoryRuleService.applyRuleBulk(
        transactions,
        tempRule,
        (transactionId, updates) => {
          updatesById[transactionId] = {
            ...updatesById[transactionId],
            ...updates
          };
        }
      );

      if (Object.keys(updatesById).length > 0) {
        await FirebaseService.bulkUpdateTransactionsById(updatesById);
        setTransactions(prev => prev.map(t =>
          updatesById[t.id] ? { ...t, ...updatesById[t.id] } : t
        ));
      }

      // 2. Update rule stats
      const ruleWithStats = CategoryRuleService.updateRuleStats(tempRule, matchCount);

      // 3. Remove temp ID and save to Firebase
      const { id: _, ...ruleToSave } = ruleWithStats;
      const newId = await FirebaseService.addCategoryRule(user.id, ruleToSave);

      // 4. Update state with real ID
      const finalRule = { ...ruleWithStats, id: newId };
      setCategoryRules(prev => [...prev, finalRule]);
    } catch (error) {
      console.error('Error adding category rule:', error);
    }
  };

  const updateCategoryRule = async (id: string, updates: Partial<CategoryRule>) => {
    try {
      if (!user) return;
      await FirebaseService.updateCategoryRule(user.id, id, updates);
      setCategoryRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (error) {
      console.error('Error updating category rule:', error);
    }
  };

  const deleteCategoryRule = async (id: string) => {
    try {
      if (!user) return;
      await FirebaseService.deleteCategoryRule(user.id, id);
      setCategoryRules(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting category rule:', error);
    }
  };

  const applyRuleToTransactions = async (ruleId: string) => {
    const rule = categoryRules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatesById: Record<string, Partial<Transaction>> = {};
    const matchCount = CategoryRuleService.applyRuleBulk(
      transactions,
      rule,
      (transactionId, updates) => {
        updatesById[transactionId] = {
          ...updatesById[transactionId],
          ...updates
        };
      }
    );

    if (Object.keys(updatesById).length > 0) {
      await FirebaseService.bulkUpdateTransactionsById(updatesById);
      setTransactions(prev => prev.map(t =>
        updatesById[t.id] ? { ...t, ...updatesById[t.id] } : t
      ));
    }

    // Update rule stats
    const updatedRule = CategoryRuleService.updateRuleStats(rule, matchCount);
    updateCategoryRule(ruleId, updatedRule);
  };

  const initializeDefaultCategoryRules = async () => {
    if (!user) return;

    try {
      console.log('[DataContext] Initializing default category rules...');
      const { defaultCategoryRules } = await import('../constants/defaultCategoryRules');

      const rulesWithIds: CategoryRule[] = defaultCategoryRules.map(rule => ({
        ...rule,
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        createdAt: new Date().toISOString(),
        matchCount: 0,
      }));

      // Use bulk add for efficiency and consistency
      console.log('[DataContext] Bulk adding rules to Firebase...');
      await FirebaseService.bulkAddCategoryRules(user.id, rulesWithIds);
      console.log('[DataContext] Bulk add complete.');

      // Reload from Firebase to ensure we have the exact server state (timestamps, etc.)
      const freshRules = await FirebaseService.getCategoryRules(user.id);
      setCategoryRules(freshRules);

      console.log('[DataContext] Initialized', freshRules.length, 'default category rules');
      alert(`Successfully added ${freshRules.length} default category rules.`);
    } catch (error) {
      console.error('Error initializing default category rules:', error);
      alert('Failed to add default rules. Check console for details.');
    }
  };

  const resetUserData = () => {
    initialTransactionsLoadedRef.current = false;
    loadedTransactionMonthsRef.current = new Set();
    lazyLoadedRef.current = new Set();
    setUserProfile(getDefaultUserProfile());
    setAssets([]);
    setInsurance([]);
    setGoals([]);
    setLicPolicies([]);
    setMonthlyBudget(getDefaultMonthlyBudget());
    setTransactions([]);
    setTransactionsCursor(null);
    setHasMoreTransactions(false);
    setIsLoadingMoreTransactions(false);
    setBankAccounts([]);
    setLiabilities([]);
    setRecurringTransactions([]);
    setBills([]);
    setCategoryRules([]);
    setIsDataLoaded(false);
    // Clear all localStorage caches
    localStorage.removeItem('transactions');
    localStorage.removeItem('bankAccounts');
    localStorage.removeItem('categoryRules');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('customCategories');
    localStorage.removeItem('bills');
    localStorage.removeItem('recurringTransactions');
    localStorage.removeItem('lastSyncTimestamp');
    localStorage.removeItem('goals');
    localStorage.removeItem('assets');
    localStorage.removeItem('insurance');
    localStorage.removeItem('liabilities');
    localStorage.removeItem('monthlyBudget');
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
    loadMoreTransactions,
    hasMoreTransactions,
    isLoadingMoreTransactions,
    bankAccounts,
    liabilities,
    recurringTransactions,
    bills,
    sipTransactions,
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
    getAccountBalance,
    addLiability,
    updateLiability,
    deleteLiability,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    addBill,
    updateBill,
    deleteBill,
    markBillAsPaid,
    addSIPTransaction,
    updateSIPTransaction,
    deleteSIPTransaction,
    categoryRules,
    addCategoryRule,
    updateCategoryRule,
    deleteCategoryRule,
    applyRuleToTransactions,
    initializeDefaultCategoryRules,
    sipRules,
    addSIPRule,
    updateSIPRule,
    deleteSIPRule,

    // Categories
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    ungroupChildren,

    // Tags
    tags,
    addTag,
    updateTag,
    deleteTag,

    updateMonthlyBudget,

    // Recurring transaction utilities
    processRecurringTransactions,
    getUpcomingBills,
    getOverdueBills,

    // Utility
    resetUserData,
    isDataLoaded,
    indexes,
    bulkUpdateTransactions,
    bulkUpdateTransactionsById,
    bulkDeleteTransactions,

    // Lazy loading functions
    loadGoals,
    loadAssets,
    loadInsurance,
    loadLiabilities,
    loadRecurringTransactions,
    loadBills,
    loadSIPRules,
    loadMonthlyBudget,
    loadInitialTransactions,
    loadTransactionsForPeriod,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};