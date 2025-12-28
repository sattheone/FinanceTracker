import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Camera, Edit3, Trash2, FileSpreadsheet, Tag, Type, CreditCard, TrendingUp, TrendingDown, BarChart3, ChevronDown } from 'lucide-react';
import { Transaction, BankAccount } from '../types';
import SIPRuleService from '../services/sipRuleService';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/formatters';

import ImageUploader from '../components/common/ImageUploader';
import FileUploader from '../components/common/FileUploader';
import DataConfirmationDialog from '../components/common/DataConfirmationDialog';
import DuplicateConfirmationDialog from '../components/common/DuplicateConfirmationDialog';
import Modal from '../components/common/Modal';

import BankAccountForm from '../components/forms/BankAccountForm';
import SimpleTransactionForm, { SimpleTransactionFormHandle } from '../components/forms/SimpleTransactionForm';
import SimpleTransactionModal from '../components/transactions/SimpleTransactionModal';
import TransactionTable from '../components/transactions/TransactionTable';
import SidePanel from '../components/common/SidePanel';
import Button from '../components/common/Button';
import InlineCategoryEditor from '../components/transactions/InlineCategoryEditor';
import TransactionListModal from '../components/transactions/TransactionListModal';
import AutoCategorizationService from '../services/autoCategorization';
import CategoryMigrationService from '../services/categoryMigration';
import { ParsedTransaction } from '../services/excelParser';
// import { useThemeClasses } from '../hooks/useThemeClasses'; // Unused
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import CategoryBreakdownOverlay from '../components/transactions/CategoryBreakdownOverlay';
import TransactionListOverlay from '../components/transactions/TransactionListOverlay';
import RulePrompt from '../components/transactions/RulePrompt';
import RuleCreationDialog from '../components/transactions/RuleCreationDialog';
import TransactionContextMenu from '../components/transactions/TransactionContextMenu';
import { RecurringTransaction } from '../types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

const Transactions: React.FC = () => {
  const {
    transactions,
    updateTransaction,
    deleteTransaction,
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addCategoryRule,
    categories,
    sipRules,
    categoryRules,
    addRecurringTransaction,
    addTransaction,
    addTransactionsBulk
  } = useData();

  const formRef = useRef<SimpleTransactionFormHandle>(null);


  // const navigate = useNavigate(); // Remove unused navigate
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; transaction: Transaction } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, transaction: Transaction) => {
    e.preventDefault();
    console.log('Right click detected on:', transaction.id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      transaction
    });
  };

  const handleMakeRecurring = async (transaction: Transaction) => {
    // Simple prompt for MVP
    if (window.confirm(`Create a monthly recurring transaction for "${transaction.description}"?`)) {
      const recurring: Omit<RecurringTransaction, 'id'> = {
        name: transaction.description,
        description: transaction.description,
        category: transaction.category,
        type: transaction.type,
        amount: transaction.amount,
        frequency: 'monthly',
        startDate: transaction.date,
        nextDueDate: transaction.date, // Should calculate next month? Or just start now? usually next month if this one is done. Let's say same day next month.
        isActive: true,
        bankAccountId: transaction.bankAccountId,
        reminderDays: 3,
        autoCreate: true,
        tags: transaction.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Calculate next due date (1 month from transaction date)
      const txDate = new Date(transaction.date);
      txDate.setMonth(txDate.getMonth() + 1);
      recurring.nextDueDate = txDate.toISOString().split('T')[0];

      await addRecurringTransaction(recurring);
      alert('Recurring transaction created!');
    }
  };

  const handleOpenSingleBulkAction = (transaction: Transaction, type: 'category' | 'type') => {
    setSelectedTransactions(new Set([transaction.id]));
    setBulkActionType(type);
    setShowBulkActions(true);
  };

  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  // Removed transaction form - using inline editing and import workflow
  const [showBankAccountForm, setShowBankAccountForm] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'category' | 'type' | 'delete' | null>(null);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkType, setBulkType] = useState<'income' | 'expense' | 'investment' | 'insurance' | ''>('');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateSummary, setDuplicateSummary] = useState<any>(null);
  const [pendingImportData, setPendingImportData] = useState<any[]>([]);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'transaction' | 'account' | 'bulk', id?: string, count?: number } | null>(null);
  const [selectedAccount, setSelectedAccount] = useState(() => {
    if (bankAccounts.length > 1) {
      return 'all_accounts';
    }
    return bankAccounts[0]?.id || '';
  });
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
  const [showTransactionListModal, setShowTransactionListModal] = useState(false);
  const [transactionListModalData, setTransactionListModalData] = useState<{
    transactions: Transaction[];
    title: string;
    subtitle?: string;
  }>({ transactions: [], title: '' });

  const [showBreakdownOverlay, setShowBreakdownOverlay] = useState(false);
  const [breakdownData, setBreakdownData] = useState<{ name: string; value: number }[]>([]);
  const [breakdownTitle, setBreakdownTitle] = useState('');
  const [breakdownType, setBreakdownType] = useState<'income' | 'expense' | 'investment'>('expense');
  const [breakdownTotal, setBreakdownTotal] = useState(0);
  const [breakdownMonthFilter, setBreakdownMonthFilter] = useState<{ year: number; month: number } | null>(null);

  const [showTransactionListOverlay, setShowTransactionListOverlay] = useState(false);
  const [transactionListData, setTransactionListData] = useState<Transaction[]>([]);
  const [transactionListTitle, setTransactionListTitle] = useState('');
  const [transactionListSubtitle, setTransactionListSubtitle] = useState('');
  const [viewingContextId, setViewingContextId] = useState<string | null>(null);
  const [pieChartType, setPieChartType] = useState<'income' | 'expense'>('expense');

  // Rule creation state
  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [rulePromptData, setRulePromptData] = useState<{
    transaction: Transaction;
    newCategoryId?: string;
    newCategoryName?: string;
    newType?: Transaction['type'];
    newTypeName?: string;
  } | null>(null);
  const [showRuleDialog, setShowRuleDialog] = useState(false);

  // Handler for category changes with rule prompt
  const handleCategoryChangeWithRulePrompt = (transaction: Transaction, newCategoryId: string) => {
    const oldCategoryId = transaction.category;

    // Update the transaction
    updateTransaction(transaction.id, { category: newCategoryId });

    // Show rule prompt if category actually changed
    if (oldCategoryId !== newCategoryId) {
      const category = categories.find(c => c.id === newCategoryId);
      if (category) {
        setRulePromptData({
          transaction,
          newCategoryId,
          newCategoryName: category.name
        });
        setShowRulePrompt(true);
      }
    }
  };

  const handleTypeChangeWithRulePrompt = (transaction: Transaction, newType: Transaction['type']) => {
    // Update the transaction
    updateTransaction(transaction.id, { type: newType });

    // Show rule prompt if type actually changed
    if (transaction.type !== newType) {
      setRulePromptData({
        transaction,
        newType,
        newTypeName: newType.charAt(0).toUpperCase() + newType.slice(1)
      });
      setShowRulePrompt(true);
    }
  };

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
    } else if (bankAccounts.length > 0 && selectedAccount === 'all_accounts' && bankAccounts.length <= 1) {
      setSelectedAccount(bankAccounts[0].id);
    } else if (bankAccounts.length > 0 && selectedAccount !== 'all_accounts' && !bankAccounts.find(acc => acc.id === selectedAccount)) {
      setSelectedAccount(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedAccount]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = (transaction.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof transaction.category === 'string' ? transaction.category : '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || transaction.type === filterType;

      // Filter by selected month and bank account for transactions tab
      if (activeTab === 'transactions') {
        const matchesAccount = selectedAccount === 'all_accounts' ? true : transaction.bankAccountId === selectedAccount;

        // If searching, ignore month filter AND account filter
        if (searchTerm) {
          return matchesSearch && matchesFilter;
        }

        const transactionDate = new Date(transaction.date);
        const [year, month] = selectedTransactionMonth.split('-');
        const matchesMonth = transactionDate.getFullYear() === parseInt(year) &&
          transactionDate.getMonth() === parseInt(month) - 1;
        return matchesSearch && matchesFilter && matchesMonth && matchesAccount;
      }

      // For summary tab, also filter by selected account
      const matchesAccount = selectedAccount === 'all_accounts' ? true : transaction.bankAccountId === selectedAccount;
      return matchesSearch && matchesFilter && matchesAccount;
    });
  }, [transactions, searchTerm, filterType, activeTab, selectedTransactionMonth, selectedAccount]);


  // Use a ref to access the latest category rules inside callbacks without dependency issues
  const categoryRulesRef = useRef(categoryRules);
  const sipRulesRef = useRef(sipRules); // New ref for SIP rules

  useEffect(() => {
    categoryRulesRef.current = categoryRules;
    sipRulesRef.current = sipRules; // Keep SIP rules updated
    // console.log('🔄 Updated categoryRulesRef', categoryRules.length);
  }, [categoryRules, sipRules]);

  const handleImageAnalyzed = (data: any[]) => {
    // Pre-process data to apply categorization rules immediately
    // This ensures the confirmation dialog shows the correct categories
    // and logs are visible to the user before they confirm
    const currentRules = categoryRulesRef.current;
    const currentSipRules = sipRulesRef.current;

    const categorizedData = data.map(transaction => {
      // Debug log - Unconditional
      // console.log(`🔍 Pre-categorizing: "${transaction.description}"`);

      let category = transaction.category;

      // 1. Auto-categorize with custom rules if not already categorized
      if (!category) {
        // console.log(`🔍 Auto-categorizing "${transaction.description}" with ${currentRules.length} rules (from Ref)`);
        category = AutoCategorizationService.suggestCategoryForTransaction(
          transaction.description,
          transaction.amount,
          transaction.type,
          currentRules
        );
      }

      // 2. Check SIP Rules (Override if match found)
      // Create temp tx for matching
      const tempTx = { ...transaction, category: category || 'other', id: 'temp', date: transaction.date || new Date().toISOString() };
      const sipMatch = SIPRuleService.findBestMatch(tempTx as any, currentSipRules);

      if (sipMatch) {
        console.log(`🎯 SIP Rule Match (Image): ${transaction.description} -> ${sipMatch.sipId}`);
        category = 'investment';
      }

      return { ...transaction, category };
    });

    setExtractedData(categorizedData);
    setShowImageUploader(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmData = async (confirmedData: any[], isHistorical: boolean = false) => {
    // 1. Process Data & Identify SIPs
    // Don't auto-create SIPs here, just link them if possible?
    // Actually, File/Image uploader returns bare objects.
    // We treat them all as new transactions to be added.



    const transactionsToAdd = confirmedData.map(item => {
      // Basic mapping
      const tx = {
        description: item.description,
        amount: item.amount,
        date: item.date instanceof Date ? item.date.toISOString().split('T')[0] : item.date,
        type: item.type,
        category: item.category,
        bankAccountId: item.bankAccountId || selectedAccount === 'all_accounts' ? bankAccounts[0]?.id : selectedAccount,
        tags: ['imported'], // Default tag
      };

      // Final SIP Check before saving
      // (Just relies on category being 'investment' usually, OR we can explicit check rules again)
      return tx;
    });

    // 2. Add Transactions via Bulk API (handle duplicates logic inside DataContext)
    const result = await addTransactionsBulk(transactionsToAdd, { isHistorical });

    setShowConfirmDialog(false);

    if (result.success) {
      if (result.summary?.duplicateTransactions > 0) {
        // If duplicates found during bulk add (if that logic existed inside addTransactionsBulk)
        // But currently addTransactionsBulk in DataContext might return a summary
        // if we want to show a specific UI.
        // For now, assume success means added.
      }
      alert(`Successfully added ${result.summary?.newTransactions || transactionsToAdd.length} transactions.`);
    } else {
      // Show Duplicate Dialog if error was related to duplicates and we want manual resolution?
      // OR just alert error.
      if (result.summary) {
        // We have duplicates info
        setDuplicateSummary(result.summary);
        setPendingImportData(transactionsToAdd); // Store for potential force add
        setShowDuplicateDialog(true);
      } else {
        alert(`Failed to import: ${result.error}`);
      }
    }
  };

  /* 
   * Handle parsed transactions from File Uploader (Excel/CSV/PDF)
   * This is where PDF statement transactions arrive.
   * We need to apply auto-categorization here using fresh rules from Ref.
   */
  const handleFileTransactionsParsed = (transactions: ParsedTransaction[]) => {
    const currentRules = categoryRulesRef.current;
    const currentSipRules = sipRulesRef.current;

    // Debug log
    console.log(`📂 Processing ${transactions.length} file transactions with ${currentRules.length} cat rules and ${currentSipRules.length} SIP rules`);

    const categorizedData = transactions.map(transaction => {
      let category = transaction.category;

      // If category is missing (which we forced in parser), try to find a match
      if (!category) {
        // console.log(`🔍 Auto-categorizing file tx: "${transaction.description}"`);
        const result = AutoCategorizationService.suggestCategoryForTransaction(
          transaction.description,
          transaction.amount,
          transaction.type as any,
          currentRules
        );
        category = result.categoryId;
      }

      // Check SIP Rules
      const tempTx = {
        ...transaction,
        category: category || 'other',
        id: 'temp',
        date: (transaction.date as any) instanceof Date ? (transaction.date as any).toISOString() : transaction.date
      };

      const sipMatch = SIPRuleService.findBestMatch(tempTx as any, currentSipRules);

      if (sipMatch) {
        console.log(`🎯 SIP Rule Match (File): ${transaction.description} -> ${sipMatch.sipId}`);
        category = 'investment';
      }

      return { ...transaction, category };
    });

    setExtractedData(categorizedData);
    setShowFileUploader(false);
    setShowConfirmDialog(true);
  };

  const handleDuplicateConfirm = async (forceImport: boolean) => {
    if (forceImport) {
      // Force import all transactions (including duplicates)
      const transactionsToAdd = pendingImportData.map(item => ({
        description: item.description || 'Imported transaction',
        amount: item.amount || 0,
        date: item.date || new Date().toISOString().split('T')[0],
        category: item.category || 'other',
        type: item.type || 'expense',
        bankAccountId: bankAccounts[0]?.id || '',
        tags: [],
        source: 'excel-import-forced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Bypass duplicate detection by calling Firebase directly
      try {
        const { default: FirebaseService } = await import('../services/firebaseService');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        await FirebaseService.bulkAddTransactions(user.id, transactionsToAdd);
        alert(`⚠️ Force imported ${transactionsToAdd.length} transactions (including duplicates).`);
      } catch (error) {
        alert(`❌ Force import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Import only new transactions
      const newTransactions = duplicateSummary.importedTransactions.map((t: any) => {
        const { id, ...transaction } = t;
        return transaction;
      });

      if (newTransactions.length > 0) {
        try {
          const { default: FirebaseService } = await import('../services/firebaseService');
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          await FirebaseService.bulkAddTransactions(user.id, newTransactions);
          alert(`✅ Successfully imported ${newTransactions.length} new transactions!`);
        } catch (error) {
          alert(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        alert('ℹ️ No new transactions to import.');
      }
    }

    // Mark file as imported
    const fileInfo = (pendingImportData as any).fileInfo;
    if (fileInfo) {
      const { default: duplicateDetectionService } = await import('../services/duplicateDetectionService');
      duplicateDetectionService.markFileAsImported(fileInfo.name, fileInfo.size, fileInfo.lastModified);
    }

    setShowDuplicateDialog(false);
    setDuplicateSummary(null);
    setPendingImportData([]);
    setExtractedData([]);
  };

  // Removed - focus on import/categorization workflow

  // Removed - using combined detail/edit modal

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedTransactionForDetail(null);
  };

  const handleShowTransactionList = (transactions: Transaction[], title: string, subtitle?: string) => {
    setTransactionListModalData({ transactions, title, subtitle });
    setShowTransactionListModal(true);
  };

  // One-time migration for existing transactions with wrong categories
  useEffect(() => {
    const migrationKey = 'category_migration_completed';
    const migrationCompleted = localStorage.getItem(migrationKey);

    if (!migrationCompleted && transactions.length > 0) {
      const stats = CategoryMigrationService.getMigrationStats(transactions);

      if (stats.needsMigration > 0) {
        console.log(`🔄 Found ${stats.needsMigration} transactions that need category migration:`, stats.byCurrentCategory);

        const fixedTransactions = CategoryMigrationService.fixTransactionCategories(transactions);

        // Update each transaction that was fixed
        fixedTransactions.forEach((transaction, index) => {
          if (transaction.category !== transactions[index].category) {
            updateTransaction(transaction.id, transaction);
          }
        });

        console.log(`✅ Category migration completed for ${stats.needsMigration} transactions`);
        localStorage.setItem(migrationKey, 'true');
      }
    }
  }, [transactions, updateTransaction]);

  const handleDeleteTransaction = (transactionId: string) => {
    setDeleteTarget({ type: 'transaction', id: transactionId });
    setShowDeleteConfirm(true);
  };

  // Removed - using combined detail/edit modal

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

  const handleManualAddSubmit = async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      await addTransaction(transactionData);
      setShowManualAddModal(false);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const handleEditBankAccount = (account: BankAccount) => {
    setEditingBankAccount(account);
    setShowBankAccountForm(true);
  };

  const handleDeleteBankAccount = (accountId: string) => {
    setDeleteTarget({ type: 'account', id: accountId });
    setShowDeleteConfirm(true);
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
    setDeleteTarget({ type: 'bulk', count: selectedTransactions.size });
    setShowDeleteConfirm(true);
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
      setBulkType('expense');
    }
  };

  // Delete confirmation handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'transaction' && deleteTarget.id) {
        await deleteTransaction(deleteTarget.id);
      } else if (deleteTarget.type === 'account' && deleteTarget.id) {
        await deleteBankAccount(deleteTarget.id);
        // If we're deleting the currently selected account, switch to the first available account
        if (selectedAccount === deleteTarget.id && bankAccounts.length > 1) {
          const remainingAccounts = bankAccounts.filter(acc => acc.id !== deleteTarget.id);
          setSelectedAccount(remainingAccounts[0].id);
        }
      } else if (deleteTarget.type === 'bulk') {
        await Promise.all(Array.from(selectedTransactions).map(id => deleteTransaction(id)));
        setSelectedTransactions(new Set());
        setShowBulkActions(false);
      }
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // Load categories from localStorage - REMOVED (using DataContext)
  // const [categories, setCategories] = React.useState<any[]>([]);
  // React.useEffect logic removed





  const currentAccount = selectedAccount === 'all_accounts'
    ? {
      id: 'all_accounts',
      bank: 'All Accounts',
      number: `${bankAccounts.length} Accounts`,
      balance: bankAccounts.reduce((sum, acc) => sum + acc.balance, 0),
      logo: '🏦',
      type: 'checking',
      userId: 'current_user'
    } as BankAccount
    : bankAccounts.find(acc => acc.id === selectedAccount) || bankAccounts[0] || null;

  // Calculate account-specific balance based on transactions
  const accountTransactions = transactions.filter(t =>
    selectedAccount === 'all_accounts' ? true : t.bankAccountId === selectedAccount
  );

  const totalIncome = accountTransactions
    .filter(t => t.type === 'income' && t.category !== 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = accountTransactions
    .filter(t => t.type === 'expense' && t.category !== 'transfer')
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
        const matchesAccount = selectedAccount === 'all_accounts' ? true : t.bankAccountId === selectedAccount;
        return matchesMonth && matchesAccount;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income' && t.category !== 'transfer')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = monthTransactions
        .filter(t => t.type === 'expense' && t.category !== 'transfer')
        .reduce((sum, t) => sum + t.amount, 0);

      const investments = monthTransactions
        .filter(t => t.type === 'investment' && t.category !== 'transfer')
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        fullDate: date,
        income,
        expenses,
        investments,
        net: income - expenses - investments // Net usually means In - Out. If investment is Out, subtract it. Or just Net Cash Flow? usually Investment is outflow from bank.
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
    const matchesAccount = selectedAccount === 'all_accounts' ? true : t.bankAccountId === selectedAccount;
    return matchesMonth && matchesAccount;
  });

  const currentMonthPieData = useMemo(() => {
    const targetTransactions = currentMonthTransactions.filter(t => t.type === pieChartType && t.category !== 'transfer');
    const categoryTotals = targetTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryTotals)
      .map(([categoryId, value]) => {
        const category = categories.find(c => c.id === categoryId);
        const name = category ? category.name : categoryId;
        return { categoryId, name, value };
      })
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions, pieChartType, categories]);

  const handleBarClick = (monthData: any, type: 'income' | 'expense' | 'investment') => {
    const targetTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getFullYear() === monthData.fullDate.getFullYear() &&
        tDate.getMonth() === monthData.fullDate.getMonth() &&
        (selectedAccount === 'all_accounts' ? true : t.bankAccountId === selectedAccount) &&
        t.type === type &&
        t.category !== 'transfer';
    });

    const categoryTotals = targetTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    // Map category IDs to names for the pie chart
    const pieData = Object.entries(categoryTotals)
      .map(([categoryId, value]) => {
        const category = categories.find(c => c.id === categoryId);
        const name = category ? category.name : categoryId; // Fallback to ID if not found
        return { name, value };
      })
      .sort((a, b) => b.value - a.value);

    const totalAmount = targetTransactions.reduce((sum, t) => sum + t.amount, 0);
    setBreakdownData(pieData);
    setBreakdownTitle(`${monthData.month}`);
    setBreakdownType(type); // Cast removed
    setBreakdownTotal(totalAmount);
    setBreakdownMonthFilter({ year: monthData.fullDate.getFullYear(), month: monthData.fullDate.getMonth() });
    setShowBreakdownOverlay(true);
  };

  const handleCategoryClick = (categoryName: string) => {
    // Find the category ID from the category name
    const category = categories.find(c => c.name === categoryName);
    if (!category || !breakdownMonthFilter) return;

    // Filter transactions for this specific category and month
    const filteredTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return (
        tDate.getFullYear() === breakdownMonthFilter.year &&
        tDate.getMonth() === breakdownMonthFilter.month &&
        (selectedAccount === 'all_accounts' ? true : t.bankAccountId === selectedAccount) &&
        t.category === category.id &&
        t.type === breakdownType
      );
    });

    // Use the overlay instead of modal
    setTransactionListData(filteredTransactions);
    setTransactionListTitle(`${categoryName} Transactions`);
    setTransactionListSubtitle(`${breakdownType === 'income' ? 'Income' : 'Expense'} for ${breakdownTitle}`);
    setViewingContextId(category.id); // Track which category we are strictly viewing
    setShowTransactionListOverlay(true);
  };

  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income' && t.category !== 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense' && t.category !== 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyInvestments = currentMonthTransactions
    .filter(t => t.type === 'investment' && t.category !== 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeCount = currentMonthTransactions.filter(t => t.type === 'income').length;
  const expenseCount = currentMonthTransactions.filter(t => t.type === 'expense').length;
  const investmentCount = currentMonthTransactions.filter(t => t.type === 'investment').length;

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

  // Render Manual Add Modal
  const renderManualAddModal = () => (
    <SidePanel
      isOpen={showManualAddModal}
      onClose={() => setShowManualAddModal(false)}
      title="Add Transaction"
      size="md"
      headerActions={
        <Button
          onClick={() => formRef.current?.submit()}
          variant="primary"
          size="sm"
          className="rounded-full" // Optional: User said use proper component, usually component handles rounding. But simple button was rounded-full. I'll keep it standard rounded-lg from Button component unless pill is requested. The previous button was rounded-full. I'll stick to Button component default (rounded-lg) for consistency, or add className="rounded-full". Let's use default styles for "proper" look everywhere.
        >
          Add
        </Button>
      }
    >
      <SimpleTransactionForm
        ref={formRef}
        onSubmit={handleManualAddSubmit}
        onCancel={() => setShowManualAddModal(false)}
        hideActions
      />
    </SidePanel>
  );




  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900">
      {/* Top Bank Account Selector */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounts</h1>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => setShowFileUploader(true)}
              leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              disabled={!currentAccount || selectedAccount === 'all_accounts'}
            >
              Import
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowManualAddModal(true)}
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={!currentAccount || selectedAccount === 'all_accounts'}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Horizontal Scrollable Account Pills */}
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {bankAccounts.length > 1 && (
            <div
              className={`relative group flex items-center rounded-xl border-2 transition-all whitespace-nowrap min-w-fit pr-2 ${selectedAccount === 'all_accounts'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <button
                onClick={() => setSelectedAccount('all_accounts')}
                className="flex items-center space-x-3 px-4 py-3 flex-grow"
              >
                <span className="text-2xl">🏦</span>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">All Accounts</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{bankAccounts.length} Accounts</div>
                </div>
              </button>
            </div>
          )}
          {bankAccounts.map((account) => (
            <div
              key={account.id}
              className={`relative group flex items-center rounded-xl border-2 transition-all whitespace-nowrap min-w-fit pr-2 ${selectedAccount === account.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <button
                onClick={() => setSelectedAccount(account.id)}
                className="flex items-center space-x-3 px-4 py-3 flex-grow"
              >
                <span className="text-2xl">{account.logo}</span>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{account.bank}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{account.number}</div>
                </div>
              </button>

              {/* Edit/Delete buttons - integrated */}
              <div className="flex items-center space-x-1 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditBankAccount(account);
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                  title="Edit Account"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {bankAccounts.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBankAccount(account.id);
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                    title="Delete Account"
                  >
                    <Trash2 className="w-4 h-4" />
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



        {/* Tab Section */}
        <div className="card">
          <div className="border-b border-gray-200 dark:border-gray-600 dark:border-gray-600">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Account Summary
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transactions'
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Money In Card */}
                  <button
                    className="card text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full"
                    onClick={() => {
                      const incomeTransactions = currentMonthTransactions.filter(t => t.type === 'income');
                      const monthName = monthOptions.find(m => m.value === selectedMonth)?.label || 'Selected Month';
                      handleShowTransactionList(
                        incomeTransactions,
                        'Money In',
                        `${monthName} • ${incomeTransactions.length} transactions`
                      );
                    }}
                  >
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
                  </button>

                  {/* Money Out Card */}
                  <button
                    className="card text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full"
                    onClick={() => {
                      const expenseTransactions = currentMonthTransactions.filter(t => t.type === 'expense');
                      const monthName = monthOptions.find(m => m.value === selectedMonth)?.label || 'Selected Month';
                      handleShowTransactionList(
                        expenseTransactions,
                        'Money Out',
                        `${monthName} • ${expenseTransactions.length} transactions`
                      );
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <TrendingDown className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Money Out</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{expenseCount} transactions</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">{formatCurrency(monthlyExpenses)}</p>
                  </button>

                  {/* Investments Card */}
                  <button
                    className="card text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full"
                    onClick={() => {
                      const investmentTransactions = currentMonthTransactions.filter(t => t.type === 'investment');
                      const monthName = monthOptions.find(m => m.value === selectedMonth)?.label || 'Selected Month';
                      handleShowTransactionList(
                        investmentTransactions,
                        'Investments',
                        `${monthName} • ${investmentTransactions.length} transactions`
                      );
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Investments</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{investmentCount} transactions</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(monthlyInvestments)}</p>
                  </button>
                </div>

                {/* Monthly Asset Allocation Pie Chart */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <PieChartIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Category Breakdown</h3>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setPieChartType('income')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${pieChartType === 'income'
                          ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          }`}
                      >
                        Income
                      </button>
                      <button
                        onClick={() => setPieChartType('expense')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${pieChartType === 'expense'
                          ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          }`}
                      >
                        Expense
                      </button>
                    </div>
                  </div>

                  {currentMonthPieData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={currentMonthPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {currentMonthPieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip formatter={(value) => formatCurrency(value as number)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {currentMonthPieData.map((item, index) => (
                          <button
                            key={item.name}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => {
                              const categoryTransactions = currentMonthTransactions.filter(t =>
                                t.category === item.categoryId &&
                                t.type === pieChartType
                              );
                              const monthName = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

                              handleShowTransactionList(
                                categoryTransactions,
                                `${item.name}`,
                                `${pieChartType === 'income' ? 'Income' : 'Expense'} • ${monthName} • ${formatCurrency(item.value)}`
                              );
                            }}
                            type="button"
                          >
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <span className="text-sm text-gray-600 dark:text-gray-300 capitalize text-left">{item.name}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(item.value)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No {pieChartType} data available for this month
                    </div>
                  )}
                </div>

                {/* Account Overview */}
                <div className="card">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Account Overview</h3>
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
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Import transactions from your bank or upload a screenshot to get started
                        </p>
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
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Income</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{accountTransactions.filter(t => t.type === 'income').length} transactions</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
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
                  )}
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
                              ...getSixMonthData.map(d => Math.max(d.income, d.expenses, d.investments || 0))
                            );
                            const incomeHeight = maxAmount > 0 ? (monthData.income / maxAmount) * 100 : 0;
                            const expenseHeight = maxAmount > 0 ? (monthData.expenses / maxAmount) * 100 : 0;
                            const investmentHeight = maxAmount > 0 ? ((monthData.investments || 0) / maxAmount) * 100 : 0;

                            return (
                              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                                <div className="w-full flex justify-center space-x-1 h-40">
                                  {/* Income Bar */}
                                  <div
                                    className="flex flex-col justify-end w-4 sm:w-6 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleBarClick(monthData, 'income')}
                                  >
                                    <div
                                      className="bg-green-500 rounded-t transition-all duration-500 min-h-[4px]"
                                      style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                                      title={`Income: ${formatCurrency(monthData.income)}`}
                                    ></div>
                                  </div>
                                  {/* Expense Bar */}
                                  <div
                                    className="flex flex-col justify-end w-4 sm:w-6 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleBarClick(monthData, 'expense')}
                                  >
                                    <div
                                      className="bg-red-500 rounded-t transition-all duration-500 min-h-[4px]"
                                      style={{ height: `${Math.max(expenseHeight, 2)}%` }}
                                      title={`Expenses: ${formatCurrency(monthData.expenses)}`}
                                    ></div>
                                  </div>
                                  {/* Investment Bar */}
                                  <div
                                    className="flex flex-col justify-end w-4 sm:w-6 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleBarClick(monthData, 'investment')}
                                  >
                                    <div
                                      className="bg-purple-500 rounded-t transition-all duration-500 min-h-[4px]"
                                      style={{ height: `${Math.max(investmentHeight, 2)}%` }}
                                      title={`Investments: ${formatCurrency(monthData.investments || 0)}`}
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
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-500 rounded"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Investments</span>
                        </div>
                      </div>

                      {/* Current Month Summary */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">This Month In</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(monthlyIncome)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">This Month Out</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(monthlyExpenses)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Investments</p>
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatCurrency(monthlyInvestments)}</p>
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
                        className="input-field theme-input pr-8 text-sm appearance-none"
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
                        className="input-field theme-input !pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                    <select
                      className="input-field theme-input"
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
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
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
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-200 text-sm"
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
                <div className="card overflow-hidden min-h-[400px]">
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
                        onClick={() => setShowImageUploader(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Import from Screenshot
                      </button>
                    </div>
                  ) : (
                    <TransactionTable
                      transactions={filteredTransactions}
                      selectedTransactions={selectedTransactions}
                      onSelectTransaction={handleSelectTransaction}
                      onSelectAll={handleSelectAll}
                      onTransactionClick={(t) => {
                        setSelectedTransactionForDetail(t);
                        setShowDetailModal(true);
                      }}
                      onDeleteTransaction={handleDeleteTransaction}
                      onUpdateTransaction={(id, updates) => {
                        const transaction = transactions.find(t => t.id === id);
                        if (!transaction) return;

                        // Handle specific fields with rule prompts
                        if (updates.category && updates.category !== transaction.category) {
                          handleCategoryChangeWithRulePrompt(transaction, updates.category);
                        }
                        if (updates.type && updates.type !== transaction.type) {
                          handleTypeChangeWithRulePrompt(transaction, updates.type);
                        }

                        // Apply generic updates ignoring already handled fields
                        const otherUpdates = { ...updates };
                        delete otherUpdates.category;
                        delete otherUpdates.type;

                        if (Object.keys(otherUpdates).length > 0) {
                          updateTransaction(id, { ...transaction, ...otherUpdates });
                        }
                      }}
                      onContextMenu={handleContextMenu}
                    />
                  )}
                </div>
              </div>
            )
            }
          </div >
        </div >
      </div >

      {/* Bulk Action Modal */}
      {
        showBulkActions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-200 dark:border-gray-600 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
                {bulkActionType === 'category' ? 'Change Category' : 'Change Type'} for {selectedTransactions.size} transactions
              </h3>

              {bulkActionType === 'category' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Select New Category</label>
                  <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 flex justify-center">
                    <InlineCategoryEditor
                      currentCategory={bulkCategory}
                      onSave={(id) => setBulkCategory(id)}
                    />
                  </div>
                </div>
              )}

              {bulkActionType === 'type' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Select New Type</label>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as 'income' | 'expense' | 'investment' | 'insurance' | '')}
                    className="theme-input"
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
        )
      }

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

      {/* Removed transaction form - using combined detail/edit modal */}

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
        categories={categories}
      />

      {/* Duplicate Confirmation Dialog */}
      {
        duplicateSummary && (
          <DuplicateConfirmationDialog
            isOpen={showDuplicateDialog}
            onClose={() => setShowDuplicateDialog(false)}
            onConfirm={handleDuplicateConfirm}
            summary={duplicateSummary}
            fileName={(pendingImportData as any)?.fileInfo?.name}
          />
        )
      }

      {/* Delete Confirmation Modal */}
      {
        showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Confirm Deletion
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {deleteTarget?.type === 'transaction'
                  ? 'Are you sure you want to delete this transaction?'
                  : deleteTarget?.type === 'account'
                    ? 'Are you sure you want to delete this bank account? This action cannot be undone.'
                    : `Are you sure you want to delete ${deleteTarget?.count} transactions?`}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Transaction Detail Modal */}
      {
        selectedTransactionForDetail && (
          <SimpleTransactionModal
            transaction={selectedTransactionForDetail}
            isOpen={showDetailModal}
            onClose={handleDetailModalClose}
            onTransactionClick={(t) => setSelectedTransactionForDetail(t)}
          />
        )
      }

      {/* Transaction List Modal */}
      <TransactionListModal
        transactions={transactionListModalData.transactions}
        isOpen={showTransactionListModal}
        onClose={() => setShowTransactionListModal(false)}
        title={transactionListModalData.title}
        subtitle={transactionListModalData.subtitle}
      />

      {/* Category Breakdown Overlay */}
      <CategoryBreakdownOverlay
        isOpen={showBreakdownOverlay}
        onClose={() => setShowBreakdownOverlay(false)}
        title={breakdownTitle}
        type={breakdownType}
        data={breakdownData}
        totalAmount={breakdownTotal}
        onCategoryClick={handleCategoryClick}
      />

      {/* Transaction List Overlay (wider, on top of category breakdown) */}
      <TransactionListOverlay
        isOpen={showTransactionListOverlay}
        onClose={() => setShowTransactionListOverlay(false)}
        title={transactionListTitle}
        subtitle={transactionListSubtitle}
        transactions={transactionListData}
        onTransactionClick={(transaction) => {
          setSelectedTransactionForDetail(transaction);
          setShowDetailModal(true);
        }}
        onDeleteTransaction={handleDeleteTransaction}
        onUpdateTransaction={(transactionId, updates) => {
          const transaction = transactions.find(t => t.id === transactionId);
          if (transaction) {
            // Optimistically update local state
            setTransactionListData(prev => {
              // If we are strictly viewing a specific category, REMOVE the item if category changes
              if (viewingContextId && updates.category && updates.category !== viewingContextId) {
                return prev.filter(t => t.id !== transactionId);
              }
              // Otherwise just update it in place
              return prev.map(t =>
                t.id === transactionId ? { ...t, ...updates } : t
              );
            });

            // If category is being updated, use the rule prompt handler
            if (updates.category && updates.category !== transaction.category) {
              handleCategoryChangeWithRulePrompt(transaction, updates.category);

              // Apply other updates if any
              const otherUpdates = { ...updates };
              delete otherUpdates.category;
              if (Object.keys(otherUpdates).length > 0) {
                updateTransaction(transactionId, { ...transaction, ...otherUpdates });
              }
            } else {
              // Standard update
              updateTransaction(transactionId, { ...transaction, ...updates });
            }
          }
        }}
      />

      {/* Rule Creation Flow */}
      {
        rulePromptData && (
          <>
            <RulePrompt
              isOpen={showRulePrompt}
              transactionName={rulePromptData.transaction.description}
              onCreateRule={() => {
                setShowRulePrompt(false);
                setShowRuleDialog(true);
              }}
              onDismiss={() => {
                setShowRulePrompt(false);
                setRulePromptData(null);
              }}
            />

            <RuleCreationDialog
              isOpen={showRuleDialog}
              onClose={() => {
                setShowRuleDialog(false);
                setRulePromptData(null);
              }}
              transaction={rulePromptData.transaction}
              newCategoryId={rulePromptData.newCategoryId}
              newType={rulePromptData.newType}
              transactions={transactions}
              categories={categories}
              onCreateRule={(rule) => {
                addCategoryRule(rule);
                setShowRuleDialog(false);
                setRulePromptData(null);
              }}
            />
          </>
        )
      }
      {
        contextMenu && (
          <TransactionContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            transaction={contextMenu.transaction}
            onClose={() => setContextMenu(null)}
            onEdit={(t) => {
              setSelectedTransactionForDetail(t);
              setShowDetailModal(true);
            }}
            onDelete={(id) => handleDeleteTransaction(id)}
            onMakeRecurring={handleMakeRecurring}
            onChangeCategory={(t) => handleOpenSingleBulkAction(t, 'category')}
            onChangeType={(t) => handleOpenSingleBulkAction(t, 'type')}
          />
        )
      }
      {/* Modals */}
      {renderManualAddModal()}
      {/* ... other modals ... */}
    </div >
  );
};

export default Transactions;