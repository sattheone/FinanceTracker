import { Transaction } from '../types';

export interface TransferPair {
    outflow: Transaction;
    inflow: Transaction;
    confidence: number; // 0-1
}

class TransferDetectionService {
    /**
     * Detects potential internal transfers between accounts.
     * Logic:
     * 1. Same amount (one positive, one negative)
     * 2. Date within 24-48 hours
     * 3. Different accounts
     * 4. Not already categorized as 'transfer'
     */
    static detectTransfers(transactions: Transaction[]): TransferPair[] {
        const pairs: TransferPair[] = [];
        const processedIds = new Set<string>();

        // Sort by date
        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (let i = 0; i < sorted.length; i++) {
            const t1 = sorted[i];
            if (processedIds.has(t1.id)) continue;
            if (t1.category === 'transfer') continue; // Already marked

            // Look ahead for a match
            for (let j = i + 1; j < sorted.length; j++) {
                const t2 = sorted[j];
                if (processedIds.has(t2.id)) continue;
                if (t2.category === 'transfer') continue;

                // Check date difference (max 2 days)
                const d1 = new Date(t1.date).getTime();
                const d2 = new Date(t2.date).getTime();
                const diffHours = Math.abs(d2 - d1) / (1000 * 60 * 60);

                if (diffHours > 48) break; // Sorted by date, so we can stop looking

                // Check types (one income, one expense)
                if (t1.type === t2.type) continue;

                // Check amounts (must be equal)
                if (Math.abs(t1.amount) !== Math.abs(t2.amount)) continue;

                // Check accounts (must be different if bankAccountId is present)
                if (t1.bankAccountId && t2.bankAccountId && t1.bankAccountId === t2.bankAccountId) continue;

                // Found a match!
                const outflow = t1.type === 'expense' ? t1 : t2;
                const inflow = t1.type === 'expense' ? t2 : t1;

                pairs.push({
                    outflow,
                    inflow,
                    confidence: diffHours < 24 ? 0.9 : 0.7
                });

                processedIds.add(t1.id);
                processedIds.add(t2.id);
                break; // Stop looking for matches for t1
            }
        }

        return pairs;
    }
}

export default TransferDetectionService;
