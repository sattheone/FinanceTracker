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
  // Transaction linking system
  entityLinks?: TransactionEntityLink[]; // Links to goals, budgets, insurance, etc.
  isLinked?: boolean; // Quick check if transaction has any links
  autoLinked?: boolean; // Whether this was auto-linked by rules
  linkingConfidence?: number; // AI confidence score for auto-linking (0-1)
  tags?: string[]; // User-defined tags for better categorization
}

// Transaction Entity Linking System
export interface TransactionEntityLink {
  id: string;
  transactionId: string;
  entityType: 'goal' | 'budget' | 'insurance' | 'asset' | 'liability' | 'custom';
  entityId: string;
  entityName: string; // Cached for performance
  amount: number; // Amount allocated to this entity
  percentage: number; // Percentage of transaction amount
  linkType: 'manual' | 'auto' | 'rule-based';
  ruleId?: string; // If linked by a rule
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Auto-linking Rules System
export interface LinkingRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number; // Higher priority rules execute first
  conditions: LinkingCondition[];
  actions: LinkingAction[];
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface LinkingCondition {
  field: 'amount' | 'description' | 'category' | 'type' | 'bankAccount' | 'paymentMethod';
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'regex';
  value: string | number;
  secondValue?: string | number; // For 'between' operator
  caseSensitive?: boolean;
}

export interface LinkingAction {
  entityType: 'goal' | 'budget' | 'insurance' | 'asset' | 'liability';
  entityId: string;
  allocationMethod: 'fixed_amount' | 'percentage' | 'remaining_amount';
  amount?: number;
  percentage?: number;
  notes?: string;
}

// Entity Progress Tracking
export interface EntityProgress {
  entityType: 'goal' | 'budget' | 'insurance' | 'asset' | 'liability';
  entityId: string;
  entityName: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  monthlyContribution: number;
  projectedCompletion?: string;
  lastUpdated: string;
  linkedTransactions: string[]; // Transaction IDs
  milestones: ProgressMilestone[];
}

export interface ProgressMilestone {
  id: string;
  name: string;
  targetAmount: number;
  achievedDate?: string;
  isAchieved: boolean;
}

// Hierarchical Entity Views
export interface EntityHierarchy {
  id: string;
  name: string;
  type: 'goal' | 'budget' | 'insurance';
  totalAmount: number;
  children: EntityHierarchyItem[];
  progress: EntityProgress;
}

export interface EntityHierarchyItem {
  id: string;
  name: string;
  type: 'investment' | 'insurance' | 'savings' | 'other';
  amount: number;
  percentage: number;
  transactions: Transaction[];
  lastContribution?: string;
}

// Notification System for Linking
export interface LinkingNotification {
  id: string;
  type: 'milestone_achieved' | 'goal_progress' | 'auto_link_suggestion' | 'link_broken' | 'rule_triggered';
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  transactionId?: string;
  isRead: boolean;
  createdAt: string;
  actionRequired?: boolean;
  actionUrl?: string;
}

export interface Asset {
  id: string;
  name: string;
  category: 'stocks' | 'mutual_funds' | 'fixed_deposit' | 'gold' | 'cash' | 'other';
  currentValue: number;
  purchaseValue?: number;
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
  sipAmount?: number; // Monthly SIP amount
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
  category: 'retirement' | 'education' | 'marriage' | 'other';
  expectedReturnRate: number; // Annual return rate as percentage (e.g., 12 for 12%)
  isInflationAdjusted: boolean; // Whether the target amount is inflation-adjusted
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
}

export interface BankAccount {
  id: string;
  bank: string;
  number: string;
  balance: number;
  logo: string;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'income' | 'expense' | 'investment' | 'insurance';
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
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