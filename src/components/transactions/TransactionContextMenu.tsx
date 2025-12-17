import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, Trash2, Repeat, Tag, Type } from 'lucide-react';
import { Transaction } from '../../types';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';

interface TransactionContextMenuProps {
    x: number;
    y: number;
    transaction: Transaction;
    onClose: () => void;
    onEdit: (t: Transaction) => void;
    onDelete: (id: string) => void;
    onMakeRecurring: (t: Transaction) => void;
    onChangeCategory: (t: Transaction) => void;
    onChangeType: (t: Transaction) => void;
}

const TransactionContextMenu: React.FC<TransactionContextMenuProps> = ({
    x,
    y,
    transaction,
    onClose,
    onEdit,
    onDelete,
    onMakeRecurring,
    onChangeCategory,
    onChangeType,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const theme = useThemeClasses();

    // Close when clicking outside
    useEffect(() => {
        // Use timeout to avoid immediate close from the opening click event
        const timer = setTimeout(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                    onClose();
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('contextmenu', (e) => {
                if (e.target !== menuRef.current && !menuRef.current?.contains(e.target as Node)) {
                    onClose();
                }
            });

            // Store cleanup function
            (window as any)._contextMenuCleanup = () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('contextmenu', () => { });
            };
        }, 100);

        return () => {
            clearTimeout(timer);
            if ((window as any)._contextMenuCleanup) (window as any)._contextMenuCleanup();
        }
    }, [onClose]);

    // Portal to document.body to avoid z-index/overflow issues
    return createPortal(
        <div
            ref={menuRef}
            style={{ top: y, left: x }}
            className={cn(
                "fixed z-[9999] w-48 rounded-lg shadow-xl border overflow-hidden",
                "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            )}
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it
        >
            <div className="py-1">
                {/* Recurring */}
                <button
                    onClick={() => { onMakeRecurring(transaction); onClose(); }}
                    className={cn("w-full text-left px-4 py-2 text-sm flex items-center space-x-2", theme.interactive)}
                >
                    <Repeat className="w-4 h-4 text-blue-500" />
                    <span>Make Recurring</span>
                </button>

                {/* Type */}
                <button
                    onClick={() => { onChangeType(transaction); onClose(); }}
                    className={cn("w-full text-left px-4 py-2 text-sm flex items-center space-x-2", theme.interactive)}
                >
                    <Type className="w-4 h-4 text-purple-500" />
                    <span>Change Type</span>
                </button>

                {/* Category */}
                <button
                    onClick={() => { onChangeCategory(transaction); onClose(); }}
                    className={cn("w-full text-left px-4 py-2 text-sm flex items-center space-x-2", theme.interactive)}
                >
                    <Tag className="w-4 h-4 text-green-500" />
                    <span>Change Category</span>
                </button>

                {/* Divider */}
                <div className={cn("border-t my-1", theme.borderSecondary)} />

                {/* Edit */}
                <button
                    onClick={() => { onEdit(transaction); onClose(); }}
                    className={cn("w-full text-left px-4 py-2 text-sm flex items-center space-x-2", theme.interactive)}
                >
                    <Edit3 className="w-4 h-4 text-gray-500" />
                    <span>Edit</span>
                </button>

                {/* Delete */}
                <button
                    onClick={() => { onDelete(transaction.id); onClose(); }}
                    className={cn("w-full text-left px-4 py-2 text-sm flex items-center space-x-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400")}
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                </button>
            </div>
        </div>,
        document.body
    );
};

export default TransactionContextMenu;
