import React, { useState, useMemo } from 'react';
import { X, Link2, Search, CheckCircle, Circle, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Goal } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../common/Modal';
import { useData } from '../../contexts/DataContext';

interface SIPLinkingModalProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onLinked: (updatedGoal: Goal) => void;
}

const SIPLinkingModal: React.FC<SIPLinkingModalProps> = ({
  goal,
  isOpen,
  onClose,
  onLinked
}) => {
  const theme = useThemeClasses();
  const { assets, updateGoal } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSIPs, setSelectedSIPs] = useState<Set<string>>(
    new Set(goal.linkedSIPAssets || [])
  );

  // Filter for SIP assets (mutual funds and EPF with SIP enabled)
  const availableSIPs = useMemo(() => {
    return assets.filter(asset =>
      asset.isSIP &&
      (asset.category === 'mutual_funds' || asset.category === 'epf')
    );
  }, [assets]);

  // Filter SIPs based on search
  const filteredSIPs = useMemo(() => {
    if (!searchTerm) return availableSIPs;

    const search = searchTerm.toLowerCase();
    return availableSIPs.filter(sip =>
      sip.name.toLowerCase().includes(search) ||
      sip.category.toLowerCase().includes(search)
    );
  }, [availableSIPs, searchTerm]);

  // Get suggested SIPs for this goal (based on category match)
  const suggestedSIPs = useMemo(() => {
    // Suggest mutual funds for education/retirement goals
    if (goal.category === 'education' || goal.category === 'retirement') {
      return availableSIPs.filter(sip => sip.category === 'mutual_funds').slice(0, 3);
    }
    // For other goals, suggest any available SIPs
    return availableSIPs.slice(0, 3);
  }, [goal.category, availableSIPs]);

  const toggleSIP = (sipId: string) => {
    const newSelected = new Set(selectedSIPs);
    if (newSelected.has(sipId)) {
      newSelected.delete(sipId);
    } else {
      newSelected.add(sipId);
    }
    setSelectedSIPs(newSelected);
  };

  const handleSave = async () => {
    try {
      const updatedGoal: Goal = {
        ...goal,
        linkedSIPAssets: Array.from(selectedSIPs)
      };

      await updateGoal(goal.id, updatedGoal);
      onLinked(updatedGoal);
      onClose();
    } catch (error) {
      console.error('Error linking SIPs to goal:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mutual_funds': return '📊';
      case 'epf': return '🏛️';
      default: return '💰';
    }
  };

  const totalLinkedAmount = Array.from(selectedSIPs)
    .map(id => availableSIPs.find(sip => sip.id === id))
    .filter(Boolean)
    .reduce((sum, sip) => sum + (sip?.sipAmount || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link SIPs to Goal"
      size="lg"
    >
      <div className="space-y-6">
        {/* Goal Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🎯</span>
            </div>
            <div>
              <h3 className={cn(theme.textPrimary, 'font-semibold')}>{goal.name}</h3>
              <p className={cn(theme.textSecondary, 'text-sm')}>
                Target: {formatCurrency(goal.targetAmount)} by {new Date(goal.targetDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search SIPs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"
          />
        </div>

        {/* Suggested SIPs */}
        {suggestedSIPs.length > 0 && (
          <div>
            <h4 className={cn(theme.textPrimary, 'font-medium mb-3 flex items-center')}>
              <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
              Suggested SIPs for {goal.category} goal
            </h4>
            <div className="space-y-2">
              {suggestedSIPs.map(sip => (
                <div
                  key={sip.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedSIPs.has(sip.id)
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                  onClick={() => toggleSIP(sip.id)}
                >
                  <div className="flex items-center space-x-3">
                    {selectedSIPs.has(sip.id) ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className={cn(theme.textPrimary, 'font-medium')}>{sip.name}</p>
                      <p className={cn(theme.textMuted, 'text-sm')}>{sip.category === 'mutual_funds' ? 'Mutual Fund' : 'EPF'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(theme.textPrimary, 'font-semibold')}>
                      {formatCurrency(sip.sipAmount || 0)}
                    </p>
                    <p className={cn(theme.textMuted, 'text-xs flex items-center justify-end')}>
                      <span className="mr-1">{getCategoryIcon(sip.category)}</span>
                      per month
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Available SIPs */}
        <div>
          <h4 className={cn(theme.textPrimary, 'font-medium mb-3')}>
            All Available SIPs ({filteredSIPs.length})
          </h4>

          {filteredSIPs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Link2 className="h-12 w-12 mx-auto" />
              </div>
              <h3 className={cn(theme.textPrimary, 'text-lg font-medium mb-2')}>
                {searchTerm ? 'No SIPs found' : 'No SIPs available'}
              </h3>
              <p className={cn(theme.textSecondary, 'text-sm mb-4')}>
                {searchTerm
                  ? 'Try a different search term'
                  : 'Create SIP assets (Mutual Funds or EPF with SIP enabled) to link them to your goals'
                }
              </p>
              <button
                onClick={() => {
                  onClose();
                  // Navigate to assets page
                  window.location.href = '/assets';
                }}
                className={cn(theme.btnPrimary, 'text-sm')}
              >
                Create SIP Asset
              </button>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredSIPs.map(sip => (
                <div
                  key={sip.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedSIPs.has(sip.id)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                  onClick={() => toggleSIP(sip.id)}
                >
                  <div className="flex items-center space-x-3">
                    {selectedSIPs.has(sip.id) ? (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className={cn(theme.textPrimary, 'font-medium')}>{sip.name}</p>
                      <p className={cn(theme.textMuted, 'text-sm')}>{sip.category === 'mutual_funds' ? 'Mutual Fund SIP' : 'EPF Contribution'}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={cn(theme.textMuted, 'text-xs')}>{getCategoryIcon(sip.category)} {sip.category === 'mutual_funds' ? 'Mutual Fund' : 'EPF'}</span>
                        {sip.sipDate && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className={cn(theme.textMuted, 'text-xs flex items-center')}>
                              <Calendar className="w-3 h-3 mr-1" />
                              {sip.sipDate}th of month
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(theme.textPrimary, 'font-semibold')}>
                      {formatCurrency(sip.sipAmount || 0)}
                    </p>
                    <p className={cn(theme.textMuted, 'text-xs')}>
                      per month
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {selectedSIPs.size > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(theme.textPrimary, 'font-medium')}>
                  {selectedSIPs.size} SIP{selectedSIPs.size !== 1 ? 's' : ''} selected
                </p>
                <p className={cn(theme.textSecondary, 'text-sm')}>
                  Total monthly contribution: {formatCurrency(totalLinkedAmount)}
                </p>
              </div>
              <div className="flex items-center space-x-1 text-green-600">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold">{formatCurrency(totalLinkedAmount)}/mo</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className={cn(theme.btnSecondary, 'flex items-center')}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>

          <button
            onClick={handleSave}
            className={cn(theme.btnPrimary, 'flex items-center')}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Link {selectedSIPs.size} SIP{selectedSIPs.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SIPLinkingModal;