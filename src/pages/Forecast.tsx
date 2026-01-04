import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, Filter } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatLargeNumber } from '../utils/formatters';
import Modal from '../components/common/Modal';

const Forecast: React.FC = () => {
  const { goals, monthlyBudget, assets, userProfile } = useData();
  const [inflationRate, setInflationRate] = useState(6);
  const [forecastYears, setForecastYears] = useState(10);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Asset Exclusion State with Persistence
  const [excludedAssetIds, setExcludedAssetIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('fi_excluded_assets');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Save to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('fi_excluded_assets', JSON.stringify(Array.from(excludedAssetIds)));
  }, [excludedAssetIds]);

  const toggleAssetExclusion = (id: string) => {
    const newSet = new Set(excludedAssetIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExcludedAssetIds(newSet);
  };

  // Filter assets for FI calculation
  const fiAssets = React.useMemo(() => assets.filter(a => !excludedAssetIds.has(a.id)), [assets, excludedAssetIds]);

  // Calculate retirement projection
  const currentAge = userProfile?.financialInfo.currentAge || 30;
  const retirementAge = userProfile?.financialInfo.retirementAge || 60;
  const yearsToRetirement = retirementAge - currentAge;

  // Use FI Assets for Corpus
  const currentRetirementCorpus = fiAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalAssetsValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);

  const monthlyRetirementSIP = monthlyBudget.surplus + (goals.find(g => g.category === 'retirement')?.monthlyContribution || 0);

  const calculateFutureValue = (pv: number, pmt: number, rate: number, years: number) => {
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    const fvPV = pv * Math.pow(1 + monthlyRate, months);
    const fvPMT = pmt * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    return fvPV + fvPMT;
  };

  // Asset growth rates by category
  const growthRates: Record<string, number> = {
    stocks: 12,
    mutual_funds: 12,
    real_estate: 8,
    gold: 6,
    epf: 8.1,
    ppf: 7.1,
    fixed_deposit: 6.5,
    cash: 4,
    other: 6
  };

  // Calculate weighted average return for display (Based on FI Assets)
  const weightedReturnRate = React.useMemo(() => {
    const totalValue = fiAssets.reduce((sum, a) => sum + a.currentValue, 0);
    if (totalValue === 0) return 0;

    const weightedSum = fiAssets.reduce((sum, asset) => {
      const rate = growthRates[asset.category] || 6;
      return sum + (asset.currentValue * rate);
    }, 0);

    return weightedSum / totalValue;
  }, [fiAssets]);

  // Calculate projected growth per asset class
  const calculateYearlyProjection = (startYear: number, years: number) => {
    const data = [];
    // Start with FI assets only
    let currentAssets = [...fiAssets.map(a => ({ ...a, projectedValue: a.currentValue }))];

    for (let i = 0; i <= years; i++) {
      const year = startYear + i;
      const age = currentAge + i;

      // Grow each asset
      currentAssets = currentAssets.map(asset => {
        const r = growthRates[asset.category] || 6;
        const newValue = asset.projectedValue * (1 + r / 100);
        return { ...asset, projectedValue: newValue };
      });

      // Add new Investment (SIP)
      // Simplified approach: Add yearly contribution to a 'New Investments' bucket growing at weighted rate
      const accumulatedSIP = calculateFutureValue(0, monthlyRetirementSIP, weightedReturnRate, i);

      const assetsTotal = currentAssets.reduce((sum, a) => sum + a.projectedValue, 0);
      const totalWealth = assetsTotal + accumulatedSIP;

      data.push({
        year,
        age,
        totalWealth: Math.round(totalWealth),
        investedAmount: Math.round(currentRetirementCorpus + (monthlyRetirementSIP * 12 * i)),
        growth: Math.round(totalWealth - (currentRetirementCorpus + (monthlyRetirementSIP * 12 * i)))
      });
    }
    return data;
  };

  const forecastData = React.useMemo(() => calculateYearlyProjection(new Date().getFullYear(), Math.max(forecastYears, yearsToRetirement)), [fiAssets, forecastYears, yearsToRetirement, monthlyRetirementSIP, weightedReturnRate]);

  // Derived Metrics for Dashboard
  const currentMonthlyExpenses = monthlyBudget.expenses.household;
  const inflatedMonthlyExpenses = currentMonthlyExpenses * Math.pow(1 + inflationRate / 100, yearsToRetirement);

  // Find wealth specifically at retirement age
  const retirementDatum = forecastData.find(d => d.age === retirementAge);
  const wealthAtRetirement = retirementDatum ? retirementDatum.totalWealth : calculateYearlyProjection(new Date().getFullYear(), yearsToRetirement).pop()?.totalWealth || 0;
  const monthlyIncomeAtRetirement = wealthAtRetirement * 0.04 / 12;
  const isSurplus = monthlyIncomeAtRetirement >= inflatedMonthlyExpenses;
  const surplusDeficit = monthlyIncomeAtRetirement - inflatedMonthlyExpenses;

  // Group assets for display
  const assetsByCategory = React.useMemo(() => {
    const grouped: Record<string, typeof assets> = {};
    assets.forEach(asset => {
      if (!grouped[asset.category]) grouped[asset.category] = [];
      grouped[asset.category].push(asset);
    });
    return grouped;
  }, [assets]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Forecast</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Wealth projection based on your actual asset mix and growth rates.
          </p>
        </div>
      </div>

      {/* Financial Independence Analysis Dashboard */}
      <div className="card bg-white dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            Financial Independence Analysis
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Column 1: Current Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Current Status
            </h3>

            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Age</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{currentAge} years</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Target Retirement Age</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{retirementAge} years</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Years to Retirement</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{yearsToRetirement} years</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  Current Net Worth
                  <button
                    onClick={() => setIsAssetModalOpen(true)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-1 p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="Manage included assets"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatLargeNumber(currentRetirementCorpus)}</p>
                  {excludedAssetIds.size > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                      {fiAssets.length}/{assets.length} Active
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Investment</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(monthlyRetirementSIP)}</p>
              </div>
            </div>
          </div>

          {/* Column 2: Retirement Projections */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Retirement Projections
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-700 pb-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Projected Corpus @ {retirementAge}</p>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatLargeNumber(wealthAtRetirement)}
                </p>
              </div>

              <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-700 pb-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Income (4% rule)</p>
                </div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(monthlyIncomeAtRetirement)}
                </p>
              </div>

              <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-700 pb-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Inflated Monthly Expenses</p>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(inflatedMonthlyExpenses)}
                </p>
              </div>

              <div className="flex justify-between items-end pt-1">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Surplus / Deficit</p>
                </div>
                <p className={`text-2xl font-extrabold ${isSurplus ? 'text-green-600' : 'text-red-600'}`}>
                  {(isSurplus ? '+' : '') + formatCurrency(surplusDeficit)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Controls / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Portfolio Avg Return</h3>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{weightedReturnRate.toFixed(1)}%</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Based on included assets ({formatLargeNumber(currentRetirementCorpus)})</p>
        </div>
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Inflation Rate (%)
          </label>
          <input
            type="number"
            value={inflationRate}
            onChange={(e) => setInflationRate(Number(e.target.value))}
            className="input-field theme-input"
            min="1"
            max="15"
          />
        </div>
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Forecast Years
          </label>
          <input
            type="number"
            value={forecastYears}
            onChange={(e) => setForecastYears(Number(e.target.value))}
            className="input-field theme-input"
            min="5"
            max="40"
          />
        </div>
      </div>

      {/* Wealth Projection Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Wealth Projection Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `₹${(value / 10000000).toFixed(1)}Cr`} />
            <Tooltip
              formatter={(value, name) => [
                formatLargeNumber(value as number),
                name === 'totalWealth' ? 'Total Wealth' :
                  name === 'investedAmount' ? 'Principal Invested' : 'Growth'
              ]}
              labelFormatter={(label) => `Year: ${label} (Age: ${Number(label) - new Date().getFullYear() + currentAge})`}
            />
            <Line type="monotone" dataKey="totalWealth" stroke="#8B5CF6" strokeWidth={3} name="Total Wealth" dot={false} />
            <Line type="monotone" dataKey="investedAmount" stroke="#3B82F6" strokeWidth={2} name="Invested Amount" dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Independence Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Projection Details</h3>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p>This projection assumes your <span className="font-semibold text-gray-900 dark:text-white">included assets ({formatLargeNumber(currentRetirementCorpus)})</span> grow at rates specific to their category (Equity ~12%, Debt ~7-8%, Gold ~6%).</p>
          {excludedAssetIds.size > 0 && (
            <p className="mt-1 text-yellow-600 dark:text-yellow-400">
              You have excluded {excludedAssetIds.size} assets totaling {formatLargeNumber(totalAssetsValue - currentRetirementCorpus)} from this analysis.
            </p>
          )}
          <p className="mt-2">Future monthly investments of {formatCurrency(monthlyRetirementSIP)} are assumed to grow at the portfolio's weighted average rate of {weightedReturnRate.toFixed(1)}%.</p>
        </div>
      </div>

      {/* Asset Inclusion Modal */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title="Asset Inclusion for FI Corpus"
        size="lg"
          footer={(
            <div className="flex justify-end">
              <button
                onClick={() => setIsAssetModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Select which assets contribute to your Retirement/Financial Independence corpus.
            Uncheck assets that are reserved for other goals (like children's education or house purchase).
          </p>

          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Included Corpus:</span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatLargeNumber(currentRetirementCorpus)}</span>
          </div>

          {/* Scroll container holding asset grid + sticky footer */}
          <div className="mt-4 pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(assetsByCategory).map(([category, categoryAssets]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider border-b pb-1 border-gray-100 dark:border-gray-800">
                    {category.replace('_', ' ')}
                  </h4>
                  <div className="space-y-2">
                    {categoryAssets.map(asset => {
                      const isExcluded = excludedAssetIds.has(asset.id);
                      const linkedGoal = goals.find(g => g.linkedSIPAssets?.includes(asset.id));

                      return (
                        <div key={asset.id} className={`flex items-start p-2 rounded-lg transition-colors border ${isExcluded ? 'border-gray-100 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 opacity-70' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700/50'}`}>
                          <div className="flex items-center h-5">
                            <input
                              id={`modal-asset-${asset.id}`}
                              name={`modal-asset-${asset.id}`}
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={() => toggleAssetExclusion(asset.id)}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer"
                            />
                          </div>
                          <div className="ml-3 text-sm flex-1">
                            <label htmlFor={`modal-asset-${asset.id}`} className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer block">
                              {asset.name}
                            </label>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-gray-500 text-xs">{formatCurrency(asset.currentValue)}</span>
                              {linkedGoal ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" title={`Linked to goal: ${linkedGoal.name}`}>
                                  <Target className="w-3 h-3 mr-1" />
                                  {linkedGoal.name}
                                </span>
                              ) : (
                                growthRates[asset.category] && (
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    <TrendingUp className="w-3 h-3 inline mr-0.5" />
                                    {growthRates[asset.category]}%
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky footer keeps the action button visible while scrolling */}
            {/* Removed sticky footer */}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Forecast;