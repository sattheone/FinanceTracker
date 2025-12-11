import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  TestTube,
  Settings,
  Key,
  User
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import sendGridEmailService from '../../services/sendGridEmailService';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

const EmailDiagnostics: React.FC = () => {
  const theme = useThemeClasses();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const runDiagnostics = () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // Check API Key
    const apiKey = import.meta.env.VITE_SENDGRID_API_KEY;
    if (!apiKey) {
      results.push({
        name: 'SendGrid API Key',
        status: 'error',
        message: 'API Key not found',
        details: 'VITE_SENDGRID_API_KEY environment variable is missing'
      });
    } else if (!apiKey.startsWith('SG.')) {
      results.push({
        name: 'SendGrid API Key',
        status: 'error',
        message: 'Invalid API Key format',
        details: 'SendGrid API keys should start with "SG."'
      });
    } else if (apiKey.length < 50) {
      results.push({
        name: 'SendGrid API Key',
        status: 'warning',
        message: 'API Key seems too short',
        details: 'SendGrid API keys are typically longer than 50 characters'
      });
    } else {
      results.push({
        name: 'SendGrid API Key',
        status: 'success',
        message: 'API Key format looks correct',
        details: `Key: ${apiKey.substring(0, 10)}...`
      });
    }

    // Check From Email
    const fromEmail = import.meta.env.VITE_SENDGRID_FROM_EMAIL;
    if (!fromEmail) {
      results.push({
        name: 'From Email Address',
        status: 'error',
        message: 'From email not configured',
        details: 'VITE_SENDGRID_FROM_EMAIL environment variable is missing'
      });
    } else if (!fromEmail.includes('@')) {
      results.push({
        name: 'From Email Address',
        status: 'error',
        message: 'Invalid email format',
        details: `"${fromEmail}" is not a valid email address`
      });
    } else {
      results.push({
        name: 'From Email Address',
        status: 'success',
        message: 'From email configured',
        details: fromEmail
      });
    }

    // Check From Name
    const fromName = import.meta.env.VITE_SENDGRID_FROM_NAME;
    if (!fromName) {
      results.push({
        name: 'From Name',
        status: 'warning',
        message: 'From name not set',
        details: 'VITE_SENDGRID_FROM_NAME will default to "FinanceTracker"'
      });
    } else {
      results.push({
        name: 'From Name',
        status: 'success',
        message: 'From name configured',
        details: fromName
      });
    }

    // Check User Email
    const settings = sendGridEmailService.getSettings();
    if (!settings.emailAddress) {
      results.push({
        name: 'User Email Address',
        status: 'error',
        message: 'User email not found',
        details: 'Please log in to automatically set your email address'
      });
    } else if (!settings.emailAddress.includes('@')) {
      results.push({
        name: 'User Email Address',
        status: 'error',
        message: 'Invalid user email format',
        details: `"${settings.emailAddress}" is not a valid email address`
      });
    } else {
      results.push({
        name: 'User Email Address',
        status: 'success',
        message: 'User email configured',
        details: settings.emailAddress
      });
    }

    // Check Service Configuration
    const isConfigured = sendGridEmailService.isConfigured();
    
    // Get detailed status for debugging
    const debugInfo = {
      apiKeyPresent: !!apiKey,
      apiKeyFormat: apiKey ? apiKey.startsWith('SG.') : false,
      settingsEnabled: settings.enabled,
      userEmailPresent: !!settings.emailAddress,
      fromEmailPresent: !!fromEmail
    };
    
    results.push({
      name: 'Service Configuration',
      status: isConfigured ? 'success' : 'error',
      message: isConfigured ? 'Service is properly configured' : 'Service configuration incomplete',
      details: isConfigured ? 
        'All required settings are present' : 
        `Debug: API Key: ${debugInfo.apiKeyPresent ? '✓' : '✗'}, Format: ${debugInfo.apiKeyFormat ? '✓' : '✗'}, Enabled: ${debugInfo.settingsEnabled ? '✓' : '✗'}, User Email: ${debugInfo.userEmailPresent ? '✓' : '✗'}`
    });

    // Check Notifications Enabled
    results.push({
      name: 'Email Notifications',
      status: settings.enabled ? 'success' : 'warning',
      message: settings.enabled ? 'Notifications enabled' : 'Notifications disabled',
      details: settings.enabled ? 'User has enabled email notifications' : 'User needs to enable notifications in settings'
    });

    setDiagnostics(results);
    setIsRunning(false);
  };

  const handleTestEmail = async () => {
    setTestResult(null);
    try {
      const result = await sendGridEmailService.testEmailConfiguration();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error}`
      });
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
    }
  };

  const hasErrors = diagnostics.some(d => d.status === 'error');
  const hasWarnings = diagnostics.some(d => d.status === 'warning');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(theme.bgBlue, "p-6 rounded-lg border")}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={cn(theme.textBlue, "text-xl font-semibold")}>Email Configuration Diagnostics</h2>
            <p className={cn(theme.textBlueSecondary, "text-sm")}>
              Check your SendGrid email configuration and troubleshoot issues
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className={cn(
              "flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors",
              isRunning && "opacity-50 cursor-not-allowed"
            )}
          >
            <Settings className="w-4 h-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </button>

          <button
            onClick={handleTestEmail}
            disabled={hasErrors}
            className={cn(
              "flex items-center px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors",
              hasErrors && "opacity-50 cursor-not-allowed"
            )}
          >
            <TestTube className="w-4 h-4 mr-2" />
            Send Test Email
          </button>
        </div>
      </div>

      {/* Overall Status */}
      {diagnostics.length > 0 && (
        <div className={cn(
          "p-4 rounded-lg border",
          hasErrors 
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
            : hasWarnings
            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700"
            : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
        )}>
          <div className="flex items-center space-x-2">
            {hasErrors ? (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : hasWarnings ? (
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
            <span className={cn(
              "font-medium",
              hasErrors 
                ? "text-red-800 dark:text-red-200"
                : hasWarnings
                ? "text-yellow-800 dark:text-yellow-200"
                : "text-green-800 dark:text-green-200"
            )}>
              {hasErrors 
                ? "Configuration has errors - emails will not work"
                : hasWarnings
                ? "Configuration has warnings - emails may work with issues"
                : "Configuration looks good - emails should work"
              }
            </span>
          </div>
        </div>
      )}

      {/* Diagnostic Results */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading3, "mb-4")}>Configuration Check Results</h3>
        
        <div className="space-y-3">
          {diagnostics.map((diagnostic, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border",
                getStatusColor(diagnostic.status)
              )}
            >
              <div className="flex items-start space-x-3">
                {getStatusIcon(diagnostic.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {diagnostic.name}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {diagnostic.message}
                  </p>
                  {diagnostic.details && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                      {diagnostic.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={cn(
          "p-4 rounded-lg border",
          testResult.success 
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200"
        )}>
          <div className="flex items-center space-x-2">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span className="font-medium">{testResult.message}</span>
          </div>
        </div>
      )}

      {/* Troubleshooting Guide */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading3, "mb-4")}>Troubleshooting Guide</h3>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              If API Key is missing or invalid:
            </h4>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-5">
              <li>Go to <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">SendGrid API Keys</a></li>
              <li>Create a new API key with "Mail Send" permissions</li>
              <li>Copy the key and update your .env file: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">VITE_SENDGRID_API_KEY=SG.your_key_here</code></li>
              <li>Rebuild and redeploy your app</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              If sender email verification fails:
            </h4>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-5">
              <li>Go to <a href="https://app.sendgrid.com/settings/sender_auth" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">SendGrid Sender Authentication</a></li>
              <li>Click "Single Sender Verification"</li>
              <li>Add and verify: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{import.meta.env.VITE_SENDGRID_FROM_EMAIL || 'your-email@domain.com'}</code></li>
              <li>Check your email and click the verification link</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              <User className="w-4 h-4 inline mr-1" />
              If user email is missing:
            </h4>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-5">
              <li>Make sure you're logged in to your account</li>
              <li>The system automatically uses your registration email</li>
              <li>If still missing, try logging out and back in</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Environment Variables Display */}
      <div className={theme.card}>
        <h3 className={cn(theme.heading3, "mb-4")}>Current Environment Variables</h3>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm">
          <div className="space-y-2">
            <div>
              <span className="text-gray-500">VITE_SENDGRID_API_KEY:</span>{' '}
              <span className={import.meta.env.VITE_SENDGRID_API_KEY ? 'text-green-600' : 'text-red-600'}>
                {import.meta.env.VITE_SENDGRID_API_KEY ? 
                  `${import.meta.env.VITE_SENDGRID_API_KEY.substring(0, 10)}...` : 
                  'NOT_SET'
                }
              </span>
            </div>
            <div>
              <span className="text-gray-500">VITE_SENDGRID_FROM_EMAIL:</span>{' '}
              <span className={import.meta.env.VITE_SENDGRID_FROM_EMAIL ? 'text-green-600' : 'text-red-600'}>
                {import.meta.env.VITE_SENDGRID_FROM_EMAIL || 'NOT_SET'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">VITE_SENDGRID_FROM_NAME:</span>{' '}
              <span className={import.meta.env.VITE_SENDGRID_FROM_NAME ? 'text-green-600' : 'text-red-600'}>
                {import.meta.env.VITE_SENDGRID_FROM_NAME || 'NOT_SET'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailDiagnostics;