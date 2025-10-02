import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calculator, Target, Calendar } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatLargeNumber } from '../utils/formatters';

const Forecast: React.FC = () => {
  const { goals, monthlyBudget, licPolicies, assets, userProfile } = useData();
  const [inflationRate, setInflationRate] = useState(6);
  const [returnRate, setReturnRate] = useState(12);
  const [forecastYears, setForecastYears] = useState(10);

  // Calculate retirement projection
  const currentAge = userProfile?.financialInfo.currentAge || 30;
  const retirementAge = userProfile?.financialInfo.retirementAge || 60;
  const yearsToRetirement = retirementAge - currentAge;
  const currentRetirementCorpus = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const monthlyRetirementSIP = monthlyBudget.surplus + (goals.find(g => g.category === 'retirement')?.monthlyContribution || 0);

  const calculateFutureValue = (pv: number, pmt: number, rate: number, years: number) => {
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    const fvPV = pv * Math.pow(1 + monthlyRate, months);
    const fvPMT = pmt * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    return fvPV + fvPMT;
  };

  // Generate forecast data
  const forecastData = [];
  const currentYear = new Date().getFullYear();
  
  for (let year = 0; year <= forecastYears; year++) {
    const projectedYear = currentYear + year;
    const age = currentAge + year;
    
    // Retirement corpus projection
    const retirementCorpus = year <= yearsToRetirement 
      ? calculateFutureValue(currentRetirementCorpus, monthlyRetirementSIP, returnRate, year)
      : calculateFutureValue(currentRetirementCorpus, monthlyRetirementSIP, returnRate, yearsToRetirement);
    
    // LIC maturity for this year
    const licMaturity = licPolicies
      .filter(p => p.maturityYear === projectedYear)
      .reduce((sum, p) => sum + p.maturityAmount, 0);
    
    // Goals projection
    const goalsValue = goals.reduce((sum, goal) => {
      const goalYears = (new Date(goal.targetDate).getFullYear() - currentYear);
      if (year <= goalYears) {
        return sum + calculateFutureValue(goal.currentAmount, goal.monthlyContribution, returnRate, year);
      }
      return sum + goal.targetAmount;
    }, 0);

    forecastData.push({
      year: projectedYear,
      age,
      retirementCorpus: Math.round(retirementCorpus),
      licMaturity,
      goalsValue: Math.round(goalsValue),
      totalWealth: Math.round(retirementCorpus + goalsValue + licMaturity)
    });
  }

  // Calculate monthly expenses at retirement (inflated)
  const currentMonthlyExpenses = monthlyBudget.expenses.household;
  const inflatedMonthlyExpenses = currentMonthlyExpenses * Math.pow(1 + inflationRate / 100, yearsToRetirement);
  const requiredCorpusFor4Percent = inflatedMonthlyExpenses * 12 / 0.04; // 4% withdrawal rule

  // Scenario analysis
  const scenarios = [
    { name: 'Conservative', returnRate: 8, inflationRate: 7 },
    { name: 'Moderate', returnRate: 12, inflationRate: 6 },
    { name: 'Aggressive', returnRate: 15, inflationRate: 5 }
  ];

  const scenarioData = scenarios.map(scenario => {
    const corpus = calculateFutureValue(currentRetirementCorpus, monthlyRetirementSIP, scenario.returnRate, yearsToRetirement);
    const inflatedExpenses = currentMonthlyExpenses * Math.pow(1 + scenario.inflationRate / 100, yearsToRetirement);
    const requiredCorpus = inflatedExpenses * 12 / 0.04;
    
    return {
      ...scenario,
      projectedCorpus: corpus,
      requiredCorpus,
      surplus: corpus - requiredCorpus,
      adequacy: (corpus / requiredCorpus) * 100
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Forecast</h1>
        <p className="text-gray-600 mt-1">Project your financial future with different scenarios</p>
      </div>

      {/* Forecast Controls */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Forecast Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Return Rate (%)
            </label>
            <input
              type="number"
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value))}
              className="input-field"
              min="1"
              max="30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inflation Rate (%)
            </label>
            <input
              type="number"
              value={inflationRate}
              onChange={(e) => setInflationRate(Number(e.target.value))}
              className="input-field"
              min="1"
              max="15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forecast Years
            </label>
            <input
              type="number"
              value={forecastYears}
              onChange={(e) => setForecastYears(Number(e.target.value))}
              className="input-field"
              min="5"
              max="25"
            />
          </div>
        </div>
      </div>

      {/* Key Projections */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card text-center">
          <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Retirement Corpus @ 50</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatLargeNumber(
              calculateFutureValue(currentRetirementCorpus, monthlyRetirementSIP, returnRate, yearsToRetirement)
            )}
          </p>
        </div>
        <div className="metric-card text-center">
          <Calculator className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Required Corpus</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatLargeNumber(requiredCorpusFor4Percent)}
          </p>
        </div>
        <div className="metric-card text-center">
          <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Monthly Income @ 50</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(
              calculateFutureValue(currentRetirementCorpus, monthlyRetirementSIP, returnRate, yearsToRetirement) * 0.04 / 12
            )}
          </p>
        </div>
        <div className="metric-card text-center">
          <Calendar className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Years to Retirement</p>
          <p className="text-2xl font-bold text-gray-900">{yearsToRetirement}</p>
        </div>
      </div>

      {/* Wealth Projection Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Wealth Projection Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `₹${(value / 10000000).toFixed(1)}Cr`} />
            <Tooltip 
              formatter={(value, name) => [
                formatLargeNumber(value as number),
                name === 'retirementCorpus' ? 'Retirement Corpus' :
                name === 'goalsValue' ? 'Goals Value' :
                name === 'licMaturity' ? 'LIC Maturity' : 'Total Wealth'
              ]}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Line type="monotone" dataKey="retirementCorpus" stroke="#3B82F6" strokeWidth={2} name="Retirement Corpus" />
            <Line type="monotone" dataKey="goalsValue" stroke="#10B981" strokeWidth={2} name="Goals Value" />
            <Line type="monotone" dataKey="totalWealth" stroke="#8B5CF6" strokeWidth={3} name="Total Wealth" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Retirement Scenario Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scenario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Return Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inflation Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projected Corpus
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Required Corpus
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adequacy
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scenarioData.map((scenario) => (
                <tr key={scenario.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {scenario.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {scenario.returnRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {scenario.inflationRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatLargeNumber(scenario.projectedCorpus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {formatLargeNumber(scenario.requiredCorpus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-semibold ${scenario.adequacy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {scenario.adequacy.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LIC Maturity Timeline */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Post-Retirement Income Stream (LIC Policies)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={licPolicies.slice(0, 15).map(p => ({ 
              year: p.maturityYear, 
              amount: p.maturityAmount,
              age: 40 + (p.maturityYear - 2025)
            }))} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
            <Tooltip 
              formatter={(value) => [formatCurrency(value as number), 'Maturity Amount']}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Bar dataKey="amount" fill="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-600 mt-2">
          Total LIC maturity value: {formatLargeNumber(licPolicies.reduce((sum, p) => sum + p.maturityAmount, 0))} 
          over 25 years (2036-2060)
        </p>
      </div>

      {/* Financial Independence Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Independence Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Current Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Age:</span>
                <span className="font-medium">{currentAge} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target Retirement Age:</span>
                <span className="font-medium">{retirementAge} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Years to Retirement:</span>
                <span className="font-medium">{yearsToRetirement} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Net Worth:</span>
                <span className="font-medium">{formatLargeNumber(currentRetirementCorpus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Investment:</span>
                <span className="font-medium">{formatCurrency(monthlyRetirementSIP)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Retirement Projections</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Projected Corpus @ 50:</span>
                <span className="font-medium text-green-600">
                  {formatLargeNumber(
                    calculateFutureValue(currentRetirementCorpus, monthlyRetirementSIP, returnRate, yearsToRetirement)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Income (4% rule):</span>
                <span className="font-medium">
                  {formatCurrency(
                    calculateFutureValue(currentRetirementCorpus, monthlyRetirementSIP, returnRate, yearsToRetirement) * 0.04 / 12
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inflated Monthly Expenses:</span>
                <span className="font-medium">{formatCurrency(inflatedMonthlyExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Surplus/Deficit:</span>
                <span className={`font-medium ${
                  (calculateFutureValue(currentRetirementCorpus, monthlyRetirementSIP, returnRate, yearsToRetirement) * 0.04 / 12) > inflatedMonthlyExpenses 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(
                    (calculateFutureValue(currentRetirementCorpus, monthlyRetirementSIP, returnRate, yearsToRetirement) * 0.04 / 12) - inflatedMonthlyExpenses
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forecast;