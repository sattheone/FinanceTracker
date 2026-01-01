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
import { Edit3 } from 'lucide-react';
import { Transaction, MonthlyBudget } from '../../types';
import { Category } from '../../constants/categories';
// cn import no longer needed after removing badge
import { formatCurrency } from '../../utils/formatters';
import TransactionTable from '../transactions/TransactionTable';
import SimpleTransactionModal from '../transactions/SimpleTransactionModal';
import RulePrompt from '../transactions/RulePrompt';
import RuleCreationDialog from '../transactions/RuleCreationDialog';
import TagPopover from '../transactions/TagPopover';
import TagSettingsOverlay from '../transactions/TagSettingsOverlay';
import { useData } from '../../contexts/DataContext';
import SidePanel from '../common/SidePanel';
import CategoryForm, { CategoryFormHandle } from './CategoryForm';

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
    const { updateTransaction, categories, addCategoryRule, updateCategory } = useData();
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [showEditPanel, setShowEditPanel] = useState(false);
    const formRef = React.useRef<CategoryFormHandle | null>(null);
    
    // Tag management state
    const [showTagPopover, setShowTagPopover] = useState(false);
    const [tagPopoverTransaction, setTagPopoverTransaction] = useState<Transaction | null>(null);
    const [tagPopoverAnchor, setTagPopoverAnchor] = useState<HTMLElement | null>(null);
    const [showTagSettings, setShowTagSettings] = useState(false);

    // Rule creation state
    const [showRulePrompt, setShowRulePrompt] = useState(false);
    const [rulePromptData, setRulePromptData] = useState<{
        transaction: Transaction;
        newCategoryId?: string;
        newCategoryName?: string;
        newType?: Transaction['type'];
        newTypeName?: string;
    } | null>(null);
    const [showRuleDialog, setShowRuleDialog] = useState(false);

    // Handler for category changes with rule prompt
    const handleCategoryChangeWithRulePrompt = (transaction: Transaction, newCategoryId: string) => {
        const oldCategoryId = transaction.category;

        // Update the transaction
        updateTransaction(transaction.id, { category: newCategoryId });

        // Show rule prompt if category actually changed
        if (oldCategoryId !== newCategoryId) {
            const cat = categories.find(c => c.id === newCategoryId);
            if (cat) {
                setRulePromptData({
                    transaction,
                    newCategoryId,
                    newCategoryName: cat.name
                });
                setShowRulePrompt(true);
            }
        }
    };

    const handleTypeChangeWithRulePrompt = (transaction: Transaction, newType: Transaction['type']) => {
        // Update the transaction
        updateTransaction(transaction.id, { type: newType });

        // Show rule prompt if type actually changed
        if (transaction.type !== newType) {
            setRulePromptData({
                transaction,
                newType,
                newTypeName: newType.charAt(0).toUpperCase() + newType.slice(1)
            });
            setShowRulePrompt(true);
        }
    };

    // Handler for transaction updates from TransactionTable
    const handleUpdateTransaction = (transactionId: string, updates: Partial<Transaction>) => {
        const transaction = transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        // Handle specific fields with rule prompts
        if (updates.category && updates.category !== transaction.category) {
            handleCategoryChangeWithRulePrompt(transaction, updates.category);
        }
        if (updates.type && updates.type !== transaction.type) {
            handleTypeChangeWithRulePrompt(transaction, updates.type);
        }

        // Apply generic updates ignoring already handled fields
        const otherUpdates = { ...updates };
        delete otherUpdates.category;
        delete otherUpdates.type;

        if (Object.keys(otherUpdates).length > 0) {
            updateTransaction(transactionId, { ...transaction, ...otherUpdates });
        }
    };

    // --- Calculations ---

    // 1. Current Month Stats
    const currentMonthStats = useMemo(() => {
        const stats = {
            spent: 0,
            budget: (category.budget !== undefined
                ? category.budget
                : (monthlyBudget?.categoryBudgets?.[category.id] || 0)),
            count: 0
        };

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (isSameMonth(tDate, currentMonth) && (t.type === 'expense' || t.type === 'investment')) {
                stats.spent += t.amount;
                stats.count += 1;
            }
        });
        return stats;
    }, [transactions, monthlyBudget, category.id, currentMonth]);

    // 2. Chart Data (Full History)
    const chartData = useMemo(() => {
        if (transactions.length === 0) return [];

        // Find earliest transaction date
        const dates = transactions.map(t => new Date(t.date));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));

        // Calculate months difference
        const now = new Date();
        const monthsDiff = (now.getFullYear() - minDate.getFullYear()) * 12 + (now.getMonth() - minDate.getMonth());
        // Add a buffer or minimum of 6 months
        const range = Math.max(monthsDiff, 5);

        const data = [];
        for (let i = range; i >= 0; i--) {
            const date = subMonths(now, i);
            const label = format(date, 'MMM yy'); // Added Year for context in long history

            let amount = 0;
            transactions.forEach(t => {
                const tDate = new Date(t.date);
                if (isSameMonth(tDate, date) && (t.type === 'expense' || t.type === 'investment')) {
                    amount += t.amount;
                }
            });

            data.push({
                name: label,
                amount,
                date: date,
                isCurrent: isSameMonth(date, now)
            });
        }
        return data;
    }, [transactions]);

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
        <div className="h-fit flex flex-col bg-white dark:bg-gray-800">

            {/* Header Section */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color || '#9CA3AF' }}
                            />
                            <h2 className="text-2xl font-bold dark:text-white">{category.name}</h2>
                            <button
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400"
                                onClick={() => setShowEditPanel(true)}
                                aria-label="Edit Category"
                            >
                                <Edit3 className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                        {/* Budget status badge removed as per request */}
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

                                {/* Edit Category Side Panel */}
                                <SidePanel
                                    isOpen={showEditPanel}
                                    onClose={() => setShowEditPanel(false)}
                                    title={`Edit ${category.name}`}
                                    headerActions={(
                                        <button
                                            onClick={() => formRef.current?.submit()}
                                            className="px-4 py-1.5 bg-black text-white rounded-lg text-sm font-semibold shadow hover:bg-gray-900"
                                        >
                                            Save
                                        </button>
                                    )}
                                >
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <CategoryForm
                                            ref={formRef}
                                            initialData={category}
                                            categories={categories}
                                            onSave={async (data) => {
                                                try {
                                                    await updateCategory(category.id, data);
                                                    setShowEditPanel(false);
                                                } catch (err) {
                                                    console.error('Failed to update category', err);
                                                    alert('Failed to update category');
                                                }
                                            }}
                                            onCancel={() => setShowEditPanel(false)}
                                            onUngroupChildren={async (parentId) => {
                                                const children = categories.filter(c => c.parentId === parentId);
                                                try {
                                                    await Promise.all(children.map(child => updateCategory(child.id, { parentId: undefined })));
                                                    alert('Ungrouped all subcategories');
                                                } catch (err) {
                                                    console.error('Failed to ungroup children', err);
                                                    alert('Failed to ungroup');
                                                }
                                            }}
                                        />
                                    </div>
                                </SidePanel>
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
                                {chartData.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={category.color || '#3B82F6'}
                                        className="transition-all duration-300 hover:opacity-80"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white dark:bg-gray-900 p-4 flex-1">
                <TransactionTable
                    transactions={transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
                    onTransactionClick={(t) => setSelectedTransaction(t)}
                    onUpdateTransaction={handleUpdateTransaction}
                    onTagClick={(t, anchor) => {
                        setTagPopoverTransaction(t);
                        setTagPopoverAnchor(anchor);
                        setShowTagPopover(true);
                    }}
                // Only passing update, delete handled via overlay or could be passed here
                />
            </div>

            {/* Detail Overlay */}
            {selectedTransaction && (
                <SimpleTransactionModal
                    transaction={selectedTransaction}
                    isOpen={!!selectedTransaction}
                    onClose={() => setSelectedTransaction(null)}
                    onTransactionClick={(t) => setSelectedTransaction(t)}
                />
            )}

            {/* Rule Creation Flow */}
            {rulePromptData && (
                <>
                    <RulePrompt
                        isOpen={showRulePrompt}
                        transactionName={rulePromptData.transaction.description}
                        onCreateRule={() => {
                            setShowRulePrompt(false);
                            setShowRuleDialog(true);
                        }}
                        onDismiss={() => {
                            setShowRulePrompt(false);
                            setRulePromptData(null);
                        }}
                    />

                    <RuleCreationDialog
                        isOpen={showRuleDialog}
                        onClose={() => {
                            setShowRuleDialog(false);
                            setRulePromptData(null);
                        }}
                        transaction={rulePromptData.transaction}
                        newCategoryId={rulePromptData.newCategoryId}
                        newType={rulePromptData.newType}
                        transactions={transactions}
                        categories={categories}
                        onCreateRule={(rule) => {
                            addCategoryRule(rule);
                            setShowRuleDialog(false);
                            setRulePromptData(null);
                        }}
                    />
                </>
            )}

            {/* Tag Popover */}
            {tagPopoverTransaction && (
                <TagPopover
                    isOpen={showTagPopover}
                    onClose={() => {
                        setShowTagPopover(false);
                        setTagPopoverTransaction(null);
                        setTagPopoverAnchor(null);
                    }}
                    transaction={tagPopoverTransaction}
                    onUpdateTransaction={updateTransaction}
                    anchorElement={tagPopoverAnchor}
                    onOpenTagSettings={() => setShowTagSettings(true)}
                />
            )}

            {/* Tag Settings Overlay */}
            <TagSettingsOverlay
                isOpen={showTagSettings}
                onClose={() => setShowTagSettings(false)}
            />
        </div>
    );
};

export default CategoryDetail;
