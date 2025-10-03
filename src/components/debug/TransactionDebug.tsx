import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const TransactionDebug: React.FC = () => {
  const { addTransaction, transactions, bankAccounts } = useData();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleTestTransaction = async () => {
    setIsAdding(true);
    setLastError(null);
    
    try {
      console.log('🔍 Debug Info:');
      console.log('User:', user);
      console.log('Bank Accounts:', bankAccounts);
      console.log('Current Transactions Count:', transactions.length);
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      if (bankAccounts.length === 0) {
        throw new Error('No bank accounts available');
      }
      
      const testTransaction = {
        date: new Date().toISOString().split('T')[0],
        description: 'Test Transaction - Debug',
        category: 'Other Expense',
        type: 'expense' as const,
        amount: 100,
        paymentMethod: 'Cash',
        bankAccountId: bankAccounts[0].id,
      };
      
      console.log('Adding transaction:', testTransaction);
      
      await addTransaction(testTransaction);
      
      console.log('✅ Transaction added successfully!');
      console.log('New Transactions Count:', transactions.length + 1);
      
    } catch (error) {
      console.error('❌ Error adding transaction:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-medium text-yellow-800 mb-3">Transaction Debug Panel</h3>
      
      <div className="space-y-2 text-sm text-yellow-700 mb-4">
        <p><strong>User:</strong> {user ? user.email : 'Not authenticated'}</p>
        <p><strong>Bank Accounts:</strong> {bankAccounts.length}</p>
        <p><strong>Current Transactions:</strong> {transactions.length}</p>
        {bankAccounts.length > 0 && (
          <p><strong>Default Account:</strong> {bankAccounts[0].bank} ({bankAccounts[0].number})</p>
        )}
      </div>
      
      {lastError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-4">
          <strong>Error:</strong> {lastError}
        </div>
      )}
      
      <button
        onClick={handleTestTransaction}
        disabled={isAdding || !user || bankAccounts.length === 0}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAdding ? 'Adding Test Transaction...' : 'Add Test Transaction'}
      </button>
      
      <div className="mt-4 text-xs text-yellow-600">
        <p>This will add a test transaction to help debug the issue.</p>
        <p>Check the browser console for detailed logs.</p>
      </div>
    </div>
  );
};

export default TransactionDebug;