import bankStatementParser, { StatementSectionInfo } from './bankStatementParser';

/**
 * Gmail statement import (browser-only).
 *
 * Flow: connect (Google Identity Services token popup, gmail.readonly) -> search each
 * enabled bank's statement emails -> download PDF attachments -> unlock with local
 * passwords -> parse -> hand parsed rows to the UI for review -> UI saves via DataContext
 * and records the message as processed in Firestore.
 *
 * No client secret or refresh token is ever used here: GIS issues short-lived access
 * tokens directly to the browser. Tokens are kept in memory + sessionStorage only.
 * Statement passwords stay in localStorage (this device) and never go to Firestore.
 */

const CONFIG_STORAGE_KEY = 'gmailCrawlerConfig';
const TOKEN_SESSION_KEY = 'gmailAccessToken';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const MAX_MESSAGES_PER_BANK = 50;
const DEFAULT_LOOKBACK_DAYS = 90;

// Default sender domains per bank. Indian banks are moving mail to RBI's .bank.in
// domains, so the new domain is searched alongside the old one.
export const DEFAULT_BANK_SENDERS: Record<string, string> = {
  hdfc: 'hdfcbank.net, hdfcbank.bank.in, hdfc.bank.in, hdfcbank.com',
  icici: 'icicibank.com, icici.bank.in, icicibank.bank.in',
  sbi: 'sbi.co.in, sbi.bank.in',
  axis: 'axisbank.com, axis.bank.in, axisbank.bank.in'
};

// Earlier defaults; a saved sender still equal to one of these was never customised
const LEGACY_BANK_SENDERS: Record<string, string> = {
  hdfc: 'hdfcbank.net',
  icici: 'icicibank.com',
  sbi: 'sbi.co.in',
  axis: 'axisbank.com'
};

export interface BankFilterConfig {
  enabled: boolean;
  bankName: string;
  senderEmail: string; // Sender address or domain; comma separated for several
  subjectKeywords: string[];
  attachmentKeywords: string[];
  linkedAccountId?: string;
  statementPassword?: string; // Local-only password to unlock the statement PDF
}

export interface GmailConfig {
  enabled: boolean;
  clientId: string; // Optional override; defaults to VITE_GOOGLE_OAUTH_CLIENT_ID
  connectedEmail?: string;
  hasConsented?: boolean; // Skip the consent screen on later token requests
  defaultPassword?: string; // Global fallback password to unlock statement PDFs
  bankFilters: {
    hdfc: BankFilterConfig;
    icici: BankFilterConfig;
    sbi: BankFilterConfig;
    axis: BankFilterConfig;
    custom: BankFilterConfig;
    [key: string]: BankFilterConfig;
  };
  autoScanOnOpen: boolean; // Scan when the Gmail Import page opens (if still connected)
  scanSinceDate: string; // Only emails received after this date are searched
  lastScanAt?: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface BankEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  attachments: EmailAttachment[];
  bankKey: string;
}

export type StatementStatus = 'pending' | 'parsing' | 'ready' | 'locked' | 'empty' | 'error' | 'imported' | 'skipped';

export interface StatementTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  confidence: number;
  bankAccountId: string;
  statementSectionId?: string; // Account section, when the PDF covers several accounts
}

// One PDF attachment found in Gmail, plus its processing state
export interface FoundStatement {
  id: string; // `${messageId}:${filename}`
  messageId: string;
  subject: string;
  from: string;
  emailDate: string; // ISO
  bankKey: string;
  bankName: string;
  linkedAccountId?: string;
  attachmentId: string;
  filename: string;
  size: number;
  status: StatementStatus;
  transactions: StatementTransaction[];
  detectedBank?: string;
  statementPeriod?: { from: string; to: string };
  sections?: StatementSectionInfo[]; // Only when one PDF covers several accounts
  error?: string;
  importedCount?: number;
}

export interface ScanResult {
  statements: FoundStatement[];
  alreadyProcessed: number;
  errors: string[];
}

// messageId -> filenames already imported/skipped (from Firestore)
export type ProcessedIndex = Map<string, Set<string>>;

class GmailCrawlerService {
  private config: GmailConfig;
  private accessToken: string | null = null;
  private tokenExpiry = 0;
  private pdfCache = new Map<string, string>(); // statement id -> base64 PDF (memory only)

  constructor() {
    this.config = this.loadConfig();
    this.restoreSessionToken();
  }

  private getDefaultFilters(): GmailConfig['bankFilters'] {
    return {
      hdfc: {
        enabled: true,
        bankName: 'HDFC Bank',
        senderEmail: DEFAULT_BANK_SENDERS.hdfc,
        subjectKeywords: ['statement', 'account statement', 'monthly statement', 'e-statement'],
        attachmentKeywords: [],
        statementPassword: '',
        linkedAccountId: ''
      },
      icici: {
        enabled: false,
        bankName: 'ICICI Bank',
        senderEmail: DEFAULT_BANK_SENDERS.icici,
        subjectKeywords: ['statement', 'account statement', 'e-statement'],
        attachmentKeywords: [],
        statementPassword: '',
        linkedAccountId: ''
      },
      sbi: {
        enabled: false,
        bankName: 'State Bank of India',
        senderEmail: DEFAULT_BANK_SENDERS.sbi,
        subjectKeywords: ['statement', 'account statement', 'e-statement'],
        attachmentKeywords: [],
        statementPassword: '',
        linkedAccountId: ''
      },
      axis: {
        enabled: false,
        bankName: 'Axis Bank',
        senderEmail: DEFAULT_BANK_SENDERS.axis,
        subjectKeywords: ['statement', 'account statement', 'e-statement'],
        attachmentKeywords: [],
        statementPassword: '',
        linkedAccountId: ''
      },
      custom: {
        enabled: false,
        bankName: 'Custom Bank',
        senderEmail: '',
        subjectKeywords: ['statement'],
        attachmentKeywords: [],
        statementPassword: '',
        linkedAccountId: ''
      }
    };
  }

  private loadConfig(): GmailConfig {
    const defaultFilters = this.getDefaultFilters();
    const defaults: GmailConfig = {
      enabled: false,
      clientId: '',
      connectedEmail: '',
      hasConsented: false,
      defaultPassword: '',
      bankFilters: defaultFilters,
      autoScanOnOpen: false,
      scanSinceDate: new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
    };

    // The old setInterval-based crawler stored its timer id here; it is no longer used
    localStorage.removeItem('gmailCrawlerInterval');

    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        // Drop legacy secrets/tokens that older versions persisted in localStorage
        const {
          clientSecret: _clientSecret,
          refreshToken: _refreshToken,
          accessToken: _accessToken,
          tokenExpiry: _tokenExpiry,
          autoImport: _autoImport,
          lastProcessedDate: _lastProcessedDate,
          ...parsed
        } = JSON.parse(saved);

        const savedFilters: GmailConfig['bankFilters'] = { ...(parsed.bankFilters || {}) };
        // Move untouched old defaults to the current default senders; customised senders are kept
        for (const [bankKey, legacySender] of Object.entries(LEGACY_BANK_SENDERS)) {
          const saved = savedFilters[bankKey];
          if (saved && saved.senderEmail?.trim().toLowerCase() === legacySender) {
            savedFilters[bankKey] = { ...saved, senderEmail: DEFAULT_BANK_SENDERS[bankKey] };
          }
        }

        const config: GmailConfig = {
          ...defaults,
          ...parsed,
          bankFilters: {
            ...defaultFilters,
            ...savedFilters
          }
        };
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
        return config;
      }
    } catch (e) {
      console.error('Failed to parse saved gmailCrawlerConfig:', e);
    }

    return defaults;
  }

  public saveConfig(config: GmailConfig): void {
    this.config = config;
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }

  public getConfig(): GmailConfig {
    return this.config;
  }

  public getEnvClientId(): string {
    return (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined)?.trim() || '';
  }

  public getClientId(): string {
    return this.config.clientId?.trim() || this.getEnvClientId();
  }

  // ==================== Authentication ====================

  private restoreSessionToken(): void {
    try {
      const saved = sessionStorage.getItem(TOKEN_SESSION_KEY);
      if (saved) {
        const { token, expiry } = JSON.parse(saved);
        if (token && expiry && Date.now() < expiry) {
          this.accessToken = token;
          this.tokenExpiry = expiry;
        }
      }
    } catch {
      // ignore
    }
  }

  private setAccessToken(token: string, expiresInSeconds: number): void {
    this.accessToken = token;
    // Treat the token as expired a minute early to avoid mid-scan 401s
    this.tokenExpiry = Date.now() + Math.max(expiresInSeconds - 60, 60) * 1000;
    try {
      sessionStorage.setItem(TOKEN_SESSION_KEY, JSON.stringify({ token, expiry: this.tokenExpiry }));
    } catch {
      // ignore
    }
  }

  private clearAccessToken(): void {
    this.accessToken = null;
    this.tokenExpiry = 0;
    try {
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  public isAuthenticated(): boolean {
    return Boolean(this.accessToken) && Date.now() < this.tokenExpiry;
  }

  /**
   * Request a Gmail access token via the Google Identity Services token client popup.
   * Must be called from a user gesture (click), otherwise the popup is blocked.
   */
  public async authenticateWithGoogle(): Promise<string> {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('Google OAuth Client ID is not configured. Set VITE_GOOGLE_OAUTH_CLIENT_ID or enter it under Advanced Settings.');
    }

    await this.ensureGoogleScriptLoaded();

    return new Promise((resolve, reject) => {
      try {
        const google = (window as any).google;
        if (!google?.accounts?.oauth2) {
          throw new Error('Google Identity Services SDK could not be initialized.');
        }

        const handleResponse = async (response: any) => {
          if (response.error) {
            console.error('GIS Error:', response);
            reject(new Error(response.error_description || response.error || 'Authentication failed'));
            return;
          }

          if (!google.accounts.oauth2.hasGrantedAllScopes(response, GMAIL_SCOPE)) {
            reject(new Error('Gmail read access was not granted. Please allow "View your email messages and settings".'));
            return;
          }

          this.setAccessToken(response.access_token, Number(response.expires_in) || 3600);

          // Remember the connected address for display (best effort)
          let connectedEmail = this.config.connectedEmail;
          try {
            const profile = await this.makeGmailRequest('profile');
            connectedEmail = profile?.emailAddress || connectedEmail;
          } catch {
            // ignore
          }
          this.saveConfig({ ...this.config, hasConsented: true, connectedEmail });
          resolve(response.access_token);
        };

        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: GMAIL_SCOPE,
          callback: handleResponse,
          error_callback: (error: any) => {
            // e.g. popup_closed, popup_failed_to_open
            reject(new Error(error?.message || error?.type || 'Google sign-in was cancelled.'));
          }
        });

        tokenClient.requestAccessToken({
          prompt: this.config.hasConsented ? '' : 'consent',
          ...(this.config.connectedEmail ? { login_hint: this.config.connectedEmail } : {})
        });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  private ensureGoogleScriptLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
      const script = (existingScript as HTMLScriptElement) || document.createElement('script');

      // The script may already have loaded (or failed) - poll briefly as well as listening
      const timeout = window.setTimeout(() => reject(new Error('Timed out loading Google Identity Services.')), 15000);
      const done = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      script.addEventListener('load', done);
      script.addEventListener('error', () => {
        window.clearTimeout(timeout);
        reject(new Error('Failed to load Google Identity Services from accounts.google.com'));
      });

      if (!existingScript) {
        script.src = GIS_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      } else {
        const poll = window.setInterval(() => {
          if ((window as any).google?.accounts?.oauth2) {
            window.clearInterval(poll);
            done();
          }
        }, 200);
        window.setTimeout(() => window.clearInterval(poll), 15000);
      }
    });
  }

  public disconnect(): void {
    const token = this.accessToken;
    const google = (window as any).google;
    if (token && google?.accounts?.oauth2?.revoke) {
      google.accounts.oauth2.revoke(token, () => console.log('Gmail access token revoked'));
    }
    this.clearAccessToken();
    this.pdfCache.clear();
    this.saveConfig({ ...this.config, hasConsented: false, connectedEmail: '' });
  }

  // ==================== Gmail REST ====================

  private async makeGmailRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Gmail session expired. Please click "Connect with Google" again.');
    }

    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
    });

    if (response.status === 401) {
      // GIS tokens cannot be refreshed silently from here; the user must reconnect
      this.clearAccessToken();
      throw new Error('Gmail session expired. Please click "Connect with Google" again.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 403 && errorText.includes('accessNotConfigured')) {
        throw new Error('The Gmail API is not enabled for this Google Cloud project. Enable it in Google Cloud Console.');
      }
      throw new Error(`Gmail API error (${response.status}): ${errorText || response.statusText}`);
    }

    return await response.json();
  }

  private buildSearchQuery(filter: BankFilterConfig): string {
    const senders = filter.senderEmail.split(',').map(s => s.trim()).filter(Boolean);
    const fromQuery = senders.length > 1
      ? `from:(${senders.join(' OR ')})`
      : `from:${senders[0]}`;

    const subjectQuery = filter.subjectKeywords.length > 0
      ? `(${filter.subjectKeywords.map(k => `subject:"${k.replace(/"/g, '')}"`).join(' OR ')})`
      : '';

    // Gmail expects after:YYYY/MM/DD
    const since = new Date(this.config.scanSinceDate);
    const afterDate = isNaN(since.getTime())
      ? ''
      : `after:${since.getFullYear()}/${String(since.getMonth() + 1).padStart(2, '0')}/${String(since.getDate()).padStart(2, '0')}`;

    return [fromQuery, 'has:attachment', 'filename:pdf', afterDate, subjectQuery].filter(Boolean).join(' ');
  }

  public async searchBankEmails(bankKey: string): Promise<BankEmail[]> {
    const filter = this.config.bankFilters[bankKey];
    if (!filter || !filter.enabled || !filter.senderEmail.trim()) {
      return [];
    }

    const query = this.buildSearchQuery(filter);
    console.log(`🔎 Searching Gmail for ${filter.bankName}: "${query}"`);

    // Collect message ids (paginated, capped)
    const messageRefs: Array<{ id: string; threadId: string }> = [];
    let pageToken: string | undefined;
    do {
      const params: Record<string, string> = { q: query, maxResults: '25' };
      if (pageToken) params.pageToken = pageToken;
      const page = await this.makeGmailRequest('messages', params);
      messageRefs.push(...(page.messages || []));
      pageToken = page.nextPageToken;
    } while (pageToken && messageRefs.length < MAX_MESSAGES_PER_BANK);

    const emails: BankEmail[] = [];
    for (const message of messageRefs.slice(0, MAX_MESSAGES_PER_BANK)) {
      try {
        const emailDetails = await this.makeGmailRequest(`messages/${message.id}`, { format: 'full' });
        const headers = emailDetails.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name)?.value || '';
        const internalDate = Number(emailDetails.internalDate);

        const attachments = this.extractAttachments(emailDetails.payload, filter.attachmentKeywords);
        if (attachments.length > 0) {
          emails.push({
            id: message.id,
            threadId: message.threadId,
            subject: getHeader('subject'),
            from: getHeader('from'),
            date: internalDate ? new Date(internalDate).toISOString() : (getHeader('date') || new Date().toISOString()),
            attachments,
            bankKey
          });
        }
      } catch (e) {
        console.warn(`Failed to fetch details for message ${message.id}:`, e);
      }
    }

    return emails;
  }

  private extractAttachments(payload: any, keywords: string[]): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    const processPayload = (part: any) => {
      if (part.parts && Array.isArray(part.parts)) {
        part.parts.forEach(processPayload);
      } else if (part.body?.attachmentId) {
        const filename = part.filename || '';
        const mimeType = part.mimeType || '';

        const isPdf = filename.toLowerCase().endsWith('.pdf') || mimeType.toLowerCase().includes('pdf');
        const matchesKeywords = keywords.length === 0 || keywords.some(k =>
          filename.toLowerCase().includes(k.toLowerCase())
        );

        if (isPdf && matchesKeywords) {
          attachments.push({
            filename: filename || 'statement.pdf',
            mimeType,
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          });
        }
      }
    };

    if (payload) {
      processPayload(payload);
    }
    return attachments;
  }

  public async downloadAttachment(messageId: string, attachmentId: string): Promise<string> {
    const response = await this.makeGmailRequest(`messages/${messageId}/attachments/${attachmentId}`);

    // Gmail API returns URL-safe base64 data
    let base64 = (response.data || '').replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return base64;
  }

  // ==================== Scan / Parse ====================

  /**
   * Search all enabled banks and list statement PDFs not yet imported or skipped.
   * Nothing is downloaded here; call processStatement() for each result.
   */
  public async scanForStatements(processed: ProcessedIndex): Promise<ScanResult> {
    const enabledBanks = Object.keys(this.config.bankFilters).filter(
      key => this.config.bankFilters[key].enabled && this.config.bankFilters[key].senderEmail.trim()
    );

    if (enabledBanks.length === 0) {
      return {
        statements: [],
        alreadyProcessed: 0,
        errors: ['No banks are enabled for Gmail import. Enable at least one bank below.']
      };
    }

    const statements: FoundStatement[] = [];
    const seen = new Set<string>();
    const errors: string[] = [];
    let alreadyProcessed = 0;

    for (const bankKey of enabledBanks) {
      const filter = this.config.bankFilters[bankKey];
      try {
        const emails = await this.searchBankEmails(bankKey);
        console.log(`Found ${emails.length} statement emails for ${filter.bankName}`);

        for (const email of emails) {
          for (const attachment of email.attachments) {
            const id = `${email.id}:${attachment.filename}`;
            if (seen.has(id)) continue; // Same email matched by two bank filters
            seen.add(id);

            if (processed.get(email.id)?.has(attachment.filename)) {
              alreadyProcessed++;
              continue;
            }

            statements.push({
              id,
              messageId: email.id,
              subject: email.subject,
              from: email.from,
              emailDate: email.date,
              bankKey,
              bankName: filter.bankName,
              linkedAccountId: filter.linkedAccountId || undefined,
              attachmentId: attachment.attachmentId,
              filename: attachment.filename,
              size: attachment.size,
              status: 'pending',
              transactions: []
            });
          }
        }
      } catch (bankErr: any) {
        console.error(`Error searching ${filter.bankName}:`, bankErr);
        errors.push(`${filter.bankName}: ${bankErr.message}`);
        // An expired session will fail every bank the same way
        if (!this.isAuthenticated()) break;
      }
    }

    this.saveConfig({ ...this.config, lastScanAt: new Date().toISOString() });

    statements.sort((a, b) => b.emailDate.localeCompare(a.emailDate));
    return { statements, alreadyProcessed, errors };
  }

  /**
   * Download (once), unlock and parse a statement.
   * Passwords tried, in order: bank filter password, extra candidates (e.g. linked account), default password.
   */
  public async processStatement(statement: FoundStatement, extraPasswords: string[] = []): Promise<FoundStatement> {
    const filter = this.config.bankFilters[statement.bankKey];
    const passwords = [
      filter?.statementPassword,
      ...extraPasswords,
      this.config.defaultPassword
    ].filter(Boolean) as string[];

    return this.parseStatement(statement, Array.from(new Set(passwords)));
  }

  /**
   * Retry a locked statement with a user-entered password. When `remember` is set the
   * password is saved for this bank in local settings (never Firestore).
   */
  public async unlockStatement(statement: FoundStatement, password: string, remember: boolean): Promise<FoundStatement> {
    if (!password.trim()) {
      throw new Error('Password is required to unlock this statement.');
    }

    const result = await this.parseStatement(statement, [password.trim()]);

    if (result.status !== 'locked' && remember && this.config.bankFilters[statement.bankKey]) {
      this.saveConfig({
        ...this.config,
        bankFilters: {
          ...this.config.bankFilters,
          [statement.bankKey]: {
            ...this.config.bankFilters[statement.bankKey],
            statementPassword: password.trim()
          }
        }
      });
    }

    return result;
  }

  private async parseStatement(statement: FoundStatement, passwords: string[]): Promise<FoundStatement> {
    try {
      let base64 = this.pdfCache.get(statement.id);
      if (!base64) {
        console.log(`📄 Downloading PDF: ${statement.filename} (${statement.size} bytes)`);
        base64 = await this.downloadAttachment(statement.messageId, statement.attachmentId);
        this.pdfCache.set(statement.id, base64);
      }

      const pdfText = await bankStatementParser.extractTextFromPDF(base64, passwords);
      const statementData = await bankStatementParser.parseStatement(pdfText);
      const bankAccountId = statement.linkedAccountId || '';

      const transactions: StatementTransaction[] = statementData.transactions
        .filter(t => t.amount > 0 && t.date)
        .map(t => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: '',
          confidence: t.confidence ?? 0.8,
          bankAccountId,
          ...(t.statementSectionId ? { statementSectionId: t.statementSectionId } : {})
        }));

      return {
        ...statement,
        status: transactions.length > 0 ? 'ready' : 'empty',
        transactions,
        detectedBank: statementData.bankName,
        statementPeriod: statementData.statementPeriod,
        sections: bankStatementParser.toSectionInfos(statementData.sections),
        error: undefined
      };
    } catch (err: any) {
      if (err?.message === 'PASSWORD_REQUIRED') {
        return { ...statement, status: 'locked', transactions: [], error: undefined };
      }
      console.error(`❌ Failed to parse ${statement.filename}:`, err);
      return { ...statement, status: 'error', transactions: [], error: err?.message || 'Failed to read statement' };
    }
  }

  // Free the downloaded PDF once a statement is imported or skipped
  public releaseStatement(statementId: string): void {
    this.pdfCache.delete(statementId);
  }
}

export default new GmailCrawlerService();
