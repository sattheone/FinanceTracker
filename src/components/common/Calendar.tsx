import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, DollarSign, Repeat } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Transaction, RecurringTransaction, Bill } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CalendarEvent {
  id: string;
  title: string;
  amount: number;
  type: 'transaction' | 'recurring' | 'bill';
  category?: string;
  date: Date;
  isCompleted?: boolean;
  isPaid?: boolean;
  isOverdue?: boolean;
  originalData: Transaction | RecurringTransaction | Bill;
}

interface CalendarProps {
  transactions?: Transaction[];
  recurringTransactions?: RecurringTransaction[];
  bills?: Bill[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  showTransactions?: boolean;
  showRecurring?: boolean;
  showBills?: boolean;
  title?: string;
}

const Calendar: React.FC<CalendarProps> = ({
  transactions = [],
  recurringTransactions = [],
  bills = [],
  onEventClick,
  onDateClick,
  showTransactions = true,
  showRecurring = true,
  showBills = true,
  title = 'Calendar'
}) => {
  const theme = useThemeClasses();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get current month info
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Convert data to calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add transactions
    if (showTransactions) {
      transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        if (transactionDate.getMonth() === month && transactionDate.getFullYear() === year) {
          events.push({
            id: `transaction-${transaction.id}`,
            title: transaction.description,
            amount: transaction.amount,
            type: 'transaction',
            category: transaction.category,
            date: transactionDate,
            isCompleted: true,
            originalData: transaction
          });
        }
      });
    }

    // Add recurring transactions (show next occurrence in current month)
    if (showRecurring) {
      recurringTransactions.forEach(recurring => {
        if (!recurring.isActive) return;
        
        const nextDue = new Date(recurring.nextDueDate);
        if (nextDue.getMonth() === month && nextDue.getFullYear() === year) {
          events.push({
            id: `recurring-${recurring.id}`,
            title: recurring.name,
            amount: recurring.amount,
            type: 'recurring',
            category: recurring.category,
            date: nextDue,
            isCompleted: false,
            originalData: recurring
          });
        }
      });
    }

    // Add bills
    if (showBills) {
      bills.forEach(bill => {
        const dueDate = new Date(bill.dueDate);
        if (dueDate.getMonth() === month && dueDate.getFullYear() === year) {
          const today = new Date();
          events.push({
            id: `bill-${bill.id}`,
            title: bill.name,
            amount: bill.amount,
            type: 'bill',
            category: bill.category,
            date: dueDate,
            isCompleted: bill.isPaid,
            isPaid: bill.isPaid,
            isOverdue: !bill.isPaid && dueDate < today,
            originalData: bill
          });
        }
      });
    }

    return events;
  }, [transactions, recurringTransactions, bills, month, year, showTransactions, showRecurring, showBills]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    calendarEvents.forEach(event => {
      const dateKey = event.date.getDate().toString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [calendarEvents]);

  // Get events for selected date
  const selectedDateEvents = selectedDate 
    ? eventsByDate[selectedDate.getDate().toString()] || []
    : [];

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    setSelectedDate(clickedDate);
    if (onDateClick) {
      onDateClick(clickedDate);
    }
  };

  const getEventTypeColor = (type: string, isCompleted?: boolean, isOverdue?: boolean) => {
    if (isOverdue) return 'bg-red-500 text-white';
    if (isCompleted) return 'bg-green-500 text-white';
    
    switch (type) {
      case 'transaction': return 'bg-blue-500 text-white';
      case 'recurring': return 'bg-purple-50 dark:bg-purple-900/200 text-white';
      case 'bill': return 'bg-orange-50 dark:bg-orange-900/200 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <DollarSign className="w-3 h-3" />;
      case 'recurring': return <Repeat className="w-3 h-3" />;
      case 'bill': return <Clock className="w-3 h-3" />;
      default: return <CalendarIcon className="w-3 h-3" />;
    }
  };

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(
      <div key={`empty-${i}`} className="h-24 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800" />
    );
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = eventsByDate[day.toString()] || [];
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
    const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;
    
    calendarDays.push(
      <div
        key={day}
        className={cn(
          'h-24 border border-gray-200 dark:border-gray-600 p-1 cursor-pointer transition-colors',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          isToday && 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
          isSelected && 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600'
        )}
        onClick={() => handleDateClick(day)}
      >
        <div className={cn(
          'text-sm font-medium mb-1',
          isToday ? 'text-blue-600 dark:text-blue-400' : theme.textPrimary
        )}>
          {day}
        </div>
        <div className="space-y-1 overflow-hidden">
          {dayEvents.slice(0, 2).map(event => (
            <div
              key={event.id}
              className={cn(
                'text-xs px-1 py-0.5 rounded truncate cursor-pointer',
                getEventTypeColor(event.type, event.isCompleted, event.isOverdue)
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (onEventClick) {
                  onEventClick(event);
                }
              }}
              title={`${event.title} - ${formatCurrency(event.amount)}`}
            >
              <div className="flex items-center space-x-1">
                {getEventTypeIcon(event.type)}
                <span className="truncate">{event.title}</span>
              </div>
            </div>
          ))}
          {dayEvents.length > 2 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
              +{dayEvents.length - 2} more
            </div>
          )}
        </div>
      </div>
    );
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className={cn(theme.textPrimary, 'text-xl font-semibold')}>{title}</h2>
        <div className="flex items-center space-x-4">
          {/* Legend */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className={theme.textMuted}>Transactions</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-50 dark:bg-purple-900/200 rounded"></div>
              <span className={theme.textMuted}>Recurring</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-50 dark:bg-orange-900/200 rounded"></div>
              <span className={theme.textMuted}>Bills</span>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousMonth}
              className={cn(theme.btnSecondary, 'p-2')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-2">
              <span className={cn(theme.textPrimary, 'font-medium text-lg')}>
                {monthNames[month]} {year}
              </span>
              <button
                onClick={goToToday}
                className={cn(theme.btnSecondary, 'text-sm px-3 py-1')}
              >
                Today
              </button>
            </div>
            
            <button
              onClick={goToNextMonth}
              className={cn(theme.btnSecondary, 'p-2')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-700">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
          <h3 className={cn(theme.textPrimary, 'font-semibold mb-3')}>
            Events for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <div className="space-y-2">
            {selectedDateEvents.map(event => (
              <div
                key={event.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
                onClick={() => onEventClick && onEventClick(event)}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    getEventTypeColor(event.type, event.isCompleted, event.isOverdue)
                  )}>
                    {getEventTypeIcon(event.type)}
                  </div>
                  <div>
                    <p className={cn(theme.textPrimary, 'font-medium')}>{event.title}</p>
                    <p className={cn(theme.textMuted, 'text-sm capitalize')}>
                      {event.type} {event.category && `• ${event.category}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(theme.textPrimary, 'font-semibold')}>
                    {formatCurrency(event.amount)}
                  </p>
                  {event.isOverdue && (
                    <p className="text-xs text-red-600 dark:text-red-400">Overdue</p>
                  )}
                  {event.isCompleted && (
                    <p className="text-xs text-green-600 dark:text-green-400">Completed</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;