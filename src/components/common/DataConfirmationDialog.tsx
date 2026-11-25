import React, { useState, useRef } from 'react';
import { Check, X, AlertTriangle, ChevronDown, ChevronRight, ArrowLeftRight, Plus } from 'lucide-react';

import { Category, isTransferTransaction } from '../../constants/categories';
import InlineCategoryEditor from '../transactions/InlineCategoryEditor';
import InlineAccountPicker from '../transactions/InlineAccountPicker';
import Modal from './Modal';
import BankAccountForm from '../forms/BankAccountForm';
import { BankAccount } from '../../types';
import { useData } from '../../contexts/DataContext';
import AutoCategorizationService from '../../services/autoCategorization';
import { StatementSectionInfo } from '../../services/bankStatementParser';
import { detectOwnAccountTransfers, accountRefFromNumber, OwnTransferMatch } from '../../services/ownTransferDetection';

// One account's transactions from a multi-account statement, ready to import
export interface StatementImportGroup {
  section: StatementSectionInfo;
  accountId: string;
  transactions: any[]; // each item carries bankAccountId = accountId
}

interface DataConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmedData: any[], isHistorical?: boolean, targetAccountId?: string) => void;
  data: any[];
  type: 'assets' | 'transactions' | 'insurance';
  title: string;
  categories?: Category[];
  accountName?: string;
  accounts?: BankAccount[];
  selectedAccountId?: string;
  onAccountChange?: (accountId: string) => void;
  onCategoryChange?: (item: any, newCategory: string) => void;
  lastCreatedRule?: any;
  // Multi-account statement: items carry statementSectionId and each section gets its own
  // account picker. Ignored unless there are 2+ sections.
  sections?: StatementSectionInfo[];
  // Called instead of onConfirm for multi-account statements. Without it, onConfirm gets
  // all chosen items with bankAccountId set per item.
  onConfirmGroups?: (groups: StatementImportGroup[], isHistorical: boolean) => void;
}

// Last 4 digits of a bank account's number, for matching statement sections
const accountLast4 = (account: BankAccount) => (account.number || '').replace(/\D/g, '').slice(-4);

// The only account whose number ends with the section's last 4 digits, if exactly one does
const findMatchingAccount = (section: StatementSectionInfo, accounts: BankAccount[]) => {
  const matches = accounts.filter(a => accountLast4(a) === section.accountLast4);
  return matches.length === 1 ? matches[0] : undefined;
};

/**
 * Multi-account statements: label transfers between the user's own accounts (another section
 * of this PDF, or an account already in the app) with the Transfer category so they don't
 * count as income in one account and spending in the other. Rows are only re-labelled, never
 * dropped; `ownTransfer` lets the user undo it per row.
 */
const markOwnTransfers = (rows: any[], sections: StatementSectionInfo[], accounts: BankAccount[]) => {
  const sectionLast4s = new Set(sections.map(s => s.accountLast4));
  const refs = [
    ...sections.map(s => accountRefFromNumber(s.accountNumber || s.accountLast4, s.id)),
    ...accounts
      .filter(a => a.accountType !== 'cash' && accountLast4(a).length === 4 && !sectionLast4s.has(accountLast4(a)))
      .map(a => accountRefFromNumber(a.number))
  ];
  const matches = detectOwnAccountTransfers(rows, refs);
  if (matches.size === 0) return rows;
  return rows.map((row, index) => {
    const match = matches.get(index);
    if (!match) return row;
    return { ...row, ownTransfer: match, ownTransferPrevCategory: row.category, category: 'transfer' };
  });
};

// Drop review-only fields; transfers carry a tag and note into the saved transaction
const toImportItem = (row: any, bankAccountId: string) => {
  const { ownTransfer, ownTransferPrevCategory: _prev, ...rest } = row;
  const isOwnTransfer = !!ownTransfer && row.category === 'transfer';
  return {
    ...rest,
    bankAccountId,
    ...(isOwnTransfer ? {
      importTags: ['own-account-transfer'],
      importNote: `Transfer between your accounts (••${(ownTransfer as OwnTransferMatch).counterpartLast4})`
    } : {})
  };
};

const DataConfirmationDialog: React.FC<DataConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  data,
  type,
  title,
  categories = [],
  accounts = [],
  selectedAccountId = '',
  onAccountChange,
  onCategoryChange,
  lastCreatedRule,
  sections,
  onConfirmGroups
}) => {
  const { addBankAccount, bankAccounts: contextAccounts } = useData();
  const [editableData, setEditableData] = useState(data);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(data.map((_, index) => index))
  );
  const [isHistorical, setIsHistorical] = useState(false);
  const [accountId, setAccountId] = useState<string>(selectedAccountId);
  const lastClickedIndexRef = useRef<number | null>(null);
  const isMultiAccount = type === 'transactions' && (sections?.length ?? 0) > 1;
  // Multi-account statements: chosen account and skip state per section
  const [groupAccountIds, setGroupAccountIds] = useState<Record<string, string>>({});
  const [skippedGroups, setSkippedGroups] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Section whose "Add new account" form is open
  const [addAccountSectionId, setAddAccountSectionId] = useState<string | null>(null);
  const [addAccountError, setAddAccountError] = useState('');
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // The dialog can stay mounted between imports - start each statement fresh
  React.useEffect(() => {
    setGroupAccountIds({});
    setSkippedGroups(new Set());
    // Open the first account that needs linking, else the first one with transactions
    const withRows = (sections || []).filter(s => s.transactionCount > 0);
    const first = withRows.find(s => !findMatchingAccount(s, accounts)) || withRows[0];
    setExpandedGroups(new Set(first ? [first.id] : []));
  }, [sections]);

  // Pre-select the account whose number ends with the section's last 4 digits (only when
  // exactly one account matches); never overrides a choice the user already made
  React.useEffect(() => {
    if (!isMultiAccount || !sections) return;
    setGroupAccountIds(prev => {
      let changed = false;
      const next = { ...prev };
      for (const section of sections) {
        if (next[section.id]) continue;
        const match = findMatchingAccount(section, accounts);
        if (match) {
          next[section.id] = match.id;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [isMultiAccount, sections, accounts]);

  // Update editableData when data prop changes
  React.useEffect(() => {
    const multi = type === 'transactions' && (sections?.length ?? 0) > 1;
    setEditableData(multi ? markOwnTransfers(data, sections!, accounts) : data);
    setSelectedItems(new Set(data.map((_, index) => index)));
  }, [data, sections]);

  // Apply last created rule to all matching items
  React.useEffect(() => {
    if (lastCreatedRule && type === 'transactions') {
      setEditableData(prev => {
        let hasChanges = false;
        const newData = prev.map(item => {
          // Leave detected own-account transfers alone (the user can undo those per row)
          if (item.ownTransfer && item.category === 'transfer') return item;
          if (AutoCategorizationService.matchesRule(lastCreatedRule, item.description)) {
            // Apply category
            if (item.category !== lastCreatedRule.categoryId) {
              hasChanges = true;
              return { ...item, category: lastCreatedRule.categoryId };
            }
          }
          return item;
        });

        if (hasChanges) {
          console.log('Applied new rule to extracted transactions');
          return newData;
        }
        return prev;
      });
    }
  }, [lastCreatedRule]);

  if (!isOpen) return null;

  const handleItemToggle = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleItemCheckboxClick = (index: number, e: React.MouseEvent<HTMLInputElement>) => {
    const select = (e.currentTarget as HTMLInputElement).checked;
    if (e.shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      setSelectedItems(prev => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          if (select) next.add(i); else next.delete(i);
        }
        return next;
      });
    } else {
      // Toggle single
      setSelectedItems(prev => {
        const next = new Set(prev);
        if (select) next.add(index); else next.delete(index);
        return next;
      });
    }
    lastClickedIndexRef.current = index;
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    setEditableData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };

      // Trigger callback for category changes
      if (field === 'category' && onCategoryChange) {
        onCategoryChange(newData[index], value);
      }

      return newData;
    });
  };

  // Indices of editableData per statement section (multi-account statements)
  const sectionIndices: Record<string, number[]> = {};
  if (isMultiAccount) {
    sections!.forEach(section => { sectionIndices[section.id] = []; });
    editableData.forEach((item, index) => {
      if (item.statementSectionId && sectionIndices[item.statementSectionId]) {
        sectionIndices[item.statementSectionId].push(index);
      }
    });
  }
  const activeSections = isMultiAccount ? sections!.filter(s => !skippedGroups.has(s.id)) : [];
  const importableIndices = isMultiAccount
    ? activeSections.flatMap(s => sectionIndices[s.id])
    : editableData.map((_, index) => index);
  const selectedCount = isMultiAccount
    ? importableIndices.filter(i => selectedItems.has(i)).length
    : selectedItems.size;
  // Sections with chosen rows but no account yet
  const sectionsMissingAccount = activeSections.filter(s =>
    !groupAccountIds[s.id] && sectionIndices[s.id].some(i => selectedItems.has(i))
  );

  const toggleGroupSkipped = (sectionId: string) => {
    setSkippedGroups(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
      return next;
    });
  };

  const handleConfirmGroups = () => {
    if (selectedCount === 0 || sectionsMissingAccount.length > 0) return;
    const groups: StatementImportGroup[] = activeSections
      .map(section => {
        const groupAccountId = groupAccountIds[section.id];
        return {
          section,
          accountId: groupAccountId,
          transactions: sectionIndices[section.id]
            .filter(i => selectedItems.has(i))
            .map(i => toImportItem(editableData[i], groupAccountId))
        };
      })
      .filter(group => group.transactions.length > 0);

    if (onConfirmGroups) {
      onConfirmGroups(groups, isHistorical);
    } else {
      onConfirm(groups.flatMap(group => group.transactions), isHistorical);
    }
    onClose();
  };

  const handleConfirm = () => {
    if (isMultiAccount) {
      handleConfirmGroups();
      return;
    }
    // Keep the dialog (and the user's edits) open until an account is chosen
    if (type === 'transactions' && !accountId) return;
    const confirmedData = editableData.filter((_, index) => selectedItems.has(index));
    onConfirm(confirmedData, isHistorical, accountId);
    onClose();
  };

  const renderAssetItem = (item: any, index: number) => (
    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedItems.has(index)}
            onChange={() => handleItemToggle(index)}
            className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition duration-150 ease-in-out cursor-pointer"
            style={{ width: '1rem', height: '1rem' }}
          />
          <div className="flex items-center">
            {item.confidence < 0.7 && (
              <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
            )}
            <span className="font-medium text-gray-900 dark:text-white">Asset {index + 1}</span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${item.confidence >= 0.8 ? 'bg-green-100 text-green-700 dark:text-green-300' :
          item.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700 dark:text-yellow-300' :
            'bg-red-100 text-red-700 dark:text-red-300'
          }`}>
          {Math.round(item.confidence * 100)}% confident
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select
            value={item.category}
            onChange={(e) => handleFieldChange(index, 'category', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          >
            <option value="stocks">Stocks</option>
            <option value="mutual_funds">Mutual Funds</option>
            <option value="fixed_deposit">Fixed Deposit</option>
            <option value="gold">Gold</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current Value</label>
          <input
            type="number"
            value={item.currentValue}
            onChange={(e) => handleFieldChange(index, 'currentValue', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Value (Optional)</label>
          <input
            type="number"
            value={item.purchaseValue || ''}
            onChange={(e) => handleFieldChange(index, 'purchaseValue', Number(e.target.value) || undefined)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>
    </div>
  );

  const getExpenseCategories = () => [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
    'Healthcare', 'Education', 'Travel', 'Groceries', 'Fuel', 'Insurance', 'Investment',
    'Cash Withdrawal', 'Transfer', 'Loan/EMI', 'Other Expense'
  ];

  const getIncomeCategories = () => [
    'Salary', 'Business Income', 'Investment Returns', 'Interest', 'Dividend',
    'Freelance', 'Rental Income', 'Bonus', 'Refund', 'Gift', 'Other Income'
  ];

  const getCategoryOptions = (type: string) => {
    if (type === 'expense') return getExpenseCategories();
    if (type === 'income') return getIncomeCategories();
    if (type === 'investment') return ['Mutual Fund', 'Stocks', 'FD', 'Gold', 'Crypto', 'Other Investment'];
    if (type === 'insurance') return ['Life Insurance', 'Health Insurance', 'Vehicle Insurance', 'Other Insurance'];
    return ['Other'];
  };

  const getTypeStyle = (txType: string): React.CSSProperties => {
    switch (txType) {
      case 'income': return { color: 'var(--color-success)', backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)' };
      case 'expense': return { color: 'var(--color-error)', backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)' };
      case 'investment': return { color: 'var(--color-accent-primary)', backgroundColor: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent-primary) 25%, transparent)' };
      default: return { color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' };
    }
  };

  const getConfidenceStyle = (conf: number): React.CSSProperties => {
    if (conf >= 0.8) return { color: 'var(--color-success)', backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)' };
    if (conf >= 0.6) return { color: 'var(--color-warning, #b45309)', backgroundColor: 'color-mix(in srgb, #b45309 10%, transparent)' };
    return { color: 'var(--color-error)', backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const setIndicesSelected = (indices: number[], select: boolean) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      indices.forEach(i => { if (select) next.add(i); else next.delete(i); });
      return next;
    });
  };

  // Turn a detected own-account transfer on/off; both sides of a pair change together
  const setOwnTransferActive = (index: number, active: boolean) => {
    setEditableData(prev => {
      const next = [...prev];
      const apply = (i: number) => {
        const row = next[i];
        if (!row?.ownTransfer) return;
        if (active && row.category !== 'transfer') {
          next[i] = { ...row, ownTransferPrevCategory: row.category, category: 'transfer' };
        } else if (!active && row.category === 'transfer') {
          const previous = row.ownTransferPrevCategory;
          next[i] = { ...row, category: previous && previous !== 'transfer' ? previous : 'uncategorized' };
        }
      };
      apply(index);
      const pairIndex = prev[index]?.ownTransfer?.pairIndex;
      if (pairIndex !== undefined) apply(pairIndex);
      return next;
    });
  };

  const renderTransferBadge = (index: number) => {
    const row = editableData[index];
    if (!row?.ownTransfer) return null;
    const match = row.ownTransfer as OwnTransferMatch;
    const active = row.category === 'transfer';
    const otherInStatement = sections?.find(s => s.accountLast4 === match.counterpartLast4);
    const detail = `${row.type === 'income' ? 'From' : 'To'} ••${match.counterpartLast4}${match.pairIndex !== undefined ? ' · matched in this statement' : otherInStatement ? '' : ' · account in the app'}`;
    return active ? (
      <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-1 text-[11px] min-w-0">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium max-w-full min-w-0"
          style={{ color: '#7C3AED', backgroundColor: 'color-mix(in srgb, #8B5CF6 12%, transparent)', border: '1px solid color-mix(in srgb, #8B5CF6 25%, transparent)' }}
          title={`Transfer between your accounts · ${detail}`}>
          <ArrowLeftRight className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">Transfer between your accounts · ••{match.counterpartLast4}</span>
        </span>
        <button type="button" onClick={() => setOwnTransferActive(index, false)}
          className="underline theme-text-muted hover:opacity-80 whitespace-nowrap">Not a transfer</button>
      </div>
    ) : (
      <div className="mt-1 text-[11px] theme-text-muted">
        Looks like a transfer {row.type === 'income' ? 'from' : 'to'} ••{match.counterpartLast4}.{' '}
        <button type="button" onClick={() => setOwnTransferActive(index, true)} className="underline hover:opacity-80">Mark as transfer</button>
      </div>
    );
  };

  const formatSigned = (amount: number) => `${amount >= 0 ? '+' : '−'}${formatCurrency(Math.abs(amount))}`;

  // Per-account numbers for the selected rows; transfers are kept out of income/spending
  const summarizeGroup = (indices: number[]) => {
    const summary = { selected: 0, income: 0, spending: 0, incomeCount: 0, expenseCount: 0, investmentCount: 0, transferCount: 0, transferIn: 0, transferOut: 0, net: 0 };
    for (const i of indices) {
      if (!selectedItems.has(i)) continue;
      const row = editableData[i];
      const amount = Number(row.amount) || 0;
      const isCredit = row.type === 'income';
      summary.selected++;
      summary.net += isCredit ? amount : -amount;
      if (isTransferTransaction(row, categories)) {
        summary.transferCount++;
        if (isCredit) summary.transferIn += amount; else summary.transferOut += amount;
      } else if (isCredit) {
        summary.incomeCount++;
        summary.income += amount;
      } else {
        if (row.type === 'investment') summary.investmentCount++; else summary.expenseCount++;
        summary.spending += amount;
      }
    }
    return summary;
  };

  const renderTransactionTable = (indices: number[]) => (
    <div className="space-y-3">
      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        <div
          className="flex items-center justify-between px-3 py-2 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={indices.every(i => selectedItems.has(i))}
              onChange={(e) => setIndicesSelected(indices, e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="font-medium theme-text-primary">Select All</span>
          </label>
          <span className="theme-text-muted text-xs">{indices.filter(i => selectedItems.has(i)).length} / {indices.length} selected</span>
        </div>

        {indices.map(index => { const item = editableData[index]; return (
          <div
            key={index}
            className="rounded-xl p-3 space-y-2"
            style={{
              backgroundColor: selectedItems.has(index) ? 'color-mix(in srgb, var(--color-accent-primary) 6%, var(--color-card-bg))' : 'var(--color-card-bg)',
              border: `1px solid ${selectedItems.has(index) ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectedItems.has(index)} onChange={() => handleItemToggle(index)} className="w-4 h-4 cursor-pointer" />
                <input type="date" value={item.date} onChange={(e) => handleFieldChange(index, 'date', e.target.value)}
                  className="input-field theme-input text-xs py-1" style={{ colorScheme: 'auto' }} />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={getConfidenceStyle(item.confidence)}>
                {Math.round(item.confidence * 100)}%
              </span>
            </div>
            <div>
              <input type="text" value={item.description} onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                className="input-field theme-input w-full text-xs" placeholder="Description" />
              {renderTransferBadge(index)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={item.amount} onChange={(e) => handleFieldChange(index, 'amount', Number(e.target.value))}
                className="input-field theme-input text-xs" min="0" step="0.01" />
              <select value={item.type} onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                className="input-field theme-input text-xs rounded-lg px-1" style={getTypeStyle(item.type)}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="investment">Investment</option>
                <option value="insurance">Insurance</option>
              </select>
              <InlineCategoryEditor
                currentCategory={item.category || 'uncategorized'}
                onSave={(categoryId) => handleFieldChange(index, 'category', categoryId)}
                renderTrigger={(onClick) => {
                  const cat = categories.find(c => c.id === item.category);
                  return (
                    <button type="button" onClick={onClick}
                      className="input-field theme-input text-xs flex items-center gap-1 truncate">
                      <span>{cat?.icon || '❓'}</span>
                      <span className="truncate">{cat?.name || 'Other'}</span>
                    </button>
                  );
                }}
              />
            </div>
          </div>
        ); })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border-primary)' }}>
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '2.5rem' }} />
            <col style={{ width: '9rem' }} />
            <col />
            <col style={{ width: '8rem' }} />
            <col style={{ width: '8rem' }} />
            <col style={{ width: '10rem' }} />
            <col style={{ width: '5rem' }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-primary)' }}>
              <th className="px-3 py-2.5">
                <input type="checkbox"
                  checked={indices.every(i => selectedItems.has(i))}
                  onChange={(e) => setIndicesSelected(indices, e.target.checked)}
                  className="w-4 h-4 cursor-pointer" />
              </th>
              {['Date', 'Description', 'Amount', 'Type', 'Category', 'Conf.'].map(h => (
                <th key={h} className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide theme-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ backgroundColor: 'var(--color-card-bg)' }}>
            {indices.map(index => { const item = editableData[index]; return (
              <tr
                key={index}
                style={{
                  backgroundColor: selectedItems.has(index) ? 'color-mix(in srgb, var(--color-accent-primary) 5%, var(--color-card-bg))' : undefined,
                  borderTop: '1px solid var(--color-border-primary)',
                }}
              >
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selectedItems.has(index)}
                    onClick={(e) => handleItemCheckboxClick(index, e)}
                    className="w-4 h-4 cursor-pointer" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="date" value={item.date}
                    onChange={(e) => handleFieldChange(index, 'date', e.target.value)}
                    className="input-field theme-input w-full text-xs py-1" style={{ colorScheme: 'auto' }} />
                </td>
                <td className="px-2 py-1.5">
                  <div className="relative group">
                    <input type="text" value={item.description}
                      onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                      className="input-field theme-input w-full text-xs py-1 truncate"
                      placeholder="Description" title={item.description} />
                    {item.description?.length > 40 && (
                      <div className="absolute bottom-full left-0 mb-1.5 px-2.5 py-1.5 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-30 max-w-sm whitespace-normal pointer-events-none"
                        style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-primary)' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  {renderTransferBadge(index)}
                </td>
                <td className="px-2 py-1.5">
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs theme-text-muted pointer-events-none">₹</span>
                    <input type="number" value={item.amount}
                      onChange={(e) => handleFieldChange(index, 'amount', Number(e.target.value))}
                      className="input-field theme-input w-full text-xs py-1 pl-6"
                      min="0" step="0.01" />
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <select value={item.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      handleFieldChange(index, 'type', newType);
                      handleFieldChange(index, 'category', categories.length > 0 ? 'uncategorized' : (getCategoryOptions(newType)[0] || ''));
                    }}
                    className="w-full text-xs font-medium rounded-lg px-2 py-1 transition-colors"
                    style={getTypeStyle(item.type)}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="investment">Investment</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <InlineCategoryEditor
                    currentCategory={item.category || 'uncategorized'}
                    onSave={(categoryId) => handleFieldChange(index, 'category', categoryId)}
                    renderTrigger={(onClick) => {
                      const cat = categories.find(c => c.id === item.category);
                      return (
                        <button type="button" onClick={onClick}
                          className="w-full flex items-center justify-between text-xs rounded-lg px-2 py-1 transition-colors"
                          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
                          <span className="flex items-center gap-1 truncate">
                            <span>{cat?.icon || '❓'}</span>
                            <span className="truncate">{cat?.name || 'Uncategorized'}</span>
                          </span>
                          <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                      );
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full" style={getConfidenceStyle(item.confidence)}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInsuranceItem = (item: any, index: number) => (
    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedItems.has(index)}
            onChange={() => handleItemToggle(index)}
            className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition duration-150 ease-in-out cursor-pointer"
            style={{ width: '1rem', height: '1rem' }}
          />
          <div className="flex items-center">
            {item.confidence < 0.7 && (
              <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
            )}
            <span className="font-medium text-gray-900 dark:text-white">Policy {index + 1}</span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${item.confidence >= 0.8 ? 'bg-green-100 text-green-700 dark:text-green-300' :
          item.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700 dark:text-yellow-300' :
            'bg-red-100 text-red-700 dark:text-red-300'
          }`}>
          {Math.round(item.confidence * 100)}% confident
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Name</label>
          <input
            type="text"
            value={item.policyName}
            onChange={(e) => handleFieldChange(index, 'policyName', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <select
            value={item.type}
            onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          >
            <option value="term">Term</option>
            <option value="endowment">Endowment</option>
            <option value="health">Health</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Amount</label>
          <input
            type="number"
            value={item.coverAmount}
            onChange={(e) => handleFieldChange(index, 'coverAmount', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Premium Amount</label>
          <input
            type="number"
            value={item.premiumAmount}
            onChange={(e) => handleFieldChange(index, 'premiumAmount', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>
    </div>
  );

  const findAccount = (id: string) => accounts.find(a => a.id === id) || contextAccounts.find(a => a.id === id);
  const accountLabel = (account: BankAccount) => `${account.bank} ••••${accountLast4(account) || account.number?.slice(-4)}`;

  const renderAccountTrigger = (currentAccountId: string, highlightMissing = false) => (onClick: (e: React.MouseEvent) => void) => {
    const selected = findAccount(currentAccountId);
    const missing = highlightMissing && !selected;
    return (
      <button type="button" onClick={onClick}
        className="flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-sm transition-colors"
        style={{
          backgroundColor: missing ? 'color-mix(in srgb, #b45309 8%, var(--color-bg-secondary))' : 'var(--color-bg-secondary)',
          border: `1px solid ${missing ? 'color-mix(in srgb, #b45309 45%, transparent)' : 'var(--color-border-primary)'}`,
          color: 'var(--color-text-primary)'
        }}>
        <span className="flex items-center gap-2 truncate">
          <span>{selected?.logo || '🏦'}</span>
          <span className="truncate">{selected ? `${selected.bank} ••••${selected.number?.slice(-4)}` : 'Select account'}</span>
        </span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
      </button>
    );
  };

  // --- Multi-account statements ---

  type GroupStatus = 'linked' | 'unlinked' | 'skipped' | 'empty';
  const getGroupStatus = (section: StatementSectionInfo): GroupStatus => {
    if (skippedGroups.has(section.id)) return 'skipped';
    if ((sectionIndices[section.id] || []).length === 0) return 'empty';
    return groupAccountIds[section.id] && findAccount(groupAccountIds[section.id]) ? 'linked' : 'unlinked';
  };

  const showGroup = (sectionId: string) => {
    setExpandedGroups(prev => new Set(prev).add(sectionId));
    requestAnimationFrame(() => {
      groupRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const toggleGroupExpanded = (sectionId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
      return next;
    });
  };

  const linkGroup = (sectionId: string, id: string) => setGroupAccountIds(prev => ({ ...prev, [sectionId]: id }));

  const openAddAccount = (sectionId: string) => {
    setAddAccountError('');
    setAddAccountSectionId(sectionId);
  };

  const handleCreateAccount = async (accountData: Omit<BankAccount, 'id'>) => {
    const sectionId = addAccountSectionId;
    if (!sectionId) return;
    const id = await addBankAccount(accountData);
    if (!id) {
      setAddAccountError("Couldn't create the account. Please try again.");
      return;
    }
    linkGroup(sectionId, id);
    setSkippedGroups(prev => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
    setAddAccountSectionId(null);
  };

  // Prefill for "Add new account" from what the statement says about this account
  const getNewAccountDefaults = (section: StatementSectionInfo) => {
    const printed = section.accountNumber || '';
    const digits = printed.replace(/\D/g, '');
    const fullNumberKnown = !/[^\d\s-]/.test(printed) && digits.length >= 9;
    const bank = section.bankName && section.bankName !== 'Generic Import' ? section.bankName : undefined;

    // The app's balance is starting balance + imported transactions, so start from the opening
    // balance and the account lands on the statement's closing balance after this import.
    // "Historical data" keeps the balance as entered, so start from the closing balance then.
    const allRowsNet = (sectionIndices[section.id] || []).reduce((sum, i) => {
      const row = editableData[i];
      return sum + (row.type === 'income' ? 1 : -1) * (Number(row.amount) || 0);
    }, 0);
    const closing = section.closingBalance;
    const opening = section.openingBalance ?? (closing !== undefined ? Math.round((closing - allRowsNet) * 100) / 100 : undefined);
    const initialBalance = isHistorical ? closing : opening;
    let balanceHint: string | undefined;
    if (closing !== undefined) {
      balanceHint = isHistorical
        ? `Statement closing balance (${formatCurrency(closing)}). "Historical data" is on, so importing won't change it.`
        : `Opening balance from the statement. After importing it, the account will show the closing balance, ${formatCurrency(closing)}.`;
    }

    return {
      bank,
      accountNumber: fullNumberKnown ? digits : section.accountLast4,
      initialBalance,
      balanceHint
    };
  };

  const renderGroupStatus = (section: StatementSectionInfo, compact = false) => {
    const status = getGroupStatus(section);
    if (status === 'linked') {
      const account = findAccount(groupAccountIds[section.id])!;
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium min-w-0" style={{ color: 'var(--color-success)' }}>
          <Check className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">→ {accountLabel(account)}</span>
        </span>
      );
    }
    if (status === 'skipped') {
      return <span className="text-xs font-medium theme-text-muted">Skipped</span>;
    }
    if (status === 'empty') {
      return <span className="text-xs theme-text-muted">No transactions</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ color: 'var(--color-warning, #b45309)', backgroundColor: 'color-mix(in srgb, #b45309 12%, transparent)', border: '1px solid color-mix(in srgb, #b45309 30%, transparent)' }}>
        <AlertTriangle className="w-3 h-3" />
        {compact ? 'Not linked' : 'Not linked to an account'}
      </span>
    );
  };

  const renderAccountPicker = (section: StatementSectionInfo) => (
    <InlineAccountPicker
      currentAccountId={groupAccountIds[section.id] || ''}
      onSave={(id) => linkGroup(section.id, id)}
      onAddNew={() => openAddAccount(section.id)}
      renderTrigger={renderAccountTrigger(groupAccountIds[section.id] || '', true)}
    />
  );

  // One card per account in the PDF: what it holds and where it will be imported
  const renderAccountMappingStrip = () => (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold theme-text-primary">
          This PDF contains {sections!.length} accounts
        </h3>
        <span className="text-xs theme-text-muted">Link each one to an account in the app, or skip it</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sections!.map(section => {
          const indices = sectionIndices[section.id];
          const status = getGroupStatus(section);
          const summary = summarizeGroup(indices);
          const borderColor = status === 'unlinked'
            ? 'color-mix(in srgb, #b45309 45%, transparent)'
            : status === 'linked' ? 'color-mix(in srgb, var(--color-success) 35%, var(--color-border-primary))' : 'var(--color-border-primary)';
          return (
            <div key={section.id}
              role="button"
              tabIndex={0}
              onClick={() => showGroup(section.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showGroup(section.id); } }}
              className="rounded-xl p-3 space-y-1.5 cursor-pointer transition-colors text-left"
              style={{ backgroundColor: 'var(--color-card-bg)', border: `1px solid ${borderColor}`, opacity: status === 'skipped' ? 0.65 : 1 }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold theme-text-primary">{section.accountNumberMasked}</span>
                <span className="text-xs theme-text-muted">
                  {indices.length} {indices.length === 1 ? 'txn' : 'txns'}
                  {summary.selected !== indices.length && status !== 'skipped' && ` · ${summary.selected} selected`}
                </span>
              </div>
              {status !== 'skipped' && indices.length > 0 && (
                <p className="text-xs theme-text-muted">
                  in <span style={{ color: 'var(--color-success)' }}>{formatCurrency(summary.income)}</span>
                  {' / '}out <span style={{ color: 'var(--color-error)' }}>{formatCurrency(summary.spending)}</span>
                  {summary.transferCount > 0 && <> · {summary.transferCount} {summary.transferCount === 1 ? 'transfer' : 'transfers'}</>}
                </p>
              )}
              <div className="flex items-center justify-between gap-2 min-h-[1.75rem]">
                <div className="min-w-0">{renderGroupStatus(section, true)}</div>
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {status === 'unlinked' && (
                    <button type="button" onClick={() => openAddAccount(section.id)}
                      className="text-xs px-2 py-1 rounded-lg btn-secondary !py-1 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add account
                    </button>
                  )}
                  {status === 'skipped' && (
                    <button type="button" onClick={() => toggleGroupSkipped(section.id)}
                      className="text-xs px-2 py-1 rounded-lg btn-secondary !py-1">Include</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAccountGroups = () => (
    <div className="space-y-4">
      {renderAccountMappingStrip()}

      {sections!.map(section => {
        const indices = sectionIndices[section.id];
        const skipped = skippedGroups.has(section.id);
        const expanded = expandedGroups.has(section.id) && !skipped;
        const status = getGroupStatus(section);
        const summary = summarizeGroup(indices);
        const hasBalances = section.openingBalance !== undefined || section.closingBalance !== undefined;
        const counts = [
          summary.incomeCount > 0 && `${summary.incomeCount} income`,
          summary.expenseCount > 0 && `${summary.expenseCount} ${summary.expenseCount === 1 ? 'expense' : 'expenses'}`,
          summary.investmentCount > 0 && `${summary.investmentCount} ${summary.investmentCount === 1 ? 'investment' : 'investments'}`,
          summary.transferCount > 0 && `${summary.transferCount} ${summary.transferCount === 1 ? 'transfer' : 'transfers'}`,
        ].filter(Boolean).join(' · ');
        return (
          <div key={section.id}
            ref={(el) => { groupRefs.current[section.id] = el; }}
            className="rounded-xl scroll-mt-2"
            style={{
              border: `1px solid ${status === 'unlinked' ? 'color-mix(in srgb, #b45309 45%, transparent)' : 'var(--color-border-primary)'}`,
              opacity: skipped ? 0.65 : 1
            }}>
            {/* Group header */}
            <div className="p-3 sm:px-4 flex items-start justify-between gap-3 flex-wrap rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <button type="button"
                onClick={() => !skipped && indices.length > 0 && toggleGroupExpanded(section.id)}
                className="flex items-start gap-2 min-w-0 flex-1 text-left"
                aria-expanded={expanded}>
                {indices.length > 0 && !skipped && (
                  expanded
                    ? <ChevronDown className="w-4 h-4 mt-0.5 flex-shrink-0 theme-text-muted" />
                    : <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 theme-text-muted" />
                )}
                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-sm font-semibold theme-text-primary">
                    Account {section.accountNumberMasked} — {indices.length} {indices.length === 1 ? 'transaction' : 'transactions'}
                  </h3>
                  <div>{renderGroupStatus(section)}</div>
                  {!skipped && summary.selected > 0 && (
                    <p className="text-xs theme-text-muted">
                      {counts}
                      {' · '}in <span style={{ color: 'var(--color-success)' }}>{formatCurrency(summary.income)}</span>
                      {' · '}out <span style={{ color: 'var(--color-error)' }}>{formatCurrency(summary.spending)}</span>
                      {summary.transferCount > 0 && <> · transfers {formatCurrency(summary.transferIn)} in / {formatCurrency(summary.transferOut)} out</>}
                    </p>
                  )}
                  {hasBalances && (
                    <p className="text-xs theme-text-muted">
                      {section.openingBalance !== undefined && <>Opening {formatCurrency(section.openingBalance)}</>}
                      {section.openingBalance !== undefined && section.closingBalance !== undefined && ' · '}
                      {section.closingBalance !== undefined && <>Closing {formatCurrency(section.closingBalance)}</>}
                    </p>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!skipped && indices.length > 0 && (
                  <div className="flex-1 sm:flex-none sm:w-64 min-w-0">
                    {renderAccountPicker(section)}
                  </div>
                )}
                {indices.length > 0 && (
                  <button type="button" onClick={() => toggleGroupSkipped(section.id)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-colors btn-secondary !py-1 flex-shrink-0">
                    {skipped ? 'Include' : 'Skip'}
                  </button>
                )}
              </div>
            </div>

            {status === 'unlinked' && (
              <div className="px-3 sm:px-4 pt-2 flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--color-warning, #b45309)' }}>
                <span>Pick the account these transactions belong to, or</span>
                <button type="button" onClick={() => openAddAccount(section.id)}
                  className="inline-flex items-center gap-1 font-semibold underline">
                  <Plus className="w-3 h-3" /> add it as a new account
                </button>
              </div>
            )}

            {expanded && (
              <div className="p-3 sm:p-4 space-y-3">
                {section.warnings.length > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
                    style={{ color: 'var(--color-warning, #b45309)', backgroundColor: 'color-mix(in srgb, #b45309 10%, transparent)', border: '1px solid color-mix(in srgb, #b45309 25%, transparent)' }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      {section.warnings.map((warning, i) => <p key={i}>{warning}</p>)}
                    </div>
                  </div>
                )}
                {renderTransactionTable(indices)}
              </div>
            )}
            {skipped && (
              <p className="px-3 sm:px-4 py-2 text-xs theme-text-muted">Skipped — these transactions won't be imported.</p>
            )}
            {!expanded && !skipped && indices.length > 0 && (
              <button type="button" onClick={() => toggleGroupExpanded(section.id)}
                className="w-full px-3 sm:px-4 py-2 text-xs text-left font-medium"
                style={{ color: 'var(--color-accent-primary)' }}>
                Show {indices.length} {indices.length === 1 ? 'transaction' : 'transactions'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const addAccountSection = isMultiAccount ? sections!.find(s => s.id === addAccountSectionId) : undefined;

  // Per-account totals - income and spending of different accounts are never added together
  const renderMultiAccountFooterSummary = () => (
    <div className="space-y-0.5 text-xs theme-text-secondary">
      {sections!.map(section => {
        const status = getGroupStatus(section);
        if (status === 'empty') return null;
        const summary = summarizeGroup(sectionIndices[section.id]);
        if (status === 'skipped') {
          return <p key={section.id} className="theme-text-muted">{section.accountNumberMasked} skipped</p>;
        }
        if (status === 'unlinked' && summary.selected > 0) {
          return (
            <button key={section.id} type="button" onClick={() => showGroup(section.id)}
              className="block text-left font-medium underline" style={{ color: 'var(--color-warning, #b45309)' }}>
              {section.accountNumberMasked}: link {summary.selected} {summary.selected === 1 ? 'transaction' : 'transactions'} to an account, or skip
            </button>
          );
        }
        if (summary.selected === 0) {
          return <p key={section.id} className="theme-text-muted">{section.accountNumberMasked}: nothing selected</p>;
        }
        const account = findAccount(groupAccountIds[section.id]);
        return (
          <p key={section.id} className="truncate">
            Importing <strong className="theme-text-primary">{summary.selected}</strong> → {account ? accountLabel(account) : section.accountNumberMasked}
            <span className="theme-text-muted" title="Change in this account's balance from these transactions"> · net {formatSigned(summary.net)}</span>
          </p>
        );
      })}
      {selectedCount === 0 && (
        <p style={{ color: 'var(--color-warning, #b45309)' }}>Select at least one transaction to import.</p>
      )}
    </div>
  );

  const renderContent = () => {
    if (isMultiAccount) {
      return renderAccountGroups();
    }
    if (type === 'transactions') {
      return renderTransactionTable(editableData.map((_, index) => index));
    }

    // For assets and insurance, keep the original card layout
    return (
      <div className="space-y-4">
        {editableData.map((item, index) => {
          switch (type) {
            case 'assets':
              return renderAssetItem(item, index);
            case 'insurance':
              return renderInsuranceItem(item, index);
            default:
              return null;
          }
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      {/* Phones: full-screen sheet (dvh so the footer isn't hidden behind iOS browser chrome) */}
      <div className="sm:rounded-2xl max-w-7xl w-full h-screen supports-[height:100dvh]:h-[100dvh] sm:h-auto max-h-screen supports-[height:100dvh]:max-h-[100dvh] sm:max-h-[95vh] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)' }}>

        {/* Header */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold theme-text-primary">{title}</h2>
              <p className="text-sm theme-text-muted mt-0.5">Review and edit before saving to your account</p>
              {isMultiAccount ? (
                <p className="mt-2 text-xs theme-text-muted">
                  This PDF was split into {sections!.length} accounts ({sections!.map(s => s.accountNumberMasked).join(', ')}). Each one is reviewed and imported separately.
                </p>
              ) : type === 'transactions' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs theme-text-muted">Account</span>
                  <div className="w-full sm:w-64 min-w-0">
                    <InlineAccountPicker
                      currentAccountId={accountId}
                      onSave={(id) => { setAccountId(id); onAccountChange?.(id); }}
                      renderTrigger={renderAccountTrigger(accountId)}
                    />
                  </div>
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {editableData.length > 0 && (
          <div className="px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-primary)' }}>
            <div className="flex items-center gap-3 text-sm flex-wrap">
              {isMultiAccount ? (
                <span className="font-medium theme-text-primary">
                  {sections!.length} accounts · {editableData.length} transactions
                </span>
              ) : (
                <span className="font-medium theme-text-primary">Found {editableData.length} {type === 'transactions' ? 'transactions' : 'items'}</span>
              )}
              {type === 'transactions' && !isMultiAccount && (
                <>
                  <span className="flex items-center gap-1 theme-text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                    Income: {editableData.filter(t => t.type === 'income').length}
                  </span>
                  <span className="flex items-center gap-1 theme-text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-error)' }} />
                    Expenses: {editableData.filter(t => t.type === 'expense').length}
                  </span>
                  <span className="flex items-center gap-1 theme-text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)' }} />
                    Investments: {editableData.filter(t => t.type === 'investment').length}
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setSelectedItems(new Set(editableData.map((_, i) => i)))}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors btn-secondary !py-1">Select All</button>
              <button onClick={() => setSelectedItems(new Set())}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors btn-secondary !py-1">Select None</button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {editableData.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="font-medium theme-text-primary">No data extracted</p>
              <p className="text-sm theme-text-muted mt-1">The AI couldn't find any relevant financial data.</p>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              {renderContent()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3 flex justify-between items-center flex-wrap gap-3"
          style={{ borderTop: '1px solid var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="space-y-1.5 min-w-0">
            {isMultiAccount ? renderMultiAccountFooterSummary() : (
              <div className="flex items-center gap-3 text-sm theme-text-secondary">
                <span>Selected: <strong className="theme-text-primary">{selectedCount}</strong> of {editableData.length}</span>
                {type === 'transactions' && selectedCount > 0 && (
                  <span>Total: <strong className="theme-text-primary">{formatCurrency(
                    importableIndices.filter(i => selectedItems.has(i)).reduce((s, i) => s + (editableData[i].amount || 0), 0)
                  )}</strong></span>
                )}
              </div>
            )}
            {type === 'transactions' && (
              <label className="flex items-center gap-2 text-xs theme-text-muted cursor-pointer">
                <input type="checkbox" checked={isHistorical} onChange={(e) => setIsHistorical(e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer" />
                Historical data (keep current balance unchanged)
              </label>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleConfirm}
              disabled={isMultiAccount
                ? selectedCount === 0 || sectionsMissingAccount.length > 0
                : selectedItems.size === 0 || (type === 'transactions' && !accountId)}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <Check className="w-4 h-4" />
              {isMultiAccount ? 'Import' : 'Add'} {selectedCount} {selectedCount === 1 ? 'Transaction' : 'Transactions'}
            </button>
          </div>
        </div>
      </div>

      {/* New bank account for a statement section (Modal portals above this dialog) */}
      {addAccountSection && (
        <Modal
          isOpen={true}
          onClose={() => setAddAccountSectionId(null)}
          title={`Add account ${addAccountSection.accountNumberMasked}`}
          size="md"
        >
          {addAccountError && (
            <p className="mb-3 text-sm" style={{ color: 'var(--color-error)' }}>{addAccountError}</p>
          )}
          <BankAccountForm
            key={addAccountSection.id}
            defaults={getNewAccountDefaults(addAccountSection)}
            onSubmit={handleCreateAccount}
            onCancel={() => setAddAccountSectionId(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default DataConfirmationDialog;