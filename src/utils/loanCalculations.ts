import { addMonths, startOfDay } from 'date-fns';

export interface AmortizationDetails {
    projectedBalance: number;
    paidInstallments: number;
    remainingInstallments: number;
    nextInstallmentDate: Date;
    totalInterestPaid: number;
    totalPrincipalPaid: number;
    completionDate: Date;
}

/**
 * Calculates the amortization details for a loan as of today.
 * 
 * @param principal Original loan amount
 * @param annualRate Annual interest rate (in percentage, e.g., 8.5)
 * @param emi Monthly EMI amount
 * @param startDate Loan start date
 * @returns AmortizationDetails object
 */
export const calculateAmortizationDetails = (
    principal: number,
    annualRate: number,
    emi: number,
    startDate: string | Date
): AmortizationDetails => {
    const start = startOfDay(new Date(startDate));
    const today = startOfDay(new Date());

    // Monthly interest rate
    const monthlyRate = annualRate / 12 / 100;

    // Calculate total tenure in months using the formula: n = log(EMI / (EMI - P * r)) / log(1 + r)
    // This gives the total number of months required to pay off the loan
    let totalMonths = 0;
    if (monthlyRate > 0 && emi > (principal * monthlyRate)) {
        totalMonths = Math.ceil(
            Math.log(emi / (emi - principal * monthlyRate)) / Math.log(1 + monthlyRate)
        );
    } else {
        // If EMI is too low to cover interest, it's an infinite loan (or 0 interest)
        if (monthlyRate === 0 && emi > 0) {
            totalMonths = Math.ceil(principal / emi);
        } else {
            // Invalid scenario, return defaults
            return {
                projectedBalance: principal,
                paidInstallments: 0,
                remainingInstallments: 0,
                nextInstallmentDate: start,
                totalInterestPaid: 0,
                totalPrincipalPaid: 0,
                completionDate: start
            };
        }
    }

    // Calculate months passed since start
    // We assume EMI is paid at the end of each month relative to start date
    // or simply count full months passed.
    // For simplicity, let's calculate based on the number of EMI dates passed.

    let currentBalance = principal;
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;
    let paidInstallments = 0;

    // Iterate month by month to calculate exact balance
    // This is safer than direct formula for mid-term calculations if we want to be precise about "paid so far"
    // However, for performance on long loans, formula is better. 
    // Given this is client-side and loans are usually < 360 months, iteration is fine and accurate.

    let iterationDate = new Date(start);
    // Move to first EMI date (assuming 1 month after start)
    iterationDate = addMonths(iterationDate, 1);

    while (iterationDate <= today && currentBalance > 0) {
        const interestForMonth = currentBalance * monthlyRate;

        // If it's the last installment, it might be less than EMI
        const actualPayment = currentBalance < emi ? currentBalance + interestForMonth : emi;
        const actualPrincipal = actualPayment - interestForMonth;

        totalInterestPaid += interestForMonth;
        totalPrincipalPaid += actualPrincipal;
        currentBalance -= actualPrincipal;
        paidInstallments++;

        iterationDate = addMonths(iterationDate, 1);
    }

    // Ensure balance doesn't go negative due to floating point
    currentBalance = Math.max(0, currentBalance);

    const remainingInstallments = Math.max(0, totalMonths - paidInstallments);

    // Next installment is the next iteration date
    // If loan is already paid off, next date is null or irrelevant (we'll return completion date)
    let nextInstallmentDate = iterationDate;
    if (currentBalance <= 0) {
        nextInstallmentDate = addMonths(start, totalMonths); // Or just null? Keeping it as theoretical end
    }

    const completionDate = addMonths(start, totalMonths);

    return {
        projectedBalance: currentBalance,
        paidInstallments,
        remainingInstallments,
        nextInstallmentDate,
        totalInterestPaid,
        totalPrincipalPaid,
        completionDate
    };
};

export interface AmortizationScheduleEntry {
    installmentNumber: number;
    installmentDate: Date;
    emiAmount: number;
    principalPaid: number;
    interestPaid: number;
    totalRepaid: number;
    remainingBalance: number;
}

/**
 * Generates the complete amortization schedule for a loan
 * 
 * @param principal Original loan amount
 * @param annualRate Annual interest rate (in percentage, e.g., 8.5)
 * @param emi Monthly EMI amount
 * @param startDate Loan start date
 * @returns Array of amortization schedule entries
 */
export const generateAmortizationSchedule = (
    principal: number,
    annualRate: number,
    emi: number,
    startDate: string | Date
): AmortizationScheduleEntry[] => {
    const start = startOfDay(new Date(startDate));
    const monthlyRate = annualRate / 12 / 100;

    const schedule: AmortizationScheduleEntry[] = [];
    let currentBalance = principal;
    let totalRepaid = 0;
    let installmentNumber = 1;
    let iterationDate = addMonths(start, 1); // First EMI is 1 month after start

    while (currentBalance > 0.01) { // Use small threshold to handle floating point
        const interestForMonth = currentBalance * monthlyRate;

        // If it's the last installment, it might be less than EMI
        const actualPayment = currentBalance < emi ? currentBalance + interestForMonth : emi;
        const actualPrincipal = actualPayment - interestForMonth;

        totalRepaid += actualPayment;
        currentBalance -= actualPrincipal;

        // Ensure balance doesn't go negative
        currentBalance = Math.max(0, currentBalance);

        schedule.push({
            installmentNumber,
            installmentDate: new Date(iterationDate),
            emiAmount: actualPayment,
            principalPaid: actualPrincipal,
            interestPaid: interestForMonth,
            totalRepaid,
            remainingBalance: currentBalance
        });

        installmentNumber++;
        iterationDate = addMonths(iterationDate, 1);

        // Safety check to prevent infinite loop
        if (installmentNumber > 1000) break;
    }

    return schedule;
};
