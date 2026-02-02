import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Check } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import SidePanel from '../common/SidePanel';
import { Category } from '../../constants/categories';
import CategoryForm, { CategoryFormHandle } from '../categories/CategoryForm';

interface InlineCategoryEditorProps {
  currentCategory: string;
  onSave: (categoryId: string) => void;
  onCancel?: () => void;
  triggerClassName?: string;
  renderTrigger?: (onClick: (e: React.MouseEvent) => void) => React.ReactNode;
}

const InlineCategoryEditor: React.FC<InlineCategoryEditorProps> = ({
  currentCategory,
  onSave,
  onCancel,
  triggerClassName,
  renderTrigger
}) => {
  const { categories: contextCategories, addCategory } = useData();
  const theme = useThemeClasses();

  // Use categories from context
  const categories = (contextCategories || []).filter(c => c.id !== 'uncategorized' || c.id === currentCategory);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top?: number; bottom?: number; left: number; width?: number; maxHeight?: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<CategoryFormHandle | null>(null);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const POPOVER_HEIGHT = 300; // Estimated max height
      const GAP = 4;

      // Check space below
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT;

      setPopoverPosition({
        top: showAbove ? undefined : rect.bottom + GAP,
        bottom: showAbove ? (viewportHeight - rect.top + GAP) : undefined,
        left: rect.left,
        width: 256,
        // If showing above, we might want to dynamically adjust height if space is tight, 
        // but simple flip is a good start.
        maxHeight: showAbove ? Math.min(POPOVER_HEIGHT, rect.top - GAP * 2) : Math.min(POPOVER_HEIGHT, viewportHeight - rect.bottom - GAP * 2)
      });
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is inside trigger button (containerRef) OR inside popover (popoverRef)
      const target = event.target as Node;

      const isInsideTrigger = containerRef.current && containerRef.current.contains(target);
      const isInsidePopover = popoverRef.current && popoverRef.current.contains(target);
      const isInsideModal = document.getElementById('category-form-modal')?.contains(target); // Safety check for nested modal

      if (!isInsideTrigger && !isInsidePopover && !isInsideModal) {
        if (!showNewCategoryModal) {
          // Prevent underlying elements from receiving this click
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(false);
          if (onCancel) onCancel();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Handle scroll to close/reposition? For now, close on scroll often safest for fixed popovers
      // pushing it: let's close on scroll to avoid detached floating elements
      const handleScroll = () => {
        // Optional: real-time update or close. Closing is simpler.
        // setIsOpen(false); 
      };
      window.addEventListener('scroll', handleScroll, true); // Capture phase for all scroll containers

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, onCancel, showNewCategoryModal]);

  // Focus search when opening and positioned
  useEffect(() => {
    if (isOpen && popoverPosition) {
      // Small timeout to allow render cycle to complete and ref to be attached
      // standard 50ms usually enough, increasing slightly to 100ms to be safe against heavier renders
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, popoverPosition]);

  const handleSaveNewCategory = async (categoryData: Partial<Category>) => {
    try {
      // Determine order: put at end of siblings
      const parentId = categoryData.parentId;
      const siblings = categories.filter(c => c.parentId === parentId);
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.order || 0)) : 0;

      const newId = await addCategory({
        name: categoryData.name!,
        color: categoryData.color!,
        icon: categoryData.icon!,
        isCustom: true,
        parentId: parentId,
        order: maxOrder + 10,
        ...categoryData
      });

      if (newId) {
        onSave(newId);
        setShowNewCategoryModal(false);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to add category", error);
    }
  };

  const currentCategoryObj = categories.find(c => c.id === currentCategory) ||
    categories.find(c => c.id === 'other');

  interface DisplayGroup {
    parent: { id: string; name: string; icon?: string };
    children: Array<{ id: string; name: string; icon?: string }>;
  }

  // Refined grouping logic that handles search better
  const displayGroups = useMemo<DisplayGroup[]>(() => {
    const lowerSearch = searchTerm.toLowerCase();

    // 1. Find all matching categories
    const matches = categories.filter(c =>
      c.name.toLowerCase().includes(lowerSearch)
    );
    const matchIds = new Set(matches.map(c => c.id));

    // 2. Include parents of matching children
    matches.forEach(c => {
      if (c.parentId) matchIds.add(c.parentId);
    });

    // 3. Include children of matching parents
    categories.forEach(c => {
      if (c.parentId && matchIds.has(c.parentId)) {
        if (categories.find(p => p.id === c.parentId)?.name.toLowerCase().includes(lowerSearch)) {
          matchIds.add(c.id);
        }
      }
    });

    const relevantCategories = categories.filter(c => matchIds.has(c.id));

    const roots = relevantCategories
      .filter(c => !c.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Force strict return type structure
    return roots.map(root => ({
      parent: { id: root.id, name: root.name, icon: root.icon }, // Ensure plain object structure if needed, or just root
      children: relevantCategories
        .filter(c => c.parentId === root.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(child => ({ id: child.id, name: child.name, icon: child.icon }))
    }));
  }, [categories, searchTerm]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // Flatten the grouped list for keyboard navigation
  const flatList = useMemo(() => {
    const flat: Array<{ id: string; name: string; isParent: boolean }> = [];
    displayGroups.forEach(group => {
      if (group.children.length === 0) {
        // Standalone category: parent is selectable
        flat.push({ id: group.parent.id, name: group.parent.name, isParent: false });
      } else {
        // Parent groups are headers; only children are selectable
        group.children.forEach(child => {
          flat.push({ id: child.id, name: child.name, isParent: false });
        });
      }
    });
    return flat;
  }, [displayGroups]);

  // Reset focus when search changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchTerm]);

  const scrollToItem = (index: number) => {
    const item = document.getElementById(`category-item-${index}`);
    if (item && listRef.current) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };


  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      {/* Trigger Button - Chip Style */}
      {renderTrigger ? (
        renderTrigger((e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        })
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('[InlineCategoryEditor] Toggling popover', { isOpen: !isOpen });
            setIsOpen(!isOpen);
          }}
          className={cn(
            "flex items-center justify-center space-x-1 px-2 py-0.5 rounded-full transition-all w-fit max-w-[140px]",
            // Remove default border/bg classes as we override them
            !triggerClassName && "hover:opacity-80",
            triggerClassName
          )}
          style={!triggerClassName ? {
            backgroundColor: currentCategoryObj?.color ? `${currentCategoryObj.color}20` : '#E5E7EB', // 20 = ~12% opacity
            color: currentCategoryObj?.color || '#374151'
          } : undefined}
        >
          <span className="text-xs flex-shrink-0">{currentCategoryObj?.icon || '📋'}</span>
          <span className="text-[10px] font-bold truncate uppercase tracking-wider">
            {currentCategoryObj?.name || 'SELECT'}
          </span>
        </button>
      )}

      {/* Popover Menu + Backdrop - Rendered via Portal */}
      {isOpen && popoverPosition && createPortal(
        <>
          {/* Backdrop to intercept clicks */}
          <div
            className="fixed inset-0 z-[9998] cursor-default"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
              if (onCancel) onCancel();
            }}
          />

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
            {/* Search Header */}
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setFocusedIndex(0); // Reset focus on search
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setFocusedIndex(prev => Math.min(prev + 1, flatList.length - 1));
                      scrollToItem(focusedIndex + 1);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setFocusedIndex(prev => Math.max(prev - 1, 0));
                      scrollToItem(focusedIndex - 1);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (flatList[focusedIndex]) {
                        onSave(flatList[focusedIndex].id);
                        setIsOpen(false);
                      }
                    } else if (e.key === 'Escape') {
                      setIsOpen(false);
                    }
                  }}
                  placeholder="Search..."
                  className={cn(
                    "input-field theme-input !pl-8 text-sm"
                  )}
                />
              </div>
            </div>

            {/* Categories List */}
            <div
              ref={listRef}
              className="overflow-y-auto flex-1 p-1 max-h-[300px]"
            >
              {displayGroups.map(({ parent, children }) => (
                <div key={parent.id} className="mb-1">
                  {/* Parent: selectable if standalone (no children), otherwise header-only */}
                  {children.length === 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSave(parent.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center space-x-2 px-2 py-1 rounded-md text-left transition-colors",
                        currentCategory === parent.id
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                      )}
                    >
                      <span className="text-sm">{parent.icon}</span>
                      <span className="text-xs flex-1">{parent.name}</span>
                      {currentCategory === parent.id && <Check className="w-3 h-3" />}
                    </button>
                  ) : (
                    <div className="px-2 py-1.5 mt-2 first:mt-0 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 rounded flex items-center gap-1">
                      <span>{parent.icon}</span> {parent.name}
                    </div>
                  )}

                  {/* Children */}
                  {children.map(child => (
                    <button
                      key={child.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSave(child.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center space-x-2 px-2 py-1 pl-8 rounded-md text-left transition-colors scroll-mt-1",
                        currentCategory === child.id
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300",
                        focusedIndex === flatList.findIndex(item => item.id === child.id) && "bg-gray-100 dark:bg-gray-700 ring-1 ring-blue-500/50"
                      )}
                      id={`category-item-${flatList.findIndex(item => item.id === child.id)}`}
                    >
                      <span className="text-sm">{child.icon}</span>
                      <span className="text-xs flex-1">{child.name}</span>
                      {currentCategory === child.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              ))}

              {displayGroups.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No categories found
                </div>
              )}
            </div>

            {/* Footer: New Category */}
            <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewCategoryModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Category</span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* New Category Modal */}
      <SidePanel
        isOpen={showNewCategoryModal}
        onClose={() => setShowNewCategoryModal(false)}
        title="Add New Category"
        footer={<></>}
        headerActions={(
          <button
            onClick={() => formRef.current?.submit()}
            className="px-4 py-1.5 bg-black text-white rounded-lg text-sm font-semibold shadow hover:bg-gray-900"
          >
            Add
          </button>
        )}
      >
        <div id="category-form-modal" onClick={(e) => e.stopPropagation()}>
          <CategoryForm
            ref={formRef}
            categories={categories}
            onSave={handleSaveNewCategory}
            onCancel={() => setShowNewCategoryModal(false)}
          />
        </div>
      </SidePanel>
    </div>
  );
};

export default InlineCategoryEditor;