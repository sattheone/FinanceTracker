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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Assets & Investments</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Add your current assets and investments to track your portfolio.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Portfolio Value</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {formatCurrency(totalAssetValue)}
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          {assets.length} {assets.length === 1 ? 'asset' : 'assets'} tracked
        </p>
      </div>

      {/* Add Asset Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Assets</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImageUploader(true)}
            className="btn-secondary flex items-center"
          >
            <Camera className="w-4 h-4 mr-2" />
            Import Screenshot
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Manually
          </button>
        </div>
      </div>

      {/* Screenshot Import */}
      {showImageUploader && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border-2 border-dashed border-blue-300 dark:border-blue-500">
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
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-500">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add New Asset</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div ref={nameWrapperRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
                <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <li
                      key={idx}
                      onMouseDown={() => handleSuggestionClick(item)}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {newAsset.category === 'stocks' ? item.symbol : item.name}
                      </span>
                      {item.name && newAsset.category === 'stocks' && (
                        <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">{item.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Current Value
              </label>
              <div className="relative">
                <span className="currency-prefix">₹</span>
                <input
                  type="number"
                  value={newAsset.currentValue || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, currentValue: Number(e.target.value) })}
                  className="w-full currency-input py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Purchase Value (Optional)
              </label>
              <div className="relative">
                <span className="currency-prefix">₹</span>
                <input
                  type="number"
                  value={newAsset.purchaseValue || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, purchaseValue: Number(e.target.value) })}
                  className="w-full currency-input py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assets added yet</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Start by adding your investments, savings, and other assets to track your portfolio.
            </p>
          </div>
        ) : (
          assets.map((asset) => {
            const category = assetCategories.find(cat => cat.value === asset.category);
            const gainLoss = asset.purchaseValue ? asset.currentValue - asset.purchaseValue : 0;
            const gainLossPercent = asset.purchaseValue ? (gainLoss / asset.purchaseValue) * 100 : 0;

            return (
              <div key={asset.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{category?.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{asset.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{category?.label}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-300">Current Value</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(asset.currentValue)}
                        </p>
                      </div>
                      {asset.purchaseValue && (
                        <>
                          <div>
                            <p className="text-gray-600 dark:text-gray-300">Purchase Value</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(asset.purchaseValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-300">Gain/Loss</p>
                            <p className={`font-semibold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-300">Return %</p>
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
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 p-2 rounded-lg"
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
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Portfolio Allocation</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {assetCategories.map(category => {
              const categoryAssets = assets.filter(a => a.category === category.value);
              const categoryValue = categoryAssets.reduce((sum, a) => sum + a.currentValue, 0);
              const percentage = totalAssetValue > 0 ? (categoryValue / totalAssetValue) * 100 : 0;

              if (categoryValue === 0) return null;

              return (
                <div key={category.value} className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="text-xl mb-1">{category.icon}</div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{category.label}</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(categoryValue)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{percentage.toFixed(1)}%</p>
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