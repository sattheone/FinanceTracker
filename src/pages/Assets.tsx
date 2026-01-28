import React, { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Wallet, Camera, Plus, Edit3, Trash2, Target, BarChart3, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatLargeNumber, formatCurrency } from '../utils/formatters';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import ImageUploader from '../components/common/ImageUploader';
import DataConfirmationDialog from '../components/common/DataConfirmationDialog';
import SidePanel from '../components/common/SidePanel';
import AssetForm from '../components/forms/AssetForm';
import MarketDataService from '../services/marketDataService';
import XIRRService from '../services/xirrService';
import PortfolioRebalancingService from '../services/portfolioRebalancingService';
// PriceService removed
// AI service will be imported dynamically when needed
import { MarketDataStatus } from '../components/dashboard/MarketDataStatus';
import { Asset } from '../types';

const Assets: React.FC = () => {
  const { assets, addAsset, updateAsset, deleteAsset, transactions, userProfile, loadAssets } = useData();
  const theme = useThemeClasses();
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'rebalancing' | 'analytics'>('overview');
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [priceUpdateProgress, setPriceUpdateProgress] = useState({ current: 0, total: 0 });

  // Lazy load assets data when page mounts
  useEffect(() => {
    loadAssets();
  }, []);

  const totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalInvested = assets.reduce((sum, asset) => sum + (asset.purchaseValue || 0), 0);
  const totalReturns = totalAssets - totalInvested;
  const totalReturnsPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  // Calculate portfolio metrics
  const portfolioMetrics = MarketDataService.calculatePortfolioMetrics(assets);
  const portfolioXIRR = XIRRService.calculatePortfolioXIRR(assets, transactions);

  // Get rebalancing suggestions
  const userAge = userProfile?.financialInfo.currentAge || 35;
  const targetAllocations = PortfolioRebalancingService.getDefaultTargetAllocations(userAge, 'moderate');
  const rebalancingData = PortfolioRebalancingService.generateRebalancingSuggestions(assets, targetAllocations);
  const diversificationScore = PortfolioRebalancingService.calculateDiversificationScore(assets);

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
      case 'stocks': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      case 'mutual_funds': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
      case 'fixed_deposit': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      case 'gold': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
      case 'cash': return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
      default: return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700';
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
    console.log('📊 Assets extracted from image:', data);
    setExtractedData(data);
    setShowImageUploader(false);

    if (data.length > 0) {
      setShowConfirmDialog(true);
    } else {
      // Show a message if no data was extracted
      alert('No asset data could be extracted from the image. Please try a clearer screenshot or add assets manually.');
    }
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

  // Update portfolio prices with real-time data
  const updatePortfolioPrices = async () => {
    setIsUpdatingPrices(true);
    try {
      const updatedAssets = await MarketDataService.updatePortfolioValues(assets);
      // Update each asset with new market data
      updatedAssets.forEach((asset, index) => {
        if (asset.lastUpdated !== assets[index].lastUpdated) {
          updateAsset(asset.id, {
            currentValue: asset.currentValue,
            marketPrice: asset.marketPrice,
            dayChange: asset.dayChange,
            dayChangePercent: asset.dayChangePercent,
            lastUpdated: asset.lastUpdated
          });
        }
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error updating portfolio prices:', error);
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  // Market status and auto-update logic
  const getMarketStatus = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;
    const marketOpen = 9 * 60 + 15; // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM

    if (currentTime >= marketOpen && currentTime <= marketClose) {
      return { isOpen: true, status: 'Market Open', color: 'text-green-600' };
    } else if (currentTime < marketOpen) {
      const minutesToOpen = marketOpen - currentTime;
      const hoursToOpen = Math.floor(minutesToOpen / 60);
      const minsToOpen = minutesToOpen % 60;
      return {
        isOpen: false,
        status: `Market opens in ${hoursToOpen}h ${minsToOpen}m`,
        color: 'text-yellow-600'
      };
    } else {
      return { isOpen: false, status: 'Market Closed', color: 'text-red-600' };
    }
  };

  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  // Auto-update prices every 5 minutes during market hours
  useEffect(() => {
    const interval = setInterval(() => {
      const status = getMarketStatus();
      setMarketStatus(status);

      if (status.isOpen) {
        updatePortfolioPrices();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [assets]);

  // Update market status every minute
  useEffect(() => {
    const statusInterval = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 60 * 1000); // 1 minute

    return () => clearInterval(statusInterval);
  }, []);

  // const getAssetIcon = (category: string) => {
  //   switch (category) {
  //     case 'stocks': return '📈';
  //     case 'mutual_funds': return '🏦';
  //     case 'fixed_deposit': return '🏛️';
  //     case 'gold': return '🥇';
  //     case 'cash': return '💰';
  //     default: return '📊';
  //   }
  // };

  const getReturnColor = (returnPercent: number) => {
    if (returnPercent > 0) return 'text-green-600 dark:text-green-400';
    if (returnPercent < 0) return 'text-red-600 dark:text-red-400';
    return theme.textMuted;
  };

  const handleAssetCancel = () => {
    setShowAssetForm(false);
    setEditingAsset(null);
  };

  const refreshAllPrices = async () => {
    setIsUpdatingPrices(true);
    setPriceUpdateProgress({ current: 0, total: 100 });

    try {
      console.log('🔄 refreshing all prices via MarketDataService...');
      const updatedAssets = await MarketDataService.updatePortfolioValues(assets);

      // Update assets in context/DB
      let updates = 0;
      for (let i = 0; i < assets.length; i++) {
        const oldAsset = assets[i];
        const newAsset = updatedAssets[i];

        if (newAsset !== oldAsset) {
          await updateAsset(newAsset.id, {
            currentValue: newAsset.currentValue,
            marketPrice: newAsset.marketPrice,
            dayChange: newAsset.dayChange,
            dayChangePercent: newAsset.dayChangePercent,
            lastUpdated: newAsset.lastUpdated
          });
          updates++;
        }
      }

      setLastUpdated(new Date().toLocaleTimeString());
      console.log(`🎉 Price refresh completed! Updated ${updates} assets.`);

    } catch (error) {
      console.error('❌ Error during price refresh:', error);
    } finally {
      setIsUpdatingPrices(false);
      setPriceUpdateProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={theme.heading1}>Investment Portfolio</h1>
          <p className={cn(theme.textSecondary, 'mt-1')}>
            Advanced portfolio tracking with real-time updates and analytics
          </p>
          <div className="flex items-center space-x-4 mt-2">
            {/* Market Status */}
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                marketStatus.isOpen ? "bg-green-500 animate-pulse" : "bg-red-500"
              )} />
              <span className={cn("text-sm font-medium", marketStatus.color)}>
                {marketStatus.status}
              </span>
            </div>

            {/* Live Assets Count */}
            <div className="flex items-center space-x-1">
              <Activity className="w-3 h-3 text-blue-600" />
              <span className={cn(theme.textMuted, 'text-sm')}>
                {assets.filter(asset => (asset as any).livePriceData).length} live assets
              </span>
            </div>

            {lastUpdated && (
              <p className={cn(theme.textMuted, 'text-sm')}>
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
          {isUpdatingPrices && priceUpdateProgress.total > 0 && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-600">
                  Updating prices... ({priceUpdateProgress.current}/{priceUpdateProgress.total})
                </span>
              </div>
              <div className={cn(theme.progressBar, "w-48 mt-1")}>
                <div
                  className={cn(theme.progressFill, "bg-blue-600")}
                  style={{ width: `${(priceUpdateProgress.current / priceUpdateProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>



        <div className="flex items-center space-x-3">
          <MarketDataStatus />
          <button
            onClick={refreshAllPrices}
            disabled={isUpdatingPrices}
            className={cn(
              'flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              isUpdatingPrices && 'animate-pulse'
            )}
            title="Refresh live prices for stocks and mutual funds"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isUpdatingPrices && 'animate-spin')} />
            {isUpdatingPrices ? 'Updating...' : 'Refresh Prices'}
          </button>

          <button
            onClick={() => setShowImageUploader(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Camera className="w-4 h-4 mr-2" />
            Scan Portfolio
          </button>

          <button
            onClick={handleAddAsset}
            className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Live Price Ticker */}
      {assets.some(asset => (asset as any).livePriceData) && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Live Prices</h3>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">LIVE</span>
            </div>
          </div>
          <div className="flex space-x-6 overflow-x-auto">
            {assets
              .filter(asset => (asset as any).livePriceData)
              .slice(0, 6)
              .map(asset => {
                const livePriceData = (asset as any).livePriceData;
                return (
                  <div key={asset.id} className="flex-shrink-0 text-center min-w-[120px]">
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                      {asset.name.length > 12 ? asset.name.substring(0, 12) + '...' : asset.name}
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ₹{livePriceData.price || livePriceData.nav}
                    </div>
                    {livePriceData.change && (
                      <div className={cn(
                        "text-xs flex items-center justify-center",
                        livePriceData.change >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        <span className="mr-1">
                          {livePriceData.change >= 0 ? '↗' : '↘'}
                        </span>
                        {livePriceData.changePercent ?
                          `${livePriceData.changePercent >= 0 ? '+' : ''}${livePriceData.changePercent.toFixed(1)}%` :
                          `${livePriceData.change >= 0 ? '+' : ''}${livePriceData.change.toFixed(2)}`
                        }
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Enhanced Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={theme.metricCard}>
          <div className="flex items-center justify-between mb-2">
            <Wallet className="h-6 w-6 text-blue-600" />
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              portfolioMetrics.dayChange >= 0
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            )}>
              {portfolioMetrics.dayChange >= 0 ? '+' : ''}{portfolioMetrics.dayChangePercent.toFixed(2)}%
            </span>
          </div>
          <p className={cn(theme.metricLabel, 'mb-1')}>Portfolio Value</p>
          <p className={theme.metricValue}>{formatLargeNumber(totalAssets)}</p>
          <p className={cn(theme.textMuted, 'text-xs')}>
            Day: {portfolioMetrics.dayChange >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.dayChange)}
          </p>
        </div>

        <div className={theme.metricCard}>
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              totalReturnsPercent >= 0
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            )}>
              {totalReturnsPercent >= 0 ? '+' : ''}{totalReturnsPercent.toFixed(2)}%
            </span>
          </div>
          <p className={cn(theme.metricLabel, 'mb-1')}>Total Returns</p>
          <p className={cn(theme.metricValue, getReturnColor(totalReturnsPercent))}>
            {formatCurrency(totalReturns)}
          </p>
          <p className={cn(theme.textMuted, 'text-xs')}>
            Invested: {formatCurrency(totalInvested)}
          </p>
        </div>

        <div className={theme.metricCard}>
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              (portfolioXIRR || 0) >= 12
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : (portfolioXIRR || 0) >= 8
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            )}>
              XIRR
            </span>
          </div>
          <p className={cn(theme.metricLabel, 'mb-1')}>Annualized Return</p>
          <p className={theme.metricValue}>
            {portfolioXIRR ? `${portfolioXIRR.toFixed(2)}%` : 'N/A'}
          </p>
          <p className={cn(theme.textMuted, 'text-xs')}>
            {assets.length} Holdings
          </p>
        </div>

        <div className={theme.metricCard}>
          <div className="flex items-center justify-between mb-2">
            <Target className="h-6 w-6 text-orange-600" />
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              diversificationScore.score >= 80
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : diversificationScore.score >= 60
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            )}>
              {diversificationScore.score}/100
            </span>
          </div>
          <p className={cn(theme.metricLabel, 'mb-1')}>Diversification</p>
          <p className={theme.metricValue}>{diversificationScore.score}</p>
          <p className={cn(theme.textMuted, 'text-xs')}>
            {rebalancingData.isRebalanceNeeded ? 'Rebalance needed' : 'Well balanced'}
          </p>
        </div>
      </div>

      {/* Rebalancing Alert */}
      {rebalancingData.isRebalanceNeeded && (
        <div className={cn(theme.alertWarning, 'flex items-center')}>
          <AlertTriangle className="w-5 h-5 mr-3" />
          <div>
            <p className="font-medium">Portfolio Rebalancing Recommended</p>
            <p className="text-sm opacity-90">
              {rebalancingData.suggestions.length} suggestions available to optimize your portfolio allocation.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Portfolio Overview', icon: PieChart },
          { id: 'performance', label: 'Performance Analytics', icon: BarChart3 },
          { id: 'rebalancing', label: 'Rebalancing', icon: Target },
          { id: 'analytics', label: 'Advanced Analytics', icon: Activity }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowImageUploader(true)}
              className={cn(theme.btnPrimary, 'flex items-center')}
            >
              <Camera className="w-4 h-4 mr-2" />
              Add from Screenshot
            </button>
            <button
              onClick={handleAddAsset}
              className={cn(theme.btnSecondary, 'flex items-center')}
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
                    <div className={cn(theme.progressBarLarge, "w-full")}>
                      <div
                        className={cn(theme.progressFillLarge, "from-blue-500 to-green-500")}
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
                  {assets.map((asset) => {
                    const livePriceData = (asset as any).livePriceData;

                    const hasLiveData = livePriceData && (asset.category === 'stocks' || asset.category === 'mutual_funds');

                    return (
                      <div key={asset.id} className="group relative flex flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:ring-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                        {/* Header Section */}
                        <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-700 p-5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-100 truncate max-w-[150px]" title={asset.name}>
                                {asset.name}
                              </h3>
                              {/* Subtle Actions (Visible on Hover) */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }}
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {hasLiveData && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await MarketDataService.updatePortfolioValues([asset]);
                                        refreshAllPrices();
                                      } catch (err) { console.error(err); }
                                    }}
                                    className="p-1 text-gray-400 hover:text-green-600 rounded transition-colors"
                                    title="Refresh Price"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              {((asset as any).symbol || (asset as any).schemeCode || asset.category).replace('_', ' ')}
                            </span>
                          </div>

                          <div className="text-right">
                            {/* Live Price if available, else Market Price from asset */}
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency((hasLiveData ? (livePriceData.price || livePriceData.nav) : (asset as any).marketPrice) || 0)}
                            </p>
                            {hasLiveData && livePriceData.changePercent !== undefined && (
                              <div className={cn(
                                "flex items-center justify-end gap-1 text-xs font-medium",
                                livePriceData.changePercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              )}>
                                {livePriceData.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                                <span>{Math.abs(livePriceData.changePercent).toFixed(2)}%</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="p-5 pb-2">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                            {/* Invested Value */}
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Invested Value</span>
                              <p className="font-display text-base font-semibold text-gray-900 dark:text-gray-100">
                                {asset.purchaseValue ? formatCurrency(asset.purchaseValue) : '-'}
                              </p>
                            </div>

                            {/* Current Value */}
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Current Value</span>
                              <p className="font-display text-base font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(asset.currentValue)}
                              </p>
                            </div>

                            {/* Quantity */}
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</span>
                              <p className="font-display text-base font-semibold text-gray-900 dark:text-gray-100">
                                {(asset as any).quantity || '-'}
                              </p>
                            </div>

                            {/* Average Price */}
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg. Price</span>
                              <p className="font-display text-base font-semibold text-gray-900 dark:text-gray-100">
                                {(asset as any).averagePrice
                                  ? formatCurrency((asset as any).averagePrice)
                                  : asset.purchaseValue && (asset as any).quantity
                                    ? formatCurrency(asset.purchaseValue / (asset as any).quantity)
                                    : '-'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Total Returns Section (Styled with visual flair) */}
                        {asset.purchaseValue && (
                          <div className="mx-5 mb-5 mt-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 p-4 relative overflow-hidden">
                            {/* Background blob effect */}
                            <div className={cn(
                              "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-20",
                              (asset.currentValue - asset.purchaseValue) >= 0 ? "bg-green-400" : "bg-red-400"
                            )}></div>

                            <div className="relative z-10 flex items-end justify-between">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Returns</span>
                                <div className="flex items-baseline gap-2">
                                  <span className={cn(
                                    "text-2xl font-bold tracking-tight",
                                    (asset.currentValue - asset.purchaseValue) >= 0 ? "text-gray-900 dark:text-white" : "text-gray-900 dark:text-white"
                                  )}>
                                    {(asset.currentValue - asset.purchaseValue) >= 0 ? '+' : ''}{formatCurrency(asset.currentValue - asset.purchaseValue)}
                                  </span>
                                </div>
                                <span className={cn(
                                  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold w-fit",
                                  (asset.currentValue - asset.purchaseValue) >= 0
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                )}>
                                  {((asset.currentValue - asset.purchaseValue) / asset.purchaseValue * 100).toFixed(2)}%
                                </span>
                              </div>

                              {/* Mini Chart SVG (Static representation for visual) */}
                              <div className="h-12 w-24 shrink-0 opacity-100">
                                <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 120 60">
                                  <defs>
                                    <linearGradient id={`chartGradient-${asset.id}`} x1="0" x2="0" y1="0" y2="1">
                                      <stop offset="0%" stopColor={(asset.currentValue - asset.purchaseValue) >= 0 ? "#16a34a" : "#dc2626"} stopOpacity="0.2"></stop>
                                      <stop offset="100%" stopColor={(asset.currentValue - asset.purchaseValue) >= 0 ? "#16a34a" : "#dc2626"} stopOpacity="0"></stop>
                                    </linearGradient>
                                  </defs>
                                  <path d="M0 50 C10 45, 20 55, 30 40 C40 25, 50 45, 60 35 C70 25, 80 15, 90 20 C100 25, 110 5, 120 10 L 120 60 L 0 60 Z" fill={`url(#chartGradient-${asset.id})`}></path>
                                  <path d="M0 50 C10 45, 20 55, 30 40 C40 25, 50 45, 60 35 C70 25, 80 15, 90 20 C100 25, 110 5, 120 10" fill="none" stroke={(asset.currentValue - asset.purchaseValue) >= 0 ? "#16a34a" : "#dc2626"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Asset Performance Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">Diversification</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {Object.keys(assetsByCategory).length} Categories
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Well Diversified</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
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
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">Average Holding</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {assets.length > 0 ? formatLargeNumber(totalAssets / assets.length) : '₹0'}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Per Asset</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Analytics Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* XIRR Performance */}
          <div className={theme.card}>
            <h3 className={cn(theme.heading3, 'mb-4')}>Return Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className={cn(theme.textMuted, 'text-sm mb-2')}>Portfolio XIRR</p>
                <p className={cn(theme.textPrimary, 'text-2xl font-bold')}>
                  {portfolioXIRR ? `${portfolioXIRR.toFixed(2)}%` : 'N/A'}
                </p>
                <p className={cn(theme.textMuted, 'text-xs')}>Annualized Return</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className={cn(theme.textMuted, 'text-sm mb-2')}>Absolute Return</p>
                <p className={cn(theme.textPrimary, 'text-2xl font-bold', getReturnColor(totalReturnsPercent))}>
                  {totalReturnsPercent.toFixed(2)}%
                </p>
                <p className={cn(theme.textMuted, 'text-xs')}>{formatCurrency(totalReturns)}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className={cn(theme.textMuted, 'text-sm mb-2')}>Investment Period</p>
                <p className={cn(theme.textPrimary, 'text-2xl font-bold')}>
                  {assets.length > 0 && assets[0].purchaseDate
                    ? Math.ceil((new Date().getTime() - new Date(assets[0].purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
                    : 0}
                </p>
                <p className={cn(theme.textMuted, 'text-xs')}>Months</p>
              </div>
            </div>
          </div>

          {/* Asset Performance Table */}
          <div className={theme.card}>
            <h3 className={cn(theme.heading3, 'mb-4')}>Individual Asset Performance</h3>
            <div className="overflow-x-auto">
              <table className={theme.table}>
                <thead>
                  <tr>
                    <th className={theme.tableHeader}>Asset</th>
                    <th className={theme.tableHeader}>Category</th>
                    <th className={theme.tableHeader}>Live Price</th>
                    <th className={theme.tableHeader}>Invested</th>
                    <th className={theme.tableHeader}>Current Value</th>
                    <th className={theme.tableHeader}>Returns</th>
                    <th className={theme.tableHeader}>XIRR</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => {
                    const assetReturn = asset.purchaseValue ? ((asset.currentValue - asset.purchaseValue) / asset.purchaseValue) * 100 : 0;
                    const assetXIRR = XIRRService.calculateAssetXIRR(asset, transactions);
                    const livePriceData = (asset as any).livePriceData;
                    const lastPriceUpdate = (asset as any).lastPriceUpdate;
                    const hasLiveData = livePriceData && (asset.category === 'stocks' || asset.category === 'mutual_funds');
                    const isRecentUpdate = lastPriceUpdate &&
                      (new Date().getTime() - new Date(lastPriceUpdate).getTime()) < 10 * 60 * 1000;

                    return (
                      <tr key={asset.id} className={cn(
                        theme.tableRow,
                        hasLiveData && isRecentUpdate && "bg-green-50 dark:bg-green-900/10"
                      )}>
                        <td className={theme.tableCell}>
                          <div className="flex items-center space-x-2">
                            <span className={theme.textPrimary}>{asset.name}</span>
                            {hasLiveData && (
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                isRecentUpdate ? "bg-green-500" : "bg-gray-400"
                              )} />
                            )}
                          </div>
                          {((asset as any).symbol || (asset as any).schemeCode) && (
                            <div className="text-xs text-gray-500 font-mono">
                              {(asset as any).symbol || (asset as any).schemeCode}
                            </div>
                          )}
                        </td>
                        <td className={theme.tableCell}>
                          <span className={theme.textSecondary}>{asset.category.replace('_', ' ')}</span>
                        </td>
                        <td className={theme.tableCell}>
                          {hasLiveData ? (
                            <div>
                              <div className={theme.textPrimary}>
                                ₹{livePriceData.price || livePriceData.nav}
                              </div>
                              {livePriceData.change && (
                                <div className={cn(
                                  "text-xs flex items-center",
                                  livePriceData.change >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                  <span className="mr-1">
                                    {livePriceData.change >= 0 ? '↗' : '↘'}
                                  </span>
                                  {livePriceData.change >= 0 ? '+' : ''}{livePriceData.change.toFixed(2)}
                                  {livePriceData.changePercent && (
                                    <span className="ml-1">
                                      ({livePriceData.changePercent >= 0 ? '+' : ''}{livePriceData.changePercent.toFixed(1)}%)
                                    </span>
                                  )}
                                </div>
                              )}
                              {lastPriceUpdate && (
                                <div className="text-xs text-gray-400">
                                  {new Date(lastPriceUpdate).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className={theme.textMuted}>Manual</span>
                          )}
                        </td>
                        <td className={theme.tableCell}>
                          <span className={theme.textPrimary}>{formatCurrency(asset.purchaseValue || 0)}</span>
                        </td>
                        <td className={theme.tableCell}>
                          <span className={theme.textPrimary}>{formatCurrency(asset.currentValue)}</span>
                        </td>
                        <td className={theme.tableCell}>
                          <span className={getReturnColor(assetReturn)}>
                            {assetReturn >= 0 ? '+' : ''}{assetReturn.toFixed(2)}%
                          </span>
                        </td>
                        <td className={theme.tableCell}>
                          <span className={theme.textPrimary}>
                            {assetXIRR ? `${assetXIRR.toFixed(2)}%` : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rebalancing Tab */}
      {activeTab === 'rebalancing' && (
        <div className="space-y-6">
          {/* Diversification Score */}
          <div className={theme.card}>
            <h3 className={cn(theme.heading3, 'mb-4')}>Portfolio Health Check</h3>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={theme.textPrimary}>Diversification Score</p>
                <p className={theme.textMuted}>How well-balanced is your portfolio?</p>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-3xl font-bold',
                  diversificationScore.score >= 80 ? 'text-green-600' :
                    diversificationScore.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {diversificationScore.score}/100
                </p>
              </div>
            </div>
            <div className={cn(theme.progressBarLarge, "w-full mb-4")}>
              <div
                className={cn(theme.progressFillLarge,
                  'h-3 rounded-full transition-all duration-300',
                  diversificationScore.score >= 80 ? 'bg-green-500' :
                    diversificationScore.score >= 60 ? 'bg-yellow-50 dark:bg-yellow-900/200' : 'bg-red-500'
                )}
                style={{ width: `${diversificationScore.score}%` }}
              ></div>
            </div>
            <p className={theme.textSecondary}>{diversificationScore.analysis}</p>

            {diversificationScore.recommendations.length > 0 && (
              <div className="mt-4">
                <p className={cn(theme.textPrimary, 'font-medium mb-2')}>Recommendations:</p>
                <ul className="space-y-1">
                  {diversificationScore.recommendations.map((rec, index) => (
                    <li key={index} className={cn(theme.textSecondary, 'text-sm')}>
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Rebalancing Suggestions */}
          <div className={theme.card}>
            <h3 className={cn(theme.heading3, 'mb-4')}>Rebalancing Suggestions</h3>
            {rebalancingData.suggestions.length === 0 ? (
              <div className="text-center py-8">
                <Target className={cn(theme.textMuted, 'h-12 w-12 mx-auto mb-4')} />
                <p className={theme.textPrimary}>Portfolio is well-balanced!</p>
                <p className={theme.textMuted}>No rebalancing needed at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rebalancingData.suggestions.map((suggestion, index) => (
                  <div key={index} className={cn(
                    'p-4 rounded-lg border',
                    suggestion.priority === 'high' ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20' :
                      suggestion.priority === 'medium' ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20' :
                        'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={cn(theme.textPrimary, 'font-medium')}>{suggestion.asset.name}</h4>
                      <span className={cn(
                        'px-2 py-1 text-xs rounded-full',
                        suggestion.priority === 'high' ? 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100' :
                          suggestion.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100' :
                            'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100'
                      )}>
                        {suggestion.priority} priority
                      </span>
                    </div>
                    <p className={theme.textSecondary}>{suggestion.reason}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className={cn(
                        'font-medium',
                        suggestion.action === 'buy' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {suggestion.action === 'buy' ? 'Buy' : 'Sell'}: {formatCurrency(suggestion.amount)}
                      </span>
                      <span className={theme.textMuted}>
                        Impact: {suggestion.impact.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Target vs Current Allocation */}
          <div className={theme.card}>
            <h3 className={cn(theme.heading3, 'mb-4')}>Target vs Current Allocation</h3>
            <div className="space-y-4">
              {rebalancingData.targets.map(target => (
                <div key={target.category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={cn(theme.textPrimary, 'font-medium capitalize')}>
                      {target.category.replace('_', ' ')}
                    </span>
                    <div className="text-right">
                      <span className={theme.textPrimary}>
                        {target.currentPercentage.toFixed(1)}% / {target.targetPercentage}%
                      </span>
                      <span className={cn(
                        'ml-2 text-sm',
                        Math.abs(target.currentPercentage - target.targetPercentage) > 5 ? 'text-red-600' : 'text-green-600'
                      )}>
                        ({target.currentPercentage > target.targetPercentage ? '+' : ''}{(target.currentPercentage - target.targetPercentage).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className={cn(theme.progressBar, "flex-1")}>
                      <div
                        className={cn(theme.progressFill, "bg-blue-500")}
                        style={{ width: `${Math.min(target.currentPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className={cn(theme.progressBar, "flex-1")}>
                      <div
                        className={cn(theme.progressFill, "bg-green-500")}
                        style={{ width: `${Math.min(target.targetPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Risk Metrics */}
          <div className={theme.card}>
            <h3 className={cn(theme.heading3, 'mb-4')}>Risk Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className={cn(theme.textPrimary, 'font-medium mb-3')}>Portfolio Concentration</h4>
                <div className="space-y-3">
                  {assets.slice(0, 5).map(asset => {
                    const percentage = (asset.currentValue / totalAssets) * 100;
                    return (
                      <div key={asset.id} className="flex items-center justify-between">
                        <span className={theme.textSecondary}>{asset.name}</span>
                        <div className="flex items-center space-x-2">
                          <div className={cn(theme.progressBar, "w-20")}>
                            <div
                              className={cn(theme.progressFill, "bg-blue-500")}
                              style={{ width: `${Math.min(percentage * 2, 100)}%` }}
                            ></div>
                          </div>
                          <span className={theme.textPrimary}>{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className={cn(theme.textPrimary, 'font-medium mb-3')}>Asset Quality Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>Largest Holding</span>
                    <span className={theme.textPrimary}>
                      {assets.length > 0 ? ((Math.max(...assets.map(a => a.currentValue)) / totalAssets) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>Equity Allocation</span>
                    <span className={theme.textPrimary}>
                      {totalAssets > 0 ? (
                        (assets
                          .filter(a => ['stocks', 'mutual_funds'].includes(a.category))
                          .reduce((sum, a) => sum + a.currentValue, 0) / totalAssets) * 100
                      ).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>Liquid Assets</span>
                    <span className={theme.textPrimary}>
                      {totalAssets > 0 ? (
                        (assets
                          .filter(a => ['cash', 'stocks', 'mutual_funds'].includes(a.category))
                          .reduce((sum, a) => sum + a.currentValue, 0) / totalAssets) * 100
                      ).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>Categories</span>
                    <span className={theme.textPrimary}>{Object.keys(assetsByCategory).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Comparison */}
          <div className={theme.card}>
            <h3 className={cn(theme.heading3, 'mb-4')}>Benchmark Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className={theme.textMuted}>Your Portfolio</p>
                <p className={cn(theme.textPrimary, 'text-xl font-bold')}>
                  {portfolioXIRR ? `${portfolioXIRR.toFixed(2)}%` : 'N/A'}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className={theme.textMuted}>Nifty 50 (Est.)</p>
                <p className={cn(theme.textPrimary, 'text-xl font-bold')}>12.5%</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className={theme.textMuted}>Fixed Deposit</p>
                <p className={cn(theme.textPrimary, 'text-xl font-bold')}>6.5%</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className={theme.textMuted}>
                {portfolioXIRR && portfolioXIRR > 12.5
                  ? `🎉 Your portfolio is outperforming the market by ${(portfolioXIRR - 12.5).toFixed(1)}%!`
                  : portfolioXIRR && portfolioXIRR > 6.5
                    ? `📈 Your portfolio is beating fixed deposits by ${(portfolioXIRR - 6.5).toFixed(1)}%`
                    : '📊 Consider reviewing your investment strategy'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Image Uploader Modal */}
      {showImageUploader && (
        <SidePanel
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
        </SidePanel>
      )}

      {/* Asset Form SidePanel */}
      <SidePanel
        isOpen={showAssetForm}
        onClose={handleAssetCancel}
        title={editingAsset ? 'Edit Asset' : 'Add New Asset'}
        size="lg"
        footer={
          <div className="flex justify-end w-full space-x-2">
            <button
              onClick={handleAssetCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="asset-form" // Assumes AssetForm contains a form with id="asset-form"
              className="btn-primary"
            >
              {editingAsset ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>
        }
      >
        <AssetForm
          asset={editingAsset || undefined}
          onSubmit={handleAssetSubmit}
          onCancel={handleAssetCancel}
        />
      </SidePanel>

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