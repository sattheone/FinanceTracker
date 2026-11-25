import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Target, Filter, Settings, DollarSign, Calculator } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatLargeNumber } from '../utils/formatters';
import Modal from '../components/common/Modal';
import TimelineMilestonesRibbon from '../components/forecast/TimelineMilestonesRibbon';
import LifeEventModal from '../components/forecast/LifeEventModal';
import DrawdownChart from '../components/forecast/DrawdownChart';
import { LifeEvent } from '../types';

const Forecast: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'simulator'>('overview');

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

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-5 sm:space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${activeTab === 'overview'
              ? 'border-[color:var(--color-accent-primary)] text-[color:var(--color-text-primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Target className="w-4 h-4 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`${activeTab === 'simulator'
              ? 'border-[color:var(--color-accent-primary)] text-[color:var(--color-text-primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Invest & Drawdown Simulator
          </button>
        </nav>
      </div>

      {activeTab === 'overview' ? (
        <ForecastOverview />
      ) : (
        <DrawdownSimulator />
      )}
    </div>
  );
};

const DrawdownSimulator: React.FC = () => {
  const SIP_SELECTION_STORAGE_KEY = 'forecast_selected_sip_assets';
  const { 
    assets, 
    monthlyBudget, 
    userProfile, 
    transactions, 
    goals,
    lifeEvents,
    loadAssets, 
    loadMonthlyBudget,
    loadGoals,
    loadLifeEvents,
    addLifeEvent,
    updateLifeEvent,
    deleteLifeEvent,
    toggleLifeEventActive,
    importGoalAsLifeEvent
  } = useData();

  React.useEffect(() => {
    loadAssets();
    loadMonthlyBudget();
    loadGoals();
    loadLifeEvents();
  }, []);

  const [isLifeEventModalOpen, setIsLifeEventModalOpen] = useState(false);
  const [editingLifeEvent, setEditingLifeEvent] = useState<LifeEvent | null>(null);

  const handleAddEvent = () => {
    setEditingLifeEvent(null);
    setIsLifeEventModalOpen(true);
  };

  const handleEditEvent = (event: LifeEvent) => {
    setEditingLifeEvent(event);
    setIsLifeEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Omit<LifeEvent, 'id'>) => {
    if (editingLifeEvent) {
      await updateLifeEvent(editingLifeEvent.id, eventData);
    } else {
      await addLifeEvent(eventData);
    }
    setIsLifeEventModalOpen(false);
    setEditingLifeEvent(null);
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteLifeEvent(id);
  };

  const sipAssets = React.useMemo(() => {
    return assets.filter(asset => asset.isSIP && (asset.sipAmount || 0) > 0);
  }, [assets]);

  const totalSIPFromAssets = React.useMemo(() => {
    return sipAssets.reduce((sum, asset) => sum + (asset.sipAmount || 0), 0);
  }, [sipAssets]);

  // Initial Defaults
  const defaultCorpus = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const defaultMonthlySIP = totalSIPFromAssets > 0 ? totalSIPFromAssets : monthlyBudget.surplus;
  const defaultAge = userProfile?.financialInfo.currentAge || 30;
  const defaultRetirementAge = userProfile?.financialInfo.retirementAge || 60;

  const [selectedSIPAssetIds, setSelectedSIPAssetIds] = React.useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(SIP_SELECTION_STORAGE_KEY);
      if (!saved) return new Set();
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  });
  const [hasTouchedSipSelection, setHasTouchedSipSelection] = React.useState(() => {
    return !!localStorage.getItem(SIP_SELECTION_STORAGE_KEY);
  });
  const [isSipPopoverOpen, setIsSipPopoverOpen] = React.useState(false);
  const sipPopoverRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    localStorage.setItem(SIP_SELECTION_STORAGE_KEY, JSON.stringify(Array.from(selectedSIPAssetIds)));
  }, [selectedSIPAssetIds]);

  React.useEffect(() => {
    if (!isSipPopoverOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!sipPopoverRef.current?.contains(event.target as Node)) {
        setIsSipPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSipPopoverOpen]);

  React.useEffect(() => {
    if (sipAssets.length === 0) {
      setSelectedSIPAssetIds(new Set());
      return;
    }

    const availableIds = new Set(sipAssets.map(asset => asset.id));

    if (!hasTouchedSipSelection) {
      setSelectedSIPAssetIds(availableIds);
      return;
    }

    setSelectedSIPAssetIds(prev => {
      const next = new Set<string>();
      prev.forEach(id => {
        if (availableIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [sipAssets, hasTouchedSipSelection]);

  const selectedSIPMonthlyTotal = React.useMemo(() => {
    if (selectedSIPAssetIds.size === 0) return 0;
    return sipAssets.reduce((sum, asset) => {
      if (!selectedSIPAssetIds.has(asset.id)) return sum;
      return sum + (asset.sipAmount || 0);
    }, 0);
  }, [sipAssets, selectedSIPAssetIds]);

  // Pre-calculate actual investments by year from transactions
  const actualInvestmentsByYear = React.useMemo(() => {
    const investments: Record<number, number> = {};
    if (!transactions) return investments;

    transactions.forEach(t => {
      if (t.type === 'investment') {
        const year = new Date(t.date).getFullYear();
        investments[year] = (investments[year] || 0) + t.amount;
      }
    });
    return investments;
  }, [transactions]);

  // State for Simulation
  const [corpus, setCorpus] = useState(defaultCorpus);
  const [monthlySIP, setMonthlySIP] = useState(defaultMonthlySIP);
  const [stepUpRate, setStepUpRate] = useState(5);
  const [preRetirementReturn, setPreRetirementReturn] = useState(12);
  const [postRetirementReturn, setPostRetirementReturn] = useState(8);
  const [inflationRate, setInflationRate] = useState(6);
  const [monthlyExpenses, setMonthlyExpenses] = useState(monthlyBudget.expenses.household);
  const [currentAge, setCurrentAge] = useState(defaultAge);
  const [retirementAge, setRetirementAge] = useState(defaultRetirementAge);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);

  // Sync state with defaults when data loads (if state is effectively empty)
  React.useEffect(() => {
    // Only update if the current state seems "uninitialized" (e.g. 0 corpus/SIP/expenses) 
    // AND the new defaults are meaningful.
    // Or simpler: Just update all provided the user hasn't heavily customized?
    // Let's go with: Update if the internal state matches the "previous default" (hard to track)
    // OR: Just update if the current values are 0 (likely uninitialized).
    if (corpus === 0 && defaultCorpus > 0) setCorpus(defaultCorpus);
    if (monthlySIP === 0 && defaultMonthlySIP > 0) setMonthlySIP(defaultMonthlySIP);
    if (monthlyExpenses === 0 && monthlyBudget.expenses.household > 0) setMonthlyExpenses(monthlyBudget.expenses.household);

    // Also sync ages if they were defaults
    // This is tricky. Let's just trust the user's manual reset if they want full sync.
    // But for the specific "Empty Columns" bug, it's definitely because monthlySIP/Expenses were 0 initially.
  }, [defaultCorpus, defaultMonthlySIP, monthlyBudget.expenses.household]);

  // Return Overrides: Record<Age, ReturnRate>
  const [returnOverrides, setReturnOverrides] = useState<Record<number, number>>({});

  const handleReturnOverride = (age: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setReturnOverrides(prev => ({ ...prev, [age]: numValue }));
    } else {
      // If empty or invalid, remove the override to revert to default
      const newOverrides = { ...returnOverrides };
      delete newOverrides[age];
      setReturnOverrides(newOverrides);
    }
  };

  // Investment Overrides: Record<Age, InvestmentAmount>
  const [investmentOverrides, setInvestmentOverrides] = useState<Record<number, number>>({});

  const handleInvestmentOverride = (age: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setInvestmentOverrides(prev => ({ ...prev, [age]: numValue }));
    } else {
      // If empty or invalid, remove the override to revert to default
      const newOverrides = { ...investmentOverrides };
      delete newOverrides[age];
      setInvestmentOverrides(newOverrides);
    }
  };

  const handleReset = () => {
    setCorpus(defaultCorpus);
    setMonthlySIP(defaultMonthlySIP);
    setStepUpRate(5);
    setPreRetirementReturn(12);
    setPostRetirementReturn(8);
    setInflationRate(6);
    setMonthlyExpenses(monthlyBudget.expenses.household);
    setCurrentAge(defaultAge);
    setRetirementAge(defaultRetirementAge);
    setLifeExpectancy(90);
    setReturnOverrides({});
    setInvestmentOverrides({});
    setHasTouchedSipSelection(false);
    setSelectedSIPAssetIds(new Set(sipAssets.map(asset => asset.id)));
  };

  const handleImportGoals = async () => {
    const unimportedGoals = (goals || []).filter(
      g => !(lifeEvents || []).some(e => e.linkedGoalId === g.id)
    );
    for (const goal of unimportedGoals) {
      await importGoalAsLifeEvent(goal, currentAge);
    }
  };

  const toggleSIPAsset = (assetId: string) => {
    setHasTouchedSipSelection(true);
    setSelectedSIPAssetIds(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }

      const nextMonthlySip = sipAssets.reduce((sum, asset) => {
        if (!next.has(asset.id)) return sum;
        return sum + (asset.sipAmount || 0);
      }, 0);
      setMonthlySIP(nextMonthlySip);

      return next;
    });
  };

  // Calculation Logic with Life Events
  const simulationData = React.useMemo(() => {
    const data = [];
    let currentCorpus = corpus;
    let currentSIP = monthlySIP;
    const activeLifeEvents = (lifeEvents || []).filter(e => e.isActive);

    for (let age = currentAge; age <= lifeExpectancy; age++) {
      const isRetired = age >= retirementAge;
      const yearIndex = age - currentAge;
      const currentYear = new Date().getFullYear() + yearIndex;

      // Calculate annual expenses with inflation applied from year 0
      const annualExpenses = (monthlyExpenses * 12) * Math.pow(1 + inflationRate / 100, yearIndex);

      const openingBalance = currentCorpus;
      let yearlyInvestment = 0;
      let yearlyWithdrawal = 0;

      // Determine active life events in this specific year
      const activeEventsInYear = activeLifeEvents.filter(e => {
        const duration = e.durationYears || 1;
        return age >= e.targetAge && age < e.targetAge + duration;
      });

      let yearEventInflow = 0;
      let yearEventOutflow = 0;
      let isSipPaused = false;

      activeEventsInYear.forEach(e => {
        if (e.type === 'income_pause') {
          isSipPaused = true;
        } else {
          const cost = e.isInflationAdjusted
            ? e.amount * Math.pow(1 + inflationRate / 100, yearIndex)
            : e.amount;
          if (e.type === 'expense_once' || e.type === 'expense_recurring') {
            yearEventOutflow += cost;
          } else if (e.type === 'income_once' || e.type === 'income_recurring') {
            yearEventInflow += cost;
          }
        }
      });

      // Determine Return Rate (Override > Phase Default)
      const defaultRate = isRetired ? postRetirementReturn : preRetirementReturn;
      const returnRate = returnOverrides[age] !== undefined ? returnOverrides[age] : defaultRate;

      let calculatedYearlyInvestment = 0;
      if (!isRetired) {
        // Accumulation Phase
        calculatedYearlyInvestment = isSipPaused ? 0 : currentSIP * 12;
      } else {
        // Decumulation Phase
        calculatedYearlyInvestment = 0;
      }

      // Check for user override
      if (investmentOverrides[age] !== undefined) {
        yearlyInvestment = investmentOverrides[age];
      } else {
        // Fallback: Check for actual transaction data
        const actuals = actualInvestmentsByYear[currentYear];
        if (actuals && actuals > 0) {
          yearlyInvestment = actuals;
        } else {
          yearlyInvestment = calculatedYearlyInvestment;
        }
      }

      // Determine Withdrawal (Expense)
      if (isRetired) {
        yearlyWithdrawal = annualExpenses;
      } else {
        yearlyWithdrawal = 0;
      }

      // Total Cash Flows including Life Events
      const totalInflow = yearlyInvestment + yearEventInflow;
      const totalOutflow = yearlyWithdrawal + yearEventOutflow;

      // Growth Calculation
      let growthEstimate = (openingBalance * (returnRate / 100)) +
        (totalInflow * (returnRate / 100) * 0.5) -
        (totalOutflow * (returnRate / 100) * 0.5);

      let closingBalance = openingBalance + totalInflow - totalOutflow + growthEstimate;
      if (closingBalance < 0) closingBalance = 0;

      data.push({
        age,
        year: currentYear,
        isRetired,
        openingBalance,
        investment: yearlyInvestment,
        expenses: Math.round(annualExpenses),
        returnRate,
        growth: Math.round(growthEstimate),
        closingBalance: Math.round(closingBalance),
        hasActuals: !!actualInvestmentsByYear[currentYear],
        eventInflows: Math.round(yearEventInflow),
        eventOutflows: Math.round(yearEventOutflow),
        activeEventsInYear
      });

      currentCorpus = closingBalance;

      // Step up SIP for next year (only if in accumulation phase and not paused)
      if (!isRetired && !isSipPaused) {
        currentSIP = currentSIP * (1 + stepUpRate / 100);
      }
    }
    return data;
  }, [corpus, monthlySIP, stepUpRate, preRetirementReturn, postRetirementReturn, inflationRate, monthlyExpenses, currentAge, retirementAge, lifeExpectancy, returnOverrides, investmentOverrides, actualInvestmentsByYear, lifeEvents]);

  const corpusAtRetirement = simulationData.find(d => d.age === retirementAge)?.openingBalance || 0;
  const zeroBalanceYear = simulationData.find(d => d.closingBalance === 0 && d.age >= retirementAge);

  return (
    <div className="space-y-8 mt-6">
      {/* Configuration Panel */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Settings className="w-5 h-5 mr-2" style={{ color: 'var(--color-highlight)' }} />
            Simulation Parameters
          </h2>
          <button
            onClick={handleReset}
            className="text-sm font-medium theme-text-secondary hover:theme-text-primary"
          >
            Reset to Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Starting Point</h3>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Corpus</label>
                <button
                  onClick={() => setCorpus(defaultCorpus)}
                  className="text-xs font-medium flex items-center theme-text-secondary hover:theme-text-primary"
                  title={`Sync to Total Assets: ${formatCurrency(defaultCorpus)}`}
                >
                  Sync ({formatLargeNumber(defaultCorpus)})
                </button>
              </div>
              <input type="number" value={corpus} onChange={e => setCorpus(Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monthly SIP</label>
                {sipAssets.length > 0 && (
                  <div className="relative" ref={sipPopoverRef}>
                    <button
                      onClick={() => setIsSipPopoverOpen(prev => !prev)}
                      className="text-xs font-medium theme-text-secondary hover:theme-text-primary"
                      title="Select SIP assets to include"
                    >
                      SIPs ({selectedSIPAssetIds.size})
                    </button>

                    {isSipPopoverOpen && (
                      <div className="absolute right-0 mt-2 w-80 max-w-[80vw] p-3 rounded-xl z-20 max-h-64 overflow-y-auto space-y-2" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border-primary)', boxShadow: 'var(--shadow-lg)' }}>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Included SIP Assets
                        </div>
                        {sipAssets.map(asset => (
                          <label key={asset.id} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                            <span className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={selectedSIPAssetIds.has(asset.id)}
                                onChange={() => toggleSIPAsset(asset.id)}
                                className="h-3.5 w-3.5 rounded border-[color:var(--color-border-primary)]"
                              />
                              <span className="truncate">{asset.name}</span>
                            </span>
                            <span className="font-medium ml-2">{formatCurrency(asset.sipAmount || 0)}</span>
                          </label>
                        ))}
                        <div className="pt-2 mt-1 border-t border-[color:var(--color-border-primary)] text-xs font-medium theme-text-secondary flex items-center justify-between">
                          <span>Selected Total</span>
                          <span>{formatCurrency(selectedSIPMonthlyTotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input type="number" value={monthlySIP} onChange={e => setMonthlySIP(Number(e.target.value))} className="input-field" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Growth Assumptions</h3>
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">Step-up SIP (%)</label>
              <input type="number" value={stepUpRate} onChange={e => setStepUpRate(Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">Pre-Retirement Return (%)</label>
              <input type="number" value={preRetirementReturn} onChange={e => setPreRetirementReturn(Number(e.target.value))} className="input-field" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Retirement Phase</h3>
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">Post-Retirement Return (%)</label>
              <input type="number" value={postRetirementReturn} onChange={e => setPostRetirementReturn(Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-1">Monthly Expenses (Today's Value)</label>
              <input type="number" value={monthlyExpenses} onChange={e => setMonthlyExpenses(Number(e.target.value))} className="input-field" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timeline</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">Current Age</label>
                <input type="number" value={currentAge} onChange={e => setCurrentAge(Number(e.target.value))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">Retirement Age</label>
                <input type="number" value={retirementAge} onChange={e => setRetirementAge(Number(e.target.value))} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">Life Expectancy</label>
                <input type="number" value={lifeExpectancy} onChange={e => setLifeExpectancy(Number(e.target.value))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-1">Inflation (%)</label>
                <input type="number" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value))} className="input-field" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card" style={{ backgroundColor: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)' }}>
          <h3 className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>Corpus at Retirement ({retirementAge})</h3>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{formatLargeNumber(corpusAtRetirement)}</p>
        </div>
        <div className="card" style={zeroBalanceYear ? { backgroundColor: 'var(--color-error-bg)', borderColor: 'var(--color-error-border)' } : { backgroundColor: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)' }}>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Money Lasts Until Age</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {zeroBalanceYear ? zeroBalanceYear.age : `${lifeExpectancy}+`}
          </p>
          {zeroBalanceYear && <p className="text-xs text-red-600 dark:text-red-400 mt-1">Run out of funds in {zeroBalanceYear.year}</p>}
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Expense at 80 (Projected)</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency((monthlyExpenses) * Math.pow(1 + inflationRate / 100, 80 - currentAge))}
          </p>
        </div>
      </div>

      {/* Timeline Milestones Ribbon */}
      <TimelineMilestonesRibbon
        lifeEvents={lifeEvents || []}
        currentAge={currentAge}
        retirementAge={retirementAge}
        lifeExpectancy={lifeExpectancy}
        inflationRate={inflationRate}
        goals={goals || []}
        onAddEvent={handleAddEvent}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        onToggleActive={toggleLifeEventActive}
        onImportGoals={handleImportGoals}
      />

      {/* Trajectory & Milestones Visual Chart */}
      <DrawdownChart
        data={simulationData}
        retirementAge={retirementAge}
        lifeEvents={lifeEvents || []}
      />

      {/* Interactive Table */}
      <div className="card overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Year-wise Projection</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Age</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Milestones</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses (Yr)</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Invest (Yr)</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Return %</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Corpus (Accum)</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Corpus (Decum)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {simulationData.map((row) => (
                <tr key={row.age} className={`
                  ${row.age === retirementAge ? 'bg-[var(--color-warning-bg)]' : ''} 
                  ${row.closingBalance === 0 ? 'bg-[var(--color-error-bg)]' : ''}
                  hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                `}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {row.age}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {row.year}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.activeEventsInYear && row.activeEventsInYear.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.activeEventsInYear.map(ev => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => handleEditEvent(ev)}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-transform hover:scale-105 ${
                              ev.type.startsWith('income')
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                                : ev.type === 'income_pause'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                            }`}
                            title={`${ev.name} (Click to edit)`}
                          >
                            <span>{ev.name}</span>
                            <span className="font-bold">
                              {ev.type === 'income_pause' 
                                ? '⏸️' 
                                : ev.type.startsWith('income') 
                                  ? `+${formatLargeNumber(row.eventInflows || 0)}` 
                                  : `-${formatLargeNumber(row.eventOutflows || 0)}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                    {formatLargeNumber(row.expenses)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium" style={{ color: 'var(--color-success)' }}>
                    <input
                      type="number"
                      className={`w-24 px-1 py-0.5 text-right border rounded bg-transparent text-sm border-[color:var(--color-border-primary)] ${row.hasActuals && investmentOverrides[row.age] === undefined ? 'border-dashed' : ''}`}
                      value={investmentOverrides[row.age] !== undefined ? investmentOverrides[row.age] : Math.round(row.investment)}
                      placeholder={String(Math.round(row.investment))}
                      title={row.hasActuals && investmentOverrides[row.age] === undefined ? 'Based on actual transactions' : 'Projected'}
                      onChange={(e) => handleInvestmentOverride(row.age, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                    <input
                      type="number"
                      className="w-16 px-1 py-0.5 text-center border border-[color:var(--color-border-primary)] rounded bg-transparent text-sm"
                      value={returnOverrides[row.age] !== undefined ? returnOverrides[row.age] : row.returnRate}
                      placeholder={String(row.returnRate)}
                      onChange={(e) => handleReturnOverride(row.age, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white">
                    {!row.isRetired ? formatLargeNumber(row.closingBalance) : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white">
                    {row.isRetired ? formatLargeNumber(row.closingBalance) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Life Event Modal */}
      <LifeEventModal
        isOpen={isLifeEventModalOpen}
        onClose={() => {
          setIsLifeEventModalOpen(false);
          setEditingLifeEvent(null);
        }}
        eventToEdit={editingLifeEvent}
        onSave={handleSaveEvent}
        currentAge={currentAge}
        retirementAge={retirementAge}
        lifeExpectancy={lifeExpectancy}
        inflationRate={inflationRate}
        goals={goals || []}
      />
    </div>
  );
};

const ForecastOverview: React.FC = () => {
  const { goals, lifeEvents, monthlyBudget, assets, userProfile, updateUserProfile, updateMonthlyBudget, loadGoals, loadLifeEvents, loadAssets, loadMonthlyBudget } = useData();

  React.useEffect(() => {
    loadGoals();
    loadLifeEvents();
    loadAssets();
    loadMonthlyBudget();
  }, []);
  const [inflationRate, setInflationRate] = useState(6);
  const [forecastYears, setForecastYears] = useState(10);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const handleFinancialChange = (field: string, value: number) => {
    if (!userProfile) return;
    updateUserProfile({
      financialInfo: {
        ...userProfile.financialInfo,
        [field]: value,
      },
    });

    // Update monthly budget based on income and expenses
    if (field === 'monthlyIncome' || field === 'monthlyExpenses') {
      const income = field === 'monthlyIncome' ? value : (userProfile?.financialInfo.monthlyIncome || 0);
      const expenses = field === 'monthlyExpenses' ? value : (userProfile?.financialInfo.monthlyExpenses || 0);

      updateMonthlyBudget({
        income,
        expenses: {
          household: expenses,
          insurance: monthlyBudget.expenses.insurance,
          loans: monthlyBudget.expenses.loans,
          investments: monthlyBudget.expenses.investments,
          other: monthlyBudget.expenses.other,
        },
        surplus: income - (expenses + monthlyBudget.expenses.insurance + monthlyBudget.expenses.loans + monthlyBudget.expenses.investments + monthlyBudget.expenses.other),
      });
    }
  };

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

  // Calculate projected growth per asset class factoring in active life events
  const calculateYearlyProjection = (startYear: number, years: number) => {
    const data = [];
    let currentAssets = [...fiAssets.map(a => ({ ...a, projectedValue: a.currentValue }))];
    const activeLifeEvents = (lifeEvents || []).filter(e => e.isActive);

    let cumulativeEventImpact = 0;
    let accumulatedSIPCorpus = 0;
    let totalInvestedSoFar = currentRetirementCorpus;

    for (let i = 0; i <= years; i++) {
      const year = startYear + i;
      const age = currentAge + i;

      // Grow each asset only from year 1 onwards (Year 0 is today's snapshot)
      if (i > 0) {
        currentAssets = currentAssets.map(asset => {
          const r = growthRates[asset.category] || 6;
          const newValue = asset.projectedValue * (1 + r / 100);
          return { ...asset, projectedValue: newValue };
        });
      }

      // Life events occurring in this year
      const eventsInThisYear = activeLifeEvents.filter(e => {
        const duration = e.durationYears || 1;
        return age >= e.targetAge && age < e.targetAge + duration;
      });

      let yearEventInflow = 0;
      let yearEventOutflow = 0;
      let isSipPaused = false;

      eventsInThisYear.forEach(e => {
        if (e.type === 'income_pause') {
          isSipPaused = true;
        } else {
          const cost = e.isInflationAdjusted
            ? e.amount * Math.pow(1 + inflationRate / 100, i)
            : e.amount;
          if (e.type === 'expense_once' || e.type === 'expense_recurring') {
            yearEventOutflow += cost;
          } else if (e.type === 'income_once' || e.type === 'income_recurring') {
            yearEventInflow += cost;
          }
        }
      });

      if (i > 0) {
        cumulativeEventImpact = cumulativeEventImpact * (1 + weightedReturnRate / 100) + (yearEventInflow - yearEventOutflow);

        // Compound existing SIP accumulation and add this year's new contributions if not paused
        const thisYearSIPContribution = isSipPaused ? 0 : (monthlyRetirementSIP * 12);
        accumulatedSIPCorpus = accumulatedSIPCorpus * (1 + weightedReturnRate / 100) + thisYearSIPContribution;
        totalInvestedSoFar += thisYearSIPContribution;
      } else {
        cumulativeEventImpact = yearEventInflow - yearEventOutflow;
      }

      const assetsTotal = currentAssets.reduce((sum, a) => sum + a.projectedValue, 0);
      const totalWealth = Math.max(0, assetsTotal + accumulatedSIPCorpus + cumulativeEventImpact);

      data.push({
        year,
        age,
        totalWealth: Math.round(totalWealth),
        investedAmount: Math.round(totalInvestedSoFar),
        growth: Math.round(totalWealth - totalInvestedSoFar),
        eventsInYear: eventsInThisYear
      });
    }
    return data;
  };

  const forecastData = React.useMemo(() => calculateYearlyProjection(new Date().getFullYear(), Math.max(forecastYears, yearsToRetirement)), [fiAssets, forecastYears, yearsToRetirement, monthlyRetirementSIP, weightedReturnRate, lifeEvents]);

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
    <>
      {/* Financial Independence Analysis Dashboard */}
      <div className="card overflow-hidden shadow-sm mt-6">
        <div className="border-b border-[color:var(--color-border-primary)] pb-4 mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6" style={{ color: 'var(--color-highlight)' }} />
            Financial Independence Analysis
          </h2>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="theme-btn-secondary flex items-center space-x-2 text-sm rounded-lg px-3 py-1.5"
          >
            <Settings className="w-4 h-4 mr-1" />
            Edit Profile
          </button>
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
                    className="theme-text-secondary hover:theme-text-primary ml-1 p-0.5 rounded hover:bg-[color:var(--color-bg-tertiary)] transition-colors"
                    title="Manage included assets"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatLargeNumber(currentRetirementCorpus)}</p>
                  {excludedAssetIds.size > 0 && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' }}>
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
              <div className="flex justify-between items-end border-b border-[color:var(--color-card-border)] pb-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Projected Corpus @ {retirementAge}</p>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatLargeNumber(wealthAtRetirement)}
                </p>
              </div>

              <div className="flex justify-between items-end border-b border-[color:var(--color-card-border)] pb-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Income (4% rule)</p>
                </div>
                <p className="text-xl font-bold" style={{ color: 'var(--color-success)' }}>
                  {formatCurrency(monthlyIncomeAtRetirement)}
                </p>
              </div>

              <div className="flex justify-between items-end border-b border-[color:var(--color-card-border)] pb-2">
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
                <p className={`text-2xl font-extrabold`} style={{ color: isSurplus ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {(isSurplus ? '+' : '') + formatCurrency(surplusDeficit)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Controls / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="card" style={{ backgroundColor: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)' }}>
          <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--color-info)' }}>Portfolio Avg Return</h3>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-info)' }}>{weightedReturnRate.toFixed(1)}%</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-info)' }}>Based on included assets ({formatLargeNumber(currentRetirementCorpus)})</p>
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
      <div className="card mt-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Wealth Projection Over Time</h3>
          {(lifeEvents || []).filter(e => e.isActive).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                Active Milestones:
              </span>
              {(lifeEvents || []).filter(e => e.isActive).map(event => (
                <span
                  key={event.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    event.type.startsWith('income')
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : event.type === 'income_pause'
                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                  }`}
                >
                  <span>{event.type.startsWith('income') ? '💰' : event.type === 'income_pause' ? '⏸️' : '🎯'}</span>
                  <span>{event.name}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-normal">
                    (Age {event.targetAge})
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={forecastData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
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

            {/* Active Life Events on Overview Chart */}
            {(lifeEvents || []).filter(e => e.isActive).map(event => {
              const eventYear = new Date().getFullYear() + (Number(event.targetAge) - currentAge);
              const color = event.type.startsWith('income') ? '#10B981' : event.type === 'income_pause' ? '#F59E0B' : '#EF4444';
              const icon = event.type.startsWith('income') ? '💰' : event.type === 'income_pause' ? '⏸️' : '🎯';
              return (
                <ReferenceLine
                  key={event.id}
                  x={eventYear}
                  stroke={color}
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  isFront={true}
                  label={{
                    value: `${icon} ${event.name}`,
                    position: 'top',
                    fill: color,
                    fontSize: 10,
                    fontWeight: 600
                  }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Independence Analysis */}
      <div className="card mt-6">
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
              className="btn-primary"
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

          <div className="flex justify-between items-center p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--color-info)' }}>Total Included Corpus:</span>
            <span className="text-lg font-bold" style={{ color: 'var(--color-info)' }}>{formatLargeNumber(currentRetirementCorpus)}</span>
          </div>

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
                              className="h-4 w-4 rounded cursor-pointer border-[color:var(--color-border-primary)]"
                            />
                          </div>
                          <div className="ml-3 text-sm flex-1">
                            <label htmlFor={`modal-asset-${asset.id}`} className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer block">
                              {asset.name}
                            </label>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-gray-500 text-xs">{formatCurrency(asset.currentValue)}</span>
                              {linkedGoal ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' }} title={`Linked to goal: ${linkedGoal.name}`}>
                                  <Target className="w-3 h-3 mr-1" />
                                  {linkedGoal.name}
                                </span>
                              ) : (
                                growthRates[asset.category] && (
                                  <span className="text-xs" style={{ color: 'var(--color-success)' }}>
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
          </div>
        </div>
      </Modal>

      {/* Financial Profile Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Financial Profile Settings"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income & Expenses */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Monthly Cash Flow
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Monthly Income (Take-home)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10">₹</span>
                  <input
                    type="number"
                    value={userProfile?.financialInfo.monthlyIncome || ''}
                    onChange={(e) => handleFinancialChange('monthlyIncome', Number(e.target.value))}
                    className="input-field pl-8 pr-3"
                    placeholder="e.g., 75000"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Monthly Expenses (Needs)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10">₹</span>
                  <input
                    type="number"
                    value={userProfile?.financialInfo.monthlyExpenses || ''}
                    onChange={(e) => handleFinancialChange('monthlyExpenses', Number(e.target.value))}
                    className="input-field pl-8 pr-3"
                    placeholder="e.g., 45000"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Retirement Planning */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Planning Horizon
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Current Age
                </label>
                <input
                  type="number"
                  value={userProfile?.financialInfo?.currentAge || ''}
                  onChange={(e) => handleFinancialChange('currentAge', Number(e.target.value))}
                  className="input-field theme-input"
                  placeholder="e.g., 30"
                  min="18"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Target Retirement Age
                </label>
                <input
                  type="number"
                  value={userProfile?.financialInfo?.retirementAge || 60}
                  onChange={(e) => handleFinancialChange('retirementAge', Number(e.target.value))}
                  className="input-field theme-input"
                  placeholder="60"
                  min={(userProfile?.financialInfo?.currentAge || 18) + 1}
                  max="80"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Forecast;