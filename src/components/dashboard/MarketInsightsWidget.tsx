import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Globe, 
  IndianRupee,
  AlertTriangle,
  Info,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';

interface MarketInsight {
  id: string;
  type: 'market_trend' | 'sector_analysis' | 'investment_opportunity' | 'risk_alert' | 'economic_indicator';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'short_term' | 'long_term';
  actionable: boolean;
  action?: {
    label: string;
    description: string;
  };
  confidence: number;
  relevantAssets?: string[];
}

interface MarketData {
  nifty50: { value: number; change: number; changePercent: number };
  sensex: { value: number; change: number; changePercent: number };
  bankNifty: { value: number; change: number; changePercent: number };
  goldPrice: { value: number; change: number; changePercent: number };
  usdInr: { value: number; change: number; changePercent: number };
  lastUpdated: Date;
}

const MarketInsightsWidget: React.FC = () => {
  const theme = useThemeClasses();
  const { assets, goals } = useData();
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);

  useEffect(() => {
    generateMarketInsights();
    // In a real app, you'd fetch actual market data from an API
    generateMockMarketData();
  }, [assets, goals]);

  const generateMockMarketData = () => {
    // Mock market data - in production, fetch from real API
    setMarketData({
      nifty50: { value: 21500, change: 125.50, changePercent: 0.58 },
      sensex: { value: 71200, change: 420.30, changePercent: 0.59 },
      bankNifty: { value: 46800, change: -180.20, changePercent: -0.38 },
      goldPrice: { value: 62500, change: 250.00, changePercent: 0.40 },
      usdInr: { value: 83.25, change: 0.15, changePercent: 0.18 },
      lastUpdated: new Date()
    });
  };

  const generateMarketInsights = async () => {
    setIsLoading(true);
    
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newInsights: MarketInsight[] = [];

    // Analyze user's portfolio composition
    const totalInvestments = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const equityAssets = assets.filter(asset => 
      asset.category === 'stocks' || asset.category === 'mutual_funds'
    );
    const equityValue = equityAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const equityPercentage = totalInvestments > 0 ? (equityValue / totalInvestments) * 100 : 0;

    // 1. Market Trend Analysis
    newInsights.push({
      id: 'market-trend-1',
      type: 'market_trend',
      title: 'Indian Markets Show Resilience',
      description: 'Nifty 50 and Sensex continue their upward trajectory despite global uncertainties. Banking sector showing mixed signals with consolidation expected.',
      impact: 'medium',
      timeframe: 'short_term',
      actionable: true,
      action: {
        label: 'Review Banking Exposure',
        description: 'Consider rebalancing if banking stocks exceed 15% of portfolio'
      },
      confidence: 78,
      relevantAssets: ['stocks', 'mutual_funds']
    });

    // 2. Sector Analysis
    newInsights.push({
      id: 'sector-analysis-1',
      type: 'sector_analysis',
      title: 'Technology Sector Outperforming',
      description: 'IT and technology stocks are showing strong momentum driven by AI adoption and digital transformation trends. Consider increasing allocation.',
      impact: 'high',
      timeframe: 'long_term',
      actionable: true,
      action: {
        label: 'Explore Tech Funds',
        description: 'Consider technology-focused mutual funds or ETFs'
      },
      confidence: 85,
      relevantAssets: ['mutual_funds', 'stocks']
    });

    // 3. Investment Opportunity
    if (equityPercentage < 60 && totalInvestments > 100000) {
      newInsights.push({
        id: 'investment-opportunity-1',
        type: 'investment_opportunity',
        title: 'Equity Allocation Below Optimal',
        description: `Your equity allocation is ${equityPercentage.toFixed(1)}%. For your age and risk profile, consider increasing to 60-70% for better long-term growth.`,
        impact: 'high',
        timeframe: 'long_term',
        actionable: true,
        action: {
          label: 'Increase Equity Allocation',
          description: 'Gradually increase equity exposure through SIPs'
        },
        confidence: 82,
        relevantAssets: ['mutual_funds', 'stocks']
      });
    }

    // 4. Risk Alert
    newInsights.push({
      id: 'risk-alert-1',
      type: 'risk_alert',
      title: 'Global Economic Headwinds',
      description: 'Rising geopolitical tensions and inflation concerns may impact emerging markets. Maintain diversification and avoid concentrated bets.',
      impact: 'medium',
      timeframe: 'immediate',
      actionable: true,
      action: {
        label: 'Review Risk Exposure',
        description: 'Ensure portfolio is well-diversified across sectors and asset classes'
      },
      confidence: 75,
      relevantAssets: ['stocks', 'mutual_funds']
    });

    // 5. Economic Indicator
    newInsights.push({
      id: 'economic-indicator-1',
      type: 'economic_indicator',
      title: 'Gold Prices Stabilizing',
      description: 'Gold has shown resilience as a hedge against inflation. Current levels present a good entry point for portfolio diversification.',
      impact: 'low',
      timeframe: 'long_term',
      actionable: true,
      action: {
        label: 'Consider Gold Allocation',
        description: 'Allocate 5-10% of portfolio to gold ETFs or digital gold'
      },
      confidence: 70,
      relevantAssets: ['gold', 'etf']
    });

    // 6. Tax-saving opportunity
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 10 || currentMonth <= 2) { // Nov-Feb (tax season)
      newInsights.push({
        id: 'tax-opportunity-1',
        type: 'investment_opportunity',
        title: 'ELSS Funds for Tax Saving',
        description: 'Tax-saving season is here! ELSS mutual funds offer dual benefits of tax deduction under 80C and potential for equity returns.',
        impact: 'high',
        timeframe: 'immediate',
        actionable: true,
        action: {
          label: 'Invest in ELSS',
          description: 'Save up to ₹46,800 in taxes with ₹1.5L investment'
        },
        confidence: 90,
        relevantAssets: ['mutual_funds']
      });
    }

    setInsights(newInsights);
    setIsLoading(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'market_trend': return TrendingUp;
      case 'sector_analysis': return BarChart3;
      case 'investment_opportunity': return Target;
      case 'risk_alert': return AlertTriangle;
      case 'economic_indicator': return Globe;
      default: return Info;
    }
  };

  const getInsightColor = (type: string, impact: string) => {
    if (type === 'risk_alert') return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700';
    if (impact === 'high') return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700';
    if (impact === 'medium') return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700';
    return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600';
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };

    return (
      <span className={cn('px-2 py-1 text-xs rounded-full font-medium', colors[impact as keyof typeof colors])}>
        {impact.toUpperCase()}
      </span>
    );
  };

  const formatMarketValue = (value: number, change: number, changePercent: number) => {
    const isPositive = change >= 0;
    return (
      <div className="text-right">
        <div className={theme.textPrimary}>{value.toLocaleString()}</div>
        <div className={cn('text-sm flex items-center justify-end', isPositive ? 'text-green-600' : 'text-red-600')}>
          {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {Math.abs(change).toFixed(2)} ({Math.abs(changePercent).toFixed(2)}%)
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Market Data Overview */}
      {marketData && (
        <div className={theme.card}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn(theme.heading3, 'flex items-center')}>
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              Market Overview
            </h3>
            <button
              onClick={generateMockMarketData}
              className={cn(theme.btnSecondary, 'flex items-center text-sm')}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className={cn(theme.textMuted, 'text-sm mb-1')}>Nifty 50</div>
              {formatMarketValue(marketData.nifty50.value, marketData.nifty50.change, marketData.nifty50.changePercent)}
            </div>
            <div className="text-center">
              <div className={cn(theme.textMuted, 'text-sm mb-1')}>Sensex</div>
              {formatMarketValue(marketData.sensex.value, marketData.sensex.change, marketData.sensex.changePercent)}
            </div>
            <div className="text-center">
              <div className={cn(theme.textMuted, 'text-sm mb-1')}>Bank Nifty</div>
              {formatMarketValue(marketData.bankNifty.value, marketData.bankNifty.change, marketData.bankNifty.changePercent)}
            </div>
            <div className="text-center">
              <div className={cn(theme.textMuted, 'text-sm mb-1')}>Gold (₹/10g)</div>
              {formatMarketValue(marketData.goldPrice.value, marketData.goldPrice.change, marketData.goldPrice.changePercent)}
            </div>
            <div className="text-center">
              <div className={cn(theme.textMuted, 'text-sm mb-1')}>USD/INR</div>
              {formatMarketValue(marketData.usdInr.value, marketData.usdInr.change, marketData.usdInr.changePercent)}
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className={cn(theme.textMuted, 'text-xs')}>
              Last updated: {marketData.lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* AI Market Insights */}
      <div className={theme.card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn(theme.heading3, 'flex items-center')}>
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            AI Market Insights
          </h3>
          <button
            onClick={generateMarketInsights}
            disabled={isLoading}
            className={cn(theme.btnPrimary, 'flex items-center text-sm')}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} />
            {isLoading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => {
              const Icon = getInsightIcon(insight.type);
              const isSelected = selectedInsight === insight.id;

              return (
                <div
                  key={insight.id}
                  className={cn(
                    'p-4 rounded-lg border transition-all duration-200 cursor-pointer',
                    getInsightColor(insight.type, insight.impact),
                    isSelected && 'ring-2 ring-blue-300 dark:ring-blue-600'
                  )}
                  onClick={() => setSelectedInsight(isSelected ? null : insight.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        <div className="flex items-center space-x-2">
                          {getImpactBadge(insight.impact)}
                          <span className="text-xs opacity-75">
                            {insight.confidence}% confidence
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm opacity-90 mb-3">{insight.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-xs opacity-75">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {insight.timeframe.replace('_', ' ')}
                          </span>
                          {insight.relevantAssets && (
                            <span>
                              Relevant: {insight.relevantAssets.join(', ')}
                            </span>
                          )}
                        </div>
                        
                        {insight.actionable && insight.action && (
                          <button className="flex items-center text-xs font-medium hover:underline">
                            {insight.action.label}
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </button>
                        )}
                      </div>
                      
                      {isSelected && insight.action && (
                        <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium mb-1">Action Recommended:</p>
                              <p className="text-xs opacity-90">{insight.action.description}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && insights.length === 0 && (
          <div className="text-center py-8">
            <Globe className={cn(theme.textMuted, 'w-12 h-12 mx-auto mb-3')} />
            <p className={theme.textMuted}>No market insights available at the moment.</p>
          </div>
        )}
      </div>

      {/* Quick Market Actions */}
      <div className={cn(theme.card, 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20')}>
        <h4 className={cn(theme.textPrimary, 'font-medium mb-4 flex items-center')}>
          <Target className="w-4 h-4 mr-2" />
          Quick Market Actions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Start SIP</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Begin systematic investment plan
            </p>
          </button>
          
          <button className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Rebalance Portfolio</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Optimize asset allocation
            </p>
          </button>
          
          <button className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left">
            <div className="flex items-center space-x-2 mb-2">
              <IndianRupee className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Tax Planning</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Optimize tax-saving investments
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketInsightsWidget;