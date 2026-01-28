import { Asset, SIPTransaction } from '../types';
import MarketDataService from './marketDataService';

interface SIPUpdateResult {
  assetId: string;
  assetName: string;
  previousInvested: number;
  newInvested: number;
  addedAmount: number;
  previousValue: number;
  newValue: number;
  nav?: number;
  navDate?: string;
  unitsAdded?: number;
  sipTransaction?: Omit<SIPTransaction, 'id'>;
}

class SIPAutoUpdateService {
  /**
   * Check if a SIP contribution is due for this month
   * Returns true if we haven't recorded a SIP for this month yet
   */
  static isSIPDueThisMonth(asset: Asset): boolean {
    if (!asset.isSIP || !asset.sipAmount || asset.sipAmount <= 0) {
      return false;
    }

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const sipDay = asset.sipDate || 1;

    // Check if the SIP day has passed this month
    if (today.getDate() < sipDay) {
      return false;
    }

    // Check if we already have a SIP transaction for this month
    if (asset.sipTransactions && asset.sipTransactions.length > 0) {
      const hasThisMonth = asset.sipTransactions.some(tx => {
        const txDate = new Date(tx.date);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });
      if (hasThisMonth) {
        return false;
      }
    }

    // Check sipStartDate if set - don't process SIPs that haven't started yet
    if (asset.sipStartDate) {
      const startDate = new Date(asset.sipStartDate);
      if (startDate > today) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all SIP assets that need processing this month
   */
  static getSIPAssetsDue(assets: Asset[]): Asset[] {
    return assets.filter(asset =>
      asset.isSIP &&
      (asset.category === 'mutual_funds' || asset.category === 'epf') &&
      this.isSIPDueThisMonth(asset)
    );
  }

  /**
   * Process a single SIP asset - add monthly contribution and optionally fetch NAV
   */
  static async processSIPAsset(asset: Asset, fetchNav: boolean = true): Promise<SIPUpdateResult | null> {
    if (!asset.isSIP || !asset.sipAmount) {
      return null;
    }

    const today = new Date();
    const sipDay = asset.sipDate || 1;
    const sipDate = new Date(today.getFullYear(), today.getMonth(), sipDay);

    const previousInvested = asset.investedValue || 0;
    const previousValue = asset.currentValue || 0;
    const addedAmount = asset.sipAmount;
    const newInvested = previousInvested + addedAmount;

    let nav: number | undefined;
    let navDate: string | undefined;
    let newValue = previousValue + addedAmount; // Default: just add the amount
    let unitsAdded: number | undefined;

    // Try to fetch NAV for mutual funds if scheme code is available
    if (fetchNav && asset.category === 'mutual_funds' && asset.schemeCode) {
      try {
        const mfPrice = await MarketDataService.getLatestNAV(asset.schemeCode);
        if (mfPrice && mfPrice.nav > 0) {
          nav = mfPrice.nav;
          navDate = mfPrice.date;

          // Calculate units purchased with this SIP amount
          unitsAdded = addedAmount / nav;

          // Calculate new total units
          const previousUnits = asset.quantity || 0;
          const newTotalUnits = previousUnits + unitsAdded;

          // Update current value based on NAV
          newValue = newTotalUnits * nav;
        }
      } catch (error) {
        console.error(`Failed to fetch NAV for ${asset.name}:`, error);
        // Fall back to simple addition
      }
    }

    // Create SIP transaction record
    const sipTransaction: Omit<SIPTransaction, 'id'> = {
      date: sipDate.toISOString().split('T')[0],
      amount: addedAmount,
      units: unitsAdded || 0,
      nav: nav || 0,
      assetId: asset.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      assetId: asset.id,
      assetName: asset.name,
      previousInvested,
      newInvested,
      addedAmount,
      previousValue,
      newValue,
      nav,
      navDate,
      unitsAdded,
      sipTransaction,
    };
  }

  /**
   * Process all due SIP assets and return updates to apply
   */
  static async processAllDueSIPs(assets: Asset[], fetchNav: boolean = true): Promise<{
    updates: Map<string, Partial<Asset>>;
    results: SIPUpdateResult[];
  }> {
    const dueAssets = this.getSIPAssetsDue(assets);
    const updates = new Map<string, Partial<Asset>>();
    const results: SIPUpdateResult[] = [];

    console.log(`📊 Processing ${dueAssets.length} SIP assets due for this month`);

    for (const asset of dueAssets) {
      const result = await this.processSIPAsset(asset, fetchNav);
      if (result) {
        results.push(result);

        // Prepare asset update
        const existingTransactions = asset.sipTransactions || [];
        const newSipTransaction = {
          ...result.sipTransaction,
          id: `sip_${asset.id}_${Date.now()}`,
        } as SIPTransaction;

        const update: Partial<Asset> = {
          investedValue: result.newInvested,
          currentValue: result.newValue,
          sipTransactions: [...existingTransactions, newSipTransaction],
          lastPriceUpdate: new Date().toISOString(),
        };

        // Update quantity if we calculated units
        if (result.unitsAdded && result.nav) {
          const previousUnits = asset.quantity || 0;
          update.quantity = previousUnits + result.unitsAdded;
          update.marketPrice = result.nav;
          update.averagePrice = result.newInvested / (update.quantity || 1);
        }

        updates.set(asset.id, update);

        console.log(`✅ SIP processed for ${asset.name}: +₹${result.addedAmount} (Total: ₹${result.newInvested})`);
        if (result.nav) {
          console.log(`   NAV: ₹${result.nav} | Units added: ${result.unitsAdded?.toFixed(4)}`);
        }
      }
    }

    return { updates, results };
  }

  /**
   * Calculate total SIP for a month range (for historical backfill)
   */
  static calculateSIPForDateRange(
    sipAmount: number,
    sipDate: number,
    startDate: Date,
    endDate: Date = new Date()
  ): { totalAmount: number; months: number } {
    let months = 0;
    const current = new Date(startDate);
    current.setDate(sipDate);

    if (current < startDate) {
      current.setMonth(current.getMonth() + 1);
    }

    while (current <= endDate) {
      months++;
      current.setMonth(current.getMonth() + 1);
    }

    return {
      totalAmount: sipAmount * months,
      months,
    };
  }

  /**
   * Refresh NAV for all mutual fund assets (not just SIPs)
   */
  static async refreshAllMFNavs(assets: Asset[]): Promise<Map<string, Partial<Asset>>> {
    const mfAssets = assets.filter(a => a.category === 'mutual_funds' && a.schemeCode);
    const updates = new Map<string, Partial<Asset>>();

    console.log(`🔄 Refreshing NAV for ${mfAssets.length} mutual fund assets`);

    for (const asset of mfAssets) {
      try {
        const mfPrice = await MarketDataService.getLatestNAV(asset.schemeCode!);
        if (mfPrice && mfPrice.nav > 0) {
          const quantity = asset.quantity || 0;
          const newValue = quantity > 0 ? quantity * mfPrice.nav : asset.currentValue;

          updates.set(asset.id, {
            currentValue: newValue,
            marketPrice: mfPrice.nav,
            lastPriceUpdate: new Date().toISOString(),
          });

          console.log(`✅ NAV updated for ${asset.name}: ₹${mfPrice.nav}`);
        }
      } catch (error) {
        console.error(`Failed to refresh NAV for ${asset.name}:`, error);
      }
    }

    return updates;
  }
}

export default SIPAutoUpdateService;
