import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mail,
  Search,
  Settings,
  CheckCircle,
  ExternalLink,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  Building,
  KeyRound,
  AlertTriangle,
  FileText,
  XCircle,
  Info
} from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Transaction } from '../../types';
import gmailCrawlerService, {
  GmailConfig,
  FoundStatement,
  ProcessedIndex,
  StatementStatus
} from '../../services/gmailCrawlerService';
import FirebaseService from '../../services/firebaseService';
import statementPasswordStore from '../../services/statementPasswordStore';
import AutoCategorizationService from '../../services/autoCategorization';
import DataConfirmationDialog from '../common/DataConfirmationDialog';
import DuplicateConfirmationDialog from '../common/DuplicateConfirmationDialog';
import { formatCurrency } from '../../utils/formatters';

const BANK_INFO: Record<string, { label: string; icon: string; defaultSender: string; passwordHint: string }> = {
  hdfc: {
    label: 'HDFC Bank',
    icon: '🏦',
    defaultSender: 'hdfcbank.net',
    passwordHint: 'Usually your Customer ID, or first 4 characters of name in lowercase + DOB in DDMM format.'
  },
  icici: {
    label: 'ICICI Bank',
    icon: '🏢',
    defaultSender: 'icicibank.com',
    passwordHint: 'Usually first 4 characters of name in lowercase + DOB in DDMM format (e.g., john0101).'
  },
  sbi: {
    label: 'State Bank of India',
    icon: '🏛️',
    defaultSender: 'sbi.co.in',
    passwordHint: 'Usually 11-digit account number, or DOB (DDMMYYYY) + last 5 digits of registered mobile.'
  },
  axis: {
    label: 'Axis Bank',
    icon: '🏪',
    defaultSender: 'axisbank.com',
    passwordHint: 'Usually first 4 letters of your name in UPPERCASE + last 4 digits of Customer ID.'
  },
  custom: {
    label: 'Other / Custom Bank',
    icon: '💳',
    defaultSender: '',
    passwordHint: 'Enter your custom statement password or formula.'
  }
};

const STATUS_META: Record<StatementStatus, { label: string; className: string }> = {
  pending: { label: 'Queued', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  parsing: { label: 'Reading PDF…', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  ready: { label: 'Ready to review', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  locked: { label: 'Password needed', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  empty: { label: 'No transactions found', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  error: { label: 'Could not read', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  imported: { label: 'Imported', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  skipped: { label: 'Skipped', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
};

interface Notice {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface PendingDuplicateImport {
  statement: FoundStatement;
  transactions: Omit<Transaction, 'id'>[];
  accountId: string;
  isHistorical: boolean;
}

const GmailImportSettings: React.FC = () => {
  const theme = useThemeClasses();
  const { user } = useAuth();
  const { bankAccounts, categories, categoryRules, addTransactionsBulk, isDataLoaded } = useData();

  const [config, setConfig] = useState<GmailConfig>(gmailCrawlerService.getConfig());
  const [authStatus, setAuthStatus] = useState<boolean>(gmailCrawlerService.isAuthenticated());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeBankTab, setActiveBankTab] = useState<string>('hdfc');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Scan results
  const [statements, setStatements] = useState<FoundStatement[]>([]);
  const [scanSummary, setScanSummary] = useState<{ alreadyProcessed: number; errors: string[] } | null>(null);
  const processedIndexRef = useRef<ProcessedIndex>(new Map());

  // Locked statement password prompts
  const [unlockPasswords, setUnlockPasswords] = useState<Record<string, string>>({});
  const [rememberPassword, setRememberPassword] = useState<Record<string, boolean>>({});
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Review + duplicate resolution
  const [reviewStatement, setReviewStatement] = useState<FoundStatement | null>(null);
  const [reviewData, setReviewData] = useState<any[]>([]);
  const [busyStatementId, setBusyStatementId] = useState<string | null>(null);
  const [duplicateSummary, setDuplicateSummary] = useState<any>(null);
  const [pendingDuplicateImport, setPendingDuplicateImport] = useState<PendingDuplicateImport | null>(null);

  const autoScanStartedRef = useRef(false);
  // Latest statements, for async handlers that outlive the render they started in
  const statementsRef = useRef<FoundStatement[]>(statements);
  statementsRef.current = statements;
  // Synchronous guard so a double-click on Retry can't process the same statement twice
  const retryingIdsRef = useRef<Set<string>>(new Set());

  const updateStatement = useCallback((updated: FoundStatement) => {
    setStatements(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  }, []);

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfigChange = (key: keyof GmailConfig, value: any) => {
    const newConfig = { ...gmailCrawlerService.getConfig(), [key]: value };
    setConfig(newConfig);
    gmailCrawlerService.saveConfig(newConfig);
  };

  const handleBankFilterChange = (bankKey: string, key: string, value: any) => {
    const latest = gmailCrawlerService.getConfig();
    const currentBank = latest.bankFilters[bankKey] || {
      enabled: false,
      bankName: BANK_INFO[bankKey]?.label || bankKey,
      senderEmail: BANK_INFO[bankKey]?.defaultSender || '',
      subjectKeywords: ['statement'],
      attachmentKeywords: [],
      statementPassword: '',
      linkedAccountId: ''
    };

    const newConfig: GmailConfig = {
      ...latest,
      bankFilters: {
        ...latest.bankFilters,
        [bankKey]: {
          ...currentBank,
          [key]: value
        }
      }
    };

    setConfig(newConfig);
    gmailCrawlerService.saveConfig(newConfig);
  };

  // Passwords to try for a statement: linked account first, then every other locally saved one
  const getCandidatePasswords = (statement: FoundStatement): string[] => {
    const local = statementPasswordStore.getAll();
    const linked = statement.linkedAccountId
      ? local[statement.linkedAccountId] || bankAccounts.find(a => a.id === statement.linkedAccountId)?.statementPassword
      : undefined;
    const others = bankAccounts
      .map(a => local[a.id] || a.statementPassword)
      .filter(Boolean) as string[];
    return [linked, ...others].filter(Boolean) as string[];
  };

  const loadProcessedIndex = async (): Promise<ProcessedIndex> => {
    const index: ProcessedIndex = new Map();
    if (!user?.id) return index;
    const records = await FirebaseService.getGmailProcessedMessages(user.id);
    records.forEach(record => {
      index.set(record.messageId, new Set(record.filenames || []));
    });
    processedIndexRef.current = index;
    return index;
  };

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    setNotice(null);
    try {
      await gmailCrawlerService.authenticateWithGoogle();
      setAuthStatus(true);
      setConfig(gmailCrawlerService.getConfig());
      setNotice({ type: 'success', message: 'Connected to Gmail (read-only). Click "Scan now" to look for statements.' });
    } catch (error: any) {
      console.error('Google connection failed:', error);
      setNotice({ type: 'error', message: `Google connection failed: ${error?.message || 'Unknown error'}` });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Disconnect Gmail? The app will lose access to your mailbox until you connect again.')) {
      gmailCrawlerService.disconnect();
      setAuthStatus(false);
      setConfig(gmailCrawlerService.getConfig());
      setStatements([]);
      setScanSummary(null);
    }
  };

  const handleScan = async () => {
    if (!user?.id) {
      setNotice({ type: 'error', message: 'Please sign in to the app first.' });
      return;
    }
    if (!gmailCrawlerService.isAuthenticated()) {
      setAuthStatus(false);
      setNotice({ type: 'error', message: 'Gmail is not connected (or the session expired). Click "Connect with Google" first.' });
      return;
    }

    setIsScanning(true);
    setNotice(null);
    setScanSummary(null);

    try {
      const processed = await loadProcessedIndex();
      const result = await gmailCrawlerService.scanForStatements(processed);
      setConfig(gmailCrawlerService.getConfig());
      setAuthStatus(gmailCrawlerService.isAuthenticated());
      setStatements(result.statements);
      setScanSummary({ alreadyProcessed: result.alreadyProcessed, errors: result.errors });

      // Download + unlock + parse one at a time to keep memory and API usage modest
      for (const statement of result.statements) {
        updateStatement({ ...statement, status: 'parsing' });
        const parsed = await gmailCrawlerService.processStatement(statement, getCandidatePasswords(statement));
        updateStatement(parsed);
      }

      if (result.statements.length === 0 && result.errors.length === 0) {
        setNotice({
          type: 'info',
          message: result.alreadyProcessed > 0
            ? `No new statements. ${result.alreadyProcessed} statement(s) were already imported or skipped earlier.`
            : 'No statement emails with PDF attachments were found for the enabled banks.'
        });
      }
    } catch (error: any) {
      console.error('Gmail scan failed:', error);
      setAuthStatus(gmailCrawlerService.isAuthenticated());
      setNotice({ type: 'error', message: `Scan failed: ${error?.message || 'Unknown error'}` });
    } finally {
      setIsScanning(false);
    }
  };

  // Always call the latest handleScan (it closes over bankAccounts for statement passwords)
  const handleScanRef = useRef(handleScan);
  handleScanRef.current = handleScan;

  // Optional: scan when the page opens if the Gmail session from this tab is still valid.
  // Wait for user data so linked accounts / saved statement passwords are available.
  useEffect(() => {
    if (autoScanStartedRef.current) return;
    if (!isDataLoaded) return;
    if (config.enabled && config.autoScanOnOpen && authStatus && user?.id) {
      autoScanStartedRef.current = true;
      handleScanRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isDataLoaded]);

  const handleUnlockStatement = async (statement: FoundStatement) => {
    const password = (unlockPasswords[statement.id] || '').trim();
    if (!password) return;

    setUnlockingId(statement.id);
    try {
      const remember = rememberPassword[statement.id] ?? true;
      const result = await gmailCrawlerService.unlockStatement(statement, password, remember);
      if (result.status === 'locked') {
        updateStatement({ ...result, error: 'Incorrect password. Please verify and try again.' });
      } else {
        updateStatement(result);
        setUnlockPasswords(prev => ({ ...prev, [statement.id]: '' }));
        setConfig(gmailCrawlerService.getConfig());

        // The same password often unlocks other statements from this bank
        if (remember) {
          const otherLocked = statementsRef.current.filter(s => s.id !== statement.id && s.status === 'locked' && s.bankKey === statement.bankKey);
          for (const other of otherLocked) {
            const retried = await gmailCrawlerService.processStatement(other, getCandidatePasswords(other));
            updateStatement(retried);
          }
        }
      }
    } catch (err: any) {
      updateStatement({ ...statement, error: err?.message || 'Failed to unlock PDF.' });
    } finally {
      setUnlockingId(null);
    }
  };

  const handleRetry = async (statement: FoundStatement) => {
    if (retryingIdsRef.current.has(statement.id) || busyStatementId === statement.id) return;
    retryingIdsRef.current.add(statement.id);
    try {
      updateStatement({ ...statement, status: 'parsing', error: undefined });
      const parsed = await gmailCrawlerService.processStatement(statement, getCandidatePasswords(statement));
      updateStatement(parsed);
    } catch (err: any) {
      updateStatement({ ...statement, status: 'error', error: err?.message || 'Failed to process statement.' });
    } finally {
      retryingIdsRef.current.delete(statement.id);
    }
  };

  // Record the statement in Firestore so future scans skip it (on any device)
  const markProcessed = async (
    statement: FoundStatement,
    status: 'imported' | 'skipped',
    importedCount: number,
    accountId?: string
  ) => {
    updateStatement({ ...statement, status, importedCount });
    gmailCrawlerService.releaseStatement(statement.id);

    const filenames = processedIndexRef.current.get(statement.messageId) || new Set<string>();
    filenames.add(statement.filename);
    processedIndexRef.current.set(statement.messageId, filenames);

    if (!user?.id) return;
    try {
      await FirebaseService.markGmailStatementProcessed(user.id, {
        messageId: statement.messageId,
        bankKey: statement.bankKey,
        bankName: statement.bankName,
        subject: statement.subject,
        emailDate: statement.emailDate,
        filename: statement.filename,
        status,
        importedCount,
        bankAccountId: accountId || statement.linkedAccountId
      });
    } catch (error) {
      console.error('Failed to record processed Gmail statement:', error);
      setNotice({
        type: 'error',
        message: 'Transactions were saved, but the app could not record this email as processed. It may be offered again on the next scan.'
      });
    }
  };

  const handleSkip = (statement: FoundStatement) => {
    markProcessed(statement, 'skipped', 0);
  };

  const openReview = (statement: FoundStatement) => {
    const categorized = statement.transactions.map(txn => {
      const { categoryId } = AutoCategorizationService.suggestCategoryForTransaction(
        txn.description,
        txn.amount,
        txn.type,
        categoryRules
      );
      return { ...txn, category: txn.category || categoryId };
    });
    setReviewData(categorized);
    setReviewStatement(statement);
  };

  const handleConfirmReview = async (confirmedData: any[], isHistorical: boolean = false, targetAccountId?: string) => {
    const statement = reviewStatement;
    if (!statement) return;

    const accountId = targetAccountId || statement.linkedAccountId || '';
    if (!accountId) {
      setNotice({ type: 'error', message: 'Please select the bank account these transactions belong to.' });
      return;
    }

    const transactionsToAdd: Omit<Transaction, 'id'>[] = confirmedData.map(item => ({
      description: item.description,
      amount: Number(item.amount) || 0,
      date: item.date,
      type: item.type,
      category: item.category,
      bankAccountId: accountId,
      tags: ['imported', 'gmail-import']
    }));

    if (transactionsToAdd.length === 0) {
      return;
    }

    setBusyStatementId(statement.id);
    try {
      const result = await addTransactionsBulk(transactionsToAdd, { isHistorical });

      if (result.success) {
        await markProcessed(statement, 'imported', transactionsToAdd.length, accountId);
        setNotice({ type: 'success', message: `Imported ${transactionsToAdd.length} transactions from "${statement.filename}".` });
      } else if (result.summary) {
        // Possible duplicates of existing transactions - let the user decide
        setDuplicateSummary(result.summary);
        setPendingDuplicateImport({ statement, transactions: transactionsToAdd, accountId, isHistorical });
      } else {
        setNotice({ type: 'error', message: `Import failed: ${result.error || 'Unknown error'}` });
      }
    } finally {
      setBusyStatementId(null);
    }
  };

  const handleDuplicateConfirm = async (forceImport: boolean, selectedDuplicates?: Transaction[]) => {
    const pending = pendingDuplicateImport;
    const summary = duplicateSummary;
    setDuplicateSummary(null);
    setPendingDuplicateImport(null);
    if (!pending) return;

    const stripId = (t: any): Omit<Transaction, 'id'> => {
      const { id: _id, ...rest } = t;
      return rest;
    };

    const toImport: Omit<Transaction, 'id'>[] = forceImport
      ? pending.transactions
      : [
        ...(summary?.importedTransactions || []).map(stripId),
        ...(selectedDuplicates || []).map(stripId)
      ];

    setBusyStatementId(pending.statement.id);
    try {
      if (toImport.length > 0) {
        const result = await addTransactionsBulk(toImport, { skipDuplicateCheck: true, isHistorical: pending.isHistorical });
        if (!result.success) {
          setNotice({ type: 'error', message: `Import failed: ${result.error || 'Unknown error'}` });
          return;
        }
      }
      await markProcessed(pending.statement, 'imported', toImport.length, pending.accountId);
      setNotice({
        type: 'success',
        message: toImport.length > 0
          ? `Imported ${toImport.length} transactions from "${pending.statement.filename}" (duplicates skipped).`
          : `All transactions in "${pending.statement.filename}" already exist. Nothing new was imported.`
      });
    } finally {
      setBusyStatementId(null);
    }
  };

  const currentBankFilter = config.bankFilters[activeBankTab] || {
    enabled: false,
    bankName: BANK_INFO[activeBankTab]?.label || activeBankTab,
    senderEmail: BANK_INFO[activeBankTab]?.defaultSender || '',
    subjectKeywords: ['statement'],
    attachmentKeywords: [],
    statementPassword: '',
    linkedAccountId: ''
  };

  const activeBankMeta = BANK_INFO[activeBankTab] || {
    label: activeBankTab,
    icon: '🏦',
    defaultSender: '',
    passwordHint: 'Enter your statement password.'
  };

  const clientIdConfigured = Boolean(gmailCrawlerService.getClientId());
  const usingEnvClientId = !config.clientId && Boolean(gmailCrawlerService.getEnvClientId());
  const parsingCount = statements.filter(s => s.status === 'parsing' || s.status === 'pending').length;

  const getAccountLabel = (accountId?: string) => {
    const account = bankAccounts.find(a => a.id === accountId);
    return account ? `${account.bank} (${account.number})` : 'No account linked';
  };

  const renderStatementRow = (statement: FoundStatement) => {
    const meta = STATUS_META[statement.status];
    const total = statement.transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    const isBusy = busyStatementId === statement.id || unlockingId === statement.id;

    return (
      <div key={statement.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
              <FileText className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={statement.subject}>
                {statement.subject || '(no subject)'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {statement.bankName} · {new Date(statement.emailDate).toLocaleDateString()} · <span className="font-mono">{statement.filename}</span>
              </p>
              {statement.status === 'ready' && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {statement.transactions.length} transactions
                  {statement.statementPeriod?.from ? ` · ${statement.statementPeriod.from} to ${statement.statementPeriod.to}` : ''}
                  {' · net '}{formatCurrency(total)}
                  {' · '}{getAccountLabel(statement.linkedAccountId)}
                </p>
              )}
              {statement.status === 'imported' && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {statement.importedCount || 0} transactions added
                </p>
              )}
              {statement.error && statement.status !== 'locked' && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{statement.error}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', meta.className)}>
              {statement.status === 'parsing' && <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />}
              {meta.label}
            </span>
            {statement.status === 'ready' && (
              <button
                onClick={() => openReview(statement)}
                disabled={isBusy}
                className={cn(theme.btnPrimary, 'px-3 py-1.5 text-xs font-medium', isBusy && 'opacity-50 cursor-not-allowed')}
              >
                {isBusy ? 'Saving…' : 'Review & Import'}
              </button>
            )}
            {statement.status === 'error' && (
              <button
                onClick={() => handleRetry(statement)}
                disabled={isBusy}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
              >
                Retry
              </button>
            )}
            {['ready', 'locked', 'empty', 'error'].includes(statement.status) && (
              <button
                onClick={() => handleSkip(statement)}
                disabled={isBusy}
                title="Don't offer this statement again"
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
              >
                Skip
              </button>
            )}
          </div>
        </div>

        {/* Password prompt for locked PDFs */}
        {statement.status === 'locked' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg space-y-2">
            <p className="text-xs text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              This PDF is password protected. {BANK_INFO[statement.bankKey]?.passwordHint}
            </p>
            {statement.error && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{statement.error}</p>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showPasswords[statement.id] ? 'text' : 'password'}
                  value={unlockPasswords[statement.id] || ''}
                  onChange={(e) => setUnlockPasswords(prev => ({ ...prev, [statement.id]: e.target.value }))}
                  placeholder="Statement PDF password"
                  className="input-field theme-input w-full pr-10 text-sm"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUnlockStatement(statement);
                  }}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(statement.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPasswords[statement.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => handleUnlockStatement(statement)}
                disabled={isBusy || !(unlockPasswords[statement.id] || '').trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                {unlockingId === statement.id ? 'Unlocking…' : 'Unlock'}
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberPassword[statement.id] ?? true}
                onChange={(e) => setRememberPassword(prev => ({ ...prev, [statement.id]: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Remember for {statement.bankName} on this device (never uploaded)
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700/60 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Gmail Statement Import
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                Finds bank and credit card statement PDFs in your Gmail, unlocks them with your password, and lets you review the transactions before they are added.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {authStatus ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Gmail Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Not Connected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inline notice */}
      {notice && (
        <div
          className={cn(
            'flex items-start gap-2 p-3 rounded-lg text-sm border',
            notice.type === 'success' && 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
            notice.type === 'error' && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
            notice.type === 'info' && 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          )}
        >
          {notice.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : notice.type === 'error' ? <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1">{notice.message}</span>
          <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Main Enable Switch */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">Enable Gmail Statement Import</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Allow the app to search your Gmail (read-only) for statement emails from the banks you enable
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => handleConfigChange('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Authentication & Connection Section */}
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Google Account
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {authStatus && config.connectedEmail
                    ? <>Connected as <strong>{config.connectedEmail}</strong> with read-only access (<code>gmail.readonly</code>).</>
                    : <>Read-only access (<code>gmail.readonly</code>). Google sessions last about an hour; reconnect when prompted.</>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConnectGoogle}
                  disabled={isConnecting || !clientIdConfigured}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50',
                    authStatus
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  )}
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isConnecting && 'animate-spin')} />
                  {authStatus ? 'Reconnect' : 'Connect with Google'}
                </button>

                {(authStatus || config.connectedEmail) && (
                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {!clientIdConfigured && (
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                No Google OAuth Client ID configured. Set <code>VITE_GOOGLE_OAUTH_CLIENT_ID</code> in <code>.env</code> or enter one under Advanced Settings.
              </p>
            )}
          </div>

          {/* Scan */}
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-blue-600" />
                  Find Statements
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Searches emails since {new Date(config.scanSinceDate).toLocaleDateString()} from enabled banks. Statements you already imported or skipped are not shown again.
                  {config.lastScanAt && <> Last scan: {new Date(config.lastScanAt).toLocaleString()}.</>}
                </p>
              </div>
              <button
                onClick={handleScan}
                disabled={isScanning || !authStatus}
                className={cn(
                  theme.btnPrimary,
                  'flex items-center justify-center px-4 py-2.5 font-medium whitespace-nowrap',
                  (isScanning || !authStatus) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {parsingCount > 0 ? `Reading ${parsingCount} statement(s)…` : 'Searching Gmail…'}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Scan now
                  </>
                )}
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoScanOnOpen}
                onChange={(e) => handleConfigChange('autoScanOnOpen', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Scan automatically when I open this page (while Gmail is connected). Nothing is imported without your review.
            </label>

            {scanSummary && (scanSummary.errors.length > 0 || scanSummary.alreadyProcessed > 0) && (
              <div className="text-xs space-y-1">
                {scanSummary.alreadyProcessed > 0 && (
                  <p className="text-gray-500 dark:text-gray-400">
                    {scanSummary.alreadyProcessed} statement(s) hidden because they were already imported or skipped.
                  </p>
                )}
                {scanSummary.errors.map((err, idx) => (
                  <p key={idx} className="text-red-600 dark:text-red-400">{err}</p>
                ))}
              </div>
            )}

            {statements.length > 0 && (
              <div className="space-y-3">
                {statements.map(renderStatementRow)}
              </div>
            )}
          </div>

          {/* Fallback Statement Password */}
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  Default Statement PDF Password (Fallback)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tried when a bank-specific password is not set (e.g. PAN or DOB). Stored only on this device.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <input
                  type={showPasswords['default'] ? 'text' : 'password'}
                  value={config.defaultPassword || ''}
                  onChange={(e) => handleConfigChange('defaultPassword', e.target.value)}
                  placeholder="e.g. ABCDE1234F"
                  className="input-field theme-input w-full pr-10 text-sm"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('default')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPasswords['default'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Bank Configuration Tabs */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Bank Statement & Password Settings
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Configure statement email search patterns and passwords for each of your banks.
              </p>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mt-4">
                {Object.keys(BANK_INFO).map((key) => {
                  const bInfo = BANK_INFO[key];
                  const isEnabled = config.bankFilters[key]?.enabled;
                  const hasPassword = Boolean(config.bankFilters[key]?.statementPassword);
                  const isSelected = activeBankTab === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setActiveBankTab(key)}
                      className={cn(
                        'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border',
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      )}
                    >
                      <span>{bInfo.icon}</span>
                      <span>{bInfo.label}</span>
                      {isEnabled && (
                        <span className={cn('w-2 h-2 rounded-full', isSelected ? 'bg-white' : 'bg-emerald-500')} />
                      )}
                      {hasPassword && (
                        <Lock className={cn('w-3 h-3', isSelected ? 'text-blue-100' : 'text-amber-500')} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Bank Filter Form */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{activeBankMeta.icon}</span>
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white">
                      {activeBankMeta.label}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Include this bank's statement emails in scans
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(currentBankFilter.enabled)}
                    onChange={(e) => handleBankFilterChange(activeBankTab, 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {currentBankFilter.enabled && (
                <div className="space-y-4 pt-1">
                  {/* Password Section Highlighted */}
                  <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        Statement PDF Password
                      </label>
                      <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                        Stored only on this device
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type={showPasswords[activeBankTab] ? 'text' : 'password'}
                        value={currentBankFilter.statementPassword || ''}
                        onChange={(e) => handleBankFilterChange(activeBankTab, 'statementPassword', e.target.value)}
                        placeholder="Enter statement PDF unlock password..."
                        className="input-field theme-input w-full pr-10 text-sm font-mono"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(activeBankTab)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showPasswords[activeBankTab] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      💡 <strong>Password format tip:</strong> {activeBankMeta.passwordHint}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sender Email */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Bank Sender Email or Domain
                      </label>
                      <input
                        type="text"
                        value={currentBankFilter.senderEmail}
                        onChange={(e) => handleBankFilterChange(activeBankTab, 'senderEmail', e.target.value)}
                        className="input-field theme-input w-full text-sm"
                        placeholder="e.g. hdfcbank.net, estatement@bank.com"
                      />
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        Comma separate several senders. A domain matches all addresses at that bank.
                      </p>
                    </div>

                    {/* Link to Bank Account */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Import Into Account
                      </label>
                      <select
                        value={currentBankFilter.linkedAccountId || ''}
                        onChange={(e) => handleBankFilterChange(activeBankTab, 'linkedAccountId', e.target.value)}
                        className="input-field theme-input w-full text-sm"
                      >
                        <option value="">Choose during review</option>
                        {bankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.logo} {account.bank} ({account.number})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject Keywords */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Subject Keywords (comma separated)
                    </label>
                    <input
                      type="text"
                      value={currentBankFilter.subjectKeywords.join(', ')}
                      onChange={(e) =>
                        handleBankFilterChange(
                          activeBankTab,
                          'subjectKeywords',
                          e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      className="input-field theme-input w-full text-sm"
                      placeholder="statement, account statement, e-statement"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings (Date Filter, OAuth Client ID)'}
            </button>

            {showAdvanced && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Search Emails Received After
                    </label>
                    <input
                      type="date"
                      value={config.scanSinceDate.split('T')[0]}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        handleConfigChange('scanSinceDate', new Date(e.target.value).toISOString());
                      }}
                      className="input-field theme-input w-full text-sm"
                    />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Up to 50 recent statement emails per bank are checked per scan.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Google OAuth Client ID (override)
                    </label>
                    <input
                      type="text"
                      value={config.clientId}
                      onChange={(e) => handleConfigChange('clientId', e.target.value.trim())}
                      placeholder={usingEnvClientId ? 'Using VITE_GOOGLE_OAUTH_CLIENT_ID' : '1234567890-abc.apps.googleusercontent.com'}
                      className="input-field theme-input w-full text-sm font-mono"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                      <span>Web client ID only. Never paste a client secret here.</span>
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Credentials <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Guide when not enabled */}
      {!config.enabled && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                How It Works
              </h4>
              <ol className="text-blue-800 dark:text-blue-200 text-xs sm:text-sm space-y-1.5 list-decimal list-inside">
                <li>Toggle <strong>"Enable Gmail Statement Import"</strong> above.</li>
                <li>Click <strong>"Connect with Google"</strong> and allow read-only Gmail access.</li>
                <li>Enable your banks (HDFC, ICICI, SBI, Axis, etc.) and enter your <strong>statement PDF password</strong>.</li>
                <li>Click <strong>"Scan now"</strong>, review each statement's transactions, and import them into the right account.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Review parsed transactions before saving */}
      {reviewStatement && (
        <DataConfirmationDialog
          key={reviewStatement.id}
          isOpen={true}
          onClose={() => setReviewStatement(null)}
          onConfirm={handleConfirmReview}
          data={reviewData}
          type="transactions"
          title={`Review: ${reviewStatement.bankName} · ${reviewStatement.filename}`}
          categories={categories}
          accounts={bankAccounts}
          selectedAccountId={reviewStatement.linkedAccountId || ''}
        />
      )}

      {/* Possible duplicates of existing transactions */}
      {duplicateSummary && pendingDuplicateImport && (
        <DuplicateConfirmationDialog
          isOpen={true}
          onClose={() => {
            setDuplicateSummary(null);
            setPendingDuplicateImport(null);
          }}
          onConfirm={handleDuplicateConfirm}
          summary={duplicateSummary}
          fileName={pendingDuplicateImport.statement.filename}
        />
      )}
    </div>
  );
};

export default GmailImportSettings;
