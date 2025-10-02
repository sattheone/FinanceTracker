export interface User {
  id: string;
  email: string;
  name: string;
  dateOfBirth: string;
  createdAt: string;
  onboardingCompleted: boolean;
}

export interface UserProfile {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    dateOfBirth: string;
    spouseName?: string;
    spouseDateOfBirth?: string;
    children: Array<{
      name: string;
      dateOfBirth: string;
    }>;
  };
  financialInfo: {
    monthlyIncome: number;
    monthlyExpenses: number;
    retirementAge: number;
    currentAge: number;
  };
  onboardingStep: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}