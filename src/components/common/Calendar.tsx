import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, DollarSign, Repeat } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Transaction, RecurringTransaction, Bill } from '../../types';
import { Category } from '../../constants/categories';
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
  categories?: Category[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  showTransactions?: boolean;
  showRecurring?: boolean;
  showBills?: boolean;
  viewMode?: 'chip' | 'icon';
}

const Calendar: React.FC<CalendarProps> = ({
  transactions = [],
  recurringTransactions = [],
  bills = [],
  categories = [],
  onEventClick,
  onDateClick,
  showTransactions = true,
  showRecurring = true,
  showBills = true,
  viewMode = 'chip'
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
      case 'recurring': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200';
      case 'bill': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200';
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

  // Get category icon for icon view
  const getCategoryIcon = (categoryId?: string) => {
    if (!categoryId) return '📋';
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || '📋';
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
          'hover:bg-gray-50 dark:hover:bg-gray-700'
        )}
        onClick={() => handleDateClick(day)}
      >
        <div className={cn(
          'text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
          isToday
            ? 'bg-blue-500 text-white'
            : isSelected
              ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
              : theme.textPrimary
        )}>
          {day}
        </div>

        {/* Icon View - Show category icons in a grid */}
        {viewMode === 'icon' ? (
          <div className="flex flex-wrap gap-0.5 overflow-hidden">
            {(() => {
              // Group events by category icon to show unique icons only
              const iconGroups = new Map<string, { icon: string; events: CalendarEvent[]; firstEvent: CalendarEvent; category?: Category }>();
              dayEvents.forEach(event => {
                const icon = getCategoryIcon(event.category as string);
                if (!iconGroups.has(icon)) {
                  iconGroups.set(icon, {
                    icon,
                    events: [],
                    firstEvent: event,
                    category: categories.find(c => c.id === event.category)
                  });
                }
                const group = iconGroups.get(icon);
                if (group) {
                  group.events.push(event);
                }
              });

              const uniqueIcons = Array.from(iconGroups.values()).slice(0, 6);

              return (
                <>
                  {uniqueIcons.map((group, index) => {
                    // Get category color for background
                    let categoryColor = '#9CA3AF'; // default gray

                    // Try multiple ways to get the category
                    const eventCategory = group.firstEvent.category;
                    const foundCategory = categories.find(c => c.id === eventCategory);

                    if (foundCategory && foundCategory.color) {
                      categoryColor = foundCategory.color;
                    } else {
                      // Force very distinct, bright colors for testing
                      const testColors = ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00', '#FF8000'];
                      categoryColor = testColors[index % testColors.length];
                    }

                    // Check if any events in this group are recurring
                    const hasRecurring = group.events.some(event => event.type === 'recurring');

                    // Convert hex color to RGB for opacity
                    const hexToRgb = (hex: string) => {
                      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                      return result ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16)
                      } : null;
                    };

                    const rgb = hexToRgb(categoryColor);
                    // Always use category color for background, with slight adjustments for status
                    const backgroundColor = rgb
                      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`
                      : 'rgba(156, 163, 175, 0.25)';

                    return (
                      <div
                        key={`${group.icon}-${index}`}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          width: '34px',
                          height: '34px'
                        }}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (onEventClick) {
                            onEventClick(group.firstEvent);
                          }
                        }}
                        title={`${group.events.length} ${group.events.length === 1 ? 'transaction' : 'transactions'}: ${group.events.map(e => `${e.title} - ${formatCurrency(e.amount)}`).join(', ')}`}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '0.375rem',
                            fontSize: '1rem',
                            lineHeight: '1.5rem',
                            backgroundColor: backgroundColor
                          }}
                        >
                          {group.icon}
                        </div>
                        {/* Recurring badge */}
                        {hasRecurring && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              width: '13px',
                              height: '13px',
                              backgroundColor: '#A855F7',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.1)'
                            }}
                          >
                            <Repeat style={{ width: '8px', height: '8px', color: 'white' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {iconGroups.size > 6 && (
                    <div className="w-8 h-8 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                      +{iconGroups.size - 6}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          /* Chip View - Original view with text */
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
                <span className="truncate">{event.title}</span>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        )}
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
        <div className="flex items-center space-x-2">
          <span className={cn(theme.textPrimary, 'font-medium text-lg')}>
            {monthNames[month]} {year}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {/* Legend */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className={theme.textMuted}>Transactions</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-100 dark:bg-purple-900/50 rounded"></div>
              <span className={theme.textMuted}>Recurring</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={goToToday}
              className={cn(theme.btnSecondary, 'text-sm px-3 py-1')}
            >
              Today
            </button>

            <button
              onClick={goToPreviousMonth}
              className={cn(theme.btnSecondary, 'p-2')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

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