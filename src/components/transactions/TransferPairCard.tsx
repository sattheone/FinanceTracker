import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Link2, Unlink, Plus, Loader2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { isTransferTransaction } from '../../constants/categories';
import { BankAccount, Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { findTransferCandidates, getTransferPartner, transferDirection } from '../../services/transferPairing';
import { cn } from '../../hooks/useThemeClasses';

interface TransferPairCardProps {
  transaction: Transaction;
  onTransactionClick?: (transaction: Transaction) => void;
}

const accountLabel = (account?: BankAccount) =>
  account ? `${account.bank}${account.number ? ` ••${account.number.replace(/\D/g, '').slice(-4)}` : ''}` : 'Unknown account';

/**
 * The other side of a transfer between the user's own accounts: shows the linked record, or
 * suggests matching records in other accounts, or adds the missing side.
 */
const TransferPairCard: React.FC<TransferPairCardProps> = ({ transaction, onTransactionClick }) => {
  const { transactions, bankAccounts, categories, linkTransfer, unlinkTransfer, createTransferCounterpart, deleteTransaction } = useData();
  const [busy, setBusy] = useState(false);
  const [newSideAccountId, setNewSideAccountId] = useState('');

  const partner = useMemo(() => getTransferPartner(transaction, transactions), [transaction, transactions]);
  const isTransfer = isTransferTransaction(transaction, categories);
  const candidates = useMemo(
    () => (partner || !isTransfer ? [] : findTransferCandidates(transaction, transactions, bankAccounts, categories).slice(0, 3)),
    [partner, isTransfer, transaction, transactions, bankAccounts, categories]
  );
  const otherAccounts = bankAccounts.filter(a => a.id !== transaction.bankAccountId);

  if (!isTransfer && !partner) return null;

  const run = async (action: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const outgoing = transferDirection(transaction) === 'out';
  const accountOf = (t: Transaction) => bankAccounts.find(a => a.id === t.bankAccountId);

  const row = (t: Transaction, action: React.ReactNode, chip?: React.ReactNode) => (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <button
        type="button"
        onClick={() => onTransactionClick?.(t)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{accountLabel(accountOf(t))}</span>
          {chip}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {formatDate(t.date)} · {t.description}
        </div>
      </button>
      <span className={cn(
        'text-sm font-medium shrink-0',
        t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
      )}>
        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
      </span>
      {action}
    </div>
  );

  const smallButton = 'px-2 py-1 text-xs font-medium rounded-md flex items-center gap-1 shrink-0 disabled:opacity-50';

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-900/10 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ArrowLeftRight className="w-4 h-4 text-violet-500" />
          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            {outgoing ? 'Transfer to' : 'Transfer from'}
          </h3>
        </div>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />}
      </div>

      {!transaction.bankAccountId ? (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Choose this transaction's account to find the other side of the transfer.
        </p>
      ) : partner ? (
        <>
          {row(
            partner,
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => unlinkTransfer(transaction.id))}
              className={cn(smallButton, 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700')}
              title="Unlink the two sides"
            >
              <Unlink className="w-3.5 h-3.5" /> Unlink
            </button>,
            partner.transferAutoCreated
              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0">Added by you</span>
              : undefined
          )}
          {partner.transferAutoCreated && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Importing that account's statement replaces this with the real record.{' '}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirm('Remove the other side of this transfer?')) {
                    run(() => deleteTransaction(partner.id));
                  }
                }}
                className="text-red-600 dark:text-red-400 hover:underline"
              >
                Remove it
              </button>
            </p>
          )}
        </>
      ) : (
        <>
          {candidates.length > 0 ? (
            <>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {candidates.length === 1 ? 'This looks like the other side:' : 'Possible other sides:'}
              </p>
              <div className="space-y-1.5">
                {candidates.map(c => (
                  <React.Fragment key={c.transaction.id}>
                    {row(
                      c.transaction,
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => linkTransfer(transaction.id, c.transaction.id))}
                        className={cn(smallButton, 'bg-violet-600 hover:bg-violet-700 text-white')}
                      >
                        <Link2 className="w-3.5 h-3.5" /> Link
                      </button>,
                      c.strong
                        ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 shrink-0">Likely match</span>
                        : undefined
                    )}
                  </React.Fragment>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              No matching record in your other accounts.
            </p>
          )}

          {otherAccounts.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <select
                value={newSideAccountId}
                onChange={e => setNewSideAccountId(e.target.value)}
                className="flex-1 min-w-0 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-violet-500 focus:outline-none"
              >
                <option value="">{outgoing ? 'Add it to account…' : 'Add it from account…'}</option>
                {otherAccounts.map(a => (
                  <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !newSideAccountId}
                onClick={() => run(async () => {
                  await createTransferCounterpart(transaction.id, newSideAccountId);
                  setNewSideAccountId('');
                })}
                className={cn(smallButton, 'py-1.5 bg-white dark:bg-gray-800 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30')}
              >
                <Plus className="w-3.5 h-3.5" /> Add other side
              </button>
            </div>
          )}

          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Paid someone else? Change the category: that's a payment, not a transfer.
          </p>
        </>
      )}
    </div>
  );
};

export default TransferPairCard;
