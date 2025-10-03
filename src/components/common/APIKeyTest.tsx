import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Key } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';

const APIKeyTest: React.FC = () => {
  const theme = useThemeClasses();
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [apiStatus, setApiStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [errorMessage, setErrorMessage] = useState('');

  const testGeminiAPI = async () => {
    setIsTestingAPI(true);
    setApiStatus('untested');
    setErrorMessage('');

    try {
      const { aiService } = await import('../../services/aiService');
      
      // Test the API key first
      const testResult = await aiService.testAPIKey();
      
      if (testResult.isValid) {
        setApiStatus('success');
        console.log('✅ Gemini API test successful');
      } else {
        setApiStatus('error');
        setErrorMessage(testResult.error || 'API key validation failed');
      }
    } catch (error) {
      setApiStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      console.error('❌ Gemini API test failed:', error);
    } finally {
      setIsTestingAPI(false);
    }
  };

  const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  return (
    <div className={cn(theme.card, 'max-w-md')}>
      <h3 className={cn(theme.heading4, 'mb-4 flex items-center')}>
        <Key className="w-5 h-5 mr-2" />
        API Configuration
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className={theme.textSecondary}>Gemini API Key</span>
          <span className={cn(
            'px-2 py-1 text-xs rounded-full',
            hasApiKey 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          )}>
            {hasApiKey ? 'Configured' : 'Missing'}
          </span>
        </div>

        {hasApiKey && (
          <div className="flex items-center justify-between">
            <span className={theme.textSecondary}>API Status</span>
            <div className="flex items-center space-x-2">
              {apiStatus === 'success' && (
                <span className="flex items-center text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Working
                </span>
              )}
              {apiStatus === 'error' && (
                <span className="flex items-center text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4 mr-1" />
                  Error
                </span>
              )}
              {apiStatus === 'untested' && (
                <span className={cn(theme.textMuted, 'text-sm')}>Not tested</span>
              )}
            </div>
          </div>
        )}

        {hasApiKey && (
          <button
            onClick={testGeminiAPI}
            disabled={isTestingAPI}
            className={cn(
              theme.btnPrimary,
              'w-full flex items-center justify-center',
              isTestingAPI && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isTestingAPI ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing API...
              </>
            ) : (
              'Test API Connection'
            )}
          </button>
        )}

        {!hasApiKey && (
          <div className="text-center">
            <p className={cn(theme.textMuted, 'text-sm mb-3')}>
              Add your Gemini API key to enable AI-powered screenshot analysis
            </p>
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm underline"
            >
              Get Free API Key →
            </a>
          </div>
        )}

        {errorMessage && (
          <div className={cn(theme.alertError, 'text-sm')}>
            <p className="font-medium">API Test Failed</p>
            <p>{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default APIKeyTest;