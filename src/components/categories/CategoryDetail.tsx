import React, { useState, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { format, subMonths, isSameMonth } from 'date-fns';
import { Settings } from 'lucide-react';
import { Transaction, MonthlyBudget } from '../../types';
import { Category } from '../../constants/categories';
import { cn } from '../../hooks/useThemeClasses';
import { formatCurrency } from '../../utils/formatters';
import TransactionTable from '../transactions/TransactionTable';
import TransactionDetailOverlay from '../transactions/TransactionDetailOverlay';
import { useData } from '../../contexts/DataContext';

interface CategoryDetailProps {
    category: Category;
    transactions: Transaction[];
    monthlyBudget: MonthlyBudget | null;
    currentMonth: Date;
}

const CategoryDetail: React.FC<CategoryDetailProps> = ({
    category,
    transactions,
    monthlyBudget,
    currentMonth
}) => {
    const { updateTransaction, deleteTransaction } = useData();
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    // --- Calculations ---

    // 1. Current Month Stats
    const currentMonthStats = useMemo(() => {
        const stats = {
            spent: 0,
            budget: monthlyBudget?.categoryBudgets?.[category.id] || 0,
            count: 0
        };

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (isSameMonth(tDate, currentMonth) && t.type === 'expense') {
                stats.spent += t.amount;
                stats.count += 1;
            }
        });
        return stats;
    }, [transactions, monthlyBudget, category.id, currentMonth]);

    // 2. Chart Data (Last 6 Months)
    const chartData = useMemo(() => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(currentMonth, i);
            const label = format(date, 'MMM');

            let amount = 0;
            transactions.forEach(t => {
                const tDate = new Date(t.date);
                if (isSameMonth(tDate, date) && t.type === 'expense') {
                    amount += t.amount;
                }
            });

            data.push({
                name: label,
                amount,
                date: date, // keep full date for reference
                isCurrent: i === 0
            });
        }
        return data;
    }, [transactions, currentMonth]);

    // --- Helper for Over/Under ---
    const getBudgetStatus = () => {
        if (currentMonthStats.budget === 0) return null;
        const diff = currentMonthStats.budget - currentMonthStats.spent;
        const isOver = diff < 0;

        return {
            isOver,
            diff: Math.abs(diff),
            percent: Math.round((currentMonthStats.spent / currentMonthStats.budget) * 100)
        };
    };

    const budgetStatus = getBudgetStatus();

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Header Section */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color || '#9CA3AF' }}
                            />
                            <h2 className="text-2xl font-bold dark:text-white">{category.name}</h2>
                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400">
                                <Settings className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                        {/* Budget Status Badge */}
                        {budgetStatus ? (
                            <div className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1",
                                budgetStatus.isOver
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            )}>
                                {budgetStatus.isOver
                                    ? `Over budget by ${formatCurrency(budgetStatus.diff)}`
                                    : `${formatCurrency(budgetStatus.diff)} left`}
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400 italic mt-1 block">No budget set</span>
                        )}
                    </div>

                    <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Spent in {format(currentMonth, 'MMM')}</p>
                        <p className="text-3xl font-bold dark:text-white">{formatCurrency(currentMonthStats.spent)}</p>
                        {budgetStatus && (
                            <p className="text-sm text-gray-400 mt-1">
                                of {formatCurrency(currentMonthStats.budget)} budget
                            </p>
                        )}
                    </div>
                </div>

                {/* Chart */}
                <div className="h-48 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            {/* <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" /> */}
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                dy={10}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-gray-900 text-white text-xs py-1 px-2 rounded">
                                                {formatCurrency(payload[0].value as number)}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={32}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.isCurrent ? (category.color || '#3B82F6') : '#E5E7EB'}
                                        className="transition-all duration-300 hover:opacity-80"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 p-6">
                <TransactionTable
                    transactions={transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
                    onTransactionClick={(t) => setSelectedTransaction(t)}
                    onUpdateTransaction={updateTransaction}
                // Only passing update, delete handled via overlay or could be passed here
                />
            </div>

            {/* Detail Overlay */}
            <TransactionDetailOverlay
                isOpen={!!selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                transaction={selectedTransaction}
                onUpdate={updateTransaction}
                onDelete={deleteTransaction}
            />
        </div>
    );
};

export default CategoryDetail;
