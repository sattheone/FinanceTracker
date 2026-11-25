import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import { Asset, Insurance, Goal, LifeEvent, LICPolicy, MonthlyBudget, Transaction, BankAccount, Liability, RecurringTransaction, Bill, SIPTransaction, CategoryRule, SIPRule, Tag, DashboardSummary } from '../types';
import { Category, isTransferTransaction } from '../constants/categories';
import { autoPairCandidate, buildTransferCounterpart, findAutoCreatedCounterpart, findTransferCandidates } from '../services/transferPairing';
import { UserProfile, SyncSettings } from '../types/user';
import { useAuth } from './AuthContext';
import FirebaseService from '../services/firebaseService';
import statementPasswordStore from '../services/statementPasswordStore';
import { deleteField } from 'firebase/firestore';
import { goOffline, goOnline } from '../config/firebase';
import GoalMigrationService from '../services/goalMigration';
import CategoryRuleService from '../services/categoryRuleService';
import { clearCategorySummaryCache, setCurrentUserId, MonthlySummary, refreshMonthlySummaries, patchMonthlySummaries, rebuildMonthlySummariesClient, writeSummaryDeltas, accountNetFromSummaries, SUMMARY_SCHEMA_VERSION } from '../services/categorySummaryService';


// Transaction pagination page sizes (each doc = 1 Firestore read).
// First page is small for a fast first paint; subsequent pages are moderate so
// a single "Load More" is not an 800-read burst.
const TRANSACTIONS_INITIAL_PAGE_SIZE = 50;
const TRANSACTIONS_MORE_PAGE_SIZE = 200;

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

const MONTH_TRANSACTIONS_CACHE_PREFIX = 'transactionsByMonth:v1';
const USER_STORAGE_PREFIX = 'ft_v1';

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[DataContext] Failed to read ${key} from storage:`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`[DataContext] Failed to write ${key} to storage (quota exceeded or disabled):`, e);
      return false;
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[DataContext] Failed to remove ${key} from storage:`, e);
    }
  }
};

const getUserStorageKey = (userId: string, key: string) => `${USER_STORAGE_PREFIX}:${userId}:${key}`;

const readUserCache = <T = any>(userId: string, key: string, fallbackLegacyKey?: string): T | null => {
  const primary = safeLocalStorage.getItem(getUserStorageKey(userId, key));
  if (primary) {
    try { return JSON.parse(primary) as T; } catch { return null; }
  }
  if (fallbackLegacyKey) {
    const legacy = safeLocalStorage.getItem(fallbackLegacyKey);
    if (legacy) {
      try { return JSON.parse(legacy) as T; } catch { return null; }
    }
  }
  return null;
};

const writeUserCache = (userId: string, key: string, data: any): void => {
  if (!userId) return;
  safeLocalStorage.setItem(getUserStorageKey(userId, key), JSON.stringify(data));
};

const clearAllUserStorage = (userId?: string | null) => {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];

  const userPrefix = userId ? `${USER_STORAGE_PREFIX}:${userId}:` : `${USER_STORAGE_PREFIX}:`;
  const monthPrefix = userId ? `${MONTH_TRANSACTIONS_CACHE_PREFIX}:${userId}:` : `${MONTH_TRANSACTIONS_CACHE_PREFIX}:`;
  const balancePrefix = userId ? `accountBalances:${userId}` : 'accountBalances:';

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(userPrefix) || key.startsWith(monthPrefix) || key.startsWith(balancePrefix)) {
      keysToRemove.push(key);
    }
  }

  // Also clean up any un-namespaced legacy keys
  const legacyKeys = [
    'userProfile', 'dashboardSummary', 'bankAccounts', 'categoryRules',
    'transactions', 'bills', 'recurringTransactions', 'customCategories',
    'goals', 'assets', 'insurance', 'liabilities', 'monthlyBudget', 'lifeEvents',
    'pendingNewIds', 'pendingEditSnapshots', 'pendingDeleteCount', 'lastSyncTimestamp'
  ];
  legacyKeys.forEach(k => keysToRemove.push(k));

  keysToRemove.forEach(k => safeLocalStorage.removeItem(k));
};

const getMonthTransactionsCacheKey = (userId: string, monthKey: string) =>
  `${MONTH_TRANSACTIONS_CACHE_PREFIX}:${userId}:${monthKey}`;

const getMonthTransactionsUserPrefix = (userId: string) =>
  `${MONTH_TRANSACTIONS_CACHE_PREFIX}:${userId}:`;

const readMonthTransactionsCache = (userId: string, monthKey: string): Transaction[] | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = safeLocalStorage.getItem(getMonthTransactionsCacheKey(userId, monthKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Transaction[]) : null;
  } catch (error) {
    console.warn('[DataContext] Failed to read month transactions cache:', error);
    return null;
  }
};

const writeMonthTransactionsCache = (userId: string, monthKey: string, monthTransactions: Transaction[]) => {
  if (typeof window === 'undefined') return;

  try {
    safeLocalStorage.setItem(
      getMonthTransactionsCacheKey(userId, monthKey),
      JSON.stringify(monthTransactions)
    );
  } catch (error) {
    console.warn('[DataContext] Failed to write month transactions cache:', error);
  }
};

const getCachedMonthKeys = (userId: string): string[] => {
  if (typeof window === 'undefined') return [];

  const prefix = getMonthTransactionsUserPrefix(userId);
  const keys: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(prefix)) continue;
    const monthKey = key.slice(prefix.length);
    if (monthKey) keys.push(monthKey);
  }

  return keys;
};

const clearMonthTransactionsCache = (userId: string) => {
  if (typeof window === 'undefined') return;

  const prefix = getMonthTransactionsUserPrefix(userId);
  const keysToRemove: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => safeLocalStorage.removeItem(key));
};

interface DataContextType {
  // User Profile
  userProfile: UserProfile | null;
  dashboardSummary: DashboardSummary | null;
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
  lifeEvents: LifeEvent[];

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

  addLifeEvent: (event: Omit<LifeEvent, 'id'>) => Promise<string | undefined>;
  updateLifeEvent: (id: string, event: Partial<LifeEvent>) => Promise<void>;
  deleteLifeEvent: (id: string) => Promise<void>;
  toggleLifeEventActive: (id: string) => Promise<void>;
  importGoalAsLifeEvent: (goal: Goal, currentAge: number) => Promise<void>;

  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<string | undefined>;
  addTransactionsBulk: (transactions: Omit<Transaction, 'id'>[], options?: { isHistorical?: boolean; skipDuplicateCheck?: boolean }) => Promise<{ success: boolean; summary?: any; error?: string }>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  bulkUpdateTransactions: (ids: string[], update: Partial<Transaction>) => Promise<void>;
  bulkUpdateTransactionsById: (updatesById: Record<string, Partial<Transaction>>) => Promise<void>;
  deleteTransaction: (id: string) => void;
  bulkDeleteTransactions: (ids: string[]) => Promise<void>;
  // Transfers between own accounts: link the two sides, unlink, or add the missing side
  linkTransfer: (id: string, otherId: string) => Promise<void>;
  unlinkTransfer: (id: string) => Promise<void>;
  createTransferCounterpart: (id: string, accountId: string) => Promise<void>;

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

  addRecurringTransaction: (recurringTransaction: Omit<RecurringTransaction, 'id'>) => Promise<string | undefined>;
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
  loadDashboardSummary: () => Promise<void>;
  saveDashboardSummary: (summary: DashboardSummary) => void;
  isDataLoaded: boolean;
  categorySummaryVersion: number;
  monthlySummaries: MonthlySummary[];
  /** True when monthly summaries are v2, kept complete server-side, and fully loaded for this user */
  monthlySummariesComplete: boolean;
  /** True when getAccountBalance uses complete summaries (correct on any device) */
  accountBalancesAuthoritative: boolean;
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
  loadLifeEvents: () => Promise<void>;
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
  /** Load only the given categories' transactions in a date range (drill-down; few reads) */
  loadTransactionsForCategories: (categoryIds: string[], startDate: string, endDate: string) => Promise<void>;

  // Sync settings
  lastSyncTimestamp: number | null;
  isSyncing: boolean;
  forceSync: () => Promise<void>;
  syncSettings: SyncSettings;
  updateSyncSettings: (s: Partial<SyncSettings>) => Promise<void>;
  pendingEditIds: Set<string>;
  pendingNewIds: Set<string>;
  pendingEditSnapshots: Map<string, Transaction>;
  pendingChangeCount: number;
  discardPendingChange: (id: string) => void;
  syncPendingChanges: () => Promise<void>;
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [categorySummaryVersion, setCategorySummaryVersion] = useState(0);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [monthlySummariesComplete, setMonthlySummariesComplete] = useState(false);
  /** True once `monthlySummaries` holds a full list for this user (server refresh or its local copy) */
  const [monthlySummariesLoaded, setMonthlySummariesLoaded] = useState(false);
  const monthlySummariesLoadedRef = useRef(false);
  const markSummariesLoaded = (loaded: boolean) => {
    monthlySummariesLoadedRef.current = loaded;
    setMonthlySummariesLoaded(loaded);
  };

  // Per-account totals from complete monthly summaries: the same on every device and
  // independent of how many transactions this browser happens to have loaded.
  const summaryAccountNet = useMemo(
    () => (monthlySummariesComplete && monthlySummariesLoaded ? accountNetFromSummaries(monthlySummaries) : null),
    [monthlySummariesComplete, monthlySummariesLoaded, monthlySummaries]
  );
  const loadedCategoryRangesRef = useRef<Set<string>>(new Set());
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(() => {
    const ts = localStorage.getItem('lastSyncTimestamp');
    return ts ? parseInt(ts, 10) : null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingNewIds, setPendingNewIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('pendingNewIds');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const [pendingEditSnapshots, setPendingEditSnapshots] = useState<Map<string, Transaction>>(() => {
    try {
      const raw = localStorage.getItem('pendingEditSnapshots');
      return raw ? new Map(JSON.parse(raw) as [string, Transaction][]) : new Map();
    } catch { return new Map(); }
  });
  const [pendingDeleteCount, setPendingDeleteCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('pendingDeleteCount') || '0', 10);
  });
  // Derived: union of new + edited IDs (used by TransactionTable badge)
  const pendingEditIds = useMemo(() => {
    const set = new Set(pendingNewIds);
    pendingEditSnapshots.forEach((_, id) => set.add(id));
    return set;
  }, [pendingNewIds, pendingEditSnapshots]);
  const initialTransactionsLoadedRef = useRef(false);
  const loadedTransactionMonthsRef = useRef<Set<string>>(new Set());
  // Last known-good per-account balance, snapshotted whenever the FULL
  // transaction set is loaded. Used as a fallback when the in-memory
  // transaction list is known to be partial (pagination), so we never render a
  // balance summed from an incomplete set. Self-healing: refreshed every time a
  // complete set is available.
  const knownAccountBalancesRef = useRef<Record<string, number>>({});
  // Firestore starts online by default. Keep local state aligned to avoid redundant toggles.
  const firestoreNetworkRef = useRef<'online' | 'offline'>('online');

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const userProfileRef = useRef<UserProfile | null>(null);
  const lastDashboardSummarySignatureRef = useRef<string>('');
  // Debounce timer for persisting the (complete) dashboard summary to Firestore.
  const dashboardSummaryWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);

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

  // Update localStorage for notification scheduler whenever data changes (namespaced by userId)
  useEffect(() => {
    if (isDataLoaded && user?.id) {
      writeUserCache(user.id, 'bills', bills);
      writeUserCache(user.id, 'recurringTransactions', recurringTransactions);
      writeUserCache(user.id, 'transactions', transactions);
    }
  }, [bills, recurringTransactions, transactions, isDataLoaded, user?.id]);

  // Cache essential data to localStorage for offline-first loading (namespaced by userId)
  useEffect(() => {
    if (isDataLoaded && bankAccounts.length > 0 && user?.id) {
      writeUserCache(user.id, 'bankAccounts', bankAccounts);
    }
  }, [bankAccounts, isDataLoaded, user?.id]);

  useEffect(() => {
    if (isDataLoaded && categoryRules.length > 0 && user?.id) {
      writeUserCache(user.id, 'categoryRules', categoryRules);
    }
  }, [categoryRules, isDataLoaded, user?.id]);

  useEffect(() => {
    if (isDataLoaded && userProfile && user?.id) {
      writeUserCache(user.id, 'userProfile', userProfile);
    }
  }, [userProfile, isDataLoaded, user?.id]);

  useEffect(() => {
    if (isDataLoaded && categories.length > 0 && user?.id) {
      // Only cache custom categories (non-default)
      const customCats = categories.filter(c => (c as any).isCustom || (c as any).userId);
      if (customCats.length > 0) {
        writeUserCache(user.id, 'customCategories', customCats);
      }
    }
  }, [categories, isDataLoaded, user?.id]);

  // Persist pending tracking to localStorage (namespaced by userId)
  useEffect(() => {
    if (user?.id) {
      writeUserCache(user.id, 'pendingNewIds', [...pendingNewIds]);
    }
  }, [pendingNewIds, user?.id]);

  useEffect(() => {
    if (user?.id) {
      writeUserCache(user.id, 'pendingEditSnapshots', [...pendingEditSnapshots]);
    }
  }, [pendingEditSnapshots, user?.id]);

  useEffect(() => {
    if (user?.id) {
      writeUserCache(user.id, 'pendingDeleteCount', String(pendingDeleteCount));
    }
  }, [pendingDeleteCount, user?.id]);

  const trackPendingNew = useCallback((ids: string[]) => {
    const mode = userProfileRef.current?.syncSettings?.mode ?? 'auto';
    if (mode !== 'manual') return;
    setPendingNewIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const trackPendingEdit = useCallback((id: string, oldSnapshot: Transaction) => {
    const mode = userProfileRef.current?.syncSettings?.mode ?? 'auto';
    if (mode !== 'manual') return;
    // Don't overwrite: if already tracked (or it's a new item), keep original snapshot
    setPendingEditSnapshots(prev => {
      if (prev.has(id)) return prev;
      const next = new Map(prev);
      next.set(id, oldSnapshot);
      return next;
    });
  }, []);

  const trackPendingDeletes = useCallback((count: number) => {
    const mode = userProfileRef.current?.syncSettings?.mode ?? 'auto';
    if (mode !== 'manual') return;
    setPendingDeleteCount(prev => prev + count);
  }, []);

  /**
   * Call after any local transaction change. Pass the before/after versions of the
   * changed transactions so monthly summaries are patched right away (same math as
   * the Cloud Function that updates them server-side a moment later).
   */
  const invalidateCaches = useCallback((change?: { removed?: Transaction[]; added?: Transaction[] }) => {
    if (!user) return;
    clearMonthTransactionsCache(user.id);
    clearCategorySummaryCache();
    loadedTransactionMonthsRef.current.clear();
    if (change && ((change.removed?.length ?? 0) > 0 || (change.added?.length ?? 0) > 0)) {
      const userId = user.id;
      const removed = change.removed ?? [];
      const added = change.added ?? [];
      // Only patch a complete list; patching a partial one would store a partial list.
      if (monthlySummariesLoadedRef.current) {
        setMonthlySummaries(prev => patchMonthlySummaries(userId, prev, removed, added));
      }
      // Persist the same change to the summary docs (increments; queued when offline).
      writeSummaryDeltas(userId, removed, added)
        .catch(err => console.warn('[DataContext] Failed to write summary update:', err));
    }
    setCategorySummaryVersion(prev => prev + 1);
  }, [user]);

  const clearPendingEdits = useCallback(() => {
    setPendingNewIds(new Set());
    setPendingEditSnapshots(new Map());
    setPendingDeleteCount(0);
  }, []);

  const discardPendingChange = useCallback((id: string) => {
    if (!user) return;

    // Case 1: newly added transaction — remove it entirely
    if (pendingNewIds.has(id)) {
      const discarded = transactions.find(t => t.id === id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      invalidateCaches({ removed: discarded ? [discarded] : [] });
      // Queue a delete to cancel the pending Firestore add
      FirebaseService.deleteTransaction(id).catch(() => {});
      setPendingNewIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    // Case 2: edited existing transaction — revert to snapshot
    const snapshot = pendingEditSnapshots.get(id);
    if (snapshot) {
      const current = transactions.find(t => t.id === id);
      setTransactions(prev => prev.map(t => t.id === id ? snapshot : t));
      invalidateCaches({ removed: current ? [current] : [], added: [snapshot] });
      // Queue an update with the original values to counter the pending edit
      const { id: _id, ...snapshotData } = snapshot;
      FirebaseService.updateTransaction(id, snapshotData).catch(() => {});
      setPendingEditSnapshots(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingNewIds, pendingEditSnapshots, transactions]);

  // Load user data when user changes
  useEffect(() => {
    // Important: wait for auth resolution before clearing cache.
    // Otherwise a hard refresh briefly sees `user=null` and wipes localStorage.
    if (isAuthLoading) {
      return;
    }

    if (user) {
      setCurrentUserId(user.id);
      loadUserData(user.id);
    } else {
      setCurrentUserId(null);
      resetUserData();
    }
  }, [user, isAuthLoading]);

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
      setLifeEvents([]);
      setDashboardSummary(null);

      // ── PHASE 1: Load from user-scoped localStorage cache (0 Firestore reads) ──
      let hasCachedData = false;

      // Load cached user profile
      const cachedProfile = readUserCache<UserProfile>(userId, 'userProfile', 'userProfile');
      if (cachedProfile) {
        setUserProfile(cachedProfile);
        hasCachedData = true;
      }

      // Load cached dashboard summary
      const cachedDashboardSummary = readUserCache<DashboardSummary>(userId, 'dashboardSummary', 'dashboardSummary');
      if (cachedDashboardSummary) {
        setDashboardSummary(cachedDashboardSummary);
        hasCachedData = true;
      }

      // Load cached bank accounts
      const cachedBankAccounts = readUserCache<BankAccount[]>(userId, 'bankAccounts', 'bankAccounts');
      if (cachedBankAccounts && Array.isArray(cachedBankAccounts) && cachedBankAccounts.length > 0) {
        setBankAccounts(cachedBankAccounts);
        hasCachedData = true;
      }

      // Seed last known-good account balances (fallback for partial tx loads)
      const cachedBalances = readUserCache<Record<string, number>>(userId, 'accountBalances', `accountBalances:${userId}`);
      knownAccountBalancesRef.current = cachedBalances || {};

      // Load cached category rules
      const cachedRules = readUserCache<CategoryRule[]>(userId, 'categoryRules', 'categoryRules');
      if (cachedRules && Array.isArray(cachedRules) && cachedRules.length > 0) {
        setCategoryRules(cachedRules);
      }

      // Load cached transactions
      let hasCachedTransactions = false;
      const cachedTransactions = readUserCache<Transaction[]>(userId, 'transactions', 'transactions');
      if (cachedTransactions && Array.isArray(cachedTransactions) && cachedTransactions.length > 0) {
        console.log(`[DataContext] Loaded ${cachedTransactions.length} transactions from local cache`);
        setTransactions(cachedTransactions);
        hasCachedTransactions = true;
        hasCachedData = true;

        // Pre-populate loaded month set from dedicated month caches only.
        const cachedMonthKeys = getCachedMonthKeys(userId);
        cachedMonthKeys.forEach(monthKey => loadedTransactionMonthsRef.current.add(monthKey));
        initialTransactionsLoadedRef.current = true;
        console.log(`[DataContext] Pre-populated ${loadedTransactionMonthsRef.current.size} month(s) from cache`);
      }

      if (!hasCachedTransactions) {
        setTransactions([]);
      }
      setTransactionsCursor(null);
      setHasMoreTransactions(false);

      // Pre-warm lazy caches (assets, goals, insurance, liabilities, etc.)
      const cachedAssets = readUserCache<Asset[]>(userId, 'assets', 'assets');
      if (cachedAssets && Array.isArray(cachedAssets) && cachedAssets.length > 0) {
        setAssets(cachedAssets);
        hasCachedData = true; // shown now; the page's loader still fetches fresh data
      }

      const cachedGoals = readUserCache<Goal[]>(userId, 'goals', 'goals');
      if (cachedGoals && Array.isArray(cachedGoals) && cachedGoals.length > 0) {
        const migrated = GoalMigrationService.migrateGoals(cachedGoals);
        setGoals(migrated);
        hasCachedData = true; // shown now; the page's loader still fetches fresh data
      }

      const cachedInsurance = readUserCache<Insurance[]>(userId, 'insurance', 'insurance');
      if (cachedInsurance && Array.isArray(cachedInsurance) && cachedInsurance.length > 0) {
        setInsurance(cachedInsurance);
        hasCachedData = true; // shown now; the page's loader still fetches fresh data
      }

      const cachedLiabilities = readUserCache<Liability[]>(userId, 'liabilities', 'liabilities');
      if (cachedLiabilities && Array.isArray(cachedLiabilities) && cachedLiabilities.length > 0) {
        setLiabilities(cachedLiabilities);
        hasCachedData = true; // shown now; the page's loader still fetches fresh data
      }

      const cachedRecurring = readUserCache<RecurringTransaction[]>(userId, 'recurringTransactions', 'recurringTransactions');
      if (cachedRecurring && Array.isArray(cachedRecurring) && cachedRecurring.length > 0) {
        setRecurringTransactions(cachedRecurring);
        hasCachedData = true; // shown now; the page's loader still fetches fresh data
      }

      const cachedBills = readUserCache<Bill[]>(userId, 'bills', 'bills');
      if (cachedBills && Array.isArray(cachedBills) && cachedBills.length > 0) {
        setBills(cachedBills);
        hasCachedData = true; // shown now; the page's loader still fetches fresh data
      }

      // Load categories (defaults + cached custom categories)
      const { defaultCategories } = await import('../constants/categories');
      const customCategories: Category[] = readUserCache<Category[]>(userId, 'customCategories', 'customCategories') || [];

      const customIds = new Set(customCategories.map(c => c.id));
      const mergedCategories = [
        ...defaultCategories.filter(c => !customIds.has(c.id)),
        ...customCategories
      ];
      setCategories(mergedCategories);

      // Load cached monthly summaries (for category overview chart — offline-first)
      try {
        const cachedSummaries = localStorage.getItem(`allMonthlySummaries:v1:${userId}`);
        if (cachedSummaries) {
          const parsed: MonthlySummary[] = JSON.parse(cachedSummaries).map((s: any) => ({
            ...s,
            lastUpdated: new Date(s.lastUpdated)
          }));
          setMonthlySummaries(parsed);
          markSummariesLoaded(true);
          hasCachedData = true;
        }
      } catch (e) { console.warn('Error parsing cached monthly summaries', e); }

      // Load user-namespaced pending tracking
      const cachedPendingNewIds = readUserCache<string[]>(userId, 'pendingNewIds', 'pendingNewIds');
      if (cachedPendingNewIds && Array.isArray(cachedPendingNewIds)) {
        setPendingNewIds(new Set(cachedPendingNewIds));
      }
      const cachedPendingEditSnapshots = readUserCache<[string, Transaction][]>(userId, 'pendingEditSnapshots', 'pendingEditSnapshots');
      if (cachedPendingEditSnapshots && Array.isArray(cachedPendingEditSnapshots)) {
        setPendingEditSnapshots(new Map(cachedPendingEditSnapshots));
      }
      const cachedPendingDeleteCount = readUserCache<number>(userId, 'pendingDeleteCount', 'pendingDeleteCount');
      if (typeof cachedPendingDeleteCount === 'number') {
        setPendingDeleteCount(cachedPendingDeleteCount);
      }

      // Mark as loaded immediately if we have cached data
      if (hasCachedData) {
        console.log('[DataContext] ✅ Loaded from cache (0 Firestore reads). Syncing in background...');
        setIsDataLoaded(true);
      }

      // ── PHASE 2: Background sync from Firestore (updates cache silently) ──
      // Determine sync interval from cached profile (state may not be set yet)
      const cachedSyncSettings: SyncSettings = (() => {
        try {
          const p = readUserCache<UserProfile>(userId, 'userProfile', 'userProfile');
          return p ? (p.syncSettings ?? { mode: 'auto', autoIntervalMinutes: 15 }) : { mode: 'auto', autoIntervalMinutes: 15 };
        } catch { return { mode: 'auto', autoIntervalMinutes: 15 }; }
      })();
      const SYNC_INTERVAL_MS = cachedSyncSettings.autoIntervalMinutes * 60 * 1000;
      const lastSyncCached = readUserCache<number | string>(userId, 'lastSyncTimestamp', 'lastSyncTimestamp');
      const lastSyncTime = typeof lastSyncCached === 'number'
        ? lastSyncCached
        : parseInt((typeof lastSyncCached === 'string' ? lastSyncCached : safeLocalStorage.getItem('lastSyncTimestamp')) || '0', 10);
      const now = Date.now();
      const shouldSync = cachedSyncSettings.mode !== 'manual' && (!hasCachedData || (now - lastSyncTime) > SYNC_INTERVAL_MS);

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

        const syncedAt = Date.now();
        writeUserCache(userId, 'lastSyncTimestamp', syncedAt);
        setLastSyncTimestamp(syncedAt);
        console.log('[DataContext] ✅ Background sync complete');
      } catch (error) {
        console.error('[DataContext] Background sync error:', error);
      }
      } else {
        console.log('[DataContext] ⏭️ Skipping background sync (last sync was recent)');
      }

      // Bring monthly summaries up to date (reads only months that changed since last sync)
      void syncMonthlySummaries(userId);

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
  // Pages ask for their data on mount. On a direct page load (or a restored tab) that
  // happens before sign-in finishes, so remember the request and run it once the
  // user is known instead of silently dropping it (which left stale cached data).
  const pendingLazyLoadsRef = useRef<Set<string>>(new Set());
  // Collections fetched from Firestore this session (not just shown from the local cache).
  // Only these are trusted when writing the cross-device dashboard summary.
  const serverLoadedRef = useRef<Set<string>>(new Set());
  const deferLazyLoad = (key: string) => { pendingLazyLoadsRef.current.add(key); };

  const loadGoals = async () => {
    if (!user) { deferLazyLoad('goals'); return; }
    if (lazyLoadedRef.current.has('goals')) return;
    lazyLoadedRef.current.add('goals');
    try {
      // Load from cache first
      const cached = readUserCache<Goal[]>(user.id, 'goals', 'goals');
      if (cached && cached.length > 0 && goals.length === 0) {
        const migrated = GoalMigrationService.migrateGoals(cached);
        setGoals(migrated);
      }
      // Background sync from Firestore
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return; // localStorage cache is sufficient when offline
      const goalsData = await FirebaseService.getGoals(user.id);
      const migratedGoals = GoalMigrationService.migrateGoals(goalsData);
      serverLoadedRef.current.add('goals');
      setGoals(migratedGoals);
      writeUserCache(user.id, 'goals', goalsData);
    } catch (error) {
      lazyLoadedRef.current.delete('goals');
      console.error('[DataContext] Error loading goals:', error);
    }
  };

  const loadLifeEvents = async () => {
    try {
      if (user) {
        const cached = readUserCache<LifeEvent[]>(user.id, 'lifeEvents', 'lifeEvents');
        if (Array.isArray(cached) && cached.length > 0) {
          setLifeEvents(cached);
        }
      }
      if (!user) { deferLazyLoad('lifeEvents'); return; }
      if (lazyLoadedRef.current.has('lifeEvents')) return;
      lazyLoadedRef.current.add('lifeEvents');
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return;
      const eventsData = await FirebaseService.getLifeEvents(user.id);
      if (eventsData && eventsData.length > 0) {
        setLifeEvents(eventsData);
        writeUserCache(user.id, 'lifeEvents', eventsData);
      }
    } catch (error) {
      lazyLoadedRef.current.delete('lifeEvents');
      console.error('[DataContext] Error loading life events:', error);
    }
  };

  const loadAssets = async () => {
    if (!user) { deferLazyLoad('assets'); return; }
    if (lazyLoadedRef.current.has('assets')) return;
    lazyLoadedRef.current.add('assets');
    try {
      const cached = readUserCache<Asset[]>(user.id, 'assets', 'assets');
      if (cached && cached.length > 0 && assets.length === 0) {
        setAssets(cached);
      }
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return;
      const assetsData = await FirebaseService.getAssets(user.id);
      serverLoadedRef.current.add('assets');
      setAssets(assetsData);
      writeUserCache(user.id, 'assets', assetsData);
    } catch (error) {
      lazyLoadedRef.current.delete('assets');
      console.error('[DataContext] Error loading assets:', error);
    }
  };

  const loadInsurance = async () => {
    if (!user) { deferLazyLoad('insurance'); return; }
    if (lazyLoadedRef.current.has('insurance')) return;
    lazyLoadedRef.current.add('insurance');
    try {
      const cached = readUserCache<Insurance[]>(user.id, 'insurance', 'insurance');
      if (cached && cached.length > 0 && insurance.length === 0) {
        setInsurance(cached);
      }
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return;
      const insuranceData = await FirebaseService.getInsurance(user.id);
      serverLoadedRef.current.add('insurance');
      setInsurance(insuranceData);
      writeUserCache(user.id, 'insurance', insuranceData);
    } catch (error) {
      lazyLoadedRef.current.delete('insurance');
      console.error('[DataContext] Error loading insurance:', error);
    }
  };

  const loadLiabilities = async () => {
    if (!user) { deferLazyLoad('liabilities'); return; }
    if (lazyLoadedRef.current.has('liabilities')) return;
    lazyLoadedRef.current.add('liabilities');
    try {
      const cached = readUserCache<Liability[]>(user.id, 'liabilities', 'liabilities');
      if (cached && cached.length > 0 && liabilities.length === 0) {
        setLiabilities(cached);
      }
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return;
      const liabilitiesData = await FirebaseService.getLiabilities(user.id);
      serverLoadedRef.current.add('liabilities');
      setLiabilities(liabilitiesData);
      writeUserCache(user.id, 'liabilities', liabilitiesData);
    } catch (error) {
      lazyLoadedRef.current.delete('liabilities');
      console.error('[DataContext] Error loading liabilities:', error);
    }
  };

  const loadRecurringTransactions = async () => {
    if (!user) { deferLazyLoad('recurring'); return; }
    if (lazyLoadedRef.current.has('recurring')) return;
    lazyLoadedRef.current.add('recurring');
    try {
      const cached = readUserCache<RecurringTransaction[]>(user.id, 'recurringTransactions', 'recurringTransactions');
      if (cached && cached.length > 0 && recurringTransactions.length === 0) {
        setRecurringTransactions(cached);
      }
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return;
      const data = await FirebaseService.getRecurringTransactions(user.id);
      serverLoadedRef.current.add('recurring');
      setRecurringTransactions(data);
      writeUserCache(user.id, 'recurringTransactions', data);
    } catch (error) {
      lazyLoadedRef.current.delete('recurring');
      console.error('[DataContext] Error loading recurring transactions:', error);
    }
  };

  const loadBills = async () => {
    if (!user) { deferLazyLoad('bills'); return; }
    if (lazyLoadedRef.current.has('bills')) return;
    lazyLoadedRef.current.add('bills');
    try {
      const cached = readUserCache<Bill[]>(user.id, 'bills', 'bills');
      if (cached && cached.length > 0 && bills.length === 0) {
        setBills(cached);
      }
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return;
      const data = await FirebaseService.getBills(user.id);
      serverLoadedRef.current.add('bills');
      setBills(data);
      writeUserCache(user.id, 'bills', data);
    } catch (error) {
      lazyLoadedRef.current.delete('bills');
      console.error('[DataContext] Error loading bills:', error);
    }
  };

  const loadSIPRules = async () => {
    if (!user) { deferLazyLoad('sipRules'); return; }
    if (lazyLoadedRef.current.has('sipRules')) return;
    lazyLoadedRef.current.add('sipRules');
    try {
      const cached = readUserCache<SIPRule[]>(user.id, 'sipRules', 'sipRules');
      if (cached && cached.length > 0 && sipRules.length === 0) {
        setSipRules(cached);
      }
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return;
      const data = await FirebaseService.getSIPRules(user.id);
      setSipRules(data);
      writeUserCache(user.id, 'sipRules', data);
    } catch (error) {
      lazyLoadedRef.current.delete('sipRules');
      console.error('[DataContext] Error loading SIP rules:', error);
    }
  };

  const loadMonthlyBudget = async () => {
    if (!user) { deferLazyLoad('budget'); return; }
    if (lazyLoadedRef.current.has('budget')) return;
    lazyLoadedRef.current.add('budget');
    try {
      const cached = readUserCache<MonthlyBudget>(user.id, 'monthlyBudget', 'monthlyBudget');
      if (cached) {
        setMonthlyBudget(cached);
      }
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return;
      const budgetData = await FirebaseService.getMonthlyBudget(user.id);
      const budget = budgetData || getDefaultMonthlyBudget();
      setMonthlyBudget(budget);
      writeUserCache(user.id, 'monthlyBudget', budget);
    } catch (error) {
      lazyLoadedRef.current.delete('budget');
      console.error('[DataContext] Error loading monthly budget:', error);
    }
  };

  const loadDashboardSummary = async () => {
    if (!user) { deferLazyLoad('dashboardSummary'); return; }
    if (lazyLoadedRef.current.has('dashboardSummary')) return;
    lazyLoadedRef.current.add('dashboardSummary');

    try {
      const cached = readUserCache<DashboardSummary>(user.id, 'dashboardSummary', 'dashboardSummary');
      if (cached && !dashboardSummary) {
        setDashboardSummary(cached);
      }

      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) return;

      const summary = await FirebaseService.getDashboardSummary(user.id);
      if (summary) {
        setDashboardSummary(summary);
        writeUserCache(user.id, 'dashboardSummary', summary);
      }
    } catch (error) {
      lazyLoadedRef.current.delete('dashboardSummary');
      console.error('[DataContext] Error loading dashboard summary:', error);
    }
  };

  // `isComplete` = the summary was computed from FULLY loaded source data (all
  // collections present), so it is safe to persist as the cross-device
  // fast-paint value. A partial summary (some collections not yet loaded) is
  // cached locally for this device only — persisting it would push a
  // half-correct value to other devices and re-create the stale-value bug.
  const saveDashboardSummary = (summary: DashboardSummary, isComplete: boolean = false) => {
    if (!user) return;

    const normalizedSummary: DashboardSummary = {
      ...summary,
      updatedAt: summary.updatedAt || new Date().toISOString()
    };

    setDashboardSummary(normalizedSummary);
    writeUserCache(user.id, 'dashboardSummary', normalizedSummary);

    const signature = JSON.stringify({
      ...normalizedSummary,
      updatedAt: undefined
    });

    if (lastDashboardSummarySignatureRef.current === signature) {
      return;
    }

    lastDashboardSummarySignatureRef.current = signature;

    // Persist to Firestore only when the summary is complete AND auto-sync is on.
    // The read side (getDashboardSummary) piggybacks on the shared user-doc
    // cache, so this write is what makes the single-doc fast-paint actually work
    // on a cold start / another device. Debounced to coalesce the bursts of
    // recompute that happen during bulk edits or imports.
    if (!isComplete) return;
    const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
    if (isManual) return;

    if (dashboardSummaryWriteTimerRef.current) {
      clearTimeout(dashboardSummaryWriteTimerRef.current);
    }
    const userId = user.id;
    dashboardSummaryWriteTimerRef.current = setTimeout(() => {
      FirebaseService.upsertDashboardSummary(userId, normalizedSummary)
        .catch(err => console.warn('[DataContext] Failed to persist dashboard summary:', err));
    }, 4000);
  };

  useEffect(() => {
    if (!user || !isDataLoaded) {
      return;
    }

    const baseSummary: DashboardSummary = dashboardSummary || {
      totalAssets: 0,
      totalBankBalance: 0,
      totalLiabilities: 0,
      netWorth: 0,
      retirementProgress: 0,
      totalLICMaturity: 0,
      currentMonthIncome: 0,
      currentMonthExpenses: 0,
      currentMonthInvestments: 0,
      currentMonthSurplus: 0,
      accountCount: 0,
      goalCount: 0,
      recurringCount: 0,
      periodType: 'current',
      periodMonthLabel: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      updatedAt: new Date().toISOString()
    };

    const periodType = userProfile?.displayPreferences?.defaultTimePeriod || baseSummary.periodType || 'current';
    const periodBaseDate = new Date();
    if (periodType === 'previous') {
      periodBaseDate.setMonth(periodBaseDate.getMonth() - 1);
    }

    const periodYear = periodBaseDate.getFullYear();
    const periodMonth = periodBaseDate.getMonth();
    const periodMonthLabel = periodBaseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const canUseTransactions = initialTransactionsLoadedRef.current || transactions.length > 0;
    const canUseAssets = serverLoadedRef.current.has('assets');
    const canUseGoals = serverLoadedRef.current.has('goals');
    const canUseInsurance = serverLoadedRef.current.has('insurance');
    const canUseLiabilities = serverLoadedRef.current.has('liabilities');
    const canUseRecurring = serverLoadedRef.current.has('recurring');

    const computedTotalAssets = canUseAssets
      ? assets.reduce((sum, asset) => sum + (Number(asset.currentValue) || 0), 0)
      : baseSummary.totalAssets;

    const computedTotalLiabilities = canUseLiabilities
      ? liabilities.reduce((sum, liability) => sum + (Number(liability.currentBalance) || 0), 0)
      : baseSummary.totalLiabilities;

    // Complete monthly summaries give correct balances on any device; otherwise fall back
    // to summing whatever transactions are loaded (only trusted when the set is complete).
    const computedTotalBankBalance = summaryAccountNet
      ? bankAccounts.reduce((sum, account) => sum + getAccountBalance(account.id), 0)
      : canUseTransactions
      ? bankAccounts.reduce((sum, account) => {
          const accountTransactions = transactions.filter(t => t.bankAccountId === account.id);
          const totalTransactionAmount = accountTransactions.reduce((accountSum, t) => {
            if (t.type === 'income') return accountSum + t.amount;
            if (t.type === 'expense' || t.type === 'investment' || t.type === 'insurance') {
              return accountSum - t.amount;
            }
            return accountSum;
          }, 0);

          return sum + account.initialBalance + totalTransactionAmount;
        }, 0)
      : baseSummary.totalBankBalance;

    const retirementGoal = goals.find(g => g.category === 'retirement');
    const computedRetirementProgress = canUseGoals
      ? (retirementGoal ? (retirementGoal.currentAmount / retirementGoal.targetAmount) * 100 : 0)
      : baseSummary.retirementProgress;

    const computedTotalLICMaturity = canUseInsurance
      ? insurance
          .filter(p => (p.type === 'endowment' || p.type === 'other') && p.maturityAmount)
          .reduce((sum, policy) => sum + (policy.maturityAmount || 0), 0)
      : baseSummary.totalLICMaturity;

    const periodTransactions = canUseTransactions
      ? transactions.filter(t => {
          const transactionDate = new Date(t.date);
          return transactionDate.getFullYear() === periodYear &&
            transactionDate.getMonth() === periodMonth &&
            t.category !== 'transfer';
        })
      : [];

    const computedCurrentMonthIncome = canUseTransactions
      ? periodTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)
      : baseSummary.currentMonthIncome;

    const computedCurrentMonthExpenses = canUseTransactions
      ? periodTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
      : baseSummary.currentMonthExpenses;

    const computedCurrentMonthInvestments = canUseTransactions
      ? periodTransactions
          .filter(t => t.type === 'investment')
          .reduce((sum, t) => sum + t.amount, 0)
      : baseSummary.currentMonthInvestments;

    const computedCurrentMonthSurplus = canUseTransactions
      ? (computedCurrentMonthIncome - computedCurrentMonthExpenses - computedCurrentMonthInvestments)
      : baseSummary.currentMonthSurplus;

    const nextSummary: DashboardSummary = {
      totalAssets: computedTotalAssets,
      totalBankBalance: computedTotalBankBalance,
      totalLiabilities: computedTotalLiabilities,
      netWorth: computedTotalAssets + computedTotalBankBalance - computedTotalLiabilities,
      retirementProgress: computedRetirementProgress,
      totalLICMaturity: computedTotalLICMaturity,
      currentMonthIncome: computedCurrentMonthIncome,
      currentMonthExpenses: computedCurrentMonthExpenses,
      currentMonthInvestments: computedCurrentMonthInvestments,
      currentMonthSurplus: computedCurrentMonthSurplus,
      accountCount: bankAccounts.length,
      goalCount: canUseGoals ? goals.length : baseSummary.goalCount,
      recurringCount: canUseRecurring
        ? recurringTransactions.filter(rt => rt.isActive).length
        : baseSummary.recurringCount,
      periodType,
      periodMonthLabel,
      updatedAt: new Date().toISOString()
    };

    const currentSignature = dashboardSummary
      ? JSON.stringify({ ...dashboardSummary, updatedAt: undefined })
      : '';
    const nextSignature = JSON.stringify({ ...nextSummary, updatedAt: undefined });

    // Only a summary derived from every source collection is safe to persist
    // cross-device. Bank balance additionally needs the full transaction set,
    // which pagination doesn't guarantee — so require the "load more" cursor to
    // be exhausted before treating the summary as complete.
    const isComplete =
      canUseAssets &&
      canUseLiabilities &&
      canUseGoals &&
      canUseInsurance &&
      canUseRecurring &&
      (summaryAccountNet !== null || (canUseTransactions && !hasMoreTransactions));

    if (currentSignature !== nextSignature) {
      saveDashboardSummary(nextSummary, isComplete);
    }
  }, [
    user,
    isDataLoaded,
    userProfile?.displayPreferences?.defaultTimePeriod,
    assets,
    goals,
    insurance,
    transactions,
    bankAccounts,
    liabilities,
    recurringTransactions,
    dashboardSummary,
    hasMoreTransactions,
    summaryAccountNet
  ]);

  // Latest loader closures (they capture `user`), used to replay deferred loads.
  const lazyLoadersRef = useRef<Record<string, () => Promise<void>>>({});
  lazyLoadersRef.current = {
    goals: loadGoals,
    lifeEvents: loadLifeEvents,
    assets: loadAssets,
    insurance: loadInsurance,
    liabilities: loadLiabilities,
    recurring: loadRecurringTransactions,
    bills: loadBills,
    sipRules: loadSIPRules,
    budget: loadMonthlyBudget,
    dashboardSummary: loadDashboardSummary,
  };
  useEffect(() => {
    if (!user || pendingLazyLoadsRef.current.size === 0) return;
    const pending = [...pendingLazyLoadsRef.current];
    pendingLazyLoadsRef.current.clear();
    pending.forEach(key => { void lazyLoadersRef.current[key]?.(); });
  }, [user?.id]);

  const loadInitialTransactions = async () => {
    if (!user) return;
    if (initialTransactionsLoadedRef.current) return;
    // Mark immediately to prevent duplicate calls
    initialTransactionsLoadedRef.current = true;
    try {
      console.log(`[DataContext] Lazy loading initial transactions`);
      // Always fetch fresh data for page 1 to ensure sync
      const initialPage = await FirebaseService.getTransactionsPage(user.id, {
        pageSize: TRANSACTIONS_INITIAL_PAGE_SIZE
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
        pageSize: TRANSACTIONS_MORE_PAGE_SIZE,
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

  const summariesRebuiltKey = (userId: string) => `monthlySummariesRebuilt:v${SUMMARY_SCHEMA_VERSION}:${userId}`;
  const summariesRebuildAttemptKey = (userId: string) => `monthlySummariesRebuildAttempt:${userId}`;

  /**
   * Keep monthly summaries fresh and, once per user, rebuild them in the v2 schema
   * from all transactions. After that every change made in the app keeps them
   * complete, so year views can be drawn from ~12 summary docs instead of every
   * transaction.
   */
  const syncMonthlySummaries = async (userId: string) => {
    let rebuilt = false;
    try { rebuilt = localStorage.getItem(summariesRebuiltKey(userId)) === 'true'; } catch { /* ignore */ }
    if (rebuilt || (userProfileRef.current?.summariesVersion ?? 0) >= SUMMARY_SCHEMA_VERSION) {
      setMonthlySummariesComplete(true);
    }

    const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    try {
      if (isManual || offline) {
        // Offline-first: whatever is cached locally (patched by local edits)
        const cached = await refreshMonthlySummaries(userId).catch(() => null);
        if (cached) { setMonthlySummaries(cached); markSummariesLoaded(true); }
        return;
      }

      setMonthlySummaries(await refreshMonthlySummaries(userId));
      markSummariesLoaded(true);

      const profileVersion = userProfileRef.current?.summariesVersion ?? 0;
      if (rebuilt || profileVersion >= SUMMARY_SCHEMA_VERSION) {
        try { localStorage.setItem(summariesRebuiltKey(userId), 'true'); } catch { /* ignore */ }
        return;
      }

      // One-time server rebuild (retried at most once a day if it fails)
      let lastAttempt = 0;
      try { lastAttempt = Number(localStorage.getItem(summariesRebuildAttemptKey(userId)) || 0); } catch { /* ignore */ }
      if (Date.now() - lastAttempt < 24 * 60 * 60 * 1000) return;
      try { localStorage.setItem(summariesRebuildAttemptKey(userId), String(Date.now())); } catch { /* ignore */ }

      console.log('[DataContext] Rebuilding monthly summaries (v2) from all transactions…');
      const result = await rebuildMonthlySummariesClient(userId);
      clearCategorySummaryCache();
      setMonthlySummaries(await refreshMonthlySummaries(userId, { full: true }));
      markSummariesLoaded(true);
      try { localStorage.setItem(summariesRebuiltKey(userId), 'true'); } catch { /* ignore */ }
      setUserProfile(prev => prev ? { ...prev, summariesVersion: SUMMARY_SCHEMA_VERSION } : prev);
      setMonthlySummariesComplete(true);
      setCategorySummaryVersion(prev => prev + 1);
      console.log(`[DataContext] ✅ Monthly summaries rebuilt: ${result.summariesCount} months from ${result.transactionsProcessed} transactions`);
    } catch (err) {
      console.warn('[DataContext] Monthly summaries sync failed:', err);
    }
  };

  const loadTransactionsForCategories = useCallback(async (categoryIds: string[], startDate: string, endDate: string) => {
    if (!user || categoryIds.length === 0) return;
    const key = `${[...categoryIds].sort().join(',')}|${startDate}|${endDate}`;
    if (loadedCategoryRangesRef.current.has(key)) return;
    loadedCategoryRangesRef.current.add(key);
    try {
      const fetched = await FirebaseService.getTransactionsByCategoriesAndRange(user.id, categoryIds, startDate, endDate);
      if (fetched.length === 0) return;
      setTransactions(prev => {
        const seen = new Set(prev.map(t => t.id));
        const additions = fetched.filter(t => !seen.has(t.id)); // local copies win (may hold unsynced edits)
        if (additions.length === 0) return prev;
        const merged = [...prev, ...additions];
        merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return merged;
      });
    } catch (error) {
      loadedCategoryRangesRef.current.delete(key);
      console.error('[DataContext] Error loading category transactions:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadTransactionsForPeriod = useCallback(async (startDate: string, endDate: string) => {
    if (!user) return;
    const monthKey = getMonthKey(startDate);
    if (monthKey === 'invalid-date') return;
    if (loadedTransactionMonthsRef.current.has(monthKey)) return;

    const cachedMonthTransactions = readMonthTransactionsCache(user.id, monthKey);
    if (cachedMonthTransactions !== null) {
      loadedTransactionMonthsRef.current.add(monthKey);

      if (cachedMonthTransactions.length > 0) {
        setTransactions(prev => {
          const seen = new Set(prev.map(t => t.id));
          const merged = [...prev];

          for (const transaction of cachedMonthTransactions) {
            if (!seen.has(transaction.id)) {
              merged.push(transaction);
              seen.add(transaction.id);
            }
          }

          merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return merged;
        });
      }

      return;
    }

    // Mark immediately to prevent duplicate parallel fetches
    loadedTransactionMonthsRef.current.add(monthKey);
    try {
      console.log(`[DataContext] Loading transactions for period: ${startDate} to ${endDate}`);
      const periodTransactions = await FirebaseService.getTransactionsByDateRange(user.id, startDate, endDate);

      writeMonthTransactionsCache(user.id, monthKey, periodTransactions);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Asset operations
  const addAsset = async (asset: Omit<Asset, 'id'>) => {
    if (!user) return;

    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('assets', { ...asset, userId: user.id });
      } else {
        id = await FirebaseService.addAsset(user.id, asset);
      }
      const newAsset: Asset = { ...asset, id };
      setAssets(prev => {
        const updated = [...prev, newAsset];
        if (user) writeUserCache(user.id, 'assets', updated);
        return updated;
      });
    } catch (error) {
      console.error('Error adding asset:', error);
    }
  };

  const updateAsset = async (id: string, asset: Partial<Asset>) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateAsset(id, asset).catch(err => console.error('Error updating asset (queued):', err));
      } else {
        await FirebaseService.updateAsset(id, asset);
      }
      setAssets(prev => {
        const updated = prev.map(a => a.id === id ? { ...a, ...asset } : a);
        if (user) writeUserCache(user.id, 'assets', updated);
        return updated;
      });
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteAsset(id).catch(err => console.error('Error deleting asset (queued):', err));
      } else {
        await FirebaseService.deleteAsset(id);
      }
      setAssets(prev => {
        const updated = prev.filter(a => a.id !== id);
        if (user) writeUserCache(user.id, 'assets', updated);
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
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('insurance', { ...insurance, userId: user.id });
      } else {
        id = await FirebaseService.addInsurance(user.id, insurance);
      }
      const newInsurance: Insurance = { ...insurance, id };
      setInsurance(prev => [...prev, newInsurance]);
    } catch (error) {
      console.error('Error adding insurance:', error);
    }
  };

  const updateInsurance = async (id: string, insurance: Partial<Insurance>) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateInsurance(id, insurance).catch(err => console.error('Error updating insurance (queued):', err));
      } else {
        await FirebaseService.updateInsurance(id, insurance);
      }
      setInsurance(prev => prev.map(i => i.id === id ? { ...i, ...insurance } : i));
    } catch (error) {
      console.error('Error updating insurance:', error);
    }
  };

  const deleteInsurance = async (id: string) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteInsurance(id).catch(err => console.error('Error deleting insurance (queued):', err));
      } else {
        await FirebaseService.deleteInsurance(id);
      }
      setInsurance(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting insurance:', error);
    }
  };

  // Goal operations
  const addGoal = async (goal: Omit<Goal, 'id'>) => {
    if (!user) return;

    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('goals', { ...goal, userId: user.id });
      } else {
        id = await FirebaseService.addGoal(user.id, goal);
      }
      const newGoal: Goal = { ...goal, id };
      setGoals(prev => [...prev, newGoal]);
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const updateGoal = async (id: string, goal: Partial<Goal>) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateGoal(id, goal).catch(err => console.error('Error updating goal (queued):', err));
      } else {
        await FirebaseService.updateGoal(id, goal);
      }
      setGoals(prev => prev.map(g => g.id === id ? { ...g, ...goal } : g));
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteGoal(id).catch(err => console.error('Error deleting goal (queued):', err));
      } else {
        await FirebaseService.deleteGoal(id);
      }
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  // Life Event Operations
  const addLifeEvent = async (event: Omit<LifeEvent, 'id'>): Promise<string | undefined> => {
    try {
      let id: string;
      if (user) {
        const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
        if (isManual) {
          id = FirebaseService.addDocOfflineSafe('lifeEvents', { ...event, userId: user.id });
        } else {
          id = await FirebaseService.addLifeEvent(user.id, event);
        }
      } else {
        id = 'event_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      }
      const newEvent: LifeEvent = { ...event, id, targetAge: Number(event.targetAge) };
      setLifeEvents(prev => {
        const next = [...prev, newEvent].sort((a, b) => a.targetAge - b.targetAge);
        if (user) writeUserCache(user.id, 'lifeEvents', next);
        return next;
      });
      return id;
    } catch (error) {
      console.error('Error adding life event, saving locally:', error);
      const fallbackId = 'event_' + Date.now();
      const fallbackEvent: LifeEvent = { ...event, id: fallbackId, targetAge: Number(event.targetAge) };
      setLifeEvents(prev => {
        const next = [...prev, fallbackEvent].sort((a, b) => a.targetAge - b.targetAge);
        if (user) writeUserCache(user.id, 'lifeEvents', next);
        return next;
      });
      return fallbackId;
    }
  };

  const updateLifeEvent = async (id: string, event: Partial<LifeEvent>): Promise<void> => {
    try {
      if (user) {
        const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
        if (isManual) {
          FirebaseService.updateLifeEvent(id, event).catch(err => console.error('Error updating life event (queued):', err));
        } else {
          await FirebaseService.updateLifeEvent(id, event);
        }
      }
    } catch (error) {
      console.error('Error updating life event in Firebase:', error);
    }
    setLifeEvents(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...event, ...(event.targetAge !== undefined ? { targetAge: Number(event.targetAge) } : {}) } : e).sort((a, b) => a.targetAge - b.targetAge);
      if (user) writeUserCache(user.id, 'lifeEvents', next);
      return next;
    });
  };

  const deleteLifeEvent = async (id: string): Promise<void> => {
    try {
      if (user) {
        const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
        if (isManual) {
          FirebaseService.deleteLifeEvent(id).catch(err => console.error('Error deleting life event (queued):', err));
        } else {
          await FirebaseService.deleteLifeEvent(id);
        }
      }
    } catch (error) {
      console.error('Error deleting life event from Firebase:', error);
    }
    setLifeEvents(prev => {
      const next = prev.filter(e => e.id !== id);
      if (user) writeUserCache(user.id, 'lifeEvents', next);
      return next;
    });
  };

  const toggleLifeEventActive = async (id: string): Promise<void> => {
    const target = lifeEvents.find(e => e.id === id);
    if (!target) return;
    await updateLifeEvent(id, { isActive: !target.isActive });
  };

  const importGoalAsLifeEvent = async (goal: Goal, currentAge: number): Promise<void> => {
    const targetYear = new Date(goal.targetDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const targetAge = Math.max(currentAge, currentAge + (targetYear - currentYear));
    
    let cat: LifeEvent['category'] = 'other';
    if (goal.category === 'education') cat = 'education';
    else if (goal.category === 'house') cat = 'housing';
    else if (goal.category === 'marriage') cat = 'family';
    else if (goal.category === 'vacation') cat = 'travel';

    await addLifeEvent({
      name: goal.name,
      type: 'expense_once',
      targetAge,
      durationYears: 1,
      amount: goal.targetAmount,
      isInflationAdjusted: goal.isInflationAdjusted ?? true,
      category: cat,
      linkedGoalId: goal.id,
      isActive: true,
      notes: `Imported from goal "${goal.name}"`
    });
  };

  // Transaction operations
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;

    const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';

    if (isManual) {
      // Offline-safe: get ID synchronously, write is queued by Firestore
      const id = FirebaseService.addTransactionOfflineSafe(user.id, transaction);
      const newTransaction: Transaction = { ...transaction, id };
      setTransactions(prev => [...prev, newTransaction]);
      invalidateCaches({ added: [newTransaction] });
      trackPendingNew([id]);
      return id;
    } else {
      try {
        const id = await FirebaseService.addTransaction(user.id, transaction);
        const newTransaction: Transaction = { ...transaction, id };
        setTransactions(prev => [...prev, newTransaction]);
        invalidateCaches({ added: [newTransaction] });
        trackPendingNew([id]);
        return id;
      } catch (error) {
        console.error('Error adding transaction:', error);
        throw error;
      }
    }
  };

  const updateTransaction = async (id: string, update: Partial<Transaction>) => {
    if (!user) return;

    const oldTransaction = transactions.find(t => t.id === id);
    let transaction = update;

    // Re-categorised away from Transfer: it's no longer one side of a transfer
    const partnerId = oldTransaction?.transferPairId;
    if (partnerId && update.category !== undefined && !isTransferTransaction({ ...oldTransaction, ...update }, categories)) {
      transaction = { ...update, transferPairId: null };
      const partner = transactions.find(t => t.id === partnerId);
      if (partner?.transferPairId === id) {
        updateTransaction(partnerId, { transferPairId: null });
      }
    }

    // Optimistic local update for immediate UI feedback (list + summary views)
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transaction } : t));
    invalidateCaches(oldTransaction ? { removed: [oldTransaction], added: [{ ...oldTransaction, ...transaction }] } : undefined);
    // Track: if it's already a new item, don't overwrite; otherwise save pre-edit snapshot
    if (!pendingNewIds.has(id) && oldTransaction) {
      trackPendingEdit(id, oldTransaction);
    }

    // Fire-and-forget in manual mode (write queues locally); await in online modes
    const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
    if (isManual) {
      FirebaseService.updateTransaction(id, transaction).catch(err =>
        console.error('Error updating transaction (queued):', err)
      );
    } else {
      try {
        await FirebaseService.updateTransaction(id, transaction);
      } catch (error) {
        console.error('Error updating transaction:', error);

        // Roll back local transaction state on persistence failure
        if (oldTransaction) {
          setTransactions(prev => prev.map(t => t.id === id ? oldTransaction : t));
          invalidateCaches({ removed: [{ ...oldTransaction, ...transaction }], added: [oldTransaction] });


        }
      }
    }
  };

  const bulkUpdateTransactions = async (ids: string[], categoryUpdate: Partial<Transaction>) => {
    if (!user) return;
    // Re-categorised away from Transfer: drop the transfer links (see getTransferPartner)
    const update = categoryUpdate.category !== undefined && !isTransferTransaction({ category: categoryUpdate.category, type: categoryUpdate.type }, categories)
      ? { ...categoryUpdate, transferPairId: null }
      : categoryUpdate;
    
    try {
      // Get old transactions for category summary updates
      const oldTransactionsMap = new Map<string, Transaction>();
      ids.forEach(id => {
        const t = transactions.find(tx => tx.id === id);
        if (t) oldTransactionsMap.set(id, t);
      });

      // 1. Update in Firebase (Batch) — fire-and-forget when manual/offline
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.bulkUpdateTransactions(ids, update).catch(err =>
          console.error('Error bulk updating transactions (queued):', err)
        );
      } else {
        await FirebaseService.bulkUpdateTransactions(ids, update);
      }

      // 2. Compute new state locally *once*
      const updatedTransactions = transactions.map(t =>
        ids.includes(t.id) ? { ...t, ...update } : t
      );

      setTransactions(updatedTransactions);
      invalidateCaches({
        removed: [...oldTransactionsMap.values()],
        added: [...oldTransactionsMap.values()].map(t => ({ ...t, ...update }))
      });
      // Track edits for items that aren't already new
      ids.forEach(id => {
        if (!pendingNewIds.has(id)) {
          const old = oldTransactionsMap.get(id);
          if (old) trackPendingEdit(id, old);
        }
      });

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

      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.bulkUpdateTransactionsById(updatesById).catch(err =>
          console.error('Error bulk updating transactions by ID (queued):', err)
        );
      } else {
        await FirebaseService.bulkUpdateTransactionsById(updatesById);
      }

      const updatedTransactions = transactions.map(t =>
        updatesById[t.id] ? { ...t, ...updatesById[t.id] } : t
      );
      setTransactions(updatedTransactions);
      invalidateCaches({
        removed: [...oldTransactionsMap.values()],
        added: [...oldTransactionsMap.values()].map(t => ({ ...t, ...updatesById[t.id] }))
      });
      // Track edits for items that aren't already new
      ids.forEach(id => {
        if (!pendingNewIds.has(id)) {
          const old = oldTransactionsMap.get(id);
          if (old) trackPendingEdit(id, old);
        }
      });

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

      // An imported record that stands for an app-created other side of a transfer replaces
      // it: it takes over the link, and the placeholder is removed once the import is saved
      const placeholders = new Set<string>();
      let transactionsToImport: Omit<Transaction, 'id'>[] = newTransactions.map(t => {
        const placeholder = findAutoCreatedCounterpart(t, transactions, placeholders);
        if (!placeholder) return t;
        placeholders.add(placeholder.id);
        return { ...t, category: 'transfer', transferPairId: placeholder.transferPairId || null };
      });
      const existingTransactions = transactions.filter(t => !placeholders.has(t.id));
      let duplicateCheck: any = null;

      // Only check for duplicates if user has it enabled
      if (duplicateSettings.enabled && !options?.skipDuplicateCheck) {
        const { default: duplicateDetectionService } = await import('../services/duplicateDetectionService');

        // Convert to full transactions for duplicate checking
        const fullTransactions: Transaction[] = transactionsToImport.map(t => ({
          ...t,
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));

        // Determine mode based on user preferences
        const useSmartMode = duplicateSettings.smartMode && !duplicateSettings.strictMode;

        // Check for duplicates against EXISTING transactions (from state)
        duplicateCheck = duplicateDetectionService.checkBulkDuplicates(fullTransactions, existingTransactions, useSmartMode);

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

      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let createdTransactions: Transaction[];
      if (isManual) {
        createdTransactions = FirebaseService.bulkAddTransactionsOfflineSafe(user.id, cleanedTransactions);
      } else {
        createdTransactions = await FirebaseService.bulkAddTransactions(user.id, cleanedTransactions);
      }
      let mergedTransactions = [...existingTransactions, ...createdTransactions];

      // Link transfer sides: the partners of replaced placeholders, then imported transfers
      // with exactly one strong match. Best-effort - the records are already saved.
      try {
        const pairUpdates: Record<string, Partial<Transaction>> = {};
        const paired = new Set<string>();
        createdTransactions.forEach(t => {
          if (!t.transferPairId) return;
          pairUpdates[t.transferPairId] = { transferPairId: t.id };
          paired.add(t.id);
          paired.add(t.transferPairId);
        });
        createdTransactions.forEach(t => {
          if (paired.has(t.id) || !isTransferTransaction(t, categories)) return;
          const pool = mergedTransactions.filter(other => !paired.has(other.id));
          const match = autoPairCandidate(findTransferCandidates(t, pool, bankAccounts, categories));
          if (!match) return;
          pairUpdates[t.id] = { transferPairId: match.id };
          pairUpdates[match.id] = { transferPairId: t.id, category: 'transfer' };
          paired.add(t.id);
          paired.add(match.id);
        });

        if (Object.keys(pairUpdates).length > 0) {
          await FirebaseService.bulkUpdateTransactionsById(pairUpdates);
          mergedTransactions = mergedTransactions.map(t => pairUpdates[t.id] ? { ...t, ...pairUpdates[t.id] } : t);
        }
        if (placeholders.size > 0) {
          await FirebaseService.bulkDeleteTransactions([...placeholders]);
        }
      } catch (pairError) {
        console.error('Transactions saved, but failed to link transfers:', pairError);
      }

      setTransactions(mergedTransactions);
      {
        // Summary change = every record that was added, removed or modified by this import
        const beforeById = new Map(transactions.map(t => [t.id, t]));
        const afterById = new Map(mergedTransactions.map(t => [t.id, t]));
        invalidateCaches({
          removed: transactions.filter(t => afterById.get(t.id) !== t),
          added: mergedTransactions.filter(t => beforeById.get(t.id) !== t)
        });
      }
      trackPendingNew(createdTransactions.map(t => t.id));

      // Transactions are already persisted at this point. Balance/account
      // bookkeeping is best-effort: a failure here must not report the import
      // as failed (callers would otherwise retry and create duplicates).
      try {
        // Net effect of this import on an account: imported records, less the placeholders
        // they replaced (those were already part of the balance)
        const netHistoricalChange = (accountId: string) => {
          const signed = (t: Pick<Transaction, 'type' | 'amount'>) => (t.type === 'income' ? t.amount : -t.amount);
          const imported = cleanedTransactions.filter(t => t.bankAccountId === accountId).reduce((sum, t) => sum + signed(t), 0);
          const replaced = transactions.filter(t => placeholders.has(t.id) && t.bankAccountId === accountId).reduce((sum, t) => sum + signed(t), 0);
          return imported - replaced;
        };

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
              initialBalance -= netHistoricalChange(account.id);
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
                initialBalance -= netHistoricalChange(account.id);
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
      } catch (accountError) {
        console.error('Transactions saved, but failed to update bank account balances:', accountError);
      }

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
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteTransaction(id).catch(err =>
          console.error('Error deleting transaction (queued):', err)
        );
      } else {
        await FirebaseService.deleteTransaction(id);
      }
      const deleted = transactions.find(t => t.id === id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      invalidateCaches({ removed: deleted ? [deleted] : [] });
      trackPendingDeletes(1);
      // Remove from pending tracking if it was tracked
      setPendingNewIds(prev => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setPendingEditSnapshots(prev => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });

      // No need to update bank account balance - it's computed from initialBalance + transactions
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const bulkDeleteTransactions = async (ids: string[]) => {
    if (!user) return;

    try {
      // 1. Delete from Firebase (Batch) — fire-and-forget when manual/offline
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.bulkDeleteTransactions(ids).catch(err =>
          console.error('Error bulk deleting transactions (queued):', err)
        );
      } else {
        await FirebaseService.bulkDeleteTransactions(ids);
      }

      // 2. Update local state
      const idSet = new Set(ids);
      const deleted = transactions.filter(t => idSet.has(t.id));
      setTransactions(prev => prev.filter(t => !idSet.has(t.id)));
      invalidateCaches({ removed: deleted });
      trackPendingDeletes(ids.length);
      // Remove deleted IDs from pending tracking
      setPendingNewIds(prev => {
        const idsSet = new Set(ids);
        const hasAny = [...prev].some(id => idsSet.has(id));
        if (!hasAny) return prev;
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
      setPendingEditSnapshots(prev => {
        const hasAny = ids.some(id => prev.has(id));
        if (!hasAny) return prev;
        const next = new Map(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });

      // No need to update bank account balance - it's computed from initialBalance + transactions

    } catch (error) {
      console.error('Error bulk deleting transactions:', error);
    }
  };

  // Transfers between own accounts. Both sides point at each other and are categorised as
  // transfers; a side previously linked elsewhere is unlinked first.
  const linkTransfer = async (id: string, otherId: string) => {
    const a = transactions.find(t => t.id === id);
    const b = transactions.find(t => t.id === otherId);
    if (!a || !b) return;
    const updates: Record<string, Partial<Transaction>> = {
      [id]: { transferPairId: otherId, category: 'transfer' },
      [otherId]: { transferPairId: id, category: 'transfer' }
    };
    [a, b].forEach(t => {
      if (t.transferPairId && t.transferPairId !== id && t.transferPairId !== otherId) {
        updates[t.transferPairId] = { transferPairId: null };
      }
    });
    await bulkUpdateTransactionsById(updates);
  };

  const unlinkTransfer = async (id: string) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t?.transferPairId) return;
    const updates: Record<string, Partial<Transaction>> = { [id]: { transferPairId: null } };
    if (transactions.some(tx => tx.id === t.transferPairId)) {
      updates[t.transferPairId] = { transferPairId: null };
    }
    await bulkUpdateTransactionsById(updates);
  };

  const createTransferCounterpart = async (id: string, accountId: string) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;
    const newId = await addTransaction(buildTransferCounterpart(t, accountId, bankAccounts));
    if (!newId) return;
    // addTransaction appended the new record; update this side without the stale list
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, transferPairId: newId, category: 'transfer' } : tx));
    if (!pendingNewIds.has(id)) trackPendingEdit(id, t);
    const write = FirebaseService.updateTransaction(id, { transferPairId: newId, category: 'transfer' });
    const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
    if (isManual) {
      write.catch(err => console.error('Error linking transfer (queued):', err));
    } else {
      await write;
    }
    invalidateCaches({ removed: [t], added: [{ ...t, transferPairId: newId, category: 'transfer' }] });
  };

  // Bank Account operations
  const addBankAccount = async (account: Omit<BankAccount, 'id'>) => {
    if (!user) return;

    try {
      // Statement PDF passwords stay on this device only - never written to Firestore
      const { statementPassword, ...accountData } = account;
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('bankAccounts', { ...accountData, userId: user.id });
      } else {
        id = await FirebaseService.addBankAccount(user.id, accountData);
      }
      statementPasswordStore.set(id, statementPassword);
      const newAccount: BankAccount = { ...accountData, id };
      setBankAccounts(prev => [...prev, newAccount]);
      return id;
    } catch (error) {
      console.error('Error adding bank account:', error);
    }
  };

  const updateBankAccount = async (id: string, account: Partial<BankAccount>) => {
    try {
      // Statement PDF passwords stay on this device only. When the form sends the
      // field, store it locally and clear any legacy plain-text copy in Firestore.
      const { statementPassword, ...updateData } = account;
      const hasPasswordField = 'statementPassword' in account;
      if (hasPasswordField) {
        statementPasswordStore.set(id, statementPassword);
      }
      const firestoreUpdate: Partial<BankAccount> = hasPasswordField
        ? { ...updateData, statementPassword: deleteField() as any }
        : updateData;
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateBankAccount(id, firestoreUpdate).catch(err => console.error('Error updating bank account (queued):', err));
      } else {
        await FirebaseService.updateBankAccount(id, firestoreUpdate);
      }
      setBankAccounts(prev => prev.map(a => {
        if (a.id !== id) return a;
        const { statementPassword: _legacyPassword, ...rest } = a;
        return { ...(hasPasswordField ? rest : a), ...updateData };
      }));
    } catch (error) {
      console.error('Error updating bank account:', error);
    }
  };

  // Whether the in-memory transaction list holds the account's full history.
  // Cursor-based pagination means the list is often partial (initial page = 50),
  // and a balance summed from a partial set is wrong. When `hasMoreTransactions`
  // is true we know more pages exist upstream, so we cannot trust a live sum.
  const isTransactionSetComplete = (): boolean =>
    initialTransactionsLoadedRef.current && !hasMoreTransactions;

  // Live balance from the currently-loaded transactions.
  // Formula: currentBalance = initialBalance + sum(income) - sum(expenses/investment/insurance)
  const computeAccountBalanceFromLoaded = (account: BankAccount): number => {
    const accountTransactions = transactions.filter(t => t.bankAccountId === account.id);
    const totalTransactionAmount = accountTransactions.reduce((sum, t) => {
      if (t.type === 'income') return sum + t.amount;
      if (t.type === 'expense' || t.type === 'investment' || t.type === 'insurance') {
        return sum - t.amount;
      }
      return sum;
    }, 0);

    // If account is a credit card, outstanding balance represents debt (negative).
    // Normalize positive initial balance from legacy entries to negative so it reduces net worth.
    const initial = (account.accountType === 'credit_card' && account.initialBalance > 0)
      ? -account.initialBalance
      : account.initialBalance;

    return initial + totalTransactionAmount;
  };

  const getAccountBalance = (accountId: string): number => {
    const account = bankAccounts.find(a => a.id === accountId);
    if (!account) return 0;

    // Complete summaries → authoritative on any device (initial + every transaction's effect).
    if (summaryAccountNet) {
      const initial = (account.accountType === 'credit_card' && account.initialBalance > 0)
        ? -account.initialBalance
        : account.initialBalance;
      return initial + (summaryAccountNet[accountId] || 0);
    }

    // Full history in memory → authoritative live computation.
    if (isTransactionSetComplete()) {
      return computeAccountBalanceFromLoaded(account);
    }

    // Partial set → prefer the last complete snapshot over a wrong partial sum.
    const known = knownAccountBalancesRef.current[accountId];
    if (typeof known === 'number') {
      return known;
    }

    // No snapshot yet (e.g. first cold load) → best effort from what we have.
    return computeAccountBalanceFromLoaded(account);
  };

  // Snapshot each account's balance whenever the full transaction set is loaded.
  // This keeps `knownAccountBalancesRef` (and its localStorage mirror) current so
  // that partial-data renders fall back to an accurate figure rather than a sum
  // over an incomplete transaction list.
  useEffect(() => {
    if (!user || !isDataLoaded) return;
    if (!isTransactionSetComplete()) return;
    if (bankAccounts.length === 0) return;

    const snapshot: Record<string, number> = {};
    for (const account of bankAccounts) {
      snapshot[account.id] = computeAccountBalanceFromLoaded(account);
    }
    knownAccountBalancesRef.current = snapshot;
    if (user) {
      writeUserCache(user.id, 'accountBalances', snapshot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDataLoaded, bankAccounts, transactions, hasMoreTransactions]);

  const deleteBankAccount = async (id: string) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteBankAccount(id).catch(err => console.error('Error deleting bank account (queued):', err));
      } else {
        await FirebaseService.deleteBankAccount(id);
      }
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
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('sipRules', { ...rule, userId: user.id });
      } else {
        id = await FirebaseService.addSIPRule(user.id, rule);
      }
      setSipRules(prev => [...prev, { ...rule, id }]);
    } catch (error) {
      console.error('Error adding SIP rule:', error);
    }
  };

  const updateSIPRule = async (id: string, rule: Partial<SIPRule>) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateSIPRule(id, rule).catch(err => console.error('Error updating SIP rule (queued):', err));
      } else {
        await FirebaseService.updateSIPRule(id, rule);
      }
      setSipRules(prev => prev.map(r => r.id === id ? { ...r, ...rule } : r));
    } catch (error) {
      console.error('Error updating SIP rule:', error);
    }
  };

  const deleteSIPRule = async (id: string) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteSIPRule(id).catch(err => console.error('Error deleting SIP rule (queued):', err));
      } else {
        await FirebaseService.deleteSIPRule(id);
      }
      setSipRules(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting SIP rule:', error);
    }
  };



  // Liability operations
  const addLiability = async (liability: Omit<Liability, 'id'>) => {
    if (!user) return;

    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('liabilities', { ...liability, userId: user.id });
      } else {
        id = await FirebaseService.addLiability(user.id, liability);
      }
      const newLiability: Liability = { ...liability, id };
      setLiabilities(prev => [...prev, newLiability]);
    } catch (error) {
      console.error('Error adding liability:', error);
    }
  };

  const updateLiability = async (id: string, liability: Partial<Liability>) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateLiability(id, liability).catch(err => console.error('Error updating liability (queued):', err));
      } else {
        await FirebaseService.updateLiability(id, liability);
      }
      setLiabilities(prev => prev.map(l => l.id === id ? { ...l, ...liability } : l));
    } catch (error) {
      console.error('Error updating liability:', error);
    }
  };

  const deleteLiability = async (id: string) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteLiability(id).catch(err => console.error('Error deleting liability (queued):', err));
      } else {
        await FirebaseService.deleteLiability(id);
      }
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
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateMonthlyBudget(user.id, updatedBudget).catch(err => console.error('Error updating budget (queued):', err));
      } else {
        await FirebaseService.updateMonthlyBudget(user.id, updatedBudget);
      }
    } catch (error) {
      console.error('Error updating monthly budget:', error);
    }
  };

  // Recurring Transactions operations
  const addRecurringTransaction = async (recurringTransaction: Omit<RecurringTransaction, 'id'>): Promise<string | undefined> => {
    if (!user) return undefined;

    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addRecurringTransactionOfflineSafe(user.id, recurringTransaction);
      } else {
        id = await FirebaseService.addRecurringTransaction(user.id, recurringTransaction);
      }
      const newRecurringTransaction: RecurringTransaction = { ...recurringTransaction, id };
      setRecurringTransactions(prev => [...prev, newRecurringTransaction]);
      return id;
    } catch (error) {
      console.error('Error adding recurring transaction:', error);
      return undefined;
    }
  };

  const updateRecurringTransaction = async (id: string, recurringTransaction: Partial<RecurringTransaction>) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateRecurringTransaction(id, recurringTransaction).catch(err =>
          console.error('Error updating recurring transaction (queued):', err)
        );
      } else {
        await FirebaseService.updateRecurringTransaction(id, recurringTransaction);
      }
      setRecurringTransactions(prev => prev.map(rt => rt.id === id ? { ...rt, ...recurringTransaction } : rt));
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
    }
  };

  const deleteRecurringTransaction = async (id: string) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteRecurringTransaction(id).catch(err =>
          console.error('Error deleting recurring transaction (queued):', err)
        );
      } else {
        await FirebaseService.deleteRecurringTransaction(id);
      }
      setRecurringTransactions(prev => prev.filter(rt => rt.id !== id));
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
    }
  };

  // Bills operations
  const addBill = async (bill: Omit<Bill, 'id'>) => {
    if (!user) return;

    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('bills', { ...bill, userId: user.id });
      } else {
        id = await FirebaseService.addBill(user.id, bill);
      }
      const newBill: Bill = { ...bill, id };
      setBills(prev => [...prev, newBill]);
    } catch (error) {
      console.error('Error adding bill:', error);
    }
  };

  const updateBill = async (id: string, bill: Partial<Bill>) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateBill(id, bill).catch(err => console.error('Error updating bill (queued):', err));
      } else {
        await FirebaseService.updateBill(id, bill);
      }
      setBills(prev => prev.map(b => b.id === id ? { ...b, ...bill } : b));
    } catch (error) {
      console.error('Error updating bill:', error);
    }
  };

  const deleteBill = async (id: string) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteBill(id).catch(err => console.error('Error deleting bill (queued):', err));
      } else {
        await FirebaseService.deleteBill(id);
      }
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
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('sipTransactions', { ...sipTransaction, userId: user.id });
      } else {
        id = await FirebaseService.addSIPTransaction(user.id, sipTransaction);
      }
      const newSIPTransaction: SIPTransaction = { ...sipTransaction, id };
      setSipTransactions(prev => [...prev, newSIPTransaction]);
    } catch (error) {
      console.error('Error adding SIP transaction:', error);
    }
  };

  const updateSIPTransaction = async (id: string, sipTransaction: Partial<SIPTransaction>) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateSIPTransaction(id, sipTransaction).catch(err => console.error('Error updating SIP transaction (queued):', err));
      } else {
        await FirebaseService.updateSIPTransaction(id, sipTransaction);
      }
      setSipTransactions(prev => prev.map(s => s.id === id ? { ...s, ...sipTransaction } : s));
    } catch (error) {
      console.error('Error updating SIP transaction:', error);
    }
  };

  const deleteSIPTransaction = async (id: string) => {
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteSIPTransaction(id).catch(err => console.error('Error deleting SIP transaction (queued):', err));
      } else {
        await FirebaseService.deleteSIPTransaction(id);
      }
      setSipTransactions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting SIP transaction:', error);
    }
  };

  // Category Operations
  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!user) return;

    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('categories', { ...category, userId: user.id });
      } else {
        id = await FirebaseService.addCategory(user.id, category);
      }
      const newCategory: Category = { ...category, id };
      setCategories(prev => [...prev, newCategory]);
      return id;
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    if (!user) return;
    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateCategory(user.id, id, category).catch(err => console.error('Error updating category (queued):', err));
      } else {
        await FirebaseService.updateCategory(user.id, id, category);
      }
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...category } : c));
    } catch (error) {
      console.error('Error updating category:', error);
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
        await Promise.all(children.map(child => updateCategory(child.id, { parentId: '' })));
      }

      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteCategory(user.id, id).catch(err => console.error('Error deleting category (queued):', err));
      } else {
        await FirebaseService.deleteCategory(user.id, id);
      }
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
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        children.forEach(child => {
          FirebaseService.updateCategory(user.id, child.id, { parentId: '' }).catch(err => console.error('Error ungrouping (queued):', err));
        });
      } else {
        await Promise.all(children.map(child => FirebaseService.updateCategory(user.id, child.id, { parentId: '' })));
      }

      // Compute new categories snapshot where children are ungrouped
      const newCategories = categories.map(c => c.parentId === parentId ? { ...c, parentId: '' } as Category : c);
      setCategories(newCategories);
    } catch (error) {
      console.error('[DataContext] Error ungrouping children:', error);
    }
  };

  // Tag Operations
  const addTag = async (tag: Omit<Tag, 'id'>) => {
    if (!user) return;

    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let id: string;
      if (isManual) {
        id = FirebaseService.addDocOfflineSafe('tags', { ...tag, userId: user.id });
      } else {
        id = await FirebaseService.addTag(user.id, tag);
      }
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
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateTag(user.id, id, tag).catch(err => console.error('Error updating tag (queued):', err));
      } else {
        await FirebaseService.updateTag(user.id, id, tag);
      }
      setTags(prev => prev.map(t => t.id === id ? { ...t, ...tag } : t));
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const deleteTag = async (id: string) => {
    if (!user) return;

    try {
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteTag(user.id, id).catch(err => console.error('Error deleting tag (queued):', err));
      } else {
        await FirebaseService.deleteTag(user.id, id);
      }
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
        const before = transactions.filter(t => updatesById[t.id]);
        setTransactions(prev => prev.map(t =>
          updatesById[t.id] ? { ...t, ...updatesById[t.id] } : t
        ));
        invalidateCaches({ removed: before, added: before.map(t => ({ ...t, ...updatesById[t.id] })) });
      }

      // 2. Update rule stats
      const ruleWithStats = CategoryRuleService.updateRuleStats(tempRule, matchCount);

      // 3. Remove temp ID and save to Firebase
      const { id: _, ...ruleToSave } = ruleWithStats;
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      let newId: string;
      if (isManual) {
        newId = FirebaseService.addDocOfflineSafe('categoryRules', { ...ruleToSave, userId: user.id });
      } else {
        newId = await FirebaseService.addCategoryRule(user.id, ruleToSave);
      }

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
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.updateCategoryRule(user.id, id, updates).catch(err => console.error('Error updating category rule (queued):', err));
      } else {
        await FirebaseService.updateCategoryRule(user.id, id, updates);
      }
      setCategoryRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (error) {
      console.error('Error updating category rule:', error);
    }
  };

  const deleteCategoryRule = async (id: string) => {
    try {
      if (!user) return;
      const isManual = (userProfileRef.current?.syncSettings?.mode ?? 'auto') === 'manual';
      if (isManual) {
        FirebaseService.deleteCategoryRule(user.id, id).catch(err => console.error('Error deleting category rule (queued):', err));
      } else {
        await FirebaseService.deleteCategoryRule(user.id, id);
      }
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
      const before = transactions.filter(t => updatesById[t.id]);
      setTransactions(prev => prev.map(t =>
        updatesById[t.id] ? { ...t, ...updatesById[t.id] } : t
      ));
      invalidateCaches({ removed: before, added: before.map(t => ({ ...t, ...updatesById[t.id] })) });
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
    loadedCategoryRangesRef.current = new Set();
    setMonthlySummariesComplete(false);
    setMonthlySummaries([]);
    markSummariesLoaded(false);
    lazyLoadedRef.current = new Set();
    lastDashboardSummarySignatureRef.current = '';
    knownAccountBalancesRef.current = {};
    if (dashboardSummaryWriteTimerRef.current) {
      clearTimeout(dashboardSummaryWriteTimerRef.current);
      dashboardSummaryWriteTimerRef.current = null;
    }
    setUserProfile(getDefaultUserProfile());
    setDashboardSummary(null);
    setAssets([]);
    setInsurance([]);
    setGoals([]);
    setLicPolicies([]);
    setLifeEvents([]);
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
    // Clear all localStorage caches for this user and clean up legacy caches
    clearAllUserStorage(user?.id);
  };

  // Derived sync settings from userProfile (falls back to sensible default)
  const syncSettings: SyncSettings = userProfile?.syncSettings ?? { mode: 'auto', autoIntervalMinutes: 15 };

  // Guarded wrappers — Firestore SDK crashes (assertion c050) if toggled rapidly
  const safeGoOnline = async () => {
    if (firestoreNetworkRef.current === 'online') return;
    try {
      await goOnline();
      firestoreNetworkRef.current = 'online';
    } catch (error) {
      console.error('[DataContext] Failed to enable Firestore network:', error);
      throw error;
    }
  };
  const safeGoOffline = async () => {
    if (firestoreNetworkRef.current === 'offline') return;
    try {
      await goOffline();
      firestoreNetworkRef.current = 'offline';
    } catch (error) {
      console.error('[DataContext] Failed to disable Firestore network:', error);
      throw error;
    }
  };

  const forceSync = async (): Promise<void> => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // Temporarily re-enable network so queued writes flush & we can read fresh data
      await safeGoOnline();

      // Targeted sync: fetch profile/accounts/rules without touching isDataLoaded.
      const [profile, bankAccountsData, categoryRulesData] = await Promise.all([
        FirebaseService.getUserProfile(user.id),
        FirebaseService.getBankAccounts(user.id),
        FirebaseService.getCategoryRules(user.id),
      ]);

      if (profile) {
        setUserProfile(profile);
        writeUserCache(user.id, 'userProfile', profile);
      }
      setBankAccounts(bankAccountsData);
      writeUserCache(user.id, 'bankAccounts', bankAccountsData);
      setCategoryRules(categoryRulesData);
      writeUserCache(user.id, 'categoryRules', categoryRulesData);

      // Always update sync timestamp
      const syncedAt = Date.now();
      writeUserCache(user.id, 'lastSyncTimestamp', syncedAt);
      setLastSyncTimestamp(syncedAt);
      clearPendingEdits();
    } catch (error) {
      console.error('[DataContext] Force sync error:', error);
    } finally {
      // If manual mode, go back offline after sync
      const currentMode = userProfile?.syncSettings?.mode ?? 'auto';
      if (currentMode === 'manual') {
        await safeGoOffline();
        console.log('[DataContext] Back offline (manual mode)');
      }
      setIsSyncing(false);
    }
  };

  const updateSyncSettings = async (patch: Partial<SyncSettings>): Promise<void> => {
    const merged: SyncSettings = { ...syncSettings, ...patch };

    // Toggle Firestore network based on new mode — do this ONCE, never rapid-toggle
    if (merged.mode === 'manual') {
      await safeGoOffline();
      console.log('[DataContext] Firestore network disabled (manual mode)');
    } else {
      await safeGoOnline();
      console.log('[DataContext] Firestore network enabled');
      // Switching away from manual — queued writes will flush, clear pending tracking
      clearPendingEdits();
    }

    // Persist the setting — Firestore queues this locally if offline, flushes on next online
    updateUserProfile({ syncSettings: merged });
  };

  // Lightweight flush — just pushes queued writes to Firestore then goes back offline.
  // Does NOT re-read anything. Used by PendingSyncSheet individual/all sync buttons.
  const syncPendingChanges = async (): Promise<void> => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await safeGoOnline();
      // Give Firestore SDK time to flush the write queue (~1.5s is enough for LAN/good connection)
      await new Promise<void>(resolve => setTimeout(resolve, 1500));
      clearPendingEdits();
      const syncedAt = Date.now();
      writeUserCache(user.id, 'lastSyncTimestamp', syncedAt);
      setLastSyncTimestamp(syncedAt);
    } catch (error) {
      console.error('[DataContext] Sync pending error:', error);
    } finally {
      await safeGoOffline();
      setIsSyncing(false);
    }
  };

  // Re-sync when user returns to the tab (visibility change)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible' || !user || !isDataLoaded) return;
      if (syncSettings.mode === 'manual') return;
      if (syncSettings.mode === 'always') { forceSync(); return; }
      // mode === 'auto': check staleness
      const interval = syncSettings.autoIntervalMinutes * 60 * 1000;
      const last = lastSyncTimestamp ?? 0;
      if (Date.now() - last > interval) { forceSync(); }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDataLoaded, syncSettings, lastSyncTimestamp]);

  // On login / mode change: set Firestore network state
  useEffect(() => {
    if (!user || !isDataLoaded) return;
    if (syncSettings.mode === 'manual') {
      safeGoOffline()
        .then(() => console.log('[DataContext] Firestore offline (manual mode on load)'))
        .catch((error) => console.error('[DataContext] Failed to go offline on load:', error));
    } else {
      // Firestore is online by default; this is mostly a no-op unless we previously forced offline.
      safeGoOnline()
        .then(() => console.log('[DataContext] Firestore online'))
        .catch((error) => console.error('[DataContext] Failed to go online on load:', error));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isDataLoaded, syncSettings.mode]);

  const value: DataContextType = {
    userProfile,
    dashboardSummary,
    updateUserProfile,
    // Financial Data
    assets,
    insurance,
    goals,
    lifeEvents,
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

    addLifeEvent,
    updateLifeEvent,
    deleteLifeEvent,
    toggleLifeEventActive,
    importGoalAsLifeEvent,
    addTransaction,
    addTransactionsBulk,
    updateTransaction,
    deleteTransaction,
    linkTransfer,
    unlinkTransfer,
    createTransferCounterpart,
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
    loadDashboardSummary,
    saveDashboardSummary,
    isDataLoaded,
    categorySummaryVersion,
    monthlySummaries,
    monthlySummariesComplete: monthlySummariesComplete && monthlySummariesLoaded,
    accountBalancesAuthoritative: summaryAccountNet !== null,
    indexes,
    bulkUpdateTransactions,
    bulkUpdateTransactionsById,
    bulkDeleteTransactions,

    // Lazy loading functions
    loadGoals,
    loadLifeEvents,
    loadAssets,
    loadInsurance,
    loadLiabilities,
    loadRecurringTransactions,
    loadBills,
    loadSIPRules,
    loadMonthlyBudget,
    loadInitialTransactions,
    loadTransactionsForPeriod,
    loadTransactionsForCategories,

    // Sync
    lastSyncTimestamp,
    isSyncing,
    forceSync,
    syncSettings,
    updateSyncSettings,
    pendingEditIds,
    pendingNewIds,
    pendingEditSnapshots,
    pendingChangeCount: pendingEditIds.size + pendingDeleteCount,
    discardPendingChange,
    syncPendingChanges,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};