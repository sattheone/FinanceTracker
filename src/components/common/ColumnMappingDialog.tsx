import React, { useState, useEffect } from 'react';
import SidePanel from './SidePanel';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';
import { Save, AlertTriangle } from 'lucide-react';

interface ColumnMappingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mapping: Record<string, number>, headerRowIndex: number) => void;
    rawData: string[][];
    fileName: string;
}

const ColumnMappingDialog: React.FC<ColumnMappingDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    rawData,
    fileName
}) => {
    const theme = useThemeClasses();
    const [headerRowIndex, setHeaderRowIndex] = useState(0);
    const [mapping, setMapping] = useState<Record<string, number>>({});

    // Reset state when rawData changes
    useEffect(() => {
        if (rawData && rawData.length > 0) {
            setHeaderRowIndex(0);
            setMapping({});
        }
    }, [rawData]);

    const headers = rawData[headerRowIndex] || [];
    const sampleRows = rawData.slice(headerRowIndex + 1, headerRowIndex + 6); // Top 5 rows

    const requiredFields = [
        { key: 'date', label: 'Date', required: true },
        { key: 'description', label: 'Description', required: true },
        { key: 'amount', label: 'Amount', required: false },
        { key: 'debit', label: 'Debit (Withdrawal)', required: false },
        { key: 'credit', label: 'Credit (Deposit)', required: false },
    ];

    const handleConfirm = () => {
        // Validate
        if (mapping.date === undefined || mapping.description === undefined) {
            alert("Please map at least Date and Description columns.");
            return;
        }
        if (mapping.amount === undefined && (mapping.debit === undefined && mapping.credit === undefined)) {
            alert("Please map either Amount column OR Debit/Credit columns.");
            return;
        }

        onConfirm(mapping, headerRowIndex);
    };

    const getMappedLabel = (colIndex: number) => {
        const found = Object.entries(mapping).find(([_key, idx]) => idx === colIndex);
        if (!found) return null;
        const field = requiredFields.find(f => f.key === found[0]);
        return field ? field.label : found[0];
    };

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Map Columns"
            size="xl"
            footer={
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className={theme.btnSecondary}>Cancel</button>
                    <button onClick={handleConfirm} className={theme.btnPrimary}>
                        <Save className="w-4 h-4 mr-2" />
                        Proceed to Import
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-200">Header Detection Failed</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                We couldn't automatically match columns for <strong>{fileName}</strong>. Please manually select the header row and map the columns below.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Row Selector */}
                <div>
                    <label className={theme.label}>Select Header Row</label>
                    <p className="text-xs text-gray-500 mb-2">
                        Select the row that contains column names like <strong>Date, Narration, Withdrawal, Deposit, Balance</strong>.
                    </p>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto max-h-60">
                        <table className="w-full text-sm text-left">
                            <tbody>
                                {rawData.slice(0, 30).map((row, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => setHeaderRowIndex(idx)}
                                        className={cn(
                                            "cursor-pointer transition-colors border-b dark:border-gray-700",
                                            headerRowIndex === idx ? "bg-blue-100 dark:bg-blue-900/40" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                        )}
                                    >
                                        <td className="px-4 py-2 text-gray-400 w-8">{idx + 1}</td>
                                        {row.slice(0, 5).map((cell, cIdx) => (
                                            <td key={cIdx} className="px-4 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                                                {cell}
                                            </td>
                                        ))}
                                        {row.length > 5 && <td className="px-4 py-2 text-gray-400">...</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Column Mapping Table */}
                <div>
                    <label className={theme.label}>Map Columns</label>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    {headers.map((header, idx) => (
                                        <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                            <div className="flex flex-col space-y-2">
                                                <span className="font-bold text-gray-900 dark:text-white truncate" title={header}>{header || `Column ${idx + 1}`}</span>
                                                <select
                                                    className="text-xs border rounded p-1 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                                                    value={Object.keys(mapping).find(key => mapping[key] === idx) || ''}
                                                    onChange={(e) => {
                                                        const field = e.target.value;
                                                        const newMapping = { ...mapping };

                                                        // Clear this field from other columns if assigned
                                                        // (Optional: UI choice, let's just overwrite)
                                                        if (field) {
                                                            // Remove field from other cols
                                                            Object.keys(newMapping).forEach(k => {
                                                                if (newMapping[k] === idx) delete newMapping[k];
                                                                if (field && k === field) delete newMapping[k]; // remove field from old col
                                                            });
                                                            newMapping[field] = idx;
                                                        } else {
                                                            // Unmap this column
                                                            Object.keys(newMapping).forEach(k => {
                                                                if (newMapping[k] === idx) delete newMapping[k];
                                                            });
                                                        }
                                                        setMapping(newMapping);
                                                    }}
                                                >
                                                    <option value="">-- Ignore --</option>
                                                    {requiredFields.map(f => (
                                                        <option
                                                            key={f.key}
                                                            value={f.key}
                                                            disabled={Object.values(mapping).includes(idx) ? false : Object.keys(mapping).includes(f.key) && mapping[f.key] !== idx}
                                                        >
                                                            {f.label} {f.required ? '*' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                {sampleRows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className={cn(
                                                "px-4 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300",
                                                getMappedLabel(cIdx) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                                            )}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </SidePanel>
    );
};

export default ColumnMappingDialog;
