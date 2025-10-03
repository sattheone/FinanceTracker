import { Asset, SIPTransaction, Transaction } from '../types';

export interface CashFlow {
  date: Date;
  amount: number; // Negative for investments, positive for returns
}

export class XIRRService {
  // Calculate XIRR (Extended Internal Rate of Return)
  static calculateXIRR(cashFlows: CashFlow[], guess: number = 0.1): number | null {
    try {
      if (cashFlows.length < 2) {
        return null;
      }

      // Sort cash flows by date
      const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Use Newton-Raphson method to find XIRR
      let rate = guess;
      const maxIterations = 100;
      const tolerance = 1e-6;

      for (let i = 0; i < maxIterations; i++) {
        const { npv, derivative } = this.calculateNPVAndDerivative(sortedFlows, rate);
        
        if (Math.abs(npv) < tolerance) {
          return rate * 100; // Return as percentage
        }
        
        if (Math.abs(derivative) < tolerance) {
          break; // Avoid division by zero
        }
        
        const newRate = rate - npv / derivative;
        
        if (Math.abs(newRate - rate) < tolerance) {
          return newRate * 100; // Return as percentage
        }
        
        rate = newRate;
      }
      
      return rate * 100; // Return as percentage
    } catch (error) {
      console.error('Error calculating XIRR:', error);
      return null;
    }
  }

  // Calculate NPV and its derivative for Newton-Raphson method
  private static calculateNPVAndDerivative(cashFlows: CashFlow[], rate: number): { npv: number; derivative: number } {
    const baseDate = cashFlows[0].date;
    let npv = 0;
    let derivative = 0;

    cashFlows.forEach(flow => {
      const daysDiff = (flow.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24);
      const yearsDiff = daysDiff / 365.25;
      
      const discountFactor = Math.pow(1 + rate, yearsDiff);
      
      npv += flow.amount / discountFactor;
      derivative -= (flow.amount * yearsDiff) / Math.pow(1 + rate, yearsDiff + 1);
    });

    return { npv, derivative };
  }

  // Calculate XIRR for a specific asset
  static calculateAssetXIRR(asset: Asset, transactions: Transaction[]): number | null {
    const cashFlows: CashFlow[] = [];

    // Add purchase transactions (negative cash flows)
    const assetTransactions = transactions.filter(t => 
      t.description.toLowerCase().includes(asset.name.toLowerCase()) ||
      (asset.symbol && t.description.toLowerCase().includes(asset.symbol.toLowerCase()))
    );

    assetTransactions.forEach(transaction => {
      if (transaction.type === 'investment') {
        cashFlows.push({
          date: new Date(transaction.date),
          amount: -transaction.amount // Negative for investments
        });
      }
    });

    // Add SIP transactions if available
    if (asset.sipTransactions) {
      asset.sipTransactions.forEach(sip => {
        cashFlows.push({
          date: new Date(sip.date),
          amount: -sip.amount // Negative for investments
        });
      });
    }

    // Add current value as positive cash flow (hypothetical sale)
    cashFlows.push({
      date: new Date(),
      amount: asset.currentValue // Positive for returns
    });

    return this.calculateXIRR(cashFlows);
  }

  // Calculate SIP XIRR
  static calculateSIPXIRR(sipTransactions: SIPTransaction[], currentValue: number): number | null {
    const cashFlows: CashFlow[] = [];

    // Add all SIP investments as negative cash flows
    sipTransactions.forEach(sip => {
      cashFlows.push({
        date: new Date(sip.date),
        amount: -sip.amount
      });
    });

    // Add current value as positive cash flow
    cashFlows.push({
      date: new Date(),
      amount: currentValue
    });

    return this.calculateXIRR(cashFlows);
  }

  // Calculate portfolio XIRR
  static calculatePortfolioXIRR(assets: Asset[], transactions: Transaction[]): number | null {
    const cashFlows: CashFlow[] = [];

    // Collect all investment transactions
    const investmentTransactions = transactions.filter(t => t.type === 'investment');
    
    investmentTransactions.forEach(transaction => {
      cashFlows.push({
        date: new Date(transaction.date),
        amount: -transaction.amount
      });
    });

    // Add current portfolio value
    const totalCurrentValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    cashFlows.push({
      date: new Date(),
      amount: totalCurrentValue
    });

    return this.calculateXIRR(cashFlows);
  }

  // Calculate annualized return (simple method)
  static calculateAnnualizedReturn(
    initialValue: number,
    finalValue: number,
    startDate: Date,
    endDate: Date = new Date()
  ): number {
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / 365.25;
    
    if (years <= 0 || initialValue <= 0) {
      return 0;
    }
    
    const annualizedReturn = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
    return annualizedReturn;
  }

  // Calculate SIP returns and analytics
  static calculateSIPAnalytics(sipTransactions: SIPTransaction[], currentValue: number): {
    totalInvested: number;
    totalUnits: number;
    averageNAV: number;
    currentNAV: number;
    absoluteReturn: number;
    absoluteReturnPercent: number;
    xirr: number | null;
    monthlyReturn: number;
    yearlyProjection: number;
  } {
    const totalInvested = sipTransactions.reduce((sum, sip) => sum + sip.amount, 0);
    const totalUnits = sipTransactions.reduce((sum, sip) => sum + sip.units, 0);
    const averageNAV = totalInvested / totalUnits;
    const currentNAV = totalUnits > 0 ? currentValue / totalUnits : 0;
    
    const absoluteReturn = currentValue - totalInvested;
    const absoluteReturnPercent = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;
    
    const xirr = this.calculateSIPXIRR(sipTransactions, currentValue);
    
    // Calculate monthly return (approximate)
    const monthlyReturn = xirr ? xirr / 12 : 0;
    
    // Project yearly value based on current XIRR
    const yearlyProjection = xirr ? currentValue * (1 + xirr / 100) : currentValue;

    return {
      totalInvested,
      totalUnits,
      averageNAV,
      currentNAV,
      absoluteReturn,
      absoluteReturnPercent,
      xirr,
      monthlyReturn,
      yearlyProjection
    };
  }

  // Calculate compound annual growth rate (CAGR)
  static calculateCAGR(
    initialValue: number,
    finalValue: number,
    years: number
  ): number {
    if (years <= 0 || initialValue <= 0) {
      return 0;
    }
    
    return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
  }

  // Calculate Sharpe ratio (simplified version)
  static calculateSharpeRatio(
    portfolioReturn: number,
    riskFreeRate: number = 6, // Assuming 6% risk-free rate
    volatility: number
  ): number {
    if (volatility === 0) {
      return 0;
    }
    
    return (portfolioReturn - riskFreeRate) / volatility;
  }

  // Calculate portfolio volatility (standard deviation of returns)
  static calculateVolatility(returns: number[]): number {
    if (returns.length < 2) {
      return 0;
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }
}

export default XIRRService;