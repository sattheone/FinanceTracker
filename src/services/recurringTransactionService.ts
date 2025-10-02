import { RecurringTransaction, Bill } from '../types';

export class RecurringTransactionService {
  // Process recurring transactions and create bills
  static processRecurringTransactions(recurringTransactions: RecurringTransaction[]): Bill[] {
    const today = new Date();
    const bills: Bill[] = [];

    recurringTransactions.forEach(rt => {
      if (!rt.isActive) return;

      const nextDue = new Date(rt.nextDueDate);
      
      // Check if we need to create a bill for this recurring transaction
      if (this.shouldCreateBill(nextDue, today, rt.reminderDays)) {
        const bill: Bill = {
          id: `bill_${rt.id}_${nextDue.getTime()}`,
          name: rt.name,
          description: rt.description,
          category: rt.category,
          amount: rt.amount,
          dueDate: rt.nextDueDate,
          frequency: this.mapFrequencyToBillFrequency(rt.frequency),
          isPaid: false,
          reminderDays: rt.reminderDays,
          isOverdue: nextDue < today,
          recurringTransactionId: rt.id,
          bankAccountId: rt.bankAccountId,
          vendor: rt.vendor,
          tags: rt.tags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        bills.push(bill);
      }
    });

    return bills;
  }

  // Check if a bill should be created based on reminder settings
  private static shouldCreateBill(dueDate: Date, today: Date, reminderDays: number): boolean {
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);
    
    return today >= reminderDate;
  }

  // Map recurring transaction frequency to bill frequency
  private static mapFrequencyToBillFrequency(frequency: RecurringTransaction['frequency']): Bill['frequency'] {
    switch (frequency) {
      case 'monthly':
        return 'monthly';
      case 'quarterly':
        return 'quarterly';
      case 'yearly':
        return 'yearly';
      default:
        return 'monthly';
    }
  }

  // Calculate next due date for a recurring transaction
  static calculateNextDueDate(currentDate: string, frequency: RecurringTransaction['frequency']): string {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date.toISOString().split('T')[0];
  }

  // Get upcoming bills within specified days
  static getUpcomingBills(bills: Bill[], days: number = 7): Bill[] {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return bills.filter(bill => {
      if (bill.isPaid) return false;
      const dueDate = new Date(bill.dueDate);
      return dueDate >= today && dueDate <= futureDate;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // Get overdue bills
  static getOverdueBills(bills: Bill[]): Bill[] {
    const today = new Date();
    return bills.filter(bill => {
      if (bill.isPaid) return false;
      const dueDate = new Date(bill.dueDate);
      return dueDate < today;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // Auto-categorize recurring transactions based on description and vendor
  static autoCategorizeRecurringTransaction(description: string, vendor?: string): {
    category: string;
    tags: string[];
  } {
    const lowerDesc = description.toLowerCase();
    const lowerVendor = vendor?.toLowerCase() || '';

    // Subscription services
    if (this.isSubscriptionService(lowerDesc, lowerVendor)) {
      return {
        category: 'Subscriptions',
        tags: ['subscription', 'entertainment']
      };
    }

    // Utilities
    if (this.isUtility(lowerDesc, lowerVendor)) {
      return {
        category: 'Utilities',
        tags: ['utility', 'essential']
      };
    }

    // Insurance
    if (this.isInsurance(lowerDesc, lowerVendor)) {
      return {
        category: 'Insurance',
        tags: ['insurance', 'protection']
      };
    }

    // Loan EMI
    if (this.isLoanEMI(lowerDesc, lowerVendor)) {
      return {
        category: 'Loan EMI',
        tags: ['loan', 'emi', 'debt']
      };
    }

    // Rent
    if (this.isRent(lowerDesc, lowerVendor)) {
      return {
        category: 'Rent & Mortgage',
        tags: ['rent', 'housing']
      };
    }

    // Salary
    if (this.isSalary(lowerDesc, lowerVendor)) {
      return {
        category: 'Salary',
        tags: ['salary', 'income']
      };
    }

    // Default
    return {
      category: 'Other',
      tags: []
    };
  }

  private static isSubscriptionService(desc: string, vendor: string): boolean {
    const subscriptionKeywords = [
      'netflix', 'amazon prime', 'spotify', 'youtube premium', 'disney+',
      'apple music', 'microsoft office', 'adobe', 'zoom', 'dropbox',
      'subscription', 'premium', 'pro plan'
    ];
    
    return subscriptionKeywords.some(keyword => 
      desc.includes(keyword) || vendor.includes(keyword)
    );
  }

  private static isUtility(desc: string, vendor: string): boolean {
    const utilityKeywords = [
      'electricity', 'gas', 'water', 'internet', 'broadband', 'wifi',
      'mobile', 'phone', 'telecom', 'utility', 'bill'
    ];
    
    return utilityKeywords.some(keyword => 
      desc.includes(keyword) || vendor.includes(keyword)
    );
  }

  private static isInsurance(desc: string, vendor: string): boolean {
    const insuranceKeywords = [
      'insurance', 'premium', 'policy', 'life insurance', 'health insurance',
      'car insurance', 'vehicle insurance'
    ];
    
    return insuranceKeywords.some(keyword => 
      desc.includes(keyword) || vendor.includes(keyword)
    );
  }

  private static isLoanEMI(desc: string, vendor: string): boolean {
    const loanKeywords = [
      'emi', 'loan', 'mortgage', 'home loan', 'car loan', 'personal loan',
      'credit card', 'installment'
    ];
    
    return loanKeywords.some(keyword => 
      desc.includes(keyword) || vendor.includes(keyword)
    );
  }

  private static isRent(desc: string, vendor: string): boolean {
    const rentKeywords = [
      'rent', 'rental', 'house rent', 'apartment', 'maintenance'
    ];
    
    return rentKeywords.some(keyword => 
      desc.includes(keyword) || vendor.includes(keyword)
    );
  }

  private static isSalary(desc: string, vendor: string): boolean {
    const salaryKeywords = [
      'salary', 'wage', 'payroll', 'income', 'pay'
    ];
    
    return salaryKeywords.some(keyword => 
      desc.includes(keyword) || vendor.includes(keyword)
    );
  }
}

export default RecurringTransactionService;