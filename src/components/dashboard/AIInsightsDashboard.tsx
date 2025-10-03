import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Shield, 
  Target,
  DollarSign,
  ArrowRight,
  RefreshCw,
  MessageCircle,
  Send,
  Sparkles,
  BarChart3,
  Info
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { aiInsightsService, AIInsight, FinancialHealthScore } from '../../services/aiInsightsService';

const AIInsightsDashboard: React.FC = () => {
  const theme = useThemeClasses();
  const { transactions, goals, assets, insurance, monthlyBudget, userProfile } = useData();
  
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [healthScore, setHealthScore] = useState<FinancialHealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedInsightType, setSelectedInsightType] = useState<'all' | 'critical' | 'opportunities'>('all');

  useEffect(() => {
    generateInsights();
  }, [transactions, goals, assets, insurance, monthlyBudget]);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      console.log('🤖 Generating AI insights...');
      
      // Generate comprehensive insights
      const aiInsights = await aiInsightsService.generateComprehensiveInsights(
        transactions,
        goals,
        assets,
        insurance,
        monthlyBudget,
        userProfile
      );
      
      // Calculate financial health score
      const score = aiInsightsService.calculateFinancialHealthScore(
        transactions,
        assets,
        insurance,
        monthlyBudget,
        goals
      );
      
      setInsights(aiInsights);
      setHealthScore(score);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatQuery = async () => {
    if (!chatQuery.trim()) return;
    
    setIsChatLoading(true);
    try {
      const response = await aiInsightsService.generatePersonalizedAdvice(
        chatQuery,
        {
          _transactions: transactions,
          goals,
          assets,
          insurance,
          budget: monthlyBudget,
          _userProfile: userProfile
        }
      );
      setChatResponse(response);
    } catch (error) {
      setChatResponse('Sorry, I encountered an error while analyzing your question. Please try again.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleInsightAction = (_insight: AIInsight, action: any) => {
    console.log('Executing insight action:', action);
    // Here you would implement the actual action
    // For example, navigate to a page, create a goal, etc.
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'financial_health': return BarChart3;
      case 'goal_optimization': return Target;
      case 'investment_advice': return TrendingUp;
      case 'tax_planning': return DollarSign;
      case 'risk_assessment': return Shield;
      case 'opportunity': return Lightbulb;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  const getInsightColor = (type: string, priority: string) => {
    if (priority === 'critical') return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200';
    if (priority === 'high') return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200';
    
    switch (type) {
      case 'opportunity': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200';
      case 'investment_advice': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200';
      case 'tax_planning': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-700 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    };

    return (
      <span className={cn('px-2 py-1 text-xs rounded-full font-medium', colors[priority as keyof typeof colors])}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const filteredInsights = insights.filter(insight => {
    if (selectedInsightType === 'critical') return insight.priority === 'critical' || insight.priority === 'high';
    if (selectedInsightType === 'opportunities') return insight.type === 'opportunity';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <div className={cn(theme.card, 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-0')}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className={cn(theme.heading3, 'flex items-center')}>
                AI Financial Insights
                <Sparkles className="w-4 h-4 ml-2 text-yellow-500" />
              </h3>
              <p className={theme.textMuted}>Powered by Google Gemini AI</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={cn(
                theme.btnSecondary,
                'flex items-center',
                showChat && 'bg-purple-100 text-purple-700'
              )}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Ask AI
            </button>
            <button
              onClick={generateInsights}
              disabled={isLoading}
              className={cn(theme.btnPrimary, 'flex items-center')}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              {isLoading ? 'Analyzing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Financial Health Score */}
        {healthScore && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className={cn('text-4xl font-bold mb-2', getHealthScoreColor(healthScore.overall))}>
                {healthScore.overall}/100
              </div>
              <p className={theme.textPrimary}>Financial Health Score</p>
              <p className={theme.textMuted}>
                {healthScore.overall >= 80 ? 'Excellent' :
                 healthScore.overall >= 60 ? 'Good' :
                 healthScore.overall >= 40 ? 'Fair' : 'Needs Improvement'}
              </p>
            </div>
            
            <div className="space-y-2">
              {Object.entries(healthScore.breakdown).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={cn(theme.textMuted, 'text-sm capitalize')}>
                    {key.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          value >= 80 ? 'bg-green-500' :
                          value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${value}%` }}
                      ></div>
                    </div>
                    <span className={cn(theme.textPrimary, 'text-sm font-medium w-8')}>
                      {value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Chat Interface */}
      {showChat && (
        <div className={theme.card}>
          <h4 className={cn(theme.textPrimary, 'font-medium mb-4')}>Ask Your AI Financial Advisor</h4>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatQuery()}
                placeholder="Ask about your finances, investments, or goals..."
                className={cn(theme.input, 'flex-1')}
              />
              <button
                onClick={handleChatQuery}
                disabled={isChatLoading || !chatQuery.trim()}
                className={cn(theme.btnPrimary, 'flex items-center')}
              >
                {isChatLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            
            {chatResponse && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-start space-x-2">
                  <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                      {chatResponse}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insights Filter */}
      <div className="flex items-center justify-between">
        <h3 className={theme.heading3}>Personalized Insights</h3>
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {[
            { id: 'all', label: 'All', count: insights.length },
            { id: 'critical', label: 'Critical', count: insights.filter(i => i.priority === 'critical' || i.priority === 'high').length },
            { id: 'opportunities', label: 'Opportunities', count: insights.filter(i => i.type === 'opportunity').length }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setSelectedInsightType(filter.id as any)}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                selectedInsightType === filter.id
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

      {/* AI Insights List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn(theme.card, 'animate-pulse')}>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredInsights.length > 0 ? (
          filteredInsights.map((insight) => {
            const Icon = getInsightIcon(insight.type);
            return (
              <div
                key={insight.id}
                className={cn(
                  'p-6 rounded-lg border transition-all duration-200 hover:shadow-lg',
                  getInsightColor(insight.type, insight.priority)
                )}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {insight.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(insight.priority)}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                      {insight.description}
                    </p>
                    
                    {/* Impact Metrics */}
                    <div className="flex items-center space-x-6 mb-4 text-sm">
                      {insight.impact.financial > 0 && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-gray-600 dark:text-gray-400">Impact:</span>
                          <span className="font-medium text-green-600">
                            ₹{insight.impact.financial.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-600 dark:text-gray-400">Timeline:</span>
                        <span className="font-medium capitalize">
                          {insight.impact.timeframe.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-600 dark:text-gray-400">Effort:</span>
                        <span className="font-medium capitalize">
                          {insight.impact.effort}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    {insight.actionable && insight.actions && insight.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {insight.actions.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleInsightAction(insight, action)}
                            className={cn(
                              'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                              insight.priority === 'critical' || insight.priority === 'high'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            )}
                          >
                            {action.label}
                            <ArrowRight className="w-4 h-4 ml-2" />
                            <span className="ml-2 text-xs opacity-75">
                              {action.estimated_time}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Brain className={cn(theme.textMuted, 'w-16 h-16 mx-auto mb-4')} />
            <h4 className={cn(theme.textPrimary, 'text-lg font-medium mb-2')}>
              {selectedInsightType === 'all' ? 'No insights available' : `No ${selectedInsightType} insights`}
            </h4>
            <p className={theme.textMuted}>
              {selectedInsightType === 'all' 
                ? 'Add more financial data to get personalized AI insights'
                : `No ${selectedInsightType} insights found for your current financial situation`
              }
            </p>
          </div>
        )}
      </div>

      {/* Quick Recommendations */}
      {healthScore && healthScore.recommendations.length > 0 && (
        <div className={theme.card}>
          <h4 className={cn(theme.textPrimary, 'font-medium mb-4 flex items-center')}>
            <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
            Quick Recommendations
          </h4>
          <div className="space-y-2">
            {healthScore.recommendations.map((rec, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsDashboard;