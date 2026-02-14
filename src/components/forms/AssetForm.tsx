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
    broker: '', // Broker/Platform field
    notes: '', // Notes field
    // FD specific fields
    principalAmount: 0,
    interestRate: 0,
    maturityDate: '',
    fdNumber: '',
    interestPayoutFrequency: 'At Maturity',
    // Chit specific fields
    chitGroupName: '',
    chitTicketValue: 0,
    chitDurationMonths: 0,
    chitStartDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
    const [isManualCurrentValue, setIsManualCurrentValue] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const userIsTypingRef = useRef(false); // Only search when user is actively typing

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

  // Search effect — only runs when user is actively typing in the name field
  useEffect(() => {
    if (!userIsTypingRef.current) {
      return;
    }
    userIsTypingRef.current = false;

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
        currentValue: prev.quantity > 0 ? parseFloat((prev.quantity * livePrice).toFixed(2)) : prev.currentValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: item.name,
        schemeCode: item.code,
        marketPrice: livePrice,
        currentValue: prev.quantity > 0 ? parseFloat((prev.quantity * livePrice).toFixed(2)) : prev.currentValue
      }));
    }
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (asset) {
      setIsManualCurrentValue(!!(asset as any).manualCurrentValue);
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
        quantity: 0, // Optional — user can fill manually if needed
        averagePrice: 0,
        marketPrice: (asset as any).marketPrice || 0,
        broker: (asset as any).broker || '',
        notes: (asset as any).notes || '',
        principalAmount: (asset as any).principalAmount || 0,
        interestRate: (asset as any).interestRate || 0,
        maturityDate: (asset as any).maturityDate || '',
        fdNumber: (asset as any).fdNumber || '',
        interestPayoutFrequency: (asset as any).interestPayoutFrequency || 'At Maturity',
        chitGroupName: (asset as any).chitGroupName || '',
        chitTicketValue: (asset as any).chitTicketValue || 0,
        chitDurationMonths: (asset as any).chitDurationMonths || 0,
        chitStartDate: (asset as any).chitStartDate || '',
      });
    }
  }, [asset]);

  // Auto-calculate Invested Value = Quantity * Purchase Price (only for stocks or when quantity is being used)
  useEffect(() => {
    // Skip auto-calculation for MF without quantity (amount-based entry)
    if (formData.category === 'mutual_funds' && !formData.quantity) return;
    
    if ((formData.category === 'stocks' || formData.category === 'mutual_funds') && formData.quantity > 0 && formData.averagePrice > 0) {
      const invested = formData.quantity * formData.averagePrice;
      setFormData(prev => ({ ...prev, investedValue: parseFloat(invested.toFixed(2)) }));
    }
  }, [formData.quantity, formData.averagePrice, formData.category]);

  // Auto-calculate Current Value if we have Market Price (only for stocks or when quantity is being used)
  useEffect(() => {
    if (isManualCurrentValue) return;
    // Skip auto-calculation for MF without quantity (amount-based entry)
    if (formData.category === 'mutual_funds' && !formData.quantity) return;
    
    if ((formData.category === 'stocks' || formData.category === 'mutual_funds') && formData.quantity > 0 && formData.marketPrice > 0) {
      const current = formData.quantity * formData.marketPrice;
      setFormData(prev => ({ ...prev, currentValue: parseFloat(current.toFixed(2)) }));
    }
  }, [formData.quantity, formData.marketPrice, formData.category, isManualCurrentValue]);


  const assetCategories = [
    { value: 'stocks', label: 'Stocks', icon: '📈' },
    { value: 'mutual_funds', label: 'Mutual Funds', icon: '📊' },
    { value: 'fixed_deposit', label: 'Fixed Deposit', icon: '🏦' },
    { value: 'epf', label: 'EPF (Provident Fund)', icon: '🏛️' },
    { value: 'gold', label: 'Gold', icon: '🥇' },
    { value: 'cash', label: 'Cash/Savings', icon: '💰' },
    { value: 'chit', label: 'Chit', icon: '🪙' },
    { value: 'other', label: 'Other', icon: '💼' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Asset name is required';
    }

    if (formData.category === 'fixed_deposit') {
      if (formData.principalAmount <= 0) {
        newErrors.principalAmount = 'Principal amount is required';
      }
      if (formData.interestRate <= 0) {
        newErrors.interestRate = 'Interest rate is required';
      }
    } else if (formData.category === 'chit') {
      if (formData.chitTicketValue <= 0) {
        newErrors.chitTicketValue = 'Chit ticket value is required';
      }
      if (formData.chitDurationMonths <= 0) {
        newErrors.chitDurationMonths = 'Duration is required';
      }
    } else {
      if (formData.currentValue <= 0) {
        newErrors.currentValue = 'Current value is required';
      }
      
      // For stocks/MF, check investedValue if they're using the amount fields (not quantity-based)
      if (formData.category === 'stocks' && formData.investedValue <= 0 && formData.quantity === 0) {
        newErrors.investedValue = 'Invested amount is required';
      } else if (formData.category === 'mutual_funds' && formData.investedValue <= 0 && formData.quantity === 0) {
        newErrors.investedValue = 'Invested amount is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // For Fixed Deposits, set currentValue and investedValue from principalAmount
    let finalInvestedValue = formData.investedValue;
    let finalCurrentValue = formData.currentValue;
    
    if (formData.category === 'fixed_deposit') {
      finalInvestedValue = formData.principalAmount;
      finalCurrentValue = formData.principalAmount; // Can be enhanced later to calculate with interest
    } else if (formData.category === 'chit') {
      finalCurrentValue = formData.chitTicketValue || 0;
      finalInvestedValue = formData.chitTicketValue || 0;
    } else if (formData.category === 'mutual_funds') {
      // For mutual funds, if no quantity/price specified, ensure both investedValue and currentValue are set
      if (!formData.quantity && !formData.averagePrice) {
        // Both values should already be set from the form inputs
        finalInvestedValue = formData.investedValue;
        finalCurrentValue = formData.currentValue;
      }
    } else if (formData.category !== 'stocks') {
      // For other assets (EPF, gold, cash, other), set investedValue = currentValue if not provided
      finalInvestedValue = formData.investedValue || formData.currentValue;
    }

    const assetData: any = {
      name: formData.name.trim(),
      category: formData.category,
      // Persist null for optional numeric fields when left empty so old values are cleared
      quantity: formData.quantity > 0 ? formData.quantity : null,
      averagePrice: formData.averagePrice > 0 ? formData.averagePrice : null,
      purchaseValue: finalInvestedValue || undefined, // Store Invested Value in purchaseValue
      investedValue: finalInvestedValue || undefined,
      currentValue: finalCurrentValue || undefined,
      marketPrice: formData.marketPrice > 0 ? formData.marketPrice : null, // Store live price if known
      purchaseDate: formData.purchaseDate || undefined,
      symbol: formData.symbol || undefined,
      schemeCode: formData.schemeCode || undefined,
      broker: formData.broker || undefined,
      notes: formData.notes || undefined,
      // FD specific fields
      principalAmount: formData.principalAmount || undefined,
      interestRate: formData.interestRate || undefined,
      maturityDate: formData.maturityDate || undefined,
      fdNumber: formData.fdNumber || undefined,
      interestPayoutFrequency: formData.interestPayoutFrequency || undefined,
      // Chit specific fields
      chitGroupName: formData.chitGroupName || undefined,
      chitTicketValue: formData.chitTicketValue || undefined,
      chitDurationMonths: formData.chitDurationMonths || undefined,
      chitStartDate: formData.chitStartDate || undefined,
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
            {formData.category === 'stocks' ? 'Stock Name / Symbol *' : formData.category === 'mutual_funds' ? 'Fund Name *' : 'Asset Name *'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                userIsTypingRef.current = true;
                handleChange('name', e.target.value);
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

        {/* Stock/MF Specific Fields */}
        {(formData.category === 'stocks' || formData.category === 'mutual_funds') && (
          <>
            <div>
              <label className="form-label">
                {formData.category === 'stocks' ? 'Number of Shares *' : 'Number of Units'}
              </label>
              <input
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => handleChange('quantity', Number(e.target.value))}
                className="input-field theme-input"
                placeholder="100"
                min="0"
                step="1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Auto-update requires quantity. Leave empty to keep manual values.
              </p>
            </div>

            {/* For Stocks: Purchase Price and Current Price */}
            {formData.category === 'stocks' && (
              <>
                <div>
                  <label className="form-label">
                    Purchase Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.averagePrice || ''}
                    onChange={(e) => handleChange('averagePrice', Number(e.target.value))}
                    className="input-field theme-input"
                    placeholder="1500.00"
                    min="0"
                    step="any"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleChange('purchaseDate', e.target.value)}
                    className="input-field theme-input"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="form-label">
                    Current Price (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.marketPrice || ''}
                    onChange={(e) => handleChange('marketPrice', Number(e.target.value))}
                    className="input-field theme-input"
                    placeholder="1650.00"
                    min="0"
                    step="any"
                  />
                  {formData.marketPrice > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="text-green-600 font-medium">● Live</span> - Auto-updated from market data
                    </p>
                  )}
                </div>
              </>
            )}

            {/* For Mutual Funds: Invested Amount and Current Amount fields */}
            {formData.category === 'mutual_funds' && (
              <>
                <div>
                  <label className="form-label">
                    Invested Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.investedValue || ''}
                    onChange={(e) => handleChange('investedValue', Number(e.target.value))}
                    className={`input-field theme-input ${errors.investedValue ? 'border-red-500' : ''}`}
                    placeholder="50000.00"
                    min="0"
                    step="any"
                  />
                  {errors.investedValue && <p className="text-red-500 text-sm mt-1">{errors.investedValue}</p>}
                </div>

                <div>
                  <label className="form-label">
                    Current Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.currentValue || ''}
                    onChange={(e) => {
                      setIsManualCurrentValue(true);
                      handleChange('currentValue', Number(e.target.value));
                    }}
                    className={`input-field theme-input ${errors.currentValue ? 'border-red-500' : ''}`}
                    placeholder="55000.00"
                    min="0"
                    step="any"
                  />
                  {errors.currentValue && <p className="text-red-500 text-sm mt-1">{errors.currentValue}</p>}
                </div>

                <div>
                  <label className="form-label">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleChange('purchaseDate', e.target.value)}
                    className="input-field theme-input"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </>
            )}
            {/* Broker/Platform */}
            <div className="md:col-span-2">
              <label className="form-label">
                Broker / Platform
              </label>
              <input
                type="text"
                value={formData.broker}
                onChange={(e) => handleChange('broker', e.target.value)}
                className="input-field theme-input"
                placeholder="e.g., Zerodha, Upstox"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="form-label">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="input-field theme-input"
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </>
        )}

        {/* For Fixed Deposit */}
        {formData.category === 'fixed_deposit' && (
          <>
            <div>
              <label className="form-label">
                Principal Amount (₹) *
              </label>
              <input
                type="number"
                value={formData.principalAmount || ''}
                onChange={(e) => handleChange('principalAmount', Number(e.target.value))}
                className={`input-field theme-input ${errors.principalAmount ? 'border-red-500' : ''}`}
                placeholder="100000"
                min="0"
                step="any"
              />
              {errors.principalAmount && <p className="text-red-500 text-sm mt-1">{errors.principalAmount}</p>}
            </div>

            <div>
              <label className="form-label">
                Interest Rate (%) *
              </label>
              <input
                type="number"
                value={formData.interestRate || ''}
                onChange={(e) => handleChange('interestRate', Number(e.target.value))}
                className={`input-field theme-input ${errors.interestRate ? 'border-red-500' : ''}`}
                placeholder="6.5"
                min="0"
                max="100"
                step="0.01"
              />
              {errors.interestRate && <p className="text-red-500 text-sm mt-1">{errors.interestRate}</p>}
            </div>

            <div>
              <label className="form-label">
                Start Date
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => handleChange('purchaseDate', e.target.value)}
                className="input-field theme-input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="form-label">
                Maturity Date
              </label>
              <input
                type="date"
                value={formData.maturityDate}
                onChange={(e) => handleChange('maturityDate', e.target.value)}
                className="input-field theme-input"
                min={formData.purchaseDate || undefined}
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">
                FD Number / Reference
              </label>
              <input
                type="text"
                value={formData.fdNumber}
                onChange={(e) => handleChange('fdNumber', e.target.value)}
                className="input-field theme-input"
                placeholder="FD reference number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">
                Interest Payout Frequency
              </label>
              <select
                value={formData.interestPayoutFrequency}
                onChange={(e) => handleChange('interestPayoutFrequency', e.target.value)}
                className="input-field theme-input"
              >
                <option value="At Maturity">At Maturity</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="form-label">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="input-field theme-input"
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </>
        )}

        {/* For Chit */}
        {formData.category === 'chit' && (
          <>
            <div>
              <label className="form-label">
                Chit Group Name
              </label>
              <input
                type="text"
                value={formData.chitGroupName}
                onChange={(e) => handleChange('chitGroupName', e.target.value)}
                className="input-field theme-input"
                placeholder="e.g., ABC Chit Group"
              />
            </div>

            <div>
              <label className="form-label">
                Chit Ticket Value (₹) *
              </label>
              <input
                type="number"
                value={formData.chitTicketValue || ''}
                onChange={(e) => handleChange('chitTicketValue', Number(e.target.value))}
                className={`input-field theme-input ${errors.chitTicketValue ? 'border-red-500' : ''}`}
                placeholder="500000"
                min="0"
                step="any"
              />
              {errors.chitTicketValue && <p className="text-red-500 text-sm mt-1">{errors.chitTicketValue}</p>}
            </div>

            <div>
              <label className="form-label">
                Duration (Months) *
              </label>
              <input
                type="number"
                value={formData.chitDurationMonths || ''}
                onChange={(e) => handleChange('chitDurationMonths', Number(e.target.value))}
                className={`input-field theme-input ${errors.chitDurationMonths ? 'border-red-500' : ''}`}
                placeholder="20"
                min="1"
                step="1"
              />
              {errors.chitDurationMonths && <p className="text-red-500 text-sm mt-1">{errors.chitDurationMonths}</p>}
            </div>

            <div>
              <label className="form-label">
                Chit Start Date
              </label>
              <input
                type="date"
                value={formData.chitStartDate}
                onChange={(e) => handleChange('chitStartDate', e.target.value)}
                className="input-field theme-input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="input-field theme-input"
                placeholder="Track variable monthly chit payment details via linked transactions."
                rows={3}
              />
            </div>
          </>
        )}

        {/* For other non-stock/MF assets, show simplified fields */}
        {formData.category !== 'stocks' && formData.category !== 'mutual_funds' && formData.category !== 'fixed_deposit' && formData.category !== 'chit' && (
          <>
            <div>
              <label className="form-label">
                Current Value (₹) *
              </label>
              <input
                type="number"
                value={formData.currentValue || ''}
                onChange={(e) => {
                  setIsManualCurrentValue(true);
                  handleChange('currentValue', Number(e.target.value));
                }}
                className={`input-field theme-input ${errors.currentValue ? 'border-red-500' : ''}`}
                placeholder="0.00"
                min="0"
                step="any"
              />
            </div>

            <div>
              <label className="form-label">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => handleChange('purchaseDate', e.target.value)}
                className="input-field theme-input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="input-field theme-input"
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </>
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

      </div>
    </form>
  );
};

export default AssetForm;