import { Transaction } from '../types';
import AutoCategorizationService from './autoCategorization';
import { ParsedTransaction } from './excelParser';

export interface BankStatementData {
  accountNumber: string;
  accountHolder: string;
  statementPeriod: {
    from: string;
    to: string;
  };
  openingBalance: number;
  closingBalance: number;
  transactions: ParsedTransaction[];
  bankName: string;
}

class BankStatementParser {

  // HDFC Bank statement patterns
  private hdfcPatterns = {
    accountNumber: /Account\s+No[:\s]+(\d{11,16})/i,
    accountHolder: /Account\s+Holder[:\s]+([A-Z\s]+)/i,
    statementPeriod: /Statement\s+Period[:\s]+(\d{2}\/\d{2}\/\d{2,4})\s+to\s+(\d{2}\/\d{2}\/\d{2,4})/i,
    openingBalance: /Opening\s+Balance[:\s]+(?:Rs\.?\s*)?([0-9,]+\.?\d*)/i,
    closingBalance: /Closing\s+Balance[:\s]+(?:Rs\.?\s*)?([0-9,]+\.?\d*)/i,
    // New pattern for summary table: Opening Bal, Dr Count, Cr Count, Debits, Credits, Closing Bal
    summaryTable: /([0-9,]+\.\d{2})\s+\d+\s+\d+\s+[0-9,]+\.\d{2}\s+[0-9,]+\.\d{2}\s+[0-9,]+\.\d{2}/,
    // Standard format with Dr/Cr
    transactionLineStandard: /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([0-9,]+\.?\d*)\s+(Dr|Cr)\s+([0-9,]+\.?\d*)/,
    // Columnar format: Date, Narration, Ref, ValDate, Amount, Balance
    transactionLineColumnar: /^(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{2,4})\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})/
  };

  public async parseHDFCStatement(pdfText: string): Promise<BankStatementData> {
    console.log('🏦 Parsing HDFC bank statement...');
    console.log('📄 Extracted Text Preview (first 500 chars):', pdfText.substring(0, 500));

    try {
      // Extract basic account information
      const accountNumber = this.extractPattern(pdfText, this.hdfcPatterns.accountNumber) || 'Unknown';
      const accountHolder = this.extractPattern(pdfText, this.hdfcPatterns.accountHolder) || 'Unknown';

      console.log('Account Info:', { accountNumber, accountHolder });

      // Extract statement period
      const periodMatch = pdfText.match(this.hdfcPatterns.statementPeriod);
      console.log('Period Match:', periodMatch);

      const statementPeriod = periodMatch ? {
        from: this.convertDateFormat(periodMatch[1]),
        to: this.convertDateFormat(periodMatch[2])
      } : {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      };

      // Extract balances
      let openingBalance = this.parseAmount(this.extractPattern(pdfText, this.hdfcPatterns.openingBalance) || '0');
      let closingBalance = this.parseAmount(this.extractPattern(pdfText, this.hdfcPatterns.closingBalance) || '0');

      // Try to find opening balance from summary table if not found
      if (openingBalance === 0) {
        const summaryMatch = pdfText.match(this.hdfcPatterns.summaryTable);
        if (summaryMatch) {
          console.log('Found summary table match:', summaryMatch[0]);
          openingBalance = this.parseAmount(summaryMatch[1]);
          // We could also extract closing balance from the last group if needed
        }
      }

      console.log('Balances:', { openingBalance, closingBalance });

      // Extract transactions
      const transactions = this.extractHDFCTransactions(pdfText, openingBalance);

      return {
        accountNumber,
        accountHolder,
        statementPeriod,
        openingBalance,
        closingBalance,
        transactions,
        bankName: 'HDFC Bank'
      };
    } catch (error) {
      console.error('Error parsing HDFC statement:', error);
      throw new Error('Failed to parse HDFC bank statement');
    }
  }

  private extractHDFCTransactions(pdfText: string, openingBalance: number): ParsedTransaction[] {
    const rawTransactions: any[] = [];
    const lines = pdfText.split('\n');
    console.log(`Processing ${lines.length} lines for transactions...`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Debug first few lines and any line that looks like a date
      if (i < 20 || line.match(/^\d{2}\/\d{2}\/\d{2,4}/)) {
        console.log(`Line ${i}: "${line}"`);
      }

      // Try standard match first
      const stdMatch = line.match(this.hdfcPatterns.transactionLineStandard);
      if (stdMatch) {
        console.log(`✅ Standard match found on line ${i}`);
        rawTransactions.push(this.parseTransactionMatch(stdMatch, 'standard'));
        continue;
      }

      // Try columnar match
      const colMatch = line.match(this.hdfcPatterns.transactionLineColumnar);
      if (colMatch) {
        console.log(`✅ Columnar match found on line ${i}`);
        rawTransactions.push(this.parseTransactionMatch(colMatch, 'columnar'));
        continue;
      }

      if (line.match(/^\d{2}\/\d{2}\/\d{2,4}/)) {
        console.log(`❌ Date found but no transaction match on line ${i}`);
      }

      // Handle multi-line descriptions
      if (rawTransactions.length > 0 && this.isDescriptionContinuation(line)) {
        const lastTransaction = rawTransactions[rawTransactions.length - 1];
        lastTransaction.description += ' ' + line.trim();
      }
    }

    // Post-process to determine types for columnar transactions
    const transactions: ParsedTransaction[] = [];
    let currentBalance = openingBalance;

    for (const raw of rawTransactions) {
      if (raw.type === 'unknown') {
        // Infer type based on balance change
        // If we have the transaction balance, use it to check against previous balance
        const txBalance = raw.balance; // We stored this in the raw object temporarily

        let type: 'income' | 'expense' = 'expense'; // Default

        // Calculate expected balances
        // If it was income: prev + amount = curr
        // If it was expense: prev - amount = curr

        const expectedIfIncome = currentBalance + raw.amount;
        const expectedIfExpense = currentBalance - raw.amount;

        // Check which one matches closer to the reported balance
        const diffIncome = Math.abs(expectedIfIncome - txBalance);
        const diffExpense = Math.abs(expectedIfExpense - txBalance);

        if (diffIncome < 1.0) { // Allow small float error
          type = 'income';
        } else if (diffExpense < 1.0) {
          type = 'expense';
        } else {
          console.warn(`Could not infer type for transaction ${raw.description}. PrevBal: ${currentBalance}, Amt: ${raw.amount}, CurrBal: ${txBalance}`);
          // Fallback: assume expense if balance decreased, income if increased
          if (txBalance > currentBalance) type = 'income';
        }

        console.log(`Inferred type for ${raw.amount} (Bal: ${txBalance}): ${type}`);

        transactions.push({
          ...raw,
          type,
          category: '', // Defer to Transactions.tsx
          // category: AutoCategorizationService.autoAssignCategory(raw.description, raw.amount, type),
          balance: undefined // Remove temp field if needed, or keep it
        });

        currentBalance = txBalance;
      } else {
        transactions.push(raw);
        // Update current balance for next iteration if mixed formats
        // This is tricky if standard format doesn't provide balance, but HDFC usually does
        if (raw.balance) currentBalance = raw.balance;
      }
    }

    return this.cleanupTransactions(transactions);
  }

  private parseTransactionMatch(match: RegExpMatchArray, format: 'standard' | 'columnar'): any {
    if (format === 'standard') {
      const [, date, description, amount, type, balance] = match;
      const parsedAmount = this.parseAmount(amount);
      const transactionType = type.toLowerCase() === 'cr' ? 'income' : 'expense';
      const cleanDesc = this.cleanDescription(description);

      return {
        date: this.convertDateFormat(date),
        description: cleanDesc,
        amount: parsedAmount,
        type: transactionType,
        category: '', // Defer to Transactions.tsx
        // category: AutoCategorizationService.autoAssignCategory(cleanDesc, parsedAmount, transactionType),
        confidence: 0.9,
        balance: this.parseAmount(balance)
      };
    } else {
      // Columnar: Date, Narration, ValDate, Amount, Balance
      const [, date, description, , amount, balance] = match;
      const parsedAmount = this.parseAmount(amount);
      const parsedBalance = this.parseAmount(balance);
      const cleanDesc = this.cleanDescription(description);

      return {
        date: this.convertDateFormat(date),
        description: cleanDesc,
        amount: parsedAmount,
        type: 'unknown', // To be inferred
        confidence: 0.8,
        balance: parsedBalance
      };
    }
  }

  private isDescriptionContinuation(line: string): boolean {
    // Check if line looks like a continuation of transaction description
    return !line.match(/^\d{2}\/\d{2}\/\d{2,4}/) && // Doesn't start with date
      !line.match(/^(Opening|Closing)\s+Balance/i) && // Not a balance line
      !line.match(/^\s*$/) && // Not empty
      line.length > 5; // Has meaningful content
  }

  private cleanupTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
    return transactions
      .filter(t => t.amount > 0) // Remove zero amount transactions
      .map(t => ({
        ...t,
        description: t.description.replace(/\s+/g, ' ').trim() // Clean up whitespace
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
  }

  private extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  private convertDateFormat(dateStr: string): string {
    // Convert DD/MM/YYYY or DD/MM/YY to YYYY-MM-DD
    const [day, month, year] = dateStr.split('/');
    let fullYear = year;
    if (year.length === 2) {
      fullYear = '20' + year; // Assume 20xx
    }
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  private parseAmount(amountStr: string): number {
    // Remove commas and parse as float
    return parseFloat(amountStr.replace(/,/g, '')) || 0;
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/[^\w\s\-\.\/]/g, '') // Remove special characters except basic ones
      .trim()
      .substring(0, 200); // Limit length
  }

  public convertToAppTransactions(
    statementData: BankStatementData,
    bankAccountId: string
  ): Transaction[] {
    return statementData.transactions.map(parsed => {
      const baseTransaction = {
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: parsed.description,
        amount: parsed.amount,
        date: parsed.date,
        type: parsed.type === 'income' ? 'income' : 'expense' as 'income' | 'expense' | 'investment',
        bankAccountId,
        tags: [
          'imported',
          'hdfc',
          // parsed.mode?.toLowerCase() || 'other' // mode is no longer on ParsedTransaction
        ],
        source: 'gmail-import',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          // originalBalance: parsed.balance,
          // transactionMode: parsed.mode,
          // reference: parsed.reference,
          bankName: statementData.bankName
        }
      };

      // Don't auto-categorize here as we don't have access to custom rules
      // Defer to Transactions.tsx which has the context
      return {
        ...baseTransaction,
        category: '' // Leave empty to trigger auto-categorization in UI
      };
    });
  }

  // AI-powered PDF text extraction (using pdfjs-dist)
  public async extractTextFromPDF(base64Data: string, password?: string): Promise<string> {
    try {
      // Dynamically import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');

      // Set worker source using Vite's ?url import to get the correct path to the worker file
      // This ensures the worker is bundled/served correctly by Vite
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        try {
          // @ts-ignore - Vite specific import
          const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;
        } catch (e) {
          console.warn('Failed to load local PDF worker, falling back to CDN', e);
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }
      }

      // Convert base64 to Uint8Array
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Load the PDF document
      console.log('Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument({
        data: bytes,
        password: password
      });

      loadingTask.onPassword = (updatePassword: any, reason: any) => {
        console.log('Password requested by PDF.js. Reason:', reason);
        if (password) {
          console.log('Retrying with provided password');
          updatePassword(password);
        } else {
          console.log('No password provided, cancelling');
          // This might not throw immediately, need to check behavior
          throw new Error('PASSWORD_REQUIRED');
        }
      };

      const pdf = await loadingTask.promise;
      console.log('PDF loaded successfully. Pages:', pdf.numPages);
      let fullText = '';

      // Iterate through each page and extract text with layout preservation
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Sort items by Y (descending) then X (ascending) to ensure reading order
        // PDF coordinates: (0,0) is bottom-left. Higher Y means higher up on page.
        const items = textContent.items.map((item: any) => ({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          h: item.height || 0
        }));

        // Sort by Y (descending) primarily, then X (ascending)
        items.sort((a: any, b: any) => {
          const yDiff = b.y - a.y;
          if (Math.abs(yDiff) < 5) { // If Y is close enough, consider same line, sort by X
            return a.x - b.x;
          }
          return yDiff; // Otherwise sort by Y (top to bottom)
        });

        let pageText = '';
        let lastY = -1;

        for (const item of items) {
          if (lastY !== -1 && Math.abs(item.y - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith('\n')) {
            pageText += ' '; // Add space between items on same line
          }

          pageText += item.str;
          lastY = item.y;
        }

        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error: any) {
      console.error('Error extracting PDF text:', error);

      // Check for password error
      if (error.name === 'PasswordException' || error.message?.includes('Password') || error.code === 1) {
        throw new Error('PASSWORD_REQUIRED');
      }

      throw new Error('Failed to extract text from PDF: ' + (error.message || 'Unknown error'));
    }
  }
}

export default new BankStatementParser();