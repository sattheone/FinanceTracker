import React, { useState } from 'react';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { Asset } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

const AssetsStep: React.FC = () => {
  const { assets, addAsset, deleteAsset } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'stocks' as Asset['category'],
    currentValue: 0,
    purchaseValue: 0,
    purchaseDate: '',
  });

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

  const totalAssetValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Assets & Investments</h2>
        <p className="text-gray-600">
          Add your current assets and investments to track your portfolio.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Portfolio Value</h3>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {formatCurrency(totalAssetValue)}
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-blue-600" />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {assets.length} {assets.length === 1 ? 'asset' : 'assets'} tracked
        </p>
      </div>

      {/* Add Asset Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Your Assets</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Asset
        </button>
      </div>

      {/* Add Asset Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
          <h4 className="font-medium text-gray-900 mb-4">Add New Asset</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Name
              </label>
              <input
                type="text"
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                className="input-field"
                placeholder="e.g., HDFC Equity Fund, SBI Shares"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={newAsset.category}
                onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value as Asset['category'] })}
                className="input-field"
              >
                {assetCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  value={newAsset.currentValue || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, currentValue: Number(e.target.value) })}
                  className="input-field pl-8"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Value (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  value={newAsset.purchaseValue || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, purchaseValue: Number(e.target.value) })}
                  className="input-field pl-8"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Date (Optional)
              </label>
              <input
                type="date"
                value={newAsset.purchaseDate}
                onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                className="input-field"
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
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets added yet</h3>
            <p className="text-gray-600 mb-4">
              Start by adding your investments, savings, and other assets to track your portfolio.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              Add Your First Asset
            </button>
          </div>
        ) : (
          assets.map((asset) => {
            const category = assetCategories.find(cat => cat.value === asset.category);
            const gainLoss = asset.purchaseValue ? asset.currentValue - asset.purchaseValue : 0;
            const gainLossPercent = asset.purchaseValue ? (gainLoss / asset.purchaseValue) * 100 : 0;
            
            return (
              <div key={asset.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{category?.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{asset.name}</h4>
                        <p className="text-sm text-gray-600">{category?.label}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Current Value</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(asset.currentValue)}
                        </p>
                      </div>
                      {asset.purchaseValue && (
                        <>
                          <div>
                            <p className="text-gray-600">Purchase Value</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(asset.purchaseValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Gain/Loss</p>
                            <p className={`font-semibold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Return %</p>
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
                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
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
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Portfolio Allocation</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {assetCategories.map(category => {
              const categoryAssets = assets.filter(a => a.category === category.value);
              const categoryValue = categoryAssets.reduce((sum, a) => sum + a.currentValue, 0);
              const percentage = totalAssetValue > 0 ? (categoryValue / totalAssetValue) * 100 : 0;
              
              if (categoryValue === 0) return null;
              
              return (
                <div key={category.value} className="text-center p-3 bg-white rounded-lg">
                  <div className="text-xl mb-1">{category.icon}</div>
                  <p className="text-sm font-medium text-gray-900">{category.label}</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(categoryValue)}
                  </p>
                  <p className="text-xs text-gray-600">{percentage.toFixed(1)}%</p>
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