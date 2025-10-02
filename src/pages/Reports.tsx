import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Target } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatLargeNumber } from '../utils/formatters';

const Reports: React.FC = () => {
  const { assets, goals, monthlyBudget, licPolicies } = useData();
  
  // Asset allocation data for pie chart
  const assetAllocation = assets.reduce((acc, asset) => {
    const category = asset.category.replace('_', ' ');
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += asset.currentValue;
    return acc;
  }, {} as Record<string, number>);

  const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const pieData = Object.entries(assetAllocation).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    percentage: totalAssets > 0 ? ((value / totalAssets) * 100).toFixed(1) : '0'
  }));

  // Monthly cash flow data
  const cashFlowData = [
    { name: 'Income', amount: monthlyBudget.income, type: 'positive' },
    { name: 'Household', amount: -monthlyBudget.expenses.household, type: 'negative' },
    { name: 'Insurance', amount: -monthlyBudget.expenses.insurance, type: 'negative' },
    { name: 'Loans', amount: -monthlyBudget.expenses.loans, type: 'negative' },
    { name: 'Investments', amount: -monthlyBudget.expenses.investments, type: 'investment' },
    { name: 'Chit Fund', amount: -monthlyBudget.expenses.other, type: 'investment' },
    { name: 'Surplus', amount: monthlyBudget.surplus, type: 'positive' },
  ];

  // Goals progress data
  const goalsData = goals.map(goal => ({
    name: goal.name.length > 15 ? goal.name.substring(0, 15) + '...' : goal.name,
    progress: (goal.currentAmount / goal.targetAmount) * 100,
    current: goal.currentAmount,
    target: goal.targetAmount
  }));

  // LIC maturity timeline (next 10 years)
  const currentYear = new Date().getFullYear();
  const licTimelineData = [];
  for (let year = currentYear; year <= currentYear + 10; year++) {
    const yearPolicies = licPolicies.filter(p => p.maturityYear === year);
    const yearAmount = yearPolicies.reduce((sum, p) => sum + p.maturityAmount, 0);
    licTimelineData.push({
      year: year.toString(),
      amount: yearAmount,
      count: yearPolicies.length
    });
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Comprehensive analysis and visualizations</p>
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card text-center">
          <PieChartIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Net Worth</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatLargeNumber(totalAssets)}
          </p>
        </div>
        <div className="metric-card text-center">
          <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Savings Rate</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {(((monthlyBudget.expenses.investments + monthlyBudget.expenses.other + monthlyBudget.surplus) / monthlyBudget.income) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="metric-card text-center">
          <Target className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Retirement Progress</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {((goals.find(g => g.category === 'retirement')?.currentAmount || 0) / 
              (goals.find(g => g.category === 'retirement')?.targetAmount || 1) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="metric-card text-center">
          <TrendingUp className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Investment Allocation</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalAssets > 0 ? (((assets.filter(a => ['stocks', 'mutual_funds'].includes(a.category))
                .reduce((sum, a) => sum + a.currentValue, 0)) / totalAssets) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Asset Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatLargeNumber(value as number)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-gray-600 dark:text-gray-300">{item.name}: {item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Cash Flow */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Cash Flow</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => formatCurrency(Math.abs(value as number))} />
              <Bar dataKey="amount">
                {cashFlowData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.type === 'positive' ? '#10B981' : 
                      entry.type === 'investment' ? '#3B82F6' : '#EF4444'
                    } 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Goals Progress Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Goals Progress</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={goalsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis tickFormatter={(value) => `${value}%`} />
            <Tooltip 
              formatter={(value, name) => [
                name === 'progress' ? `${(value as number).toFixed(1)}%` : formatLargeNumber(value as number),
                name === 'progress' ? 'Progress' : name === 'current' ? 'Current Amount' : 'Target Amount'
              ]}
            />
            <Bar dataKey="progress" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* LIC Maturity Timeline */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">LIC Policies Maturity Timeline (Next 10 Years)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={licTimelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
            <Tooltip 
              formatter={(value, name) => [
                name === 'amount' ? formatCurrency(value as number) : `${value} policies`,
                name === 'amount' ? 'Maturity Amount' : 'Policies Count'
              ]}
            />
            <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} />
            <Bar dataKey="count" fill="#10B981" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Ratios */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Financial Ratios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">Debt-to-Income Ratio</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {((329030 / (monthlyBudget.income * 12)) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Excellent (&lt;20%)</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">Emergency Fund Ratio</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {(700000 / (monthlyBudget.expenses.household * 6)).toFixed(1)}x
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">6 months expenses</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">Investment Rate</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {(((monthlyBudget.expenses.investments + monthlyBudget.expenses.other) / monthlyBudget.income) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Of gross income</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">Liquidity Ratio</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {totalAssets > 0 ? ((assets.filter(a => ['cash', 'stocks', 'mutual_funds'].includes(a.category))
                  .reduce((sum, a) => sum + a.currentValue, 0) / totalAssets) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Liquid assets</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;