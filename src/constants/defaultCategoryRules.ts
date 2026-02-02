import { CategoryRule } from '../types';

/**
 * Default category rules for auto-categorization
 * These rules match common transaction patterns and automatically categorize them
 * All rules use partial matching for flexibility
 */
export const defaultCategoryRules: Omit<CategoryRule, 'id' | 'createdAt' | 'lastUsed' | 'matchCount'>[] = [
  // ===== 🛡️ INSURANCE & INVESTMENTS =====

  // Insurance (Inv)
  { name: 'LIC', categoryId: 'insurance_inv', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'HDFCLIFE', categoryId: 'insurance_inv', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'SBILIFE', categoryId: 'insurance_inv', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'ICICIPRU', categoryId: 'insurance_inv', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'MAXLIFE', categoryId: 'insurance_inv', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'TATAAIA', categoryId: 'insurance_inv', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'BAJAJALLIANZ', categoryId: 'insurance_inv', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'STARHEALTH', categoryId: 'insurance_inv', transactionType: 'investment', matchType: 'partial', isActive: true },

  // Mutual Funds
  { name: 'INDIANESIGN', categoryId: 'mutual_funds', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'GROWW', categoryId: 'mutual_funds', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'ZERODHA', categoryId: 'mutual_funds', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'COIN', categoryId: 'mutual_funds', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'KUVERA', categoryId: 'mutual_funds', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'ETMONEY', categoryId: 'mutual_funds', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'SIP', categoryId: 'mutual_funds', transactionType: 'investment', matchType: 'partial', isActive: true },

  // Stocks / Equity
  { name: 'UPSTOX', categoryId: 'stocks', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'ANGELONE', categoryId: 'stocks', transactionType: 'investment', matchType: 'partial', isActive: true },
  { name: 'ICICIDIRECT', categoryId: 'stocks', transactionType: 'investment', matchType: 'partial', isActive: true },

  // ===== 🚗 TRANSPORTATION =====

  // Fuel / Gas
  { name: 'PETROL', categoryId: 'fuel', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'DIESEL', categoryId: 'fuel', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'INDIANOIL', categoryId: 'fuel', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'IOC', categoryId: 'fuel', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'BPCL', categoryId: 'fuel', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'HPCL', categoryId: 'fuel', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'SHELL', categoryId: 'fuel', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'ESSAR', categoryId: 'fuel', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Public Transit
  { name: 'UBER', categoryId: 'public_transit', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'OLA', categoryId: 'public_transit', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'RAPIDO', categoryId: 'public_transit', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'METRO', categoryId: 'public_transit', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'BMTC', categoryId: 'public_transit', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'MTC', categoryId: 'public_transit', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'IRCTC', categoryId: 'public_transit', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Tolls / Parking
  { name: 'FASTAG', categoryId: 'tolls', transactionType: 'expense', matchType: 'partial', isActive: true },

  // ===== 🍽️ FOOD & DINING =====

  // Food Delivery
  { name: 'SWIGGY', categoryId: 'delivery', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'ZOMATO', categoryId: 'delivery', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'EATSURE', categoryId: 'delivery', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'DUNZO', categoryId: 'delivery', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Groceries
  { name: 'BIGBASKET', categoryId: 'groceries', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'BLINKIT', categoryId: 'groceries', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'ZEPTO', categoryId: 'groceries', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'DMART', categoryId: 'groceries', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'RELIANCESMART', categoryId: 'groceries', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'SPAR', categoryId: 'groceries', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'NILGIRIS', categoryId: 'groceries', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Restaurants (Dining Out)
  { name: 'DOMINOS', categoryId: 'restaurants', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'PIZZAHUT', categoryId: 'restaurants', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'MCDONALD', categoryId: 'restaurants', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'KFC', categoryId: 'restaurants', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'SUBWAY', categoryId: 'restaurants', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'STARBUCKS', categoryId: 'restaurants', transactionType: 'expense', matchType: 'partial', isActive: true },

  // ===== 💡 UTILITIES & BILLS =====

  // Electricity
  { name: 'BESCOM', categoryId: 'electricity', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'TNEB', categoryId: 'electricity', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'TANGEDCO', categoryId: 'electricity', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Water
  { name: 'METROWATER', categoryId: 'water', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Phone / Mobile
  { name: 'AIRTEL', categoryId: 'phone', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'JIO', categoryId: 'phone', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'VI', categoryId: 'phone', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'VODAFONE', categoryId: 'phone', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'BSNL', categoryId: 'phone', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Internet / TV
  { name: 'ACTFIBERNET', categoryId: 'internet', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'TATAPLAY', categoryId: 'internet', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'DISH', categoryId: 'internet', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'HATHWAY', categoryId: 'internet', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Gas Cylinder
  { name: 'INDANE', categoryId: 'gas', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'HP GAS', categoryId: 'gas', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'BHARAT GAS', categoryId: 'gas', transactionType: 'expense', matchType: 'partial', isActive: true },

  // ===== 🎬 ENTERTAINMENT =====

  // Streaming
  { name: 'NETFLIX', categoryId: 'streaming', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'PRIME VIDEO', categoryId: 'streaming', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'HOTSTAR', categoryId: 'streaming', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'SONYLIV', categoryId: 'streaming', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'ZEE5', categoryId: 'streaming', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'SPOTIFY', categoryId: 'streaming', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'GAANA', categoryId: 'streaming', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Movies / Events
  { name: 'BOOKMYSHOW', categoryId: 'movies', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'PVR', categoryId: 'movies', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'INOX', categoryId: 'movies', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'CINEPOLIS', categoryId: 'movies', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Games
  { name: 'STEAM', categoryId: 'games', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'PLAYSTATION', categoryId: 'games', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'XBOX', categoryId: 'games', transactionType: 'expense', matchType: 'partial', isActive: true },

  // ===== 🛍️ SHOPPING =====

  // Shopping (General)
  { name: 'AMAZON', categoryId: 'shopping', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'FLIPKART', categoryId: 'shopping', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'MEESHO', categoryId: 'shopping', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'RELIANCEDIGITAL', categoryId: 'electronics', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Clothing
  { name: 'MYNTRA', categoryId: 'clothing', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'AJIO', categoryId: 'clothing', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'TRENDS', categoryId: 'clothing', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'ZUDIO', categoryId: 'clothing', transactionType: 'expense', matchType: 'partial', isActive: true },

  // ===== 🏥 HEALTHCARE =====

  // Medicine / Pharmacy
  { name: 'PHARMACY', categoryId: 'pharmacy', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'MEDPLUS', categoryId: 'pharmacy', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'PHARMEASY', categoryId: 'pharmacy', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: '1MG', categoryId: 'pharmacy', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Doctor / Hospital
  { name: 'HOSPITAL', categoryId: 'doctor', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'FORTIS', categoryId: 'doctor', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'MANIPAL', categoryId: 'doctor', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'PRACTO', categoryId: 'doctor', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Fitness
  { name: 'CULTFIT', categoryId: 'fitness', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'GYM', categoryId: 'fitness', transactionType: 'expense', matchType: 'partial', isActive: true },

  // ===== 🎓 EDUCATION =====

  // Education
  { name: 'BYJU', categoryId: 'education', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'UNACADEMY', categoryId: 'education', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'VEDANTU', categoryId: 'education', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'COURSERA', categoryId: 'education', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'UDEMY', categoryId: 'education', transactionType: 'expense', matchType: 'partial', isActive: true },

  // Tuition / School Fees
  { name: 'SCHOOL', categoryId: 'tuition', transactionType: 'expense', matchType: 'partial', isActive: true },
  { name: 'COLLEGE', categoryId: 'tuition', transactionType: 'expense', matchType: 'partial', isActive: true },

  // ===== 💰 INCOME =====

  // Salary
  { name: 'SALARY', categoryId: 'salary', transactionType: 'income', matchType: 'partial', isActive: true },
  { name: 'PAYROLL', categoryId: 'salary', transactionType: 'income', matchType: 'partial', isActive: true },

  // Other Income
  { name: 'INTEREST', categoryId: 'other_income', transactionType: 'income', matchType: 'partial', isActive: true },
  { name: 'DIVIDEND', categoryId: 'other_income', transactionType: 'income', matchType: 'partial', isActive: true },
  { name: 'REFUND', categoryId: 'other_income', transactionType: 'income', matchType: 'partial', isActive: true },
  { name: 'CASHBACK', categoryId: 'other_income', transactionType: 'income', matchType: 'partial', isActive: true },

  // ===== ↔️ TRANSFERS =====

  // Transfer (Active)
  { name: 'ATM WITHDRAWAL', categoryId: 'transfer', transactionType: 'transfer', matchType: 'partial', isActive: true },
  { name: 'CASH WITHDRAWAL', categoryId: 'transfer', transactionType: 'transfer', matchType: 'partial', isActive: true },

  // Transfer (Disabled by default - too generic)
  { name: 'UPI', categoryId: 'transfer', transactionType: 'transfer', matchType: 'partial', isActive: false },
  { name: 'IMPS', categoryId: 'transfer', transactionType: 'transfer', matchType: 'partial', isActive: false },
  { name: 'NEFT', categoryId: 'transfer', transactionType: 'transfer', matchType: 'partial', isActive: false },
  { name: 'RTGS', categoryId: 'transfer', transactionType: 'transfer', matchType: 'partial', isActive: false },
];
