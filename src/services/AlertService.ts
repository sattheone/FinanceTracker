import { Alert, AlertSeverity, Transaction, Bill, BankAccount, MonthlyBudget } from '../types';

class AlertService {
    /**
     * Generate all alerts based on current financial data
     */
    static generateAlerts(
        transactions: Transaction[],
        bills: Bill[],
        bankAccounts: BankAccount[],
        monthlyBudget: MonthlyBudget
    ): Alert[] {
        const alerts: Alert[] = [];
        // const now = new Date();

        // Budget alerts
        alerts.push(...this.checkBudgetAlerts(transactions, monthlyBudget));

        // Unusual spending alerts
        alerts.push(...this.checkUnusualSpending(transactions));

        // Low balance alerts
        alerts.push(...this.checkLowBalance(bankAccounts, transactions));

        // Large transaction alerts
        alerts.push(...this.checkLargeTransactions(transactions));

        // Bill reminders
        alerts.push(...this.checkBillReminders(bills));

        return alerts.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    /**
     * Check for budget threshold warnings
     */
    private static checkBudgetAlerts(
        transactions: Transaction[],
        budget: MonthlyBudget
    ): Alert[] {
        const alerts: Alert[] = [];
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Get current month transactions
        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
            return tMonth === currentMonth && t.type === 'expense';
        });

        // Calculate total spending
        const totalSpent = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalBudget = Object.values(budget.expenses).reduce((sum, val) => sum + val, 0);
        const percentage = (totalSpent / totalBudget) * 100;

        if (totalBudget > 0) {
            if (percentage >= 120) {
                alerts.push({
                    id: `budget-exceeded-total-${currentMonth}`,
                    type: 'budget_exceeded',
                    severity: 'critical',
                    title: 'Monthly Budget Exceeded',
                    message: `You've spent ₹${totalSpent.toLocaleString()} (${percentage.toFixed(0)}%) of your ₹${totalBudget.toLocaleString()} monthly budget`,
                    amount: totalSpent,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    isDismissed: false
                });
            } else if (percentage >= 100) {
                alerts.push({
                    id: `budget-exceeded-total-${currentMonth}`,
                    type: 'budget_exceeded',
                    severity: 'warning',
                    title: 'Monthly Budget Limit Reached',
                    message: `You've reached your ₹${totalBudget.toLocaleString()} monthly budget`,
                    amount: totalSpent,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    isDismissed: false
                });
            } else if (percentage >= 80) {
                alerts.push({
                    id: `budget-warning-total-${currentMonth}`,
                    type: 'budget_warning',
                    severity: 'info',
                    title: 'Budget Warning',
                    message: `You've used ${percentage.toFixed(0)}% of your monthly budget (₹${totalSpent.toLocaleString()} of ₹${totalBudget.toLocaleString()})`,
                    amount: totalSpent,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    isDismissed: false
                });
            }
        }

        return alerts;
    }

    /**
     * Detect unusual spending patterns
     */
    private static checkUnusualSpending(transactions: Transaction[]): Alert[] {
        const alerts: Alert[] = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get last 3 months of transactions (excluding current month)
        const historicalTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            const monthsAgo = (currentYear - tDate.getFullYear()) * 12 + (currentMonth - tDate.getMonth());
            return monthsAgo > 0 && monthsAgo <= 3 && t.type === 'expense';
        });

        // Get current month transactions
        const currentMonthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth &&
                tDate.getFullYear() === currentYear &&
                t.type === 'expense';
        });

        // Calculate average spending by category
        const categoryAverages: Record<string, number> = {};
        const categoryCounts: Record<string, number> = {};

        historicalTransactions.forEach(t => {
            categoryAverages[t.category] = (categoryAverages[t.category] || 0) + t.amount;
            categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
        });

        Object.keys(categoryAverages).forEach(category => {
            categoryAverages[category] = categoryAverages[category] / Math.max(categoryCounts[category], 1);
        });

        // Check current month spending against averages
        const currentCategorySpending: Record<string, number> = {};
        currentMonthTransactions.forEach(t => {
            currentCategorySpending[t.category] = (currentCategorySpending[t.category] || 0) + t.amount;
        });

        Object.entries(currentCategorySpending).forEach(([category, spent]) => {
            const average = categoryAverages[category];
            if (average && spent > average * 2) {
                alerts.push({
                    id: `unusual-spending-${category}-${currentYear}-${currentMonth}`,
                    type: 'unusual_spending',
                    severity: 'warning',
                    title: `Unusual Spending: ${category}`,
                    message: `You've spent ₹${spent.toLocaleString()} on ${category} this month, which is ${((spent / average - 1) * 100).toFixed(0)}% more than your 3-month average of ₹${average.toLocaleString()}`,
                    category,
                    amount: spent,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    isDismissed: false
                });
            }
        });

        return alerts;
    }

    /**
     * Check for low balance warnings
     */
    private static checkLowBalance(
        bankAccounts: BankAccount[],
        transactions: Transaction[]
    ): Alert[] {
        const alerts: Alert[] = [];

        bankAccounts.forEach(account => {
            // Calculate average monthly expenses for this account
            const accountTransactions = transactions.filter(t =>
                t.bankAccountId === account.id && t.type === 'expense'
            );

            if (accountTransactions.length === 0) return;

            const totalExpenses = accountTransactions.reduce((sum, t) => sum + t.amount, 0);
            const monthsOfData = Math.max(1, accountTransactions.length / 30); // Rough estimate
            const averageMonthlyExpense = totalExpenses / monthsOfData;

            // Alert if balance is less than 10% of average monthly expenses
            const threshold = averageMonthlyExpense * 0.1;

            if (account.balance < threshold && account.balance > 0) {
                alerts.push({
                    id: `low-balance-${account.id}`,
                    type: 'low_balance',
                    severity: 'warning',
                    title: `Low Balance: ${account.bank}`,
                    message: `Your ${account.bank} account balance (₹${account.balance.toLocaleString()}) is running low`,
                    amount: account.balance,
                    relatedId: account.id,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    isDismissed: false
                });
            }
        });

        return alerts;
    }

    /**
     * Detect large transactions
     */
    private static checkLargeTransactions(transactions: Transaction[]): Alert[] {
        const alerts: Alert[] = [];
        const LARGE_TRANSACTION_THRESHOLD = 10000; // ₹10,000
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Check transactions from last 7 days
        const recentLargeTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= sevenDaysAgo &&
                t.amount >= LARGE_TRANSACTION_THRESHOLD &&
                t.type === 'expense';
        });

        recentLargeTransactions.forEach(t => {
            alerts.push({
                id: `large-transaction-${t.id}`,
                type: 'large_transaction',
                severity: 'info',
                title: 'Large Transaction Detected',
                message: `Large ${t.category} expense of ₹${t.amount.toLocaleString()}: ${t.description}`,
                category: t.category,
                amount: t.amount,
                relatedId: t.id,
                createdAt: t.date,
                isRead: false,
                isDismissed: false
            });
        });

        return alerts;
    }

    /**
     * Check for upcoming and overdue bills
     */
    private static checkBillReminders(bills: Bill[]): Alert[] {
        const alerts: Alert[] = [];
        const now = new Date();
        // const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        bills.forEach(bill => {
            if (bill.isPaid) return;

            const dueDate = new Date(bill.dueDate);
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

            if (bill.isOverdue) {
                alerts.push({
                    id: `bill-overdue-${bill.id}`,
                    type: 'bill_overdue',
                    severity: 'critical',
                    title: `Overdue Bill: ${bill.name}`,
                    message: `Your ${bill.name} payment of ₹${bill.amount.toLocaleString()} was due on ${dueDate.toLocaleDateString()}`,
                    amount: bill.amount,
                    relatedId: bill.id,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    isDismissed: false
                });
            } else if (daysUntilDue <= 3 && daysUntilDue >= 0) {
                const severity: AlertSeverity = daysUntilDue === 0 ? 'warning' : 'info';
                const dayText = daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`;

                alerts.push({
                    id: `bill-reminder-${bill.id}`,
                    type: 'bill_reminder',
                    severity,
                    title: `Bill Due: ${bill.name}`,
                    message: `${bill.name} payment of ₹${bill.amount.toLocaleString()} is due ${dayText}`,
                    amount: bill.amount,
                    relatedId: bill.id,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    isDismissed: false
                });
            }
        });

        return alerts;
    }
}

export default AlertService;
