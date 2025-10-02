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
}

export interface Asset {
  id: string;
  name: string;
  category: 'stocks' | 'mutual_funds' | 'fixed_deposit' | 'gold' | 'cash' | 'other';
  currentValue: number;
  purchaseValue?: number;
  purchaseDate?: string;
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