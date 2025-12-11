import React from 'react';
import { X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface CategoryBreakdownOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    type: 'income' | 'expense';
    data: Array<{ name: string; value: number; color?: string }>;
    totalAmount: number;
    onCategoryClick?: (category: string) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const CategoryBreakdownOverlay: React.FC<CategoryBreakdownOverlayProps> = ({
    isOpen,
    onClose,
    title,
    type,
    data,
    totalAmount,
    onCategoryClick
}) => {
    if (!isOpen) return null;

    // Add colors to data if not present
    const dataWithColors = data.map((item, index) => ({
        ...item,
        color: item.color || COLORS[index % COLORS.length]
    }));

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Side Panel */}
            <div className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto transform transition-transform">
                {/* Action Bar - 40px */}
                <div className="sticky top-0 h-10 px-4 flex items-center justify-end bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 z-20">
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Info Section */}
                <div className="sticky top-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
                    <div className="flex items-start justify-between">
                        {/* Left: Title */}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                {type === 'income' ? 'Income' : 'Spend'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Category breakdown
                            </p>
                        </div>

                        {/* Right: Month and Total Amount */}
                        <div className="text-right ml-6">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                {title}
                            </p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(totalAmount)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="px-6 py-6">
                    <div className="h-64">
                        {dataWithColors.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dataWithColors}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        outerRadius={90}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {dataWithColors.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value) => formatCurrency(value as number)}
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Categories List */}
                <div className="px-6 pb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Categories</h3>
                    <div className="space-y-1">
                        {dataWithColors.map((category, index) => {
                            const percentage = totalAmount > 0 ? (category.value / totalAmount) * 100 : 0;
                            return (
                                <div
                                    key={index}
                                    onClick={() => onCategoryClick?.(category.name)}
                                    className={`flex items-center justify-between py-3 px-3 rounded-lg transition-colors ${onCategoryClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''
                                        }`}
                                >
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: category.color }}
                                        />
                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {category.name}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto flex-shrink-0">
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white ml-4 flex-shrink-0">
                                        {formatCurrency(category.value)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Empty State */}
                {dataWithColors.length === 0 && (
                    <div className="px-6 pb-12 text-center">
                        <div className="text-gray-400 mb-2">
                            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            No {type} transactions for this period
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default CategoryBreakdownOverlay;
