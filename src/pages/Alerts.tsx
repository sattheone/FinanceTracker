import React, { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, Bell, TrendingUp, Wallet, Receipt, X, Check } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { AlertType, AlertSeverity } from '../types';
import AlertService from '../services/AlertService';
import { formatDate } from '../utils/formatters';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';

const Alerts: React.FC = () => {
    const theme = useThemeClasses();
    const { transactions, bills, bankAccounts, monthlyBudget, loadBills, loadMonthlyBudget } = useData();
    const [filter, setFilter] = useState<'all' | AlertType>('all');
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadBills();
        loadMonthlyBudget();
    }, []);

    // Generate alerts
    const allAlerts = useMemo(() => {
        return AlertService.generateAlerts(transactions, bills, bankAccounts, monthlyBudget);
    }, [transactions, bills, bankAccounts, monthlyBudget]);

    // Filter and sort alerts
    const filteredAlerts = useMemo(() => {
        return allAlerts
            .filter(alert => !dismissedAlerts.has(alert.id))
            .filter(alert => filter === 'all' || alert.type === filter)
            .sort((a, b) => {
                // Sort by severity first
                const severityOrder = { critical: 0, warning: 1, info: 2 };
                const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
                if (severityDiff !== 0) return severityDiff;

                // Then by date
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [allAlerts, filter, dismissedAlerts]);

    const handleDismiss = (alertId: string) => {
        setDismissedAlerts(prev => new Set([...prev, alertId]));
    };

    const getAlertIcon = (type: AlertType) => {
        switch (type) {
            case 'budget_warning':
            case 'budget_exceeded':
                return <TrendingUp className="w-5 h-5" />;
            case 'unusual_spending':
                return <AlertTriangle className="w-5 h-5" />;
            case 'low_balance':
                return <Wallet className="w-5 h-5" />;
            case 'large_transaction':
                return <Receipt className="w-5 h-5" />;
            case 'bill_reminder':
            case 'bill_overdue':
                return <Bell className="w-5 h-5" />;
            default:
                return <Bell className="w-5 h-5" />;
        }
    };

    const getSeverityColor = (severity: AlertSeverity) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
            case 'warning':
                return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200';
            case 'info':
                return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
        }
    };

    const getSeverityIconColor = (severity: AlertSeverity) => {
        switch (severity) {
            case 'critical':
                return 'text-red-600 dark:text-red-400';
            case 'warning':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'info':
                return 'text-blue-600 dark:text-blue-400';
        }
    };

    const filterOptions: { value: 'all' | AlertType; label: string }[] = [
        { value: 'all', label: 'All Alerts' },
        { value: 'budget_warning', label: 'Budget Warnings' },
        { value: 'budget_exceeded', label: 'Budget Exceeded' },
        { value: 'unusual_spending', label: 'Unusual Spending' },
        { value: 'low_balance', label: 'Low Balance' },
        { value: 'large_transaction', label: 'Large Transactions' },
        { value: 'bill_reminder', label: 'Bill Reminders' },
        { value: 'bill_overdue', label: 'Overdue Bills' },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className={cn(theme.heading1, 'mb-2')}>Alerts & Notifications</h1>
                <p className={theme.textSecondary}>
                    Stay on top of your finances with smart alerts and reminders
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={cn(theme.textSecondary, 'text-sm mb-1')}>Critical Alerts</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {allAlerts.filter(a => a.severity === 'critical' && !dismissedAlerts.has(a.id)).length}
                            </p>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={cn(theme.textSecondary, 'text-sm mb-1')}>Warnings</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {allAlerts.filter(a => a.severity === 'warning' && !dismissedAlerts.has(a.id)).length}
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <Bell className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={cn(theme.textSecondary, 'text-sm mb-1')}>Info</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {allAlerts.filter(a => a.severity === 'info' && !dismissedAlerts.has(a.id)).length}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="mb-6">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as 'all' | AlertType)}
                    className={cn(theme.select, 'max-w-xs')}
                >
                    {filterOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
                {filteredAlerts.length === 0 ? (
                    <div className="card text-center py-12">
                        <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                        <h3 className={cn(theme.heading3, 'mb-2')}>All Clear!</h3>
                        <p className={theme.textSecondary}>
                            {filter === 'all'
                                ? 'No alerts at the moment. Your finances are looking good!'
                                : `No ${filterOptions.find(f => f.value === filter)?.label.toLowerCase()} to show.`
                            }
                        </p>
                    </div>
                ) : (
                    filteredAlerts.map(alert => (
                        <div
                            key={alert.id}
                            className={cn(
                                'card border-l-4 transition-all',
                                getSeverityColor(alert.severity)
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4 flex-1">
                                    <div className={cn('p-2 rounded-lg', getSeverityIconColor(alert.severity))}>
                                        {getAlertIcon(alert.type)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                            {alert.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                            {alert.message}
                                        </p>
                                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                            <span>{formatDate(alert.createdAt)}</span>
                                            {alert.category && (
                                                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                                                    {alert.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDismiss(alert.id)}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    title="Dismiss"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Alerts;
