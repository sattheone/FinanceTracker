/**
 * Pairs the two sides of a transfer between the user's own accounts: money leaving one
 * account and the same amount arriving in another. Paired records point at each other
 * through `transferPairId`.
 *
 * A candidate for the other side is a record in a different account, in the opposite
 * direction, with the same amount, a few days apart and not already paired. It is "strong"
 * when the narration of either side names the other account, or when both sides are already
 * categorised as transfers and only a day or two apart. Only a single strong candidate is
 * linked automatically; anything else is offered to the user as a suggestion.
 */
import { BankAccount, Transaction } from '../types';
import { Category, isTransferTransaction } from '../constants/categories';
import { accountRefFromNumber, referencesAccount } from './ownTransferDetection';

export type TransferDirection = 'in' | 'out';

export interface TransferCandidate {
  transaction: Transaction;
  dayGap: number;
  strong: boolean;
}

// Money in for income; everything else (expense, 'transfer', ...) leaves the account,
// matching how account balances are computed
export const transferDirection = (t: Pick<Transaction, 'type'>): TransferDirection =>
  t.type === 'income' ? 'in' : 'out';

const MAX_DAY_GAP = 3;
const STRONG_DAY_GAP = 2;

const dayNumber = (date: string): number | null => {
  const day = (date || '').split('T')[0];
  const time = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(time) ? null : Math.floor(time / 86400000);
};

const cents = (amount: number) => Math.round((Number(amount) || 0) * 100);

/**
 * The other side of a transfer, when both records point at each other. A one-sided pointer
 * (the other side was deleted, unloaded or re-categorised) counts as unpaired.
 */
export function getTransferPartner(transaction: Transaction, allTransactions: Transaction[]): Transaction | undefined {
  if (!transaction.transferPairId) return undefined;
  const partner = allTransactions.find(t => t.id === transaction.transferPairId);
  return partner?.transferPairId === transaction.id ? partner : undefined;
}

const namesAccount = (description: string, account?: BankAccount) =>
  !!account?.number && referencesAccount(description || '', accountRefFromNumber(account.number));

export function findTransferCandidates(
  transaction: Transaction,
  allTransactions: Transaction[],
  accounts: BankAccount[],
  categories: Category[] = []
): TransferCandidate[] {
  if (!transaction.bankAccountId || transaction.isSplitParent) return [];
  const day = dayNumber(transaction.date);
  const amount = cents(transaction.amount);
  if (day === null || amount <= 0) return [];

  const direction = transferDirection(transaction);
  const ownAccount = accounts.find(a => a.id === transaction.bankAccountId);
  const isTransfer = isTransferTransaction(transaction, categories);

  const byId = new Map(allTransactions.map(t => [t.id, t]));
  const isPaired = (t: Transaction) => !!t.transferPairId && byId.get(t.transferPairId)?.transferPairId === t.id;

  const candidates: TransferCandidate[] = [];
  for (const other of allTransactions) {
    if (other.id === transaction.id || other.isSplitParent) continue;
    if (!other.bankAccountId || other.bankAccountId === transaction.bankAccountId) continue;
    if (isPaired(other)) continue;
    if (transferDirection(other) === direction) continue;
    if (cents(other.amount) !== amount) continue;
    const otherDay = dayNumber(other.date);
    if (otherDay === null) continue;
    const dayGap = Math.abs(otherDay - day);
    if (dayGap > MAX_DAY_GAP) continue;

    const otherAccount = accounts.find(a => a.id === other.bankAccountId);
    const narrationMatch =
      namesAccount(transaction.description, otherAccount) ||
      namesAccount(other.description, ownAccount);
    const bothTransfers = isTransfer && isTransferTransaction(other, categories) && dayGap <= STRONG_DAY_GAP;
    candidates.push({ transaction: other, dayGap, strong: narrationMatch || bothTransfers });
  }

  return candidates.sort((a, b) => Number(b.strong) - Number(a.strong) || a.dayGap - b.dayGap);
}

/** The one candidate safe to link without asking, if there is exactly one strong candidate */
export function autoPairCandidate(candidates: TransferCandidate[]): Transaction | undefined {
  const strong = candidates.filter(c => c.strong);
  return strong.length === 1 ? strong[0].transaction : undefined;
}

/**
 * An app-created other side that an incoming (imported) record stands for: same account,
 * same direction and amount, a few days apart. The import replaces it with the real record.
 */
export function findAutoCreatedCounterpart(
  incoming: Pick<Transaction, 'bankAccountId' | 'type' | 'amount' | 'date'>,
  existing: Transaction[],
  exclude: Set<string> = new Set()
): Transaction | undefined {
  if (!incoming.bankAccountId) return undefined;
  const day = dayNumber(incoming.date);
  if (day === null) return undefined;
  const amount = cents(incoming.amount);
  const direction = transferDirection(incoming);

  let best: { transaction: Transaction; gap: number } | undefined;
  for (const t of existing) {
    if (!t.transferAutoCreated || exclude.has(t.id)) continue;
    if (t.bankAccountId !== incoming.bankAccountId) continue;
    if (transferDirection(t) !== direction || cents(t.amount) !== amount) continue;
    const otherDay = dayNumber(t.date);
    if (otherDay === null) continue;
    const gap = Math.abs(otherDay - day);
    if (gap > MAX_DAY_GAP) continue;
    if (!best || gap < best.gap) best = { transaction: t, gap };
  }
  return best?.transaction;
}

/** Fields for the other side of a transfer, created in `accountId` */
export function buildTransferCounterpart(
  transaction: Transaction,
  accountId: string,
  accounts: BankAccount[]
): Omit<Transaction, 'id'> {
  const from = accounts.find(a => a.id === transaction.bankAccountId);
  const label = (a?: BankAccount) =>
    a ? `${a.bank}${a.number ? ` ••${a.number.replace(/\D/g, '').slice(-4)}` : ''}` : 'another account';
  const incoming = transferDirection(transaction) === 'out';
  return {
    date: transaction.date,
    description: incoming ? `Transfer from ${label(from)}` : `Transfer to ${label(from)}`,
    category: 'transfer',
    type: incoming ? 'income' : 'expense',
    amount: transaction.amount,
    bankAccountId: accountId,
    transferPairId: transaction.id,
    transferAutoCreated: true,
    notes: 'Added as the other side of a transfer. Replaced automatically when this account\'s statement is imported.'
  };
}
