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

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { userProfile, bankAccounts } = useData();
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
    
    // Notifications
    emailNotifications: true,
    budgetAlerts: true,
    goalReminders: true,
    monthlyReports: true,
    
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
    { id: 'accounts', label: 'Bank Accounts', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display & Interface', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data & Privacy', icon: Download },
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

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      console.log('Deleting account...');
    }
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <button className="absolute bottom-0 right-0 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700">
            <Camera className="w-3 h-3" />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
          <p className="text-sm text-gray-500">Upload a profile picture</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Full Name</label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => handleSettingChange('name', e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleSettingChange('email', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => handleSettingChange('phone', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-200">
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => handleSettingChange('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="INR">Indian Rupee (₹)</option>
            <option value="USD">US Dollar ($)</option>
            <option value="EUR">Euro (€)</option>
            <option value="GBP">British Pound (£)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Number Format</label>
          <select
            value={settings.numberFormat}
            onChange={(e) => handleSettingChange('numberFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="indian">Indian (1,00,000)</option>
            <option value="international">International (100,000)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year Start</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={settings.financialYearStart}
              onChange={(e) => handleSettingChange('financialYearStart', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="april">April (Indian FY)</option>
              <option value="january">January (Calendar Year)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Budget Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Budget Limit</label>
            <input
              type="number"
              placeholder="50000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alert Threshold (%)</label>
            <input
              type="number"
              placeholder="80"
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderBankAccountSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Your Bank Accounts</h3>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <CreditCard className="w-4 h-4 mr-2" />
          Add Account
        </button>
      </div>

      <div className="space-y-4">
        {bankAccounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{account.logo}</span>
              <div>
                <h4 className="font-medium text-gray-900">{account.bank}</h4>
                <p className="text-sm text-gray-500">{account.number}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold text-gray-900">
                ₹{account.balance.toLocaleString()}
              </span>
              <button className="p-2 text-gray-400 hover:text-blue-600">
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
      <div className="space-y-4">
        {[
          { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates about your account' },
          { key: 'budgetAlerts', label: 'Budget Alerts', description: 'Get notified when you exceed budget limits' },
          { key: 'goalReminders', label: 'Goal Reminders', description: 'Reminders about your financial goals' },
          { key: 'monthlyReports', label: 'Monthly Reports', description: 'Receive monthly financial summary reports' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">{item.label}</h4>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings[item.key as keyof typeof settings] as boolean}
                onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDisplaySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => handleSettingChange('theme', e.target.value)}
            className="input-field"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Auto theme follows your system preference
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="english">English</option>
              <option value="hindi">हिंदी (Hindi)</option>
              <option value="tamil">தமிழ் (Tamil)</option>
              <option value="bengali">বাংলা (Bengali)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard Layout</label>
          <select
            value={settings.dashboardLayout}
            onChange={(e) => handleSettingChange('dashboardLayout', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="default">Default</option>
            <option value="compact">Compact</option>
            <option value="detailed">Detailed</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Dashboard Account Selection</h3>
        <p className="text-sm text-gray-600">Choose which bank accounts to include in dashboard calculations</p>
        <div className="space-y-2">
          {bankAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{account.logo}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{account.bank}</h4>
                  <p className="text-sm text-gray-500">{account.number}</p>
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
          <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">{item.label}</h4>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings[item.key as keyof typeof settings] as boolean}
                onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Current Session</p>
              <p className="text-sm text-gray-500">Chrome on macOS • Active now</p>
            </div>
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Current</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Export Your Data</h4>
          <p className="text-sm text-gray-500 mb-4">Download all your financial data in JSON format</p>
          <button
            onClick={handleExportData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Import Data</h4>
          <p className="text-sm text-gray-500 mb-4">Import financial data from Excel or CSV files</p>
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </button>
        </div>

        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h4 className="font-medium text-red-900 mb-2">Danger Zone</h4>
          <p className="text-sm text-red-700 mb-4">Permanently delete all your data. This action cannot be undone.</p>
          <button
            onClick={handleDeleteAccount}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileSettings();
      case 'financial': return renderFinancialSettings();
      case 'accounts': return renderBankAccountSettings();
      case 'notifications': return renderNotificationSettings();
      case 'display': return renderDisplaySettings();
      case 'security': return renderSecuritySettings();
      case 'data': return renderDataSettings();
      default: return renderProfileSettings();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account preferences and settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
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