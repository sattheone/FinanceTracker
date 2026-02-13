import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, FileText, Calendar, DollarSign, ArrowDown, Check, X, Copy } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Modal from './Modal';
import { DuplicatePair, InternalDuplicate } from '../../services/duplicateDetectionService';

interface ImportSummary {
  totalTransactions: number;
  newTransactions: number;
  duplicateTransactions: number;
  skippedTransactions: number;
  importedTransactions: Transaction[];
  duplicates: Transaction[];
  duplicatePairs?: DuplicatePair[];
  internalDuplicates?: InternalDuplicate[];
}

interface DuplicateConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (forceImport: boolean, selectedDuplicates?: Transaction[]) => void;
  summary: ImportSummary;
  fileName?: string;
}

type DuplicateDecision = 'pending' | 'import' | 'dismiss';

// Transaction card component for paired display
const TransactionCard = ({ 
  transaction, 
  label, 
  borderColor = 'border-gray-300 dark:border-gray-600',
  bgColor = '',
  theme
}: { 
  transaction: Transaction; 
  label: string; 
  borderColor?: string;
  bgColor?: string;
  theme: ReturnType<typeof useThemeClasses>;
}) => (
  <div className={cn(theme.card, bgColor, `border-l-4 ${borderColor} h-[70px] px-2.5 py-2 overflow-hidden`)}>
    <div className="h-full flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn(theme.textMuted, "text-[10px] font-semibold uppercase tracking-wide truncate")}>{label}</span>
          <span className={cn(
            "px-1.5 py-0.5 text-[10px] rounded-full leading-none",
            transaction.type === 'income'
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          )}>
            {transaction.type}
          </span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
          <span className={cn(theme.textSecondary, "text-[11px] shrink-0")}>{formatDate(transaction.date)}</span>
          <span className={cn(theme.textPrimary, "text-xs font-medium truncate")}>
            {transaction.description}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-1">
          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
          <span className={cn(
            "font-semibold text-sm",
            transaction.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {formatCurrency(transaction.amount)}
          </span>
        </div>
        <span className={cn(theme.textMuted, "text-[10px] truncate max-w-[120px] inline-block")}>
          {transaction.category}
        </span>
      </div>
    </div>
  </div>
);

const DuplicateConfirmationDialog: React.FC<DuplicateConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  summary,
  fileName
}) => {
  const theme = useThemeClasses();
  
  // Track individual decisions for each duplicate pair
  const [pairDecisions, setPairDecisions] = useState<Map<number, DuplicateDecision>>(new Map());
  const [internalDecisions, setInternalDecisions] = useState<Map<number, DuplicateDecision>>(new Map());

  // Don't render if no summary data
  if (!summary) {
    return null;
  }

  const duplicatePairs = summary.duplicatePairs || [];
  const internalDuplicates = summary.internalDuplicates || [];

  const handlePairDecision = (index: number, decision: DuplicateDecision) => {
    setPairDecisions(prev => new Map(prev).set(index, decision));
  };

  const handleInternalDecision = (index: number, decision: DuplicateDecision) => {
    setInternalDecisions(prev => new Map(prev).set(index, decision));
  };

  const handleImportNew = () => {
    // Collect selected duplicates to import
    const selectedDuplicates: Transaction[] = [];
    
    duplicatePairs.forEach((pair, index) => {
      if (pairDecisions.get(index) === 'import') {
        selectedDuplicates.push(pair.fileTransaction);
      }
    });
    
    internalDuplicates.forEach((dup, index) => {
      if (internalDecisions.get(index) === 'import') {
        selectedDuplicates.push(dup.transaction);
      }
    });
    
    onConfirm(false, selectedDuplicates);
  };

  const handleForceImport = () => {
    onConfirm(true);
  };

  // Count decisions
  const importCount = Array.from(pairDecisions.values()).filter(d => d === 'import').length +
                      Array.from(internalDecisions.values()).filter(d => d === 'import').length;

  const footer = (
    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
      <button
        onClick={onClose}
        className={cn(theme.btnSecondary, "sm:w-auto")}
      >
        Cancel Import
      </button>

      <button
        onClick={handleImportNew}
        className={cn(theme.btnPrimary, "sm:w-auto")}
      >
        Import {(summary.newTransactions || 0) + importCount} Transaction{((summary.newTransactions || 0) + importCount) > 1 ? 's' : ''}
      </button>

      <button
        onClick={handleForceImport}
        className={cn(
          "sm:w-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
        )}
      >
        Force Import All ({summary.totalTransactions || 0})
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Duplicate Transactions Detected" size="xl" footer={footer}>
      <div className="space-y-4">
        {/* Alert Header */}
        <div className={cn(theme.bgYellow, "p-3 rounded-lg border")}>
          <div className="flex items-start space-x-3">
            <AlertTriangle className={cn(theme.textYellow, "w-5 h-5 mt-0.5")} />
            <div>
              <h3 className={cn(theme.textYellow, "font-semibold mb-1")}>
                Duplicate Transactions Found
              </h3>
              <p className={cn(theme.textYellowSecondary, "text-sm")}>
                {fileName && `The file "${fileName}" contains `}
                {summary.duplicateTransactions || 0} transaction{(summary.duplicateTransactions || 0) > 1 ? 's' : ''} that 
                {(summary.duplicateTransactions || 0) > 1 ? ' appear' : ' appears'} to already exist in your account.
                {(summary.skippedTransactions || 0) > 0 && (
                  <span> Additionally, {summary.skippedTransactions} transaction{summary.skippedTransactions > 1 ? 's are' : ' is'} duplicated within the file itself.</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className={cn(theme.card, "text-center p-2.5 border")}>
            <FileText className={cn(theme.textPrimary, "w-4 h-4 mx-auto mb-1")} />
            <div className={cn(theme.textPrimary, "text-lg font-bold leading-5")}>{summary.totalTransactions || 0}</div>
            <div className={cn(theme.textMuted, "text-xs")}>Total in File</div>
          </div>
          
          <div className={cn(theme.card, "text-center p-2.5 border")}>
            <CheckCircle className="w-4 h-4 mx-auto mb-1 text-green-600 dark:text-green-400" />
            <div className={cn(theme.textPrimary, "text-lg font-bold leading-5 text-green-600 dark:text-green-400")}>
              {summary.newTransactions || 0}
            </div>
            <div className={cn(theme.textMuted, "text-xs")}>New</div>
          </div>
          
          <div className={cn(theme.card, "text-center p-2.5 border")}>
            <XCircle className="w-4 h-4 mx-auto mb-1 text-red-600 dark:text-red-400" />
            <div className={cn(theme.textPrimary, "text-lg font-bold leading-5 text-red-600 dark:text-red-400")}>
              {summary.duplicateTransactions || 0}
            </div>
            <div className={cn(theme.textMuted, "text-xs")}>Match Existing</div>
          </div>
          
          <div className={cn(theme.card, "text-center p-2.5 border")}>
            <Copy className="w-4 h-4 mx-auto mb-1 text-yellow-600 dark:text-yellow-400" />
            <div className={cn(theme.textPrimary, "text-lg font-bold leading-5 text-yellow-600 dark:text-yellow-400")}>
              {summary.skippedTransactions || 0}
            </div>
            <div className={cn(theme.textMuted, "text-xs")}>In-file Duplicates</div>
          </div>
        </div>

        {/* Duplicate Pairs - File Transaction vs Existing Transaction */}
        {duplicatePairs.length > 0 && (
          <div>
            <h4 className={cn(theme.textPrimary, "font-semibold mb-3 flex items-center")}>
              <XCircle className="w-5 h-5 mr-2 text-red-500" />
              Transactions Matching Existing Records ({duplicatePairs.length})
            </h4>
            <p className={cn(theme.textMuted, "text-xs sm:text-sm mb-3")}>
              These transactions from your file appear to already exist in your account. Review each pair and decide whether to import or dismiss.
            </p>
            <div className="max-h-[48vh] overflow-y-auto space-y-2 pr-1">
              {duplicatePairs.map((pair, index) => {
                const decision = pairDecisions.get(index) || 'pending';
                return (
                  <div 
                    key={index} 
                    className={cn(
                      theme.card, 
                      "p-2.5 rounded-lg border",
                      decision === 'import' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                      decision === 'dismiss' ? 'border-gray-300 dark:border-gray-600 opacity-50' :
                      'border-gray-200 dark:border-gray-700'
                    )}
                  >
                    {/* Confidence Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full font-medium",
                        pair.confidence >= 98 ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200" :
                        pair.confidence >= 95 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200" :
                        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                      )}>
                        {pair.confidence.toFixed(0)}% Match
                      </span>
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => handlePairDecision(index, decision === 'import' ? 'pending' : 'import')}
                          className={cn(
                            "flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                            decision === 'import' 
                              ? "bg-green-600 text-white"
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                          )}
                        >
                          <Check className="w-4 h-4" />
                          <span>Import</span>
                        </button>
                        <button
                          onClick={() => handlePairDecision(index, decision === 'dismiss' ? 'pending' : 'dismiss')}
                          className={cn(
                            "flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                            decision === 'dismiss' 
                              ? "bg-gray-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          )}
                        >
                          <X className="w-4 h-4" />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Transaction Pair */}
                    <div className="space-y-1.5">
                      <TransactionCard 
                        transaction={pair.fileTransaction} 
                        label="📄 From Import File"
                        borderColor="border-blue-400"
                        bgColor="bg-blue-50/50 dark:bg-blue-900/10"
                        theme={theme}
                      />
                      
                      <div className="flex justify-center py-0.5">
                        <ArrowDown className={cn(theme.textMuted, "w-4 h-4")} />
                      </div>
                      
                      <TransactionCard 
                        transaction={pair.existingTransaction} 
                        label="💾 Existing in Account"
                        borderColor="border-purple-400"
                        bgColor="bg-purple-50/50 dark:bg-purple-900/10"
                        theme={theme}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Internal Duplicates - Within the import file */}
        {internalDuplicates.length > 0 && (
          <div>
            <h4 className={cn(theme.textPrimary, "font-semibold mb-3 flex items-center")}>
              <Copy className="w-5 h-5 mr-2 text-yellow-500" />
              Duplicates Within Import File ({internalDuplicates.length})
            </h4>
            <p className={cn(theme.textMuted, "text-xs sm:text-sm mb-3")}>
              These transactions appear multiple times within your import file. The first occurrence will be imported automatically.
            </p>
            <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1">
              {internalDuplicates.map((dup, index) => {
                const decision = internalDecisions.get(index) || 'pending';
                return (
                  <div 
                    key={index} 
                    className={cn(
                      theme.card, 
                      "p-2.5 rounded-lg border",
                      decision === 'import' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                      decision === 'dismiss' ? 'border-gray-300 dark:border-gray-600 opacity-50' :
                      'border-yellow-200 dark:border-yellow-700'
                    )}
                  >
                    {/* Confidence Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                        {dup.confidence.toFixed(0)}% Similar
                      </span>
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => handleInternalDecision(index, decision === 'import' ? 'pending' : 'import')}
                          className={cn(
                            "flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                            decision === 'import' 
                              ? "bg-green-600 text-white"
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                          )}
                        >
                          <Check className="w-4 h-4" />
                          <span>Import Anyway</span>
                        </button>
                        <button
                          onClick={() => handleInternalDecision(index, decision === 'dismiss' ? 'pending' : 'dismiss')}
                          className={cn(
                            "flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                            decision === 'dismiss' 
                              ? "bg-gray-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          )}
                        >
                          <X className="w-4 h-4" />
                          <span>Skip</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Transaction Pair */}
                    <div className="space-y-1.5">
                      <TransactionCard 
                        transaction={dup.transaction} 
                        label="📄 Duplicate Entry"
                        borderColor="border-yellow-400"
                        bgColor="bg-yellow-50/50 dark:bg-yellow-900/10"
                        theme={theme}
                      />
                      
                      <div className="flex justify-center">
                        <span className={cn(theme.textMuted, "text-xs")}>duplicates ↓</span>
                      </div>
                      
                      <TransactionCard 
                        transaction={dup.duplicateOf} 
                        label="✓ Will Be Imported"
                        borderColor="border-green-400"
                        bgColor="bg-green-50/50 dark:bg-green-900/10"
                        theme={theme}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fallback: Show simple list if no paired data available */}
        {duplicatePairs.length === 0 && internalDuplicates.length === 0 && summary.duplicates && summary.duplicates.length > 0 && (
          <div>
            <h4 className={cn(theme.textPrimary, "font-semibold mb-3")}>
              Duplicate Transactions Found:
            </h4>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {(summary.duplicates || []).slice(0, 10).map((transaction, index) => (
                <div key={index} className={cn(theme.card, "p-3 border-l-4 border-red-400")}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={cn(theme.textSecondary, "text-sm")}>
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                      <p className={cn(theme.textPrimary, "font-medium mt-1")}>
                        {transaction.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        theme.textPrimary,
                        "font-semibold",
                        transaction.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import Summary */}
        {importCount > 0 && (
          <div className={cn("p-2.5 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700")}>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                You've selected to import <strong>{importCount}</strong> additional transaction{importCount > 1 ? 's' : ''} from the duplicates.
              </p>
            </div>
          </div>
        )}

        {/* Warning for Force Import */}
        <div className={cn(theme.bgRed, "p-2.5 rounded-lg border")}>
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
            <p className={cn(theme.textRedSecondary, "text-xs")}>
              <strong>Warning:</strong> Force importing will create duplicate transactions in your account. 
              This may affect your balance calculations and reports. Only use this option if you're sure 
              the transactions are actually different.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DuplicateConfirmationDialog;