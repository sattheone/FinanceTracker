import { SIPRule, Transaction } from '../types';

class SIPRuleService {
    /**
     * Check if a transaction matches a SIP Rule
     */
    static matchesRule(transaction: Transaction, rule: SIPRule): boolean {
        if (!rule.isActive) return false;

        // 1. Amount Match
        const amountMatch = this.checkAmountMatch(transaction.amount, rule.amount, rule.amountTolerance);
        if (!amountMatch) {
            // console.log(`❌ Amount mismatch: Val=${transaction.amount} Target=${rule.amount} ±${rule.amountTolerance}%`);
            return false;
        }

        // 2. Date Match (check day of month) - Only if expectedDate is defined
        if (rule.expectedDate) {
            const dateMatch = this.checkDateMatch(transaction.date, rule.expectedDate, rule.dateTolerance || 3);
            if (!dateMatch) {
                console.log(`❌ Date mismatch: Date=${transaction.date} TargetDay=${rule.expectedDate} ±${rule.dateTolerance} days`);
                return false;
            }
        }

        // 3. Description/Merchant Match
        const descriptionMatch = this.checkDescriptionMatch(transaction.description, rule.descriptionPattern, rule.matchType);
        if (!descriptionMatch) {
            // console.log(`❌ Description mismatch: "${transaction.description}" vs "${rule.descriptionPattern}" (${rule.matchType})`);
            return false;
        }

        return true;
    }

    /**
     * Find the best matching rule for a transaction
     * Prioritizes:
     * 1. Priority field (highest first)
     * 2. Specificity (Exact > Partial)
     * 3. Tolerance tightness (smaller tolerance is better)
     */
    static findBestMatch(transaction: Transaction, rules: SIPRule[]): SIPRule | null {
        const matchingRules = rules.filter(rule => this.matchesRule(transaction, rule));

        if (matchingRules.length === 0) return null;

        // Sort to find the best match
        matchingRules.sort((a, b) => {
            // 1. Priority
            if ((b.priority || 0) !== (a.priority || 0)) {
                return (b.priority || 0) - (a.priority || 0);
            }

            // 2. Match Type Specificity
            if (a.matchType !== b.matchType) {
                if (a.matchType === 'equals') return -1;
                if (b.matchType === 'equals') return 1;
            }

            // 3. Amount Tolerance (tighter is better)
            if (a.amountTolerance !== b.amountTolerance) {
                return a.amountTolerance - b.amountTolerance;
            }

            return 0;
        });

        return matchingRules[0];
    }

    /**
     * Helper: Check amount match with tolerance
     */
    private static checkAmountMatch(actual: number, target: number, tolerancePercent: number): boolean {
        const toleranceAmount = target * (tolerancePercent / 100);
        const min = target - toleranceAmount;
        const max = target + toleranceAmount;
        return actual >= min && actual <= max;
    }

    /**
     * Helper: Check date match (day of month) with tolerance
     */
    private static checkDateMatch(dateStr: string, targetDay: number, toleranceDays: number): boolean {
        const date = new Date(dateStr);
        const day = date.getDate();

        // Simple check for within month
        if (Math.abs(day - targetDay) <= toleranceDays) return true;

        // Handle month boundaries (e.g. 1st vs 31st)
        // Check prev month end
        // This is complex, simplistic approach for now:
        // If target is late month (e.g. 28+) and actual is early (e.g. 1-3)
        // Or target is early (e.g. 1-3) and actual is late
        // For MVP, simple day diff is usually enough as SIPs happen same time
        return false;
    }

    /**
     * Helper: Check description match
     */
    private static checkDescriptionMatch(description: string, pattern: string, matchType: SIPRule['matchType']): boolean {
        const normalizedDesc = description.toLowerCase();
        const normalizedPattern = pattern.toLowerCase();

        switch (matchType) {
            case 'equals':
                return normalizedDesc === normalizedPattern;
            case 'contains':
                return normalizedDesc.includes(normalizedPattern);
            case 'regex':
                try {
                    const regex = new RegExp(pattern, 'i');
                    return regex.test(description);
                } catch (e) {
                    console.error('Invalid Regex in SIP Rule:', pattern);
                    return false;
                }
            default:
                return false;
        }
    }
}

export default SIPRuleService;
