import duplicateDetectionService from '../services/duplicateDetectionService';
import { Transaction } from '../types';

// Test utility for duplicate detection
export const testDuplicateDetection = () => {
  console.log('🧪 Testing Duplicate Detection System...');

  // Sample existing transactions
  const existingTransactions: Transaction[] = [
    {
      id: '1',
      date: '2024-01-15',
      description: 'ATM Withdrawal',
      amount: 5000,
      type: 'expense',
      category: 'cash',
      bankAccountId: 'acc1',
      tags: []
    },
    {
      id: '2',
      date: '2024-01-16',
      description: 'Grocery Shopping at Walmart',
      amount: 2500,
      type: 'expense',
      category: 'food',
      bankAccountId: 'acc1',
      tags: []
    }
  ];

  // Test cases
  const testCases = [
    {
      name: 'Exact Duplicate',
      transaction: {
        id: 'test1',
        date: '2024-01-15',
        description: 'ATM Withdrawal',
        amount: 5000,
        type: 'expense' as const,
        category: 'cash',
        bankAccountId: 'acc1',
        tags: []
      },
      expectedConfidence: 100
    },
    {
      name: 'Similar Transaction (slight description difference)',
      transaction: {
        id: 'test2',
        date: '2024-01-15',
        description: 'ATM Cash Withdrawal',
        amount: 5000,
        type: 'expense' as const,
        category: 'cash',
        bankAccountId: 'acc1',
        tags: []
      },
      expectedConfidence: 95
    },
    {
      name: 'Different Transaction',
      transaction: {
        id: 'test3',
        date: '2024-01-20',
        description: 'Online Purchase',
        amount: 1200,
        type: 'expense' as const,
        category: 'shopping',
        bankAccountId: 'acc1',
        tags: []
      },
      expectedConfidence: 0
    },
    {
      name: 'Close Amount Match',
      transaction: {
        id: 'test4',
        date: '2024-01-16',
        description: 'Grocery Shopping at Walmart',
        amount: 2520, // 20 rupees difference
        type: 'expense' as const,
        category: 'food',
        bankAccountId: 'acc1',
        tags: []
      },
      expectedConfidence: 85
    }
  ];

  // Run tests
  testCases.forEach(testCase => {
    const result = duplicateDetectionService.checkDuplicate(
      testCase.transaction,
      existingTransactions
    );

    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Expected Confidence: ~${testCase.expectedConfidence}%`);
    console.log(`   Actual Confidence: ${result.confidence}%`);
    console.log(`   Is Duplicate: ${result.isDuplicate}`);
    console.log(`   Duplicates Found: ${result.duplicateCount}`);
    
    if (result.duplicateTransactions.length > 0) {
      console.log(`   Matched Transaction: ${result.duplicateTransactions[0].description}`);
    }
  });

  // Test bulk import
  console.log('\n🔄 Testing Bulk Import...');
  const newTransactions = testCases.map(tc => tc.transaction);
  const bulkResult = duplicateDetectionService.checkBulkDuplicates(
    newTransactions,
    existingTransactions
  );

  console.log(`   Total Transactions: ${bulkResult.totalTransactions}`);
  console.log(`   New Transactions: ${bulkResult.newTransactions}`);
  console.log(`   Duplicate Transactions: ${bulkResult.duplicateTransactions}`);
  console.log(`   Skipped Transactions: ${bulkResult.skippedTransactions}`);

  // Test file tracking
  console.log('\n📁 Testing File Tracking...');
  const fileName = 'test-statement.xlsx';
  const fileSize = 12345;
  const lastModified = Date.now();

  console.log(`   File imported before: ${duplicateDetectionService.checkFileImported(fileName, fileSize, lastModified)}`);
  
  duplicateDetectionService.markFileAsImported(fileName, fileSize, lastModified);
  console.log(`   File imported after marking: ${duplicateDetectionService.checkFileImported(fileName, fileSize, lastModified)}`);

  console.log('\n✅ Duplicate Detection Tests Completed!');
};

// Export for use in console
(window as any).testDuplicateDetection = testDuplicateDetection;