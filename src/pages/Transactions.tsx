import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Camera, Edit3, Trash2, FileSpreadsheet, CheckSquare, Square, Tag, Type, CreditCard, TrendingUp, TrendingDown, BarChart3, ChevronDown, Link2 } from 'lucide-react';
import { Transaction, BankAccount } from '../types';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import ImageUploader from '../components/common/ImageUploader';
import FileUploader from '../components/common/FileUploader';
import DataConfirmationDialog from '../components/common/DataConfirmationDialog';
import Modal from '../components/common/Modal';
import TransactionForm from '../components/forms/TransactionForm';
import BankAccountForm from '../components/forms/BankAccountForm';
import TransactionDetailModal from '../components/transactions/TransactionDetailModal';
import { ParsedTransaction } from '../services/excelParser';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';

const Transactions: React.FC = () => {
  const { 
    transactions, 
    addTransaction, 
    addTransactionsBulk, 
    updateTransaction, 
    deleteTransaction,
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,

  } = useData();
  
  const theme = useThemeClasses();
  
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showBankAccountForm, setShowBankAccountForm] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'category' | 'type' | 'delete' | null>(null);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkType, setBulkType] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(bankAccounts[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedTransactionMonth, setSelectedTransactionMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('summary');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);

  // Handle category filtering from URL params (from dashboard navigation)
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSearchTerm(categoryParam);
      setActiveTab('transactions');
    }
  }, [searchParams]);

  // Update selected account when bank accounts change
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(bankAccounts[0].id);
    } else if (bankAccounts.length > 0 && !bankAccounts.find(acc => acc.id === selectedAccount)) {
      setSelectedAccount(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedAccount]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || transaction.type === filterType;
      
      // Filter by selected month and bank account for transactions tab
      if (activeTab === 'transactions') {
        const transactionDate = new Date(transaction.date);
        const [year, month] = selectedTransactionMonth.split('-');
        const matchesMonth = transactionDate.getFullYear() === parseInt(year) && 
                           transactionDate.getMonth() === parseInt(month) - 1;
        const matchesAccount = transaction.bankAccountId === selectedAccount;
        return matchesSearch && matchesFilter && matchesMonth && matchesAccount;
      }
      
      // For summary tab, also filter by selected account
      const matchesAccount = transaction.bankAccountId === selectedAccount;
      return matchesSearch && matchesFilter && matchesAccount;
    });
  }, [transactions, searchTerm, filterType, activeTab, selectedTransactionMonth]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600 bg-green-50';
      case 'expense': return 'text-red-600 bg-red-50';
      case 'investment': return 'text-blue-600 bg-blue-50';
      case 'insurance': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleImageAnalyzed = (data: any[]) => {
    setExtractedData(data);
    setShowImageUploader(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmData = (confirmedData: any[]) => {
    const transactionsToAdd = confirmedData.map(transaction => ({
      date: transaction.date,
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      amount: transaction.amount,
      bankAccountId: selectedAccount, // Add to currently selected account
    }));
    
    // Use bulk import for better performance
    addTransactionsBulk(transactionsToAdd);
    setShowConfirmDialog(false);
    setExtractedData([]);
  };

  const handleFileTransactionsParsed = (transactions: ParsedTransaction[]) => {
    setExtractedData(transactions);
    setShowFileUploader(false);
    setShowConfirmDialog(true);
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionForm(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionForm(true);
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransactionForDetail(transaction);
    setShowDetailModal(true);
  };

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedTransactionForDetail(null);
  };

  const handleTransactionUpdate = (updatedTransaction: Transaction) => {
    // The transaction is already updated in the modal, just refresh the view
    setSelectedTransactionForDetail(updatedTransaction);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(transactionId);
    }
  };

  const handleTransactionSubmit = async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, transactionData);
      } else {
        await addTransaction(transactionData);
      }
      setShowTransactionForm(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error in handleTransactionSubmit:', error);
    }
  };

  const handleTransactionCancel = () => {
    setShowTransactionForm(false);
    setEditingTransaction(null);
  };

  // Bank Account Handlers
  const handleAddBankAccount = () => {
    setEditingBankAccount(null);
    setShowBankAccountForm(true);
  };



  const handleBankAccountSubmit = (accountData: Omit<BankAccount, 'id'>) => {
    if (editingBankAccount) {
      updateBankAccount(editingBankAccount.id, accountData);
    } else {
      addBankAccount(accountData);
    }
    setShowBankAccountForm(false);
    setEditingBankAccount(null);
  };

  const handleBankAccountCancel = () => {
    setShowBankAccountForm(false);
    setEditingBankAccount(null);
  };

  const handleEditBankAccount = (account: BankAccount) => {
    setEditingBankAccount(account);
    setShowBankAccountForm(true);
  };

  const handleDeleteBankAccount = (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this bank account? This action cannot be undone.')) {
      deleteBankAccount(accountId);
      // If we're deleting the currently selected account, switch to the first available account
      if (selectedAccount === accountId && bankAccounts.length > 1) {
        const remainingAccounts = bankAccounts.filter(acc => acc.id !== accountId);
        setSelectedAccount(remainingAccounts[0].id);
      }
    }
  };

  // Bulk Actions Handlers
  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTransactions.size} transactions?`)) {
      selectedTransactions.forEach(id => deleteTransaction(id));
      setSelectedTransactions(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkCategoryChange = () => {
    if (bulkCategory) {
      selectedTransactions.forEach(id => {
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
          updateTransaction(id, { ...transaction, category: bulkCategory });
        }
      });
      setSelectedTransactions(new Set());
      setShowBulkActions(false);
      setBulkCategory('');
    }
  };

  const handleBulkTypeChange = () => {
    if (bulkType) {
      selectedTransactions.forEach(id => {
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
          updateTransaction(id, { ...transaction, type: bulkType as any });
        }
      });
      setSelectedTransactions(new Set());
      setShowBulkActions(false);
      setBulkType('');
    }
  };

  const getExpenseCategories = () => [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
    'Healthcare', 'Education', 'Travel', 'Groceries', 'Fuel', 'Insurance', 'Investment',
    'Cash Withdrawal', 'Transfer', 'Loan/EMI', 'Other Expense'
  ];

  const getIncomeCategories = () => [
    'Salary', 'Business Income', 'Investment Returns', 'Interest', 'Dividend', 
    'Freelance', 'Rental Income', 'Bonus', 'Refund', 'Gift', 'Other Income'
  ];

  const getAllCategories = () => [
    ...getExpenseCategories(),
    ...getIncomeCategories(),
    'Mutual Fund', 'Stocks', 'FD', 'Gold', 'Crypto', 'Other Investment',
    'Life Insurance', 'Health Insurance', 'Vehicle Insurance', 'Other Insurance'
  ];



  const currentAccount = bankAccounts.find(acc => acc.id === selectedAccount) || bankAccounts[0] || null;

  // Calculate account-specific balance based on transactions
  const accountTransactions = transactions.filter(t => 
    t.bankAccountId === selectedAccount
  );
  
  const totalIncome = accountTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = accountTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  // Show the user-set balance as the current balance
  const calculatedBalance = currentAccount ? currentAccount.balance : 0;

  // Generate month options for the last 12 months
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 24; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      options.push({
        value: `${year}-${month}`,
        label: monthName
      });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Calculate 6-month data for chart
  const getSixMonthData = useMemo(() => {
    const data = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const matchesMonth = transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
        const matchesAccount = t.bankAccountId === selectedAccount;
        return matchesMonth && matchesAccount;
      });
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        income,
        expenses,
        net: income - expenses
      });
    }
    
    return data;
  }, [transactions, selectedAccount]);

  // Filter transactions for current month and selected account
  const currentMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const [year, month] = selectedMonth.split('-');
    const matchesMonth = transactionDate.getFullYear() === parseInt(year) && 
                        transactionDate.getMonth() === parseInt(month) - 1;
    const matchesAccount = t.bankAccountId === selectedAccount;
    return matchesMonth && matchesAccount;
  });

  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeCount = currentMonthTransactions.filter(t => t.type === 'income').length;
  const expenseCount = currentMonthTransactions.filter(t => t.type === 'expense').length;

  // If no bank accounts exist, show empty state
  if (bankAccounts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="text-gray-400 mb-6">
              <CreditCard className="h-24 w-24 mx-auto" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">No Bank Accounts</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              You need to add at least one bank account to start tracking your transactions and managing your finances.
            </p>
            <button
              onClick={handleAddBankAccount}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Bank Account
            </button>
          </div>
        </div>
        
        {/* Bank Account Form Modal */}
        <Modal
          isOpen={showBankAccountForm}
          onClose={handleBankAccountCancel}
          title="Add Your First Bank Account"
          size="lg"
        >
          <BankAccountForm
            onSubmit={handleBankAccountSubmit}
            onCancel={handleBankAccountCancel}
          />
        </Modal>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900">
      {/* Top Bank Account Selector */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounts</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImageUploader(true)}
              className="flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100"
              disabled={!currentAccount}
            >
              <Camera className="h-4 w-4 mr-2" />
              Screenshot
            </button>
            <button
              onClick={() => setShowFileUploader(true)}
              className="flex items-center px-3 py-2 text-sm bg-green-50 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100"
              disabled={!currentAccount}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import
            </button>
            <button
              onClick={handleAddTransaction}
              className="flex items-center px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              disabled={!currentAccount}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </button>
          </div>
        </div>
        
        {/* Horizontal Scrollable Account Pills */}
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {bankAccounts.map((account) => (
            <div key={account.id} className="relative group">
              <button
                onClick={() => setSelectedAccount(account.id)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl border-2 transition-all whitespace-nowrap min-w-fit ${
                  selectedAccount === account.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{account.logo}</span>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{account.bank}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{account.number}</div>
                </div>
              </button>
              
              {/* Edit/Delete buttons - show on hover */}
              <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditBankAccount(account);
                  }}
                  className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 text-xs"
                  title="Edit Account"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                {bankAccounts.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBankAccount(account.id);
                    }}
                    className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 text-xs"
                    title="Delete Account"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button 
            onClick={handleAddBankAccount}
            className="flex items-center justify-center w-12 h-12 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-xl hover:border-gray-400 transition-colors min-w-fit"
            title="Add Bank Account"
          >
            <Plus className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Dark Account Balance Card */}
        {currentAccount && (
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{currentAccount.logo}</span>
                <div>
                  <h2 className="text-lg font-semibold">{currentAccount.bank}</h2>
                  <p className="text-gray-300 text-sm">{currentAccount.number}</p>
                </div>
              </div>
              <CreditCard className="h-8 w-8 text-gray-300" />
            </div>
            <div>
              <p className="text-gray-300 text-sm mb-2">Current Balance</p>
              <p className="text-4xl font-bold">{formatCurrency(calculatedBalance)}</p>
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Account Statistics */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600 dark:border-gray-600">
            <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">Account Overview</h3>
          </div>
          {accountTransactions.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-400 mb-4">
                <CreditCard className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Start tracking your finances by adding your first transaction to this account
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleAddTransaction}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </button>
                <button
                  onClick={() => setShowImageUploader(true)}
                  className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Import from Screenshot
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Income</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{accountTransactions.filter(t => t.type === 'income').length} transactions</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpenses)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Expenses</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{accountTransactions.filter(t => t.type === 'expense').length} transactions</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Net Flow</p>
                    <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalIncome - totalExpenses >= 0 ? '+' : ''}{formatCurrency(totalIncome - totalExpenses)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tab Section */}
        <div className="card">
          <div className="border-b border-gray-200 dark:border-gray-600 dark:border-gray-600">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'summary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Account Summary
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All Transactions
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'summary' ? (
              <div className="space-y-6">
                {/* Month/Year Dropdown */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Overview</h3>
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-4 py-2 pr-10 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 appearance-none"
                    >
                      {monthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Transactions and Expense Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Money In Card */}
                  <div className="card">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Money In</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{incomeCount} transactions</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(monthlyIncome)}</p>
                  </div>

                  {/* Money Out Card */}
                  <div className="card">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 dark:bg-gray-700 rounded-lg">
                        <TrendingDown className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Money Out</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{expenseCount} transactions</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">{formatCurrency(monthlyExpenses)}</p>
                  </div>
                </div>

                {/* 6-Month Comparison Chart */}
                <div className="card">
                  <div className="flex items-center space-x-2 mb-6">
                    <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-300 dark:text-gray-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">6-Month Money Flow Comparison</h4>
                    {currentAccount && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">({currentAccount.bank})</span>
                    )}
                  </div>
                  
                  {!currentAccount || getSixMonthData.every(d => d.income === 0 && d.expenses === 0) ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <BarChart3 className="h-16 w-16 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No data available</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        {!currentAccount 
                          ? 'No bank account selected' 
                          : 'No transaction data available for the last 6 months for this account'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Chart */}
                      <div className="relative">
                        <div className="flex items-end justify-between space-x-2 h-48">
                          {getSixMonthData.map((monthData, index) => {
                            const maxAmount = Math.max(
                              ...getSixMonthData.map(d => Math.max(d.income, d.expenses))
                            );
                            const incomeHeight = maxAmount > 0 ? (monthData.income / maxAmount) * 100 : 0;
                            const expenseHeight = maxAmount > 0 ? (monthData.expenses / maxAmount) * 100 : 0;
                            
                            return (
                              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                                <div className="w-full flex justify-center space-x-1 h-40">
                                  {/* Income Bar */}
                                  <div className="flex flex-col justify-end w-6">
                                    <div
                                      className="bg-green-500 rounded-t transition-all duration-500 min-h-[4px]"
                                      style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                                      title={`Income: ${formatCurrency(monthData.income)}`}
                                    ></div>
                                  </div>
                                  {/* Expense Bar */}
                                  <div className="flex flex-col justify-end w-6">
                                    <div
                                      className="bg-red-500 rounded-t transition-all duration-500 min-h-[4px]"
                                      style={{ height: `${Math.max(expenseHeight, 2)}%` }}
                                      title={`Expenses: ${formatCurrency(monthData.expenses)}`}
                                    ></div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                  {monthData.month}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Legend */}
                      <div className="flex items-center justify-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Money In</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Money Out</span>
                        </div>
                      </div>
                      
                      {/* Current Month Summary */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">This Month In</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(monthlyIncome)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">This Month Out</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(monthlyExpenses)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Net Flow</p>
                            <p className={`text-lg font-bold ${monthlyIncome - monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(monthlyIncome - monthlyExpenses)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Month Filter and Search */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Month:</span>
                    <div className="relative">
                      <select
                        value={selectedTransactionMonth}
                        onChange={(e) => setSelectedTransactionMonth(e.target.value)}
                        className="px-3 py-2 pr-8 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 appearance-none text-sm"
                      >
                        {monthOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="investment">Investment</option>
                      <option value="insurance">Insurance</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedTransactions.size > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-blue-900">
                          {selectedTransactions.size} transaction{selectedTransactions.size > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setBulkActionType('category');
                              setShowBulkActions(true);
                            }}
                            className="btn-secondary flex items-center"
                          >
                            <Tag className="w-4 h-4 mr-1" />
                            Change Category
                          </button>
                          <button
                            onClick={() => {
                              setBulkActionType('type');
                              setShowBulkActions(true);
                            }}
                            className="btn-secondary flex items-center"
                          >
                            <Type className="w-4 h-4 mr-1" />
                            Change Type
                          </button>
                          <button
                            onClick={handleBulkDelete}
                            className="flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete Selected
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTransactions(new Set())}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction Count */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} for {monthOptions.find(m => m.value === selectedTransactionMonth)?.label}
                  </div>
                </div>

                {/* Transactions List */}
                <div className="card overflow-hidden">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <BarChart3 className="h-12 w-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions found</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        No transactions found for {monthOptions.find(m => m.value === selectedTransactionMonth)?.label}
                      </p>
                      <button
                        onClick={handleAddTransaction}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Transaction
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th className={cn(theme.tableHeader, 'w-12')}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectAll();
                                }}
                                className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200 p-1"
                              >
                                {selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0 ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </th>
                            <th className={theme.tableHeader}>
                              Date
                            </th>
                            <th className={theme.tableHeader}>
                              Description
                            </th>
                            <th className={cn(theme.tableHeader, 'w-16 text-center')}>
                              Links
                            </th>
                            <th className={theme.tableHeader}>
                              Category
                            </th>
                            <th className={theme.tableHeader}>
                              Type
                            </th>
                            <th className={cn(theme.tableHeader, 'text-right')}>
                              Amount
                            </th>
                            <th className={cn(theme.tableHeader, 'text-right')}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.map((transaction) => (
                            <tr 
                              key={transaction.id} 
                              onClick={() => handleTransactionClick(transaction)}
                              className={cn(
                                theme.tableRow,
                                'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700',
                                selectedTransactions.has(transaction.id) && 'bg-blue-50 dark:bg-blue-900/30'
                              )}
                            >
                              <td className={theme.tableCell}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectTransaction(transaction.id);
                                  }}
                                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200 p-1"
                                >
                                  {selectedTransactions.has(transaction.id) ? (
                                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                              <td className={cn(theme.tableCell, 'whitespace-nowrap text-sm')}>
                                <span className={theme.textPrimary}>{formatDate(transaction.date)}</span>
                              </td>
                              <td className={cn(theme.tableCell, 'text-sm font-medium max-w-xs truncate')} title={transaction.description}>
                                <span className={theme.textPrimary}>{transaction.description}</span>
                              </td>
                              <td className={cn(theme.tableCell, 'text-center')}>
                                {transaction.isLinked ? (
                                  <div className="flex items-center justify-center space-x-1">
                                    <Link2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    {transaction.autoLinked && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full" title="Auto-linked"></span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 border border-gray-300 dark:border-gray-600 rounded opacity-30" title="Not linked"></div>
                                )}
                              </td>
                              <td className={cn(theme.tableCell, 'whitespace-nowrap text-sm')}>
                                <span className={theme.textSecondary}>{transaction.category}</span>
                              </td>
                              <td className={cn(theme.tableCell, 'whitespace-nowrap')}>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(transaction.type)}`}>
                                  {transaction.type}
                                </span>
                              </td>
                              <td className={cn(theme.tableCell, 'whitespace-nowrap text-sm text-right font-medium')}>
                                <span className={transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                </span>
                              </td>
                              <td className={cn(theme.tableCell, 'whitespace-nowrap text-right text-sm font-medium')}>
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTransaction(transaction);
                                    }}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 p-1"
                                    title="Edit Transaction"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTransaction(transaction.id);
                                    }}
                                    className="text-red-600 dark:text-red-400 hover:text-red-900 p-1"
                                    title="Delete Transaction"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Modal */}
      {showBulkActions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-200 dark:border-gray-600 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
              {bulkActionType === 'category' ? 'Change Category' : 'Change Type'} for {selectedTransactions.size} transactions
            </h3>
            
            {bulkActionType === 'category' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Select New Category</label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category...</option>
                  {getAllCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}

            {bulkActionType === 'type' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Select New Type</label>
                <select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a type...</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="investment">Investment</option>
                  <option value="insurance">Insurance</option>
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowBulkActions(false);
                  setBulkActionType(null);
                  setBulkCategory('');
                  setBulkType('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={bulkActionType === 'category' ? handleBulkCategoryChange : handleBulkTypeChange}
                disabled={bulkActionType === 'category' ? !bulkCategory : !bulkType}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Image Uploader Modal */}
      <Modal
        isOpen={showImageUploader}
        onClose={() => setShowImageUploader(false)}
        title="Add Transactions from Screenshot"
        size="lg"
      >
        <ImageUploader
          onImageAnalyzed={handleImageAnalyzed}
          analyzeFunction={async (file: File) => {
            const { aiService } = await import('../services/aiService');
            return aiService.extractTransactionsFromImage(file);
          }}
          title="Upload Bank Statement Screenshot"
          description="Upload a screenshot of your bank statement, payment receipt, or transaction history. Our AI will automatically extract transaction details."
        />
      </Modal>

      {/* File Uploader Modal */}
      <Modal
        isOpen={showFileUploader}
        onClose={() => setShowFileUploader(false)}
        title="Upload Bank Statement File"
        size="lg"
      >
        <FileUploader
          onTransactionsParsed={handleFileTransactionsParsed}
          title="Upload Excel or CSV Bank Statement"
          description="Upload your bank statement in Excel (.xlsx, .xls) or CSV format. The system will automatically parse and extract all transactions."
        />
      </Modal>

      {/* Transaction Form Modal */}
      <Modal
        isOpen={showTransactionForm}
        onClose={handleTransactionCancel}
        title={editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
        size="lg"
      >
        <TransactionForm
          transaction={editingTransaction || undefined}
          onSubmit={handleTransactionSubmit}
          onCancel={handleTransactionCancel}
          defaultBankAccountId={selectedAccount}
        />
      </Modal>

      {/* Bank Account Form Modal */}
      <Modal
        isOpen={showBankAccountForm}
        onClose={handleBankAccountCancel}
        title={editingBankAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
        size="lg"
      >
        <BankAccountForm
          account={editingBankAccount || undefined}
          onSubmit={handleBankAccountSubmit}
          onCancel={handleBankAccountCancel}
        />
      </Modal>

      {/* Confirmation Dialog */}
      <DataConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmData}
        data={extractedData}
        type="transactions"
        title="Confirm Extracted Transactions"
      />

      {/* Transaction Detail Modal */}
      {selectedTransactionForDetail && (
        <TransactionDetailModal
          transaction={selectedTransactionForDetail}
          isOpen={showDetailModal}
          onClose={handleDetailModalClose}
          onUpdate={handleTransactionUpdate}
        />
      )}
    </div>
  );
};

export default Transactions;