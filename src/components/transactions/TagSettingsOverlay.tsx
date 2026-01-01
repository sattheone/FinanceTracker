import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

const DEFAULT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#CA8A04', 
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#64748B'
];

interface TagSettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const TagSettingsOverlay: React.FC<TagSettingsOverlayProps> = ({
  isOpen,
  onClose
}) => {
  const { tags, addTag, updateTag, deleteTag } = useData();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[8]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const newPickerRef = useRef<HTMLDivElement>(null);
  const [newPickerPosition, setNewPickerPosition] = useState({ top: 0, left: 0 });
  // Existing tag color picker state
  const [openTagColorPicker, setOpenTagColorPicker] = useState(false);
  const [pickerTagId, setPickerTagId] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    await addTag({
      name: newTagName.trim(),
      color: newTagColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setNewTagName('');
    setNewTagColor(DEFAULT_COLORS[8]);
    setShowColorPicker(false);
  };

  // Position and close logic for new tag color picker
  useEffect(() => {
    if (showColorPicker && colorButtonRef.current && newPickerRef.current) {
      const rect = colorButtonRef.current.getBoundingClientRect();
      const popRect = newPickerRef.current.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.left;
      if (left + popRect.width > window.innerWidth) {
        left = rect.right - popRect.width;
      }
      if (top + popRect.height > window.innerHeight) {
        top = rect.top - popRect.height - 8;
      }
      setNewPickerPosition({ top, left });
    }
  }, [showColorPicker]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (colorButtonRef.current && colorButtonRef.current.contains(target)) return;
      if (newPickerRef.current && !newPickerRef.current.contains(target)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [showColorPicker]);

  // Position and close logic for existing tag color picker
  useEffect(() => {
    if (openTagColorPicker && pickerAnchor && pickerRef.current) {
      const rect = pickerAnchor.getBoundingClientRect();
      const popRect = pickerRef.current.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.left;
      if (left + popRect.width > window.innerWidth) {
        left = rect.right - popRect.width;
      }
      if (top + popRect.height > window.innerHeight) {
        top = rect.top - popRect.height - 8;
      }
      setPickerPosition({ top, left });
    }
  }, [openTagColorPicker, pickerAnchor]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerAnchor && pickerAnchor.contains(target)) return; // ignore trigger
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        setOpenTagColorPicker(false);
        setPickerTagId(null);
        setPickerAnchor(null);
      }
    };
    if (openTagColorPicker) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [openTagColorPicker, pickerAnchor]);

  const handleUpdateTag = async (tagId: string) => {
    if (!editingTagName.trim()) return;

    await updateTag(tagId, {
      name: editingTagName.trim(),
      updatedAt: new Date().toISOString()
    });

    setEditingTagId(null);
    setEditingTagName('');
  };

  const handleDeleteTag = async (tagId: string) => {
    if (window.confirm('Are you sure you want to delete this tag? It will be removed from all transactions.')) {
      await deleteTag(tagId);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Overlay Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white dark:bg-gray-800 shadow-2xl z-[70] overflow-hidden flex flex-col transform transition-all duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tags</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Use tags to categorize your transactions more granularly. These can be used across regular, income, and internal transactions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* New Tag Form - Always visible */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  ref={colorButtonRef}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowColorPicker((prev) => !prev);
                  }}
                  className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-white dark:border-gray-900 shadow hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 dark:hover:ring-offset-gray-900 transition-all"
                  style={{ backgroundColor: newTagColor }}
                />
              </div>
              
              <input
                type="text"
                placeholder="New tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagName.trim()) {
                    handleCreateTag();
                  }
                }}
                className="flex-1 px-0 py-0 text-sm border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          {/* Tags List */}
          <div className="space-y-2">
            {tags.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No tags yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Create your first tag to get started
                </p>
              </div>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPickerTagId(tag.id);
                      setPickerAnchor(e.currentTarget as HTMLElement);
                      setOpenTagColorPicker(true);
                    }}
                    className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-white dark:border-gray-900 shadow"
                    style={{ backgroundColor: tag.color }}
                    aria-label="Change tag color"
                  />
                  
                  {editingTagId === tag.id ? (
                    <input
                      type="text"
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTag(tag.id);
                        if (e.key === 'Escape') {
                          setEditingTagId(null);
                          setEditingTagName('');
                        }
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingTagId(tag.id);
                        setEditingTagName(tag.name);
                      }}
                      className="flex-1 text-left text-gray-900 dark:text-white font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {tag.name}
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete tag"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* New Tag Color Picker Popover (portal) */}
      {showColorPicker && createPortal(
        <div
          ref={newPickerRef}
          className="fixed z-[1001] color-picker-popover p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
          style={{ top: `${newPickerPosition.top}px`, left: `${newPickerPosition.left}px` }}
        >
          <div className="grid grid-cols-5 gap-3">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNewTagColor(color);
                  setShowColorPicker(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              >
                {newTagColor === color && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
      {/* Existing Tag Color Picker Popover (portal) */}
      {openTagColorPicker && createPortal(
        <>
          <div
            ref={pickerRef}
            className="fixed z-[1001] color-picker-popover p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
            style={{ top: `${pickerPosition.top}px`, left: `${pickerPosition.left}px` }}
          >
            <div className="grid grid-cols-6 gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (pickerTagId) {
                      await updateTag(pickerTagId, { color, updatedAt: new Date().toISOString() });
                    }
                    setOpenTagColorPicker(false);
                    setPickerTagId(null);
                    setPickerAnchor(null);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                >
                  {tags.find(t => t.id === pickerTagId)?.color === color && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default TagSettingsOverlay;
