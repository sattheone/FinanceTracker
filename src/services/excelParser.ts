import * as XLSX from 'xlsx';
import Papa from 'papaparse';
// Transaction type imported for reference but not directly used

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  confidence: number;
  // Extended fields for Backup Import
  accountName?: string;
  tags?: string[];
  notes?: string;
}

// Configuration for Fuzzy Matching
const COLUMN_MAP: Record<string, string[]> = {
  date: ['date', 'txn date', 'transaction date', 'value date', 'posting date'],
  description: ['description', 'narration', 'remarks', 'details', 'particulars', 'transaction details'],
  amount: ['amount', 'txn amount', 'transaction amount'],
  debit: ['debit', 'withdrawal', 'debit amount', 'dr', 'dr.'],
  credit: ['credit', 'deposit', 'credit amount', 'cr', 'cr.'],
  balance: ['balance', 'closing balance', 'account balance'],
  type: ['type', 'mode', 'transaction type', 'txn type']
};

// Custom Error to pass raw data back to UI
export class HeaderDetectionError extends Error {
  rawData: string[][];
  constructor(message: string, rawData: string[][]) {
    super(message);
    this.name = 'HeaderDetectionError';
    this.rawData = rawData;
  }
}

export class ExcelParser {

  // New method for manual mapping flow
  public parseWithMapping(data: string[][], mapping: Record<string, number>, headerRowIndex: number = 0): ParsedTransaction[] {
    console.log('Parsing with manual mapping:', mapping, 'Header Row:', headerRowIndex);
    return this.parseGenericStatement(data, { headerRowIndex, columnIndices: mapping });
  }

  async parseExcelFile(file: File): Promise<ParsedTransaction[]> {
    try {
      console.log('Starting Excel file parsing for:', file.name);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      console.log('Sheet names:', workbook.SheetNames);
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log('Total rows in Excel:', jsonData.length);

      // Convert to string matrix
      const rawData = jsonData.map(row => (row as any[]).map(cell => String(cell || '')));

      try {
        const transactions = this.parseGenericStatement(rawData);
        console.log('Parsed transactions count:', transactions.length);
        return transactions;
      } catch (err) {
        // If it's a generic error, rethrow. If it's header detection failure, 
        // we want to catch it here? No, parseGenericStatement throws HeaderDetectionError,
        // which will bubble up to FileUploader.
        // But we need to make sure generic errors don't swallow the data if possible.
        // Actually, parseGenericStatement is where the logic lives.
        throw err;
      }
    } catch (error) {
      if (!(error instanceof HeaderDetectionError)) {
        console.error('Error parsing Excel file:', error);
      }
      throw error; // Let the caller (FileUploader) handle specific errors
    }
  }

  async parseCSVFile(file: File): Promise<ParsedTransaction[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const rawData = results.data as string[][];
            const transactions = this.parseGenericStatement(rawData);
            resolve(transactions);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  // --- Generic Parser Implementation ---

  // Updated to accept optional manual configuration
  private parseGenericStatement(
    data: string[][],
    manualConfig?: { headerRowIndex: number, columnIndices: Record<string, number> }
  ): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    let headerRowIndex = 0;
    let columnIndices: Record<string, number> = {};

    if (manualConfig) {
      headerRowIndex = manualConfig.headerRowIndex;
      columnIndices = manualConfig.columnIndices;
    } else {
      // 1. Auto-Detect Headers
      try {
        const result = this.detectHeaders(data);
        headerRowIndex = result.headerRowIndex;
        columnIndices = result.columnIndices;
      } catch (err) {
        // Throw special error with data for UI fallback
        throw new HeaderDetectionError(
          "Could not automatically detect headers.",
          data.slice(0, 20) // Send first 20 rows for preview
        );
      }
    }

    if (headerRowIndex === -1) {
      // Should be caught above, but safety check
      throw new HeaderDetectionError("Invalid header row.", data.slice(0, 20));
    }

    console.log('Headers detected at row:', headerRowIndex, 'Mapping:', columnIndices);

    // 2. Row Parsing
    const startRow = headerRowIndex + 1;

    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      try {
        // Extract raw values
        const dateStr = this.getCellValue(row, columnIndices.date);

        // Skip invalid rows
        if (!dateStr || this.isIgnorableRow(row)) continue;

        // Parse Date
        const date = this.parseDate(dateStr);
        if (!date) continue;

        // Extract Description (Clean it)
        const descRaw = this.getCellValue(row, columnIndices.description);
        const description = this.cleanDescription(descRaw || 'Unknown Transaction');

        // Resolve Amount & Type
        const { amount, type } = this.resolveAmountAndType(row, columnIndices);

        if (amount <= 0 && !descRaw) continue; // Skip if basically empty

        transactions.push({
          date,
          description,
          amount,
          type,
          category: this.categorizeTransaction(description, type),
          confidence: 0.8
        });

      } catch (err) {
        console.warn(`Skipping row ${i + 1}:`, err);
        continue;
      }
    }

    if (transactions.length === 0) {
      // If manual mapping was provided but yielded no results, user might have mapped wrong.
      // Or the file is just weird. We throw generic error but maybe we should throw HeaderDetectionError again?
      // No, if manual mapping fails, just say "No transactions found".
      throw new Error('Headers found, but no valid transactions could be parsed.');
    }

    return transactions;
  }

  private detectHeaders(data: string[][]): { headerRowIndex: number, columnIndices: Record<string, number> } {
    let bestMatch: { headerRowIndex: number, columnIndices: Record<string, number>, score: number } | null = null;

    // 2. Scan first 30 rows (User Requirement: 25-30 rows for HDFC)
    const rowsToScan = Math.min(data.length, 30);

    for (let i = 0; i < rowsToScan; i++) {
      // Safe row processing
      const row = Array.from(data[i] || []).map(cell =>
        (cell !== null && cell !== undefined) ? String(cell).toLowerCase().trim() : ''
      );

      const indices: Record<string, number> = {};
      let matchCount = 0;

      // Check each expected column type
      Object.entries(COLUMN_MAP).forEach(([key, aliases]) => {
        // Find index of first matching alias
        const index = row.findIndex(cell =>
          aliases.some(alias => {
            // Strict equality or clean includes
            return cell === alias || (cell.length > alias.length && cell.includes(alias));
          })
        );
        if (index !== -1) {
          indices[key] = index;
          matchCount++;
        }
      });

      // 3. Scoring & Validation
      const hasDate = indices.date !== undefined;
      const hasDesc = indices.description !== undefined;
      const hasAmount = indices.amount !== undefined;
      const hasSplit = (indices.debit !== undefined || indices.credit !== undefined);

      if (hasDate && hasDesc && (hasAmount || hasSplit)) {
        if (!bestMatch || matchCount > bestMatch.score) {
          bestMatch = { headerRowIndex: i, columnIndices: indices, score: matchCount };
        }
      }
    }

    if (bestMatch) {
      return { headerRowIndex: bestMatch.headerRowIndex, columnIndices: bestMatch.columnIndices };
    }

    // Fail - Return empty to trigger error in caller
    throw new Error('Detection failed');
  }

  private resolveAmountAndType(row: string[], indices: Record<string, number>): { amount: number, type: 'income' | 'expense' } {
    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    // Case 1: Separate Debit/Credit columns
    if (indices.debit !== undefined && indices.credit !== undefined) {
      const debitVal = this.parseAmount(this.getCellValue(row, indices.debit));
      const creditVal = this.parseAmount(this.getCellValue(row, indices.credit));

      if (debitVal > 0) {
        amount = debitVal;
        type = 'expense';
      } else if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
      }
    }
    // Case 2: Amount + Explicit Type Column
    else if (indices.amount !== undefined && indices.type !== undefined) {
      const parsedAmount = this.parseAmount(this.getCellValue(row, indices.amount));
      const typeStr = this.getCellValue(row, indices.type).toLowerCase();

      amount = parsedAmount;
      if (typeStr.includes('credit') || typeStr.includes('cr') || typeStr.includes('deposit') || typeStr.includes('income')) {
        type = 'income';
      } else {
        type = 'expense';
      }
    }
    // Case 3: Single Amount Column 
    else if (indices.amount !== undefined) {
      const rawAmount = this.getCellValue(row, indices.amount);
      const parsed = this.parseAmount(rawAmount);

      if (rawAmount.toLowerCase().includes('cr') || rawAmount.toLowerCase().includes('credit')) {
        type = 'income';
        amount = parsed;
      } else if (rawAmount.toLowerCase().includes('dr') || rawAmount.toLowerCase().includes('debit')) {
        type = 'expense';
        amount = parsed;
      } else if (parsed < 0) {
        type = 'expense';
        amount = Math.abs(parsed);
      } else {
        // Default based on value sign?
        // User didn't specify default. Let's assume +ve is income if unknown? 
        // Or assume expense for safety? Usually imports are mostly expenses. 
        // Let's stick to expense if ambiguous.
        type = 'expense';
        amount = parsed;
      }
    }

    return { amount, type };
  }

  private getCellValue(row: string[], index?: number): string {
    if (index === undefined || index < 0 || index >= row.length) return '';
    return String(row[index]).trim();
  }

  private isIgnorableRow(row: string[]): boolean {
    const start = String(row[0]).toLowerCase();
    return start.includes('total') || start.includes('opening') || start.includes('closing') || start.includes('balance');
  }

  private cleanDescription(desc: string): string {
    return desc.replace(/\s+/g, ' ').trim();
  }

  // Legacy/Helper
  public parseHDFCStatement(data: string[][]): ParsedTransaction[] {
    return this.parseGenericStatement(data);
  }

  private parseDate(dateStr: string): string {
    try {
      const cleanDate = dateStr.trim();
      if (!cleanDate) return '';

      // Try MM/DD/YYYY (USA) or DD/MM/YYYY (India/UK) detection
      if (cleanDate.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/)) {
        const parts = cleanDate.split(/[\/\-]/);
        let p1 = parseInt(parts[0]);
        let p2 = parseInt(parts[1]);
        const p3 = parts[2];
        let year = p3;

        // normalize year
        if (year.length === 2) year = parseInt(year) < 50 ? `20${year}` : `19${year}`;

        let day, month;

        // Logical inference
        if (p1 > 12) {
          day = p1;
          month = p2;
        } else if (p2 > 12) {
          day = p2;
          month = p1;
        } else {
          // Default to DD/MM 
          day = p1;
          month = p2;
        }

        // Validation
        if (month > 12) { // Swap if invalid
          const temp = month; month = day; day = temp;
        }

        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Excel serial date support? 
      // Often Excel returns numbers for dates (e.g. 45000). 
      // XLSX utils might handle this if raw: false. But we used header: 1 which returns raw values?
      // Actually sheet_to_json with header: 1 returns raw values (numbers/strings).
      // We converted everything to string in the map.
      // If we see a number-like string that is ~45000, it might be a date.
      if (!isNaN(Number(cleanDate)) && Number(cleanDate) > 35000 && Number(cleanDate) < 60000) {
        // Excel date epoch
        // Let's use XLSX utility if available? No, we don't have reference here easily.
        // Stick to simple attempt or fail.
        return new Date((Number(cleanDate) - 25569) * 86400000).toISOString().split('T')[0];
      }

      const date = new Date(cleanDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return '';
    } catch {
      return '';
    }
  }

  private parseAmount(amountStr: string): number {
    try {
      // Remove currency symbols, commas, spaces
      const cleanAmount = amountStr.replace(/[₹$,\s]/g, '');
      const amount = parseFloat(cleanAmount);
      return isNaN(amount) ? 0 : Math.abs(amount);
    } catch {
      return 0;
    }
  }

  private categorizeTransaction(_description: string, _type: 'income' | 'expense'): string {
    // Return empty string so that user's custom category rules 
    // can be applied in handleFileTransactionsParsed (Transactions.tsx)
    // The AutoCategorizationService will handle categorization with user rules
    return '';
  }
}

export const excelParser = new ExcelParser();