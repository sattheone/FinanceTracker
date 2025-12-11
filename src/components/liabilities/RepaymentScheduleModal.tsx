import React from 'react';
import { X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AmortizationScheduleEntry } from '../../utils/loanCalculations';

interface RepaymentScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    schedule: AmortizationScheduleEntry[];
    liabilityName: string;
}

const RepaymentScheduleModal: React.FC<RepaymentScheduleModalProps> = ({
    isOpen,
    onClose,
    schedule,
    liabilityName
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Repayment Schedule</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{liabilityName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                                        #
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                                        Installment Date
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                                        EMI
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                                        Total Repaid Amount
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                                        Remaining Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {schedule.map((entry, index) => {
                                    const isPaid = entry.installmentDate <= new Date();
                                    return (
                                        <tr
                                            key={index}
                                            className={isPaid ? 'bg-green-50 dark:bg-green-900/10' : ''}
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                {entry.installmentNumber}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                {formatDate(entry.installmentDate.toISOString())}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-medium text-blue-600 dark:text-blue-400">
                                                {formatCurrency(entry.emiAmount)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
                                                {formatCurrency(entry.totalRepaid)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400">
                                                {formatCurrency(entry.remainingBalance)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RepaymentScheduleModal;
