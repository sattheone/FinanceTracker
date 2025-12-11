import { Transaction } from '../types';

export interface GmailConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  bankFilters: {
    hdfc: {
      enabled: boolean;
      senderEmail: string;
      subjectKeywords: string[];
      attachmentKeywords: string[];
      linkedAccountId?: string;
    };
  };
  autoImport: boolean;
  lastProcessedDate: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  data?: string; // Base64 encoded
}

export interface BankEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  attachments: EmailAttachment[];
  processed: boolean;
}

class GmailCrawlerService {
  private config: GmailConfig;
  private accessToken: string | null = null;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): GmailConfig {
    const saved = localStorage.getItem('gmailCrawlerConfig');
    if (saved) {
      return JSON.parse(saved);
    }
    
    return {
      enabled: false,
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      bankFilters: {
        hdfc: {
          enabled: true,
          senderEmail: 'alerts@hdfcbank.net',
          subjectKeywords: ['statement', 'account statement', 'monthly statement'],
          attachmentKeywords: ['statement', '.pdf', 'account']
        }
      },
      autoImport: false,
      lastProcessedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
    };
  }

  public saveConfig(config: GmailConfig): void {
    this.config = config;
    localStorage.setItem('gmailCrawlerConfig', JSON.stringify(config));
  }

  public getConfig(): GmailConfig {
    return this.config;
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      return this.accessToken || '';
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  public async authenticateWithGoogle(): Promise<void> {
    // This would typically use Google OAuth2 flow
    // For now, we'll provide instructions for manual setup
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.config.clientId}&` +
      `redirect_uri=http://localhost:3000/auth/callback&` +
      `response_type=code&` +
      `scope=https://www.googleapis.com/auth/gmail.readonly&` +
      `access_type=offline&` +
      `prompt=consent`;

    console.log('Please visit this URL to authenticate:', authUrl);
    
    // In a real implementation, you'd handle the OAuth flow properly
    throw new Error('Manual OAuth setup required. See console for auth URL.');
  }

  private async makeGmailRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }

    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Token expired, refresh and retry
        await this.refreshAccessToken();
        return this.makeGmailRequest(endpoint, params);
      }

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Gmail API request failed:', error);
      throw error;
    }
  }

  public async searchBankEmails(bankType: 'hdfc' = 'hdfc'): Promise<BankEmail[]> {
    if (!this.config.enabled || !this.config.bankFilters[bankType].enabled) {
      return [];
    }

    const filter = this.config.bankFilters[bankType];
    const query = [
      `from:${filter.senderEmail}`,
      'has:attachment',
      `after:${new Date(this.config.lastProcessedDate).toISOString().split('T')[0]}`,
      ...filter.subjectKeywords.map(keyword => `subject:${keyword}`)
    ].join(' ');

    try {
      const searchResults = await this.makeGmailRequest('messages', { q: query });
      
      if (!searchResults.messages) {
        return [];
      }

      const emails: BankEmail[] = [];
      
      for (const message of searchResults.messages.slice(0, 10)) { // Limit to 10 recent emails
        const emailDetails = await this.makeGmailRequest(`messages/${message.id}`);
        
        const headers = emailDetails.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';

        const attachments = this.extractAttachments(emailDetails.payload, filter.attachmentKeywords);
        
        if (attachments.length > 0) {
          emails.push({
            id: message.id,
            threadId: message.threadId,
            subject,
            from,
            date,
            attachments,
            processed: false
          });
        }
      }

      return emails;
    } catch (error) {
      console.error('Error searching bank emails:', error);
      return [];
    }
  }

  private extractAttachments(payload: any, keywords: string[]): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    const processPayload = (part: any) => {
      if (part.parts) {
        part.parts.forEach(processPayload);
      } else if (part.body?.attachmentId) {
        const filename = part.filename || '';
        const mimeType = part.mimeType || '';
        
        // Check if attachment matches our keywords
        const matchesKeywords = keywords.some(keyword => 
          filename.toLowerCase().includes(keyword.toLowerCase()) ||
          mimeType.toLowerCase().includes(keyword.toLowerCase())
        );

        if (matchesKeywords) {
          attachments.push({
            filename,
            mimeType,
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          });
        }
      }
    };

    processPayload(payload);
    return attachments;
  }

  public async downloadAttachment(messageId: string, attachmentId: string): Promise<string> {
    try {
      const response = await this.makeGmailRequest(
        `messages/${messageId}/attachments/${attachmentId}`
      );
      
      return response.data; // Base64 encoded data
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  }

  public async processNewEmails(): Promise<{ processed: number; transactions: Transaction[] }> {
    if (!this.config.enabled) {
      return { processed: 0, transactions: [] };
    }

    console.log('🔍 Searching for new bank statement emails...');
    
    const emails = await this.searchBankEmails('hdfc');
    let processedCount = 0;
    const allTransactions: Transaction[] = [];

    for (const email of emails) {
      try {
        console.log(`📧 Processing email: ${email.subject}`);
        
        for (const attachment of email.attachments) {
          if (attachment.filename.toLowerCase().includes('.pdf')) {
            console.log(`📄 Processing PDF: ${attachment.filename}`);
            
            // Download attachment
            const pdfData = await this.downloadAttachment(email.id, attachment.attachmentId);
            
            // Parse PDF and extract transactions
            const transactions = await this.parseBankStatementPDF(pdfData, 'hdfc');
            
            if (transactions.length > 0) {
              allTransactions.push(...transactions);
              console.log(`✅ Extracted ${transactions.length} transactions from ${attachment.filename}`);
            }
          }
        }
        
        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing email ${email.id}:`, error);
      }
    }

    // Update last processed date
    if (emails.length > 0) {
      this.config.lastProcessedDate = new Date().toISOString();
      this.saveConfig(this.config);
    }

    console.log(`🎉 Processed ${processedCount} emails, extracted ${allTransactions.length} transactions`);
    
    return { processed: processedCount, transactions: allTransactions };
  }

  private async parseBankStatementPDF(base64Data: string, bankType: 'hdfc'): Promise<Transaction[]> {
    try {
      console.log('📊 Parsing bank statement PDF...');
      
      // Import the bank statement parser
      const { default: bankStatementParser } = await import('./bankStatementParser');
      
      // Extract text from PDF
      const pdfText = await bankStatementParser.extractTextFromPDF(base64Data);
      
      // Parse based on bank type
      let statementData;
      switch (bankType) {
        case 'hdfc':
          statementData = await bankStatementParser.parseHDFCStatement(pdfText);
          break;
        default:
          throw new Error(`Unsupported bank type: ${bankType}`);
      }
      
      // Find linked bank account
      const linkedAccountId = this.config.bankFilters[bankType].linkedAccountId || '';
      
      // Convert to app transactions
      const transactions = bankStatementParser.convertToAppTransactions(statementData, linkedAccountId);
      
      console.log(`✅ Successfully parsed ${transactions.length} transactions from ${statementData.bankName} statement`);
      console.log(`📊 Statement period: ${statementData.statementPeriod.from} to ${statementData.statementPeriod.to}`);
      console.log(`💰 Account: ${statementData.accountNumber} (${statementData.accountHolder})`);
      
      return transactions;
    } catch (error) {
      console.error('❌ Error parsing PDF:', error);
      return [];
    }
  }

  public async startAutoCrawl(): Promise<void> {
    if (!this.config.autoImport) {
      console.log('Auto-import is disabled');
      return;
    }

    console.log('🚀 Starting auto-crawl for bank statements...');
    
    // Set up periodic checking (every 6 hours)
    const intervalId = setInterval(async () => {
      try {
        await this.processNewEmails();
      } catch (error) {
        console.error('Error in auto-crawl:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Store interval ID for cleanup
    localStorage.setItem('gmailCrawlerInterval', intervalId.toString());
  }

  public stopAutoCrawl(): void {
    const intervalId = localStorage.getItem('gmailCrawlerInterval');
    if (intervalId) {
      clearInterval(parseInt(intervalId));
      localStorage.removeItem('gmailCrawlerInterval');
      console.log('🛑 Auto-crawl stopped');
    }
  }
}

export default new GmailCrawlerService();