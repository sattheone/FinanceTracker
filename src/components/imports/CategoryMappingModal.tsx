import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Save } from 'lucide-react';
import { Category } from '../../constants/categories';

interface CategoryMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    unmappedCategories: string[];
    allCategories: Category[];
    onConfirm: (mapping: Record<string, string>) => void;
}

const CategoryMappingModal: React.FC<CategoryMappingModalProps> = ({
    isOpen,
    onClose,
    unmappedCategories,
    allCategories,
    onConfirm
}) => {
    const [mapping, setMapping] = useState<Record<string, string>>({});

    useEffect(() => {
        // Reset mapping when modal opens with new categories
        if (isOpen) {
            setMapping({});
        }
    }, [isOpen, unmappedCategories]);

    if (!isOpen) return null;

    const handleSelectChange = (importedName: string, categoryId: string) => {
        setMapping(prev => ({
            ...prev,
            [importedName]: categoryId
        }));
    };

    const handleConfirm = () => {
        onConfirm(mapping);
    };

    // Let's allow all categories just in case, but sort/group? 
    // For simplicity, just strict alpha sort.
    const sortedCategories = [...allCategories].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                                    Expected Categories Not Found
                                </h3>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    The following categories from your import do not match any existing categories. Please map them to continue.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto px-1">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Imported Name
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Map To System Category
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {unmappedCategories.map((name) => (
                                        <tr key={name}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center space-x-2">
                                                    <ArrowRight className="h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={mapping[name] || ''}
                                                        onChange={(e) => handleSelectChange(name, e.target.value)}
                                                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    >
                                                        <option value="">Select a category...</option>
                                                        <option value="create_new">➕ Create "{name}" (Auto)</option>
                                                        <option value="ignore">❌ Ignore (Set as 'Other')</option>
                                                        <optgroup label="Checking Existing Categories">
                                                            {sortedCategories.map((cat) => (
                                                                <option key={cat.id} value={cat.id}>
                                                                    {cat.icon} {cat.name}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    </select>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save & Continue
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            Cancel Import
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryMappingModal;
