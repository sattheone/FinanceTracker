import AutoCategorizationService from './autoCategorization';
import { Transaction } from '../types';

class CategoryMigrationService {
  /**
   * Fix transactions that have transaction types as categories
   * This happens when transactions are imported without proper categorization
   */
  static fixTransactionCategories(transactions: Transaction[]): Transaction[] {
    return transactions.map(transaction => {
      // If category is a transaction type instead of a proper category, fix it
      if (transaction.category === 'expense' || 
          transaction.category === 'income' || 
          transaction.category === 'investment' || 
          transaction.category === 'insurance' ||
          !transaction.category ||
          transaction.category === '') {
        
        // Auto-categorize based on description
        const suggestedCategory = AutoCategorizationService.suggestCategoryForTransaction(
          transaction.description,
          transaction.amount,
          transaction.type
        );
        
        console.log(`🔄 Migrating transaction "${transaction.description}" from "${transaction.category}" to "${suggestedCategory}"`);
        
        return {
          ...transaction,
          category: suggestedCategory
        };
      }
      
      return transaction;
    });
  }

  /**
   * Check if a transaction needs category migration
   */
  static needsCategoryMigration(transaction: Transaction): boolean {
    return transaction.category === 'expense' || 
           transaction.category === 'income' || 
           transaction.category === 'investment' || 
           transaction.category === 'insurance' ||
           !transaction.category ||
           transaction.category === '';
  }

  /**
   * Get statistics about transactions that need migration
   */
  static getMigrationStats(transactions: Transaction[]): {
    total: number;
    needsMigration: number;
    byCurrentCategory: Record<string, number>;
  } {
    const needsMigration = transactions.filter(t => this.needsCategoryMigration(t));
    const byCurrentCategory: Record<string, number> = {};
    
    needsMigration.forEach(t => {
      const category = t.category || 'empty';
      byCurrentCategory[category] = (byCurrentCategory[category] || 0) + 1;
    });

    return {
      total: transactions.length,
      needsMigration: needsMigration.length,
      byCurrentCategory
    };
  }
}

export default CategoryMigrationService;