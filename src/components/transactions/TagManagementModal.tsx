import React, { useState } from 'react';
import { Transaction } from '../../types';
import { useData } from '../../contexts/DataContext';
import Modal from '../common/Modal';

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onUpdateTransaction: (transactionId: string, updates: Partial<Transaction>) => void;
}

const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#CA8A04', 
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#64748B'
];

const TagManagementModal: React.FC<TagManagementModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onUpdateTransaction
}) => {
  const { tags, addTag } = useData();
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[8]); // Default blue
  const [searchTerm, setSearchTerm] = useState('');

  const transactionTags = transaction.tags || [];

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTag = async (tagId: string) => {
    const updatedTags = transactionTags.includes(tagId)
      ? transactionTags.filter(id => id !== tagId)
      : [...transactionTags, tagId];
    
    onUpdateTransaction(transaction.id, { tags: updatedTags });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const newTag = {
      name: newTagName.trim(),
      color: newTagColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const createdTag = await addTag(newTag);
    if (createdTag) {
      // Add the new tag to the transaction
      const updatedTags = [...transactionTags, createdTag.id];
      onUpdateTransaction(transaction.id, { tags: updatedTags });
    }

    setNewTagName('');
    setNewTagColor(DEFAULT_COLORS[8]);
    setShowCreateTag(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Tags" size="md">
      <div className="space-y-4">
        {/* Transaction Info */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.description}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {new Date(transaction.date).toLocaleDateString()} • ${transaction.amount.toFixed(2)}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Tag List */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredTags.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No tags found</p>
            </div>
          ) : (
            filteredTags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={transactionTags.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm text-gray-900 dark:text-white flex-1">{tag.name}</span>
              </label>
            ))
          )}
        </div>

        {/* Create New Tag */}
        {!showCreateTag ? (
          <button
            onClick={() => setShowCreateTag(true)}
            className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
          >
            + Create a new tag
          </button>
        ) : (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Create a new tag</h4>
            
            {/* Tag Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newTagColor === color ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCreateTag(false);
                  setNewTagName('');
                  setNewTagColor(DEFAULT_COLORS[8]);
                }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TagManagementModal;
