import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, TrendingUp, Camera, Loader2 } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { Asset } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import ImageUploader from '../../common/ImageUploader';
import { aiService, ExtractedAssetData } from '../../../services/aiService';
import MarketDataService from '../../../services/marketDataService';

const AssetsStep: React.FC = () => {
  const { assets, addAsset, deleteAsset } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'stocks' as Asset['category'],
    currentValue: 0,
    purchaseValue: 0,
    purchaseDate: '',
  });

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const nameWrapperRef = useRef<HTMLDivElement>(null);
  const userIsTypingRef = useRef(false);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (nameWrapperRef.current && !nameWrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search effect — only for stocks/mutual_funds when user is typing
  useEffect(() => {
    if (!userIsTypingRef.current) return;
    userIsTypingRef.current = false;

    const query = newAsset.name;
    const category = newAsset.category;

    if (!query || query.length < 2 || (category !== 'stocks' && category !== 'mutual_funds')) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let results: any[] = [];
        if (category === 'stocks') {
          results = await MarketDataService.searchStocks(query);
        } else {
          results = await MarketDataService.searchMutualFunds(query);
        }
        setSuggestions(results);
        if (results.length > 0) setShowSuggestions(true);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [newAsset.name, newAsset.category]);

  const handleSuggestionClick = (item: any) => {
    const name = newAsset.category === 'stocks' ? item.symbol : item.name;
    setNewAsset(prev => ({ ...prev, name }));
    setShowSuggestions(false);
  };

  const assetCategories = [
    { value: 'stocks', label: 'Stocks', icon: '📈' },
    { value: 'mutual_funds', label: 'Mutual Funds', icon: '📊' },
    { value: 'fixed_deposit', label: 'Fixed Deposit', icon: '🏦' },
    { value: 'gold', label: 'Gold', icon: '🥇' },
    { value: 'cash', label: 'Cash/Savings', icon: '💰' },
    { value: 'other', label: 'Other', icon: '💼' },
  ];

  const handleAddAsset = () => {
    if (newAsset.name && newAsset.currentValue > 0) {
      addAsset(newAsset);
      setNewAsset({
        name: '',
        category: 'stocks',
        currentValue: 0,
        purchaseValue: 0,
        purchaseDate: '',
      });
      setShowAddForm(false);
    }
  };

  const handleImageAnalyzed = (extractedAssets: ExtractedAssetData[]) => {
    // Add all extracted assets
    extractedAssets.forEach(asset => {
      addAsset({
        name: asset.name,
        category: asset.category,
        currentValue: asset.currentValue,
        purchaseValue: asset.purchaseValue || 0,
        purchaseDate: '',
      });
    });

    setShowImageUploader(false);

    // Show success message
    if (extractedAssets.length > 0) {
      // You could add a toast notification here
      console.log(`Successfully added ${extractedAssets.length} assets from screenshot`);
    }
  };

  const totalAssetValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold theme-text-primary mb-2">Assets & Investments</h2>
        <p className="theme-text-secondary">
          Add your current assets and investments to track your portfolio.
        </p>
      </div>

      {/* Summary */}
      <div className="metric-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold theme-text-primary">Total Portfolio Value</h3>
            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-accent-primary)' }}>
              {formatCurrency(totalAssetValue)}
            </p>
          </div>
          <TrendingUp className="w-12 h-12" style={{ color: 'var(--color-accent-primary)' }} />
        </div>
        <p className="text-sm theme-text-muted mt-2">
          {assets.length} {assets.length === 1 ? 'asset' : 'assets'} tracked
        </p>
      </div>

      {/* Add Asset Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg font-semibold theme-text-primary">Your Assets</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowImageUploader(true)}
            className="btn-secondary flex items-center justify-center flex-1 sm:flex-none"
          >
            <Camera className="w-4 h-4 mr-2 flex-shrink-0" />
            Import Screenshot
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center justify-center flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
            Add Manually
          </button>
        </div>
      </div>

      {/* Screenshot Import */}
      {showImageUploader && (
        <div className="card border-dashed">
          <ImageUploader
            title="📸 Import Assets from Screenshot"
            description="Upload a screenshot of your portfolio, demat account, or investment app to automatically extract your assets."
            onImageAnalyzed={handleImageAnalyzed}
            analyzeFunction={aiService.extractAssetsFromImage.bind(aiService)}
            acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setShowImageUploader(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Asset Form */}
      {showAddForm && (
        <div className="card">
          <h4 className="font-medium theme-text-primary mb-4">Add New Asset</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={nameWrapperRef} className="relative">
              <label className="form-label">
                Asset Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newAsset.name}
                  onChange={(e) => {
                    userIsTypingRef.current = true;
                    setNewAsset({ ...newAsset, name: e.target.value });
                  }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  className="input-field theme-input pr-8"
                  placeholder="e.g., HDFC Equity Fund, SBI Shares"
                  autoComplete="off"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full theme-dropdown rounded-lg max-h-48 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <li
                      key={idx}
                      onMouseDown={() => handleSuggestionClick(item)}
                      className="theme-dropdown-item text-sm"
                    >
                      <span className="font-medium theme-text-primary">
                        {newAsset.category === 'stocks' ? item.symbol : item.name}
                      </span>
                      {item.name && newAsset.category === 'stocks' && (
                        <span className="ml-2 theme-text-muted text-xs">{item.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="form-label">
                Category
              </label>
              <select
                value={newAsset.category}
                onChange={(e) => {
                  setNewAsset({ ...newAsset, category: e.target.value as Asset['category'] });
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="input-field theme-input"
              >
                {assetCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                Current Value
              </label>
              <div className="relative">
                <span className="currency-prefix">₹</span>
                <input
                  type="number"
                  value={newAsset.currentValue || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, currentValue: Number(e.target.value) })}
                  className="input-field theme-input currency-input"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="form-label">
                Purchase Value (Optional)
              </label>
              <div className="relative">
                <span className="currency-prefix">₹</span>
                <input
                  type="number"
                  value={newAsset.purchaseValue || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, purchaseValue: Number(e.target.value) })}
                  className="input-field theme-input currency-input"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="form-label">
                Purchase Date (Optional)
              </label>
              <input
                type="date"
                value={newAsset.purchaseDate}
                onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                className="input-field theme-input"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddAsset} className="btn-primary">
              Add Asset
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Assets List */}
      <div className="space-y-4">
        {assets.length === 0 ? (
          <div className="text-center py-12 theme-text-muted">
            <TrendingUp className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-border-secondary)' }} />
            <h3 className="text-lg font-medium theme-text-primary mb-2">No assets added yet</h3>
            <p className="theme-text-secondary">
              Start by adding your investments, savings, and other assets to track your portfolio.
            </p>
          </div>
        ) : (
          assets.map((asset) => {
            const category = assetCategories.find(cat => cat.value === asset.category);
            const gainLoss = asset.purchaseValue ? asset.currentValue - asset.purchaseValue : 0;
            const gainLossPercent = asset.purchaseValue ? (gainLoss / asset.purchaseValue) * 100 : 0;

            return (
              <div key={asset.id} className="card !p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{category?.icon}</span>
                      <div>
                        <h4 className="font-medium theme-text-primary">{asset.name}</h4>
                        <p className="text-sm theme-text-secondary">{category?.label}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="theme-text-secondary">Current Value</p>
                        <p className="font-semibold theme-text-primary">{formatCurrency(asset.currentValue)}</p>
                      </div>
                      {asset.purchaseValue && (
                        <>
                          <div>
                            <p className="theme-text-secondary">Purchase Value</p>
                            <p className="font-semibold theme-text-primary">{formatCurrency(asset.purchaseValue)}</p>
                          </div>
                          <div>
                            <p className="theme-text-secondary">Gain/Loss</p>
                            <p className={`font-semibold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                            </p>
                          </div>
                          <div>
                            <p className="theme-text-secondary">Return %</p>
                            <p className={`font-semibold ${gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="p-2 rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Asset Categories Summary */}
      {assets.length > 0 && (
        <div className="card">
          <h4 className="font-medium theme-text-primary mb-4">Portfolio Allocation</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {assetCategories.map(category => {
              const categoryAssets = assets.filter(a => a.category === category.value);
              const categoryValue = categoryAssets.reduce((sum, a) => sum + a.currentValue, 0);
              const percentage = totalAssetValue > 0 ? (categoryValue / totalAssetValue) * 100 : 0;

              if (categoryValue === 0) return null;

              return (
                <div key={category.value} className="text-center p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <div className="text-xl mb-1">{category.icon}</div>
                  <p className="text-sm font-medium theme-text-primary">{category.label}</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-accent-primary)' }}>{formatCurrency(categoryValue)}</p>
                  <p className="text-xs theme-text-muted">{percentage.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsStep;