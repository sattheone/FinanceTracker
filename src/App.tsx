import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthPage from './components/auth/AuthPage';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Calendar from './pages/Calendar';
import RecurringTransactions from './pages/RecurringTransactions';

// Import test utility for development
if (process.env.NODE_ENV === 'development') {
  import('./utils/testDuplicateDetection');
}
import Assets from './pages/Assets';
import Goals from './pages/Goals';
import Insurance from './pages/Insurance';
import Liabilities from './pages/Liabilities';
import Reports from './pages/Reports';
import Forecast from './pages/Forecast';
import Settings from './pages/Settings';
import Alerts from './pages/Alerts';
import Categories from './pages/Categories';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Check for manual onboarding bypass (for existing users with data issues)
  const bypassOnboarding = localStorage.getItem('bypassOnboarding') === 'true';

  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Onboarding check:', {
      onboardingCompleted: user?.onboardingCompleted,
      bypassOnboarding,
      userEmail: user?.email
    });
  }

  // Skip onboarding if:
  // 1. User has completed onboarding
  // 2. Manual bypass is set
  // 3. User has been registered for more than 1 day (likely existing user)
  const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : null;
  const isOldUser = userCreatedAt && (Date.now() - userCreatedAt.getTime()) > 24 * 60 * 60 * 1000;

  if (!user?.onboardingCompleted && !bypassOnboarding && !isOldUser) {
    return <OnboardingWizard />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="recurring" element={<RecurringTransactions />} />
        <Route path="assets" element={<Assets />} />
        <Route path="goals" element={<Goals />} />
        <Route path="insurance" element={<Insurance />} />
        <Route path="liabilities" element={<Liabilities />} />
        <Route path="reports" element={<Reports />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="settings" element={<Settings />} />
        <Route path="categories" element={<Categories />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;