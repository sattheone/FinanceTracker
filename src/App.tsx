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
import TransactionLinking from './pages/TransactionLinking';
import Categories from './pages/Categories';
import RecurringTransactions from './pages/RecurringTransactions';
import Assets from './pages/Assets';
import Goals from './pages/Goals';
import Insurance from './pages/Insurance';
import Liabilities from './pages/Liabilities';
import Reports from './pages/Reports';
import Forecast from './pages/Forecast';
import Settings from './pages/Settings';

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

  if (!user?.onboardingCompleted) {
    return <OnboardingWizard />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="categories" element={<Categories />} />
        <Route path="transaction-linking" element={<TransactionLinking />} />
        <Route path="recurring" element={<RecurringTransactions />} />
        <Route path="assets" element={<Assets />} />
        <Route path="goals" element={<Goals />} />
        <Route path="insurance" element={<Insurance />} />
        <Route path="liabilities" element={<Liabilities />} />
        <Route path="reports" element={<Reports />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="settings" element={<Settings />} />
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