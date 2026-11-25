export interface User {
  id: string;
  email: string;
  name: string;
  dateOfBirth: string;
  createdAt: string;
  onboardingCompleted: boolean;
}

export interface SyncSettings {
  mode: 'auto' | 'manual' | 'always';
  autoIntervalMinutes: 5 | 15 | 30 | 60;
}

export interface UserProfile {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    dateOfBirth: string;
  };
  financialInfo: {
    monthlyIncome: number;
    monthlyExpenses: number;
    retirementAge: number;
    currentAge: number;
  };
  displayPreferences?: {
    defaultTimePeriod: 'current' | 'previous';
  };
  syncSettings?: SyncSettings;
  /** Set by the rebuildMonthlySummaries Cloud Function once monthly summaries are complete (schema version) */
  summariesVersion?: number;
  summariesRebuiltAt?: unknown;
  onboardingStep: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}