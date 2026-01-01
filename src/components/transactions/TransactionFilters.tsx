import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

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
  showAccountFilter
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
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Filter className="h-4 w-4" />
        Filter
        {activeFilterCount > 0 && (
          <span className="ml-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Dropdown */}
      {showFilters && (
        <div 
          ref={mainMenuRef}
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filter by</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
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
                className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>Account</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAccounts.size > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
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
              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Category</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedCategories.size > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                    {selectedCategories.size}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>

            <button
              ref={(el) => (filterButtonRefs.current['tag'] = el)}
              onMouseEnter={(e) => handleFilterHover('tag', e.currentTarget)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Tag</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedTags.size > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                    {selectedTags.size}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>

            <button
              ref={(el) => (filterButtonRefs.current['type'] = el)}
              onMouseEnter={(e) => handleFilterHover('type', e.currentTarget)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Type</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedTypes.size > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
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
              className="absolute right-full w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto py-1"
              style={{ 
                top: `${flyoutPosition.top}px`,
                marginRight: '8px'
              }}
              onMouseLeave={() => setActiveFilterSection(null)}
            >
              <div className="px-3 py-2">
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                    selectedAccounts.has(account.id)
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAccounts.has(account.id)}
                    onChange={() => {}}
                    className="rounded border-gray-300 dark:border-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-green-600 dark:text-green-400">●</span>
                  <span>
                    {account.bank} (...{account.number.slice(-4)})
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeFilterSection === 'category' && (
            <div 
              className="absolute right-full w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto py-1"
              style={{ 
                top: `${flyoutPosition.top}px`,
                marginRight: '8px'
              }}
              onMouseLeave={() => setActiveFilterSection(null)}
            >
              <div className="px-3 py-2">
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                    selectedCategories.has(category.id)
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-200'
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
              className="absolute right-full w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto py-1"
              style={{ 
                top: `${flyoutPosition.top}px`,
                marginRight: '8px'
              }}
              onMouseLeave={() => setActiveFilterSection(null)}
            >
              <div className="px-3 py-2">
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                      selectedTags.has(tag.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-200'
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
              className="absolute right-full w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
              style={{ 
                top: `${flyoutPosition.top}px`,
                marginRight: '8px'
              }}
              onMouseLeave={() => setActiveFilterSection(null)}
            >
              {['income', 'expense', 'investment', 'insurance'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    toggleType(type);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                    selectedTypes.has(type)
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-200'
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
