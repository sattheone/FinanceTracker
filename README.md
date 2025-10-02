# Personal Finance Tracker - Satheesh & Family

A comprehensive personal finance tracking application built specifically for Satheesh's financial planning needs. This app provides detailed tracking, analysis, and forecasting capabilities for managing complex financial portfolios including assets, goals, insurance policies, and retirement planning.

## Features

### 🤖 AI-Powered Data Extraction
- **Screenshot Analysis**: Upload screenshots of bank statements, portfolio summaries, or insurance documents
- **Automatic Data Extraction**: AI automatically extracts financial data from images using Google Gemini Vision API
- **Smart Confirmation**: Review and edit extracted data before adding to your account
- **Multi-format Support**: Supports JPG, PNG, WebP images up to 10MB
- **Confidence Scoring**: AI provides confidence scores for extracted data accuracy

### 📊 Dashboard
- Real-time financial health overview
- Net worth tracking
- Monthly cash flow analysis
- Asset allocation visualization
- Goal progress monitoring
- Upcoming financial events timeline

### 💳 Transaction Management
- Comprehensive transaction tracking
- Category-wise expense analysis
- Income vs expense monitoring
- Advanced filtering and search
- Monthly/yearly summaries

### 💰 Asset Portfolio
- Multi-category asset tracking (Stocks, Mutual Funds, Gold, FD, etc.)
- Portfolio allocation analysis
- Performance tracking
- Diversification metrics
- Liquid vs illiquid asset breakdown

### 🎯 Financial Goals
- Retirement planning (Target: Age 50)
- Children's education goals (Vidhuna & Aadhya)
- Marriage planning
- Progress tracking with visual indicators
- Monthly SIP calculations
- Goal category analysis

### 🛡️ Insurance Management
- Life insurance portfolio (Term + Endowment)
- Health insurance tracking
- 25 LIC policies maturity schedule (2036-2060)
- Premium efficiency analysis
- Coverage adequacy assessment
- Post-retirement income planning

### 📈 Reports & Analytics
- Interactive charts and visualizations
- Asset allocation pie charts
- Cash flow analysis
- Goal progress tracking
- Financial ratios and metrics
- Performance benchmarking

### 🔮 Financial Forecasting
- Retirement corpus projections
- Scenario analysis (Conservative/Moderate/Aggressive)
- Inflation-adjusted planning
- 4% withdrawal rule calculations
- LIC maturity timeline
- Financial independence analysis

## Technical Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts library
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Build Tool**: Vite
- **Development**: Hot reload with Vite dev server

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Get your Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey) and add it to your `.env` file:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

4. **Build for Production**
   ```bash
   npm run build
   ```

5. **Preview Production Build**
   ```bash
   npm run preview
   ```

## Data Structure

The application uses the following key data structures:

### Assets
- Provident Fund: ₹30L
- Mutual Funds: ₹33.19L (Vidhuna: ₹22.69L, Aadhya: ₹10.5L)
- Stocks: ₹17.83L
- Gold: ₹14.8L (20 sovereigns)
- Fixed Deposit: ₹10L
- Cash: ₹7L
- Other: ₹6L (Loan to friend)

### Monthly Cash Flow
- **Income**: ₹2,30,857 (Salary + Interest)
- **Expenses**: 
  - Household: ₹35,000
  - Insurance: ₹16,852
  - Loans: ₹19,355
  - Investments: ₹47,876
  - Chit Fund: ₹1,04,167
- **Surplus**: ₹7,607

### Financial Goals
1. **Retirement**: ₹6.35Cr by age 50
2. **Vidhuna's Education**: ₹32.58L by 2035
3. **Vidhuna's Marriage**: ₹59.82L by 2042
4. **Aadhya's Education**: ₹43.66L by 2041
5. **Aadhya's Marriage**: ₹80.17L by 2048

### Insurance Coverage
- **Term Life**: ₹1.5Cr cover
- **Health**: ₹5L family floater
- **LIC Policies**: 25 policies maturing 2036-2060 (Total: ₹85L+)

## Key Financial Metrics

- **Net Worth**: ₹1.24Cr (as of Sep 2025)
- **Monthly Savings Rate**: 69.2%
- **Retirement Progress**: 19.5%
- **Investment Allocation**: 42.1%
- **Debt-to-Income**: 1.5% (Excellent)
- **Emergency Fund**: 3.3x monthly expenses

## AI Features & Pricing

### Google Gemini API Pricing
- **Free Tier**: 15 requests per minute, 1,500 requests per day
- **Paid Tier**: $0.00025 per image (very affordable for personal use)
- **Cost Example**: Analyzing 100 screenshots per month = ~$0.025 (2.5 cents)

### Supported Screenshot Types
- **Portfolio Screenshots**: Zerodha, Groww, ET Money, etc.
- **Bank Statements**: Any bank's transaction history
- **Insurance Documents**: Policy documents, premium receipts
- **Investment Summaries**: Mutual fund statements, SIP confirmations
- **Expense Receipts**: Shopping bills, payment confirmations

## Future Enhancements

- [x] AI-powered screenshot analysis
- [x] Multi-user authentication system
- [x] Comprehensive onboarding wizard
- [ ] Real-time market data integration
- [ ] Automated transaction import via bank APIs
- [ ] Tax planning and optimization module
- [ ] Mobile app version (React Native)
- [ ] Cloud data synchronization
- [ ] Advanced portfolio optimization with AI
- [ ] Expense categorization with ML
- [ ] Goal-based investment recommendations
- [ ] Voice-based transaction entry
- [ ] OCR for physical document scanning

## License

This project is created specifically for Satheesh & Family's personal financial management.

---

**Note**: This application contains sample financial data based on the provided financial plan. All amounts and projections are for demonstration purposes and should be updated with real-time data for actual use.