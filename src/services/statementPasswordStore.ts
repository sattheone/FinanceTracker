/**
 * Device-local store for bank statement PDF passwords, keyed by bank account ID.
 *
 * Statement passwords are often derived from PAN / DOB / Customer ID, so they are
 * deliberately kept out of Firestore. They live only in this browser's localStorage.
 */
const STORAGE_KEY = 'statementPasswords';

const readAll = (): Record<string, string> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const writeAll = (passwords: Record<string, string>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
  } catch (error) {
    console.error('Failed to save statement passwords locally:', error);
  }
};

const statementPasswordStore = {
  get(accountId: string): string {
    if (!accountId) return '';
    return readAll()[accountId] || '';
  },

  set(accountId: string, password?: string): void {
    if (!accountId) return;
    const all = readAll();
    const trimmed = (password || '').trim();
    if (trimmed) {
      all[accountId] = trimmed;
    } else {
      delete all[accountId];
    }
    writeAll(all);
  },

  getAll(): Record<string, string> {
    return readAll();
  }
};

export default statementPasswordStore;
