import { CategoryRule } from '../types';

interface StaticRule {
  keywords: string[];
  categoryId: string;
  priority: number;
}

class AutoCategorizationService {
  private static defaultRules: StaticRule[] = [
    // Food & Dining
    { keywords: ['restaurant', 'food', 'cafe', 'pizza', 'burger', 'swiggy', 'zomato', 'uber eats', 'dominos', 'mcdonalds', 'kfc', 'subway', 'starbucks'], categoryId: 'food', priority: 10 },

    // Transportation
    { keywords: ['uber', 'ola', 'taxi', 'metro', 'bus', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'rapido'], categoryId: 'transport', priority: 10 },

    // Shopping
    { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mall', 'store', 'purchase', 'buy'], categoryId: 'shopping', priority: 8 },

    // Entertainment
    { keywords: ['movie', 'cinema', 'netflix', 'spotify', 'youtube', 'game', 'entertainment', 'bookmyshow', 'pvr'], categoryId: 'entertainment', priority: 9 },

    // Bills & Utilities
    { keywords: ['electricity', 'water', 'gas', 'internet', 'mobile', 'phone', 'bill', 'recharge', 'jio', 'airtel', 'vi', 'bsnl'], categoryId: 'bills', priority: 10 },

    // Healthcare
    { keywords: ['hospital', 'doctor', 'medical', 'pharmacy', 'medicine', 'health', 'clinic', 'apollo', 'max'], categoryId: 'healthcare', priority: 10 },

    // Education
    { keywords: ['school', 'college', 'university', 'course', 'book', 'education', 'tuition', 'fees'], categoryId: 'education', priority: 10 },

    // Travel
    { keywords: ['flight', 'hotel', 'booking', 'travel', 'trip', 'vacation', 'makemytrip', 'goibibo', 'cleartrip'], categoryId: 'travel', priority: 9 },

    // Salary (Income)
    { keywords: ['salary', 'wage', 'pay', 'income', 'bonus', 'incentive'], categoryId: 'salary', priority: 10 },

    // Investment
    { keywords: ['mutual fund', 'sip', 'stock', 'share', 'investment', 'zerodha', 'groww', 'upstox'], categoryId: 'investment', priority: 10 },
  ];

  static suggestCategoryForTransaction(
    description: string,
    _amount: number,
    _type: string,
    customRules: CategoryRule[] = []
  ): string {
    // 1. Apply user-defined custom rules first (highest precedence)
    // Default isActive to true if undefined to support legacy rules
    const activeRules = customRules.filter(r => r.isActive !== false);

    // Debug: Log active rules count
    console.log(`🔍 Checking ${activeRules.length} active rules against: "${description}"`);

    for (const rule of activeRules) {
      if (this.matchesRule(rule, description)) {
        console.log(`✅ Custom Rule Match: "${description}" matched rule "${rule.name}" -> ${rule.categoryId}`);
        return rule.categoryId;
      }
    }

    // 2. Fallback to default static rules
    // Disabled as per user request - only use custom rules or default to 'other'
    /*
    const defaultCategory = this.autoAssignCategoryDefault(description);
    if (defaultCategory !== 'other') {
       console.log(`ℹ️ Default Rule Match: "${description}" -> ${defaultCategory}`);
    }
    return defaultCategory;
    */

    return 'other';
  }

  private static matchesRule(rule: CategoryRule, description: string): boolean {
    const descLower = description.toLowerCase().trim();
    const pattern = rule.name.toLowerCase().trim();

    if (rule.matchType === 'exact') {
      return descLower === pattern;
    }
    // Partial match
    return descLower.includes(pattern);
  }

  /*
  private static autoAssignCategoryDefault(description: string): string {
    const desc = description.toLowerCase();

    // Find matching rules
    const matchingRules = this.defaultRules.filter(rule =>
      rule.keywords.some(keyword => desc.includes(keyword.toLowerCase()))
    );

    if (matchingRules.length === 0) {
      return 'other'; // Default category
    }

    // Return the highest priority match
    const bestMatch = matchingRules.reduce((best, current) =>
      current.priority > best.priority ? current : best
    );

    return bestMatch.categoryId;
  }
  */

  // Deprecated: Kept for backward compatibility if needed, but redirects to new logic
  static autoAssignCategory(description: string, amount: number, type: string): string {
    return this.suggestCategoryForTransaction(description, amount, type, []);
  }

  // Helper to add custom rule (this seems unused now as rules come from DataContext/Firestore)
  // But keeping it just in case
  static addCustomRule(keywords: string[], categoryId: string, priority: number = 5) {
    this.defaultRules.push({ keywords, categoryId, priority });
  }

  static getMatchingKeywords(description: string): string[] {
    const desc = description.toLowerCase();
    const matchedKeywords: string[] = [];

    this.defaultRules.forEach(rule => {
      rule.keywords.forEach(keyword => {
        if (desc.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        }
      });
    });

    return matchedKeywords;
  }
}

export default AutoCategorizationService;