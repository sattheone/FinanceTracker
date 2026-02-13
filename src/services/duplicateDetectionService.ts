import { Transaction } from '../types';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateCount: number;
  duplicateTransactions: Transaction[];
  similarTransactions: Transaction[];
  confidence: number; // 0-100, how confident we are it's a duplicate
}

// Paired duplicate info for UI display
export interface DuplicatePair {
  fileTransaction: Transaction;      // Transaction from import file
  existingTransaction: Transaction;  // Matching transaction in database
  confidence: number;                 // Match confidence (0-100)
}

// Internal duplicate within the same import file
export interface InternalDuplicate {
  transaction: Transaction;          // The duplicate transaction
  duplicateOf: Transaction;          // The original transaction it duplicates
  confidence: number;
}

export interface ImportSummary {
  totalTransactions: number;
  newTransactions: number;
  duplicateTransactions: number;
  skippedTransactions: number;
  importedTransactions: Transaction[];
  duplicates: Transaction[];
  duplicatePairs?: DuplicatePair[];           // Paired duplicates with existing transactions
  internalDuplicates?: InternalDuplicate[];   // Duplicates within the import file
}

class DuplicateDetectionService {
  
  // Tolerance levels for matching (made more strict to reduce false positives)
  // private readonly EXACT_MATCH_THRESHOLD = 100;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 95; // Increased from 90 to 95
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 85; // Increased from 70 to 85
  private readonly DATE_TOLERANCE_DAYS = 1; // Reduced from 2 to 1 day
  private readonly AMOUNT_TOLERANCE_PERCENT = 0.001; // Reduced from 1% to 0.1% tolerance

  /**
   * Check if a single transaction is a duplicate
   */
  public checkDuplicate(newTransaction: Transaction, existingTransactions: Transaction[]): DuplicateCheckResult {
    const duplicates: Transaction[] = [];
    const similar: Transaction[] = [];
    let maxConfidence = 0;

    for (const existing of existingTransactions) {
      const confidence = this.calculateSimilarity(newTransaction, existing);
      
      if (confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
        duplicates.push(existing);
        maxConfidence = Math.max(maxConfidence, confidence);
      } else if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
        similar.push(existing);
      }
    }

    return {
      isDuplicate: duplicates.length > 0,
      duplicateCount: duplicates.length,
      duplicateTransactions: duplicates,
      similarTransactions: similar,
      confidence: maxConfidence
    };
  }

  /**
   * Find the best matching existing transaction for a new transaction
   */
  private findBestMatch(newTransaction: Transaction, existingTransactions: Transaction[]): { match: Transaction | null; confidence: number } {
    let bestMatch: Transaction | null = null;
    let bestConfidence = 0;

    for (const existing of existingTransactions) {
      const confidence = this.calculateSimilarity(newTransaction, existing);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = existing;
      }
    }

    return { match: bestMatch, confidence: bestConfidence };
  }

  /**
   * Check multiple transactions for duplicates (bulk import)
   * Now uses smart filtering to reduce false positives
   * Returns paired duplicate information for better UI display
   */
  public checkBulkDuplicates(
    newTransactions: Transaction[], 
    existingTransactions: Transaction[],
    smartMode: boolean = true
  ): ImportSummary {
    const importedTransactions: Transaction[] = [];
    const duplicates: Transaction[] = [];
    const duplicatePairs: DuplicatePair[] = [];
    const internalDuplicates: InternalDuplicate[] = [];
    
    // Also check for duplicates within the new transactions themselves
    const { unique: processedTransactions, internalDuplicates: internals } = this.removeDuplicatesWithinSetDetailed(newTransactions);
    internalDuplicates.push(...internals);

    for (const transaction of processedTransactions) {
      const { match, confidence } = this.findBestMatch(transaction, existingTransactions);
      
      // In smart mode, only flag as duplicate if confidence is very high (98%+) 
      // or if it's an exact match
      const isDuplicateInSmartMode = smartMode 
        ? confidence >= 98 || confidence === 100
        : confidence >= this.HIGH_CONFIDENCE_THRESHOLD;
      
      if (isDuplicateInSmartMode && match) {
        duplicates.push(transaction);
        duplicatePairs.push({
          fileTransaction: transaction,
          existingTransaction: match,
          confidence
        });
      } else {
        importedTransactions.push(transaction);
      }
    }

    // Only show duplicate warning if there are actual high-confidence duplicates
    const shouldShowWarning = duplicates.length > 0 && (
      !smartMode || 
      duplicatePairs.some(pair => pair.confidence >= 98)
    );

    return {
      totalTransactions: newTransactions.length,
      newTransactions: importedTransactions.length,
      duplicateTransactions: shouldShowWarning ? duplicates.length : 0,
      skippedTransactions: internalDuplicates.length,
      importedTransactions: shouldShowWarning ? importedTransactions : [...importedTransactions, ...duplicates],
      duplicates: shouldShowWarning ? duplicates : [],
      duplicatePairs: shouldShowWarning ? duplicatePairs : [],
      internalDuplicates: internalDuplicates.length > 0 ? internalDuplicates : undefined
    };
  }

  /**
   * Calculate similarity between two transactions (0-100)
   * Now requires multiple strong matches to be considered a duplicate
   */
  private calculateSimilarity(transaction1: Transaction, transaction2: Transaction): number {
    // First, check for exact matches - these are definitely duplicates
    if (this.isExactMatch(transaction1, transaction2)) {
      return 100;
    }

    let score = 0;
    let maxScore = 0;

    // Date similarity (35 points) - increased weight
    maxScore += 35;
    const dateSimilarity = this.calculateDateSimilarity(transaction1.date, transaction2.date);
    score += dateSimilarity * 35;

    // Amount similarity (45 points) - increased weight
    maxScore += 45;
    const amountSimilarity = this.calculateAmountSimilarity(transaction1.amount, transaction2.amount);
    score += amountSimilarity * 45;

    // Description similarity (15 points) - reduced weight to avoid false positives
    maxScore += 15;
    const descriptionSimilarity = this.calculateDescriptionSimilarity(
      transaction1.description, 
      transaction2.description
    );
    score += descriptionSimilarity * 15;

    // Type and category similarity (5 points) - reduced weight
    maxScore += 5;
    if (transaction1.type === transaction2.type) score += 2.5;
    if (transaction1.category === transaction2.category) score += 2.5;

    const finalScore = Math.round((score / maxScore) * 100);

    // Additional penalty for different dates - if dates are more than 1 day apart, 
    // require very high similarity in other areas
    if (Math.abs(new Date(transaction1.date).getTime() - new Date(transaction2.date).getTime()) > 24 * 60 * 60 * 1000) {
      return Math.min(finalScore, 85); // Cap at 85% if dates are different
    }

    return finalScore;
  }

  /**
   * Check if two transactions are exact matches
   */
  private isExactMatch(transaction1: Transaction, transaction2: Transaction): boolean {
    return (
      transaction1.date === transaction2.date &&
      transaction1.amount === transaction2.amount &&
      this.cleanDescription(transaction1.description) === this.cleanDescription(transaction2.description) &&
      transaction1.type === transaction2.type
    );
  }

  /**
   * Calculate date similarity (0-1)
   */
  private calculateDateSimilarity(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 1; // Exact match
    if (diffDays <= this.DATE_TOLERANCE_DAYS) return 0.8; // Close match
    if (diffDays <= 7) return 0.5; // Same week
    if (diffDays <= 30) return 0.2; // Same month
    return 0; // Too far apart
  }

  /**
   * Calculate amount similarity (0-1)
   */
  private calculateAmountSimilarity(amount1: number, amount2: number): number {
    if (amount1 === amount2) return 1; // Exact match
    
    const diff = Math.abs(amount1 - amount2);
    const avgAmount = (amount1 + amount2) / 2;
    const percentDiff = diff / avgAmount;
    
    if (percentDiff <= this.AMOUNT_TOLERANCE_PERCENT) return 0.95; // Very close
    if (percentDiff <= 0.05) return 0.8; // 5% tolerance
    if (percentDiff <= 0.1) return 0.5; // 10% tolerance
    return 0; // Too different
  }

  /**
   * Calculate description similarity using fuzzy matching (0-1)
   */
  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    if (!desc1 || !desc2) return 0;
    
    const clean1 = this.cleanDescription(desc1);
    const clean2 = this.cleanDescription(desc2);
    
    if (clean1 === clean2) return 1; // Exact match
    
    // Check if one contains the other
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.8;
    
    // Calculate Levenshtein distance
    const similarity = this.calculateLevenshteinSimilarity(clean1, clean2);
    return similarity;
  }

  /**
   * Clean description for comparison
   */
  private cleanDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .trim();
  }

  /**
   * Calculate Levenshtein similarity (0-1)
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Remove duplicates within a set of new transactions with detailed info
   * Returns both unique transactions and info about internal duplicates
   */
  private removeDuplicatesWithinSetDetailed(transactions: Transaction[]): {
    unique: Transaction[];
    internalDuplicates: InternalDuplicate[];
  } {
    const unique: Transaction[] = [];
    const internalDuplicates: InternalDuplicate[] = [];
    
    for (const transaction of transactions) {
      let bestMatch: Transaction | null = null;
      let bestConfidence = 0;
      
      for (const existing of unique) {
        const similarity = this.calculateSimilarity(transaction, existing);
        if (similarity >= this.HIGH_CONFIDENCE_THRESHOLD && similarity > bestConfidence) {
          bestMatch = existing;
          bestConfidence = similarity;
        }
      }
      
      if (bestMatch) {
        internalDuplicates.push({
          transaction,
          duplicateOf: bestMatch,
          confidence: bestConfidence
        });
      } else {
        unique.push(transaction);
      }
    }
    
    return { unique, internalDuplicates };
  }

  /**
   * Generate a hash for a transaction (for quick duplicate detection)
   */
  public generateTransactionHash(transaction: Transaction): string {
    const hashData = {
      date: transaction.date,
      amount: Math.round(transaction.amount * 100), // Round to cents
      description: this.cleanDescription(transaction.description),
      type: transaction.type
    };
    
    return btoa(JSON.stringify(hashData));
  }

  /**
   * Check if an Excel file has been imported before
   */
  public checkFileImported(fileName: string, fileSize: number, lastModified: number): boolean {
    const importHistory = this.getImportHistory();
    const fileSignature = `${fileName}-${fileSize}-${lastModified}`;
    
    return importHistory.includes(fileSignature);
  }

  /**
   * Mark a file as imported
   */
  public markFileAsImported(fileName: string, fileSize: number, lastModified: number): void {
    const importHistory = this.getImportHistory();
    const fileSignature = `${fileName}-${fileSize}-${lastModified}`;
    
    if (!importHistory.includes(fileSignature)) {
      importHistory.push(fileSignature);
      localStorage.setItem('importHistory', JSON.stringify(importHistory));
    }
  }

  /**
   * Get import history from localStorage
   */
  private getImportHistory(): string[] {
    const history = localStorage.getItem('importHistory');
    return history ? JSON.parse(history) : [];
  }

  /**
   * Clear import history (for testing or reset)
   */
  public clearImportHistory(): void {
    localStorage.removeItem('importHistory');
  }

  /**
   * Get import statistics
   */
  public getImportStats(): { totalFiles: number; lastImport: string | null } {
    const history = this.getImportHistory();
    const lastImportData = localStorage.getItem('lastImportDate');
    
    return {
      totalFiles: history.length,
      lastImport: lastImportData
    };
  }

  /**
   * Create a detailed duplicate report
   */
  public generateDuplicateReport(summary: ImportSummary): string {
    const report = [];
    
    report.push(`📊 Import Summary:`);
    report.push(`• Total transactions in file: ${summary.totalTransactions}`);
    report.push(`• New transactions imported: ${summary.newTransactions}`);
    report.push(`• Duplicate transactions skipped: ${summary.duplicateTransactions}`);
    report.push(`• Internal duplicates removed: ${summary.skippedTransactions}`);
    
    if (summary.duplicates.length > 0) {
      report.push(`\n🔍 Duplicate Transactions Found:`);
      summary.duplicates.forEach((dup, index) => {
        report.push(`${index + 1}. ${dup.date} - ${dup.description} - ₹${dup.amount}`);
      });
    }
    
    return report.join('\n');
  }
}

export default new DuplicateDetectionService();