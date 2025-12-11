import { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import notificationScheduler from '../services/notificationScheduler';

export const useNotifications = () => {
  const { bills, recurringTransactions, transactions } = useData();

  useEffect(() => {
    // Update localStorage whenever data changes so the notification scheduler can access it
    localStorage.setItem('bills', JSON.stringify(bills));
    localStorage.setItem('recurringTransactions', JSON.stringify(recurringTransactions));
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [bills, recurringTransactions, transactions]);

  const forceNotificationCheck = async () => {
    await notificationScheduler.forceCheck();
  };

  const sendTestEmail = async (email: string) => {
    return await notificationScheduler.sendTestEmail(email);
  };

  return {
    forceNotificationCheck,
    sendTestEmail
  };
};