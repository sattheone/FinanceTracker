import { Transaction, CategoryRule } from '../types';

/**
 * Service for managing category rules and auto-categorization
 */
class CategoryRuleService {
    /**
     * Check if a transaction matches a rule
     */
    matchesRule(transaction: Transaction, rule: CategoryRule): boolean {
        if (!rule.isActive) return false;

        const transactionDesc = transaction.description.toLowerCase().trim();
        const ruleName = rule.name.toLowerCase().trim();

        if (rule.matchType === 'exact') {
            return transactionDesc === ruleName;
        } else {
            // Partial match - check if transaction description contains the rule pattern
            return transactionDesc.includes(ruleName);
        }
    }

    /**
     * Find all transactions that match a given rule
     */
    findMatchingTransactions(transactions: Transaction[], rule: CategoryRule): Transaction[] {
        return transactions.filter(t => this.matchesRule(t, rule));
    }

    /**
     * Apply a rule to multiple transactions (bulk update)
     */
    /**
     * Apply a rule to multiple transactions (bulk update)
     */
    applyRuleBulk(
        transactions: Transaction[],
        rule: CategoryRule,
        updateFn: (id: string, updates: Partial<Transaction>) => void
    ): number {
        const matchingTransactions = this.findMatchingTransactions(transactions, rule);

        matchingTransactions.forEach(transaction => {
            const updates: Partial<Transaction> = {};

            // Should verify if updates are needed
            let needsUpdate = false;

            if (transaction.category !== rule.categoryId) {
                updates.category = rule.categoryId;
                needsUpdate = true;
            }

            if (rule.transactionType && transaction.type !== rule.transactionType) {
                updates.type = rule.transactionType;
                needsUpdate = true;
            }

            if (needsUpdate) {
                updateFn(transaction.id, updates);
            }
        });

        return matchingTransactions.length;
    }

    /**
     * Automatically apply matching rules to a transaction
     * Returns the category ID and optional type if a rule matched, otherwise null
     */
    autoApplyRules(transaction: Transaction, rules: CategoryRule[]): { categoryId: string, transactionType?: string } | null {
        // Sort rules by most recently used first
        const sortedRules = [...rules].sort((a, b) => {
            if (!a.lastUsed) return 1;
            if (!b.lastUsed) return -1;
            return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        });

        // Find first matching rule
        for (const rule of sortedRules) {
            if (this.matchesRule(transaction, rule)) {
                return {
                    categoryId: rule.categoryId,
                    transactionType: rule.transactionType
                };
            }
        }

        return null;
    }

    /**
     * Create a new rule from a transaction
     */
    createRuleFromTransaction(
        transaction: Transaction,
        categoryId: string,
        matchType: 'exact' | 'partial' = 'partial',
        transactionType?: 'income' | 'expense' | 'investment' | 'insurance'
    ): Omit<CategoryRule, 'id'> {
        return {
            name: transaction.description,
            categoryId,
            transactionType,
            matchType,
            createdAt: new Date().toISOString(),
            matchCount: 0,
            isActive: true
        };
    }

    /**
     * Update rule usage statistics
     */
    updateRuleStats(rule: CategoryRule, matchCount: number): CategoryRule {
        return {
            ...rule,
            matchCount: rule.matchCount + matchCount,
            lastUsed: new Date().toISOString()
        };
    }

    /**
     * Get all rules that would auto-apply to new transactions
     */
    getActiveRules(rules: CategoryRule[]): CategoryRule[] {
        return rules.filter(r => r.isActive);
    }

    /**
     * Deactivate/reactivate a rule
     */
    toggleRuleStatus(rule: CategoryRule): CategoryRule {
        return {
            ...rule,
            isActive: !rule.isActive
        };
    }

    /**
     * Get rule preview stats - how many transactions would be affected
     */
    getRulePreview(transactions: Transaction[], rule: CategoryRule): {
        matchCount: number;
        sampleTransactions: Transaction[];
    } {
        const matching = this.findMatchingTransactions(transactions, rule);
        return {
            matchCount: matching.length,
            sampleTransactions: matching.slice(0, 10) // Show first 10
        };
    }
}

export default new CategoryRuleService();
