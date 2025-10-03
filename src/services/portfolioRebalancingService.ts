import { Asset } from '../types';

export interface RebalancingTarget {
  category: string;
  targetPercentage: number;
  currentPercentage: number;
  targetValue: number;
  currentValue: number;
  difference: number;
  action: 'buy' | 'sell' | 'hold';
  priority: 'high' | 'medium' | 'low';
}

export interface RebalancingSuggestion {
  asset: Asset;
  action: 'buy' | 'sell' | 'hold';
  amount: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  impact: number; // Expected impact on portfolio balance
}

export interface PortfolioAllocation {
  category: string;
  currentValue: number;
  currentPercentage: number;
  targetPercentage: number;
  deviation: number;
  assets: Asset[];
}

export class PortfolioRebalancingService {
  // Default target allocations based on age and risk profile
  static getDefaultTargetAllocations(age: number, riskProfile: 'conservative' | 'moderate' | 'aggressive'): Record<string, number> {
    const equityPercentage = Math.max(100 - age, 30); // Rule of thumb: 100 - age for equity
    
    switch (riskProfile) {
      case 'conservative':
        return {
          'stocks': Math.max(equityPercentage - 20, 20),
          'mutual_funds': Math.max(equityPercentage - 10, 30),
          'fixed_deposit': 25,
          'gold': 10,
          'cash': 10,
          'other': 5
        };
      
      case 'moderate':
        return {
          'stocks': equityPercentage * 0.4,
          'mutual_funds': equityPercentage * 0.6,
          'fixed_deposit': 20,
          'gold': 10,
          'cash': 5,
          'other': 5
        };
      
      case 'aggressive':
        return {
          'stocks': equityPercentage * 0.6,
          'mutual_funds': equityPercentage * 0.4,
          'fixed_deposit': 10,
          'gold': 5,
          'cash': 5,
          'other': 5
        };
      
      default:
        return this.getDefaultTargetAllocations(age, 'moderate');
    }
  }

  // Calculate current portfolio allocation
  static calculateCurrentAllocation(assets: Asset[]): PortfolioAllocation[] {
    const totalValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    
    // Group assets by category
    const categoryGroups = assets.reduce((groups, asset) => {
      if (!groups[asset.category]) {
        groups[asset.category] = [];
      }
      groups[asset.category].push(asset);
      return groups;
    }, {} as Record<string, Asset[]>);

    // Calculate allocation for each category
    return Object.entries(categoryGroups).map(([category, categoryAssets]) => {
      const currentValue = categoryAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
      const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
      
      return {
        category,
        currentValue,
        currentPercentage,
        targetPercentage: 0, // Will be set based on target allocations
        deviation: 0, // Will be calculated after setting target
        assets: categoryAssets
      };
    });
  }

  // Generate rebalancing suggestions
  static generateRebalancingSuggestions(
    assets: Asset[],
    targetAllocations: Record<string, number>,
    rebalanceThreshold: number = 5 // Percentage threshold for rebalancing
  ): {
    suggestions: RebalancingSuggestion[];
    targets: RebalancingTarget[];
    isRebalanceNeeded: boolean;
    totalPortfolioValue: number;
  } {
    const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const currentAllocations = this.calculateCurrentAllocation(assets);
    
    // Calculate targets and deviations
    const targets: RebalancingTarget[] = Object.entries(targetAllocations).map(([category, targetPercentage]) => {
      const currentAllocation = currentAllocations.find(alloc => alloc.category === category);
      const currentValue = currentAllocation?.currentValue || 0;
      const currentPercentage = currentAllocation?.currentPercentage || 0;
      const targetValue = (targetPercentage / 100) * totalPortfolioValue;
      const difference = targetValue - currentValue;
      
      let action: 'buy' | 'sell' | 'hold' = 'hold';
      let priority: 'high' | 'medium' | 'low' = 'low';
      
      const deviation = Math.abs(currentPercentage - targetPercentage);
      
      if (deviation > rebalanceThreshold * 2) {
        priority = 'high';
        action = difference > 0 ? 'buy' : 'sell';
      } else if (deviation > rebalanceThreshold) {
        priority = 'medium';
        action = difference > 0 ? 'buy' : 'sell';
      }

      return {
        category,
        targetPercentage,
        currentPercentage,
        targetValue,
        currentValue,
        difference,
        action,
        priority
      };
    });

    // Generate specific asset suggestions
    const suggestions: RebalancingSuggestion[] = [];
    
    targets.forEach(target => {
      if (target.action === 'hold') return;
      
      const categoryAssets = assets.filter(asset => asset.category === target.category);
      
      if (target.action === 'buy' && target.difference > 0) {
        // Suggest buying more of the best performing asset in this category
        const bestAsset = this.findBestPerformingAsset(categoryAssets);
        if (bestAsset) {
          suggestions.push({
            asset: bestAsset,
            action: 'buy',
            amount: target.difference,
            reason: `Increase ${target.category} allocation from ${target.currentPercentage.toFixed(1)}% to ${target.targetPercentage}%`,
            priority: target.priority,
            impact: Math.abs(target.difference) / totalPortfolioValue * 100
          });
        }
      } else if (target.action === 'sell' && target.difference < 0) {
        // Suggest selling from the worst performing asset in this category
        const worstAsset = this.findWorstPerformingAsset(categoryAssets);
        if (worstAsset) {
          suggestions.push({
            asset: worstAsset,
            action: 'sell',
            amount: Math.abs(target.difference),
            reason: `Reduce ${target.category} allocation from ${target.currentPercentage.toFixed(1)}% to ${target.targetPercentage}%`,
            priority: target.priority,
            impact: Math.abs(target.difference) / totalPortfolioValue * 100
          });
        }
      }
    });

    // Sort suggestions by priority and impact
    suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.impact - a.impact;
    });

    const isRebalanceNeeded = targets.some(target => target.priority !== 'low');

    return {
      suggestions,
      targets,
      isRebalanceNeeded,
      totalPortfolioValue
    };
  }

  // Find best performing asset in a category
  private static findBestPerformingAsset(assets: Asset[]): Asset | null {
    if (assets.length === 0) return null;
    
    return assets.reduce((best, current) => {
      const bestReturn = this.calculateAssetReturn(best);
      const currentReturn = this.calculateAssetReturn(current);
      return currentReturn > bestReturn ? current : best;
    });
  }

  // Find worst performing asset in a category
  private static findWorstPerformingAsset(assets: Asset[]): Asset | null {
    if (assets.length === 0) return null;
    
    return assets.reduce((worst, current) => {
      const worstReturn = this.calculateAssetReturn(worst);
      const currentReturn = this.calculateAssetReturn(current);
      return currentReturn < worstReturn ? current : worst;
    });
  }

  // Calculate asset return percentage
  private static calculateAssetReturn(asset: Asset): number {
    if (!asset.purchaseValue || asset.purchaseValue === 0) return 0;
    return ((asset.currentValue - asset.purchaseValue) / asset.purchaseValue) * 100;
  }

  // Calculate portfolio diversification score
  static calculateDiversificationScore(assets: Asset[]): {
    score: number; // 0-100
    analysis: string;
    recommendations: string[];
  } {
    const allocations = this.calculateCurrentAllocation(assets);
    const totalValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    
    let score = 0;
    const recommendations: string[] = [];
    
    // Check category diversification
    const categoryCount = allocations.length;
    if (categoryCount >= 5) {
      score += 30;
    } else if (categoryCount >= 3) {
      score += 20;
    } else {
      score += 10;
      recommendations.push('Consider diversifying across more asset categories');
    }
    
    // Check concentration risk
    const maxAllocation = Math.max(...allocations.map(alloc => alloc.currentPercentage));
    if (maxAllocation < 50) {
      score += 25;
    } else if (maxAllocation < 70) {
      score += 15;
    } else {
      score += 5;
      recommendations.push('Reduce concentration in single asset category');
    }
    
    // Check equity vs debt balance
    const equityCategories = ['stocks', 'mutual_funds'];
    const equityAllocation = allocations
      .filter(alloc => equityCategories.includes(alloc.category))
      .reduce((sum, alloc) => sum + alloc.currentPercentage, 0);
    
    if (equityAllocation >= 40 && equityAllocation <= 80) {
      score += 25;
    } else if (equityAllocation >= 30 && equityAllocation <= 90) {
      score += 15;
    } else {
      score += 5;
      if (equityAllocation < 30) {
        recommendations.push('Consider increasing equity allocation for better growth');
      } else {
        recommendations.push('Consider reducing equity allocation to manage risk');
      }
    }
    
    // Check individual asset concentration
    const largestAsset = Math.max(...assets.map(asset => (asset.currentValue / totalValue) * 100));
    if (largestAsset < 20) {
      score += 20;
    } else if (largestAsset < 30) {
      score += 10;
    } else {
      recommendations.push('Consider reducing concentration in individual assets');
    }
    
    let analysis = '';
    if (score >= 80) {
      analysis = 'Excellent diversification with well-balanced portfolio';
    } else if (score >= 60) {
      analysis = 'Good diversification with minor improvements needed';
    } else if (score >= 40) {
      analysis = 'Moderate diversification with several areas for improvement';
    } else {
      analysis = 'Poor diversification with significant concentration risk';
    }
    
    return { score, analysis, recommendations };
  }

  // Calculate optimal SIP allocation
  static calculateOptimalSIPAllocation(
    monthlyAmount: number,
    currentAssets: Asset[],
    targetAllocations: Record<string, number>
  ): Record<string, number> {
    // const totalPortfolioValue = currentAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const currentAllocations = this.calculateCurrentAllocation(currentAssets);
    
    const sipAllocations: Record<string, number> = {};
    
    // Calculate how much each category is under-allocated
    Object.entries(targetAllocations).forEach(([category, targetPercentage]) => {
      const currentAllocation = currentAllocations.find(alloc => alloc.category === category);
      const currentPercentage = currentAllocation?.currentPercentage || 0;
      const deviation = targetPercentage - currentPercentage;
      
      if (deviation > 0) {
        // Category is under-allocated, allocate more SIP here
        sipAllocations[category] = (deviation / 100) * monthlyAmount;
      }
    });
    
    // Normalize allocations to match monthly amount
    const totalAllocated = Object.values(sipAllocations).reduce((sum, amount) => sum + amount, 0);
    
    if (totalAllocated > 0) {
      const scaleFactor = monthlyAmount / totalAllocated;
      Object.keys(sipAllocations).forEach(category => {
        sipAllocations[category] *= scaleFactor;
      });
    } else {
      // If no under-allocation, distribute based on target percentages
      Object.entries(targetAllocations).forEach(([category, targetPercentage]) => {
        sipAllocations[category] = (targetPercentage / 100) * monthlyAmount;
      });
    }
    
    return sipAllocations;
  }
}

export default PortfolioRebalancingService;