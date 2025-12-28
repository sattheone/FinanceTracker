import { Transaction } from '../types';

/**
 * Utility to fix transactions with invalid category IDs
 */

export interface MigrationResult {
    totalTransactions: number;
    invalidTransactions: number;
    fixedTransactions: number;
    errors: string[];
}

/**
 * Check if a category ID is invalid (looks like a timestamp or other non-category value)
 */
export function isInvalidCategoryId(categoryId: string, validCategoryIds: string[]): boolean {
    // Check if it's a valid category ID
    if (validCategoryIds.includes(categoryId)) {
        return false;
    }

    // Check if it's empty or just whitespace
    const isEmpty = !categoryId || (typeof categoryId === 'string' && categoryId.trim() === '');

    // Check if it looks like a timestamp (all digits, length > 10)
    // Only test regex if it's a non-empty string
    const isTimestamp = !isEmpty && typeof categoryId === 'string' && /^\d{10,}$/.test(categoryId);

    return isTimestamp || isEmpty;
}

/**
 * Get or create the "Uncategorized" category ID
 */
export function getUncategorizedCategoryId(): string {
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');

    // Look for existing Uncategorized category
    let uncategorized = categories.find((c: any) =>
        c.name?.toLowerCase() === 'uncategorized' || c.id === 'uncategorized'
    );

    // If not found, create it
    if (!uncategorized) {
        uncategorized = {
            id: 'uncategorized',
            name: 'Uncategorized',
            color: '#6B7280',
            icon: '📋',
            isCustom: false
        };

        categories.push(uncategorized);
        localStorage.setItem('categories', JSON.stringify(categories));
    }

    return uncategorized.id;
}

/**
 * Get list of valid category IDs
 */
export function getValidCategoryIds(): string[] {
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    return categories.map((c: any) => c.id);
}

/**
 * Analyze transactions to find those with invalid categories
 */
export function analyzeTransactions(transactions: Transaction[]): {
    invalid: Transaction[];
    valid: Transaction[];
    invalidCategoryIds: Set<string>;
} {
    const validCategoryIds = getValidCategoryIds();
    const invalid: Transaction[] = [];
    const valid: Transaction[] = [];
    const invalidCategoryIds = new Set<string>();

    transactions.forEach(transaction => {
        if (isInvalidCategoryId(transaction.category, validCategoryIds)) {
            invalid.push(transaction);
            invalidCategoryIds.add(transaction.category);
        } else {
            valid.push(transaction);
        }
    });

    return { invalid, valid, invalidCategoryIds };
}

/**
 * Fix a single transaction's category
 */
export function fixTransactionCategory(
    transaction: Transaction,
    uncategorizedId: string
): Transaction {
    return {
        ...transaction,
        category: uncategorizedId
    };
}

/**
 * Main migration function - fix all transactions with invalid categories
 */
export async function migrateInvalidCategories(
    transactions: Transaction[],
    updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>
): Promise<MigrationResult> {
    const result: MigrationResult = {
        totalTransactions: transactions.length,
        invalidTransactions: 0,
        fixedTransactions: 0,
        errors: []
    };

    try {
        // Analyze transactions
        const { invalid } = analyzeTransactions(transactions);
        result.invalidTransactions = invalid.length;

        if (invalid.length === 0) {
            return result;
        }

        // Get or create uncategorized category
        const uncategorizedId = getUncategorizedCategoryId();

        // Fix each invalid transaction
        for (const transaction of invalid) {
            try {
                await updateTransaction(transaction.id, {
                    category: uncategorizedId
                });
                result.fixedTransactions++;
            } catch (error) {
                result.errors.push(`Failed to fix transaction ${transaction.id}: ${error}`);
            }
        }
    } catch (error) {
        result.errors.push(`Migration failed: ${error}`);
    }

    return result;
}

/**
 * Preview what will be migrated (for showing to user before confirming)
 */
export function previewMigration(transactions: Transaction[]): {
    affectedCount: number;
    invalidCategoryIds: string[];
    sampleTransactions: Array<{
        id: string;
        description: string;
        amount: number;
        currentCategory: string;
        date: string;
    }>;
} {
    const { invalid, invalidCategoryIds } = analyzeTransactions(transactions);

    return {
        affectedCount: invalid.length,
        invalidCategoryIds: Array.from(invalidCategoryIds),
        sampleTransactions: invalid.slice(0, 5).map(t => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            currentCategory: t.category,
            date: t.date
        }))
    };
}
