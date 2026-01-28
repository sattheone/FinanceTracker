import { Asset } from '../types';
import fallbackStocks from '../data/fallbackStocks.json';
import fallbackMFs from '../data/fallbackMFs.json';
import axios from 'axios';
import Papa from 'papaparse';

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdTU-5-4ckmOAbSRo2cpJKWtCji1hG_h-KQpQq-hroRYuhA7rr-ZylSgEY-bXTeN6HUw23sFCbxKHQ/pub?gid=0&single=true&output=csv";

// Interfaces for our internal usage
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  currency: string;
  prevClose: number;
}

export interface MutualFundData {
  schemeCode: string;
  schemeName: string;
  nav: number;
  date: string;
}

// Map structures for O(1) lookups
type StockPriceMap = Map<string, MarketData>;
type MFPriceMap = Map<string, MutualFundData>;

export class MarketDataService {
  private static readonly STORAGE_KEY_STOCKS = 'bhavcopy_cache';
  private static readonly STORAGE_KEY_MF = 'amfi_nav_cache';
  private static readonly CACHE_DATE_KEY = 'market_data_date';

  // In-memory cache
  private static stockCache: StockPriceMap | null = null;
  private static mfCache: MFPriceMap | null = null;

  // --- PUBLIC API ---

  static async searchStocks(query: string): Promise<Array<{ symbol: string, price: number, name: string }>> {
    if (!query || query.length < 2) return [];
    const map = await this.getOrFetchStockPrices();
    const upperQuery = query.toUpperCase();

    const results: Array<{ symbol: string, price: number, name: string }> = [];
    let count = 0;

    for (const [symbol, data] of map.entries()) {
      if (symbol.includes(upperQuery)) {
        results.push({ symbol, price: data.price, name: symbol });
        count++;
        if (count >= 10) break;
      }
    }
    return results;
  }

  static async searchMutualFunds(query: string): Promise<Array<{ code: string, name: string, nav: number }>> {
    if (!query || query.length < 2) return [];
    const map = await this.getOrFetchMFPrices();
    const lowerQuery = query.toLowerCase();

    const results: Array<{ code: string, name: string, nav: number }> = [];
    let count = 0;

    for (const data of map.values()) {
      if (data.schemeName.toLowerCase().includes(lowerQuery)) {
        results.push({ code: data.schemeCode, name: data.schemeName, nav: data.nav });
        count++;
        if (count >= 10) break;
      }
    }
    return results;
  }

  static async updatePortfolioValues(assets: Asset[]): Promise<Asset[]> {
    try {
      const stockMap = await this.getOrFetchStockPrices();
      const mfMap = await this.getOrFetchMFPrices();

      return assets.map(asset => {
        if (asset.category === 'stocks' && asset.symbol) {
          const data = stockMap.get(asset.symbol.toUpperCase());
          if (data) {
            return {
              ...asset,
              marketPrice: data.price,
              dayChange: data.change,
              dayChangePercent: data.changePercent,
              currentValue: (asset.quantity || 0) * data.price,
              lastUpdated: data.lastUpdated
            };
          }
        }
        if (asset.category === 'mutual_funds' && asset.schemeCode) {
          const data = mfMap.get(asset.schemeCode);
          if (data) {
            return {
              ...asset,
              marketPrice: data.nav,
              currentValue: (asset.quantity || 0) * data.nav,
              lastUpdated: data.date
            };
          }
        }
        return asset;
      });
    } catch (error) {
      console.error("Failed to update portfolio values:", error);
      return assets;
    }
  }

  static clearCache() {
    localStorage.removeItem(this.STORAGE_KEY_STOCKS);
    localStorage.removeItem(this.STORAGE_KEY_MF);
    localStorage.removeItem(this.CACHE_DATE_KEY);
    this.stockCache = null;
    this.mfCache = null;
    console.log("Market data cache cleared.");
  }

  static async refreshAll() {
    this.clearCache();
    await this.getOrFetchStockPrices();
    await this.getOrFetchMFPrices();
  }

  static async getLatestNAV(schemeCode: string): Promise<MutualFundData | null> {
    try {
      const map = await this.getOrFetchMFPrices();
      return map.get(schemeCode) || null;
    } catch (e) {
      return null;
    }
  }

  static calculatePortfolioMetrics(assets: Asset[]) {
    let totalValue = 0;
    let totalInvested = 0;
    let dayChange = 0;

    assets.forEach(asset => {
      totalValue += asset.currentValue;
      totalInvested += (asset.investedValue || asset.purchaseValue || 0);
      dayChange += asset.dayChange || 0;
    });

    const totalReturns = totalValue - totalInvested;
    const totalReturnsPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
    const prevDayValue = totalValue - dayChange;
    const dayChangePercent = prevDayValue > 0 ? (dayChange / prevDayValue) * 100 : 0;

    return { totalValue, totalInvested, totalReturns, totalReturnsPercent, dayChange, dayChangePercent };
  }

  static getAllCachedStocks(): Array<{ symbol: string, price: number, name: string, change: number, changePercent: number }> {
    const map = this.stockCache || this.loadFromCache<StockPriceMap>(this.STORAGE_KEY_STOCKS) || new Map();
    return Array.from(map.values()).map(d => ({
      symbol: d.symbol,
      name: d.symbol,
      price: d.price,
      change: d.change,
      changePercent: d.changePercent
    }));
  }

  static getAllCachedMFs(): Array<{ code: string, name: string, nav: number, date: string }> {
    const map = this.mfCache || this.loadFromCache<MFPriceMap>(this.STORAGE_KEY_MF) || new Map();
    return Array.from(map.values()).map(d => ({
      code: d.schemeCode,
      name: d.schemeName,
      nav: d.nav,
      date: d.date
    }));
  }

  static getCacheStatus() {
    const stockMap = this.stockCache || this.loadFromCache<StockPriceMap>(this.STORAGE_KEY_STOCKS);
    const mfMap = this.mfCache || this.loadFromCache<MFPriceMap>(this.STORAGE_KEY_MF);
    const date = localStorage.getItem(this.CACHE_DATE_KEY);

    return {
      stocks: {
        available: !!stockMap && stockMap.size > 0,
        count: stockMap ? stockMap.size : 0,
        date: date || 'Never',
        status: !!stockMap && stockMap.size > 0 ? 'success' as const : 'error' as const
      },
      mfs: {
        available: !!mfMap && mfMap.size > 0,
        count: mfMap ? mfMap.size : 0,
        date: date || 'Never',
        status: !!mfMap && mfMap.size > 0 ? 'success' as const : 'error' as const
      }
    };
  }

  // --- INTERNAL FETCHING LOGIC ---

  private static async getOrFetchStockPrices(): Promise<StockPriceMap> {
    if (this.stockCache && this.stockCache.size > 0) return this.stockCache;

    const cached = this.loadFromCache<StockPriceMap>(this.STORAGE_KEY_STOCKS);
    if (cached && cached.size > 0) {
      this.stockCache = cached;
      return cached;
    }

    console.log("Fetching fresh NSE Data via Cloud Function...");
    const map = await this.fetchNSEBhavcopy();

    if (map.size > 0) {
      this.stockCache = map;
      this.saveToCache(this.STORAGE_KEY_STOCKS, map);
    } else {
      // Fallback to static JSON if cloud fails
      console.warn("Cloud fetch failed/empty. Using static fallback.");
      this.loadFallbackStocks(map);
      // Update cache with fallback data
      this.stockCache = map;
      this.saveToCache(this.STORAGE_KEY_STOCKS, map);
    }
    return map;
  }

  private static async getOrFetchMFPrices(): Promise<MFPriceMap> {
    if (this.mfCache && this.mfCache.size > 0) return this.mfCache;

    const cached = this.loadFromCache<MFPriceMap>(this.STORAGE_KEY_MF);
    if (cached && cached.size > 0) {
      this.mfCache = cached;
      return cached;
    }

    console.log("Fetching fresh AMFI NAV data...");
    const map = await this.fetchAMFINAVs();

    if (map.size > 0) {
      this.mfCache = map;
      this.saveToCache(this.STORAGE_KEY_MF, map);
    } else {
      console.warn("AMFI fetch failed. Using static fallback.");
      this.loadFallbackMFs(map);
    }
    return map;
  }

  // --- CLOUD FUNCTION: NSE ---

  // --- GOOGLE SHEETS FETCH (NSE) ---

  private static async fetchNSEBhavcopy(): Promise<StockPriceMap> {
    const map = new Map<string, MarketData>();
    console.log("Fetching live prices from Google Sheets Bridge...");

    try {
      // Fetch CSV from Google Sheets (CORS friendly)
      const response = await axios.get(GOOGLE_SHEET_URL);

      // Parse CSV
      const parsed = Papa.parse(response.data, {
        header: false,
        skipEmptyLines: true
      });

      // Assuming: Column A [0]=Symbol, Column B [1]=Price
      // Update: User said "Replace your entire logic".

      if (parsed.data && Array.isArray(parsed.data)) {
        const dateStr = new Date().toISOString().split('T')[0];
        console.log(`✅ Loaded ${parsed.data.length} rows from Sheets`);

        parsed.data.forEach((row: any) => {
          const symbol = row[0];
          const price = parseFloat(row[1]);
          const changePercent = parseFloat(row[2]) || 0;

          if (symbol && !isNaN(price) && price > 0) {
            // Back-calculate change and prevClose from percentage
            // Price = Prev * (1 + pct/100) -> Prev = Price / (1 + pct/100)
            const prevClose = price / (1 + (changePercent / 100));
            const change = price - prevClose;

            map.set(symbol, {
              symbol: symbol,
              price: price,
              change: change,
              changePercent: changePercent,
              lastUpdated: dateStr,
              currency: 'INR',
              prevClose: prevClose
            });
          }
        });
      }
    } catch (e) {
      console.error("Failed to fetch from Google Sheets:", e);
    }
    return map;
  }

  // --- AMFI FETCH (Text) ---

  private static async fetchAMFINAVs(): Promise<MFPriceMap> {
    const map = new Map<string, MutualFundData>();
    // Priority: Local Proxy (requires server restart) -> Fallback Static
    const proxies = ['/api/amfi/spages/NAVOpen.txt'];
    // const targetUrl = 'https://www.amfiindia.com/spages/NAVOpen.txt';

    for (const proxyBase of proxies) {
      try {
        let url = proxyBase;
        // If we were adding more proxies, we'd format them here.
        // But requested to remove "proxy maze". Keeping only Local Proxy.

        const response = await fetch(url);
        if (!response.ok) continue;

        const text = await response.text();
        if (text.includes('<!DOCTYPE html>')) continue;

        const lines = text.split('\n');
        lines.forEach(line => {
          const parts = line.split(';');
          if (parts.length >= 6) {
            const schemeCode = parts[0].trim();
            if (isNaN(Number(schemeCode))) return;

            const nav = parseFloat(parts[4]);
            const date = parts[5].trim();
            const schemeName = parts[3].trim();

            if (!isNaN(nav)) {
              map.set(schemeCode, { schemeCode, schemeName, nav, date });
            }
          }
        });

        if (map.size > 0) return map;
      } catch (e) {
        console.error("Error fetching AMFI data:", e);
      }
    }
    return map;
  }

  // --- STATIC FALLBACKS ---

  private static loadFallbackStocks(map: Map<string, MarketData>) {
    fallbackStocks.forEach((item: any) => {
      map.set(item.symbol, {
        symbol: item.symbol,
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        lastUpdated: item.lastUpdated,
        currency: item.currency,
        prevClose: item.prevClose
      });
    });
    console.log(`Loaded ${fallbackStocks.length} static fallback stocks`);
  }

  private static loadFallbackMFs(map: Map<string, MutualFundData>) {
    fallbackMFs.forEach((item: any) => {
      map.set(item.schemeCode, {
        schemeCode: item.schemeCode,
        schemeName: item.schemeName,
        nav: item.nav,
        date: item.date
      });
    });
    console.log(`Loaded ${fallbackMFs.length} static fallback MFs`);
  }

  // --- CACHE UTILS ---

  private static saveToCache(key: string, map: Map<string, any>) {
    try {
      const entries = Array.from(map.entries());
      localStorage.setItem(key, JSON.stringify(entries));
      localStorage.setItem(this.CACHE_DATE_KEY, new Date().toISOString().split('T')[0]);
    } catch (e) {
      console.warn("Storage quota exceeded", e);
    }
  }

  private static loadFromCache<T extends Map<string, any>>(key: string): T | null {
    try {
      const cacheDate = localStorage.getItem(this.CACHE_DATE_KEY);
      const today = new Date().toISOString().split('T')[0];
      if (cacheDate !== today) return null;

      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const entries = JSON.parse(stored);
      if (!entries || entries.length === 0) return null;

      return new Map(entries) as T;
    } catch (e) {
      return null;
    }
  }
}

export default MarketDataService;