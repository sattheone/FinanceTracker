interface CategoryRule {
  keywords: string[];
  categoryId: string;
  priority: number;
}

class AutoCategorizationService {
  private static rules: CategoryRule[] = [
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

  static autoAssignCategory(description: string, _amount: number, _type: string): string {
    const desc = description.toLowerCase();
    
    // Find matching rules
    const matchingRules = this.rules.filter(rule => 
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

  static suggestCategoryForTransaction(description: string, amount: number, type: string): string {
    return this.autoAssignCategory(description, amount, type);
  }

  static addCustomRule(keywords: string[], categoryId: string, priority: number = 5) {
    this.rules.push({ keywords, categoryId, priority });
  }

  static getMatchingKeywords(description: string): string[] {
    const desc = description.toLowerCase();
    const matchedKeywords: string[] = [];
    
    this.rules.forEach(rule => {
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