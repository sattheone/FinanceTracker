import React, { useState } from 'react';
import { Trash2, ToggleLeft, ToggleRight, Plus, Edit2, Calendar, Target } from 'lucide-react';
import { SIPRule } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import SIPRuleCreationDialog from './SIPRuleCreationDialog';

const SIPRules: React.FC = () => {
    const theme = useThemeClasses();
    const { sipRules, deleteSIPRule, updateSIPRule, addSIPRule, assets } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingRule, setEditingRule] = useState<SIPRule | null>(null);

    const getAssetName = (sipId: string) => {
        const asset = assets.find(a => a.id === sipId);
        return asset ? asset.name : 'Unknown SIP';
    };

    const filteredRules = (sipRules || []).filter(rule =>
        rule.descriptionPattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getAssetName(rule.sipId).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleActive = (rule: SIPRule) => {
        updateSIPRule(rule.id, { isActive: !rule.isActive });
    };

    const handleDelete = (ruleId: string) => {
        if (window.confirm('Are you sure you want to delete this SIP rule?')) {
            deleteSIPRule(ruleId);
        }
    };

    const handleEdit = (rule: SIPRule) => {
        setEditingRule(rule);
        setShowAddDialog(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={cn(theme.heading2, 'mb-2')}>SIP Rules</h2>
                    <p className={theme.textSecondary}>
                        Auto-link transactions to SIP investments
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingRule(null);
                        setShowAddDialog(true);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add SIP Rule</span>
                </button>
            </div>

            {/* Search */}
            <div>
                <input
                    type="text"
                    placeholder="Search SIP rules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(theme.input, 'w-full md:w-96')}
                />
            </div>

            {/* Rules Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                {filteredRules.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                        <Target className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className={cn(theme.heading3, 'mb-2')}>No SIP Rules Found</h3>
                        <p className={theme.textSecondary}>
                            Create rules to automatically track your SIP investments from imported transactions.
                        </p>
                    </div>
                ) : (
                    filteredRules.map((rule) => (
                        <div
                            key={rule.id}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                                        {getAssetName(rule.sipId)}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Matches: "{rule.descriptionPattern}" ({rule.matchType})
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleToggleActive(rule)}
                                        title={rule.isActive ? "Deactivate" : "Activate"}
                                        className={rule.isActive ? "text-green-500" : "text-gray-400"}
                                    >
                                        {rule.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(rule)}
                                        className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rule.id)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">Amount</span>
                                    <span className="font-medium">
                                        ₹{rule.amount} ± {rule.amountTolerance}%
                                    </span>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">Date Window</span>
                                    <span className="font-medium flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {rule.expectedDate
                                            ? `${rule.expectedDate}${getOrdinal(rule.expectedDate)} ± ${rule.dateTolerance} days`
                                            : 'Any Date'}
                                    </span>
                                </div>
                            </div>

                            {(rule.matchCount > 0) && (
                                <div className="mt-3 text-xs text-gray-500 text-right">
                                    Matched {rule.matchCount} times • Last: {new Date(rule.lastUsed!).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Dialog */}
            {showAddDialog && (
                <SIPRuleCreationDialog
                    isOpen={showAddDialog}
                    onClose={() => {
                        setShowAddDialog(false);
                        setEditingRule(null);
                    }}
                    assets={assets}
                    initialRule={editingRule}
                    onCreateRule={(rule) => {
                        addSIPRule(rule);
                        setShowAddDialog(false);
                        setEditingRule(null);
                    }}
                    onUpdateRule={(id, rule) => {
                        updateSIPRule(id, rule);
                        setShowAddDialog(false);
                        setEditingRule(null);
                    }}
                />
            )}
        </div>
    );
};

// Helper for date ordinal
const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

export default SIPRules;
