import sendGridEmailService from './sendGridEmailService';
import { Bill, RecurringTransaction, Transaction } from '../types';

class NotificationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private lastCheckDate: string | null = null;

  constructor() {
    this.lastCheckDate = localStorage.getItem('lastNotificationCheck');
    this.startScheduler();
  }

  private startScheduler(): void {
    // Check every hour for notifications
    this.intervalId = setInterval(() => {
      this.checkForNotifications();
    }, 60 * 60 * 1000); // 1 hour

    // Also check immediately if we haven't checked today
    this.checkForNotifications();
  }

  private shouldRunDailyCheck(): boolean {
    const today = new Date().toDateString();
    return this.lastCheckDate !== today;
  }

  private markDailyCheckComplete(): void {
    const today = new Date().toDateString();
    this.lastCheckDate = today;
    localStorage.setItem('lastNotificationCheck', today);
  }

  public async checkForNotifications(): Promise<void> {
    if (!this.shouldRunDailyCheck()) {
      return;
    }

    try {
      // Get data from localStorage (since we don't have direct access to DataContext here)
      const bills: Bill[] = JSON.parse(localStorage.getItem('bills') || '[]');
      const recurringTransactions: RecurringTransaction[] = JSON.parse(localStorage.getItem('recurringTransactions') || '[]');
      const transactions: Transaction[] = JSON.parse(localStorage.getItem('transactions') || '[]');
      const settings = JSON.parse(localStorage.getItem('emailNotificationSettings') || '{}');

      // Calculate current month spending for budget alerts
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const currentMonthSpending = transactions
        .filter(t => {
          const transactionDate = new Date(t.date);
          return t.type === 'expense' && 
                 transactionDate.getMonth() === currentMonth && 
                 transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const budgetLimit = settings.budgetLimit || 0;

      // Run all notification checks
      await sendGridEmailService.runDailyChecks(
        bills,
        recurringTransactions,
        currentMonthSpending,
        budgetLimit
      );

      this.markDailyCheckComplete();
      console.log('Daily notification checks completed successfully');
    } catch (error) {
      console.error('Error running notification checks:', error);
    }
  }

  public async sendTestEmail(_userEmail: string): Promise<boolean> {
    try {
      const result = await sendGridEmailService.testEmailConfiguration();
      return result.success;
    } catch (error) {
      console.error('Test email failed:', error);
      return false;
    }
  }

  public stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public forceCheck(): Promise<void> {
    // Force a check regardless of last check date
    this.lastCheckDate = null;
    return this.checkForNotifications();
  }
}

export default new NotificationScheduler();