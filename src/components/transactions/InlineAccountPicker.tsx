import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';

interface InlineAccountPickerProps {
    currentAccountId: string;
    onSave: (accountId: string) => void;
    onCancel?: () => void;
    triggerClassName?: string;
    renderTrigger?: (onClick: (e: React.MouseEvent) => void) => React.ReactNode;
}

const InlineAccountPicker: React.FC<InlineAccountPickerProps> = ({
    currentAccountId,
    onSave,
    onCancel,
    triggerClassName,
    renderTrigger
}) => {
    const { bankAccounts } = useData();
    const theme = useThemeClasses();

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [popoverPosition, setPopoverPosition] = useState<{ top?: number; bottom?: number; left: number; width?: number; maxHeight?: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Calculate position when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const POPOVER_HEIGHT = 300;
            const GAP = 4;

            const spaceBelow = viewportHeight - rect.bottom;
            const showAbove = spaceBelow < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT;

            setPopoverPosition({
                top: showAbove ? undefined : rect.bottom + GAP,
                bottom: showAbove ? (viewportHeight - rect.top + GAP) : undefined,
                left: rect.left,
                width: 256,
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
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onCancel]);

    // Focus search
    useEffect(() => {
        if (isOpen && popoverPosition) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, popoverPosition]);

    const currentAccount = bankAccounts.find(a => a.id === currentAccountId);

    const filteredAccounts = bankAccounts.filter(a =>
        a.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.number.includes(searchTerm)
    );

    return (
        <div className="relative inline-block w-full" ref={containerRef}>
            {/* Trigger */}
            {renderTrigger ? (
                renderTrigger((e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                })
            ) : (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className={cn(
                        "flex items-center justify-center space-x-1 px-3 py-1 rounded-full transition-all w-fit",
                        !triggerClassName && "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200",
                        triggerClassName
                    )}
                >
                    <span className="text-sm">{currentAccount?.logo || '🏦'}</span>
                    <span className="text-xs font-bold truncate">
                        {currentAccount ? `${currentAccount.bank} ...${currentAccount.number.slice(-4)}` : 'Select Account'}
                    </span>
                </button>
            )}

            {/* Popover */}
            {isOpen && popoverPosition && createPortal(
                <div
                    ref={popoverRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        top: popoverPosition.top,
                        bottom: popoverPosition.bottom,
                        left: popoverPosition.left,
                        width: popoverPosition.width,
                        maxHeight: popoverPosition.maxHeight || 300
                    }}
                    className={cn(
                        "fixed rounded-lg shadow-xl border z-[9999] flex flex-col transform transition-all",
                        theme.bgElevated,
                        theme.border
                    )}
                >
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search accounts..."
                                className="input-field theme-input !pl-8 text-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredAccounts.map(account => (
                            <button
                                key={account.id}
                                onClick={() => {
                                    onSave(account.id);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors",
                                    currentAccountId === account.id
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                                )}
                            >
                                <span className="text-lg">{account.logo || '🏦'}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{account.bank}</div>
                                    <div className="text-xs opacity-70 truncate">...{account.number.slice(-4)}</div>
                                </div>
                                {currentAccountId === account.id && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                        {filteredAccounts.length === 0 && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No accounts found
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default InlineAccountPicker;
