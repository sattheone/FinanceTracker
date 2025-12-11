import { Goal, Asset } from '../types';

class GoalSIPService {
    /**
     * Update a single goal's current amount based on linked SIP assets
     * For newly linked goals, uses the current value of the SIP assets
     * For existing goals, adds SIP contributions since last update
     */
    static updateGoalFromSIPs(goal: Goal, assets: Asset[]): Goal {
        if (!goal.linkedSIPAssets || goal.linkedSIPAssets.length === 0) {
            return goal;
        }

        const totalCurrentValue = goal.linkedSIPAssets.reduce((sum, assetId) => {
            const asset = assets.find(a => a.id === assetId);
            if (asset && asset.isSIP) {
                return sum + (asset.currentValue || 0);
            }
            return sum;
        }, 0);

        return {
            ...goal,
            currentAmount: totalCurrentValue,
            lastSIPUpdate: new Date().toISOString()
        };
    }

    /**
     * Update all goals based on their linked SIP assets
     */
    static updateAllGoals(goals: Goal[], assets: Asset[]): Goal[] {
        return goals.map(goal => this.updateGoalFromSIPs(goal, assets));
    }

    /**
     * Calculate expected amount at current date based on start date and monthly contribution
     */
    static calculateExpectedAmount(
        initialAmount: number,
        monthlyContribution: number,
        expectedReturnRate: number,
        startDate: Date,
        currentDate: Date = new Date()
    ): number {
        const monthsElapsed = this.getMonthsDifference(startDate, currentDate);

        if (monthsElapsed <= 0) return initialAmount;

        const monthlyRate = expectedReturnRate / 100 / 12;

        // Future value of initial amount
        const fvInitial = initialAmount * Math.pow(1 + monthlyRate, monthsElapsed);

        // Future value of monthly contributions (SIP formula)
        const fvContributions = monthlyContribution *
            ((Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate);

        return fvInitial + fvContributions;
    }

    /**
     * Calculate required monthly contribution to reach goal
     */
    static calculateRequiredContribution(
        currentAmount: number,
        targetAmount: number,
        expectedReturnRate: number,
        monthsRemaining: number
    ): number {
        if (monthsRemaining <= 0) return 0;
        if (currentAmount >= targetAmount) return 0;

        const monthlyRate = expectedReturnRate / 100 / 12;

        // Future value of current amount
        const fvCurrent = currentAmount * Math.pow(1 + monthlyRate, monthsRemaining);

        // Remaining amount needed
        const remainingNeeded = Math.max(0, targetAmount - fvCurrent);

        if (remainingNeeded === 0) return 0;

        // Calculate required monthly SIP using PMT formula
        const requiredSIP = remainingNeeded * monthlyRate /
            (Math.pow(1 + monthlyRate, monthsRemaining) - 1);

        return Math.ceil(requiredSIP);
    }

    /**
     * Check if goal is behind schedule
     */
    static isGoalBehindSchedule(
        goal: Goal,
        startDate: Date,
        tolerance: number = 0.9 // 90% of expected is considered on track
    ): boolean {
        const expectedAmount = this.calculateExpectedAmount(
            0, // Assume starting from 0 for simplicity
            goal.monthlyContribution,
            goal.expectedReturnRate,
            startDate
        );

        return goal.currentAmount < expectedAmount * tolerance;
    }

    /**
     * Get goal status with details
     */
    static getGoalStatus(goal: Goal, startDate: Date): {
        status: 'ahead' | 'on-track' | 'behind';
        expectedAmount: number;
        difference: number;
        requiredMonthly: number;
        additionalNeeded: number;
    } {
        const now = new Date();
        const targetDate = new Date(goal.targetDate);
        const monthsRemaining = Math.max(0, this.getMonthsDifference(now, targetDate));

        const expectedAmount = this.calculateExpectedAmount(
            0,
            goal.monthlyContribution,
            goal.expectedReturnRate,
            startDate
        );

        const difference = goal.currentAmount - expectedAmount;
        const requiredMonthly = this.calculateRequiredContribution(
            goal.currentAmount,
            goal.targetAmount,
            goal.expectedReturnRate,
            monthsRemaining
        );

        const additionalNeeded = Math.max(0, requiredMonthly - goal.monthlyContribution);

        let status: 'ahead' | 'on-track' | 'behind';
        if (goal.currentAmount >= expectedAmount * 1.1) {
            status = 'ahead';
        } else if (goal.currentAmount >= expectedAmount * 0.9) {
            status = 'on-track';
        } else {
            status = 'behind';
        }

        return {
            status,
            expectedAmount,
            difference,
            requiredMonthly,
            additionalNeeded
        };
    }

    /**
     * Get total monthly SIP contribution from linked assets
     */
    static getTotalMonthlySIP(goal: Goal, assets: Asset[]): number {
        if (!goal.linkedSIPAssets || goal.linkedSIPAssets.length === 0) {
            return 0;
        }

        return goal.linkedSIPAssets.reduce((total, assetId) => {
            const asset = assets.find(a => a.id === assetId);
            if (asset && asset.isSIP && asset.sipAmount) {
                return total + asset.sipAmount;
            }
            return total;
        }, 0);
    }

    /**
     * Helper: Calculate months difference between two dates
     */
    private static getMonthsDifference(startDate: Date, endDate: Date): number {
        const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
        const monthsDiff = endDate.getMonth() - startDate.getMonth();
        return yearsDiff * 12 + monthsDiff;
    }
}

export default GoalSIPService;
