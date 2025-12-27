import React, { useState, useEffect } from 'react';
import { Mail, Download, Settings, Play, Pause, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import gmailCrawlerService, { GmailConfig } from '../../services/gmailCrawlerService';
// import bankStatementParser from '../../services/bankStatementParser';

const GmailImportSettings: React.FC = () => {
  const theme = useThemeClasses();
  const { bankAccounts, addTransactionsBulk } = useData();
  const [config, setConfig] = useState<GmailConfig>(gmailCrawlerService.getConfig());
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<{ processed: number; transactions: number } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setConfig(gmailCrawlerService.getConfig());
  }, []);

  const handleConfigChange = (key: keyof GmailConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    gmailCrawlerService.saveConfig(newConfig);
  };

  const handleBankFilterChange = (bank: 'hdfc', key: string, value: any) => {
    const newConfig = {
      ...config,
      bankFilters: {
        ...config.bankFilters,
        [bank]: {
          ...config.bankFilters[bank],
          [key]: value
        }
      }
    };
    setConfig(newConfig);
    gmailCrawlerService.saveConfig(newConfig);
  };

  const handleManualImport = async () => {
    if (!config.enabled) {
      alert('Please enable Gmail import and configure authentication first.');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('🚀 Starting manual import...');
      const result = await gmailCrawlerService.processNewEmails();

      if (result.transactions.length > 0) {
        // Import transactions into the app
        await addTransactionsBulk(result.transactions);
        setLastImportResult({ processed: result.processed, transactions: result.transactions.length });
        alert(`✅ Successfully imported ${result.transactions.length} transactions from ${result.processed} emails!`);
      } else {
        setLastImportResult({ processed: result.processed, transactions: 0 });
        alert(`📧 Processed ${result.processed} emails but found no new transactions.`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsProcessing(true);
      await gmailCrawlerService.authenticateWithGoogle();
      alert('✅ Gmail connection test successful!');
    } catch (error) {
      console.error('Connection test failed:', error);
      alert(`❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAutoCrawl = () => {
    if (config.autoImport) {
      gmailCrawlerService.stopAutoCrawl();
      handleConfigChange('autoImport', false);
    } else {
      gmailCrawlerService.startAutoCrawl();
      handleConfigChange('autoImport', true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📧 Gmail Bank Statement Import
        </h3>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          Automatically import transactions from bank statement PDFs in your Gmail.
        </p>
      </div>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">Enable Gmail Import</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Allow the app to read bank statement emails from your Gmail
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => handleConfigChange('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Authentication Setup */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Gmail Authentication</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Google Client ID
                </label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => handleConfigChange('clientId', e.target.value)}
                  className="input-field theme-input"
                  placeholder="Your Google OAuth Client ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Google Client Secret
                </label>
                <input
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => handleConfigChange('clientSecret', e.target.value)}
                  className="input-field theme-input"
                  placeholder="Your Google OAuth Client Secret"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleTestConnection}
                disabled={isProcessing || !config.clientId || !config.clientSecret}
                className={cn(
                  theme.btnSecondary,
                  'flex items-center',
                  isProcessing && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Mail className="w-4 h-4 mr-2" />
                {isProcessing ? 'Testing...' : 'Test Connection'}
              </button>

              <a
                href="https://console.developers.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Get Google Credentials
              </a>
            </div>
          </div>

          {/* HDFC Bank Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">🏦 HDFC Bank Settings</h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.bankFilters.hdfc.enabled}
                  onChange={(e) => handleBankFilterChange('hdfc', 'enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {config.bankFilters.hdfc.enabled && (
              <div className="ml-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Sender Email
                  </label>
                  <input
                    type="email"
                    value={config.bankFilters.hdfc.senderEmail}
                    onChange={(e) => handleBankFilterChange('hdfc', 'senderEmail', e.target.value)}
                    className="input-field theme-input"
                    placeholder="alerts@hdfcbank.net"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Subject Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={config.bankFilters.hdfc.subjectKeywords.join(', ')}
                    onChange={(e) => handleBankFilterChange('hdfc', 'subjectKeywords', e.target.value.split(',').map(s => s.trim()))}
                    className="input-field theme-input"
                    placeholder="statement, account statement, monthly statement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Link to Bank Account
                  </label>
                  <select
                    className="input-field theme-input"
                    onChange={(e) => handleBankFilterChange('hdfc', 'linkedAccountId', e.target.value)}
                  >
                    <option value="">Select bank account</option>
                    {bankAccounts
                      .filter(account => account.bank.toLowerCase().includes('hdfc'))
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.bank} - {account.number}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Auto Import Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Auto Import</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically check for new statements every 6 hours
                </p>
              </div>
              <button
                onClick={toggleAutoCrawl}
                className={cn(
                  'flex items-center px-4 py-2 rounded-lg font-medium transition-colors',
                  config.autoImport
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                )}
              >
                {config.autoImport ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Stop Auto Import
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Auto Import
                  </>
                )}
              </button>
            </div>

            {config.autoImport && (
              <div className="ml-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-200 text-sm">
                    Auto import is running. Next check in ~6 hours.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Manual Import */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Manual Import</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Import statements from the last 30 days
                </p>
              </div>
              <button
                onClick={handleManualImport}
                disabled={isProcessing || !config.enabled}
                className={cn(
                  theme.btnPrimary,
                  'flex items-center',
                  (isProcessing || !config.enabled) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Download className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Import Now'}
              </button>
            </div>

            {lastImportResult && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  Last import: Processed {lastImportResult.processed} emails,
                  imported {lastImportResult.transactions} transactions
                </p>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced Settings
            </button>

            {showAdvanced && (
              <div className="ml-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Last Processed Date
                  </label>
                  <input
                    type="date"
                    value={config.lastProcessedDate.split('T')[0]}
                    onChange={(e) => handleConfigChange('lastProcessedDate', new Date(e.target.value).toISOString())}
                    className="input-field theme-input"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Only emails after this date will be processed
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Setup Instructions */}
      {!config.enabled && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Setup Required
              </h4>
              <ol className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1 list-decimal list-inside">
                <li>Create Google OAuth credentials in Google Cloud Console</li>
                <li>Enable Gmail API for your project</li>
                <li>Add your domain to authorized origins</li>
                <li>Enter your Client ID and Secret above</li>
                <li>Test the connection and authorize access</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GmailImportSettings;