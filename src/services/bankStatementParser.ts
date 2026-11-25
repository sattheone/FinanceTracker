import { Transaction } from '../types';
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
  // Only set when one PDF covers several accounts (e.g. all accounts under one customer ID).
  // `transactions` then holds every section's rows, each tagged with statementSectionId.
  sections?: BankStatementSection[];
}

// Totals printed in a statement's summary block, used to sanity-check what was parsed
export interface StatementSummaryTotals {
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
  debitCount?: number;
  creditCount?: number;
}

// One account's part of a multi-account statement (no transactions - safe to pass to UI state)
export interface StatementSectionInfo {
  id: string;
  accountLast4: string;
  accountNumberMasked: string; // e.g. "••1234"
  // Account number as printed in the section header - may itself be masked ("XXXX1234").
  // Used to spot transfers between the statement's accounts and to prefill new accounts.
  accountNumber?: string;
  bankName?: string;
  openingBalance?: number;
  closingBalance?: number;
  transactionCount: number;
  warnings: string[];
}

export interface BankStatementSection extends StatementSectionInfo {
  transactions: ParsedTransaction[];
  summary?: StatementSummaryTotals;
}

export interface StatementParserStrategy {
  name: string;
  identifiers: string[];
  parse: (text: string) => BankStatementData;
}

class BankStatementParser {
  private strategies: StatementParserStrategy[] = [];

  constructor() {
    this.registerStrategy(this.createHDFCStandardStrategy());
    this.registerStrategy(this.createICICIStrategy());
    this.registerStrategy(this.createSBIStrategy());
    this.registerStrategy(this.createAxisStrategy());
    this.registerStrategy(this.createGenericStrategy());
  }

  public registerStrategy(strategy: StatementParserStrategy) {
    this.strategies.push(strategy);
  }

  public async parseStatement(pdfText: string): Promise<BankStatementData> {
    console.log('🏦 Parsing bank statement...');

    // 1. Detect Strategy
    const strategy = this.detectStrategy(pdfText);
    console.log(`Using parsing strategy: ${strategy.name}`);

    try {
      // 2. A PDF covering several accounts is parsed one account section at a time so
      //    running balances and summaries don't bleed across accounts
      const sectionTexts = this.splitAccountSections(pdfText);
      if (sectionTexts) {
        console.log(`Statement covers ${sectionTexts.length} accounts`);
        return this.parseMultiAccountStatement(strategy, sectionTexts);
      }

      // 3. Execute Strategy
      return strategy.parse(pdfText);
    } catch (error) {
      console.error(`Error parsing with ${strategy.name}:`, error);
      throw new Error(`Failed to parse bank statement using ${strategy.name} format.`);
    }
  }

  private detectStrategy(text: string): StatementParserStrategy {
    // Statements often mention other banks in transaction narrations (e.g. a UPI
    // transfer to an ICICI account inside an SBI statement). Among the strategies
    // whose identifiers all match, prefer the one whose primary identifier appears
    // earliest - i.e. in the statement's own header rather than in a narration.
    const lowerText = text.toLowerCase();
    let best: StatementParserStrategy | null = null;
    let bestPosition = Infinity;

    for (const strategy of this.strategies) {
      if (strategy.name === 'Generic') continue; // Check specific ones first

      const isMatch = strategy.identifiers.every(id =>
        lowerText.includes(id.toLowerCase())
      );
      if (!isMatch) continue;

      const position = lowerText.indexOf(strategy.identifiers[0].toLowerCase());
      if (position < bestPosition) {
        best = strategy;
        bestPosition = position;
      }
    }

    // Fallback to Generic
    return best || this.strategies.find(s => s.name === 'Generic')!;
  }

  // --- Multi-account statements ---

  /**
   * Split a statement into per-account sections using "Account Number : ..." style
   * headers (Account No / Number, A/c No, Acct No). Pages repeating the same account
   * number are grouped together. Returns null when fewer than two distinct accounts are
   * found, so single-account statements keep the normal parsing path.
   *
   * A line only counts as an account header when a transaction table header
   * ("Txn Date ... Balance") follows it before any transaction row - an account number
   * mentioned inside a narration is followed by more rows, not by a table header.
   */
  private splitAccountSections(text: string): { accountNumber: string; text: string }[] | null {
    const lines = text.split('\n');
    const headerPattern = /(?:^|[^A-Za-z])(?:Account|A\/c|Acct)\.?\s*(?:No|Number|Num)\b\.?\s*[:\-]?\s*([Xx*•]*\d[\d-]{6,22}\d)(?![\d-])/i;
    const tableHeaderPattern = /\bDate\b.*\b(?:Balance|Narration|Description|Particulars|Withdrawals?|Deposits?)\b/i;
    const rowPattern = /^\s*\d{2}[\/\-]\d{2}[\/\-]\d{2,4}\s+.*\d\.\d{2}\b/;

    const isAccountHeader = (index: number): boolean => {
      for (let j = index + 1; j < Math.min(lines.length, index + 40); j++) {
        if (tableHeaderPattern.test(lines[j])) return true;
        if (rowPattern.test(lines[j])) return false;
      }
      return false;
    };

    const order: string[] = [];
    const sectionLines = new Map<string, string[]>();
    let currentKey: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!rowPattern.test(line)) {
        const match = line.match(headerPattern);
        if (match) {
          const accountNumber = match[1].replace(/-/g, '').toUpperCase();
          const digits = accountNumber.replace(/\D/g, '');
          if (digits.length >= 4 && accountNumber.length >= 9 && /\d{4}$/.test(accountNumber) && isAccountHeader(i)) {
            currentKey = accountNumber;
            if (!sectionLines.has(currentKey)) {
              sectionLines.set(currentKey, []);
              order.push(currentKey);
            }
          }
        }
      }
      // Lines before the first account header (customer details, relationship summary) are skipped
      if (currentKey) sectionLines.get(currentKey)!.push(line);
    }

    if (order.length < 2) return null;
    return order.map(accountNumber => ({ accountNumber, text: sectionLines.get(accountNumber)!.join('\n') }));
  }

  private parseMultiAccountStatement(
    strategy: StatementParserStrategy,
    sectionTexts: { accountNumber: string; text: string }[]
  ): BankStatementData {
    const parsedSections = sectionTexts.map(s => ({ ...s, data: strategy.parse(s.text) }));

    const sections: BankStatementSection[] = parsedSections.map((s, index) => {
      const id = `section-${index + 1}`;
      const accountLast4 = s.accountNumber.slice(-4);
      const summary = this.extractStatementSummary(s.text) || undefined;
      const transactions = s.data.transactions.map(t => ({ ...t, statementSectionId: id }));

      return {
        id,
        accountLast4,
        accountNumberMasked: `••${accountLast4}`,
        accountNumber: s.accountNumber,
        bankName: s.data.bankName,
        openingBalance: summary?.openingBalance ?? (s.data.openingBalance || undefined),
        closingBalance: summary?.closingBalance ?? (s.data.closingBalance || undefined),
        transactionCount: transactions.length,
        warnings: summary ? this.checkAgainstSummary(transactions, summary) : [],
        transactions,
        summary
      };
    });

    const first = parsedSections[0].data;
    const froms = parsedSections.map(s => s.data.statementPeriod.from).filter(Boolean).sort();
    const tos = parsedSections.map(s => s.data.statementPeriod.to).filter(Boolean).sort();

    return {
      accountNumber: sections.map(s => s.accountNumberMasked).join(', '),
      accountHolder: first.accountHolder,
      statementPeriod: { from: froms[0] || first.statementPeriod.from, to: tos[tos.length - 1] || first.statementPeriod.to },
      openingBalance: 0,
      closingBalance: 0,
      transactions: sections.flatMap(s => s.transactions),
      bankName: first.bankName,
      sections
    };
  }

  public toSectionInfos(sections?: BankStatementSection[]): StatementSectionInfo[] | undefined {
    if (!sections || sections.length < 2) return undefined;
    return sections.map(({ transactions: _transactions, summary: _summary, ...info }) => info);
  }

  /**
   * Statement summary block, e.g.
   *   "Opening Balance  Debit Amount  Credit Amount  Closing Balance" / 4 amounts
   *   "Debit Count  Credit Count" / 2 counts
   * or the older single-row form: opening, Dr count, Cr count, debits, credits, closing.
   */
  private extractStatementSummary(text: string): StatementSummaryTotals | null {
    const amt = '((?:\\d{1,3}(?:,\\d{2,3})+|\\d+)\\.\\d{2})';
    const columns = text.match(new RegExp(
      `Opening\\s+Balance\\s+Debits?\\s+Amount\\s+Credits?\\s+Amount\\s+Closing\\s+Balance\\s*\\n\\s*${amt}\\s+${amt}\\s+${amt}\\s+${amt}`, 'i'
    ));
    if (columns) {
      const counts = text.match(/(?:Debit|Dr)\s+Count\s+(?:Credit|Cr)\s+Count\s*\n\s*(\d+)\s+(\d+)/i);
      return {
        openingBalance: this.parseAmount(columns[1]),
        debitTotal: this.parseAmount(columns[2]),
        creditTotal: this.parseAmount(columns[3]),
        closingBalance: this.parseAmount(columns[4]),
        debitCount: counts ? parseInt(counts[1], 10) : undefined,
        creditCount: counts ? parseInt(counts[2], 10) : undefined
      };
    }

    const singleRow = text.match(new RegExp(`${amt}\\s+(\\d+)\\s+(\\d+)\\s+${amt}\\s+${amt}\\s+${amt}`));
    if (singleRow) {
      return {
        openingBalance: this.parseAmount(singleRow[1]),
        debitCount: parseInt(singleRow[2], 10),
        creditCount: parseInt(singleRow[3], 10),
        debitTotal: this.parseAmount(singleRow[4]),
        creditTotal: this.parseAmount(singleRow[5]),
        closingBalance: this.parseAmount(singleRow[6])
      };
    }

    return null;
  }

  private checkAgainstSummary(transactions: ParsedTransaction[], summary: StatementSummaryTotals): string[] {
    const toPaise = (n: number) => Math.round(n * 100);
    const debits = transactions.filter(t => t.type === 'expense');
    const credits = transactions.filter(t => t.type === 'income');
    const debitTotal = debits.reduce((sum, t) => sum + toPaise(t.amount), 0);
    const creditTotal = credits.reduce((sum, t) => sum + toPaise(t.amount), 0);
    const format = (paise: number) => (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const warnings: string[] = [];
    const countsMismatch =
      (summary.debitCount !== undefined && summary.debitCount !== debits.length) ||
      (summary.creditCount !== undefined && summary.creditCount !== credits.length);
    if (countsMismatch) {
      warnings.push(
        `Statement summary lists ${summary.debitCount ?? '?'} debits and ${summary.creditCount ?? '?'} credits, ` +
        `but ${debits.length} debits and ${credits.length} credits were read.`
      );
    }
    if (debitTotal !== toPaise(summary.debitTotal) || creditTotal !== toPaise(summary.creditTotal)) {
      warnings.push(
        `Statement summary totals (debits ₹${format(toPaise(summary.debitTotal))}, credits ₹${format(toPaise(summary.creditTotal))}) ` +
        `don't match what was read (debits ₹${format(debitTotal)}, credits ₹${format(creditTotal)}). Some rows may be missing or misread.`
      );
    }
    return warnings;
  }

  // --- HDFC Standard Strategy ---
  private createHDFCStandardStrategy(): StatementParserStrategy {
    return {
      name: 'HDFC Standard',
      // 'Account N' matches both "Account No" and the newer "Account Number" header
      identifiers: ['HDFC BANK', 'Account N'],
      parse: (text: string) => {
        // ... (Existing logic moved here) ...
        const patterns = {
          accountNumber: /Account\s+(?:No|Number)\.?[:\s]+(\d{11,16})/i,
          accountHolder: /Account\s+Holder[:\s]+([A-Z\s]+)/i,
          statementPeriod: /Statement\s+(?:Period|From)[:\s]+(\d{2}\/\d{2}\/\d{2,4})\s+to\s+(\d{2}\/\d{2}\/\d{2,4})/i,
          openingBalance: /Opening\s+Balance[:\s]+(?:Rs\.?\s*)?([0-9,]+\.?\d*)/i,
          closingBalance: /Closing\s+Balance[:\s]+(?:Rs\.?\s*)?([0-9,]+\.?\d*)/i,
          summaryTable: /([0-9,]+\.\d{2})\s+\d+\s+\d+\s+[0-9,]+\.\d{2}\s+[0-9,]+\.\d{2}\s+[0-9,]+\.\d{2}/,
          transactionLineStandard: /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([0-9,]+\.?\d*)\s+(Dr|Cr)\s+([0-9,]+\.?\d*)/,
          transactionLineColumnar: /^(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{2,4})\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})/,
          // Txn Date | Narration | Withdrawals | Deposits | Closing Balance (narration may wrap onto following lines)
          transactionLineThreeColumn: /^(\d{2}\/\d{2}\/\d{2,4})\s+(.*?)\s+((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})\s+((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})\s+((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})\s*$/
        };

        const accountNumber = this.extractPattern(text, patterns.accountNumber) || 'Unknown';
        const accountHolder = this.extractPattern(text, patterns.accountHolder) || 'Unknown';

        const periodMatch = text.match(patterns.statementPeriod);
        const statementPeriod = periodMatch ? {
          from: this.convertDateFormat(periodMatch[1]),
          to: this.convertDateFormat(periodMatch[2])
        } : {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        };

        let openingBalance = this.parseAmount(this.extractPattern(text, patterns.openingBalance) || '0');
        let closingBalance = this.parseAmount(this.extractPattern(text, patterns.closingBalance) || '0');

        // Newer layout: "Opening Balance : x" sits in the account header and the closing
        // balance only appears in the SUMMARY block (the "Closing Balance" column header
        // would otherwise be read as a value)
        if (new RegExp(patterns.transactionLineThreeColumn.source, 'm').test(text)) {
          const summary = this.extractStatementSummary(text);
          if (summary && openingBalance === 0) openingBalance = summary.openingBalance;
          closingBalance = summary ? summary.closingBalance : 0;
        }

        if (openingBalance === 0) {
          const summaryMatch = text.match(patterns.summaryTable);
          if (summaryMatch) {
            openingBalance = this.parseAmount(summaryMatch[1]);
          }
        }

        const transactions = this.extractHDFCTransactions(text, openingBalance, patterns);

        return {
          accountNumber,
          accountHolder,
          statementPeriod,
          openingBalance,
          closingBalance,
          transactions,
          bankName: 'HDFC Bank'
        };
      }
    };
  }

  // --- ICICI Bank Strategy ---
  private createICICIStrategy(): StatementParserStrategy {
    return {
      name: 'ICICI Bank',
      identifiers: ['ICICI Bank'],
      parse: (text: string) => {
        const patterns = {
          accountNumber: /(?:Account\s*(?:No|Number)|A\/C\s*No)[:\s]+(\d{10,16})/i,
          accountHolder: /(?:Name|Account\s*Holder)[:\s]+([A-Z\s\.]+)/i,
          statementPeriod: /(?:Period|Statement\s*Period)[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\s+to\s+(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
        };

        const accountNumber = this.extractPattern(text, patterns.accountNumber) || 'Unknown';
        const accountHolder = this.extractPattern(text, patterns.accountHolder) || 'Unknown';

        const periodMatch = text.match(patterns.statementPeriod);
        const statementPeriod = periodMatch ? {
          from: this.convertDateFormat(periodMatch[1]),
          to: this.convertDateFormat(periodMatch[2])
        } : {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        };

        const transactions: ParsedTransaction[] = [];
        const lines = text.split('\n');
        // Date regex: DD/MM/YYYY or DD-MM-YYYY
        const datePattern = /^(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\s+(.+)/;
        let previousBalance: number | null = null;

        for (const line of lines) {
          const match = line.trim().match(datePattern);
          if (!match) continue;

          const dateStr = match[1];
          const rest = match[2];

          // Check for amounts: could have withdrawal, deposit, balance
          const amountMatches = this.matchCurrencyAmounts(rest);
          if (amountMatches.length === 0) continue;

          const date = this.convertDateFormat(dateStr);

          // Clean description by stripping out amounts
          let desc = rest;
          amountMatches.forEach(amt => {
            desc = desc.replace(amt.raw, '');
          });

          const { amount, isCredit, balance } = this.resolveAmountAndType(
            rest, amountMatches, previousBalance, /\b(?:cr|credit|deposit)\b/i, /\b(?:dr|debit)\b/i
          );
          if (balance !== null) previousBalance = balance;

          if (amount > 0) {
            transactions.push({
              date,
              description: this.cleanDescription(desc),
              amount,
              type: isCredit ? 'income' : 'expense',
              category: '',
              confidence: 0.85
            });
          }
        }

        return {
          accountNumber,
          accountHolder,
          statementPeriod,
          openingBalance: 0,
          closingBalance: 0,
          transactions,
          bankName: 'ICICI Bank'
        };
      }
    };
  }

  // --- State Bank of India (SBI) Strategy ---
  private createSBIStrategy(): StatementParserStrategy {
    return {
      name: 'State Bank of India',
      identifiers: ['State Bank of India'],
      parse: (text: string) => {
        const patterns = {
          accountNumber: /(?:Account\s*No|A\/C\s*No)[:\s]+(\d{10,18})/i,
          accountHolder: /(?:Account\s*Name|Name)[:\s]+([A-Z\s\.]+)/i,
          statementPeriod: /(?:Statement\s*Period|Period)[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\s+to\s+(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
        };

        const accountNumber = this.extractPattern(text, patterns.accountNumber) || 'Unknown';
        const accountHolder = this.extractPattern(text, patterns.accountHolder) || 'Unknown';

        const periodMatch = text.match(patterns.statementPeriod);
        const statementPeriod = periodMatch ? {
          from: this.convertDateFormat(periodMatch[1]),
          to: this.convertDateFormat(periodMatch[2])
        } : {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        };

        const transactions: ParsedTransaction[] = [];
        const lines = text.split('\n');
        // SBI format usually: Txn Date | Value Date | Description | Ref | Debit | Credit | Balance
        const datePattern = /(\d{2}[\/\-\s][A-Za-z0-9]{2,3}[\/\-\s]\d{2,4})/;
        let previousBalance: number | null = null;

        for (const line of lines) {
          const dateMatch = line.match(datePattern);
          if (!dateMatch) continue;

          const amountMatches = this.matchCurrencyAmounts(line.replace(dateMatch[0], ' '));
          if (amountMatches.length === 0) continue;

          const date = this.convertDateFormat(dateMatch[1]);

          let desc = line.replace(dateMatch[0], '');
          amountMatches.forEach(amt => {
            desc = desc.replace(amt.raw, '');
          });

          const { amount, isCredit, balance } = this.resolveAmountAndType(
            line, amountMatches, previousBalance, /\b(?:cr|credit|transfer\s+from|by\s+transfer)\b/i, /\b(?:dr|debit|transfer\s+to|to\s+transfer)\b/i
          );
          if (balance !== null) previousBalance = balance;

          if (amount > 0) {
            transactions.push({
              date,
              description: this.cleanDescription(desc),
              amount,
              type: isCredit ? 'income' : 'expense',
              category: '',
              confidence: 0.85
            });
          }
        }

        return {
          accountNumber,
          accountHolder,
          statementPeriod,
          openingBalance: 0,
          closingBalance: 0,
          transactions,
          bankName: 'State Bank of India'
        };
      }
    };
  }

  // --- Axis Bank Strategy ---
  private createAxisStrategy(): StatementParserStrategy {
    return {
      name: 'Axis Bank',
      identifiers: ['Axis Bank'],
      parse: (text: string) => {
        const patterns = {
          accountNumber: /(?:Account\s*No|A\/C\s*No)[:\s]+(\d{12,18})/i,
          accountHolder: /(?:Name|Customer\s*Name)[:\s]+([A-Z\s\.]+)/i,
        };

        const accountNumber = this.extractPattern(text, patterns.accountNumber) || 'Unknown';
        const accountHolder = this.extractPattern(text, patterns.accountHolder) || 'Unknown';

        const transactions: ParsedTransaction[] = [];
        const lines = text.split('\n');
        const datePattern = /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/;
        let previousBalance: number | null = null;

        for (const line of lines) {
          const dateMatch = line.match(datePattern);
          if (!dateMatch) continue;

          const amountMatches = this.matchCurrencyAmounts(line.replace(dateMatch[0], ' '));
          if (amountMatches.length === 0) continue;

          const date = this.convertDateFormat(dateMatch[1]);

          let desc = line.replace(dateMatch[0], '');
          amountMatches.forEach(amt => {
            desc = desc.replace(amt.raw, '');
          });

          const { amount, isCredit, balance } = this.resolveAmountAndType(
            line, amountMatches, previousBalance, /\b(?:cr|credit)\b/i, /\b(?:dr|debit)\b/i
          );
          if (balance !== null) previousBalance = balance;

          if (amount > 0) {
            transactions.push({
              date,
              description: this.cleanDescription(desc),
              amount,
              type: isCredit ? 'income' : 'expense',
              category: '',
              confidence: 0.85
            });
          }
        }

        return {
          accountNumber,
          accountHolder,
          statementPeriod: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0]
          },
          openingBalance: 0,
          closingBalance: 0,
          transactions,
          bankName: 'Axis Bank'
        };
      }
    };
  }

  // --- Generic Strategy ---
  private createGenericStrategy(): StatementParserStrategy {
    return {
      name: 'Generic',
      identifiers: [],
      parse: (text: string) => {
        console.log("Using Generic Parser strategy");

        // Generic patterns
        // Look for lines with Date ... Amount or Amount ... Date
        // DD/MM/YYYY or YYYY-MM-DD
        const datePattern = /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/;
        // Amount with commas
        const amountPattern = /([0-9,]+\.\d{2})/;

        const lines = text.split('\n');
        const transactions: ParsedTransaction[] = [];

        for (const line of lines) {
          const dateMatch = line.match(datePattern);
          const amountMatches = line.match(new RegExp(amountPattern, 'g')); // Find all amounts

          if (dateMatch && amountMatches && amountMatches.length > 0) {
            // Simple heurestics: 
            // If there's a 'Dr' or 'Cr', use that.
            // Otherwise, assume the last number is the balance and second last is transaction amount? Or just 1 amount.

            const date = this.convertDateFormat(dateMatch[1]);
            const description = line.replace(dateMatch[0], '').replace(amountPattern, '').trim();

            let amount = 0;
            let type: 'income' | 'expense' = 'expense';

            // If 'Cr' is present, income.
            if (line.toLowerCase().includes(' cr')) {
              type = 'income';
            }

            // Pick the largest amount found on the line as the transaction amount (risky but better than nothing)
            const parsedAmounts = amountMatches.map(a => this.parseAmount(a));
            amount = Math.max(...parsedAmounts);

            if (amount > 0) {
              transactions.push({
                date,
                description: this.cleanDescription(description),
                amount,
                type,
                category: '',
                confidence: 0.5
              });
            }
          }
        }

        return {
          accountNumber: 'Unknown',
          accountHolder: 'Unknown',
          statementPeriod: { from: '', to: '' },
          openingBalance: 0,
          closingBalance: 0,
          transactions,
          bankName: 'Generic Import'
        };
      }
    };
  }

  // Reuse existing helper methods (made public/protected or just copied logic if we want strict decoupling)
  // For now, I'll keep them as private methods on the class and call them from strategies if I bind correctly, 
  // OR just duplicate parsing logic into the strategy closures. 
  // To avoid `this` issues, I'll use arrow functions in strategies or pass helper as arg.
  // Actually, better to keep helpers as private methods of the class and invoke `this.helper()` inside arrow functions.

  private extractHDFCTransactions(pdfText: string, openingBalance: number, patterns: any): ParsedTransaction[] {
    const rawTransactions: any[] = [];
    const lines = pdfText.split('\n');
    // Wrapped narration lines of the last three-column row, until a page/section boundary
    let continuation: { parts: string[] } | null = null;
    const boundaryPattern = /^(?:SUMMARY\b|Page\s+\d+\s+of\s+\d+|Txn\s+Date\b|Date\s+Narration|Opening\s+Balance|Closing\s+Balance|Statement\s+(?:From|Period|of|Summary)|Account\s+(?:No|Number|Branch|Type)|Customer\s+ID|Debit\s+Count|Total\s|\*)/i;
    const MAX_CONTINUATION_LINES = 4;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Try standard match first
      const stdMatch = line.match(patterns.transactionLineStandard);
      if (stdMatch) {
        continuation = null;
        const [, date, description, amount, type, balance] = stdMatch;
        rawTransactions.push({
          date: this.convertDateFormat(date),
          description: this.cleanDescription(description),
          amount: this.parseAmount(amount),
          type: type.toLowerCase() === 'cr' ? 'income' : 'expense',
          category: '',
          confidence: 0.9,
          balance: this.parseAmount(balance),
          format: 'standard'
        });
        continue;
      }

      // Withdrawals | Deposits | Closing Balance - direction resolved below from the columns
      const threeColMatch = line.match(patterns.transactionLineThreeColumn);
      if (threeColMatch) {
        const [, date, description, withdrawal, deposit, balance] = threeColMatch;
        const raw = {
          date: this.convertDateFormat(date),
          descriptionParts: [description],
          amountText: `${withdrawal} ${deposit} ${balance}`,
          balance: this.parseAmount(balance),
          format: 'threeColumn'
        };
        rawTransactions.push(raw);
        continuation = { parts: raw.descriptionParts };
        continue;
      }

      // Try columnar match
      const colMatch = line.match(patterns.transactionLineColumnar);
      if (colMatch) {
        continuation = null;
        const [, date, description, , amount, balance] = colMatch;
        rawTransactions.push({
          date: this.convertDateFormat(date),
          description: this.cleanDescription(description),
          amount: this.parseAmount(amount),
          type: 'unknown',
          confidence: 0.8,
          balance: this.parseAmount(balance),
          format: 'columnar'
        });
        continue;
      }

      // Narration continuation of the previous three-column row
      if (continuation) {
        if (boundaryPattern.test(line) || continuation.parts.length > MAX_CONTINUATION_LINES) {
          continuation = null;
        } else {
          continuation.parts.push(line);
        }
      }
    }

    // Post-process types (same logic as before)
    // ... (I will simplify this part for brevity but keep core logic)
    const transactions: ParsedTransaction[] = [];
    let currentBalance = openingBalance;

    for (const raw of rawTransactions) {
      if (raw.format === 'threeColumn') {
        const { amount, isCredit, balance } = this.resolveAmountAndType(
          raw.amountText, this.matchCurrencyAmounts(raw.amountText), currentBalance, /$^/, /$^/
        );
        if (amount > 0) {
          transactions.push({
            date: raw.date,
            description: this.cleanDescription(this.stripNarrationNoise(raw.descriptionParts.join(' '))),
            amount,
            type: isCredit ? 'income' : 'expense',
            category: '',
            confidence: 0.9
          });
        }
        if (balance !== null) currentBalance = balance;
      } else if (raw.type === 'unknown') {
        const txBalance = raw.balance;
        let type: 'income' | 'expense' = 'expense';
        // Logic: Prev - Amount = Curr => Expense
        if (Math.abs((currentBalance - raw.amount) - txBalance) < 1) {
          type = 'expense';
        } else if (Math.abs((currentBalance + raw.amount) - txBalance) < 1) {
          type = 'income';
        }
        transactions.push({ ...raw, type, balance: undefined });
        currentBalance = txBalance;
      } else {
        transactions.push(raw);
        if (raw.balance) currentBalance = raw.balance;
      }
    }

    return transactions;
  }

  // --- Helpers ---

  /**
   * Currency-looking amounts on a line: exactly two decimals, optional Indian/
   * Western thousands separators, and not embedded in a longer token (so parts of
   * reference numbers, dates like 01.02.24 or IDs like ABC123.45 are ignored).
   * Each match also reports an adjacent Dr/Cr marker if one follows it.
   */
  private matchCurrencyAmounts(text: string): { raw: string; value: number; marker: 'dr' | 'cr' | null }[] {
    const pattern = /(^|[\s(:])((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})(?:\s*\(?\s*(Dr|Cr)\b\.?\)?)?(?=$|[\s)])/gi;
    const results: { raw: string; value: number; marker: 'dr' | 'cr' | null }[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      results.push({
        raw: match[2],
        value: this.parseAmount(match[2]),
        marker: match[3] ? (match[3].toLowerCase() as 'dr' | 'cr') : null
      });
    }
    return results;
  }

  /**
   * Work out the transaction amount and direction for one statement row.
   * - With 2+ amounts the last one is the running balance; with 3+ amounts the two
   *   before it are the Debit/Withdrawal and Credit/Deposit columns (in that order).
   * - Direction preference: Dr/Cr marker next to the amount, change in running
   *   balance, column position, then whole-word keywords in the narration.
   */
  private resolveAmountAndType(
    line: string,
    amountMatches: { raw: string; value: number; marker: 'dr' | 'cr' | null }[],
    previousBalance: number | null,
    creditKeywords: RegExp,
    debitKeywords: RegExp
  ): { amount: number; isCredit: boolean; balance: number | null } {
    const hasBalance = amountMatches.length >= 2;
    const balance = hasBalance ? amountMatches[amountMatches.length - 1].value : null;
    const txnColumns = hasBalance ? amountMatches.slice(0, -1) : amountMatches;

    let amountEntry = txnColumns[txnColumns.length - 1];
    let columnCredit: boolean | null = null;

    // Separate Debit and Credit columns, one of them empty/zero
    if (txnColumns.length >= 2) {
      const debitCol = txnColumns[txnColumns.length - 2];
      const creditCol = txnColumns[txnColumns.length - 1];
      if (debitCol.value > 0 && creditCol.value === 0) {
        amountEntry = debitCol;
        columnCredit = false;
      } else if (creditCol.value > 0 && debitCol.value === 0) {
        amountEntry = creditCol;
        columnCredit = true;
      }
    }

    const amount = amountEntry.value;

    let isCredit: boolean;
    if (amountEntry.marker) {
      isCredit = amountEntry.marker === 'cr';
    } else if (balance !== null && previousBalance !== null && Math.abs(previousBalance + amount - balance) < 0.01) {
      isCredit = true;
    } else if (balance !== null && previousBalance !== null && Math.abs(previousBalance - amount - balance) < 0.01) {
      isCredit = false;
    } else if (columnCredit !== null) {
      isCredit = columnCredit;
    } else {
      // Ignore Dr/Cr markers attached to other amounts (e.g. "10,500.00 Cr" balance)
      // and "CREDIT CARD PAYMENT", which is money going out of this account
      const narration = line
        .replace(/(\d\.\d{2})\s*\(?\s*(?:Dr|Cr)\b\.?\)?/gi, '$1')
        .replace(/credit\s+card/gi, ' ');
      isCredit = creditKeywords.test(narration) && !debitKeywords.test(narration);
    }

    return { amount, isCredit, balance };
  }

  // Drop "Value Dt dd/mm/yyyy Ref 1234..." trailers that statements print under each narration
  private stripNarrationNoise(narration: string): string {
    // "Value" may be glued to the end of the narration when the PDF wraps mid-word
    return narration.replace(/\s*Value\s+Dt(?:\s+\d{2}\/\d{2}\/\d{2,4}|\s*$).*$/i, '').trim() || narration;
  }

  private extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  private convertDateFormat(dateStr: string): string {
    if (!dateStr) return '';
    // Handle YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    const [day, month, year] = dateStr.split(/[\/\-]/);
    if (!day || !month || !year) return dateStr;

    let fullYear = year;
    if (year.length === 2) {
      fullYear = '20' + year;
    }
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(/,/g, '')) || 0;
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-\.\/\@\&\(\)\:\#\,\+\?]/g, '')
      .trim()
      .substring(0, 200);
  }

  // Keep original method for backward compatibility if needed, but alias it
  public async parseHDFCStatement(pdfText: string): Promise<BankStatementData> {
    return this.parseStatement(pdfText);
  }

  // AI-powered PDF text extraction (using pdfjs-dist)
  public async extractTextFromPDF(base64Data: string, password?: string | string[]): Promise<string> {
    try {
      // Dynamically import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');

      // Configure worker using CDN - this is the most reliable approach for bundled environments
      // Version 5.x uses ES modules, use the CDN worker that matches
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        // Use unpkg CDN which hosts the exact version we need
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }

      // Convert base64 to Uint8Array
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Normalize candidate passwords
      const rawCandidates = Array.isArray(password) ? password : (password ? [password] : []);
      const candidatePasswords = rawCandidates.map(p => (p || '').trim()).filter(Boolean);
      // The first candidate is passed to getDocument; onPassword feeds the rest
      let attemptIndex = 1;
      let passwordsExhausted = false;

      // Load the PDF document
      console.log('Loading PDF document... Candidate passwords available:', candidatePasswords.length);
      const loadingTask = pdfjsLib.getDocument({
        data: bytes,
        password: candidatePasswords[0] || ''
      });

      loadingTask.onPassword = (updatePassword: any, reason: any) => {
        console.log('Password requested by PDF.js. Reason:', reason, 'Candidates left:', candidatePasswords.length - attemptIndex);
        if (attemptIndex < candidatePasswords.length) {
          const nextPassword = candidatePasswords[attemptIndex++];
          console.log(`Unlocking PDF with candidate password #${attemptIndex}`);
          updatePassword(nextPassword);
        } else {
          // Calling updatePassword('') here would make PDF.js ask again forever,
          // so abort the load and report that a password is needed
          console.log('No password provided or all candidate passwords failed');
          passwordsExhausted = true;
          loadingTask.destroy();
        }
      };

      let pdf;
      try {
        pdf = await loadingTask.promise;
      } catch (loadError) {
        if (passwordsExhausted) {
          throw new Error('PASSWORD_REQUIRED');
        }
        throw loadError;
      }
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
      if (
        error.name === 'PasswordException' ||
        error.message?.includes('Password') ||
        error.message?.includes('PASSWORD') ||
        error.code === 1
      ) {
        throw new Error('PASSWORD_REQUIRED');
      }

      throw new Error('Failed to extract text from PDF: ' + (error.message || 'Unknown error'));
    }
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
          statementData.bankName.toLowerCase().replace(/\s/g, '_'),
        ],
        source: 'gmail-import',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          bankName: statementData.bankName
        }
      };

      return {
        ...baseTransaction,
        category: ''
      };
    });
  }
}

export default new BankStatementParser();