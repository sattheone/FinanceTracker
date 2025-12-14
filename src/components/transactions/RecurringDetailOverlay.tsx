import React, { useMemo } from 'react';
import { X, Calendar, CheckCircle, Clock, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { RecurringTransaction, Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface RecurringDetailOverlayProps {
    recurringTransaction: RecurringTransaction;
    transactions: Transaction[]; // All transactions to filter history
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onMarkAsPaid: () => void; // Opens selection modal
    onUnlink: (transactionId: string) => void;
}

const RecurringDetailOverlay: React.FC<RecurringDetailOverlayProps> = ({
    recurringTransaction,
    transactions,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    onMarkAsPaid,
    onUnlink
}) => {
    const theme = useThemeClasses();

    // Filter linked transactions (History) & Fuzzy Matches
    const history = useMemo(() => {
        // Criteria for fuzzy match: Same amount, within +/- 5 days of next due date
        // Note: For history, we might want to check against *past* due dates ideally, 
        // but checking against current nextDueDate is a good start for the "current month" issue.
        // A better approach for history is: "Is unlinked AND matches amount AND matches day-of-month (roughly)"

        const nextDue = new Date(recurringTransaction.nextDueDate);

        return transactions
            .filter(t => {
                // 1. Explicit Link
                if (t.recurringTransactionId === recurringTransaction.id) return true;

                // 2. Fuzzy Match (Only if not linked to another rule)
                if (t.recurringTransactionId) return false;

                const tDate = new Date(t.date);
                // Check amount match
                if (Math.abs(t.amount - recurringTransaction.amount) > 0.01) return false;

                // Check roughly same day of month (handle month differences)
                // OR check closeness to the *current* nextDueDate (for the current month case)
                const dayDiff = Math.abs((tDate.getTime() - nextDue.getTime()) / (1000 * 3600 * 24));
                const isCloseToNextDue = dayDiff <= 5;

                // Allow if it's close to next due date (solving the "Paid but not linked" issue)
                if (isCloseToNextDue) return true;

                return false;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [recurringTransaction, transactions]);

    // Calculate stats
    const totalPaid = history.reduce((sum, t) => sum + t.amount, 0);

    // Next Due Status
    const getStatus = () => {
        const today = new Date();
        const dueDate = new Date(recurringTransaction.nextDueDate);
        const isPastDue = dueDate < today;

        // Check if paid in current cycle (simplified check)
        // Real logic handles this in parent, but for display here:
        if (isPastDue) return { label: 'Overdue', color: 'text-red-600 bg-red-100', icon: <AlertCircle className="w-4 h-4" /> };
        return { label: 'Upcoming', color: 'text-blue-600 bg-blue-100', icon: <Clock className="w-4 h-4" /> };
    };

    const status = getStatus();

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Slide-over Panel */}
            <div className={cn(
                "fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className={theme.heading3}>{recurringTransaction.name}</h2>
                            <p className={theme.textMuted}>{recurringTransaction.frequency} • {formatCurrency(recurringTransaction.amount)}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={cn(theme.card, "p-4")}>
                            <p className={theme.textMuted}>Next Due</p>
                            <div className="flex items-center space-x-2 mt-1">
                                <p className={cn(theme.textPrimary, "font-medium")}>
                                    {formatDate(recurringTransaction.nextDueDate)}
                                </p>
                                <span className={cn("px-2 py-0.5 rounded-full text-xs flex items-center gap-1", status.color)}>
                                    {status.icon} {status.label}
                                </span>
                            </div>
                        </div>
                        <div className={cn(theme.card, "p-4")}>
                            <p className={theme.textMuted}>Total Paid</p>
                            <p className={cn(theme.textPrimary, "font-medium mt-1")}>
                                {formatCurrency(totalPaid)}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                        <button
                            onClick={onMarkAsPaid}
                            className="flex-1 flex items-center justify-center space-x-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" />
                            <span>Mark as Paid</span>
                        </button>
                        <button
                            onClick={onEdit}
                            className={cn(theme.btnSecondary, "flex-1")}
                        >
                            Edit Rule
                        </button>
                    </div>

                    {/* Transaction History */}
                    <div>
                        <h3 className={cn(theme.heading3, "mb-3 flex items-center")}>
                            <Clock className="w-4 h-4 mr-2" />
                            Payment History
                        </h3>

                        {history.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <p>No linked transactions yet.</p>
                                <p className="text-sm mt-1">Click "Mark as Paid" to link a past transaction.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map(t => (
                                    <div key={t.id} className={cn(theme.card, "flex items-center justify-between p-3")}>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className={cn(theme.textPrimary, "font-medium")}>{t.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(t.date)}
                                                    {!t.recurringTransactionId && <span className="text-orange-500 ml-1">(Auto-Detected)</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(theme.textPrimary, "font-medium")}>{formatCurrency(t.amount)}</p>
                                            <button
                                                onClick={() => onUnlink(t.id)}
                                                className="text-xs text-red-500 hover:text-red-600 mt-1 flex items-center justify-end gap-1"
                                                title="Unlink from this rule"
                                            >
                                                <LinkIcon className="w-3 h-3" /> Unlink
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onDelete}
                        className="w-full py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                        <LinkIcon className="w-4 h-4" />
                        <span>Stop / Delete Recurring Rule</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default RecurringDetailOverlay;
