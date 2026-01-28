import React, { useState, useEffect, useRef } from 'react';
import { Asset } from '../../types';
import MarketDataService from '../../services/marketDataService';
import { Loader2 } from 'lucide-react';

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (asset: Omit<Asset, 'id'>) => void;
  onCancel?: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ asset, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'stocks' as Asset['category'],
    currentValue: 0,
    investedValue: 0, // This will be calculated from Qty * AvgPrice
    purchaseDate: '',
    symbol: '',
    schemeCode: '',
    isSIP: false,
    sipAmount: 0,
    sipDate: 1,
    quantity: 0,
    averagePrice: 0, // NEW field for Input
    marketPrice: 0, // Live price if fetched
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search effect (unchanged search logic)
  useEffect(() => {
    const query = formData.name;
    const category = formData.category;

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
        console.error("Search failed", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.name, formData.category]);

  const handleSuggestionClick = (item: any) => {
    // When selecting a stock/MF, we get the LIVE price
    // We set this as 'marketPrice' (for Current Value calc)
    // But Avg Price remains empty for user to fill their purchase price
    const livePrice = item.price || item.nav || 0;

    if (formData.category === 'stocks') {
      setFormData(prev => ({
        ...prev,
        name: item.symbol,
        symbol: item.symbol,
        marketPrice: livePrice,
        // Update current value based on new live price * quantity
        currentValue: prev.quantity > 0 ? parseFloat((prev.quantity * livePrice).toFixed(2)) : 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: item.name,
        schemeCode: item.code,
        marketPrice: livePrice,
        currentValue: prev.quantity > 0 ? parseFloat((prev.quantity * livePrice).toFixed(2)) : (livePrice || 0)
      }));
    }
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        category: asset.category,
        currentValue: asset.currentValue,
        investedValue: asset.investedValue || asset.purchaseValue || 0,
        purchaseDate: asset.purchaseDate || '',
        symbol: (asset as any).symbol || '',
        schemeCode: (asset as any).schemeCode || '',
        isSIP: (asset as any).isSIP || false,
        sipAmount: (asset as any).sipAmount || 0,
        sipDate: (asset as any).sipDate || 1,
        quantity: (asset as any).quantity || 0,
        averagePrice: (asset as any).averagePrice || ((asset.purchaseValue && (asset as any).quantity) ? asset.purchaseValue / (asset as any).quantity : 0),
        marketPrice: (asset as any).marketPrice || 0,
      });
    }
  }, [asset]);

  // Auto-calculate Invested Value = Quantity * Avg Price
  useEffect(() => {
    if ((formData.category === 'stocks' || formData.category === 'mutual_funds') && formData.quantity > 0 && formData.averagePrice > 0) {
      const invested = formData.quantity * formData.averagePrice;
      if (Math.abs(invested - formData.investedValue) > 0.01) {
        setFormData(prev => ({ ...prev, investedValue: parseFloat(invested.toFixed(2)) }));
      }
    }
  }, [formData.quantity, formData.averagePrice, formData.category]);

  // Auto-calculate Current Value if we have Live Market Price
  useEffect(() => {
    if ((formData.category === 'stocks' || formData.category === 'mutual_funds') && formData.quantity > 0 && formData.marketPrice > 0) {
      // If we have live price, update current value
      const current = formData.quantity * formData.marketPrice;
      // Only update if explicit mode or initial load? For now auto-update
      if (Math.abs(current - formData.currentValue) > 0.01) {
        setFormData(prev => ({ ...prev, currentValue: parseFloat(current.toFixed(2)) }));
      }
    } else if (!asset && formData.investedValue > 0 && formData.currentValue === 0) {
      // Fallback: If no live price, set Current = Invested initially
      setFormData(prev => ({ ...prev, currentValue: prev.investedValue }));
    }
  }, [formData.quantity, formData.marketPrice, formData.investedValue]);


  const assetCategories = [
    { value: 'stocks', label: 'Stocks', icon: '📈' },
    { value: 'mutual_funds', label: 'Mutual Funds', icon: '📊' },
    { value: 'fixed_deposit', label: 'Fixed Deposit', icon: '🏦' },
    { value: 'epf', label: 'EPF (Provident Fund)', icon: '🏛️' },
    { value: 'gold', label: 'Gold', icon: '🥇' },
    { value: 'cash', label: 'Cash/Savings', icon: '💰' },
    { value: 'other', label: 'Other', icon: '💼' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Asset name is required';
    }

    if (formData.quantity <= 0 && (formData.category === 'stocks' || formData.category === 'mutual_funds')) {
      newErrors.quantity = 'Quantity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const assetData: any = {
      name: formData.name.trim(),
      category: formData.category,
      quantity: formData.quantity || undefined,
      averagePrice: formData.averagePrice || undefined,
      purchaseValue: formData.investedValue || undefined, // Store Invested Value in purchaseValue
      investedValue: formData.investedValue || undefined,
      currentValue: formData.currentValue || formData.investedValue, // Default to invested if 0
      marketPrice: formData.marketPrice || undefined, // Store live price if known
      purchaseDate: formData.purchaseDate || undefined,
      symbol: formData.symbol || undefined,
      schemeCode: formData.schemeCode || undefined,
    };

    // Add SIP/Contribution data
    if ((formData.category === 'mutual_funds' || formData.category === 'epf') && formData.isSIP) {
      assetData.isSIP = true;
      assetData.sipAmount = formData.sipAmount;
      assetData.sipDate = formData.sipDate;
      // For SIP, Invested Value might be auto-calculated differently? 
      // User can override manually via "Calculated Invested Value" field if enabled, but here we disabled it for SIP.
      // Actually let's assume standard logic for now.
    }

    onSubmit(assetData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form id="asset-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div ref={wrapperRef} className="relative">
          <label className="form-label">
            Asset Name *
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                handleChange('name', e.target.value);
                setShowSuggestions(true);
              }}
              className={`input-field theme-input ${errors.name ? 'border-red-500' : ''}`}
              placeholder={formData.category === 'stocks' ? "e.g. RELIANCE (Search available)" : "e.g. SBI Blue Chip (Search available)"}
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((item, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionClick(item)}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formData.category === 'stocks' ? item.symbol : item.name}
                    </span>
                    {formData.category === 'mutual_funds' && (
                      <span className="text-xs text-gray-500">{item.code}</span>
                    )}
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                    ₹{item.price || item.nav}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="form-label">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="input-field theme-input"
          >
            {assetCategories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Specific Fields */}
        {(formData.category === 'stocks' || formData.category === 'mutual_funds') && (
          <>
            <div>
              <label className="form-label">
                Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => handleChange('quantity', Number(e.target.value))}
                className="input-field theme-input"
                placeholder="0"
                min="0"
                step="1"
              />
            </div>

            <div>
              <label className="form-label">
                Average Buy Price (₹) *
              </label>
              <input
                type="number"
                value={formData.averagePrice || ''}
                onChange={(e) => handleChange('averagePrice', Number(e.target.value))}
                className="input-field theme-input"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Your average purchase price per share/unit</p>
            </div>

            {/* Read-only Invested Amount */}
            <div>
              <label className="form-label">
                Invested Amount (Calculated)
              </label>
              <input
                type="number"
                value={formData.investedValue || ''}
                readOnly
                className="input-field theme-input bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Quantity × Avg. Buy Price</p>
            </div>

            {/* Live/Current Price - Optional override */}
            <div>
              <label className="form-label flex justify-between">
                <span>Current Market Price (₹)</span>
                {formData.marketPrice > 0 && <span className="text-green-600 text-xs font-medium">Live</span>}
              </label>
              <input
                type="number"
                value={formData.marketPrice || ''}
                onChange={(e) => handleChange('marketPrice', Number(e.target.value))}
                className="input-field theme-input"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-updates if you select a stock/fund</p>
            </div>
          </>
        )}

        {/* For non-stock assets */}
        {formData.category !== 'stocks' && formData.category !== 'mutual_funds' && (
          <div>
            <label className="form-label">
              Current Value *
            </label>
            <input
              type="number"
              value={formData.currentValue || ''}
              onChange={(e) => handleChange('currentValue', Number(e.target.value))}
              className={`input-field theme-input ${errors.currentValue ? 'border-red-500' : ''}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
        )}


        {/* SIP/Contribution Fields for Mutual Funds and EPF */}
        {(formData.category === 'mutual_funds' || formData.category === 'epf') && (
          <>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isSIP}
                  onChange={(e) => handleChange('isSIP', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {formData.category === 'epf'
                    ? 'Enable Monthly Contribution'
                    : 'This is a SIP (Systematic Investment Plan)'}
                </span>
              </label>
            </div>

            {formData.isSIP && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full md:col-span-2">
                  <div>
                    <label className="form-label">
                      {formData.category === 'epf' ? 'Monthly Contribution Amount *' : 'Monthly SIP Amount *'}
                    </label>
                    <input
                      type="number"
                      value={formData.sipAmount || ''}
                      onChange={(e) => handleChange('sipAmount', Number(e.target.value))}
                      className="input-field theme-input"
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      {formData.category === 'epf' ? 'Contribution Date (Day of Month) *' : 'SIP Date (Day of Month) *'}
                    </label>
                    <select
                      value={formData.sipDate}
                      onChange={(e) => handleChange('sipDate', Number(e.target.value))}
                      className="input-field theme-input"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.category === 'mutual_funds' && (
                  <div className="md:col-span-2">
                    <label className="form-label">
                      Scheme Code (Optional - for live NAV)
                    </label>
                    <input
                      type="text"
                      value={formData.schemeCode}
                      onChange={(e) => handleChange('schemeCode', e.target.value)}
                      className="input-field theme-input"
                      placeholder="e.g., 120503 for SBI Blue Chip Fund"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter the AMFI scheme code to automatically fetch live NAV.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="md:col-span-2">
          <label className="form-label">
            Purchase Date (Optional)
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => handleChange('purchaseDate', e.target.value)}
            className="input-field theme-input"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>
    </form>
  );
};

export default AssetForm;