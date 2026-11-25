# Product Requirements Document (PRD)

## Finance Tracker — Personal Finance Management App

**Version:** 1.0  
**Author:** Satheesh  
**Date:** April 4, 2026  
**Target Platform (Future):** Native macOS app (SwiftUI)  
**Current Platform:** Progressive Web App (React + Firebase)

---

## 1. Executive Summary

Finance Tracker is a comprehensive personal finance management application built for Indian households. It consolidates bank accounts, investments, insurance, loans, goals, and daily transactions into a single unified dashboard with AI-powered insights, offline-first architecture, and smart automation.

The app is designed for a single household user (or family) managing all finances — from daily groceries to retirement planning — with support for Indian financial instruments (LIC, chit funds, EPF, Indian MFs/stocks), INR formatting (lakhs/crores), and Indian bank statement parsing.

---

## 2. Users & Personas

| Persona | Description |
|---------|-------------|
| **Primary User** | Salaried professional (25–55 years) managing personal + family finances |
| **Use Cases** | Track daily expenses, monitor investments, plan retirement, manage loans, set goals, review spending patterns |
| **Access Model** | Single-user per account, Firebase Authentication (email/password) |

---

## 3. Core Architecture

### 3.1 Data Layer

- **Backend:** Firebase Firestore (cloud-hosted NoSQL)
- **Offline Persistence:** Firestore IndexedDB + localStorage caching
- **Authentication:** Firebase Auth (email/password)
- **AI Engine:** Google Gemini 2.5 Flash (screenshot extraction, financial insights, natural language chat)
- **Market Data:** Google Sheets proxy + MFAPI (mutual fund NAV)

### 3.2 Sync System

Three sync modes to balance freshness vs. Firestore read costs:

| Mode | Behavior |
|------|----------|
| **Auto** | Syncs when data is stale (configurable: 5 / 15 / 30 / 60 min intervals) |
| **Manual** | User triggers sync explicitly; all writes queued locally until flushed |
| **Always** | Real-time Firestore listeners; syncs on every tab focus |

Key sync features:
- Offline-safe writes (fire-and-forget, queued by Firestore SDK)
- Pending change tracking (new / edited / deleted counts)
- Pending Sync Sheet UI showing unsync'd items with discard option
- Force sync button
- Month-based transaction caching in localStorage
- Dashboard summary precomputed as a single Firestore document to minimize reads

### 3.3 Firestore Collections

| Collection | Purpose |
|------------|---------|
| `users` | User profiles, preferences, dashboard summary cache |
| `transactions` | All financial transactions |
| `bankAccounts` | Bank, cash, and credit card accounts |
| `assets` | Investments (stocks, MFs, FDs, gold, EPF, chit funds) |
| `insurance` | Insurance policies |
| `goals` | Financial goals |
| `liabilities` | Loans and debts |
| `recurringTransactions` | Recurring payment definitions |
| `bills` | Bill tracking |
| `categories` | User-created custom categories |
| `categoryRules` | Auto-categorization rules |
| `sipRules` | SIP detection rules |
| `tags` | User-created transaction tags |
| `licPolicies` | LIC policy maturity tracking |
| `monthlyBudgets` | Monthly income/expense budgets |

---

## 4. Data Models

### 4.1 Transaction

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `date` | string (ISO) | Transaction date |
| `description` | string | Raw description / merchant name |
| `merchantKey` | string | Normalized merchant key for grouping |
| `category` | string | Category ID |
| `type` | enum | `income` · `expense` · `investment` · `insurance` · `transfer` |
| `amount` | number | Transaction amount (INR) |
| `paymentMethod` | string? | Payment method |
| `bankAccountId` | string? | Linked bank account |
| `recurringTransactionId` | string? | Link to recurring transaction |
| `notes` | string? | User notes |
| `tags` | string[] | Tag IDs |
| `entityLinks` | object[]? | Links to other entities |
| `appliedRule` | string? | Category rule that matched |
| `splitGroupId` | string? | Split transaction group |
| `splitParentId` | string? | Parent of a split |
| `isSplitParent` | boolean? | Whether this is a split parent |
| `originalAmount` | number? | Original amount before split |
| `splitOrder` | number? | Order within split group |

### 4.2 Asset (Investment)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Asset name / stock symbol |
| `category` | enum | `stocks` · `mutual_funds` · `fixed_deposit` · `gold` · `cash` · `epf` · `chit` · `other` |
| `currentValue` | number | Current market value |
| `investedValue` | number | Total cost basis |
| `symbol` | string? | Stock/MF symbol |
| `isin` | string? | ISIN code |
| `quantity` | number? | Number of units/shares |
| `averagePrice` | number? | Average buy price |
| `marketPrice` | number? | Live market price |
| `dayChange` / `dayChangePercent` | number? | Daily change |
| `totalReturn` / `totalReturnPercent` | number? | Total P&L |
| `xirr` | number? | Annualized return (XIRR) |
| `isSIP` | boolean? | Whether this is a SIP investment |
| `sipAmount` | number? | Monthly SIP amount |
| `sipDate` | number? | Monthly SIP date |
| `sipStartDate` | string? | SIP start date |
| `sipTransactions` | SIPTransaction[]? | Individual SIP contribution history |
| `targetAllocation` | number? | Target portfolio allocation % |
| `rebalanceAction` | string? | Buy / sell / hold suggestion |
| Chit fund fields | various | `chitGroupName`, `chitTicketValue`, `chitDurationMonths`, `chitStartDate` |

### 4.3 Bank Account

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `accountType` | enum | `bank` · `cash` · `credit_card` |
| `bank` | string | Bank name |
| `number` | string | Account number (masked in display) |
| `initialBalance` | number | Starting balance |
| `logo` | string? | Emoji/icon |
| `balance` | number | Computed current balance |

### 4.4 Goal

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Goal name |
| `targetAmount` | number | Target savings amount |
| `currentAmount` | number | Current progress |
| `targetDate` | string | Target completion date |
| `monthlyContribution` | number? | Planned monthly contribution |
| `category` | enum | `retirement` · `education` · `marriage` · `house` · `emergency` · `vacation` · `other` |
| `expectedReturnRate` | number? | Assumed annual growth rate |
| `isInflationAdjusted` | boolean? | Whether target is inflation-adjusted |
| `linkedSIPAssets` | string[]? | Linked SIP asset IDs (auto-update progress) |
| `linkedRecurringTransactions` | string[]? | Linked recurring transaction IDs |
| `linkedTransactionCategories` | string[]? | Auto-track contributions from specific categories |
| `autoUpdateFromTransactions` | boolean? | Auto-update from linked transactions |
| `priority` | enum? | `high` · `medium` · `low` |
| `milestones` | GoalMilestone[]? | Sub-targets within the goal |

### 4.5 Insurance

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `type` | enum | `term` · `endowment` · `health` · `other` |
| `policyName` | string | Policy name |
| `coverAmount` | number | Coverage amount |
| `premiumAmount` | number | Premium amount |
| `premiumFrequency` | enum | `monthly` · `quarterly` · `half-yearly` · `yearly` |
| `premiumPayingTerm` | number? | Number of years premiums are paid |
| `policyStartDate` | string | Start date |
| `maturityDate` | string? | Maturity date (endowment) |
| `maturityAmount` | number? | Expected maturity payout |
| `bonusGuaranteedAddition` | number? | Guaranteed additions |

### 4.6 Liability (Loan)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Loan name |
| `type` | enum | `home_loan` · `personal_loan` · `car_loan` · `credit_card` · `education_loan` · `business_loan` · `other` |
| `principalAmount` | number | Original loan amount |
| `currentBalance` | number | Outstanding balance |
| `interestRate` | number | Annual interest rate |
| `emiAmount` | number | Monthly EMI |
| `startDate` | string | Loan start date |
| `endDate` | string? | Expected payoff date |
| `bankName` | string? | Lender name |
| `paidInstallments` | object[]? | History of paid EMIs |

### 4.7 Recurring Transaction

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Recurring item name |
| `description` | string? | Description |
| `category` | string | Category ID |
| `type` | enum | Transaction type |
| `amount` | number | Expected amount |
| `frequency` | enum | `daily` · `weekly` · `monthly` · `quarterly` · `yearly` |
| `interval` | number | Interval multiplier |
| `startDate` | string | Start date |
| `endDate` | string? | End date |
| `nextDueDate` | string | Next expected payment |
| `isActive` | boolean | Active status |
| `autoCreate` | boolean | Auto-create transactions |
| `reminderDays` | number? | Days before due to remind |
| `vendor` | string? | Vendor/payee |

### 4.8 Bill

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Bill name |
| `amount` | number | Bill amount |
| `dueDate` | string | Due date |
| `frequency` | string | Billing frequency |
| `isPaid` | boolean | Payment status |
| `paidDate` | string? | When paid |
| `isOverdue` | boolean | Overdue flag |
| `recurringTransactionId` | string? | Link to recurring transaction |

### 4.9 Category

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID (e.g., `groceries`, `salary`) |
| `name` | string | Display name |
| `color` | string | Hex color |
| `icon` | string | Emoji icon |
| `isCustom` | boolean? | User-created flag |
| `parentId` | string? | Parent category ID (hierarchical) |
| `order` | number? | Display order |
| `isSystem` | boolean? | System-only flag |
| `budget` | number? | Monthly budget limit |

### 4.10 User Profile

| Field | Type | Description |
|-------|------|-------------|
| `personalInfo` | object | Name, email, date of birth |
| `financialInfo.monthlyIncome` | number | Declared monthly income |
| `financialInfo.monthlyExpenses` | number | Declared monthly expenses |
| `financialInfo.retirementAge` | number | Target retirement age |
| `financialInfo.currentAge` | number | Current age |
| `displayPreferences.defaultTimePeriod` | enum | `current` · `previous` (default month view) |
| `syncSettings.mode` | enum | `auto` · `manual` · `always` |
| `syncSettings.autoIntervalMinutes` | number | 5 · 15 · 30 · 60 |
| `onboardingStep` | number | Completed onboarding step |

### 4.11 Tag

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Tag name |
| `color` | string | Hex color |

### 4.12 Alert

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `type` | enum | `budget_warning` · `budget_exceeded` · `unusual_spending` · `low_balance` · `large_transaction` · `bill_reminder` · `overdue_bill` |
| `severity` | enum | `info` · `warning` · `critical` |
| `title` | string | Alert title |
| `message` | string | Alert body |
| `amount` | number? | Related amount |
| `relatedId` | string? | Related entity ID |
| `isRead` | boolean | Read status |
| `isDismissed` | boolean | Dismissed status |

---

## 5. Screens & Features

### 5.1 Onboarding (First Launch)

5-step guided wizard:

1. **Bank Accounts** — Add bank / cash / credit card accounts with initial balance
2. **Assets & Investments** — Add stocks, mutual funds, FDs, gold, EPF, chit funds
3. **Liabilities & Debts** — Add loans and credit card debt
4. **Financial Goals** — Set retirement, education, house, emergency goals
5. **Insurance Policies** — Add term, endowment, health policies

### 5.2 Dashboard

The main home screen providing a financial snapshot:

| Widget | Description |
|--------|-------------|
| **Net Worth Card** | Total assets − total liabilities, with bank balance breakdown |
| **Monthly Cash Flow** | Current month income / expenses / investments / surplus |
| **Retirement Progress** | % of retirement goal completed |
| **LIC Maturity Timeline** | Projected LIC maturity payouts |
| **Bank Balances** | Per-account current balance |
| **Smart Alerts** | Actionable alerts (budget warnings, bill reminders, unusual spending) |
| **AI Insights** | Gemini-powered financial health score, goal optimization, investment advice, tax tips, risk assessment |
| **Financial Wellness** | Composite score from: savings rate, emergency fund, debt-to-income, insurance coverage, investment diversification, goal progress |
| **Market Insights** | Live Nifty50, Sensex, Bank Nifty, Gold, USD/INR prices; sector analysis |

### 5.3 Transactions

Full transaction management with advanced features:

| Feature | Description |
|---------|-------------|
| **Transaction List** | Monthly view with date-based table, sortable columns (date, description, category, type, amount) |
| **Inline Editing** | Change category, type directly in the table row |
| **Quick Add** | Side panel form for manual transaction entry |
| **Filters** | Month picker, type filter, category filter, bank account filter |
| **Bulk Operations** | Multi-select → bulk change category / tag / type / delete |
| **Split Transactions** | Split one transaction into multiple categorized parts |
| **Tags** | Color-coded user tags for cross-cutting categorization |
| **Context Menu** | Right-click: edit, delete, duplicate, split, create rule, link to recurring |
| **Category Breakdown** | Pie chart of spending by category for the selected month |
| **Auto-Categorization** | Keyword rules (built-in for Indian merchants + user-created rules) |
| **Rule Prompts** | After categorizing, prompt to create a permanent rule |
| **Recurring Indicator** | Visual badge on transactions linked to recurring items |
| **Pending Sync Indicator** | Badge showing "New" or "Edited" for unsynced items |
| **Year-in-Review** | Annual spending summary cards |
| **Bank Account Management** | Create / edit / delete bank accounts; per-account balance tracking |

**Import Methods:**

| Method | Description |
|--------|-------------|
| AI Screenshot | Take photo or upload image → Gemini AI extracts transactions → confirmation dialog |
| Excel / CSV | Upload file → fuzzy column header matching → column mapping → import with duplicate detection |
| Bank Statement PDF | HDFC-specific + generic parser → structured extraction |
| Backup CSV | Import from other apps (Walnut, Money Manager) with category mapping |
| Gmail Crawler | OAuth Gmail access → parse bank transaction emails (HDFC) |
| Bulk Manual Entry | Modal for entering multiple transactions at once |

**Duplicate Detection:**
- Multi-level: import vs. existing, within a month, within an import batch
- Configurable sensitivity
- Confirmation dialog for suspected duplicates

### 5.4 Assets & Investments

| Feature | Description |
|---------|-------------|
| **Portfolio Overview** | Total invested, current value, total return, day change |
| **Asset Cards** | Per-asset: name, quantity, avg price, current price, P&L, XIRR |
| **Tabs** | Overview · Performance · Rebalancing · Analytics |
| **Live Prices** | Stock prices from Google Sheets proxy; MF NAV from MFAPI |
| **SIP Tracking** | Monthly SIP amount, date tracking, individual contribution history with NAV |
| **SIP Auto-Update** | Auto-detects SIP transactions by description/amount patterns, records units at current NAV |
| **XIRR Calculator** | Newton-Raphson annualized return for each asset and portfolio |
| **Portfolio Rebalancing** | Age-based target allocation; buy/sell/hold suggestions per asset |
| **Diversification Score** | Concentration risk assessment across categories |
| **Chit Fund Tracking** | Specialized type with group name, ticket value, duration, start date, contribution tracking |
| **AI Import** | Extract portfolio from brokerage screenshots via Gemini |
| **Asset Categories** | Stocks · Mutual Funds · Fixed Deposits · Gold · Cash · EPF · Chit · Other |
| **Linked Transactions** | View transactions linked to an asset |

### 5.5 Goals

| Feature | Description |
|---------|-------------|
| **Goal Cards** | Progress bar, % complete, countdown to target date, monthly contribution |
| **Goal Categories** | Retirement · Education · Marriage · House · Emergency · Vacation · Other |
| **SIP Linking** | Link SIP mutual fund / EPF assets → auto-update goal progress from current asset value |
| **Transaction Linking** | Link categories → auto-track contributions |
| **Milestones** | Sub-targets within a goal with completion checkoff |
| **Priority** | High / Medium / Low priority levels |
| **Inflation Adjustment** | Option to inflation-adjust target amount |
| **Expected Return Rate** | Assumed annual growth rate for projections |

### 5.6 Insurance

| Feature | Description |
|---------|-------------|
| **Policy Cards** | Type badge, cover amount, premium amount & frequency |
| **Policy Types** | Term · Endowment · Health · Other |
| **Total Coverage** | Aggregate life cover across all policies |
| **Total Premium** | Aggregate annual premium |
| **LIC Maturity** | Maturity year, amount, guaranteed additions for endowment policies |
| **Premium Paying Term** | Separate premium-paying period vs. policy term |

### 5.7 Liabilities (Loans)

| Feature | Description |
|---------|-------------|
| **Loan Cards** | Type, principal, current balance, interest rate, EMI, progress bar |
| **Loan Types** | Home · Personal · Car · Credit Card · Education · Business · Other |
| **Amortization Schedule** | Full month-by-month breakdown of principal / interest / balance |
| **Installment Tracking** | Mark individual EMIs as paid, with date and amount |
| **Mark Past Dues** | Bulk-mark all past installments as paid |

### 5.8 Recurring Transactions

| Feature | Description |
|---------|-------------|
| **Recurring List** | All recurring items with status indicators |
| **Status** | Paid · Upcoming · Overdue · Future |
| **Monthly Summary** | Total expected recurring outflow for current month |
| **Auto-Link** | Auto-detect matching transactions and link them |
| **Setup Modal** | Create from scratch or from an existing transaction |
| **Frequency** | Daily · Weekly · Monthly · Quarterly · Yearly with interval multiplier |
| **Auto-Create** | Optionally auto-generate transactions on due date |

### 5.9 Reports

| Visualization | Description |
|---------------|-------------|
| **Asset Allocation** | Pie chart of portfolio by asset category |
| **Monthly Cash Flow** | Waterfall chart: income → expenses → investments → surplus |
| **Goal Progress** | Bar chart of all goals with % completion |
| **LIC Maturity Timeline** | 10-year projected maturity payouts |
| **Net Worth** | Total net worth calculation |
| **Savings Rate** | Monthly savings as % of income |
| **Retirement Progress** | % of retirement corpus achieved |

### 5.10 Forecast

| Tab | Description |
|-----|-------------|
| **Overview** | Asset-based wealth projection with growth assumptions |
| **Invest & Drawdown Simulator** | Select SIPs → project corpus growth → simulate retirement drawdown with withdrawal rate |

### 5.11 Calendar

| Feature | Description |
|---------|-------------|
| Calendar grid showing transactions, recurring items, and bills on each date |
| Category and type filtering |
| Click a date to see all items for that day |

### 5.12 Alerts

| Alert Type | Trigger |
|------------|---------|
| **Budget Warning** | Spending exceeds 80% of category budget |
| **Budget Exceeded** | Spending exceeds 100% of category budget |
| **Unusual Spending** | Spending significantly above average for a category |
| **Low Balance** | Bank account balance below threshold |
| **Large Transaction** | Single transaction above threshold |
| **Bill Reminder** | Bill due within reminder window |
| **Overdue Bill** | Bill past due date and unpaid |

Severity levels: `info` · `warning` · `critical`  
Actions: Mark as read, dismiss, filter by type

### 5.13 Categories

| Feature | Description |
|---------|-------------|
| **60+ Built-in Categories** | Hierarchical with parent-child (e.g., Food > Groceries, Restaurants, Delivery) |
| **Category Groups** | Bills & Utilities · Food & Dining · Transportation · Shopping · Entertainment · Healthcare · Education · Income · Investment · Miscellaneous |
| **Custom Categories** | User-created with custom name, color, emoji icon |
| **Per-Category Budget** | Monthly spending limit per category |
| **Spending Analysis** | Month / previous month / year / previous year views |
| **Account Filtering** | View spending per bank account |
| **Category Detail** | Drill-down list of all transactions in a category |
| **Category Rules** | Auto-categorization rules with exact/partial match on description |
| **Category Migration** | Tool to fix invalid category IDs on existing transactions |

### 5.14 Settings

| Section | Features |
|---------|----------|
| **Profile** | Name, email, date of birth |
| **Financial Preferences** | Monthly income/expenses, retirement age, current age |
| **Theme** | Light · Dark · Auto (system) · Tinted (6 palettes: Cream, Sand, Sage, Sky, Lavender, Rose) |
| **Sync Settings** | Mode (auto/manual/always), auto interval selection |
| **Category Management** | Add/edit/delete categories, reorder, set budgets |
| **Category Rules** | Manage auto-categorization rules |
| **Gmail Import** | Configure OAuth Gmail integration for bank email parsing |
| **Duplicate Detection** | Sensitivity settings for duplicate detection |
| **Data Deletion** | Delete all data / specific data types |

---

## 6. AI Features (Google Gemini 2.5 Flash)

### 6.1 Screenshot Import

- User takes photo or uploads image of bank/brokerage statement
- Gemini extracts structured data (transactions, assets, or insurance)
- Confirmation dialog for review before import
- Supports: bank statements, demat holdings, MF statements, insurance documents

### 6.2 AI Financial Insights Dashboard

| Insight | Description |
|---------|-------------|
| **Financial Health Score** | Composite score based on savings, debt, insurance, diversification |
| **Goal Optimization** | Suggestions to reach goals faster |
| **Investment Advice** | Asset allocation recommendations based on age and risk profile |
| **Tax Planning** | Tax-saving suggestions (80C, 80D, NPS, ELSS) |
| **Risk Assessment** | Portfolio risk analysis and mitigation suggestions |

### 6.3 Natural Language Financial Chat

- Ask questions about your finances in plain English/Hindi
- Context-aware answers based on your actual data
- Examples: "How much did I spend on food last month?", "Am I on track for retirement?"

---

## 7. Category System

### 7.1 Built-in Categories (60+)

Hierarchical structure with parent > child relationships:

| Parent Group | Sub-Categories |
|-------------|----------------|
| **Food & Dining** | Groceries, Restaurants, Delivery, Coffee & Snacks |
| **Bills & Utilities** | Electricity, Water, Gas, Internet, Phone, DTH/Cable |
| **Transportation** | Fuel, Metro/Bus, Auto/Taxi, Cab (Ola/Uber), Parking, Vehicle Maintenance |
| **Shopping** | Clothing, Electronics, Home & Garden, Personal Care, Online Shopping |
| **Entertainment** | Movies & Events, Streaming, Gaming, Hobbies, Sports |
| **Healthcare** | Doctor/Hospital, Pharmacy, Dental, Lab Tests |
| **Education** | Tuition, Books, Courses, School/College |
| **Income** | Salary, Freelance, Interest, Dividends, Rental, Bonus, Refund |
| **Investment** | Stocks, Mutual Funds, Fixed Deposit, Gold, EPF, PPF, NPS, Chit Fund |
| **Miscellaneous** | Gifts, Charity, ATM Withdrawal, Gym/Fitness |

### 7.2 Auto-Categorization

Built-in keyword rules for Indian merchants:
- **Swiggy / Zomato** → Food Delivery
- **Flipkart / Amazon / Myntra** → Online Shopping
- **Ola / Uber** → Cab
- **Netflix / Hotstar / Prime** → Streaming
- **IOCL / BPCL / HPCL** → Fuel
- And 50+ more merchant patterns

User-created rules:
- Match type: exact / partial
- Track match count
- Activate / deactivate

---

## 8. Theme System

### 8.1 Modes

| Mode | Behavior |
|------|----------|
| **Light** | White backgrounds, dark text |
| **Dark** | Dark backgrounds, light text |
| **Auto** | Follows macOS system appearance |
| **Tinted** | Light base with colored tint overlay |

### 8.2 Tint Palettes (Tinted Mode)

| Palette | Primary Color | Background Feel |
|---------|--------------|-----------------|
| Cream | Warm amber | Warm paper-like |
| Sand | Desert tan | Warm earthy |
| Sage | Muted green | Calm natural |
| Sky | Soft blue | Airy clean |
| Lavender | Soft purple | Elegant calm |
| Rose | Soft pink | Warm romantic |

### 8.3 Implementation

CSS custom properties with semantic tokens:
- `--color-bg-primary`, `--color-bg-secondary`
- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- `--color-card-bg`, `--color-border-primary`
- `--color-accent`, `--color-accent-hover`
- Component-level theming via `useThemeClasses()` hook

---

## 9. Notification System

| Channel | Types |
|---------|-------|
| **In-App Alerts** | Budget warnings, unusual spending, low balance, large transactions, bill reminders |
| **Browser Push** | Bill due reminders, recurring transaction reminders |
| **Email** | Monthly reports, bill reminders, budget alerts (via SendGrid/Firebase) |

---

## 10. Import & Export

### 10.1 Import Sources

| Source | Format | Parser |
|--------|--------|--------|
| Bank Statement | PDF | HDFC-specific + generic strategies |
| Spreadsheet | Excel (.xlsx) / CSV | Fuzzy column header matching |
| Backup | CSV | Category mapping from Walnut / Money Manager / generic |
| Screenshot | Image (PNG/JPG) | Gemini AI extraction |
| Gmail | Email | OAuth crawler for HDFC transaction emails |
| Manual | In-app form | Bulk or individual entry |

### 10.2 Import Flow

1. Upload file / take photo / connect Gmail
2. Parse → extract raw data
3. Column mapping (Excel/CSV) or AI confirmation (screenshots)
4. Duplicate detection (configurable sensitivity)
5. Category auto-assignment
6. User confirmation dialog with editable preview
7. Import to Firestore

---

## 11. Offline-First Architecture

| Feature | Implementation |
|---------|---------------|
| **Persistence** | Firestore `persistentLocalCache` with `persistentMultipleTabManager` |
| **Offline Writes** | `addDocOfflineSafe()` — generates ID synchronously, queues write |
| **Local Cache** | Transactions, bank accounts, categories, rules cached in localStorage |
| **Month Cache** | Transaction lists cached per-month with version keys |
| **Dashboard Cache** | Precomputed summary stored as single Firestore doc |
| **Pending Tracking** | UI indicators for new/edited/unsynced items |
| **Network Toggle** | Guarded `enableNetwork` / `disableNetwork` with crash protection |

---

## 12. Calculations & Algorithms

| Calculation | Method |
|-------------|--------|
| **XIRR** | Newton-Raphson iterative method on cashflows |
| **EMI** | Standard amortization formula: `P × r × (1+r)^n / ((1+r)^n - 1)` |
| **Amortization** | Month-by-month: interest = balance × rate/12; principal = EMI − interest |
| **Net Worth** | Total assets + total bank balances − total liabilities |
| **Savings Rate** | (Income − Expenses) / Income × 100 |
| **Retirement Progress** | Current corpus / target corpus × 100 |
| **Portfolio Rebalancing** | Age-based target allocation with deviation thresholds |
| **Diversification Score** | Herfindahl-style concentration index across categories |
| **Merchant Normalization** | Lowercase, strip special chars, fuzzy matching for merchant grouping |

---

## 13. Navigation Structure

### 13.1 Primary Navigation (Bottom Nav on Mobile / Side Nav on Desktop)

| Item | Icon | Screen |
|------|------|--------|
| Dashboard | Home | Dashboard |
| Transactions | Receipt | Transactions |
| Assets | TrendingUp | Assets |
| More | Menu | Navigation sheet with all screens |

### 13.2 Secondary Navigation (Nav Sheet)

| Item | Screen |
|------|--------|
| Goals | Goals |
| Insurance | Insurance |
| Liabilities | Liabilities |
| Recurring | Recurring Transactions |
| Calendar | Calendar |
| Reports | Reports |
| Forecast | Forecast |
| Alerts | Alerts |
| Categories | Categories |
| Settings | Settings |

---

## 14. macOS Native App Considerations

### 14.1 Architecture Recommendations

| Aspect | Recommendation |
|--------|---------------|
| **Framework** | SwiftUI + Swift Data (or Core Data) for local persistence |
| **Backend** | Firebase SDK for Apple platforms (or migrate to CloudKit for tighter Apple integration) |
| **AI** | Google Generative AI Swift SDK (or Apple Intelligence APIs when available) |
| **Charts** | Swift Charts framework (native) |
| **Market Data** | URLSession-based API calls to same data sources |
| **Offline** | Swift Data with CloudKit sync (automatic offline support) |
| **Notifications** | UserNotifications framework (local + push) |
| **Theme** | Native appearance support (`.preferredColorScheme()`) |

### 14.2 macOS-Specific UI Opportunities

| Feature | macOS Advantage |
|---------|----------------|
| **Multi-Window** | Open transactions + dashboard side by side |
| **Menu Bar Widget** | Quick net worth / balance glance |
| **Keyboard Shortcuts** | ⌘N new transaction, ⌘F search, ⌘1-9 navigation |
| **Drag & Drop** | Drop bank statements / screenshots directly onto the window |
| **Touch Bar** | Quick transaction entry (if supported) |
| **Spotlight** | Search transactions from Spotlight |
| **Widgets** | WidgetKit for dashboard summary on desktop/Notification Center |
| **Sidebar Navigation** | Native macOS sidebar with collapsible sections |
| **Toolbar** | macOS toolbar with segmented controls for filters |
| **Sheets** | Native sheet presentations for forms |
| **Split View** | Transaction list + detail side by side |

### 14.3 Data Migration Path

1. Export all Firestore data as JSON
2. Map to Swift Data models (1:1 field mapping from the models above)
3. Firebase Auth → Sign in with Apple + Firebase Auth
4. Firestore listeners → same Firebase iOS SDK
5. localStorage caches → UserDefaults + Swift Data

---

## 15. Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| **Performance** | Dashboard loads in < 1s from cache; transaction list virtualizes 1000+ rows |
| **Data Privacy** | All data stored under authenticated user's Firestore path with security rules |
| **Cost Optimization** | Sync modes to minimize Firestore reads; dashboard summary precomputation; month-based lazy loading |
| **Accessibility** | Semantic HTML; keyboard navigation; screen reader labels |
| **Localization** | INR currency formatting (Indian numbering: lakhs/crores); English UI |
| **Data Retention** | No automatic deletion; user can delete all or specific data types from Settings |

---

## 16. Appendix: Feature Priority Matrix (for Native App)

### P0 — Must Have (MVP)

- [ ] Authentication (Sign in with Apple + email)
- [ ] Dashboard with net worth, cash flow, bank balances
- [ ] Transaction list with filters, inline editing, quick add
- [ ] Bank account management
- [ ] Category system (built-in + custom)
- [ ] Auto-categorization rules
- [ ] Offline persistence + sync
- [ ] Settings (profile, theme, sync)

### P1 — Should Have

- [ ] Assets & investment tracking with live prices
- [ ] Goal tracking with SIP linking
- [ ] Insurance policy management
- [ ] Liability/loan tracking with amortization
- [ ] Recurring transactions
- [ ] Reports & visualizations
- [ ] Tags
- [ ] Split transactions
- [ ] Import from CSV/Excel

### P2 — Nice to Have

- [ ] AI screenshot import (Gemini)
- [ ] AI financial insights & chat
- [ ] Forecast & drawdown simulator
- [ ] Calendar view
- [ ] Smart alerts
- [ ] Financial wellness score
- [ ] Market insights
- [ ] Gmail import
- [ ] Year-in-review
- [ ] Portfolio rebalancing
- [ ] Menu bar widget
- [ ] Spotlight integration
- [ ] WidgetKit widgets

---

*This PRD is auto-generated from the existing Finance Tracker web app codebase and is intended to serve as a comprehensive reference for building a native macOS application.*
