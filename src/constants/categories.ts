export type CategoryTransactionType = 'income' | 'expense' | 'investment' | 'transfer';

export interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
    isCustom: boolean;
    parentId?: string; // ID of the parent category
    order?: number; // Display order
    isSystem?: boolean; // If true, cannot be deleted or renamed (ID locked)
    budget?: number; // Optional monthly budget limit for this category
    transactionType?: CategoryTransactionType; // Maps category to transaction type
}

/**
 * Resolve the transaction type for a given category.
 * - If the category has an explicit `transactionType`, use it.
 * - If it has a parent, walk up to the root to inherit.
 * - Fallback: 'expense'.
 */
export function getCategoryTransactionType(
    categoryId: string,
    allCategories: Category[]
): CategoryTransactionType {
    const cat = allCategories.find(c => c.id === categoryId);
    if (!cat) return 'expense';
    if (cat.transactionType) return cat.transactionType;
    if (cat.parentId) {
        return getCategoryTransactionType(cat.parentId, allCategories);
    }
    return 'expense';
}

/**
 * Check if a transaction represents an internal transfer
 * (credit card bill payment, bank-to-bank, ATM withdrawal, or categorized as transfer).
 */
export function isTransferTransaction(
    transaction: { type?: string; category?: string },
    allCategories: Category[] = []
): boolean {
    if (transaction.type === 'transfer') return true;
    if (transaction.category === 'transfer') return true;
    if (transaction.category) {
        return getCategoryTransactionType(transaction.category, allCategories) === 'transfer';
    }
    return false;
}

/**
 * Deterministically resolve a transaction's financial role:
 * 'income' | 'expense' | 'investment' | 'transfer'
 */
export function resolveTransactionType(
    transaction: { type?: string; category?: string },
    allCategories: Category[] = []
): CategoryTransactionType {
    if (isTransferTransaction(transaction, allCategories)) return 'transfer';
    if (transaction.category) {
        const cat = allCategories.find(c => c.id === transaction.category);
        if (cat) {
            return getCategoryTransactionType(cat.id, allCategories);
        }
    }
    if (transaction.type === 'income' || transaction.type === 'investment') {
        return transaction.type;
    }
    return 'expense';
}

export const defaultCategories: Category[] = [
    // Bills & Utilities (Order 100)
    { id: 'bills', name: 'Bills & Utilities', color: '#10B981', icon: '💡', isCustom: false, order: 100, transactionType: 'expense' },
    { id: 'electricity', name: 'Electricity', color: '#10B981', icon: '⚡', isCustom: false, parentId: 'bills', order: 101 },
    { id: 'water', name: 'Water', color: '#10B981', icon: '💧', isCustom: false, parentId: 'bills', order: 102 },
    { id: 'internet', name: 'Internet/Cable', color: '#10B981', icon: '🌐', isCustom: false, parentId: 'bills', order: 103 },
    { id: 'phone', name: 'Phone', color: '#10B981', icon: '📱', isCustom: false, parentId: 'bills', order: 104 },
    { id: 'gas', name: 'Gas', color: '#10B981', icon: '🔥', isCustom: false, parentId: 'bills', order: 105 },

    // Food & Dining (Order 200)
    { id: 'food', name: 'Food & Dining', color: '#EF4444', icon: '🍽️', isCustom: false, order: 200, transactionType: 'expense' },
    { id: 'groceries', name: 'Groceries', color: '#EF4444', icon: '🛒', isCustom: false, parentId: 'food', order: 201 },
    { id: 'restaurants', name: 'Restaurants', color: '#EF4444', icon: '🍳', isCustom: false, parentId: 'food', order: 202 },
    { id: 'delivery', name: 'Food Delivery', color: '#EF4444', icon: '🛵', isCustom: false, parentId: 'food', order: 203 },

    // Transportation (Order 300)
    { id: 'transport', name: 'Transportation', color: '#3B82F6', icon: '🚗', isCustom: false, order: 300, transactionType: 'expense' },
    { id: 'fuel', name: 'Fuel/Gas', color: '#3B82F6', icon: '⛽', isCustom: false, parentId: 'transport', order: 301 },
    { id: 'public_transit', name: 'Public Transit', color: '#3B82F6', icon: '🚌', isCustom: false, parentId: 'transport', order: 302 },
    { id: 'maintenance', name: 'Maintenance/Repairs', color: '#3B82F6', icon: '🔧', isCustom: false, parentId: 'transport', order: 303 },
    { id: 'tolls', name: 'Parking/Tolls', color: '#3B82F6', icon: '🅿️', isCustom: false, parentId: 'transport', order: 304 },

    // Shopping (Order 400)
    { id: 'shopping', name: 'Shopping', color: '#8B5CF6', icon: '🛍️', isCustom: false, order: 400, transactionType: 'expense' },
    { id: 'clothing', name: 'Clothing', color: '#8B5CF6', icon: '👕', isCustom: false, parentId: 'shopping', order: 401 },
    { id: 'electronics', name: 'Electronics', color: '#8B5CF6', icon: '💻', isCustom: false, parentId: 'shopping', order: 402 },
    { id: 'home_goods', name: 'Home Goods', color: '#8B5CF6', icon: '🏠', isCustom: false, parentId: 'shopping', order: 403 },
    { id: 'hobbies', name: 'Hobbies', color: '#8B5CF6', icon: '🎨', isCustom: false, parentId: 'shopping', order: 404 },
    { id: 'gifts', name: 'Gifts', color: '#8B5CF6', icon: '🎁', isCustom: false, parentId: 'shopping', order: 405 },

    // Entertainment (Order 500)
    { id: 'entertainment', name: 'Entertainment', color: '#F59E0B', icon: '🎬', isCustom: false, order: 500, transactionType: 'expense' },
    { id: 'streaming', name: 'Streaming Services', color: '#F59E0B', icon: '📺', isCustom: false, parentId: 'entertainment', order: 501 },
    { id: 'movies', name: 'Movies/Events', color: '#F59E0B', icon: '🎟️', isCustom: false, parentId: 'entertainment', order: 502 },
    { id: 'games', name: 'Games', color: '#F59E0B', icon: '🎮', isCustom: false, parentId: 'entertainment', order: 503 },
    { id: 'books', name: 'Books/Media', color: '#F59E0B', icon: '📚', isCustom: false, parentId: 'entertainment', order: 504 },

    // Healthcare (Order 600)
    { id: 'healthcare', name: 'Healthcare', color: '#EC4899', icon: '🏥', isCustom: false, order: 600, transactionType: 'expense' },
    { id: 'doctor', name: 'Doctor/Dental', color: '#EC4899', icon: '👨‍⚕️', isCustom: false, parentId: 'healthcare', order: 601 },
    { id: 'pharmacy', name: 'Medicine/Pharmacy', color: '#EC4899', icon: '💊', isCustom: false, parentId: 'healthcare', order: 602 },
    { id: 'health_insurance', name: 'Health Insurance', color: '#EC4899', icon: '🛡️', isCustom: false, parentId: 'healthcare', order: 603 },
    { id: 'fitness', name: 'Gym/Fitness', color: '#EC4899', icon: '💪', isCustom: false, parentId: 'healthcare', order: 604 },

    // Education (Order 700)
    { id: 'education', name: 'Education', color: '#6366F1', icon: '🎓', isCustom: false, order: 700, transactionType: 'expense' },
    { id: 'tuition', name: 'Tuition', color: '#6366F1', icon: '🏫', isCustom: false, parentId: 'education', order: 701 },
    { id: 'supplies', name: 'Books/Supplies', color: '#6366F1', icon: '✏️', isCustom: false, parentId: 'education', order: 702 },
    { id: 'student_loan', name: 'Student Loan', color: '#6366F1', icon: '💸', isCustom: false, parentId: 'education', order: 703 },

    // Income (Order 800)
    { id: 'income', name: 'Income', color: '#22C55E', icon: '💰', isCustom: false, order: 800, transactionType: 'income' },
    { id: 'salary', name: 'Salary', color: '#22C55E', icon: '💵', isCustom: false, parentId: 'income', order: 801 },
    { id: 'other_income', name: 'Other Income', color: '#22C55E', icon: '💎', isCustom: false, parentId: 'income', order: 802 },

    // Investment (Order 900)
    { id: 'investment', name: 'Investment', color: '#059669', icon: '📈', isCustom: false, order: 900, transactionType: 'investment' },
    { id: 'mutual_funds', name: 'Mutual Funds', color: '#059669', icon: '📊', isCustom: false, parentId: 'investment', order: 901 },
    { id: 'stocks', name: 'Stocks', color: '#059669', icon: '📉', isCustom: false, parentId: 'investment', order: 902 },
    { id: 'gold', name: 'Gold', color: '#059669', icon: '🥇', isCustom: false, parentId: 'investment', order: 903 },
    { id: 'insurance_inv', name: 'Insurance (Inv)', color: '#059669', icon: '🛡️', isCustom: false, parentId: 'investment', order: 904 },
    { id: 'chit', name: 'Chit', color: '#059669', icon: '🎫', isCustom: false, parentId: 'investment', order: 905 },

    // Miscellaneous Group (Order 950) - user group
    { id: 'misc', name: 'Miscellaneous', color: '#6B7280', icon: '📋', isCustom: false, order: 950, transactionType: 'expense' },
    // Other (System) (Order 1000) - system fallback category, no children
    { id: 'other', name: 'Other', color: '#6B7280', icon: '📋', isCustom: false, order: 1000, isSystem: true, transactionType: 'expense' },
    { id: 'travel', name: 'Travel', color: '#14B8A6', icon: '✈️', isCustom: false, order: 1001, transactionType: 'expense' },

    // Transfer (System) (Order 1100)
    { id: 'transfer', name: 'Transfer', color: '#8B5CF6', icon: '↔️', isCustom: false, order: 1100, isSystem: true, transactionType: 'transfer' },

    // Uncategorized (System) (Order 0 - Top or Bottom? Let's generic it)
    { id: 'uncategorized', name: 'Uncategorized', color: '#9CA3AF', icon: '❓', isCustom: false, order: 1200, isSystem: true, transactionType: 'expense' },
];
