import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Save,
  TestTube,
  Bell
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import sendGridEmailService, { EmailNotificationSettings } from '../../services/sendGridEmailService';
import browserNotificationService from '../../services/browserNotificationService';
import { auth } from '../../config/firebase';

const SimpleEmailSettings: React.FC = () => {
  const theme = useThemeClasses();
  const [settings, setSettings] = useState<EmailNotificationSettings>(sendGridEmailService.getSettings());
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(browserNotificationService.isEnabled());
  const [isTestingBrowser, setIsTestingBrowser] = useState(false);

  useEffect(() => {
    // Get fresh settings which will auto-update the email from auth
    const freshSettings = sendGridEmailService.getSettings();
    setSettings(freshSettings);
  }, []);

  const handleSettingChange = (key: keyof EmailNotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNestedSettingChange = (
    parentKey: keyof EmailNotificationSettings,
    childKey: string,
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] as any),
        [childKey]: value
      }
    }));
  };

  const handleDaysBeforeChange = (
    parentKey: 'billReminders' | 'recurringReminders',
    days: number,
    checked: boolean
  ) => {
    setSettings(prev => {
      const currentDays = prev[parentKey].daysBefore;
      const newDays = checked
        ? [...currentDays, days].sort((a, b) => b - a)
        : currentDays.filter(d => d !== days);
      
      return {
        ...prev,
        [parentKey]: {
          ...prev[parentKey],
          daysBefore: newDays
        }
      };
    });
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      sendGridEmailService.saveSettings(settings);
      setTestResult({ success: true, message: 'Settings saved successfully!' });
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!settings.enabled || !settings.emailAddress) {
      setTestResult({
        success: false,
        message: 'Please enable email notifications and enter your email address first.'
      });
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setTestResult({
        success: false,
        message: 'You must be logged in to send a test email.'
      });
      return;
    }

    setIsTestingEmail(true);
    setTestResult(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch('https://testemail-f62cmphkoq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userEmail: settings.emailAddress,
          fromEmail: 'noreply@financetracker.com',
          fromName: 'FinanceTracker'
        })
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: result.message });
      } else {
        setTestResult({ success: false, message: result.message || 'Failed to send test email.' });
      }

    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error}`
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleTestBrowserNotification = async () => {
    setIsTestingBrowser(true);
    try {
      const success = await browserNotificationService.sendTestNotification();
      setBrowserNotificationsEnabled(browserNotificationService.isEnabled());
      setTestResult({
        success,
        message: success 
          ? 'Browser notification sent! Check your browser for the notification.' 
          : 'Browser notifications not supported or permission denied.'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Browser notification test failed: ${error}`
      });
    } finally {
      setIsTestingBrowser(false);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    const granted = await browserNotificationService.requestPermission();
    setBrowserNotificationsEnabled(granted);
    if (granted) {
      setTestResult({
        success: true,
        message: 'Browser notifications enabled! You can now receive instant alerts.'
      });
    } else {
      setTestResult({
        success: false,
        message: 'Browser notifications permission denied. Please enable in browser settings.'
      });
    }
  };

  const isConfigured = settings.enabled && settings.emailAddress;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(theme.bgBlue, "p-6 rounded-lg border")}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={cn(theme.textBlue, "text-xl font-semibold")}>Email Notifications</h2>
            <p className={cn(theme.textBlueSecondary, "text-sm")}>
              Get notified about bills, budgets, and important financial events
            </p>
          </div>
        </div>

        {/* Configuration Status */}
        <div className={cn(
          "flex items-center space-x-2 p-3 rounded-lg",
          isConfigured 
            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700" 
            : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700"
        )}>
          {isConfigured ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-800 dark:text-green-200 font-medium">
                Email notifications are active
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                Configure your email to receive notifications
              </span>
            </>
          )}
        </div>
      </div>

      {/* Basic Configuration */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading3, "mb-4")}>Basic Settings</h3>
        
        <div className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <label className={theme.label}>Enable Email Notifications</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive automated email alerts for bills, budgets, and financial events
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleSettingChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Email Address - Read Only */}
          <div>
            <label className={theme.label}>Your Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="email"
                value={settings.emailAddress}
                className={cn(theme.input, "pl-10 bg-gray-50 dark:bg-gray-700 cursor-not-allowed")}
                placeholder="your.email@example.com"
                disabled={true}
                readOnly={true}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Notifications will be sent to your account email address (cannot be changed here)
            </p>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      {settings.enabled && (
        <div className={theme.card}>
          <h3 className={cn(theme.heading3, "mb-4")}>Notification Preferences</h3>
          
          <div className="space-y-6">
            {/* Bill Reminders */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">💳 Bill Reminders</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get notified before your bills are due
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.billReminders.enabled}
                    onChange={(e) => handleNestedSettingChange('billReminders', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {settings.billReminders.enabled && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Send reminders:</p>
                  <div className="flex flex-wrap gap-2">
                    {[7, 5, 3, 1].map(days => (
                      <label key={days} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.billReminders.daysBefore.includes(days)}
                          onChange={(e) => handleDaysBeforeChange('billReminders', days, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {days} day{days > 1 ? 's' : ''} before
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recurring Reminders */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">🔄 Recurring Transaction Reminders</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get notified about upcoming recurring payments and income
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.recurringReminders.enabled}
                    onChange={(e) => handleNestedSettingChange('recurringReminders', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {settings.recurringReminders.enabled && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Send reminders:</p>
                  <div className="flex flex-wrap gap-2">
                    {[5, 3, 1].map(days => (
                      <label key={days} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.recurringReminders.daysBefore.includes(days)}
                          onChange={(e) => handleDaysBeforeChange('recurringReminders', days, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {days} day{days > 1 ? 's' : ''} before
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Budget Alerts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">📊 Budget Alerts</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get notified when you approach your monthly budget limit
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.budgetAlerts.enabled}
                    onChange={(e) => handleNestedSettingChange('budgetAlerts', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {settings.budgetAlerts.enabled && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Alert when spending reaches:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={settings.budgetAlerts.threshold}
                      onChange={(e) => handleNestedSettingChange('budgetAlerts', 'threshold', Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem]">
                      {settings.budgetAlerts.threshold}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Overdue Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">🚨 Overdue Payment Alerts</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get notified about overdue bills and payments
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.overdueAlerts.enabled}
                  onChange={(e) => handleNestedSettingChange('overdueAlerts', 'enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Monthly Reports */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">📈 Monthly Reports</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive monthly financial summary reports
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.monthlyReports.enabled}
                    onChange={(e) => handleNestedSettingChange('monthlyReports', 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {settings.monthlyReports.enabled && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Send report on day of month:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={settings.monthlyReports.dayOfMonth}
                    onChange={(e) => handleNestedSettingChange('monthlyReports', 'dayOfMonth', Number(e.target.value))}
                    className={cn(theme.input, "w-20")}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Browser Notifications Alternative */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading3, "mb-4")}>🔔 Browser Notifications (Alternative)</h3>
        
        <div className="space-y-4">
          <div className={cn(
            "p-4 rounded-lg border",
            browserNotificationsEnabled 
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
              : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700"
          )}>
            <div className="flex items-center space-x-2 mb-2">
              {browserNotificationsEnabled ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              )}
              <span className={cn(
                "font-medium",
                browserNotificationsEnabled 
                  ? "text-green-800 dark:text-green-200"
                  : "text-yellow-800 dark:text-yellow-200"
              )}>
                {browserNotificationsEnabled 
                  ? "Browser notifications are enabled"
                  : "Browser notifications available as backup"
                }
              </span>
            </div>
            <p className={cn(
              "text-sm",
              browserNotificationsEnabled 
                ? "text-green-700 dark:text-green-300"
                : "text-yellow-700 dark:text-yellow-300"
            )}>
              {browserNotificationsEnabled 
                ? "You'll receive instant notifications in your browser for bills, budgets, and alerts."
                : "Enable browser notifications as a reliable alternative to email notifications."
              }
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {!browserNotificationsEnabled && (
              <button
                onClick={handleEnableBrowserNotifications}
                className="flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable Browser Notifications
              </button>
            )}
            
            <button
              onClick={handleTestBrowserNotification}
              disabled={isTestingBrowser}
              className={cn(
                "flex items-center justify-center px-4 py-2 border border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg font-medium transition-colors",
                isTestingBrowser && "opacity-50 cursor-not-allowed"
              )}
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isTestingBrowser ? 'Testing...' : 'Test Browser Notification'}
            </button>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p><strong>💡 Why use browser notifications?</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Instant alerts without email setup complexity</li>
              <li>Works immediately - no backend configuration needed</li>
              <li>Perfect backup when email notifications aren't working</li>
              <li>Native browser integration with action buttons</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={cn(
            "flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors",
            isSaving && "opacity-50 cursor-not-allowed"
          )}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>

        <button
          onClick={handleTestEmail}
          disabled={isTestingEmail || !isConfigured}
          className={cn(
            "flex items-center justify-center px-6 py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors",
            (isTestingEmail || !isConfigured) && "opacity-50 cursor-not-allowed"
          )}
        >
          <TestTube className="w-4 h-4 mr-2" />
          {isTestingEmail ? 'Sending Test...' : 'Send Test Email'}
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={cn(
          "p-4 rounded-lg border",
          testResult.success 
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200"
        )}>
          <div className="flex items-center space-x-2">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span className="font-medium">{testResult.message}</span>
          </div>
        </div>
      )}

      {/* Debug Info (Development Only) */}
      {import.meta.env.DEV && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border text-xs">
          <h4 className="font-medium mb-2">🔧 Debug Info (Dev Only)</h4>
          <div className="space-y-1 text-gray-600 dark:text-gray-400">
            <p>API Key: {import.meta.env.VITE_SENDGRID_API_KEY ? '✅ Found' : '❌ Missing'}</p>
            <p>From Email: {import.meta.env.VITE_SENDGRID_FROM_EMAIL || '❌ Missing'}</p>
            <p>From Name: {import.meta.env.VITE_SENDGRID_FROM_NAME || '❌ Missing'}</p>
            <p>User Email: {settings.emailAddress || '❌ Missing'}</p>
            <p>Service Configured: {sendGridEmailService.isConfigured() ? '✅ Yes' : '❌ No'}</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className={cn(theme.bgBlue, "p-4 rounded-lg border")}>
        <h4 className={cn(theme.textBlue, "font-medium mb-2")}>📧 How Email Notifications Work</h4>
        <div className={cn(theme.textBlueSecondary, "text-sm space-y-1")}>
          <p>• <strong>Automatic Setup:</strong> Uses your account email automatically</p>
          <p>• <strong>Professional Emails:</strong> Beautiful, mobile-friendly templates</p>
          <p>• <strong>Smart Timing:</strong> Notifications sent at optimal times</p>
          <p>• <strong>Reliable Delivery:</strong> Powered by enterprise-grade email service</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleEmailSettings;
