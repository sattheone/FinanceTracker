import { useState } from 'react';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { defaultCategories } from '../../constants/categories';

/**
 * Admin utility to initialize the /config/categories document
 * This should only be run once by an admin user
 */
export function CategoryConfigInit() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'initializing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [existingCount, setExistingCount] = useState<number | null>(null);

  const checkExisting = async () => {
    setStatus('checking');
    setMessage('Checking for existing config...');
    
    try {
      const docRef = doc(db, 'config', 'categories');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const count = data.categories?.length || 0;
        setExistingCount(count);
        setMessage(`Found existing config with ${count} categories`);
        setStatus('idle');
      } else {
        setExistingCount(null);
        setMessage('No existing config found');
        setStatus('idle');
      }
    } catch (error: any) {
      console.error('Error checking config:', error);
      setMessage(`Error: ${error.message}`);
      setStatus('error');
    }
  };

  const initializeCategories = async () => {
    setStatus('initializing');
    setMessage('Initializing categories config...');
    
    try {
      const docRef = doc(db, 'config', 'categories');
      
      await setDoc(docRef, {
        categories: defaultCategories,
        version: 1,
        updatedAt: serverTimestamp()
      });
      
      setStatus('success');
      setMessage(`✅ Successfully initialized ${defaultCategories.length} categories!\n\nThis reduces category reads from ~50 to 1 per user.`);
      setExistingCount(defaultCategories.length);
      
      console.log('✅ Categories config initialized:', {
        path: '/config/categories',
        count: defaultCategories.length,
        version: 1
      });
    } catch (error: any) {
      console.error('Error initializing categories:', error);
      setStatus('error');
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Category Config Initialization
      </h2>
      
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          ℹ️ What does this do?
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          This creates a single document at <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">/config/categories</code> containing 
          all {defaultCategories.length} default categories.
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
          <strong>Performance benefit:</strong> Reduces category loading from ~50 reads to just 1 read per user.
        </p>
      </div>

      {existingCount !== null && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Config already exists with {existingCount} categories. 
            Initializing again will overwrite it.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={checkExisting}
          disabled={status === 'checking' || status === 'initializing'}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded transition-colors"
        >
          {status === 'checking' ? 'Checking...' : 'Check Existing Config'}
        </button>

        <button
          onClick={initializeCategories}
          disabled={status === 'initializing'}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition-colors font-semibold"
        >
          {status === 'initializing' ? 'Initializing...' : '🚀 Initialize Categories Config'}
        </button>
      </div>

      {message && (
        <div className={`mt-4 p-4 rounded whitespace-pre-line ${
          status === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
            : status === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            : 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800'
        }`}>
          {message}
        </div>
      )}

      {status === 'success' && (
        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
            📊 Next Steps
          </h4>
          <ol className="text-sm text-purple-800 dark:text-purple-200 list-decimal list-inside space-y-1">
            <li>Test category loading in a new user account</li>
            <li>Use FirestoreUsageHud to verify read count (should show 1 read)</li>
            <li>Remove this admin component from production builds</li>
          </ol>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/20 rounded text-xs text-gray-600 dark:text-gray-400">
        <strong>Technical Details:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Default categories: {defaultCategories.length}</li>
          <li>Config path: /config/categories</li>
          <li>Version: 1</li>
          <li>User customizations stored separately in /users/&#123;userId&#125;/categories/</li>
        </ul>
      </div>
    </div>
  );
}
