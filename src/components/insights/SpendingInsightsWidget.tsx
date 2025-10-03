import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle,
  PieChart,
  BarChart3,
  Award,
  Lightbulb,
  ArrowRight,
  Filter
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { mintLikeFeatures, SpendingInsight } from '../../services/mintLikeFeatures';

const SpendingInsightsWidget: React.FC = () => {
  const theme = useThemeClasses();
  const { transactions, monthlyBudget } = useData();
  
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'trend' | 'alert' | 'achievement'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateInsights();
  }, [transactions, monthlyBudget]);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      // Get current month transactions
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const currentMonthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      // Get previous month transactions for comparison
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      const previousMonthTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
      });

      // Generate insights
      const generatedInsights = mintLikeFeatures.generateSpendingInsights(
        currentMonthTransactions,
        monthlyBudget,
        previousMonthTransactions
      );

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInsights = insights.filter(insight => 
    selectedFilter === 'all' || insight.type === selectedFilter
  );

  const getInsightIcon = (type: string, severity: string) => {
    switch (type) {
      case 'trend':
        return severity === 'high' ? TrendingUp : BarChart3;
      case 'alert':
        return AlertTriangle;
      case 'achievement':
        return Award;
      case 'recommendation':
        return Lightbulb;
      default:
        return PieChart;
    }
  };

  const getInsightColor = (type: string, severity: string) => {
    switch (type) {
      case 'trend':
        return severity === 'high' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'alert':
        return severity === 'high' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'achievement':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'recommendation':
        return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-700';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    };

    return (
      <span className={cn('px-2 py-1 text-xs rounded-full', colors[severity as keyof typeof colors])}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const handleInsightAction = (insight: SpendingInsight) => {
    if (insight.action) {
      console.log('Insight action:', insight.action);
      // Here you would implement the actual action
      // For example, navigate to budget page, category review, etc.
    }
  };

  if (isLoading) {
    return (
      <div className={theme.card}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={theme.card}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={cn(theme.heading3, 'flex items-center')}>
            <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
            Spending Insights
          </h3>
          <p className={theme.textMuted}>AI-powered analysis of your spending patterns</p>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {[
              { id: 'all', label: 'All', count: insights.length },
              { id: 'trend', label: 'Trends', count: insights.filter(i => i.type === 'trend').length },
              { id: 'alert', label: 'Alerts', count: insights.filter(i => i.type === 'alert').length },
              { id: 'achievement', label: 'Wins', count: insights.filter(i => i.type === 'achievement').length }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id as any)}
                className={cn(
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  selectedFilter === filter.id
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.length > 0 ? (
          filteredInsights.map((insight) => {
            const Icon = getInsightIcon(insight.type, insight.severity);
            return (
              <div
                key={insight.id}
                className={cn(
                  'p-4 rounded-lg border transition-all duration-200 hover:shadow-md',
                  getInsightColor(insight.type, insight.severity)
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {insight.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {getSeverityBadge(insight.severity)}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {insight.timeframe}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {insight.description}
                    </p>
                    
                    {/* Insight Metrics */}
                    {(insight.amount || insight.percentage) && (
                      <div className="flex items-center space-x-4 mb-3">
                        {insight.amount && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Amount:</span>
                            <span className={cn(
                              'text-sm font-medium',
                              insight.amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            )}>
                              {insight.amount > 0 ? '+' : ''}₹{Math.abs(insight.amount).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {insight.percentage && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Change:</span>
                            <span className={cn(
                              'text-sm font-medium',
                              insight.percentage > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            )}>
                              {insight.percentage > 0 ? '+' : ''}{insight.percentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Action Button */}
                    {insight.actionable && insight.action && (
                      <button
                        onClick={() => handleInsightAction(insight)}
                        className={cn(
                          'flex items-center text-sm font-medium transition-colors',
                          insight.type === 'alert' ? 'text-red-700 hover:text-red-800' :
                          insight.type === 'trend' ? 'text-blue-700 hover:text-blue-800' :
                          'text-green-700 hover:text-green-800'
                        )}
                      >
                        {insight.action.label}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <Lightbulb className={cn(theme.textMuted, 'w-12 h-12 mx-auto mb-4')} />
            <h4 className={cn(theme.textPrimary, 'text-lg font-medium mb-2')}>
              {selectedFilter === 'all' ? 'No insights yet' : `No ${selectedFilter} insights`}
            </h4>
            <p className={theme.textMuted}>
              {selectedFilter === 'all' 
                ? 'Add more transactions to get personalized spending insights'
                : `No ${selectedFilter} insights available for this period`
              }
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {insights.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {insights.filter(i => i.type === 'alert').length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Alerts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {insights.filter(i => i.type === 'trend').length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Trends</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {insights.filter(i => i.type === 'achievement').length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Achievements</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpendingInsightsWidget;