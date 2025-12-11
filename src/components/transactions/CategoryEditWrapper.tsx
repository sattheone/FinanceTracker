import React from 'react';
import { Transaction } from '../../types';
import InlineCategoryEditor from './InlineCategoryEditor';

interface CategoryEditWrapperProps {
    transaction: Transaction;
    onCategoryChange: (categoryId: string) => void;
    onCreateRule?: (transaction: Transaction, newCategoryId: string) => void;
}

/**
 * Wrapper component that handles category editing and rule creation prompts
 * This component integrates InlineCategoryEditor with rule creation functionality
 */
const CategoryEditWrapper: React.FC<CategoryEditWrapperProps> = ({
    transaction,
    onCategoryChange,
    onCreateRule
}) => {
    const handleSave = (newCategoryId: string) => {
        // Save the category change
        onCategoryChange(newCategoryId);

        // If category changed and we have a create rule callback, trigger it
        if (newCategoryId !== transaction.category && onCreateRule) {
            onCreateRule(transaction, newCategoryId);
        }
    };

    return (
        <InlineCategoryEditor
            currentCategory={transaction.category || 'other'}
            onSave={handleSave}
        />
    );
};

export default CategoryEditWrapper;
