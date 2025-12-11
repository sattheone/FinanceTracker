interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: string;
}

interface MutualFundPrice {
  schemeCode: string;
  schemeName: string;
  nav: number;
  date: string;
}

class PriceService {
  // Using CORS proxy to avoid CORS issues with Yahoo Finance
  // Alternative proxies if this fails: 'https://corsproxy.io/?', 'https://api.codetabs.com/v1/proxy?quest='
  private static readonly CORS_PROXY = 'https://corsproxy.io/?';
  private static readonly YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private static readonly MF_API_BASE = 'https://api.mfapi.in/mf';

  // Enhanced cache to avoid excessive API calls
  private static priceCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly EXTENDED_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for off-market hours

  // Rate limiting
  private static lastApiCall = 0;
  private static readonly MIN_API_INTERVAL = 1000; // 1 second between API calls
  private static apiCallQueue: Array<() => Promise<any>> = [];
  private static isProcessingQueue = false;

  // Request tracking
  private static dailyRequestCount = 0;
  private static lastResetDate = new Date().toDateString();
  private static readonly DAILY_REQUEST_LIMIT = 100; // Conservative limit

  /**
   * Check if we're within daily API limits
   */
  private static checkApiLimits(): boolean {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
    }

    if (this.dailyRequestCount >= this.DAILY_REQUEST_LIMIT) {
      console.warn(`⚠️ Daily API limit reached (${this.DAILY_REQUEST_LIMIT}). Using cached data only.`);
      return false;
    }

    return true;
  }

  /**
   * Check if market is open (Indian market hours: 9:15 AM - 3:30 PM IST)
   */
  private static isMarketOpen(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;
    const marketOpen = 9 * 60 + 15; // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM

    return currentTime >= marketOpen && currentTime <= marketClose;
  }

  /**
   * Get appropriate cache duration based on market hours
   */
  private static getCacheDuration(): number {
    return this.isMarketOpen() ? this.CACHE_DURATION : this.EXTENDED_CACHE_DURATION;
  }

  /**
   * Rate-limited API call wrapper
   */
  private static async makeRateLimitedCall<T>(apiCall: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.apiCallQueue.push(async () => {
        try {
          const result = await apiCall();
          this.dailyRequestCount++;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process API call queue with rate limiting
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.apiCallQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.apiCallQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastApiCall;

      if (timeSinceLastCall < this.MIN_API_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, this.MIN_API_INTERVAL - timeSinceLastCall));
      }

      const apiCall = this.apiCallQueue.shift();
      if (apiCall) {
        this.lastApiCall = Date.now();
        await apiCall();
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get stock price from Yahoo Finance with intelligent caching and rate limiting
   * Supports Indian stocks with .NS suffix (e.g., RELIANCE.NS, TCS.NS)
   */
  static async getStockPrice(symbol: string): Promise<StockPrice | null> {
    try {
      // Add .NS suffix for Indian stocks if not present
      const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;

      // Check cache first with dynamic duration
      const cacheKey = `stock_${yahooSymbol}`;
      const cached = this.priceCache.get(cacheKey);
      const cacheDuration = this.getCacheDuration();

      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        console.log(`💾 Using cached stock price for: ${yahooSymbol}`);
        return cached.data;
      }

      // Check API limits
      if (!this.checkApiLimits()) {
        // Return cached data even if expired, or null
        if (cached) {
          console.log(`⚠️ API limit reached, using stale cache for: ${yahooSymbol}`);
          return cached.data;
        }
        return null;
      }

      console.log(`📈 Fetching stock price for: ${yahooSymbol} (${this.dailyRequestCount + 1}/${this.DAILY_REQUEST_LIMIT})`);

      const stockPrice = await this.makeRateLimitedCall(async () => {
        const apiUrl = `${this.YAHOO_FINANCE_BASE}/${yahooSymbol}?interval=1d&range=1d`;
        const proxiedUrl = `${this.CORS_PROXY}${encodeURIComponent(apiUrl)}`;
        console.log(`🔗 Fetching via proxy: ${proxiedUrl}`);
        const response = await fetch(proxiedUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.chart?.result?.[0]) {
          throw new Error('Invalid response format');
        }

        const result = data.chart.result[0];
        const meta = result.meta;
        const quote = result.indicators.quote[0];

        const currentPrice = meta.regularMarketPrice || quote.close[quote.close.length - 1];
        const previousClose = meta.previousClose;
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;

        return {
          symbol: yahooSymbol,
          price: Math.round(currentPrice * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          currency: meta.currency || 'INR',
          lastUpdated: new Date().toISOString()
        };
      });

      // Cache the result
      this.priceCache.set(cacheKey, { data: stockPrice, timestamp: Date.now() });

      console.log(`✅ Stock price fetched and cached:`, stockPrice);
      return stockPrice;

    } catch (error) {
      console.error(`❌ Error fetching stock price for ${symbol}:`, error);

      // Return cached data if available, even if expired
      const cacheKey = `stock_${symbol.includes('.') ? symbol : `${symbol}.NS`}`;
      const cached = this.priceCache.get(cacheKey);
      if (cached) {
        console.log(`🔄 Returning stale cached data for: ${symbol}`);
        return cached.data;
      }

      return null;
    }
  }

  /**
   * Get mutual fund NAV from MFApi.in with intelligent caching
   * Use scheme code (e.g., 120503 for SBI Blue Chip Fund)
   */
  static async getMutualFundPrice(schemeCode: string): Promise<MutualFundPrice | null> {
    try {
      // Check cache first - MF NAVs update once daily, so longer cache is fine
      const cacheKey = `mf_${schemeCode}`;
      const cached = this.priceCache.get(cacheKey);
      const mfCacheDuration = 24 * 60 * 60 * 1000; // 24 hours for MF NAVs

      if (cached && Date.now() - cached.timestamp < mfCacheDuration) {
        console.log(`💾 Using cached MF NAV for: ${schemeCode}`);
        return cached.data;
      }

      // Check API limits
      if (!this.checkApiLimits()) {
        if (cached) {
          console.log(`⚠️ API limit reached, using stale MF cache for: ${schemeCode}`);
          return cached.data;
        }
        return null;
      }

      console.log(`📊 Fetching MF NAV for scheme: ${schemeCode} (${this.dailyRequestCount + 1}/${this.DAILY_REQUEST_LIMIT})`);

      const mfPrice = await this.makeRateLimitedCall(async () => {
        const response = await fetch(`${this.MF_API_BASE}/${schemeCode}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
          throw new Error('No data available');
        }

        // Get the latest NAV (first item is most recent)
        const latestNav = data.data[0];

        return {
          schemeCode: schemeCode,
          schemeName: data.meta.scheme_name,
          nav: parseFloat(latestNav.nav),
          date: latestNav.date
        };
      });

      // Cache the result
      this.priceCache.set(cacheKey, { data: mfPrice, timestamp: Date.now() });

      console.log(`✅ MF NAV fetched and cached:`, mfPrice);
      return mfPrice;

    } catch (error) {
      console.error(`❌ Error fetching MF NAV for ${schemeCode}:`, error);

      // Return cached data if available, even if expired
      const cacheKey = `mf_${schemeCode}`;
      const cached = this.priceCache.get(cacheKey);
      if (cached) {
        console.log(`🔄 Returning stale cached MF data for: ${schemeCode}`);
        return cached.data;
      }

      return null;
    }
  }

  /**
   * Search for mutual fund schemes by name
   */
  static async searchMutualFunds(query: string): Promise<any[]> {
    try {
      console.log(`🔍 Searching MF schemes for: ${query}`);

      // This is a mock implementation - in reality, you'd need a search API
      // For now, return some popular Indian MF schemes
      const popularSchemes = [
        { schemeCode: '120503', schemeName: 'SBI Blue Chip Fund - Direct Plan - Growth' },
        { schemeCode: '120305', schemeName: 'SBI Large & Midcap Fund - Direct Plan - Growth' },
        { schemeCode: '119551', schemeName: 'HDFC Top 100 Fund - Direct Plan - Growth' },
        { schemeCode: '120716', schemeName: 'Axis Bluechip Fund - Direct Plan - Growth' },
        { schemeCode: '125497', schemeName: 'Mirae Asset Large Cap Fund - Direct Plan - Growth' },
        { schemeCode: '118989', schemeName: 'ICICI Prudential Bluechip Fund - Direct Plan - Growth' },
        { schemeCode: '120503', schemeName: 'Kotak Standard Multicap Fund - Direct Plan - Growth' },
        { schemeCode: '119226', schemeName: 'UTI Nifty Fund - Direct Plan - Growth' }
      ];

      return popularSchemes.filter(scheme =>
        scheme.schemeName.toLowerCase().includes(query.toLowerCase())
      );

    } catch (error) {
      console.error(`❌ Error searching MF schemes:`, error);
      return [];
    }
  }

  /**
   * Get multiple stock prices in batch
   */
  static async getBatchStockPrices(symbols: string[]): Promise<(StockPrice | null)[]> {
    console.log(`📈 Fetching batch stock prices for: ${symbols.join(', ')}`);

    const promises = symbols.map(symbol => this.getStockPrice(symbol));
    const results = await Promise.allSettled(promises);

    return results.map(result =>
      result.status === 'fulfilled' ? result.value : null
    );
  }

  /**
   * Get popular Indian stock symbols with their display names
   */
  static getPopularIndianStocks(): { symbol: string; name: string; sector: string }[] {
    return [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Oil & Gas' },
      { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking' },
      { symbol: 'INFY.NS', name: 'Infosys', sector: 'IT' },
      { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking' },
      { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Banking' },
      { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
      { symbol: 'ITC.NS', name: 'ITC Limited', sector: 'FMCG' },
      { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking' },
      { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'Construction' },
      { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'Paints' },
      { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Automobile' },
      { symbol: 'TITAN.NS', name: 'Titan Company', sector: 'Jewellery' },
      { symbol: 'WIPRO.NS', name: 'Wipro', sector: 'IT' }
    ];
  }

  /**
   * Clear price cache
   */
  static clearCache(): void {
    this.priceCache.clear();
    console.log('🗑️ Price cache cleared');
  }

  /**
   * Get cache statistics and API usage info
   */
  static getCacheStats(): {
    size: number;
    keys: string[];
    dailyRequests: number;
    remainingRequests: number;
    marketOpen: boolean;
  } {
    return {
      size: this.priceCache.size,
      keys: Array.from(this.priceCache.keys()),
      dailyRequests: this.dailyRequestCount,
      remainingRequests: Math.max(0, this.DAILY_REQUEST_LIMIT - this.dailyRequestCount),
      marketOpen: this.isMarketOpen()
    };
  }

  /**
   * Preload prices for multiple assets efficiently
   */
  static async preloadPrices(assets: Array<{ symbol?: string; schemeCode?: string; category: string }>): Promise<void> {
    if (!this.checkApiLimits()) {
      console.log('⚠️ API limit reached, skipping preload');
      return;
    }

    const stockSymbols = assets
      .filter(asset => asset.category === 'stocks' && asset.symbol)
      .map(asset => asset.symbol!)
      .slice(0, Math.min(10, this.DAILY_REQUEST_LIMIT - this.dailyRequestCount)); // Limit batch size

    const mfCodes = assets
      .filter(asset => asset.category === 'mutual_funds' && asset.schemeCode)
      .map(asset => asset.schemeCode!)
      .slice(0, Math.min(5, this.DAILY_REQUEST_LIMIT - this.dailyRequestCount - stockSymbols.length));

    console.log(`🔄 Preloading prices for ${stockSymbols.length} stocks and ${mfCodes.length} MFs`);

    // Batch load stocks
    if (stockSymbols.length > 0) {
      const stockPromises = stockSymbols.map(symbol =>
        this.getStockPrice(symbol).catch(error => {
          console.warn(`Failed to preload ${symbol}:`, error);
          return null;
        })
      );
      await Promise.allSettled(stockPromises);
    }

    // Batch load MFs
    if (mfCodes.length > 0) {
      const mfPromises = mfCodes.map(code =>
        this.getMutualFundPrice(code).catch(error => {
          console.warn(`Failed to preload MF ${code}:`, error);
          return null;
        })
      );
      await Promise.allSettled(mfPromises);
    }

    console.log(`✅ Preload completed. API calls used: ${this.dailyRequestCount}/${this.DAILY_REQUEST_LIMIT}`);
  }

  /**
   * Smart refresh - only refresh prices that are likely to have changed
   */
  static async smartRefresh(assets: Array<{ symbol?: string; schemeCode?: string; category: string; lastPriceUpdate?: string }>): Promise<void> {
    if (!this.checkApiLimits()) {
      console.log('⚠️ API limit reached, skipping smart refresh');
      return;
    }

    const now = Date.now();
    const refreshThreshold = this.isMarketOpen() ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 min during market, 1 hour off-market

    const assetsToRefresh = assets.filter(asset => {
      if (!asset.lastPriceUpdate) return true;
      const lastUpdate = new Date(asset.lastPriceUpdate).getTime();
      return now - lastUpdate > refreshThreshold;
    });

    if (assetsToRefresh.length === 0) {
      console.log('📊 All prices are fresh, no refresh needed');
      return;
    }

    console.log(`🔄 Smart refresh for ${assetsToRefresh.length} assets`);
    await this.preloadPrices(assetsToRefresh);
  }
}

export default PriceService;
export type { StockPrice, MutualFundPrice };