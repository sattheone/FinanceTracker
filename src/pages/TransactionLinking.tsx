import React, { useState } from 'react';
import { Link2, Settings, BarChart3, Bell, Target, Brain, Zap } from 'lucide-react';
import { useThemeClasses, cn } from '../hooks/useThemeClasses';
import TransactionLinkingManager from '../components/transactions/TransactionLinkingManager';
import LinkingRulesManager from '../components/transactions/LinkingRulesManager';
import LinkingInsightsWidget from '../components/dashboard/LinkingInsightsWidget';

const TransactionLinking: React.FC = () => {
  const theme = useThemeClasses();
  const [activeTab, setActiveTab] = useState<'overview' | 'manager' | 'rules' | 'insights'>('overview');

  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: Link2, 
      description: 'Transaction linking dashboard and insights' 
    },
    { 
      id: 'manager', 
      label: 'Link Manager', 
      icon: Target, 
      description: 'Manage individual transaction links' 
    },
    { 
      id: 'rules', 
      label: 'Auto Rules', 
      icon: Settings, 
      description: 'Create and manage automatic linking rules' 
    },
    { 
      id: 'insights', 
      label: 'Analytics', 
      icon: BarChart3, 
      description: 'Advanced linking analytics and reports' 
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className={cn(theme.card, 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-0')}>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
            <Link2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className={cn(theme.heading1, 'mb-2')}>Transaction Linking System</h1>
            <p className={cn(theme.textSecondary, 'text-lg')}>
              Intelligently connect your transactions to financial goals, insurance policies, and investment assets
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-4">
              <Brain className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className={cn(theme.textPrimary, 'font-semibold mb-2')}>Smart Auto-Linking</h3>
            <p className={cn(theme.textMuted, 'text-sm')}>
              AI-powered rules automatically link transactions to relevant entities based on patterns and keywords
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg mx-auto mb-4">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={cn(theme.textPrimary, 'font-semibold mb-2')}>Goal Tracking</h3>
            <p className={cn(theme.textMuted, 'text-sm')}>
              Real-time progress updates for your financial goals with milestone notifications and projections
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className={cn(theme.textPrimary, 'font-semibold mb-2')}>Advanced Analytics</h3>
            <p className={cn(theme.textMuted, 'text-sm')}>
              Hierarchical views, split allocations, and comprehensive reports on your financial entity relationships
            </p>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={theme.card}>
          <h3 className={cn(theme.heading3, 'mb-4 flex items-center')}>
            <Zap className="w-5 h-5 mr-2 text-yellow-600" />
            Key Features
          </h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className={cn(theme.textPrimary, 'font-medium')}>Rules-Based Auto-Linking</h4>
                <p className={cn(theme.textMuted, 'text-sm')}>
                  Create custom rules like "₹10,000 SIP → Retirement Goal" for automatic transaction categorization
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <h4 className={cn(theme.textPrimary, 'font-medium')}>Multi-Entity Splits</h4>
                <p className={cn(theme.textMuted, 'text-sm')}>
                  Split transactions across multiple entities (e.g., 50% to Emergency Fund, 50% to Vacation Goal)
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <h4 className={cn(theme.textPrimary, 'font-medium')}>Insurance Integration</h4>
                <p className={cn(theme.textMuted, 'text-sm')}>
                  Link insurance policies and maturity amounts to relevant financial goals automatically
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <h4 className={cn(theme.textPrimary, 'font-medium')}>Real-Time Progress</h4>
                <p className={cn(theme.textMuted, 'text-sm')}>
                  Live updates on goal funding, milestone achievements, and projected completion dates
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={theme.card}>
          <h3 className={cn(theme.heading3, 'mb-4 flex items-center')}>
            <Bell className="w-5 h-5 mr-2 text-orange-600" />
            Smart Notifications
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className={cn(theme.textPrimary, 'text-sm font-medium')}>Milestone Achieved</span>
              </div>
              <p className={cn(theme.textMuted, 'text-xs')}>Emergency Fund reached 75% of target amount</p>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className={cn(theme.textPrimary, 'text-sm font-medium')}>Auto-Link Suggestion</span>
              </div>
              <p className={cn(theme.textMuted, 'text-xs')}>₹5,000 FD transaction can be linked to Education Goal</p>
            </div>
            
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className={cn(theme.textPrimary, 'text-sm font-medium')}>Rule Triggered</span>
              </div>
              <p className={cn(theme.textMuted, 'text-xs')}>SIP transaction automatically linked to Retirement Goal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading3, 'mb-4')}>Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('manager')}
            className={cn(
              'p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            )}
          >
            <Target className="w-6 h-6 text-blue-600 mb-2" />
            <h4 className={cn(theme.textPrimary, 'font-medium mb-1')}>Manage Links</h4>
            <p className={cn(theme.textMuted, 'text-sm')}>Review and modify transaction-entity connections</p>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={cn(
              'p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            )}
          >
            <Settings className="w-6 h-6 text-green-600 mb-2" />
            <h4 className={cn(theme.textPrimary, 'font-medium mb-1')}>Create Rules</h4>
            <p className={cn(theme.textMuted, 'text-sm')}>Set up automatic linking rules for future transactions</p>
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={cn(
              'p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            )}
          >
            <BarChart3 className="w-6 h-6 text-purple-600 mb-2" />
            <h4 className={cn(theme.textPrimary, 'font-medium mb-1')}>View Analytics</h4>
            <p className={cn(theme.textMuted, 'text-sm')}>Analyze linking patterns and entity performance</p>
          </button>
        </div>
      </div>

      {/* Insights Widget */}
      <LinkingInsightsWidget />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={theme.heading1}>Transaction Linking</h1>
        <p className={theme.textSecondary}>
          Connect transactions to financial entities for better tracking and insights
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            <div className="text-left">
              <div>{tab.label}</div>
              <div className={cn(
                'text-xs opacity-75',
                activeTab === tab.id ? 'text-blue-500' : 'text-gray-500'
              )}>
                {tab.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'manager' && <TransactionLinkingManager mode="overview" />}
        {activeTab === 'rules' && <LinkingRulesManager />}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className={theme.card}>
              <h2 className={cn(theme.heading2, 'mb-4')}>Advanced Analytics</h2>
              <p className={theme.textMuted}>
                Comprehensive analytics and insights for your transaction linking patterns.
              </p>
            </div>
            <LinkingInsightsWidget />
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionLinking;