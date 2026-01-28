import React, { useState } from 'react';
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Download,
  Upload,
  Palette,
  Globe,
  Lock,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Camera,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';

import SimpleCategoryManager from '../components/categories/SimpleCategoryManager';
import CategoryMigration from '../components/settings/CategoryMigration';
import CategoryRules from '../components/settings/CategoryRules';
import SimpleEmailSettings from '../components/settings/SimpleEmailSettings';
import EmailDiagnostics from '../components/settings/EmailDiagnostics';
import GmailImportSettings from '../components/settings/GmailImportSettings';
import DuplicateDetectionSettings from '../components/settings/DuplicateDetectionSettings';
import DataDeletionSettings from '../components/settings/DataDeletionSettings';
import { CategoryConfigInit } from '../components/admin/CategoryConfigInit';

const CategoriesWithMigration: React.FC = () => {
  return (
    <div className="space-y-6">
      <SimpleCategoryManager />

      {/* Category Migration Tool */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
          Fix Invalid Categories
        </h4>
        <p className="text-blue-800 dark:text-blue-200 text-sm mb-4">
          If you see transactions showing numbers (like timestamps) instead of proper category names,
          use the tool below to fix them automatically.
        </p>
        <CategoryMigration />
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const { user, deleteAccount } = useAuth();
  const { userProfile, bankAccounts, getAccountBalance } = useData();
  const { theme, setTheme } = useTheme();


  const [activeTab, setActiveTab] = useState('profile');

  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState({
    // Profile settings
    name: user?.name || '',
    email: user?.email || '',
    phone: userProfile?.personalInfo.phone || '',

    // Financial preferences
    currency: 'INR',
    numberFormat: 'indian',
    financialYearStart: 'april',

    // Email Notifications
    emailNotifications: false,
    notificationEmail: user?.email || '',
    billReminders: true,
    billReminderDays: [1, 3, 7],
    recurringReminders: true,
    overdueAlerts: true,
    budgetAlerts: true,
    budgetLimit: 50000,
    budgetThreshold: 80,
    monthlyReports: false,
    goalReminders: true,

    // Display preferences
    theme: theme,
    language: 'english',
    dashboardLayout: 'default',

    // Security
    twoFactorAuth: false,
    loginAlerts: true,

    // Dashboard preferences
    dashboardAccounts: bankAccounts.map(acc => acc.id), // Array of account IDs to include in dashboard
  });



  const tabs = [
    { id: 'profile', label: 'Profile & Account', icon: User },
    { id: 'financial', label: 'Financial Preferences', icon: DollarSign },
    { id: 'categories', label: 'Categories', icon: SettingsIcon },
    { id: 'category-rules', label: 'Category Rules', icon: SettingsIcon },
    { id: 'accounts', label: 'Bank Accounts', icon: CreditCard },
    { id: 'gmail-import', label: 'Gmail Import', icon: Mail },
    { id: 'duplicates', label: 'Duplicate Detection', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display & Interface', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data & Privacy', icon: Download },
    { id: 'developer', label: 'Developer Tools', icon: SettingsIcon },
  ];

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));

    // Handle theme change
    if (key === 'theme') {
      setTheme(value);
    }

  };

  const handleSaveProfile = () => {
    // Save profile changes
    console.log('Saving profile changes...');
  };

  const handleExportData = () => {
    // Export all user data
    console.log('Exporting data...');
  };

  const handleDeleteAccount = async () => {
    const confirmMessage = `⚠️ PERMANENT ACCOUNT DELETION ⚠️

This will permanently delete:
• All your financial data (transactions, goals, assets, etc.)
• Your user account and profile
• All settings and preferences

This action CANNOT be undone!

Type "DELETE" to confirm:`;

    const userInput = prompt(confirmMessage);

    if (userInput !== 'DELETE') {
      if (userInput !== null) {
        alert('Account deletion cancelled. You must type "DELETE" exactly to confirm.');
      }
      return;
    }

    const finalConfirm = confirm('Are you absolutely sure? This will permanently delete everything and cannot be undone.');
    if (!finalConfirm) {
      return;
    }

    // Prompt for password to re-authenticate
    const password = prompt('For security reasons, please enter your password to confirm account deletion:');
    if (!password) {
      alert('Account deletion cancelled. Password is required.');
      return;
    }

    try {
      console.log('🗑️ Starting account deletion...');
      const success = await deleteAccount(password);

      if (success) {
        alert('✅ Your account has been permanently deleted. You will now be redirected to the login page.');
        // The user will be automatically redirected due to auth state change
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);

      // Show specific error message based on error code
      if (error?.code === 'auth/wrong-password') {
        alert('❌ Incorrect password. Account deletion cancelled.');
      } else if (error?.code === 'auth/too-many-requests') {
        alert('❌ Too many failed attempts. Please try again later.');
      } else {
        alert('❌ An error occurred while deleting your account. Please try again or contact support.');
      }
    }
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <button className="absolute bottom-0 right-0 h-8 w-8 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm border-2 border-white dark:border-gray-800 transition-all">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Picture</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload a profile picture</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Full Name</label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => handleSettingChange('name', e.target.value)}
            className="input-field theme-input border-gray-300 dark:border-gray-500"
          />
        </div>

        <div>
          <label className="form-label">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleSettingChange('email', e.target.value)}
              className="input-field theme-input !pl-10"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => handleSettingChange('phone', e.target.value)}
              className="input-field theme-input !pl-10"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div>
          <label className="form-label">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              className="input-field theme-input !pl-10 !pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={handleSaveProfile}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>

        <button
          onClick={handleDeleteAccount}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </button>
      </div>
    </div>
  );

  const renderFinancialSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Default Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => handleSettingChange('currency', e.target.value)}
            className="input-field theme-input border-gray-300 dark:border-gray-500"
          >
            <option value="INR">Indian Rupee (₹)</option>
            <option value="USD">US Dollar ($)</option>
            <option value="EUR">Euro (€)</option>
            <option value="GBP">British Pound (£)</option>
          </select>
        </div>

        <div>
          <label className="form-label">Number Format</label>
          <select
            value={settings.numberFormat}
            onChange={(e) => handleSettingChange('numberFormat', e.target.value)}
            className="input-field theme-input border-gray-300 dark:border-gray-500"
          >
            <option value="indian">Indian (1,00,000)</option>
            <option value="international">International (100,000)</option>
          </select>
        </div>

        <div>
          <label className="form-label">Financial Year Start</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={settings.financialYearStart}
              onChange={(e) => handleSettingChange('financialYearStart', e.target.value)}
              className="input-field theme-input !pl-10"
            >
              <option value="april">April (Indian FY)</option>
              <option value="january">January (Calendar Year)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Monthly Budget Limit</label>
            <input
              type="number"
              placeholder="50000"
              className="input-field theme-input"
            />
          </div>
          <div>
            <label className="form-label">Alert Threshold (%)</label>
            <input
              type="number"
              placeholder="80"
              min="1"
              max="100"
              className="input-field theme-input"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBankAccountSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Bank Accounts</h3>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <CreditCard className="w-4 h-4 mr-2" />
          Add Account
        </button>
      </div>

      <div className="space-y-4">
        {bankAccounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{account.logo}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{account.bank}</h4>
                  {account.accountType && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${account.accountType === 'credit_card'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : account.accountType === 'cash'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                      {account.accountType === 'credit_card' ? 'Credit Card' : account.accountType === 'cash' ? 'Cash' : 'Bank'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{account.number || 'No account number'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-lg font-semibold ${account.accountType === 'credit_card' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {account.accountType === 'credit_card' ? '-' : ''}₹{getAccountBalance(account.id).toLocaleString()}
              </span>
              <button className="p-2 text-gray-400 hover:text-blue-600 dark:text-blue-400">
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      {/* SendGrid Email Settings */}
      <SimpleEmailSettings />

      {/* Email Configuration Diagnostics */}
      <EmailDiagnostics />
    </div>
  );

  const renderDisplaySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => handleSettingChange('theme', e.target.value)}
            className="input-field theme-input"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">
            Auto theme follows your system preference
          </p>
        </div>

        <div>
          <label className="form-label">Language</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className="input-field theme-input !pl-10"
            >
              <option value="english">English</option>
              <option value="hindi">हिंदी (Hindi)</option>
              <option value="tamil">தமிழ் (Tamil)</option>
              <option value="bengali">বাংলা (Bengali)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Dashboard Layout</label>
          <select
            value={settings.dashboardLayout}
            onChange={(e) => handleSettingChange('dashboardLayout', e.target.value)}
            className="input-field theme-input border-gray-300 dark:border-gray-500"
          >
            <option value="default">Default</option>
            <option value="compact">Compact</option>
            <option value="detailed">Detailed</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard Account Selection</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">Choose which bank accounts to include in dashboard calculations</p>
        <div className="space-y-2">
          {bankAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{account.logo}</span>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{account.bank}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{account.number}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dashboardAccounts.includes(account.id)}
                  onChange={(e) => {
                    const newAccounts = e.target.checked
                      ? [...settings.dashboardAccounts, account.id]
                      : settings.dashboardAccounts.filter(id => id !== account.id);
                    handleSettingChange('dashboardAccounts', newAccounts);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
        {settings.dashboardAccounts.length === 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            No accounts selected. Dashboard will show data from all accounts.
          </p>
        )}
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {[
          { key: 'twoFactorAuth', label: 'Two-Factor Authentication', description: 'Add an extra layer of security to your account' },
          { key: 'loginAlerts', label: 'Login Alerts', description: 'Get notified of new login attempts' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{item.label}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings[item.key as keyof typeof settings] as boolean}
                onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Sessions</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Current Session</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Chrome on macOS • Active now</p>
            </div>
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:text-green-200 rounded-full">Current</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Export Your Data</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Download all your financial data in JSON format</p>
          <button
            onClick={handleExportData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Import Data</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Import financial data from Excel or CSV files</p>
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </button>
        </div>

        {/* Data Deletion Options */}
        <DataDeletionSettings />

        <div className="p-4 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-700">
          <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">Danger Zone</h4>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">Permanently delete your entire account and all data. This action cannot be undone.</p>
          <button
            onClick={handleDeleteAccount}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account & All Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileSettings();
      case 'financial': return renderFinancialSettings();
      case 'categories': return <CategoriesWithMigration />;
      case 'category-rules': return <CategoryRules />;
      case 'accounts': return renderBankAccountSettings();
      case 'gmail-import': return <GmailImportSettings />;
      case 'duplicates': return <DuplicateDetectionSettings />;
      case 'notifications': return renderNotificationSettings();
      case 'display': return renderDisplaySettings();
      case 'security': return renderSecuritySettings();
      case 'data': return renderDataSettings();
      case 'developer': return <CategoryConfigInit />;
      default: return renderProfileSettings();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white dark:text-white">Settings</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 dark:text-gray-400 mt-2">Manage your account preferences and settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar - Horizontal scroll on mobile, vertical on desktop */}
          <div className="lg:w-64 -mx-4 px-4 lg:mx-0 lg:px-0">
            <nav className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-1 overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0 lg:w-full ${activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    <Icon className="w-5 h-5 mr-2 lg:mr-3" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4 sm:mb-6">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;