import React, { useEffect } from 'react';
import { Plus, X } from 'lucide-react';

interface RulePromptProps {
    isOpen: boolean;
    transactionName: string;
    onCreateRule: () => void;
    onDismiss: () => void;
    autoClose?: boolean;
    autoCloseDelay?: number;
}

const RulePrompt: React.FC<RulePromptProps> = ({
    isOpen,
    transactionName,
    onCreateRule,
    onDismiss,
    autoClose = true,
    autoCloseDelay = 5000
}) => {
    useEffect(() => {
        if (isOpen && autoClose) {
            const timer = setTimeout(() => {
                onDismiss();
            }, autoCloseDelay);

            return () => clearTimeout(timer);
        }
    }, [isOpen, autoClose, autoCloseDelay, onDismiss]);

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 max-w-md">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Create categorization rule?
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={transactionName}>
                        Pattern: "{transactionName}"
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={onCreateRule}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
                    >
                        Create
                    </button>
                    <button
                        onClick={onDismiss}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RulePrompt;
