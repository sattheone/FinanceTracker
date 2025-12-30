export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense' | 'investment' | 'insurance';
  amount: number;
  paymentMethod?: string;
  bankAccountId?: string; // Link to bank account
  recurringTransactionId?: string; // Link to recurring transaction if auto-generated
  tags?: string[]; // User-defined tags for better categorization
  isLinked?: boolean;
  autoLinked?: boolean;
  entityLinks?: {
    type: 'goal' | 'bill' | 'loan' | 'asset';
    id: string;
    name: string;
  }[];
  appliedRule?: { // Metadata if categorized by a rule
    id: string;
    name: string;
  };
}

// Simple Goal Contribution Tracking
export interface GoalContribution {
  id: string;
  transactionId: string;
  goalId: string;
  goalName: string;
  amount: number;
  date: string;
  notes?: string;
}

export const assetCategories = [
  { value: 'stocks', label: 'Stocks', icon: '📈' },
  { value: 'mutual_funds', label: 'Mutual Funds', icon: '📊' },
  { value: 'fixed_deposit', label: 'Fixed Deposit', icon: '🏦' },
  { value: 'epf', label: 'EPF (Provident Fund)', icon: '🏛️' },
  { value: 'gold', label: 'Gold', icon: '🥇' },
  { value: 'cash', label: 'Cash/Savings', icon: '💰' },
  { value: 'other', label: 'Other', icon: '💼' },
];

export interface Asset {
  id: string;
  name: string;
  category: 'stocks' | 'mutual_funds' | 'fixed_deposit' | 'gold' | 'cash' | 'epf' | 'other';
  currentValue: number;
  purchaseValue?: number; // Deprecated: use investedValue instead
  investedValue?: number; // Total amount invested (replaces purchaseValue)
  purchaseDate?: string;
  // Enhanced investment tracking
  symbol?: string; // Stock/MF symbol for API calls
  isin?: string; // ISIN code for mutual funds
  quantity?: number; // Number of units/shares
  averagePrice?: number; // Average purchase price per unit
  lastUpdated?: string; // Last price update timestamp
  marketPrice?: number; // Current market price per unit
  dayChange?: number; // Day's change in value
  dayChangePercent?: number; // Day's change percentage
  totalReturn?: number; // Total return amount
  totalReturnPercent?: number; // Total return percentage
  xirr?: number; // XIRR (annualized return)
  // SIP specific data
  isSIP?: boolean; // Is this a SIP investment?
  sipAmount?: number; // Monthly SIP amount
  sipDate?: number; // Day of month for SIP (1-31)
  // Live price data
  livePriceData?: any; // Raw price data from API
  lastPriceUpdate?: string; // When price was last updated
  schemeCode?: string; // Mutual fund scheme code
  sipStartDate?: string; // SIP start date
  sipTransactions?: SIPTransaction[]; // SIP transaction history
  // Portfolio allocation
  targetAllocation?: number; // Target allocation percentage
  currentAllocation?: number; // Current allocation percentage
  rebalanceAction?: 'buy' | 'sell' | 'hold'; // Rebalancing suggestion
}

export interface SIPTransaction {
  id: string;
  date: string;
  amount: number;
  units: number;
  nav: number; // Net Asset Value at purchase
  assetId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Insurance {
  id: string;
  type: 'term' | 'endowment' | 'health' | 'other';
  policyName: string;
  coverAmount: number;
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'yearly';
  premiumPayingTerm?: number; // New field: in years
  policyStartDate?: string; // New field: to calculate payout year
  usePremiumPayingTermForMaturity?: boolean; // New field: toggle for payout logic
  bonusGuaranteedAddition?: number; // New field
  maturityDate?: string;
  maturityAmount?: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  category: 'retirement' | 'education' | 'marriage' | 'house' | 'emergency' | 'vacation' | 'other';
  expectedReturnRate: number; // Annual return rate as percentage (e.g., 12 for 12%)
  isInflationAdjusted: boolean; // Whether the target amount is inflation-adjusted
  // Enhanced integration with SIP assets
  linkedSIPAssets: string[]; // IDs of linked SIP assets (mutual_funds or epf with isSIP=true)
  linkedRecurringTransactions?: string[]; // IDs of linked recurring transactions
  lastSIPUpdate?: string; // Last date when SIP contribution was added to currentAmount
  linkedTransactionCategories: string[]; // Categories that contribute to this goal
  autoUpdateFromTransactions: boolean; // Auto-update progress from transactions
  priority: 'high' | 'medium' | 'low'; // Goal priority
  description?: string; // Goal description
  milestones?: GoalMilestone[]; // Achievement milestones
}

export interface GoalMilestone {
  id: string;
  name: string;
  targetAmount: number;
  isCompleted: boolean;
  completedDate?: string;
}

export interface Liability {
  id: string;
  name: string;
  type: 'home_loan' | 'personal_loan' | 'car_loan' | 'credit_card' | 'education_loan' | 'business_loan' | 'other';
  principalAmount: number; // Original loan amount
  currentBalance: number; // Outstanding amount
  interestRate: number; // Annual interest rate as percentage
  emiAmount: number; // Monthly EMI amount
  startDate: string; // Loan start date
  endDate: string; // Expected completion date
  bankName: string; // Lender name
  accountNumber?: string; // Loan account number
  description?: string; // Additional notes
}

export interface LICPolicy {
  id: string;
  policyNumber: string;
  maturityYear: number;
  maturityAmount: number;
}

export interface MonthlyBudget {
  income: number;
  expenses: {
    household: number;
    insurance: number;
    loans: number;
    investments: number;
    other: number;
  };
  surplus: number;
  categoryBudgets?: Record<string, number>;
}

export type AccountType = 'bank' | 'cash' | 'credit_card';

export interface BankAccount {
  id: string;
  accountType: AccountType;
  bank: string;
  number: string;
  balance: number;
  initialBalance?: number; // Starting balance for calculated balance approach
  logo: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'income' | 'expense' | 'investment' | 'insurance';
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval?: number; // e.g., 2 for "every 2 weeks"
  startDate: string;
  endDate?: string; // Optional end date
  nextDueDate: string;
  isActive: boolean;
  bankAccountId?: string;
  paymentMethod?: string;
  reminderDays: number; // Days before due date to remind
  autoCreate: boolean; // Auto-create transactions
  tags: string[]; // For subscription management
  vendor?: string; // For subscriptions (Netflix, Spotify, etc.)
  lastProcessedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  name: string;
  description: string;
  category: string;
  amount: number;
  dueDate: string;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  isPaid: boolean;
  paidDate?: string;
  paidAmount?: number;
  reminderDays: number;
  isOverdue: boolean;
  recurringTransactionId?: string;
  bankAccountId?: string;
  vendor?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Alert System
export type AlertType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'unusual_spending'
  | 'low_balance'
  | 'large_transaction'
  | 'bill_reminder'
  | 'bill_overdue';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  category?: string;
  amount?: number;
  relatedId?: string; // Transaction ID, Bill ID, etc.
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
}

// Auto-Categorization Rules
export interface CategoryRule {
  id: string;
  name: string; // Transaction description pattern to match
  categoryId: string; // Target category to apply
  transactionType?: 'income' | 'expense' | 'investment' | 'insurance'; // Optional target transaction type
  matchType: 'exact' | 'partial'; // Exact match or contains
  createdAt: string;
  lastUsed?: string; // Last time this rule was applied
  matchCount: number; // Number of transactions matched
  isActive: boolean; // Whether rule is currently active
}

// SIP Rules
export interface SIPRule {
  id: string;
  sipId: string; // ID of the SIP asset
  descriptionPattern: string; // Pattern to match in transaction description
  matchType: 'contains' | 'equals' | 'regex';
  amount: number; // Expected amount
  amountTolerance: number; // Percentage tolerance (e.g. 5 for 5%)
  expectedDate?: number; // Expected day of month (1-31)
  dateTolerance?: number; // Days tolerance (default 3)
  isActive: boolean;
  priority?: number; // Higher number = higher priority
  lastUsed?: string;
  matchCount: number;
}