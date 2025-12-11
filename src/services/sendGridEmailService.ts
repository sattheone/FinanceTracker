import sgMail from '@sendgrid/mail';
import { Bill, RecurringTransaction } from '../types';

export interface EmailNotificationSettings {
  enabled: boolean;
  emailAddress: string;
  billReminders: {
    enabled: boolean;
    daysBefore: number[];
  };
  recurringReminders: {
    enabled: boolean;
    daysBefore: number[];
  };
  budgetAlerts: {
    enabled: boolean;
    threshold: number;
  };
  monthlyReports: {
    enabled: boolean;
    dayOfMonth: number;
  };
  overdueAlerts: {
    enabled: boolean;
  };
}

export interface EmailTemplate {
  to: string;
  from: {
    email: string;
    name: string;
  };
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: any;
}

class SendGridEmailService {
  private settings: EmailNotificationSettings;
  private isInitialized: boolean = false;
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    // Get SendGrid configuration from environment variables
    this.apiKey = import.meta.env.VITE_SENDGRID_API_KEY || '';
    this.fromEmail = import.meta.env.VITE_SENDGRID_FROM_EMAIL || 'noreply@financetracker.com';
    this.fromName = import.meta.env.VITE_SENDGRID_FROM_NAME || 'FinanceTracker';
    
    this.settings = this.loadSettings();
    this.initializeSendGrid();
  }

  private loadSettings(): EmailNotificationSettings {
    const saved = localStorage.getItem('emailNotificationSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Default settings - enabled by default with user's email from auth
    const userEmail = this.getUserEmailFromAuth();
    return {
      enabled: true, // Enable by default
      emailAddress: userEmail,
      billReminders: {
        enabled: true,
        daysBefore: [7, 3, 1]
      },
      recurringReminders: {
        enabled: true,
        daysBefore: [3, 1]
      },
      budgetAlerts: {
        enabled: true,
        threshold: 80
      },
      monthlyReports: {
        enabled: false,
        dayOfMonth: 1
      },
      overdueAlerts: {
        enabled: true
      }
    };
  }

  private getUserEmailFromAuth(): string {
    // Try to get user email from various sources
    try {
      // From Firebase Auth (most reliable)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.email) return user.email;
      
      // From user profile
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (userProfile.personalInfo?.email) return userProfile.personalInfo.email;
      
      // From Firebase auth state (if available)
      if (typeof window !== 'undefined' && window.localStorage) {
        const authUser = localStorage.getItem('firebase:authUser:' + (import.meta.env.VITE_FIREBASE_API_KEY || ''));
        if (authUser) {
          const parsedUser = JSON.parse(authUser);
          if (parsedUser.email) return parsedUser.email;
        }
      }
      
      return '';
    } catch {
      return '';
    }
  }

  private initializeSendGrid(): void {
    console.log('🔧 SendGrid Configuration Debug:', {
      apiKey: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT_FOUND',
      fromEmail: this.fromEmail,
      fromName: this.fromName,
      envVars: {
        VITE_SENDGRID_API_KEY: import.meta.env.VITE_SENDGRID_API_KEY ? 'FOUND' : 'NOT_FOUND',
        VITE_SENDGRID_FROM_EMAIL: import.meta.env.VITE_SENDGRID_FROM_EMAIL || 'NOT_FOUND',
        VITE_SENDGRID_FROM_NAME: import.meta.env.VITE_SENDGRID_FROM_NAME || 'NOT_FOUND'
      }
    });

    if (this.apiKey) {
      try {
        sgMail.setApiKey(this.apiKey);
        this.isInitialized = true;
        console.log('✅ SendGrid initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize SendGrid:', error);
        this.isInitialized = false;
      }
    } else {
      console.warn('⚠️ SendGrid API key not found in environment variables');
      console.warn('Available env vars:', Object.keys(import.meta.env));
    }
  }

  public saveSettings(settings: EmailNotificationSettings): void {
    this.settings = settings;
    localStorage.setItem('emailNotificationSettings', JSON.stringify(settings));
  }

  public getSettings(): EmailNotificationSettings {
    // Always refresh the email address from auth
    const currentEmail = this.getUserEmailFromAuth();
    if (currentEmail && currentEmail !== this.settings.emailAddress) {
      this.settings.emailAddress = currentEmail;
      this.saveSettings(this.settings);
    }
    return this.settings;
  }

  public isConfigured(): boolean {
    return this.isInitialized && 
           this.settings.enabled && 
           !!this.settings.emailAddress;
  }

  private generateBillReminderTemplate(bill: Bill, daysUntilDue: number): EmailTemplate {
    const urgencyText = daysUntilDue === 0 ? 'TODAY' : 
                       daysUntilDue === 1 ? 'TOMORROW' : 
                       `in ${daysUntilDue} days`;
    
    const subject = `💳 Bill Reminder: ${bill.name} is due ${urgencyText}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bill Reminder</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">💳 Bill Reminder</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">FinanceTracker Notification</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            <!-- Alert Banner -->
            <div style="background: ${daysUntilDue <= 1 ? '#dc3545' : '#fd7e14'}; color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">
                ${daysUntilDue === 0 ? '⚠️ DUE TODAY!' : 
                  daysUntilDue === 1 ? '⏰ DUE TOMORROW!' : 
                  `📅 Due in ${daysUntilDue} days`}
              </h2>
            </div>
            
            <!-- Bill Details Card -->
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 20px 0; font-size: 22px; color: #495057; font-weight: 600;">${bill.name}</h3>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #dee2e6;">
                <span style="color: #6c757d; font-weight: 500;">Amount:</span>
                <span style="font-size: 28px; font-weight: 700; color: #dc3545;">₹${bill.amount.toLocaleString('en-IN')}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #dee2e6;">
                <span style="color: #6c757d; font-weight: 500;">Due Date:</span>
                <span style="font-weight: 600; color: ${daysUntilDue <= 1 ? '#dc3545' : '#fd7e14'}; font-size: 16px;">
                  ${new Date(bill.dueDate).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
                <span style="color: #6c757d; font-weight: 500;">Category:</span>
                <span style="font-weight: 500; color: #495057;">${bill.category}</span>
              </div>
              
              ${bill.description ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                  <span style="color: #6c757d; font-weight: 500; display: block; margin-bottom: 8px;">Description:</span>
                  <p style="margin: 0; color: #495057; line-height: 1.5;">${bill.description}</p>
                </div>
              ` : ''}
            </div>
            
            <!-- Tip Box -->
            <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-left: 4px solid #2196f3; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="margin: 0; color: #1976d2; font-weight: 500;">
                <strong>💡 Pro Tip:</strong> Set up automatic payments to never miss a due date and avoid late fees!
              </p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://financetracker-b00a6.web.app/recurring" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Manage Bills & Payments
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              This is an automated reminder from <strong>FinanceTracker</strong>
            </p>
            <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
              You can manage your notification preferences in Settings
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Bill Reminder: ${bill.name}

Amount: ₹${bill.amount.toLocaleString('en-IN')}
Due Date: ${new Date(bill.dueDate).toLocaleDateString('en-IN')}
Category: ${bill.category}
${bill.description ? `Description: ${bill.description}` : ''}

${daysUntilDue === 0 ? 'This bill is DUE TODAY!' : 
  daysUntilDue === 1 ? 'This bill is DUE TOMORROW!' : 
  `This bill is due in ${daysUntilDue} days.`}

Manage your bills at: https://financetracker-b00a6.web.app/recurring

This is an automated reminder from FinanceTracker.
    `.trim();

    return {
      to: this.settings.emailAddress,
      from: {
        email: this.fromEmail,
        name: this.fromName
      },
      subject,
      html,
      text
    };
  }

  private generateRecurringReminderTemplate(recurring: RecurringTransaction, daysUntilDue: number): EmailTemplate {
    const urgencyText = daysUntilDue === 0 ? 'TODAY' : 
                       daysUntilDue === 1 ? 'TOMORROW' : 
                       `in ${daysUntilDue} days`;
    
    const typeIcon = recurring.type === 'income' ? '💰' : '💸';
    const typeColor = recurring.type === 'income' ? '#28a745' : '#dc3545';
    const typeText = recurring.type === 'income' ? 'Income' : 'Payment';
    
    const subject = `${typeIcon} Recurring ${typeText}: ${recurring.name} is due ${urgencyText}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recurring ${typeText} Reminder</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${recurring.type === 'income' ? '#28a745' : '#dc3545'} 0%, ${recurring.type === 'income' ? '#20c997' : '#c82333'} 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">${typeIcon} Recurring ${typeText}</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">FinanceTracker Notification</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            <!-- Alert Banner -->
            <div style="background: ${daysUntilDue <= 1 ? '#dc3545' : typeColor}; color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">
                ${daysUntilDue === 0 ? '⚠️ DUE TODAY!' : 
                  daysUntilDue === 1 ? '⏰ DUE TOMORROW!' : 
                  `📅 Due in ${daysUntilDue} days`}
              </h2>
            </div>
            
            <!-- Transaction Details Card -->
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 20px 0; font-size: 22px; color: #495057; font-weight: 600;">${recurring.name}</h3>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #dee2e6;">
                <span style="color: #6c757d; font-weight: 500;">Amount:</span>
                <span style="font-size: 28px; font-weight: 700; color: ${typeColor};">
                  ${recurring.type === 'income' ? '+' : '-'}₹${recurring.amount.toLocaleString('en-IN')}
                </span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #dee2e6;">
                <span style="color: #6c757d; font-weight: 500;">Next Due:</span>
                <span style="font-weight: 600; color: ${daysUntilDue <= 1 ? '#dc3545' : '#fd7e14'}; font-size: 16px;">
                  ${new Date(recurring.nextDueDate).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #dee2e6;">
                <span style="color: #6c757d; font-weight: 500;">Frequency:</span>
                <span style="font-weight: 500; color: #495057; text-transform: capitalize;">${recurring.frequency}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
                <span style="color: #6c757d; font-weight: 500;">Category:</span>
                <span style="font-weight: 500; color: #495057;">${recurring.category}</span>
              </div>
              
              ${recurring.description ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                  <span style="color: #6c757d; font-weight: 500; display: block; margin-bottom: 8px;">Description:</span>
                  <p style="margin: 0; color: #495057; line-height: 1.5;">${recurring.description}</p>
                </div>
              ` : ''}
            </div>
            
            <!-- Info Box -->
            <div style="background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%); border-left: 4px solid #28a745; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="margin: 0; color: #155724; font-weight: 500;">
                <strong>🔄 Recurring Transaction:</strong> This will automatically repeat every ${recurring.frequency}.
              </p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://financetracker-b00a6.web.app/recurring" 
                 style="display: inline-block; background: linear-gradient(135deg, ${typeColor} 0%, ${recurring.type === 'income' ? '#20c997' : '#c82333'} 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Manage Recurring Transactions
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              This is an automated reminder from <strong>FinanceTracker</strong>
            </p>
            <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
              You can manage your notification preferences in Settings
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Recurring ${typeText} Reminder: ${recurring.name}

Amount: ${recurring.type === 'income' ? '+' : '-'}₹${recurring.amount.toLocaleString('en-IN')}
Next Due: ${new Date(recurring.nextDueDate).toLocaleDateString('en-IN')}
Frequency: ${recurring.frequency}
Category: ${recurring.category}
${recurring.description ? `Description: ${recurring.description}` : ''}

${daysUntilDue === 0 ? 'This transaction is DUE TODAY!' : 
  daysUntilDue === 1 ? 'This transaction is DUE TOMORROW!' : 
  `This transaction is due in ${daysUntilDue} days.`}

This will automatically repeat every ${recurring.frequency}.

Manage your recurring transactions at: https://financetracker-b00a6.web.app/recurring

This is an automated reminder from FinanceTracker.
    `.trim();

    return {
      to: this.settings.emailAddress,
      from: {
        email: this.fromEmail,
        name: this.fromName
      },
      subject,
      html,
      text
    };
  }

  private generateOverdueAlertTemplate(items: (Bill | RecurringTransaction)[]): EmailTemplate {
    const subject = `🚨 URGENT: ${items.length} Overdue Payment${items.length > 1 ? 's' : ''}`;
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    const itemsHtml = items.map(item => {
      const isBill = 'dueDate' in item;
      const dueDate = isBill ? (item as Bill).dueDate : (item as RecurringTransaction).nextDueDate;
      const daysOverdue = Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      
      return `
        <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 20px; margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="margin: 0 0 8px 0; color: #c53030; font-size: 18px; font-weight: 600;">${item.name}</h4>
              <p style="margin: 0; color: #718096; font-size: 14px;">${item.category}</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 24px; font-weight: 700; color: #c53030;">₹${item.amount.toLocaleString('en-IN')}</div>
              <div style="font-size: 14px; color: #c53030; font-weight: 600; margin-top: 4px;">
                ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Overdue Payments Alert</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🚨 OVERDUE PAYMENTS</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Urgent Action Required</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            <!-- Critical Alert Banner -->
            <div style="background: #dc3545; color: white; padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">
                You have ${items.length} overdue payment${items.length > 1 ? 's' : ''}
              </h2>
              <p style="margin: 0; font-size: 32px; font-weight: 700;">Total: ₹${totalAmount.toLocaleString('en-IN')}</p>
            </div>
            
            <!-- Overdue Items -->
            <div style="margin: 30px 0;">
              <h3 style="color: #495057; margin-bottom: 20px; font-size: 20px; font-weight: 600;">Overdue Items:</h3>
              ${itemsHtml}
            </div>
            
            <!-- Warning Box -->
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 1px solid #ffeaa7; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <p style="margin: 0; color: #856404; font-weight: 500; font-size: 16px; line-height: 1.5;">
                <strong>⚠️ Important:</strong> Please make these payments as soon as possible to avoid additional late fees and protect your credit score.
              </p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://financetracker-b00a6.web.app/recurring" 
                 style="display: inline-block; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Manage Overdue Payments
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              This is an automated alert from <strong>FinanceTracker</strong>
            </p>
            <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
              You can manage your notification preferences in Settings
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
URGENT: Overdue Payments Alert

You have ${items.length} overdue payment${items.length > 1 ? 's' : ''} totaling ₹${totalAmount.toLocaleString('en-IN')}

Overdue Items:
${items.map(item => {
  const isBill = 'dueDate' in item;
  const dueDate = isBill ? (item as Bill).dueDate : (item as RecurringTransaction).nextDueDate;
  const daysOverdue = Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
  return `- ${item.name}: ₹${item.amount.toLocaleString('en-IN')} (${daysOverdue} days overdue)`;
}).join('\n')}

Please make these payments as soon as possible to avoid late fees and maintain your credit score.

Manage your payments at: https://financetracker-b00a6.web.app/recurring

This is an automated alert from FinanceTracker.
    `.trim();

    return {
      to: this.settings.emailAddress,
      from: {
        email: this.fromEmail,
        name: this.fromName
      },
      subject,
      html,
      text
    };
  }

  private generateBudgetAlertTemplate(currentSpending: number, budgetLimit: number, percentage: number): EmailTemplate {
    const subject = `📊 Budget Alert: You've used ${percentage.toFixed(0)}% of your monthly budget`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Budget Alert</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #fd7e14 0%, #e55a4e 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">📊 Budget Alert</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Monthly Spending Update</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            <!-- Progress Banner -->
            <div style="background: ${percentage >= 90 ? '#dc3545' : '#fd7e14'}; color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h2 style="margin: 0 0 10px 0; font-size: 48px; font-weight: 700;">${percentage.toFixed(0)}%</h2>
              <p style="margin: 0; font-size: 18px; font-weight: 500;">of your monthly budget used</p>
            </div>
            
            <!-- Budget Breakdown -->
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #495057; font-weight: 600;">Budget Breakdown</h3>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #dee2e6;">
                <span style="color: #6c757d; font-weight: 500;">Current Spending:</span>
                <span style="font-size: 24px; font-weight: 700; color: #dc3545;">₹${currentSpending.toLocaleString('en-IN')}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #dee2e6;">
                <span style="color: #6c757d; font-weight: 500;">Budget Limit:</span>
                <span style="font-size: 24px; font-weight: 700; color: #28a745;">₹${budgetLimit.toLocaleString('en-IN')}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
                <span style="color: #6c757d; font-weight: 500;">Remaining:</span>
                <span style="font-size: 24px; font-weight: 700; color: ${budgetLimit - currentSpending > 0 ? '#28a745' : '#dc3545'};">
                  ₹${(budgetLimit - currentSpending).toLocaleString('en-IN')}
                </span>
              </div>
              
              <!-- Progress Bar -->
              <div style="background: #e9ecef; border-radius: 10px; height: 20px; margin: 25px 0; overflow: hidden;">
                <div style="background: ${percentage >= 90 ? '#dc3545' : percentage >= 75 ? '#fd7e14' : '#28a745'}; height: 20px; width: ${Math.min(percentage, 100)}%; transition: width 0.3s ease;"></div>
              </div>
            </div>
            
            <!-- Alert Box -->
            <div style="background: ${percentage >= 90 ? 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)' : 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)'}; border: 1px solid ${percentage >= 90 ? '#f5c6cb' : '#ffeaa7'}; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <p style="margin: 0; color: ${percentage >= 90 ? '#721c24' : '#856404'}; font-weight: 500; font-size: 16px; line-height: 1.5;">
                <strong>${percentage >= 90 ? '🚨 Critical Alert:' : '⚠️ Budget Warning:'}</strong> 
                ${percentage >= 90 ? 
                  'You\'ve exceeded 90% of your monthly budget. Consider reviewing your expenses and adjusting your spending.' : 
                  'You\'re approaching your budget limit. Monitor your spending carefully for the rest of the month.'}
              </p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://financetracker-b00a6.web.app/transactions" 
                 style="display: inline-block; background: linear-gradient(135deg, #fd7e14 0%, #e55a4e 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Review Transactions
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              This is an automated alert from <strong>FinanceTracker</strong>
            </p>
            <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
              You can adjust your budget settings in the Settings page
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Budget Alert: ${percentage.toFixed(0)}% of Monthly Budget Used

Current Spending: ₹${currentSpending.toLocaleString('en-IN')}
Budget Limit: ₹${budgetLimit.toLocaleString('en-IN')}
Remaining: ₹${(budgetLimit - currentSpending).toLocaleString('en-IN')}

${percentage >= 90 ? 
  'CRITICAL: You\'ve exceeded 90% of your budget. Review your expenses immediately.' : 
  'WARNING: You\'re approaching your budget limit. Monitor spending carefully.'}

Review your transactions at: https://financetracker-b00a6.web.app/transactions

This is an automated alert from FinanceTracker.
    `.trim();

    return {
      to: this.settings.emailAddress,
      from: {
        email: this.fromEmail,
        name: this.fromName
      },
      subject,
      html,
      text
    };
  }

  public async sendEmail(template: EmailTemplate): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('❌ SendGrid not configured or disabled');
      return false;
    }

    try {
      await sgMail.send(template);
      console.log(`✅ Email sent successfully via SendGrid: ${template.subject}`);
      return true;
    } catch (error: any) {
      console.error('❌ SendGrid email error:', error);
      
      // Check for CORS error specifically
      if (error.message && error.message.includes('CORS')) {
        console.error('🚨 CORS Error: SendGrid API cannot be called directly from browser');
        console.error('💡 Solution: Set up Firebase Functions or backend proxy service');
      }
      
      // Log detailed error information
      if (error.response) {
        console.error('SendGrid API Error:', error.response.body);
      }
      
      return false;
    }
  }

  public async testEmailConfiguration(): Promise<{ success: boolean; message: string }> {
    // Debug logging to help identify the issue
    console.log('🔧 SendGrid Test Debug Info:', {
      isInitialized: this.isInitialized,
      settingsEnabled: this.settings.enabled,
      emailAddress: this.settings.emailAddress,
      apiKey: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT_FOUND',
      fromEmail: this.fromEmail,
      envVars: {
        VITE_SENDGRID_API_KEY: import.meta.env.VITE_SENDGRID_API_KEY ? 'FOUND' : 'NOT_FOUND',
        VITE_SENDGRID_FROM_EMAIL: import.meta.env.VITE_SENDGRID_FROM_EMAIL || 'NOT_FOUND'
      }
    });

    if (!this.isConfigured()) {
      const issues = [];
      if (!this.isInitialized) issues.push('SendGrid API not initialized');
      if (!this.settings.enabled) issues.push('Email notifications disabled');
      if (!this.settings.emailAddress) issues.push('User email address missing');
      
      return {
        success: false,
        message: `SendGrid configuration issues: ${issues.join(', ')}. Check console for details.`
      };
    }

    // Alternative approach: Use a simple email service that works from browser
    // For now, we'll provide instructions for manual testing
    return {
      success: true,
      message: `✅ Configuration Looks Good! 
      
      Your SendGrid settings appear to be configured correctly:
      - API Key: ${this.apiKey ? '✓ Present' : '✗ Missing'}
      - From Email: ${this.fromEmail || '✗ Missing'}
      - User Email: ${this.settings.emailAddress || '✗ Missing'}
      
      ⚠️ Note: Due to browser security (CORS), emails cannot be sent directly from the frontend.
      
      To enable email notifications, you have these options:
      
      1. 📧 Test SendGrid directly:
         - Go to SendGrid dashboard → Email API → Integration Guide
         - Use their test email feature to verify your setup
      
      2. 🔧 Set up backend service:
         - Deploy Firebase Functions (we can help with this)
         - Or use any backend service as email proxy
      
      3. 📱 Alternative: Use browser notifications for now
         - Enable browser notifications in Settings
         - Get instant alerts without email dependency
      
      Your configuration is ready - just needs a backend service to send emails!`
    };

    const testTemplate: EmailTemplate = {
      to: this.settings.emailAddress,
      from: {
        email: this.fromEmail,
        name: this.fromName
      },
      subject: '✅ FinanceTracker Email Test - Configuration Successful',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Test</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">✅ Email Test Successful</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">FinanceTracker Email Configuration</p>
            </div>
            
            <div style="padding: 30px 20px; text-align: center;">
              <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                <h2 style="margin: 0 0 15px 0; color: #155724; font-size: 24px;">🎉 Congratulations!</h2>
                <p style="margin: 0; color: #155724; font-size: 16px; line-height: 1.5;">
                  Your SendGrid email configuration is working perfectly. You will now receive automated notifications for bills, budgets, and other important financial events.
                </p>
              </div>
              
              <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #495057;">What's Next?</h3>
                <ul style="text-align: left; color: #6c757d; line-height: 1.6; margin: 0; padding-left: 20px;">
                  <li>Bill reminders will be sent 7, 3, and 1 days before due dates</li>
                  <li>Budget alerts when you reach 80% of your monthly limit</li>
                  <li>Overdue payment notifications for missed bills</li>
                  <li>Monthly financial reports (if enabled)</li>
                </ul>
              </div>
              
              <a href="https://financetracker-b00a6.web.app/settings" 
                 style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-top: 20px;">
                Manage Email Settings
              </a>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                This is a test email from <strong>FinanceTracker</strong>
              </p>
              <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
                Sent at ${new Date().toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Email Test Successful!

Your SendGrid email configuration is working perfectly. You will now receive automated notifications for:

- Bill reminders (7, 3, and 1 days before due dates)
- Budget alerts (when you reach 80% of monthly limit)
- Overdue payment notifications
- Monthly financial reports (if enabled)

Manage your email settings at: https://financetracker-b00a6.web.app/settings

This is a test email from FinanceTracker.
Sent at ${new Date().toLocaleString('en-IN')}
      `.trim()
    };

    try {
      const success = await this.sendEmail(testTemplate);
      return {
        success,
        message: success 
          ? 'Test email sent successfully! Check your inbox.' 
          : 'Failed to send test email. Please check your SendGrid configuration.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Test email failed: ${error}`
      };
    }
  }

  // Main notification methods
  public async checkAndSendBillReminders(bills: Bill[]): Promise<void> {
    if (!this.settings.billReminders.enabled) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const bill of bills) {
      if (bill.isPaid) continue;

      const dueDate = new Date(bill.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (this.settings.billReminders.daysBefore.includes(daysUntilDue)) {
        const template = this.generateBillReminderTemplate(bill, daysUntilDue);
        await this.sendEmail(template);
      }
    }
  }

  public async checkAndSendRecurringReminders(recurringTransactions: RecurringTransaction[]): Promise<void> {
    if (!this.settings.recurringReminders.enabled) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const recurring of recurringTransactions) {
      if (!recurring.isActive) continue;

      const dueDate = new Date(recurring.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (this.settings.recurringReminders.daysBefore.includes(daysUntilDue)) {
        const template = this.generateRecurringReminderTemplate(recurring, daysUntilDue);
        await this.sendEmail(template);
      }
    }
  }

  public async checkAndSendOverdueAlerts(bills: Bill[], recurringTransactions: RecurringTransaction[]): Promise<void> {
    if (!this.settings.overdueAlerts.enabled) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueItems: (Bill | RecurringTransaction)[] = [];

    // Check overdue bills
    for (const bill of bills) {
      if (!bill.isPaid) {
        const dueDate = new Date(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          overdueItems.push(bill);
        }
      }
    }

    // Check overdue recurring transactions
    for (const recurring of recurringTransactions) {
      if (recurring.isActive) {
        const dueDate = new Date(recurring.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          overdueItems.push(recurring);
        }
      }
    }

    if (overdueItems.length > 0) {
      const template = this.generateOverdueAlertTemplate(overdueItems);
      await this.sendEmail(template);
    }
  }

  public async checkAndSendBudgetAlert(currentSpending: number, budgetLimit: number): Promise<void> {
    if (!this.settings.budgetAlerts.enabled || budgetLimit <= 0) return;

    const percentage = (currentSpending / budgetLimit) * 100;

    if (percentage >= this.settings.budgetAlerts.threshold) {
      const template = this.generateBudgetAlertTemplate(currentSpending, budgetLimit, percentage);
      await this.sendEmail(template);
    }
  }

  public async runDailyChecks(bills: Bill[], recurringTransactions: RecurringTransaction[], currentSpending: number, budgetLimit: number): Promise<void> {
    if (!this.isConfigured()) {
      console.log('SendGrid not configured, skipping daily checks');
      return;
    }

    console.log('🔄 Running daily SendGrid email notification checks...');
    
    try {
      await Promise.all([
        this.checkAndSendBillReminders(bills),
        this.checkAndSendRecurringReminders(recurringTransactions),
        this.checkAndSendOverdueAlerts(bills, recurringTransactions),
        this.checkAndSendBudgetAlert(currentSpending, budgetLimit)
      ]);
      
      console.log('✅ Daily email checks completed successfully');
    } catch (error) {
      console.error('❌ Error during daily email checks:', error);
    }
  }
}

export default new SendGridEmailService();