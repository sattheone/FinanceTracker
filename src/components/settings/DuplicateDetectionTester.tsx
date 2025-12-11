import React, { useState } from 'react';
import { Play, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import duplicateDetectionService from '../../services/duplicateDetectionService';
import { Transaction } from '../../types';

const DuplicateDetectionTester: React.FC = () => {
  const theme = useThemeClasses();
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async () => {
    setIsRunning(true);
    
    // Sample test data
    const existingTransactions: Transaction[] = [
      {
        id: '1',
        date: '2024-01-15',
        amount: 1000,
        description: 'Grocery Store Purchase',
        type: 'expense',
        category: 'Food & Dining',
        bankAccountId: 'acc1'
      },
      {
        id: '2',
        date: '2024-01-16',
        amount: 2500,
        description: 'Salary Credit',
        type: 'income',
        category: 'Salary',
        bankAccountId: 'acc1'
      }
    ];

    const testTransactions: Transaction[] = [
      {
        id: '3',
        date: '2024-01-15',
        amount: 1000,
        description: 'Grocery Store Purchase', // Exact duplicate (100% confidence)
        type: 'expense',
        category: 'Food & Dining',
        bankAccountId: 'acc1'
      },
      {
        id: '4',
        date: '2024-01-16',
        amount: 2500.50, // Very similar (96% confidence)
        description: 'Salary Credit - Monthly',
        type: 'income',
        category: 'Salary',
        bankAccountId: 'acc1'
      },
      {
        id: '5',
        date: '2024-01-17',
        amount: 1050, // Similar but different (85% confidence)
        description: 'Grocery Store',
        type: 'expense',
        category: 'Food & Dining',
        bankAccountId: 'acc1'
      },
      {
        id: '6',
        date: '2024-01-20',
        amount: 500,
        description: 'Coffee Shop', // Completely different (0% confidence)
        type: 'expense',
        category: 'Food & Dining',
        bankAccountId: 'acc1'
      }
    ];

    // Get current settings
    const settings = JSON.parse(localStorage.getItem('duplicateDetectionSettings') || '{"enabled": true, "smartMode": true, "strictMode": false}');
    
    // Test with current settings
    const useSmartMode = settings.smartMode && !settings.strictMode;
    
    const results = {
      settings,
      individual: testTransactions.map(transaction => {
        const result = duplicateDetectionService.checkDuplicate(transaction, existingTransactions);
        return {
          transaction,
          confidence: result.confidence,
          isDuplicate: result.isDuplicate,
          wouldBeBlocked: settings.enabled && (
            useSmartMode ? result.confidence >= 98 : 
            settings.strictMode ? result.confidence >= 90 : 
            result.confidence >= 95
          )
        };
      }),
      bulk: settings.enabled ? duplicateDetectionService.checkBulkDuplicates(testTransactions, existingTransactions, useSmartMode) : null
    };

    setTestResults(results);
    setIsRunning(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 98) return 'text-red-600 dark:text-red-400';
    if (confidence >= 95) return 'text-orange-600 dark:text-orange-400';
    if (confidence >= 85) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 98) return <XCircle className="w-4 h-4" />;
    if (confidence >= 95) return <AlertTriangle className="w-4 h-4" />;
    if (confidence >= 85) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className={cn(theme.bgBlue, "p-4 rounded-lg border")}>
        <h3 className={cn(theme.textBlue, "font-semibold mb-2")}>
          Test Your Duplicate Detection Settings
        </h3>
        <p className={cn(theme.textBlueSecondary, "text-sm mb-4")}>
          Run a test to see how your current settings would handle different types of transactions.
        </p>
        <button
          onClick={runTest}
          disabled={isRunning}
          className={cn(
            "flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors",
            isRunning && "opacity-50 cursor-not-allowed"
          )}
        >
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? 'Running Test...' : 'Run Test'}
        </button>
      </div>

      {testResults && (
        <div className="space-y-6">
          {/* Current Settings */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Current Settings</h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <p>• Duplicate Detection: {testResults.settings.enabled ? 'Enabled' : 'Disabled'}</p>
              {testResults.settings.enabled && (
                <>
                  <p>• Mode: {testResults.settings.smartMode ? 'Smart Mode (98% threshold)' : testResults.settings.strictMode ? 'Strict Mode (90% threshold)' : 'Standard Mode (95% threshold)'}</p>
                  <p>• File Warnings: {testResults.settings.showFileWarnings ? 'Enabled' : 'Disabled'}</p>
                </>
              )}
            </div>
          </div>

          {/* Individual Transaction Results */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Individual Transaction Analysis</h4>
            <div className="space-y-3">
              {testResults.individual.map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {result.transaction.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {result.transaction.date} • ₹{result.transaction.amount}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={cn("flex items-center space-x-1", getConfidenceColor(result.confidence))}>
                      {getConfidenceIcon(result.confidence)}
                      <span className="text-sm font-medium">{result.confidence}%</span>
                    </div>
                    <div className="text-sm">
                      {result.wouldBeBlocked ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded text-xs">
                          Would Block
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded text-xs">
                          Would Import
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bulk Import Summary */}
          {testResults.bulk && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Bulk Import Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Total</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{testResults.bulk.totalTransactions}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Would Import</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">{testResults.bulk.newTransactions}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Would Block</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">{testResults.bulk.duplicateTransactions}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Warning</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {testResults.bulk.duplicateTransactions > 0 ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!testResults.settings.enabled && (
            <div className={cn(theme.bgYellow, "p-4 rounded-lg border")}>
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className={cn(theme.textYellow, "font-medium mb-1")}>Duplicate Detection Disabled</h4>
                  <p className={cn(theme.textYellowSecondary, "text-sm")}>
                    All transactions would be imported without checking for duplicates. 
                    This might result in duplicate entries in your transaction history.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DuplicateDetectionTester;