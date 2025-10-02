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
}

export class ExcelParser {
  
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
      console.log('First 5 rows:', jsonData.slice(0, 5));
      
      const transactions = this.parseHDFCStatement(jsonData as any[][]);
      console.log('Parsed transactions count:', transactions.length);
      return transactions;
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      throw new Error('Failed to parse Excel file. Please check the file format.');
    }
  }

  async parseCSVFile(file: File): Promise<ParsedTransaction[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          try {
            const transactions = this.parseHDFCStatement(results.data as string[][]);
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

  private parseHDFCStatement(data: string[][]): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    let headerRowIndex = -1;
    
    // Find the header row - look for HDFC specific format
    // Headers: Date, Narration, Chq./Ref.No., Value Dt, Withdrawal Amt., Deposit Amt., Closing Balance
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row.length >= 6) {
        const firstCell = String(row[0]).toLowerCase().trim();
        const secondCell = String(row[1] || '').toLowerCase().trim();
        
        if (firstCell === 'date' && secondCell === 'narration') {
          headerRowIndex = i;
          console.log('Found HDFC header row at index:', i);
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find HDFC transaction header row. Please check if this is a valid HDFC bank statement.');
    }

    // Process transactions starting from the row after header
    // Skip the separator row (usually contains asterisks)
    let startRow = headerRowIndex + 1;
    if (startRow < data.length && String(data[startRow][0] || '').includes('*')) {
      startRow++;
    }

    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows, separator rows, or summary rows
      if (!row || row.length < 6 || 
          String(row[0] || '').includes('*') || 
          !row[0] || 
          String(row[0]).toLowerCase().includes('total') ||
          String(row[0]).toLowerCase().includes('balance') ||
          String(row[0]).toLowerCase().includes('opening') ||
          String(row[0]).toLowerCase().includes('closing')) {
        continue;
      }

      try {
        // HDFC format: [Date, Narration, Chq/Ref, Value Date, Withdrawal, Deposit, Balance]
        const dateStr = String(row[0]).trim();
        const description = String(row[1] || '').trim();
        const withdrawalStr = String(row[4] || '').trim();
        const depositStr = String(row[5] || '').trim();
        
        const date = this.parseDate(dateStr);
        
        if (!date || !description) {
          console.warn(`Skipping row ${i + 1}: Invalid date or description`);
          continue;
        }

        // Parse withdrawal amount (column 4)
        const withdrawal = withdrawalStr && this.isNumeric(withdrawalStr) ? 
          this.parseAmount(withdrawalStr) : 0;
        
        // Parse deposit amount (column 5)
        const deposit = depositStr && this.isNumeric(depositStr) ? 
          this.parseAmount(depositStr) : 0;

        // Create expense transaction if withdrawal exists
        if (withdrawal > 0) {
          transactions.push({
            date,
            description,
            amount: withdrawal,
            type: 'expense',
            category: this.categorizeTransaction(description, 'expense'),
            confidence: 0.9
          });
        }

        // Create income transaction if deposit exists
        if (deposit > 0) {
          transactions.push({
            date,
            description,
            amount: deposit,
            type: 'income',
            category: this.categorizeTransaction(description, 'income'),
            confidence: 0.9
          });
        }

        // Log successful parsing for debugging
        if (withdrawal > 0 || deposit > 0) {
          console.log(`Parsed transaction: ${date} - ${description} - W:${withdrawal} D:${deposit}`);
        }

      } catch (error) {
        console.warn(`Skipping row ${i + 1} due to parsing error:`, error);
        continue;
      }
    }

    console.log(`Successfully parsed ${transactions.length} transactions`);
    return transactions;
  }

  private parseDate(dateStr: string): string {
    try {
      // Handle various date formats
      const cleanDate = dateStr.trim();
      
      // Try DD/MM/YY format (HDFC format)
      if (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
        const [day, month, year] = cleanDate.split('/');
        // Convert 2-digit year to 4-digit (assuming 20xx for years 00-99)
        const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try DD/MM/YYYY format
      if (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [day, month, year] = cleanDate.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try DD-MM-YYYY format
      if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const [day, month, year] = cleanDate.split('-');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try DD-MM-YY format
      if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{2}$/)) {
        const [day, month, year] = cleanDate.split('-');
        const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Try parsing as a regular date
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
      // Remove currency symbols, commas, and extra spaces
      const cleanAmount = amountStr
        .replace(/[₹$,\s]/g, '')
        .replace(/[()]/g, '') // Remove parentheses
        .trim();
      
      const amount = parseFloat(cleanAmount);
      return isNaN(amount) ? 0 : Math.abs(amount);
    } catch {
      return 0;
    }
  }

  private isNumeric(str: string): boolean {
    const cleanStr = str.replace(/[₹$,\s()]/g, '');
    return !isNaN(parseFloat(cleanStr)) && isFinite(parseFloat(cleanStr));
  }



  private categorizeTransaction(description: string, type: 'income' | 'expense'): string {
    const lowerDesc = description.toLowerCase();
    
    if (type === 'income') {
      if (lowerDesc.includes('salary')) return 'Salary';
      if (lowerDesc.includes('interest')) return 'Interest';
      if (lowerDesc.includes('dividend')) return 'Dividend';
      if (lowerDesc.includes('refund')) return 'Refund';
      return 'Other Income';
    } else {
      // Expense categorization
      if (lowerDesc.includes('atm') || lowerDesc.includes('cash')) return 'Cash Withdrawal';
      if (lowerDesc.includes('grocery') || lowerDesc.includes('supermarket')) return 'Food';
      if (lowerDesc.includes('fuel') || lowerDesc.includes('petrol')) return 'Transportation';
      if (lowerDesc.includes('electricity') || lowerDesc.includes('water') || lowerDesc.includes('gas')) return 'Utilities';
      if (lowerDesc.includes('medical') || lowerDesc.includes('hospital')) return 'Healthcare';
      if (lowerDesc.includes('school') || lowerDesc.includes('education')) return 'Education';
      if (lowerDesc.includes('insurance')) return 'Insurance';
      if (lowerDesc.includes('sip') || lowerDesc.includes('mutual fund')) return 'Investment';
      if (lowerDesc.includes('emi') || lowerDesc.includes('loan')) return 'Loan';
      return 'Other Expense';
    }
  }
}

export const excelParser = new ExcelParser();