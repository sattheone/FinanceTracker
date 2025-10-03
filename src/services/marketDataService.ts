import { Asset } from '../types';

// Free APIs for market data
const API_ENDPOINTS = {
  // Alpha Vantage (Free tier: 5 calls per minute, 500 calls per day)
  ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
  // Yahoo Finance Alternative (Free)
  YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance/chart',
  // Indian Market Data (Free)
  NSE_INDIA: 'https://www.nseindia.com/api',
  // Mutual Fund Data India (Free)
  MFAPI: 'https://api.mfapi.in/mf'
};

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  currency: string;
}

export interface MutualFundData {
  schemeCode: string;
  schemeName: string;
  nav: number;
  date: string;
}

export class MarketDataService {
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static cache = new Map<string, { data: MarketData; timestamp: number }>();

  // Get real-time stock price (Indian stocks)
  static async getStockPrice(symbol: string): Promise<MarketData | null> {
    try {
      // Check cache first
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      // Try Yahoo Finance API for Indian stocks
      const response = await fetch(
        `${API_ENDPOINTS.YAHOO_FINANCE}/${symbol}.NS?interval=1d&range=1d`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result) {
        throw new Error('No data found');
      }

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice || meta.previousClose;
      const previousClose = meta.previousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      const marketData: MarketData = {
        symbol,
        price: currentPrice,
        change,
        changePercent,
        lastUpdated: new Date().toISOString(),
        currency: meta.currency || 'INR'
      };

      // Cache the result
      this.cache.set(symbol, { data: marketData, timestamp: Date.now() });
      
      return marketData;
    } catch (error) {
      console.error(`Error fetching stock price for ${symbol}:`, error);
      return null;
    }
  }

  // Get mutual fund NAV (Indian mutual funds)
  static async getMutualFundNAV(schemeCode: string): Promise<MutualFundData | null> {
    try {
      const response = await fetch(`${API_ENDPOINTS.MFAPI}/${schemeCode}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No NAV data found');
      }

      const latestNav = data.data[0];
      
      return {
        schemeCode,
        schemeName: data.meta?.scheme_name || 'Unknown Scheme',
        nav: parseFloat(latestNav.nav),
        date: latestNav.date
      };
    } catch (error) {
      console.error(`Error fetching MF NAV for ${schemeCode}:`, error);
      return null;
    }
  }

  // Update portfolio with real-time data
  static async updatePortfolioValues(assets: Asset[]): Promise<Asset[]> {
    const updatedAssets = [...assets];
    const updatePromises: Promise<void>[] = [];

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      
      if (asset.category === 'stocks' && asset.symbol) {
        updatePromises.push(
          this.getStockPrice(asset.symbol).then(marketData => {
            if (marketData) {
              updatedAssets[i] = {
                ...asset,
                marketPrice: marketData.price,
                dayChange: marketData.change,
                dayChangePercent: marketData.changePercent,
                currentValue: (asset.quantity || 0) * marketData.price,
                lastUpdated: marketData.lastUpdated
              };
            }
          })
        );
      } else if (asset.category === 'mutual_funds' && asset.isin) {
        // For mutual funds, we'd need to map ISIN to scheme code
        // This is a simplified implementation
        updatePromises.push(
          Promise.resolve() // Placeholder for MF update logic
        );
      }
    }

    // Wait for all updates to complete
    await Promise.allSettled(updatePromises);
    
    return updatedAssets;
  }

  // Get popular Indian stock symbols for autocomplete
  static getPopularStocks(): Array<{ symbol: string; name: string }> {
    return [
      { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
      { symbol: 'TCS', name: 'Tata Consultancy Services Ltd' },
      { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd' },
      { symbol: 'INFY', name: 'Infosys Ltd' },
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd' },
      { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd' },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd' },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd' },
      { symbol: 'ITC', name: 'ITC Ltd' },
      { symbol: 'SBIN', name: 'State Bank of India' },
      { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd' },
      { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd' },
      { symbol: 'AXISBANK', name: 'Axis Bank Ltd' },
      { symbol: 'LT', name: 'Larsen & Toubro Ltd' },
      { symbol: 'WIPRO', name: 'Wipro Ltd' }
    ];
  }

  // Get popular mutual fund schemes
  static getPopularMutualFunds(): Array<{ code: string; name: string }> {
    return [
      { code: '120503', name: 'SBI Bluechip Fund' },
      { code: '118989', name: 'HDFC Top 100 Fund' },
      { code: '120716', name: 'ICICI Prudential Bluechip Fund' },
      { code: '119551', name: 'Axis Bluechip Fund' },
      { code: '120503', name: 'Kotak Select Focus Fund' },
      { code: '118834', name: 'Mirae Asset Large Cap Fund' },
      { code: '119226', name: 'Parag Parikh Long Term Equity Fund' },
      { code: '118825', name: 'UTI Nifty Fund' },
      { code: '120716', name: 'DSP Top 100 Equity Fund' },
      { code: '119551', name: 'Franklin India Bluechip Fund' }
    ];
  }

  // Calculate portfolio metrics
  static calculatePortfolioMetrics(assets: Asset[]): {
    totalValue: number;
    totalInvested: number;
    totalReturns: number;
    totalReturnsPercent: number;
    dayChange: number;
    dayChangePercent: number;
  } {
    let totalValue = 0;
    let totalInvested = 0;
    let dayChange = 0;

    assets.forEach(asset => {
      totalValue += asset.currentValue;
      totalInvested += asset.purchaseValue || 0;
      dayChange += asset.dayChange || 0;
    });

    const totalReturns = totalValue - totalInvested;
    const totalReturnsPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalReturns,
      totalReturnsPercent,
      dayChange,
      dayChangePercent
    };
  }
}

export default MarketDataService;