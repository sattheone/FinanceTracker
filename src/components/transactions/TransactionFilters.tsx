import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { cn } from '../../hooks/useThemeClasses';

interface TransactionFiltersProps {
  selectedCategories: Set<string>;
  selectedTags: Set<string>;
  selectedTypes: Set<string>;
  selectedAccounts: Set<string>;
  onCategoryChange: (categories: Set<string>) => void;
  onTagChange: (tags: Set<string>) => void;
  onTypeChange: (types: Set<string>) => void;
  onAccountChange: (accounts: Set<string>) => void;
  showAccountFilter: boolean;
  compactMobile?: boolean;
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  selectedCategories,
  selectedTags,
  selectedTypes,
  selectedAccounts,
  onCategoryChange,
  onTagChange,
  onTypeChange,
  onAccountChange,
  showAccountFilter,
  compactMobile = false
}) => {
  const { categories, tags, bankAccounts } = useData();
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState<'category' | 'tag' | 'type' | 'account' | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 });
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const filterButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Search queries for flyouts
  const [accountQuery, setAccountQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');

  const normalize = (s: string) => (s || '').toLowerCase();

  const toggleCategory = (categoryId: string) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(categoryId)) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    onCategoryChange(newSet);
  };

  const toggleTag = (tagId: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tagId)) {
      newSet.delete(tagId);
    } else {
      newSet.add(tagId);
    }
    onTagChange(newSet);
  };

  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    onTypeChange(newSet);
  };

  const toggleAccount = (accountId: string) => {
    const newSet = new Set(selectedAccounts);
    if (newSet.has(accountId)) {
      newSet.delete(accountId);
    } else {
      newSet.add(accountId);
    }
    onAccountChange(newSet);
  };

  const clearAllFilters = () => {
    onCategoryChange(new Set());
    onTagChange(new Set());
    onTypeChange(new Set());
    onAccountChange(new Set());
    setAccountQuery('');
    setCategoryQuery('');
    setTagQuery('');
  };

  const activeFilterCount = selectedCategories.size + selectedTags.size + selectedTypes.size + selectedAccounts.size;

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mainMenuRef.current && !mainMenuRef.current.contains(event.target as Node)) {
        setShowFilters(false);
        setActiveFilterSection(null);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilters]);

  // Calculate flyout position when hovering filter option
  const handleFilterHover = (section: 'category' | 'tag' | 'type' | 'account', buttonRef: HTMLButtonElement | null) => {
    if (buttonRef && mainMenuRef.current) {
      const buttonRect = buttonRef.getBoundingClientRect();
      const menuRect = mainMenuRef.current.getBoundingClientRect();
      setFlyoutPosition({
        top: buttonRect.top - menuRect.top,
        left: -8 // Opens on left with small gap
      });
      setActiveFilterSection(section);
      // Reset other queries when switching sections (keeps local context clean)
      if (section !== 'account') setAccountQuery('');
      if (section !== 'category') setCategoryQuery('');
      if (section !== 'tag') setTagQuery('');
    }
  };

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors",
          showFilters
            ? "[background-color:var(--color-bg-tertiary)] [border-color:var(--color-border-secondary)] [color:var(--color-text-primary)]"
            : "[border-color:var(--color-border-primary)] [color:var(--color-text-secondary)] hover:[background-color:var(--color-bg-secondary)]",
          compactMobile && "px-2.5 sm:px-3"
        )}
        aria-label="Filter transactions"
      >
        <Filter className="h-4 w-4" />
        <span className={compactMobile ? 'hidden sm:inline' : ''}>Filter</span>
        {activeFilterCount > 0 && (
          <span className={cn("px-1.5 py-0.5 text-[10px] font-bold rounded-full", compactMobile ? 'ml-0 sm:ml-1' : 'ml-1')} style={{ backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }}>
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Dropdown */}
      {showFilters && (
        <div 
          ref={mainMenuRef}
          className="absolute right-0 mt-1.5 w-56 popup-surface rounded-xl z-50"
          style={{ backgroundColor: 'var(--color-card-bg)', borderColor: 'var(--color-border-primary)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>Filter by</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs theme-text-secondary hover:theme-text-primary"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="py-1">
            {showAccountFilter && (
              <button
                ref={(el) => (filterButtonRefs.current['account'] = el)}
                onMouseEnter={(e) => handleFilterHover('account', e.currentTarget)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors hover:[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)]"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>Account</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAccounts.size > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }}>
                      {selectedAccounts.size}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            )}

            <button
              ref={(el) => (filterButtonRefs.current['category'] = el)}
              onMouseEnter={(e) => handleFilterHover('category', e.currentTarget)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors hover:[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)]"
            >
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Category</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedCategories.size > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }}>
                    {selectedCategories.size}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>

            <button
              ref={(el) => (filterButtonRefs.current['tag'] = el)}
              onMouseEnter={(e) => handleFilterHover('tag', e.currentTarget)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors hover:[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)]"
            >
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Tag</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedTags.size > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }}>
                    {selectedTags.size}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>

            <button
              ref={(el) => (filterButtonRefs.current['type'] = el)}
              onMouseEnter={(e) => handleFilterHover('type', e.currentTarget)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors hover:[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)]"
            >
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Type</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedTypes.size > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)', color: 'var(--color-text-inverse)' }}>
                    {selectedTypes.size}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          </div>

          {/* Flyout Panels - positioned on the left */}
          {activeFilterSection === 'account' && (
            <div 
              className="relative sm:absolute sm:right-full sm:top-[var(--flyout-top)] sm:mr-2 w-full border-t sm:border-t-0 sm:w-80 popup-surface rounded-xl max-h-72 sm:max-h-96 overflow-auto py-1"
              style={{ 
                // Desktop: flyout opens to the left at the hovered row. Phones: it stacks
                // inside the menu instead (opening left would push it off-screen).
                ['--flyout-top' as string]: `${flyoutPosition.top}px`,
                backgroundColor: 'var(--color-card-bg)',
                borderColor: 'var(--color-border-primary)'
              }}
              onMouseLeave={() => setActiveFilterSection(null)}
            >
              <div className="px-3 py-2">
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                  className="input-field text-sm py-1.5"
                />
              </div>
              {bankAccounts
                .filter((account) => {
                  const q = normalize(accountQuery);
                  if (!q) return true;
                  const hay = normalize(`${account.bank} ${account.number}`);
                  return hay.includes(q);
                })
                .map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    toggleAccount(account.id);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${
                    selectedAccounts.has(account.id)
                      ? '[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)] font-medium'
                      : 'hover:[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAccounts.has(account.id)}
                    onChange={() => {}}
                    className="rounded border-gray-300 dark:border-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span style={{ color: 'var(--color-success)' }}>●</span>
                  <span>
                    {account.bank} (...{account.number.slice(-4)})
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeFilterSection === 'category' && (
            <div 
              className="relative sm:absolute sm:right-full sm:top-[var(--flyout-top)] sm:mr-2 w-full border-t sm:border-t-0 sm:w-80 popup-surface rounded-xl max-h-72 sm:max-h-96 overflow-auto py-1"
              style={{ 
                // Desktop: flyout opens to the left at the hovered row. Phones: it stacks
                // inside the menu instead (opening left would push it off-screen).
                ['--flyout-top' as string]: `${flyoutPosition.top}px`,
                backgroundColor: 'var(--color-card-bg)',
                borderColor: 'var(--color-border-primary)'
              }}
              onMouseLeave={() => setActiveFilterSection(null)}
            >
              <div className="px-3 py-2">
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  className="input-field text-sm py-1.5"
                />
              </div>
              {categories
                .filter((category) => {
                  const q = normalize(categoryQuery);
                  if (!q) return true;
                  const hay = normalize(`${category.name}`);
                  return hay.includes(q);
                })
                .map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    toggleCategory(category.id);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${
                    selectedCategories.has(category.id)
                      ? '[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)] font-medium'
                      : 'hover:[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.has(category.id)}
                    onChange={() => {}}
                    className="rounded border-gray-300 dark:border-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-lg">{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeFilterSection === 'tag' && (
            <div 
              className="relative sm:absolute sm:right-full sm:top-[var(--flyout-top)] sm:mr-2 w-full border-t sm:border-t-0 sm:w-80 popup-surface rounded-xl max-h-72 sm:max-h-96 overflow-auto py-1"
              style={{ 
                // Desktop: flyout opens to the left at the hovered row. Phones: it stacks
                // inside the menu instead (opening left would push it off-screen).
                ['--flyout-top' as string]: `${flyoutPosition.top}px`,
                backgroundColor: 'var(--color-card-bg)',
                borderColor: 'var(--color-border-primary)'
              }}
              onMouseLeave={() => setActiveFilterSection(null)}
            >
              <div className="px-3 py-2">
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  className="input-field text-sm py-1.5"
                />
              </div>
              {tags.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No tags yet. Create tags to organize your transactions.
                </div>
              ) : (
                tags
                  .filter((tag) => {
                    const q = normalize(tagQuery);
                    if (!q) return true;
                    const hay = normalize(tag.name);
                    return hay.includes(q);
                  })
                  .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      toggleTag(tag.id);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${
                      selectedTags.has(tag.id)
                        ? '[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)] font-medium'
                        : 'hover:[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag.id)}
                      onChange={() => {}}
                      className="rounded border-gray-300 dark:border-gray-600"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {activeFilterSection === 'type' && (
            <div 
              className="relative sm:absolute sm:right-full sm:top-[var(--flyout-top)] sm:mr-2 w-full border-t sm:border-t-0 sm:w-60 popup-surface rounded-xl py-1"
              style={{ 
                // Desktop: flyout opens to the left at the hovered row. Phones: it stacks
                // inside the menu instead (opening left would push it off-screen).
                ['--flyout-top' as string]: `${flyoutPosition.top}px`,
                backgroundColor: 'var(--color-card-bg)',
                borderColor: 'var(--color-border-primary)'
              }}
              onMouseLeave={() => setActiveFilterSection(null)}
            >
              {['income', 'expense', 'investment', 'insurance'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    toggleType(type);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${
                    selectedTypes.has(type)
                      ? '[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)] font-medium'
                      : 'hover:[background-color:var(--color-bg-secondary)] [color:var(--color-text-primary)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(type)}
                    onChange={() => {}}
                    className="rounded border-gray-300 dark:border-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionFilters;
