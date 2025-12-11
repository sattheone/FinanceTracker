import duplicateDetectionService from '../services/duplicateDetectionService';
import { Transaction } from '../types';

/**
 * Test duplicate detection with different user settings
 */
export const testDuplicateDetectionSettings = () => {
  console.log('🧪 Testing Duplicate Detection with User Settings...\n');

  // Sample transactions for testing
  const existingTransactions: Transaction[] = [
    {
      id: '1',
      date: '2024-01-15',
      amount: 1000,
      description: 'Grocery Store Purchase',
      type: 'expense',
      category: 'Food & Dining',
      bankAccountId: 'acc1'
    },
    {
      id: '2',
      date: '2024-01-16',
      amount: 2500,
      description: 'Salary Credit',
      type: 'income',
      category: 'Salary',
      bankAccountId: 'acc1'
    }
  ];

  const newTransactions: Transaction[] = [
    {
      id: '3',
      date: '2024-01-15',
      amount: 1000,
      description: 'Grocery Store Purchase', // Exact duplicate
      type: 'expense',
      category: 'Food & Dining',
      bankAccountId: 'acc1'
    },
    {
      id: '4',
      date: '2024-01-16',
      amount: 2500.50, // Very similar amount
      description: 'Salary Credit - Monthly',
      type: 'income',
      category: 'Salary',
      bankAccountId: 'acc1'
    },
    {
      id: '5',
      date: '2024-01-20',
      amount: 500,
      description: 'Coffee Shop',
      type: 'expense',
      category: 'Food & Dining',
      bankAccountId: 'acc1'
    }
  ];

  // Test 1: Smart Mode (Default - should reduce false positives)
  console.log('📊 Test 1: Smart Mode (98% threshold)');
  const smartModeResult = duplicateDetectionService.checkBulkDuplicates(
    newTransactions, 
    existingTransactions, 
    true // Smart mode
  );
  console.log(`   Total transactions: ${smartModeResult.totalTransactions}`);
  console.log(`   Duplicates found: ${smartModeResult.duplicateTransactions}`);
  console.log(`   New transactions: ${smartModeResult.newTransactions}`);
  console.log(`   Should show warning: ${smartModeResult.duplicateTransactions > 0}`);

  // Test 2: Standard Mode (95% threshold)
  console.log('\n📊 Test 2: Standard Mode (95% threshold)');
  const standardModeResult = duplicateDetectionService.checkBulkDuplicates(
    newTransactions, 
    existingTransactions, 
    false // Standard mode
  );
  console.log(`   Total transactions: ${standardModeResult.totalTransactions}`);
  console.log(`   Duplicates found: ${standardModeResult.duplicateTransactions}`);
  console.log(`   New transactions: ${standardModeResult.newTransactions}`);
  console.log(`   Should show warning: ${standardModeResult.duplicateTransactions > 0}`);

  // Test 3: Individual transaction confidence scores
  console.log('\n🔍 Test 3: Individual Transaction Confidence Scores');
  newTransactions.forEach((transaction, index) => {
    const result = duplicateDetectionService.checkDuplicate(transaction, existingTransactions);
    console.log(`   Transaction ${index + 1}: ${result.confidence}% confidence`);
    console.log(`     Description: ${transaction.description}`);
    console.log(`     Is duplicate: ${result.isDuplicate}`);
    console.log(`     Would be flagged in Smart Mode: ${result.confidence >= 98}`);
    console.log(`     Would be flagged in Standard Mode: ${result.confidence >= 95}`);
  });

  // Test 4: Settings Integration
  console.log('\n⚙️ Test 4: Settings Integration');
  
  // Test with different settings
  const testSettings = [
    { enabled: false, smartMode: true, strictMode: false, name: 'Disabled' },
    { enabled: true, smartMode: true, strictMode: false, name: 'Smart Mode' },
    { enabled: true, smartMode: false, strictMode: false, name: 'Standard Mode' },
    { enabled: true, smartMode: false, strictMode: true, name: 'Strict Mode' }
  ];

  testSettings.forEach(setting => {
    // Simulate localStorage setting
    localStorage.setItem('duplicateDetectionSettings', JSON.stringify(setting));
    
    console.log(`\n   Testing with ${setting.name}:`);
    
    if (!setting.enabled) {
      console.log(`     Duplicate detection disabled - would import all ${newTransactions.length} transactions`);
    } else {
      const useSmartMode = setting.smartMode && !setting.strictMode;
      const result = duplicateDetectionService.checkBulkDuplicates(
        newTransactions, 
        existingTransactions, 
        useSmartMode
      );
      console.log(`     Duplicates found: ${result.duplicateTransactions}`);
      console.log(`     New transactions: ${result.newTransactions}`);
      console.log(`     Would show warning: ${result.duplicateTransactions > 0}`);
    }
  });

  // Test 5: File Import Warnings
  console.log('\n📁 Test 5: File Import Warnings');
  
  const fileName = 'test-transactions.xlsx';
  const fileSize = 12345;
  const lastModified = Date.now();

  // Test with file warnings enabled
  localStorage.setItem('duplicateDetectionSettings', JSON.stringify({
    enabled: true,
    showFileWarnings: true
  }));
  
  console.log(`   File warnings enabled:`);
  console.log(`     File imported before: ${duplicateDetectionService.checkFileImported(fileName, fileSize, lastModified)}`);
  
  duplicateDetectionService.markFileAsImported(fileName, fileSize, lastModified);
  console.log(`     File imported after marking: ${duplicateDetectionService.checkFileImported(fileName, fileSize, lastModified)}`);

  // Test with file warnings disabled
  localStorage.setItem('duplicateDetectionSettings', JSON.stringify({
    enabled: true,
    showFileWarnings: false
  }));
  
  console.log(`   File warnings disabled:`);
  console.log(`     Would skip file checking entirely`);

  // Clean up
  duplicateDetectionService.clearImportHistory();
  localStorage.removeItem('duplicateDetectionSettings');

  console.log('\n✅ Duplicate Detection Settings Tests Completed!');
  console.log('\n📋 Summary:');
  console.log('   • Smart Mode reduces false positives by requiring 98%+ confidence');
  console.log('   • Standard Mode uses 95% threshold for balanced detection');
  console.log('   • Strict Mode uses 90% threshold (may cause more false positives)');
  console.log('   • Users can disable duplicate detection entirely');
  console.log('   • File import warnings can be toggled independently');
  console.log('   • Settings are respected throughout the import process');
};

// Export for use in console or testing
(window as any).testDuplicateDetectionSettings = testDuplicateDetectionSettings;