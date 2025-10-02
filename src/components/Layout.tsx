import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Home, 
  TrendingUp, 
  Target, 
  Shield, 
  CreditCard, 
  PieChart,
  Calendar,
  Settings,
  LogOut,
  User,
  TrendingDown,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDataLoaded } = useData();
  const { actualTheme, toggleTheme } = useTheme();

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/transactions', icon: CreditCard, label: 'Transactions' },
    { to: '/assets', icon: TrendingUp, label: 'Assets' },
    { to: '/liabilities', icon: TrendingDown, label: 'Liabilities' },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/insurance', icon: Shield, label: 'Insurance' },
    { to: '/reports', icon: PieChart, label: 'Reports' },
    { to: '/forecast', icon: Calendar, label: 'Forecast' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip to main content link for screen readers */}
      <a 
        href="#main-content" 
        className="skip-link"
      >
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-600" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary-600" aria-hidden="true" />
              <h1 className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                FinanceTracker
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300" role="status" aria-live="polite">
                <User className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Welcome, {user?.name}</span>
              </div>
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="interactive p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
                aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
              >
                {actualTheme === 'light' ? (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              
              <button
                onClick={logout}
                className="interactive flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Logout from your account"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav 
          className="w-64 bg-white dark:bg-gray-800 shadow-sm min-h-screen border-r border-gray-200 dark:border-gray-600" 
          role="navigation" 
          aria-label="Main navigation"
        >
          <div className="p-4">
            <ul className="space-y-2" role="list">
              {navItems.map((item) => (
                <li key={item.to} role="listitem">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `interactive flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600 dark:border-primary-400'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }`
                    }
                    aria-current={undefined}
                  >
                    <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main 
          id="main-content"
          className="flex-1 p-6 bg-gray-50 dark:bg-gray-900" 
          role="main"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;