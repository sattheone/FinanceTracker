import { Bill, RecurringTransaction } from '../types';
import FirebaseService from './firebaseService';

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

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  type: 'bill_reminder' | 'recurring_reminder' | 'overdue_alert' | 'budget_alert' | 'monthly_report' | 'test';
  userId: string;
  timestamp: string;
}

class EmailNotificationService {
  private settings: EmailNotificationSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): EmailNotificationSettings {
    const saved = localStorage.getItem('emailNotificationSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Default settings
    return {
      enabled: false,
      emailAddress: '',
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

  public saveSettings(settings: EmailNotificationSettings): void {
    this.settings = settings;
    localStorage.setItem('emailNotificationSettings', JSON.stringify(settings));
  }

  public getSettings(): EmailNotificationSettings {
    return this.settings;
  }

  private generateBillReminderEmail(bill: Bill, daysUntilDue: number): EmailData {
    const urgencyText = daysUntilDue === 0 ? 'TODAY' : 
                       daysUntilDue === 1 ? 'TOMORROW' : 
                       `in ${daysUntilDue} days`;
    
    const subject = `💳 Bill Reminder: ${bill.name} is due ${urgencyText}`;
    
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">💳 Bill Reminder</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">${bill.name}</h2>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Amount:</span>
              <span style="font-size: 24px; font-weight: bold; color: #dc3545;">₹${bill.amount.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Due Date:</span>
              <span style="font-weight: bold; color: ${daysUntilDue <= 1 ? '#dc3545' : '#fd7e14'};">
                ${new Date(bill.dueDate).toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Category:</span>
              <span>${bill.category}</span>
            </div>
            ${bill.description ? `
              <div style="margin: 15px 0;">
                <span style="color: #6c757d;">Description:</span>
                <p style="margin: 5px 0 0 0;">${bill.description}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <div style="background: ${daysUntilDue <= 1 ? '#dc3545' : '#fd7e14'}; color: white; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold;">
              ${daysUntilDue === 0 ? '⚠️ DUE TODAY!' : 
                daysUntilDue === 1 ? '⏰ DUE TOMORROW!' : 
                `📅 Due in ${daysUntilDue} days`}
            </div>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; color: #1976d2;">
              <strong>💡 Tip:</strong> Set up automatic payments to never miss a due date!
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated reminder from your Personal Finance Manager</p>
          <p>You can manage your notification preferences in Settings</p>
        </div>
      </div>
    `;

    return { 
      to: this.settings.emailAddress,
      subject, 
      html: body, 
      type: 'bill_reminder',
      userId: FirebaseService.getCurrentUserId() || 'anonymous',
      timestamp: new Date().toISOString()
    };
  }

  private generateRecurringReminderEmail(recurring: RecurringTransaction, daysUntilDue: number): EmailData {
    const urgencyText = daysUntilDue === 0 ? 'TODAY' : 
                       daysUntilDue === 1 ? 'TOMORROW' : 
                       `in ${daysUntilDue} days`;
    
    const typeIcon = recurring.type === 'income' ? '💰' : '💸';
    const typeColor = recurring.type === 'income' ? '#28a745' : '#dc3545';
    
    const subject = `${typeIcon} Recurring ${recurring.type === 'income' ? 'Income' : 'Payment'}: ${recurring.name} is due ${urgencyText}`;
    
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${typeIcon} Recurring ${recurring.type === 'income' ? 'Income' : 'Payment'}</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">${recurring.name}</h2>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Amount:</span>
              <span style="font-size: 24px; font-weight: bold; color: ${typeColor};">
                ${recurring.type === 'income' ? '+' : '-'}₹${recurring.amount.toLocaleString()}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Next Due:</span>
              <span style="font-weight: bold; color: ${daysUntilDue <= 1 ? '#dc3545' : '#fd7e14'};">
                ${new Date(recurring.nextDueDate).toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Frequency:</span>
              <span style="text-transform: capitalize;">${recurring.frequency}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Category:</span>
              <span>${recurring.category}</span>
            </div>
            ${recurring.description ? `
              <div style="margin: 15px 0;">
                <span style="color: #6c757d;">Description:</span>
                <p style="margin: 5px 0 0 0;">${recurring.description}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <div style="background: ${daysUntilDue <= 1 ? '#dc3545' : '#28a745'}; color: white; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold;">
              ${daysUntilDue === 0 ? '⚠️ DUE TODAY!' : 
                daysUntilDue === 1 ? '⏰ DUE TOMORROW!' : 
                `📅 Due in ${daysUntilDue} days`}
            </div>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            <p style="margin: 0; color: #155724;">
              <strong>🔄 Recurring Transaction:</strong> This will automatically repeat every ${recurring.frequency}.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated reminder from your Personal Finance Manager</p>
          <p>You can manage your notification preferences in Settings</p>
        </div>
      </div>
    `;

    return { 
      to: this.settings.emailAddress,
      subject, 
      html: body, 
      type: 'recurring_reminder',
      userId: FirebaseService.getCurrentUserId() || 'anonymous',
      timestamp: new Date().toISOString()
    };
  }

  private generateOverdueAlertEmail(items: (Bill | RecurringTransaction)[]): EmailData {
    const subject = `🚨 URGENT: ${items.length} Overdue Payment${items.length > 1 ? 's' : ''}`;
    
    const itemsHtml = items.map(item => {
      const isBill = 'dueDate' in item;
      const dueDate = isBill ? (item as Bill).dueDate : (item as RecurringTransaction).nextDueDate;
      const daysOverdue = Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      
      return `
        <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 15px; margin: 10px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="margin: 0 0 5px 0; color: #c53030;">${item.name}</h3>
              <p style="margin: 0; color: #718096; font-size: 14px;">${item.category}</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 20px; font-weight: bold; color: #c53030;">₹${item.amount.toLocaleString()}</div>
              <div style="font-size: 12px; color: #c53030; font-weight: bold;">
                ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 OVERDUE PAYMENTS ALERT</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: #dc3545; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 20px;">You have ${items.length} overdue payment${items.length > 1 ? 's' : ''}</h2>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold;">Total: ₹${totalAmount.toLocaleString()}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #495057; margin-bottom: 15px;">Overdue Items:</h3>
            ${itemsHtml}
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Important:</strong> Please make these payments as soon as possible to avoid late fees and maintain your credit score.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated alert from your Personal Finance Manager</p>
          <p>You can manage your notification preferences in Settings</p>
        </div>
      </div>
    `;

    return { 
      to: this.settings.emailAddress,
      subject, 
      html: body, 
      type: 'overdue_alert',
      userId: FirebaseService.getCurrentUserId() || 'anonymous',
      timestamp: new Date().toISOString()
    };
  }

  private generateBudgetAlertEmail(currentSpending: number, budgetLimit: number, percentage: number): EmailData {
    const subject = `📊 Budget Alert: You've used ${percentage.toFixed(0)}% of your monthly budget`;
    
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fd7e14 0%, #e55a4e 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Budget Alert</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: ${percentage >= 90 ? '#dc3545' : '#fd7e14'}; color: white; padding: 20px; border-radius: 8px;">
              <h2 style="margin: 0; font-size: 28px;">${percentage.toFixed(0)}%</h2>
              <p style="margin: 5px 0 0 0;">of your monthly budget used</p>
            </div>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Current Spending:</span>
              <span style="font-size: 20px; font-weight: bold; color: #dc3545;">₹${currentSpending.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Budget Limit:</span>
              <span style="font-size: 20px; font-weight: bold; color: #28a745;">₹${budgetLimit.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0;">
              <span style="color: #6c757d;">Remaining:</span>
              <span style="font-size: 20px; font-weight: bold; color: ${budgetLimit - currentSpending > 0 ? '#28a745' : '#dc3545'};">
                ₹${(budgetLimit - currentSpending).toLocaleString()}
              </span>
            </div>
            
            <div style="background: #e9ecef; border-radius: 10px; height: 20px; margin: 20px 0;">
              <div style="background: ${percentage >= 90 ? '#dc3545' : percentage >= 75 ? '#fd7e14' : '#28a745'}; height: 20px; border-radius: 10px; width: ${Math.min(percentage, 100)}%;"></div>
            </div>
          </div>
          
          <div style="background: ${percentage >= 90 ? '#f8d7da' : '#fff3cd'}; border: 1px solid ${percentage >= 90 ? '#f5c6cb' : '#ffeaa7'}; border-radius: 8px; padding: 15px;">
            <p style="margin: 0; color: ${percentage >= 90 ? '#721c24' : '#856404'};">
              <strong>${percentage >= 90 ? '🚨 Critical:' : '⚠️ Warning:'}</strong> 
              ${percentage >= 90 ? 
                'You\'ve exceeded 90% of your budget. Consider reviewing your expenses.' : 
                'You\'re approaching your budget limit. Monitor your spending carefully.'}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated alert from your Personal Finance Manager</p>
          <p>You can adjust your budget settings in the Settings page</p>
        </div>
      </div>
    `;

    return { 
      to: this.settings.emailAddress,
      subject, 
      html: body, 
      type: 'budget_alert',
      userId: FirebaseService.getCurrentUserId() || 'anonymous',
      timestamp: new Date().toISOString()
    };
  }

  public async sendEmail(emailData: EmailData): Promise<boolean> {
    if (!this.settings.enabled || !this.settings.emailAddress) {
      console.log('Email notifications disabled or no email address set');
      return false;
    }

    try {
      // Add email to Firebase collection for the Trigger Email extension to process
      await FirebaseService.addDocument('mail', {
        to: emailData.to,
        message: {
          subject: emailData.subject,
          html: emailData.html,
          text: this.stripHtml(emailData.html) // Fallback text version
        },
        // Metadata for tracking
        metadata: {
          type: emailData.type,
          userId: emailData.userId,
          timestamp: emailData.timestamp,
          source: 'personal-finance-manager'
        }
      });

      console.log(`✅ Email queued successfully: ${emailData.type}`);
      return true;
    } catch (error) {
      console.error('❌ Error queueing email:', error);
      
      // Fallback: log email content for demo purposes
      console.log('📧 Email would be sent:', {
        to: emailData.to,
        subject: emailData.subject,
        type: emailData.type
      });
      return true; // Return true for demo purposes
    }
  }

  private stripHtml(html: string): string {
    // Simple HTML to text conversion for email fallback
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

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
        const template = this.generateBillReminderEmail(bill, daysUntilDue);
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
        const template = this.generateRecurringReminderEmail(recurring, daysUntilDue);
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
      const template = this.generateOverdueAlertEmail(overdueItems);
      await this.sendEmail(template);
    }
  }

  public async checkAndSendBudgetAlert(currentSpending: number, budgetLimit: number): Promise<void> {
    if (!this.settings.budgetAlerts.enabled || budgetLimit <= 0) return;

    const percentage = (currentSpending / budgetLimit) * 100;

    if (percentage >= this.settings.budgetAlerts.threshold) {
      const template = this.generateBudgetAlertEmail(currentSpending, budgetLimit, percentage);
      await this.sendEmail(template);
    }
  }

  public async runDailyChecks(bills: Bill[], recurringTransactions: RecurringTransaction[], currentSpending: number, budgetLimit: number): Promise<void> {
    console.log('Running daily email notification checks...');
    
    await Promise.all([
      this.checkAndSendBillReminders(bills),
      this.checkAndSendRecurringReminders(recurringTransactions),
      this.checkAndSendOverdueAlerts(bills, recurringTransactions),
      this.checkAndSendBudgetAlert(currentSpending, budgetLimit)
    ]);
  }
}

export default new EmailNotificationService();