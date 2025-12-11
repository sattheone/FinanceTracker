import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Transaction } from '../../types';

interface InlineTypeEditorProps {
    currentType: Transaction['type'];
    onSave: (type: Transaction['type']) => void;
    onCancel?: () => void;
}

const transactionTypes = [
    { value: 'income' as const, label: 'Income', icon: '💰', color: 'text-green-600 dark:text-green-400' },
    { value: 'expense' as const, label: 'Expense', icon: '💸', color: 'text-red-600 dark:text-red-400' },
    { value: 'investment' as const, label: 'Investment', icon: '📊', color: 'text-blue-600 dark:text-blue-400' },
    { value: 'insurance' as const, label: 'Insurance', icon: '🛡️', color: 'text-purple-600 dark:text-purple-400' },
];

const InlineTypeEditor: React.FC<InlineTypeEditorProps> = ({
    currentType,
    onSave,
    onCancel
}) => {
    const theme = useThemeClasses();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                if (onCancel) onCancel();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onCancel]);

    const currentTypeObj = transactionTypes.find(t => t.value === currentType) || transactionTypes[1];

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all w-full",
                    theme.bgElevated,
                    theme.border,
                    "hover:border-blue-500 dark:hover:border-blue-400"
                )}
            >
                <span className="text-lg">{currentTypeObj.icon}</span>
                <span className={cn("text-sm font-medium truncate", currentTypeObj.color)}>
                    {currentTypeObj.label}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
            </button>

            {/* Popover Menu */}
            {isOpen && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        "absolute top-full left-0 mt-1 w-48 rounded-lg shadow-xl border z-50",
                        theme.bgElevated,
                        theme.border
                    )}
                >
                    <div className="p-1">
                        {transactionTypes.map(type => (
                            <button
                                key={type.value}
                                onClick={() => {
                                    onSave(type.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left transition-colors",
                                    currentType === type.value
                                        ? "bg-blue-50 dark:bg-blue-900/20"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                            >
                                <span className="text-lg">{type.icon}</span>
                                <span className={cn("text-sm font-medium flex-1", type.color)}>
                                    {type.label}
                                </span>
                                {currentType === type.value && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InlineTypeEditor;
