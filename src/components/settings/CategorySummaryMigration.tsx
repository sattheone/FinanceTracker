import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { rebuildCategorySummaries, rebuildOptimizedMonthlySummaries } from '../../services/categorySummaryService';

const CategorySummaryMigration: React.FC = () => {
  const { user } = useAuth();
  const { transactions } = useData();
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleRebuild = async () => {
    if (!user?.id) {
      setStatus('error');
      setMessage('User not authenticated');
      return;
    }

    if (!window.confirm('This will rebuild all category summaries from your existing transactions. Continue?')) {
      return;
    }

    setIsRebuilding(true);
    setStatus('idle');
    setMessage('');

    try {
      console.log('Starting category summary rebuild...');
      // Rebuild both old and optimized structures
      await Promise.all([
        rebuildCategorySummaries(user.id, transactions),
        rebuildOptimizedMonthlySummaries(user.id, transactions)
      ]);
      setStatus('success');
      setMessage(`Successfully rebuilt summaries for ${transactions.length} transactions`);
      console.log('Category summary rebuild completed successfully');
    } catch (error) {
      console.error('Failed to rebuild category summaries:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <div className="p-4 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/20">
      <div className="flex items-start mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
            Rebuild Category Summaries
          </h4>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            One-time migration to rebuild monthly category summaries for better performance.
            This will process all {transactions.length} transactions.
          </p>
        </div>
      </div>

      {status === 'success' && (
        <div className="flex items-center p-3 mb-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center p-3 mb-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-sm">
          <XCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <button
        onClick={handleRebuild}
        disabled={isRebuilding || transactions.length === 0}
        className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isRebuilding ? 'animate-spin' : ''}`} />
        {isRebuilding ? 'Rebuilding...' : 'Rebuild Summaries'}
      </button>

      {transactions.length === 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
          No transactions to process
        </p>
      )}
    </div>
  );
};

export default CategorySummaryMigration;
