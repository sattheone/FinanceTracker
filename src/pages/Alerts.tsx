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

    const getSeverityStyles = (severity: AlertSeverity): React.CSSProperties => {
        switch (severity) {
            case 'critical':
                return { backgroundColor: 'var(--color-error-bg)', borderColor: 'var(--color-error-border)' };
            case 'warning':
                return { backgroundColor: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' };
            case 'info':
                return { backgroundColor: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)' };
        }
    };

    const getSeverityIconStyle = (severity: AlertSeverity): React.CSSProperties => {
        switch (severity) {
            case 'critical':
                return { color: 'var(--color-error)' };
            case 'warning':
                return { color: 'var(--color-warning)' };
            case 'info':
                return { color: 'var(--color-info)' };
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
                            <p className="text-2xl font-bold" style={{ color: 'var(--color-error)' }}>
                                {allAlerts.filter(a => a.severity === 'critical' && !dismissedAlerts.has(a.id)).length}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-error-bg)' }}>
                            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--color-error)' }} />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={cn(theme.textSecondary, 'text-sm mb-1')}>Warnings</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>
                                {allAlerts.filter(a => a.severity === 'warning' && !dismissedAlerts.has(a.id)).length}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-warning-bg)' }}>
                            <Bell className="w-6 h-6" style={{ color: 'var(--color-warning)' }} />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={cn(theme.textSecondary, 'text-sm mb-1')}>Info</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--color-info)' }}>
                                {allAlerts.filter(a => a.severity === 'info' && !dismissedAlerts.has(a.id)).length}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-info-bg)' }}>
                            <Receipt className="w-6 h-6" style={{ color: 'var(--color-info)' }} />
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
                        <Check className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-success)' }} />
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
                            className="card border-l-4 transition-all"
                            style={getSeverityStyles(alert.severity)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4 flex-1">
                                    <div className="p-2 rounded-xl" style={getSeverityIconStyle(alert.severity)}>
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
