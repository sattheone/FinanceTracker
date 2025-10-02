# Personal Finance Tracker

A comprehensive personal finance tracking application built for managing complex financial portfolios including assets, goals, insurance policies, and retirement planning. This application provides detailed tracking, analysis, and forecasting capabilities for personal financial management.

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
- Retirement planning (customizable target age)
- Children's education goals
- Marriage planning
- Progress tracking with visual indicators
- Monthly SIP calculations
- Goal category analysis

### 🛡️ Insurance Management
- Life insurance portfolio (Term + Endowment)
- Health insurance tracking
- LIC policies maturity schedule
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

## Getting Started

### First Time Setup
1. **Sign Up**: Create your account with email and password
2. **Complete Onboarding**: Follow the guided setup wizard to:
   - Add personal and family information
   - Set up bank accounts
   - Define financial goals
   - Add existing assets and liabilities
   - Configure insurance policies
3. **Start Tracking**: Begin adding transactions and monitoring your financial progress

### Data Structure

The application allows you to manage:

#### Assets
- Provident Fund and retirement accounts
- Mutual Funds and SIP investments
- Stock portfolios
- Gold and precious metals
- Fixed Deposits and savings
- Real estate properties
- Other investments

#### Liabilities
- Home loans and mortgages
- Personal loans
- Car loans
- Credit card debt
- Education loans
- Business loans

#### Financial Goals
- Retirement planning
- Children's education
- Marriage expenses
- Emergency fund
- Custom financial objectives

#### Insurance Coverage
- Term life insurance
- Health insurance policies
- Endowment policies
- Vehicle insurance
- Property insurance

## Key Features

The application provides comprehensive financial tracking:
- **Net Worth Calculation**: Assets minus liabilities
- **Cash Flow Analysis**: Income vs expenses tracking
- **Goal Progress Monitoring**: Visual progress indicators
- **Investment Allocation**: Portfolio diversification analysis
- **Debt Management**: EMI tracking and payoff schedules
- **Insurance Portfolio**: Coverage adequacy assessment

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

## Data Privacy & Security

⚠️ **Important**: This application contains demo/sample financial data for demonstration purposes only.

### Privacy Guidelines
- All personal names, amounts, and financial details in the demo data are fictional
- Before deploying or sharing this code, ensure all personal information is removed
- Use placeholder data for public repositories
- Keep actual financial data in private, secure environments

### Recommended Practices
1. **Never commit real financial data** to version control
2. **Use environment variables** for sensitive configuration
3. **Implement proper authentication** for production use
4. **Regular security audits** of the codebase
5. **Backup strategies** for important financial data

## License

This project is open source and available under the MIT License.

---

**Note**: This application contains sample financial data for demonstration purposes. All amounts and projections should be replaced with real data for actual use. Ensure proper data privacy and security measures when handling real financial information.