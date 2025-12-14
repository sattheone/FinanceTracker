import React, { useState } from 'react';
import CategoryRules from './CategoryRules';
import SIPRules from './SIPRules';
import { cn } from '../../hooks/useThemeClasses';

const RulesSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'category' | 'sip'>('category');

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('category')}
                        className={cn(
                            activeTab === 'category'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
                        )}
                    >
                        Rules
                    </button>
                    <button
                        onClick={() => setActiveTab('sip')}
                        className={cn(
                            activeTab === 'sip'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
                        )}
                    >
                        SIP Rules
                    </button>
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'category' ? <CategoryRules /> : <SIPRules />}
            </div>
        </div>
    );
};

export default RulesSettings;
