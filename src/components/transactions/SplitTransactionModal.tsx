import React, { useEffect, useMemo, useState } from 'react';
import { X, Check } from 'lucide-react';
import { Transaction } from '../../types';
import { useData } from '../../contexts/DataContext';
// no theme hooks needed
import InlineCategoryEditor from './InlineCategoryEditor';
import { formatCurrency } from '../../utils/formatters';

interface SplitRow {
  id: string;
  amount: number;
  amountStr?: string; // for input display, allows empty
  category: string;
}

interface SplitTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
}

const SplitTransactionModal: React.FC<SplitTransactionModalProps> = ({ isOpen, onClose, transaction }) => {
  const { addTransaction, updateTransaction, deleteTransaction, transactions: allTransactions } = useData();
  //

  const [rows, setRows] = useState<SplitRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [baseAmount, setBaseAmount] = useState<number>(transaction.amount);
  // Reserved for future: disable inputs during save if we keep modal open

  useEffect(() => {
    if (!isOpen) return;
    const edit = !!transaction.splitGroupId || !!transaction.isSplitParent || !!transaction.splitParentId;
    setIsEditMode(edit);
    if (!edit) {
      // Initialize rows: full amount + original category, and an empty uncategorized row
      setRows([
        {
          id: 'row-1',
          amount: transaction.amount,
          amountStr: String(transaction.amount),
          category: transaction.category,
        },
        {
          id: 'row-2',
          amount: 0,
          amountStr: '',
          category: 'uncategorized',
        },
      ]);
      setBaseAmount(transaction.amount);
      setError(null);
      return;
    }

    // Edit mode: reconstruct rows from existing children and parent
    const parent = transaction.isSplitParent
      ? transaction
      : transaction.splitParentId
        ? (allTransactions.find(t => t.id === transaction.splitParentId) || transaction)
        : transaction;
    const groupId = transaction.splitGroupId || parent.splitGroupId || '';
    const children = groupId
      ? allTransactions
          .filter(t => t.splitGroupId === groupId && !t.isSplitParent)
          .sort((a, b) => {
            const ao = (a as any).splitOrder ?? 0;
            const bo = (b as any).splitOrder ?? 0;
            if (ao !== bo) return ao - bo;
            // fallback stable ordering by amount then category name
            if ((a.amount || 0) !== (b.amount || 0)) return (a.amount || 0) - (b.amount || 0);
            return String(a.category).localeCompare(String(b.category));
          })
      : [];
    const assigned = children.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const originalAmount = parent.originalAmount ?? (assigned || transaction.amount);

    // Choose a primary child (prefer one that matches the parent category) to represent the auto-balance first row
    const primaryChild = children.find(c => c.category === parent.category) || children[0];
    const others = primaryChild ? children.filter(c => c !== primaryChild) : [];
    const othersTotal = others.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const firstAmount = Math.max(0, originalAmount - othersTotal);

    const initialRows: SplitRow[] = [];
    // Always include auto-balance row-1 using parent category
    initialRows.push({ id: 'row-1', amount: firstAmount, amountStr: String(firstAmount), category: parent.category });
    // Add the remaining children as editable rows
    initialRows.push(...others.map((c, idx) => ({ id: `row-child-${idx + 1}`, amount: c.amount, amountStr: String(c.amount), category: c.category })));
    // If there were no children at all, provide a placeholder editable row
    if (children.length === 0) {
      initialRows.push({ id: 'row-2', amount: 0, amountStr: '', category: 'uncategorized' });
    }

    setRows(initialRows);
    setBaseAmount(originalAmount);
    setError(null);
  }, [isOpen, transaction, allTransactions]);

  const totalAssigned = useMemo(() => rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0), [rows]);
  // Remaining shown via validation message; no need to store separately

  const updateRowAmount = (id: string, raw: string) => {
    // Auto-balance: first row amount is derived from others and not directly editable
    if (id === 'row-1') return;
    setRows(prev => {
      // update the edited row string and numeric value (empty string -> 0)
      const updated = prev.map(r => (
        r.id === id
          ? { ...r, amountStr: raw, amount: Math.max(0, raw === '' ? 0 : Number(raw) || 0) }
          : r
      ));
      // recompute first row as total minus others
      const othersTotal = updated
        .filter(r => r.id !== 'row-1')
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const firstIdx = updated.findIndex(r => r.id === 'row-1');
      if (firstIdx !== -1) {
        const firstAmount = Math.max(0, baseAmount - othersTotal);
        updated[firstIdx] = { ...updated[firstIdx], amount: firstAmount, amountStr: String(firstAmount) };
      }
      return updated;
    });
  };

  const updateRowCategory = (id: string, catId: string) => {
    // Keep first row's category fixed to the parent category
    if (id === 'row-1') return;
    setRows(prev => prev.map(r => (r.id === id ? { ...r, category: catId } : r)));
  };

  const addRow = () => {
    const newId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRows(prev => {
      const next = [...prev, { id: newId, amount: 0, amountStr: '', category: 'uncategorized' }];
      const othersTotal = next.filter(r => r.id !== 'row-1').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const firstIdx = next.findIndex(r => r.id === 'row-1');
      if (firstIdx !== -1) {
        const firstAmount = Math.max(0, baseAmount - othersTotal);
        next[firstIdx] = { ...next[firstIdx], amount: firstAmount, amountStr: String(firstAmount) };
      }
      return next;
    });
  };

  const removeRow = (id: string) => {
    // Remove any non-first row and recompute first row after removal
    setRows(prev => {
      const next = prev.filter(r => r.id !== id);
      const othersTotal = next.filter(r => r.id !== 'row-1').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const firstIdx = next.findIndex(r => r.id === 'row-1');
      if (firstIdx !== -1) {
        const firstAmount = Math.max(0, baseAmount - othersTotal);
        next[firstIdx] = { ...next[firstIdx], amount: firstAmount, amountStr: String(firstAmount) };
      }
      return next;
    });
  };

  const handleSave = async () => {
    // Use parent's original amount for validation in both create and edit flows
    const isEditMode = !!transaction.splitGroupId || !!transaction.isSplitParent || !!transaction.splitParentId;
    const parent = transaction.isSplitParent
      ? transaction
      : transaction.splitParentId
        ? (allTransactions.find(t => t.id === transaction.splitParentId) || transaction)
        : transaction;
    const groupIdExisting = transaction.splitGroupId || parent.splitGroupId || '';
    const existingChildren = groupIdExisting
      ? allTransactions.filter(t => t.splitGroupId === groupIdExisting && !t.isSplitParent)
      : [];
    const assignedExisting = existingChildren.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const originalAmount = parent.originalAmount ?? (isEditMode ? (assignedExisting || transaction.amount) : transaction.amount);

    const diff = originalAmount - totalAssigned;
    if (Math.abs(diff) > 0.001) {
      if (diff > 0) {
        setError(`You have ₹${diff.toFixed(2)} left to assign`);
      } else {
        setError(`Over-assigned by ₹${Math.abs(diff).toFixed(2)} — reduce a row`);
      }
      return;
    }

    try {
      setError(null);
      // Normalize amounts from amountStr to avoid stale numeric state
      const normalizedRows = rows.map(r => {
        if (r.id === 'row-1') {
          // row-1 already holds the auto-balanced amount and parent category
          return r;
        }
        const amt = Math.max(0, r.amountStr === '' ? 0 : Number(r.amountStr ?? r.amount) || 0);
        return { ...r, amount: amt };
      });
      // Include row-1 as a child part if its amount > 0, so the split creates all parts
      const childrenRows = normalizedRows.filter(r => (r.amount || 0) > 0);

      // Debug preview message (console only)
      const summary = childrenRows.map(r => `${r.category}: ₹${(Number(r.amount)||0).toFixed(2)}`).join(' • ');
      console.log('[SplitTransactionModal] Preview to save:', childrenRows);
      console.log('[SplitTransactionModal] Summary:', summary);
      const groupId = groupIdExisting || `${parent.id}-split-${Date.now()}`;

      // Close the modal immediately to prevent intermediate UI flicker while saving
      onClose();

      // If no child rows remain, clear the split and restore parent
      if (childrenRows.length === 0) {
        // Delete all existing children
        for (const c of existingChildren) {
          await deleteTransaction(c.id);
        }
        // Restore parent to original value
        await updateTransaction(parent.id, {
          isSplitParent: false,
          splitGroupId: undefined,
          amount: originalAmount,
          originalAmount
        } as any);
        return;
      }

      // Edit mode: remove existing children so we can recreate from current rows
      if (isEditMode && existingChildren.length > 0) {
        for (const c of existingChildren) {
          await deleteTransaction(c.id);
        }
      }

      // Create child transactions for each non-zero row
      for (let i = 0; i < childrenRows.length; i++) {
        const r = childrenRows[i];
        await addTransaction({
          date: parent.date,
          description: parent.description,
          category: r.category,
          type: parent.type,
          amount: r.amount,
          bankAccountId: parent.bankAccountId,
          paymentMethod: parent.paymentMethod,
          tags: parent.tags || [],
          splitGroupId: groupId,
          splitParentId: parent.id,
          splitOrder: i + 1,
        } as any);
      }

      // Mark parent as split parent and store original amount
      await updateTransaction(parent.id, {
        isSplitParent: true,
        splitGroupId: groupId,
        amount: 0,
        originalAmount
      } as any);
      // Already closed above
    } catch (e) {
      console.error('Failed to save split transactions', e);
      setError('Failed to save split. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Centered Modal */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[720px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6">
          <p className="text-center text-xs font-semibold tracking-widest text-gray-400">SPLIT TRANSACTION</p>
          <h2 className="mt-2 text-center text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{transaction.description}</h2>
          <p className="mt-1 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(baseAmount)}</p>
          {error && (
            <div className="mt-4 mx-auto max-w-md text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Rows */}
        <div className="mt-6 px-6 pb-6 space-y-2">
          {rows.filter(r => !(isEditMode && r.id === 'row-1' && Number(r.amount) === 0)).map((row) => (
            <div
              key={row.id}
              className={`flex items-center justify-between py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700`}
            >
              {/* Amount */}
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">₹</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.id === 'row-1' ? row.amount : (row.amountStr ?? String(row.amount))}
                  placeholder={row.id === 'row-1' ? undefined : 'Enter amount'}
                  onChange={(e) => updateRowAmount(row.id, e.target.value)}
                  readOnly={row.id === 'row-1'}
                  className="no-spin w-28 text-xl font-bold bg-transparent border-none outline-none focus:ring-0 text-gray-900 dark:text-white"
                />
              </div>
              {/* Category chip */}
              <div className="flex items-center gap-2">
                <InlineCategoryEditor
                  currentCategory={row.category}
                  onSave={(catId) => updateRowCategory(row.id, catId)}
                  renderTrigger={(onClick) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (row.id !== 'row-1') onClick(e);
                      }}
                      className="flex items-center justify-center space-x-1 px-2 py-0.5 rounded-full w-fit max-w-[140px] hover:opacity-80"
                      style={{
                        backgroundColor: '#E5E7EB',
                        color: '#374151'
                      }}
                    >
                      <span className="text-xs flex-shrink-0">📋</span>
                      <span className="text-[10px] font-bold truncate uppercase tracking-wider">
                        {row.category || 'SELECT'}
                      </span>
                    </button>
                  )}
                />
                {/* Remove for any non-first row (allow when row-1 is hidden too) */}
                {row.id !== 'row-1' && (
                  <button onClick={(e) => { e.stopPropagation(); removeRow(row.id); }} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Row */}
          <div className="py-3 text-center">
            <button onClick={addRow} className="text-blue-600 hover:text-blue-700 font-semibold">+ add</button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={handleSave}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center"
          >
            <Check className="w-5 h-5 mr-2" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitTransactionModal;
