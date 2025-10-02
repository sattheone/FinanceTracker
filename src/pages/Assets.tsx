import React, { useState } from 'react';
import { TrendingUp, PieChart, Wallet, Camera, Plus, Edit3, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatLargeNumber } from '../utils/formatters';
import ImageUploader from '../components/common/ImageUploader';
import DataConfirmationDialog from '../components/common/DataConfirmationDialog';
import Modal from '../components/common/Modal';
import AssetForm from '../components/forms/AssetForm';
// AI service will be imported dynamically when needed
import { Asset } from '../types';

const Assets: React.FC = () => {
  const { assets, addAsset, updateAsset, deleteAsset } = useData();
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [extractedData, setExtractedData] = useState<any[]>([]);
  
  const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stocks': return '📈';
      case 'mutual_funds': return '📊';
      case 'fixed_deposit': return '🏦';
      case 'gold': return '🥇';
      case 'cash': return '💰';
      default: return '💼';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'stocks': return 'bg-red-50 border-red-200';
      case 'mutual_funds': return 'bg-blue-50 border-blue-200';
      case 'fixed_deposit': return 'bg-green-50 border-green-200';
      case 'gold': return 'bg-yellow-50 border-yellow-200';
      case 'cash': return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
      default: return 'bg-purple-50 border-purple-200';
    }
  };

  const assetsByCategory = assets.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = [];
    }
    acc[asset.category].push(asset);
    return acc;
  }, {} as Record<string, typeof assets>);

  const categoryTotals = Object.entries(assetsByCategory).map(([category, assets]) => ({
    category,
    total: assets.reduce((sum, asset) => sum + asset.currentValue, 0),
    count: assets.length,
    assets
  })).sort((a, b) => b.total - a.total);

  // Handler functions
  const handleImageAnalyzed = (data: any[]) => {
    setExtractedData(data);
    setShowImageUploader(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmData = (confirmedData: any[]) => {
    confirmedData.forEach(asset => {
      addAsset({
        name: asset.name,
        category: asset.category,
        currentValue: asset.currentValue,
        purchaseValue: asset.purchaseValue,
      });
    });
    setShowConfirmDialog(false);
    setExtractedData([]);
  };

  const handleAddAsset = () => {
    setEditingAsset(null);
    setShowAssetForm(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setShowAssetForm(true);
  };

  const handleDeleteAsset = (assetId: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      deleteAsset(assetId);
    }
  };

  const handleAssetSubmit = (assetData: Omit<Asset, 'id'>) => {
    if (editingAsset) {
      updateAsset(editingAsset.id, assetData);
    } else {
      addAsset(assetData);
    }
    setShowAssetForm(false);
    setEditingAsset(null);
  };

  const handleAssetCancel = () => {
    setShowAssetForm(false);
    setEditingAsset(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">Assets Portfolio</h1>
        <p className="text-gray-600 dark:text-gray-300 dark:text-gray-400 mt-1">Overview of your investment portfolio and assets</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card text-center">
          <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Assets</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{formatLargeNumber(totalAssets)}</p>
        </div>
        <div className="metric-card text-center">
          <PieChart className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Asset Categories</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{Object.keys(assetsByCategory).length}</p>
        </div>
        <div className="metric-card text-center">
          <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Holdings</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{assets.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowImageUploader(true)}
          className="btn-primary flex items-center"
        >
          <Camera className="w-4 h-4 mr-2" />
          Add from Screenshot
        </button>
        <button
          onClick={handleAddAsset}
          className="btn-secondary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Manually
        </button>
      </div>

      {/* Asset Allocation Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-4">Asset Allocation</h3>
        <div className="space-y-4">
          {categoryTotals.map(({ category, total, count }) => {
            const percentage = (total / totalAssets) * 100;
            return (
              <div key={category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{getCategoryIcon(category)}</span>
                    <span className="font-medium text-gray-900 dark:text-white dark:text-white capitalize">
                      {category.replace('_', ' ')} ({count} {count === 1 ? 'asset' : 'assets'})
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white dark:text-white">{formatLargeNumber(total)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Assets by Category */}
      <div className="space-y-6">
        {categoryTotals.map(({ category, assets, total }) => (
          <div key={category} className={`card border-l-4 ${getCategoryColor(category)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getCategoryIcon(category)}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {category.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {assets.length} {assets.length === 1 ? 'asset' : 'assets'} • {formatLargeNumber(total)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Portfolio Weight</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {((total / totalAssets) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div key={asset.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">{asset.name}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Current Value:</span>
                      <span className="font-semibold">{formatLargeNumber(asset.currentValue)}</span>
                    </div>
                    {asset.purchaseValue && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Purchase Value:</span>
                          <span>{formatLargeNumber(asset.purchaseValue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Gain/Loss:</span>
                          <span className={asset.currentValue > asset.purchaseValue ? 'text-green-600' : 'text-red-600'}>
                            {asset.currentValue > asset.purchaseValue ? '+' : ''}
                            {formatLargeNumber(asset.currentValue - asset.purchaseValue)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Portfolio %:</span>
                      <span className="font-medium">
                        {((asset.currentValue / totalAssets) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleEditAsset(asset)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Asset"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Asset Performance Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Largest Holding</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {assets.length > 0 ? assets.reduce((max, asset) => 
                asset.currentValue > max.currentValue ? asset : max
              ).name : 'N/A'}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {assets.length > 0 ? formatLargeNumber(Math.max(...assets.map(a => a.currentValue))) : '₹0'}
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Diversification</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {Object.keys(assetsByCategory).length} Categories
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">Well Diversified</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Liquid Assets</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatLargeNumber(
                assets
                  .filter(a => ['cash', 'stocks', 'mutual_funds'].includes(a.category))
                  .reduce((sum, a) => sum + a.currentValue, 0)
              )}
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {totalAssets > 0 ? (
                (assets
                  .filter(a => ['cash', 'stocks', 'mutual_funds'].includes(a.category))
                  .reduce((sum, a) => sum + a.currentValue, 0) / totalAssets) * 100
              ).toFixed(1) : 0}% of Portfolio
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Average Holding</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {assets.length > 0 ? formatLargeNumber(totalAssets / assets.length) : '₹0'}
            </p>
            <p className="text-sm text-purple-600 dark:text-purple-400">Per Asset</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Image Uploader Modal */}
      {showImageUploader && (
        <Modal
          isOpen={showImageUploader}
          onClose={() => setShowImageUploader(false)}
          title="Add Assets from Screenshot"
          size="lg"
        >
          <ImageUploader
            onImageAnalyzed={handleImageAnalyzed}
            analyzeFunction={async (file: File) => {
              const { aiService } = await import('../services/aiService');
              return aiService.extractAssetsFromImage(file);
            }}
            title="Upload Portfolio Screenshot"
            description="Upload a screenshot of your portfolio, bank statement, or investment summary. Our AI will automatically extract asset information."
          />
        </Modal>
      )}

      {/* Asset Form Modal */}
      <Modal
        isOpen={showAssetForm}
        onClose={handleAssetCancel}
        title={editingAsset ? 'Edit Asset' : 'Add New Asset'}
        size="lg"
      >
        <AssetForm
          asset={editingAsset || undefined}
          onSubmit={handleAssetSubmit}
          onCancel={handleAssetCancel}
        />
      </Modal>

      {/* Confirmation Dialog */}
      <DataConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmData}
        data={extractedData}
        type="assets"
        title="Confirm Extracted Assets"
      />
    </div>
  );
};

export default Assets;