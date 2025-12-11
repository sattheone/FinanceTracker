/**
 * Quick test to verify duplicate detection is working
 * Run this in the browser console: quickDuplicateTest()
 */

import duplicateDetectionService from '../services/duplicateDetectionService';
import { Transaction } from '../types';

export const quickDuplicateTest = () => {
  console.log('🧪 Quick Duplicate Detection Test');
  
  // Test data
  const existingTransactions: Transaction[] = [
    {
      id: '1',
      date: '2024-01-15',
      amount: 1000,
      description: 'Grocery Store Purchase',
      type: 'expense',
      category: 'Food & Dining',
      bankAccountId: 'acc1'
    }
  ];

  const newTransactions: Transaction[] = [
    {
      id: '2',
      date: '2024-01-15',
      amount: 1000,
      description: 'Grocery Store Purchase', // Exact duplicate
      type: 'expense',
      category: 'Food & Dining',
      bankAccountId: 'acc1'
    },
    {
      id: '3',
      date: '2024-01-16',
      amount: 500,
      description: 'Coffee Shop', // Different transaction
      type: 'expense',
      category: 'Food & Dining',
      bankAccountId: 'acc1'
    }
  ];

  // Test Smart Mode (should catch exact duplicate)
  console.log('\n📊 Testing Smart Mode (98% threshold):');
  const smartResult = duplicateDetectionService.checkBulkDuplicates(newTransactions, existingTransactions, true);
  console.log(`  Duplicates found: ${smartResult.duplicateTransactions}`);
  console.log(`  New transactions: ${smartResult.newTransactions}`);
  console.log(`  Expected: 1 duplicate, 1 new transaction`);

  // Test Standard Mode (should also catch exact duplicate)
  console.log('\n📊 Testing Standard Mode (95% threshold):');
  const standardResult = duplicateDetectionService.checkBulkDuplicates(newTransactions, existingTransactions, false);
  console.log(`  Duplicates found: ${standardResult.duplicateTransactions}`);
  console.log(`  New transactions: ${standardResult.newTransactions}`);
  console.log(`  Expected: 1 duplicate, 1 new transaction`);

  // Test individual confidence scores
  console.log('\n🔍 Individual Confidence Scores:');
  newTransactions.forEach((transaction, index) => {
    const result = duplicateDetectionService.checkDuplicate(transaction, existingTransactions);
    console.log(`  Transaction ${index + 1}: ${result.confidence}% confidence`);
    console.log(`    Description: "${transaction.description}"`);
    console.log(`    Is duplicate: ${result.isDuplicate}`);
  });

  // Test settings integration
  console.log('\n⚙️ Testing Settings Integration:');
  
  // Save current settings
  const originalSettings = localStorage.getItem('duplicateDetectionSettings');
  
  // Test with Smart Mode enabled
  localStorage.setItem('duplicateDetectionSettings', JSON.stringify({
    enabled: true,
    smartMode: true,
    strictMode: false
  }));
  
  const settings = JSON.parse(localStorage.getItem('duplicateDetectionSettings') || '{}');
  const useSmartMode = settings.smartMode && !settings.strictMode;
  
  console.log(`  Settings loaded: enabled=${settings.enabled}, smartMode=${settings.smartMode}`);
  console.log(`  Using smart mode: ${useSmartMode}`);
  
  const settingsResult = duplicateDetectionService.checkBulkDuplicates(newTransactions, existingTransactions, useSmartMode);
  console.log(`  Result with settings: ${settingsResult.duplicateTransactions} duplicates, ${settingsResult.newTransactions} new`);

  // Restore original settings
  if (originalSettings) {
    localStorage.setItem('duplicateDetectionSettings', originalSettings);
  } else {
    localStorage.removeItem('duplicateDetectionSettings');
  }

  console.log('\n✅ Quick test completed!');
  console.log('If you see 1 duplicate and 1 new transaction in all tests, the system is working correctly.');
};

// Make it available globally for console testing
(window as any).quickDuplicateTest = quickDuplicateTest;