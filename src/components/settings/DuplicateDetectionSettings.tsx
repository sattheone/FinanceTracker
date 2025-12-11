import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import DuplicateDetectionTester from './DuplicateDetectionTester';

interface DuplicateSettings {
  enabled: boolean;
  smartMode: boolean;
  strictMode: boolean;
  showFileWarnings: boolean;
}

const DuplicateDetectionSettings: React.FC = () => {
  const theme = useThemeClasses();
  const [settings, setSettings] = useState<DuplicateSettings>({
    enabled: true,
    smartMode: true,
    strictMode: false,
    showFileWarnings: true
  });

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('duplicateDetectionSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSettingChange = (key: keyof DuplicateSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('duplicateDetectionSettings', JSON.stringify(newSettings));
  };

  const clearImportHistory = () => {
    if (confirm('Are you sure you want to clear the import history? This will allow previously imported files to be imported again.')) {
      localStorage.removeItem('importHistory');
      alert('Import history cleared successfully!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(theme.bgBlue, "p-4 rounded-lg border")}>
        <div className="flex items-start space-x-3">
          <Shield className={cn(theme.textBlue, "w-6 h-6 mt-0.5")} />
          <div>
            <h3 className={cn(theme.textBlue, "font-semibold mb-1")}>
              Duplicate Detection Settings
            </h3>
            <p className={cn(theme.textBlueSecondary, "text-sm")}>
              Configure how the system detects and handles duplicate transactions during imports.
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Enable Duplicate Detection</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically detect and warn about potential duplicate transactions
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleSettingChange('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.enabled && (
          <>
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Smart Mode (Recommended)</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Only flag very obvious duplicates to reduce false positives
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smartMode}
                  onChange={(e) => handleSettingChange('smartMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Strict Mode</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Flag more potential duplicates (may cause false positives)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.strictMode}
                  onChange={(e) => handleSettingChange('strictMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">File Import Warnings</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Warn when trying to import the same Excel file twice
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showFileWarnings}
                  onChange={(e) => handleSettingChange('showFileWarnings', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Mode Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cn(theme.bgGreen, "p-4 rounded-lg border")}>
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className={cn(theme.textGreen, "font-medium mb-1")}>Smart Mode</h4>
              <p className={cn(theme.textGreenSecondary, "text-sm")}>
                • Only flags 98%+ confidence matches<br/>
                • Reduces false positives<br/>
                • Better user experience<br/>
                • Recommended for most users
              </p>
            </div>
          </div>
        </div>

        <div className={cn(theme.bgYellow, "p-4 rounded-lg border")}>
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className={cn(theme.textYellow, "font-medium mb-1")}>Strict Mode</h4>
              <p className={cn(theme.textYellowSecondary, "text-sm")}>
                • Flags 90%+ confidence matches<br/>
                • May cause false positives<br/>
                • More interruptions during import<br/>
                • Use only if you have many duplicates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Import History Management */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Import History</h4>
        
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Clear Import History</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Remove all tracked imported files (allows re-importing previously imported files)
            </p>
          </div>
          <button
            onClick={clearImportHistory}
            className={cn(
              "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            )}
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Current Status */}
      <div className={cn(theme.bgBlue, "p-4 rounded-lg border")}>
        <h4 className={cn(theme.textBlue, "font-medium mb-2")}>Current Configuration</h4>
        <div className={cn(theme.textBlueSecondary, "text-sm space-y-1")}>
          <p>• Duplicate Detection: {settings.enabled ? 'Enabled' : 'Disabled'}</p>
          {settings.enabled && (
            <>
              <p>• Mode: {settings.smartMode ? 'Smart Mode (98% threshold)' : settings.strictMode ? 'Strict Mode (90% threshold)' : 'Standard Mode (95% threshold)'}</p>
              <p>• File Warnings: {settings.showFileWarnings ? 'Enabled' : 'Disabled'}</p>
            </>
          )}
        </div>
      </div>

      {/* Test Your Settings */}
      <DuplicateDetectionTester />
    </div>
  );
};

export default DuplicateDetectionSettings;