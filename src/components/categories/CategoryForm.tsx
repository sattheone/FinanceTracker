import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../hooks/useThemeClasses';
import { Category } from '../../constants/categories';

interface CategoryFormProps {
    initialData?: Category | null;
    categories: Category[];
    onSave: (category: Partial<Category>) => void;
    onCancel: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
    initialData,
    categories,
    onSave,
    onCancel
}) => {

    const [name, setName] = useState(initialData?.name || '');
    const [color, setColor] = useState(initialData?.color || '#3B82F6');
    const [icon, setIcon] = useState(initialData?.icon || '📁');
    const [parentId, setParentId] = useState(initialData?.parentId || '');

    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);

    const colorOptions = [
        '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
        '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
        '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#6B7280'
    ];

    const suggestedIcons = [
        '📁', '🍽️', '🚗', '🛍️', '🎬', '⚡', '🏥', '📚', '✈️', '💰',
        '📈', '🏠', '👕', '🎮', '📱', '💊', '🎵', '🏋️', '🎨', '📋',
        '🛒', '🍳', '🛒', '🎓'
    ];

    // Parent options (exclude self and children to avoid cycles if editing)
    const parentOptions = categories
        .filter(c => !c.parentId && c.id !== initialData?.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const handleSubmit = () => {
        if (!name.trim()) return;

        onSave({
            name: name.trim(),
            color,
            icon: icon.trim() || '📁',
            parentId: parentId || undefined,
            isCustom: true
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {/* Name Input */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                        Category Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 text-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g., Coffee & Snacks"
                        autoFocus
                    />
                </div>

                {/* Compact Style Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Icon Selection */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                            Emoji / Icon
                        </label>
                        <div
                            className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                            onClick={() => setShowIconPicker(!showIconPicker)}
                        >
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-2xl">
                                {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <input
                                    type="text"
                                    value={icon}
                                    onChange={(e) => {
                                        setIcon(e.target.value);
                                        // Auto-close picker if user types
                                        if (showIconPicker) setShowIconPicker(false);
                                    }}
                                    className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 cursor-text"
                                    placeholder="Type emoji..."
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Dropdown Icon Picker */}
                        {showIconPicker && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowIconPicker(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-full sm:w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-20 animate-in fade-in zoom-in-95 duration-100">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">Suggested</p>
                                    <div className="grid grid-cols-6 gap-2">
                                        {suggestedIcons.map(i => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setIcon(i);
                                                    setShowIconPicker(false);
                                                }}
                                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-lg transition-colors"
                                            >
                                                {i}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <p className="text-xs text-gray-400 text-center">
                                            Type any emoji in the input above
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Color Selection */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                            Color Theme
                        </label>
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="w-full flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <div
                                    className="w-10 h-10 rounded-lg border-2 border-white dark:border-gray-700 shadow-sm"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {color}
                                </span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>

                        {/* Dropdown Color Picker */}
                        {showColorPicker && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowColorPicker(false)}
                                />
                                <div className="absolute top-full right-0 mt-2 w-full sm:w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-20 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="grid grid-cols-6 gap-2">
                                        {colorOptions.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => {
                                                    setColor(c);
                                                    setShowColorPicker(false);
                                                }}
                                                className={cn(
                                                    'w-8 h-8 rounded-full border-2 transition-all',
                                                    color === c
                                                        ? 'border-gray-800 dark:border-white scale-110 shadow-md transform'
                                                        : 'border-transparent hover:scale-105'
                                                )}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Parent Category Selection */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                        Group Under (Optional)
                    </label>
                    <select
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                        <option value="">No Parent Group</option>
                        {parentOptions.map(parent => (
                            <option key={parent.id} value={parent.id}>
                                {parent.icon} {parent.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    disabled={!name.trim()}
                >
                    <Check className="w-4 h-4 mr-2" />
                    {initialData ? 'Save Changes' : 'Create Category'}
                </button>
            </div>
        </div>
    );
};

export default CategoryForm;
