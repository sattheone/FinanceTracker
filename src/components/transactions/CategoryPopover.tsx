import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';

interface CategoryPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorElement: HTMLElement | null;
  currentCategory?: string;
  onSelect: (categoryId: string) => void;
}

const CategoryPopover: React.FC<CategoryPopoverProps> = ({
  isOpen,
  onClose,
  anchorElement,
  currentCategory,
  onSelect
}) => {
  const theme = useThemeClasses();
  const { categories: contextCategories } = useData();
  const categories = (contextCategories || []).filter(c => c.id !== 'uncategorized' || c.id === currentCategory);

  const [searchTerm, setSearchTerm] = useState('');
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number; width?: number; maxHeight?: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && anchorElement) {
      const rect = anchorElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const POPOVER_HEIGHT = 300;
      const GAP = 4;
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT;
      setPosition({
        top: showAbove ? undefined : rect.bottom + GAP,
        bottom: showAbove ? (viewportHeight - rect.top + GAP) : undefined,
        left: rect.left,
        width: Math.max(256, rect.width),
        maxHeight: showAbove ? Math.min(POPOVER_HEIGHT, rect.top - GAP * 2) : Math.min(POPOVER_HEIGHT, viewportHeight - rect.bottom - GAP * 2)
      });
    } else if (isOpen && !anchorElement) {
      // Fallback: center in viewport when no anchor element
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const POPOVER_WIDTH = 280;
      const POPOVER_HEIGHT = 300;
      setPosition({
        top: Math.max(100, (viewportHeight - POPOVER_HEIGHT) / 2),
        left: Math.max(20, (viewportWidth - POPOVER_WIDTH) / 2),
        width: POPOVER_WIDTH,
        maxHeight: POPOVER_HEIGHT
      });
    }
  }, [isOpen, anchorElement]);

  // Outside click to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't handle if position not set yet (popover just opened)
      if (!position) return;
      
      const target = event.target as Node;
      const inside = popoverRef.current?.contains(target);
      const insideAnchor = anchorElement?.contains(target);
      if (!inside && !insideAnchor) {
        console.log('Click outside detected, closing popover');
        event.stopPropagation();
        onClose();
      }
    };
    if (isOpen) {
      // Add small delay before listening to avoid catching the opening click
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, anchorElement, position]);

  useEffect(() => {
    if (isOpen && position) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, position]);

  interface DisplayGroup {
    parent: { id: string; name: string; icon?: string };
    children: Array<{ id: string; name: string; icon?: string }>;
  }

  const displayGroups = useMemo<DisplayGroup[]>(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const matches = categories.filter(c => c.name.toLowerCase().includes(lowerSearch));
    const matchIds = new Set(matches.map(c => c.id));
    matches.forEach(c => { if (c.parentId) matchIds.add(c.parentId); });
    categories.forEach(c => { if (c.parentId && matchIds.has(c.parentId)) matchIds.add(c.id); });
    const relevantCategories = categories.filter(c => matchIds.has(c.id));
    const roots = relevantCategories.filter(c => !c.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
    return roots.map(root => ({
      parent: { id: root.id, name: root.name, icon: root.icon },
      children: relevantCategories.filter(c => c.parentId === root.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map(child => ({ id: child.id, name: child.name, icon: child.icon }))
    }));
  }, [categories, searchTerm]);

  const [focusedIndex, setFocusedIndex] = useState(0);
  const flatList = useMemo(() => {
    const flat: Array<{ id: string; name: string }> = [];
    displayGroups.forEach(group => {
      if (group.children.length === 0) flat.push({ id: group.parent.id, name: group.parent.name });
      else group.children.forEach(child => flat.push({ id: child.id, name: child.name }));
    });
    return flat;
  }, [displayGroups]);

  if (!isOpen || !position) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{ top: position.top, bottom: position.bottom, left: position.left, width: position.width, maxHeight: position.maxHeight || 300 }}
      className={cn('fixed rounded-lg shadow-xl border z-[1300] flex flex-col', theme.bgElevated, theme.border)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setFocusedIndex(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(prev => Math.min(prev + 1, flatList.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(prev => Math.max(prev - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); if (flatList[focusedIndex]) { onSelect(flatList[focusedIndex].id); onClose(); } }
              else if (e.key === 'Escape') { onClose(); }
            }}
            placeholder="Search..."
            className={cn('input-field theme-input !pl-8 text-sm')}
          />
        </div>
      </div>

      <div ref={listRef} className="overflow-y-auto flex-1 p-1 max-h-[300px]">
        {displayGroups.map(({ parent, children }) => (
          <div key={parent.id} className="mb-1">
            {children.length === 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(parent.id); onClose(); }}
                className={cn('w-full flex items-center space-x-2 px-2 py-1 rounded-md text-left transition-colors',
                  currentCategory === parent.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300')}
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
            {children.map(child => (
              <button
                key={child.id}
                onClick={(e) => { e.stopPropagation(); onSelect(child.id); onClose(); }}
                className={cn('w-full flex items-center space-x-2 px-2 py-1 pl-8 rounded-md text-left transition-colors',
                  currentCategory === child.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300')}
              >
                <span className="text-sm">{child.icon}</span>
                <span className="text-xs flex-1">{child.name}</span>
                {currentCategory === child.id && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        ))}
        {displayGroups.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">No categories found</div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CategoryPopover;
