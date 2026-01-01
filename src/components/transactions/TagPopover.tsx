import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Settings, Plus } from 'lucide-react';
import { Transaction } from '../../types';
import { useData } from '../../contexts/DataContext';

interface TagPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction;
  onUpdateTransaction?: (transactionId: string, updates: Partial<Transaction>) => void;
  anchorElement: HTMLElement | null;
  onOpenTagSettings: () => void;
  onOpenTagCreate?: (initialName: string, transaction?: Transaction) => void;
  // Bulk mode
  bulkCommonTagIds?: string[];
  onBulkToggleTag?: (tagId: string, shouldAdd: boolean) => void;
}

const TagPopover: React.FC<TagPopoverProps> = ({
  isOpen,
  onClose,
  transaction,
  onUpdateTransaction,
  anchorElement,
  onOpenTagSettings,
  onOpenTagCreate,
  bulkCommonTagIds,
  onBulkToggleTag
}) => {
  const { tags } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  // Modal is managed by parent, ensure popover just signals to open

  // Optimistic local state for immediate UI update
  const [localTransactionTags, setLocalTransactionTags] = useState<string[]>(transaction?.tags || []);
  const [localBulkCommonTags, setLocalBulkCommonTags] = useState<string[]>(bulkCommonTagIds || []);

  useEffect(() => {
    setLocalTransactionTags(transaction?.tags || []);
  }, [transaction, isOpen]);

  useEffect(() => {
    setLocalBulkCommonTags(bulkCommonTagIds || []);
  }, [bulkCommonTagIds, isOpen]);

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showCreateOption = searchTerm.trim() && 
    !tags.some(tag => tag.name.toLowerCase() === searchTerm.toLowerCase());

  const toggleTag = (tagId: string) => {
    if (transaction && onUpdateTransaction) {
      const hasTag = localTransactionTags.includes(tagId);
      const updatedLocal = hasTag
        ? localTransactionTags.filter(id => id !== tagId)
        : [...localTransactionTags, tagId];
      // Optimistic UI update
      setLocalTransactionTags(updatedLocal);
      // Persist in background
      Promise.resolve(onUpdateTransaction(transaction.id, { tags: updatedLocal })).catch(() => {
        // Optional: revert on failure (skipped for simplicity)
      });
    } else if (onBulkToggleTag) {
      const shouldAdd = !localBulkCommonTags.includes(tagId);
      // Optimistic UI update of common set
      setLocalBulkCommonTags(shouldAdd
        ? [...localBulkCommonTags, tagId]
        : localBulkCommonTags.filter(id => id !== tagId)
      );
      // Persist in background across selection
      try {
        onBulkToggleTag(tagId, shouldAdd);
      } catch {
        // Optional: revert on failure
      }
    }
  };

  // Creation handled by parent via onOpenTagCreate

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorElement && anchorElement.contains(target)) {
        // Ignore clicks on the trigger element
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Position popover near anchor element
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorElement && popoverRef.current) {
      const anchorRect = anchorElement.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      
      let top = anchorRect.bottom + 8;
      let left = anchorRect.left;

      // Adjust if popover goes off screen
      if (left + popoverRect.width > window.innerWidth) {
        left = anchorRect.right - popoverRect.width;
      }

      if (top + popoverRect.height > window.innerHeight) {
        top = anchorRect.top - popoverRect.height - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, anchorElement]);

  return (
    <>
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[1000]" onClick={onClose} />

          {/* Popover */}
          <div
            ref={popoverRef}
            className="fixed z-[1001] w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
          >
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Add tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Tag List */}
            <div className="max-h-64 overflow-y-auto">
              {/* Create new tag option */}
              {showCreateOption && (
                <button
                  onClick={() => {
                    onOpenTagCreate?.(searchTerm, transaction);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700"
                >
                  <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Create new tag: {searchTerm}
                  </span>
                </button>
              )}

              {filteredTags.length === 0 && !showCreateOption ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No tags found
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={transaction ? localTransactionTags.includes(tag.id) : localBulkCommonTags.includes(tag.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleTag(tag.id);
                      }}
                      className="rounded border-gray-300 dark:border-gray-600"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-gray-900 dark:text-white">{tag.name}</span>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onClose();
                  onOpenTagSettings();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>View tag settings</span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Tag creation modal handled by parent */}
    </>
  );
};

export default TagPopover;
