import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';

const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#CA8A04', 
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#64748B'
];

interface TagCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTag: (name: string, color: string) => void;
  initialName?: string;
}

const TagCreationModal: React.FC<TagCreationModalProps> = ({
  isOpen,
  onClose,
  onCreateTag,
  initialName = ''
}) => {
  const [tagName, setTagName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[5]); // Default purple

  // Keep local state in sync with provided initial name whenever
  // the modal opens or the prop changes.
  useEffect(() => {
    if (isOpen) {
      setTagName(initialName || '');
    }
  }, [isOpen, initialName]);

  const handleCreate = () => {
    if (tagName.trim()) {
      onCreateTag(tagName.trim(), selectedColor);
      setTagName('');
      setSelectedColor(DEFAULT_COLORS[5]);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a new tag" size="sm">
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tag name"
            autoFocus
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Color
          </label>
          <div className="grid grid-cols-8 gap-2">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColor(color);
                }}
                className={`w-8 h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center ${
                  selectedColor === color ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''
                }`}
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCreate();
            }}
            disabled={!tagName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TagCreationModal;
