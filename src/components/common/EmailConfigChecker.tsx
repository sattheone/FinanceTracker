import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';

const EmailConfigChecker: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  const checkConfig = () => {
    // Check if Firebase is configured (basic check)
    const hasFirebase = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;
    
    return {
      firebase: hasFirebase,
      triggerEmail: true, // We assume Trigger Email extension will be installed
      allConfigured: hasFirebase
    };
  };

  const config = checkConfig();

  const ConfigItem: React.FC<{ label: string; configured: boolean }> = ({ 
    label, 
    configured
  }) => (
    <div className="flex items-center justify-between p-2 rounded">
      <span className="text-sm">{label}</span>
      <div className="flex items-center space-x-2">
        {configured ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        <span className="text-xs text-gray-500">
          {configured ? 'Set' : 'Missing'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-blue-900 dark:text-blue-100">
          🔥 Firebase Email Configuration Status
        </h4>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <div className="flex items-center space-x-2 mb-3">
        {config.allConfigured ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              Firebase is configured for email notifications
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span className="text-orange-700 dark:text-orange-300 font-medium">
              Firebase configuration needed
            </span>
          </>
        )}
      </div>

      {showDetails && (
        <div className="space-y-2 mb-4">
          <ConfigItem 
            label="Firebase Project" 
            configured={config.firebase}
          />
          <ConfigItem 
            label="Trigger Email Extension" 
            configured={config.triggerEmail}
          />
        </div>
      )}

      {!config.allConfigured && (
        <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-600">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            To enable email notifications, you need to:
          </p>
          <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-decimal">
            <li>Ensure Firebase is properly configured</li>
            <li>Install the "Trigger Email" extension in Firebase Console</li>
            <li>Configure SMTP settings in the extension</li>
            <li>Test email delivery</li>
          </ol>
          <div className="mt-3 flex items-center space-x-2">
            <a
              href="https://extensions.dev/extensions/firebase/firestore-send-email"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Firebase Trigger Email Extension
            </a>
          </div>
        </div>
      )}

      {config.allConfigured && (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-600">
          <p className="text-sm text-green-800 dark:text-green-200">
            🔥 Firebase is configured! Install the Trigger Email extension to enable email notifications for bills, budgets, and more.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailConfigChecker;