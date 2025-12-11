import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, FileText, Calendar, DollarSign } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Modal from './Modal';

interface ImportSummary {
  totalTransactions: number;
  newTransactions: number;
  duplicateTransactions: number;
  skippedTransactions: number;
  importedTransactions: Transaction[];
  duplicates: Transaction[];
}

interface DuplicateConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (forceImport: boolean) => void;
  summary: ImportSummary;
  fileName?: string;
}

const DuplicateConfirmationDialog: React.FC<DuplicateConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  summary,
  fileName
}) => {
  const theme = useThemeClasses();

  // Don't render if no summary data
  if (!summary) {
    return null;
  }

  const handleImportNew = () => {
    onConfirm(false); // Import only new transactions
  };

  const handleForceImport = () => {
    onConfirm(true); // Force import all transactions
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Duplicate Transactions Detected" size="lg">
      <div className="space-y-6">
        {/* Alert Header */}
        <div className={cn(theme.bgYellow, "p-4 rounded-lg border")}>
          <div className="flex items-start space-x-3">
            <AlertTriangle className={cn(theme.textYellow, "w-6 h-6 mt-0.5")} />
            <div>
              <h3 className={cn(theme.textYellow, "font-semibold mb-1")}>
                Duplicate Transactions Found
              </h3>
              <p className={cn(theme.textYellowSecondary, "text-sm")}>
                {fileName && `The file "${fileName}" contains `}
                {summary.duplicateTransactions || 0} transaction{(summary.duplicateTransactions || 0) > 1 ? 's' : ''} that 
                {(summary.duplicateTransactions || 0) > 1 ? ' appear' : ' appears'} to already exist in your account.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={cn(theme.card, "text-center p-4")}>
            <FileText className={cn(theme.textPrimary, "w-6 h-6 mx-auto mb-2")} />
            <div className={cn(theme.textPrimary, "text-2xl font-bold")}>{summary.totalTransactions || 0}</div>
            <div className={cn(theme.textMuted, "text-sm")}>Total in File</div>
          </div>
          
          <div className={cn(theme.card, "text-center p-4")}>
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <div className={cn(theme.textPrimary, "text-2xl font-bold text-green-600 dark:text-green-400")}>
              {summary.newTransactions || 0}
            </div>
            <div className={cn(theme.textMuted, "text-sm")}>New Transactions</div>
          </div>
          
          <div className={cn(theme.card, "text-center p-4")}>
            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-600 dark:text-red-400" />
            <div className={cn(theme.textPrimary, "text-2xl font-bold text-red-600 dark:text-red-400")}>
              {summary.duplicateTransactions || 0}
            </div>
            <div className={cn(theme.textMuted, "text-sm")}>Duplicates</div>
          </div>
          
          <div className={cn(theme.card, "text-center p-4")}>
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
            <div className={cn(theme.textPrimary, "text-2xl font-bold text-yellow-600 dark:text-yellow-400")}>
              {summary.skippedTransactions || 0}
            </div>
            <div className={cn(theme.textMuted, "text-sm")}>Internal Duplicates</div>
          </div>
        </div>

        {/* Duplicate Transactions List */}
        {summary.duplicates && summary.duplicates.length > 0 && (
          <div>
            <h4 className={cn(theme.textPrimary, "font-semibold mb-3")}>
              Duplicate Transactions Found:
            </h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
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
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={cn(
                          "px-2 py-1 text-xs rounded-full",
                          transaction.type === 'income' 
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                            : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                        )}>
                          {transaction.type}
                        </span>
                        <span className={cn(theme.textMuted, "text-xs")}>
                          {transaction.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
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
                </div>
              ))}
              {(summary.duplicates?.length || 0) > 10 && (
                <div className={cn(theme.textMuted, "text-center text-sm py-2")}>
                  ... and {(summary.duplicates?.length || 0) - 10} more duplicates
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className={cn(theme.bgBlue, "p-4 rounded-lg border")}>
          <h4 className={cn(theme.textBlue, "font-semibold mb-2")}>💡 Recommendations:</h4>
          <ul className={cn(theme.textBlueSecondary, "text-sm space-y-1")}>
            <li>• <strong>Import New Only:</strong> Recommended option - imports only the {summary.newTransactions || 0} new transactions</li>
            <li>• <strong>Force Import All:</strong> Imports all transactions, including duplicates (not recommended)</li>
            <li>• <strong>Cancel:</strong> Cancel the import and review your existing transactions first</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className={cn(theme.btnSecondary, "flex-1")}
          >
            Cancel Import
          </button>
          
          {(summary.newTransactions || 0) > 0 && (
            <button
              onClick={handleImportNew}
              className={cn(theme.btnPrimary, "flex-1")}
            >
              Import {summary.newTransactions || 0} New Transaction{(summary.newTransactions || 0) > 1 ? 's' : ''}
            </button>
          )}
          
          <button
            onClick={handleForceImport}
            className={cn(
              "flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
            )}
          >
            Force Import All ({summary.totalTransactions || 0})
          </button>
        </div>

        {/* Warning for Force Import */}
        <div className={cn(theme.bgRed, "p-3 rounded-lg border")}>
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