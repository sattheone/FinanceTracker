import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { SIPRule, Transaction, Asset } from '../../types';

import SidePanel from '../common/SidePanel';

interface SIPRuleCreationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction?: Transaction; // Optional transaction to pre-fill from
    assets: Asset[];
    initialRule?: SIPRule | null;
    onCreateRule: (rule: Omit<SIPRule, 'id'>) => void;
    onUpdateRule: (id: string, rule: Partial<SIPRule>) => void;
}

const SIPRuleCreationDialog: React.FC<SIPRuleCreationDialogProps> = ({
    isOpen,
    onClose,
    transaction,
    assets,
    initialRule,
    onCreateRule,
    onUpdateRule
}) => {
    const theme = useThemeClasses();
    const sipAssets = assets.filter(a => a.isSIP);

    const [formData, setFormData] = useState<{
        sipId: string;
        amount: number;
        amountTolerance: number;
        descriptionPattern: string;
        matchType: SIPRule['matchType'];
        expectedDate?: number;
        dateTolerance?: number;
        isActive: boolean;
        priority: number;
    }>({
        sipId: '',
        amount: 0,
        amountTolerance: 5,
        descriptionPattern: '',
        matchType: 'contains',
        expectedDate: 1,
        dateTolerance: 3,
        isActive: true,
        priority: 0
    });

    useEffect(() => {
        if (initialRule) {
            setFormData({
                sipId: initialRule.sipId,
                amount: initialRule.amount,
                amountTolerance: initialRule.amountTolerance,
                descriptionPattern: initialRule.descriptionPattern,
                matchType: initialRule.matchType,
                expectedDate: initialRule.expectedDate,
                dateTolerance: initialRule.dateTolerance,
                isActive: initialRule.isActive,
                priority: initialRule.priority || 0
            });
        } else if (transaction) {
            // Pre-fill from transaction
            const date = new Date(transaction.date);
            setFormData(prev => ({
                ...prev,
                amount: transaction.amount,
                descriptionPattern: transaction.description,
                expectedDate: date.getDate(),
                matchType: 'contains'
            }));
        }
    }, [initialRule, transaction]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.sipId) {
            alert('Please select a SIP Asset to link');
            return;
        }

        const ruleData = {
            ...formData,
            matchCount: initialRule?.matchCount || 0,
            lastUsed: initialRule?.lastUsed
        };

        if (initialRule) {
            onUpdateRule(initialRule.id, ruleData);
        } else {
            onCreateRule(ruleData);
        }
    };

    return (

        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={initialRule ? 'Edit SIP Rule' : 'Create SIP Rule'}
            size="lg"
            footer={
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className={theme.btnSecondary}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={theme.btnPrimary}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {initialRule ? 'Update Rule' : 'Create Rule'}
                    </button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Linked SIP */}
                <div>
                    <label className={theme.label}>Link to SIP Asset</label>
                    <select
                        value={formData.sipId}
                        onChange={(e) => setFormData({ ...formData, sipId: e.target.value })}
                        className={theme.input}
                        required
                    >
                        <option value="">Select SIP Investment...</option>
                        {sipAssets.map(asset => (
                            <option key={asset.id} value={asset.id}>
                                {asset.name} (Current SIP: ₹{asset.sipAmount})
                            </option>
                        ))}
                    </select>
                    {sipAssets.length === 0 && (
                        <p className="text-sm text-red-500 mt-1">
                            No SIP Assets found. Please mark a Mutual Fund as "SIP" in Assets page first.
                        </p>
                    )}
                </div>

                {/* Amount Rule */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={theme.label}>SIP Amount (₹)</label>
                        <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                            className={theme.input}
                            required
                        />
                    </div>
                    <div>
                        <label className={theme.label}>Tolerance (±%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formData.amountTolerance}
                                onChange={(e) => setFormData({ ...formData, amountTolerance: Number(e.target.value) })}
                                className={theme.input}
                                min="0"
                                max="100"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Matches ₹{formData.amount * (1 - formData.amountTolerance / 100)} - ₹{formData.amount * (1 + formData.amountTolerance / 100)}
                        </p>
                    </div>
                </div>

                {/* Date Rule */}
                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={!!formData.expectedDate}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setFormData({ ...formData, expectedDate: 1, dateTolerance: 3 });
                                } else {
                                    setFormData({ ...formData, expectedDate: undefined, dateTolerance: undefined });
                                }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label className={theme.label}>Match specific date?</label>
                    </div>

                    {formData.expectedDate && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={theme.label}>Expected Date (Day of Month)</label>
                                <input
                                    type="number"
                                    value={formData.expectedDate || ''}
                                    onChange={(e) => setFormData({ ...formData, expectedDate: Number(e.target.value) })}
                                    className={theme.input}
                                    min="1"
                                    max="31"
                                    required
                                />
                            </div>
                            <div>
                                <label className={theme.label}>Window (± Days)</label>
                                <input
                                    type="number"
                                    value={formData.dateTolerance || ''}
                                    onChange={(e) => setFormData({ ...formData, dateTolerance: Number(e.target.value) })}
                                    className={theme.input}
                                    min="0"
                                    max="15"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Description Pattern */}
                <div className="space-y-2">
                    <label className={theme.label}>Description Matching</label>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-1">
                            <select
                                value={formData.matchType}
                                onChange={(e) => setFormData({ ...formData, matchType: e.target.value as any })}
                                className={cn(theme.input, 'w-full')}
                            >
                                <option value="contains">Contains</option>
                                <option value="equals">Equals</option>
                                <option value="regex">Regex</option>
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <input
                                type="text"
                                value={formData.descriptionPattern}
                                onChange={(e) => setFormData({ ...formData, descriptionPattern: e.target.value })}
                                className={cn(theme.input, 'w-full')}
                                placeholder={formData.matchType === 'regex' ? '^HDFC.*FUND$' : 'e.g. HDFC Mutual Fund'}
                                required
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        {formData.matchType === 'contains' && 'Matches if transaction description contains this text.'}
                        {formData.matchType === 'equals' && 'Matches exact transaction description only.'}
                        {formData.matchType === 'regex' && 'Advanced: Use Regular Expression for matching.'}
                    </p>
                </div>

                {/* Priority */}
                <div>
                    <label className={theme.label}>Rule Priority (Optional)</label>
                    <input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                        className={theme.input}
                        placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Higher numbers run first. Useful if multiple rules might match the same transaction.
                    </p>
                </div>
            </form>
        </SidePanel>
    );
};

export default SIPRuleCreationDialog;
