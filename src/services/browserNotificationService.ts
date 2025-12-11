import { Bill, RecurringTransaction } from '../types';

class BrowserNotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkPermission();
  }

  private async checkPermission(): Promise<void> {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  public isSupported(): boolean {
    return 'Notification' in window;
  }

  public isEnabled(): boolean {
    return this.permission === 'granted';
  }

  public async sendBillReminder(bill: Bill, daysUntilDue: number): Promise<void> {
    if (!this.isEnabled()) return;

    const urgencyText = daysUntilDue === 0 ? 'TODAY' : 
                       daysUntilDue === 1 ? 'TOMORROW' : 
                       `in ${daysUntilDue} days`;

    const notification = new Notification(`💳 Bill Due ${urgencyText}`, {
      body: `${bill.name} - ₹${bill.amount.toLocaleString('en-IN')}`,
      icon: '/favicon.ico',
      tag: `bill-${bill.id}`,
      requireInteraction: daysUntilDue <= 1
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/recurring';
      notification.close();
    };

    // Auto-close after 10 seconds unless it's urgent
    if (daysUntilDue > 1) {
      setTimeout(() => notification.close(), 10000);
    }
  }

  public async sendRecurringReminder(recurring: RecurringTransaction, daysUntilDue: number): Promise<void> {
    if (!this.isEnabled()) return;

    const urgencyText = daysUntilDue === 0 ? 'TODAY' : 
                       daysUntilDue === 1 ? 'TOMORROW' : 
                       `in ${daysUntilDue} days`;

    const typeIcon = recurring.type === 'income' ? '💰' : '💸';
    const typeText = recurring.type === 'income' ? 'Income' : 'Payment';

    const notification = new Notification(`${typeIcon} ${typeText} Due ${urgencyText}`, {
      body: `${recurring.name} - ${recurring.type === 'income' ? '+' : '-'}₹${recurring.amount.toLocaleString('en-IN')}`,
      icon: '/favicon.ico',
      tag: `recurring-${recurring.id}`,
      requireInteraction: daysUntilDue <= 1
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/recurring';
      notification.close();
    };

    if (daysUntilDue > 1) {
      setTimeout(() => notification.close(), 10000);
    }
  }

  public async sendBudgetAlert(currentSpending: number, budgetLimit: number, percentage: number): Promise<void> {
    if (!this.isEnabled()) return;

    const notification = new Notification(`📊 Budget Alert: ${percentage.toFixed(0)}% Used`, {
      body: `Spent ₹${currentSpending.toLocaleString('en-IN')} of ₹${budgetLimit.toLocaleString('en-IN')} budget`,
      icon: '/favicon.ico',
      tag: 'budget-alert',
      requireInteraction: percentage >= 90
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/transactions';
      notification.close();
    };

    setTimeout(() => notification.close(), 15000);
  }

  public async sendOverdueAlert(items: (Bill | RecurringTransaction)[]): Promise<void> {
    if (!this.isEnabled()) return;

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    const notification = new Notification(`🚨 ${items.length} Overdue Payment${items.length > 1 ? 's' : ''}`, {
      body: `Total: ₹${totalAmount.toLocaleString('en-IN')} - Immediate action required!`,
      icon: '/favicon.ico',
      tag: 'overdue-alert',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/recurring';
      notification.close();
    };
  }

  public async sendTestNotification(): Promise<boolean> {
    if (!this.isEnabled()) {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    const notification = new Notification('✅ FinanceTracker Notifications Enabled!', {
      body: 'You will now receive browser notifications for bills, budgets, and financial alerts.',
      icon: '/favicon.ico',
      tag: 'test-notification'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 5000);
    return true;
  }
}

export default new BrowserNotificationService();