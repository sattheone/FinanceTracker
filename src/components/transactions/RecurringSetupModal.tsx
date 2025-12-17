import React, { useState, useEffect } from 'react';
import { Calendar, Repeat, Check, Trash2 } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import SidePanel from '../common/SidePanel';
import { Transaction, RecurringTransaction } from '../../types';
import { formatDate } from '../../utils/formatters';
import { calculateNextDueDate } from '../../utils/dateUtils';

interface RecurringSetupModalProps {
    transaction?: Transaction;
    recurringTransaction?: RecurringTransaction;
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: { frequency: string; interval: number; startDate: string; nextDueDate?: string }) => void;
    onDelete?: () => void;
}

const RecurringSetupModal: React.FC<RecurringSetupModalProps> = ({
    transaction,
    recurringTransaction,
    isOpen,
    onClose,
    onSave,
    onDelete
}) => {
    const theme = useThemeClasses();
    const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
    const [interval, setInterval] = useState(1);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (recurringTransaction) {
            setFrequency(recurringTransaction.frequency as any);
            setInterval(recurringTransaction.interval || 1);
            setStartDate(recurringTransaction.startDate);
        } else if (transaction) {
            setStartDate(transaction.date);
        }
    }, [recurringTransaction, transaction, isOpen]);

    const frequencies = [
        { id: 'weekly', label: 'Weekly', icon: '📅' },
        { id: 'monthly', label: 'Monthly', icon: '🗓️' },
        { id: 'yearly', label: 'Yearly', icon: '🎯' },
    ];

    const getSummaryText = () => {
        const freqLabel = frequencies.find(f => f.id === frequency)?.label;
        if (interval === 1) {
            return `Repeats ${freqLabel?.toLowerCase()} on ${formatDate(startDate)}`;
        }
        return `Repeats every ${interval} ${frequency === 'monthly' ? 'months' : frequency === 'weekly' ? 'weeks' : 'years'} on ${formatDate(startDate)}`;
    };

    const handleSave = () => {
        // Calculate correct next due date if start date is in the past
        const nextDueDate = calculateNextDueDate(startDate, frequency, interval);
        onSave({ frequency, interval, startDate, nextDueDate });
        onClose();
    };

    const handleDelete = () => {
        if (onDelete && confirm('Are you sure you want to stop this recurring transaction?')) {
            onDelete();
            onClose();
        }
    };

    const displayName = recurringTransaction?.name || transaction?.description || 'Transaction';

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={recurringTransaction ? "Edit Recurring Rule" : "Make Transaction Recurring"}
            size="md"
            footer={
                <div className="flex justify-between items-center w-full">
                    {recurringTransaction && onDelete ? (
                        <button
                            onClick={handleDelete}
                            className="text-red-600 hover:text-red-700 text-sm flex items-center px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Stop Recurring
                        </button>
                    ) : (
                        <div></div> // Spacer
                    )}

                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className={cn(theme.btnSecondary)}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className={cn(theme.btnPrimary, 'flex items-center')}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Save
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full flex-shrink-0">
                        <Repeat className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p
                            className={cn(theme.textPrimary, 'font-medium truncate')}
                            title={displayName}
                        >
                            {displayName}
                        </p>
                        <p className={cn(theme.textMuted, 'text-sm')}>
                            {recurringTransaction ? 'Edit recurring schedule' : 'Set up a recurring schedule'}
                        </p>
                    </div>
                </div>

                {/* Frequency Selection */}
                <div>
                    <label className={cn(theme.textMuted, 'block text-sm font-medium mb-2')}>Frequency</label>
                    <div className="grid grid-cols-3 gap-2">
                        {frequencies.map(freq => (
                            <button
                                key={freq.id}
                                onClick={() => setFrequency(freq.id as any)}
                                className={cn(
                                    'flex flex-col items-center justify-center p-3 rounded-lg border transition-all',
                                    frequency === freq.id
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                )}
                            >
                                <span className="text-xl mb-1">{freq.icon}</span>
                                <span className="text-sm font-medium">{freq.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Interval Selection */}
                <div>
                    <label className={cn(theme.textMuted, 'block text-sm font-medium mb-2')}>
                        Repeat Every {interval} {frequency === 'monthly' ? 'Month(s)' : frequency === 'weekly' ? 'Week(s)' : 'Year(s)'}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="12"
                        value={interval}
                        onChange={(e) => setInterval(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1</span>
                        <span>6</span>
                        <span>12</span>
                    </div>
                </div>

                {/* Start Date */}
                <div>
                    <label className={cn(theme.textMuted, 'block text-sm font-medium mb-2')}>Start Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="pl-10 w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                        />
                    </div>
                </div>

                {/* Summary */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className={cn(theme.textPrimary, 'text-sm font-medium')}>
                        {getSummaryText()}
                    </p>
                </div>
            </div>
        </SidePanel>
    );
};

export default RecurringSetupModal;
