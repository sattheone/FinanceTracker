

export const calculateNextDueDate = (startDate: string, frequency: string, interval: number = 1): string => {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day

    // If start date is in the future, that's the next due date
    if (start > today) {
        return startDate;
    }

    let nextDate = new Date(start);

    // Loop until we find a date in the future (or today)
    while (nextDate < today) {
        switch (frequency) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + (1 * interval));
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + (7 * interval));
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + (1 * interval));
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + (3 * interval));
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + (1 * interval));
                break;
            default:
                // Should not happen, but break loop to avoid infinite loop
                return nextDate.toISOString().split('T')[0];
        }
    }

    return nextDate.toISOString().split('T')[0];
};
