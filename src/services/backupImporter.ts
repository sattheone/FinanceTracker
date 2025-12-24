import { ParsedTransaction } from './excelParser';
import Papa from 'papaparse';

// Mapping for Backup-specific columns
const BACKUP_COLUMN_MAP = {
    date: ['date', 'txn date', 'transaction date', 'value date', 'created at', 'time'],
    description: ['description', 'narration', 'memo', 'message', 'note', 'notes', 'remarks'], // Notes often merged into desc or separate
    amount: ['amount', 'txn amount', 'value', 'total'],
    type: ['type', 'transaction type', 'txn type', 'cr/dr', 'direction'],
    category: ['category', 'category name', 'subcategory'],
    account: ['account', 'account name', 'wallet', 'pocket', 'source account'],
    tags: ['tags', 'labels', 'label'],
    notes: ['note', 'notes', 'memo', 'comment', 'remarks'] // Explicit notes column
};

export class BackupImporter {

    async parseBackupCSV(file: File): Promise<ParsedTransaction[]> {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true, // Backups usually have headers on row 1
                skipEmptyLines: true,
                transformHeader: (h) => h.toLowerCase().trim(), // Normalize headers
                complete: (results) => {
                    try {
                        const rawData = results.data as Record<string, string>[];
                        const transactions = this.processBackupData(rawData);
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

    private processBackupData(data: Record<string, string>[]): ParsedTransaction[] {
        const transactions: ParsedTransaction[] = [];

        // Detect column mapping based on first row keys? 
        // Actually PapaParse with header:true gives us keys.
        // We need to find which key corresponds to which internal field.
        if (data.length === 0) return [];

        const headers = Object.keys(data[0]);
        const map = this.detectColumnMapping(headers);

        console.log("Backup Import Mapping Detected:", map);

        if (!map.date || !map.amount) {
            throw new Error("Could not detect Date or Amount columns in the backup file.");
        }

        data.forEach(row => {
            try {
                const dateStr = row[map.date];
                const amountStr = row[map.amount];

                if (!dateStr || !amountStr) return;

                // Date Parsing
                const date = this.parseDate(dateStr);
                if (!date) return;

                // Amount & Type Parsing
                let amount = this.parseAmount(amountStr);
                let type: ParsedTransaction['type'] = 'expense'; // Default

                // If explicit type column exists
                if (map.type && row[map.type]) {
                    const typeRaw = row[map.type].toLowerCase();
                    if (typeRaw.includes('income') || typeRaw.includes('deposit') || typeRaw.includes('credit')) {
                        type = 'income';
                    } else if (typeRaw.includes('transfer')) {
                        // For now treat transfer as expense or income? 
                        // System has 'expense'/'income' for parsed types typically.
                        // But we can map to expense and category='Transfer'
                        type = 'expense';
                    } else {
                        type = 'expense';
                    }
                } else {
                    // Infer from amount sign
                    if (amount < 0) {
                        type = 'expense';
                        amount = Math.abs(amount);
                    } else {
                        // Backups often store income as +ve. 
                        // But some store expense as +ve too with type column.
                        // If no type column, assume +ve is Income? Or Expense? 
                        // Let's assume Income for +ve if we relied on sign.
                        type = 'income';
                    }
                }

                // Description
                let description = map.description ? row[map.description] : 'Imported Transaction';

                // Notes
                const notes = map.notes ? row[map.notes] : undefined;
                if (notes && description === 'Imported Transaction') description = notes;

                // Category
                const category = map.category ? row[map.category] : 'Uncategorized';

                // Account
                const accountName = map.account ? row[map.account] : undefined;

                // Tags
                let tags: string[] = [];
                if (map.tags && row[map.tags]) {
                    tags = row[map.tags].split(/[,|;]/).map(t => t.trim()).filter(Boolean);
                }

                transactions.push({
                    date,
                    amount,
                    description,
                    type,
                    category,
                    confidence: 1, // High confidence as it's from backup
                    accountName,
                    tags,
                    notes
                });

                // Debug log first few rows
                if (transactions.length <= 3) {
                    console.log(`[BackupImporter] Row ${transactions.length}:`, {
                        accountName, category, description, amount
                    });
                }

            } catch (err) {
                console.warn("Skipping row in backup import:", err);
            }
        });

        console.log(`[BackupImporter] Processed ${transactions.length} transactions. Sample Account: ${transactions[0]?.accountName}, Sample Category: ${transactions[0]?.category}`);

        return transactions;
    }

    private detectColumnMapping(headers: string[]): Record<string, string> {
        const map: Record<string, string> = {};

        const findMatch = (keys: string[]) => headers.find(h => keys.some(k => h === k || h.includes(k)));

        map.date = findMatch(BACKUP_COLUMN_MAP.date) || '';
        map.amount = findMatch(BACKUP_COLUMN_MAP.amount) || '';
        map.description = findMatch(BACKUP_COLUMN_MAP.description) || '';
        map.type = findMatch(BACKUP_COLUMN_MAP.type) || '';
        map.category = findMatch(BACKUP_COLUMN_MAP.category) || '';
        map.account = findMatch(BACKUP_COLUMN_MAP.account) || '';
        map.tags = findMatch(BACKUP_COLUMN_MAP.tags) || '';
        map.notes = findMatch(BACKUP_COLUMN_MAP.notes) || '';

        // Ensure Description and Notes don't pick same column if possible
        if (map.notes === map.description) delete map.notes;

        return map;
    }

    private parseDate(dateStr: string): string {
        // Reuse logic or simplified? Backups usually standard but let's be robust
        try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            return '';
        } catch { return ''; }
    }

    private parseAmount(amountStr: string): number {
        try {
            const clean = amountStr.replace(/[^-0-9.]/g, ''); // keep negative sign
            const val = parseFloat(clean);
            return isNaN(val) ? 0 : val;
        } catch { return 0; }
    }
}

export const backupImporter = new BackupImporter();
