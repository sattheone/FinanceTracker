import React from 'react';
import { Sparkles, X, CheckCircle } from 'lucide-react';

interface DefaultCategoryRulesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const DefaultCategoryRulesDialog: React.FC<DefaultCategoryRulesDialogProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Smart Auto-Categorization
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            We can automatically categorize your transactions using smart rules! This will save you time by recognizing common merchants and transaction patterns.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What you'll get:
            </h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span><strong>130+ smart rules</strong> for common merchants and services</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Automatic categorization of <strong>Fuel, Groceries, Food Delivery, Bills, Insurance, Investments</strong> and more</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Recognition of popular brands like <strong>Swiggy, Zomato, Amazon, Netflix, LIC, Zerodha</strong> and many others</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Fully customizable - you can <strong>edit, disable, or delete</strong> any rule anytime</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
              Examples of what will be auto-categorized:
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">🛡️ Insurance</p>
                <p>LIC, HDFC Life, SBI Life</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">⛽ Fuel</p>
                <p>Petrol, BPCL, Indian Oil</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">🍽️ Food</p>
                <p>Swiggy, Zomato, Dominos</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">🛒 Groceries</p>
                <p>BigBasket, DMart, Zepto</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">💡 Utilities</p>
                <p>BESCOM, Airtel, Jio</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">📈 Investments</p>
                <p>Groww, Zerodha, ET Money</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            You can always manage these rules later in <strong>Settings → Category Rules</strong>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors font-medium"
          >
            Not Now
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Enable Smart Rules
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefaultCategoryRulesDialog;
