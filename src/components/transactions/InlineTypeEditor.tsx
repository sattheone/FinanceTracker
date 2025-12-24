import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    const [popoverPosition, setPopoverPosition] = useState<{ top?: number; bottom?: number; left: number; width?: number; maxHeight?: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Calculate position when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const POPOVER_HEIGHT = 200; // Estimated max height (shorter than category list)
            const GAP = 4;

            // Check space below
            const spaceBelow = viewportHeight - rect.bottom;
            const showAbove = spaceBelow < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT;

            setPopoverPosition({
                top: showAbove ? undefined : rect.bottom + GAP,
                bottom: showAbove ? (viewportHeight - rect.top + GAP) : undefined,
                left: rect.left,
                width: 192, // w-48
                maxHeight: showAbove ? Math.min(POPOVER_HEIGHT, rect.top - GAP * 2) : Math.min(POPOVER_HEIGHT, viewportHeight - rect.bottom - GAP * 2)
            });
        }
    }, [isOpen]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isInsideTrigger = containerRef.current && containerRef.current.contains(target);
            const isInsidePopover = popoverRef.current && popoverRef.current.contains(target);

            if (!isInsideTrigger && !isInsidePopover) {
                setIsOpen(false);
                if (onCancel) onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            const handleScroll = () => {
                // close on scroll to avoid detached floating elements
                setIsOpen(false);
            };
            window.addEventListener('scroll', handleScroll, true);

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                window.removeEventListener('scroll', handleScroll, true);
            };
        }
    }, [isOpen, onCancel]);

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
                    "flex items-center space-x-1 px-2 py-1 rounded-lg border transition-all w-full",
                    theme.bgElevated,
                    theme.border,
                    "hover:border-blue-500 dark:hover:border-blue-400"
                )}
            >
                <span className="text-base">{currentTypeObj.icon}</span>
                <span className={cn("text-xs font-medium truncate", currentTypeObj.color)}>
                    {currentTypeObj.label}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
            </button>

            {/* Popover Menu - Portal */}
            {isOpen && popoverPosition && createPortal(
                <div
                    ref={popoverRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        top: popoverPosition.top,
                        bottom: popoverPosition.bottom,
                        left: popoverPosition.left,
                        width: popoverPosition.width,
                        maxHeight: popoverPosition.maxHeight,
                        overflowY: 'auto'
                    }}
                    className={cn(
                        "rounded-lg shadow-xl border z-[9999] flex flex-col",
                        theme.bgElevated,
                        theme.border
                    )}
                >
                    <div className="p-1">
                        {transactionTypes.map(type => (
                            <button
                                key={type.value}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSave(type.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center space-x-2 px-3 py-1 rounded-md text-left transition-colors",
                                    currentType === type.value
                                        ? "bg-blue-50 dark:bg-blue-900/20"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                            >
                                <span className="text-sm">{type.icon}</span>
                                <span className={cn("text-xs font-medium flex-1", type.color)}>
                                    {type.label}
                                </span>
                                {currentType === type.value && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default InlineTypeEditor;
