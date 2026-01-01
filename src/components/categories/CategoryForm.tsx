import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../hooks/useThemeClasses';
import { Category } from '../../constants/categories';

export interface CategoryFormProps {
    initialData?: Category | null;
    categories: Category[];
    onSave: (category: Partial<Category>) => void;
    onCancel: () => void;
    onUngroupChildren?: (parentId: string) => Promise<void>;
}

export interface CategoryFormHandle {
    submit: () => void;
}

const CategoryForm = forwardRef<CategoryFormHandle, CategoryFormProps>(({ 
    initialData,
    categories,
    onSave,
    onUngroupChildren
}, ref) => {
    // Default parent: keep existing for edit; for new, allow no parent
    const defaultParentId = useMemo(() => {
        if (initialData?.parentId) return initialData.parentId;
        // Editing a root category, keep it root
        if (initialData && !initialData.parentId) return '';
        // New category: allow creating as a root group (no parent)
        return '';
    }, [initialData]);

    const [name, setName] = useState(initialData?.name || '');
    const [color, setColor] = useState(initialData?.color || '#3B82F6');
    const [icon, setIcon] = useState(initialData?.icon || '📁');
    const [parentId, setParentId] = useState(defaultParentId);
    const [budgetInput, setBudgetInput] = useState<string>(
        initialData?.budget !== undefined ? String(initialData.budget) : ''
    );

    // Auto-inherit parent color
    React.useEffect(() => {
        if (parentId) {
            const parent = categories.find(c => c.id === parentId);
            if (parent && parent.color) {
                setColor(parent.color);
            }
        }
    }, [parentId, categories]);

    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [emojiSearch, setEmojiSearch] = useState('');
    const suggestedIcons = [
        // Smiley set resembling the screenshot
        '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','🙂','🙃','😇','🥰','😍','🤩','😘','😗','😙','😚','🤗','🤭','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','🤪','😝','🤤','😒','😓','😔','😕','🙁','☹️','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤥','😵','🤒','🤕','🤢','🤮','🤧','😷','🤠','😎','🤓','🤑',
        // Common category icons
        '📁','💸','🍽️','🚗','🛍️','🎬','⚡','🏥','📚','✈️','💰','📈','🏠','👕','🎮','📱','💊','🎵','🏋️','🎨','📋','🛒','🍳','🎓'
    ];
    const [emojiItems, setEmojiItems] = useState<Array<{ emoji: string; search: string }>>(
        () => suggestedIcons.map(i => ({ emoji: i, search: '' }))
    );

    // Load full emoji dataset lazily
    React.useEffect(() => {
        // Dynamic import keeps bundle small; falls back to suggestedIcons if it fails
        (async () => {
            try {
                const mod: any = await import('emojibase-data/en/data.json');
                const raw = (mod && mod.default) ? mod.default : mod; // Vite JSON modules export under `default`
                const shouldExclude = (e: any) => {
                    const label = String(e?.label || '').toLowerCase();
                    const subgroup = String(e?.subgroup || '').toLowerCase();
                    const type = String(e?.type || '').toLowerCase();
                    const shortcodes = (e?.shortcodes || []).join(' ').toLowerCase();
                    // Exclude A–Z letter-related entries and components
                    return (
                        type === 'component' ||
                        /^[a-z]$/i.test(String(e?.label || '')) ||
                        label.includes('regional indicator') ||
                        label.includes('latin') && label.includes('letter') ||
                        subgroup.includes('alphanum') ||
                        /letter|keycap|regional_indicator/.test(shortcodes)
                    );
                };

                const items: Array<{ emoji: string; search: string }> = (raw || [])
                    .filter((e: any) => !!e?.emoji && !shouldExclude(e))
                    .map((e: any) => ({
                        emoji: e.emoji as string,
                        search: [e.emoji, e.label, ...(e.shortcodes || []), ...(e.tags || [])]
                            .filter(Boolean)
                            .join(' ')
                            .toLowerCase()
                    }));
                if (items.length > 0) setEmojiItems(items);
            } catch (err) {
                // Silently ignore; suggestedIcons will be used
                console.warn('Emoji dataset load failed, using fallback list');
            }
        })();
    }, []);

    const colorOptions = [
        '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
        '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
        '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#6B7280'
    ];


    // Parent options (exclude self and children to avoid cycles if editing)
    const parentOptions = categories
        .filter(c => !c.parentId && c.id !== initialData?.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const handleSubmit = () => {
        if (!name.trim()) return;

        const parsedBudget = budgetInput.trim() === '' ? undefined : Number(budgetInput);
        onSave({
            name: name.trim(),
            color,
            icon: icon.trim() || '📁',
            parentId: parentId || undefined,
            isCustom: true,
            budget: parsedBudget && !isNaN(parsedBudget) ? parsedBudget : undefined
        });
    };

    useImperativeHandle(ref, () => ({
        submit: handleSubmit
    }));

    return (
        <div className="space-y-6">
            {/* Hero: Emoji + Name, centered like screenshot */}
            <div className="py-4 relative">
                <div className="flex flex-col items-center justify-center space-y-3">
                    <button
                        type="button"
                        className="text-5xl leading-none hover:opacity-90 transition-opacity"
                        onClick={() => setShowIconPicker(true)}
                        aria-label="Choose emoji"
                    >
                        {icon || '💸'}
                    </button>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-center text-3xl sm:text-4xl font-semibold text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-500 bg-transparent border-none outline-none focus:outline-none focus:ring-0"
                        placeholder="Category Name"
                    />
                </div>
                {/* Emoji Picker Popover */}
                {showIconPicker && (
                    <>
                        <div
                            className="fixed inset-0 z-[80] pointer-events-auto"
                            onClick={() => setShowIconPicker(false)}
                        />
                        <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-full sm:w-[320px] max-w-[92vw] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-[90]">
                            <input
                                type="text"
                                value={emojiSearch}
                                onChange={(e) => setEmojiSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full input-field theme-input text-lg"
                            />
                            <div className="mt-3 grid grid-cols-6 gap-2 max-h-[260px] overflow-y-auto pr-1">
                                {emojiItems
                                    .filter(item => !emojiSearch || item.search.includes(emojiSearch.toLowerCase()))
                                    .map(item => (
                                        <button
                                            key={`${item.emoji}-${item.search}`}
                                            onClick={() => {
                                                setIcon(item.emoji);
                                                setShowIconPicker(false);
                                            }}
                                            className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-xl transition-colors"
                                        >
                                            {item.emoji}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="space-y-4">

                {/* Compact Style Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Monthly Budget (Optional) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                            Monthly Budget (Optional)
                        </label>
                        <div className="flex items-center gap-2 input-field theme-input">
                            <span className="text-gray-500">₹</span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={budgetInput}
                                onChange={(e) => setBudgetInput(e.target.value)}
                                placeholder="e.g., 5000"
                                className="flex-1 bg-transparent border-none p-0 focus:ring-0"
                            />
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                            This is a per-month budget. In year view, budgets are calculated as monthly × 12.
                        </p>
                    </div>

                    {/* Icon Selection removed: hero emoji opens popover */}

                    {/* Color Selection */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex justify-between">
                            <span>Color Theme</span>
                            {!!parentId && <span className="text-[10px] text-gray-400 italic">Inherited from parent</span>}
                        </label>
                        <button
                            onClick={() => !parentId && setShowColorPicker(!showColorPicker)}
                            disabled={!!parentId}
                            className={cn(
                                "w-full flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors",
                                !parentId ? "hover:border-gray-300 dark:hover:border-gray-500" : "opacity-75 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
                            )}
                        >
                            <div className="flex items-center space-x-3">
                                <div
                                    className="w-10 h-10 rounded-lg border-2 border-white dark:border-gray-700 shadow-sm"
                                    style={{ backgroundColor: color }}
                                />
                                <span className={cn(
                                    "text-sm",
                                    !parentId ? "text-gray-600 dark:text-gray-300" : "text-gray-400"
                                )}>
                                    {color}
                                </span>
                            </div>
                            {!parentId ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <div className="w-4 h-4 text-gray-400">🔒</div>}
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

                {/* Parent Category Selection or Ungroup for root groups */}
                {initialData && !initialData.parentId ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Ungroup Categories</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Remove this group from its subcategories</p>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!onUngroupChildren) return;
                                if (window.confirm('Ungroup all categories under this group? This will make subcategories standalone.')) {
                                    await onUngroupChildren(initialData.id);
                                }
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold"
                        >
                            Ungroup
                        </button>
                    </div>
                ) : (
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                            Group Under (Optional)
                        </label>
                        <select
                            value={parentId}
                            onChange={(e) => setParentId(e.target.value)}
                            className="input-field theme-input"
                        >
                            <option value="">No Parent Group</option>
                            {parentOptions.map(parent => (
                                <option key={parent.id} value={parent.id}>
                                    {parent.icon} {parent.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Footer Actions removed: header button handles submit */}
        </div>
    );
});

export default CategoryForm;
