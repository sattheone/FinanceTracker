import { Transaction } from '../types';

export interface ChitSummary {
  totalPaid: number;
  contributionCount: number;
  monthlyPaid: Record<string, number>;
  lastPaymentDate?: string;
}

export const getChitSummary = (transactions: Transaction[], chitAssetId: string): ChitSummary => {
  const linkedTransactions = transactions
    .filter(t => t.linkedAssetId === chitAssetId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let totalPaid = 0;
  const monthlyPaid: Record<string, number> = {};

  linkedTransactions.forEach(txn => {
    const amount = Math.abs(Number(txn.amount || 0));
    totalPaid += amount;

    const monthKey = new Date(txn.date).toISOString().slice(0, 7); // YYYY-MM
    monthlyPaid[monthKey] = (monthlyPaid[monthKey] || 0) + amount;
  });

  return {
    totalPaid,
    contributionCount: linkedTransactions.length,
    monthlyPaid,
    lastPaymentDate: linkedTransactions.length > 0
      ? linkedTransactions[linkedTransactions.length - 1].date
      : undefined,
  };
};
