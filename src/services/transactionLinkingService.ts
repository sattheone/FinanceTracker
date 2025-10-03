import { 
  Transaction, 
  TransactionEntityLink, 
  LinkingRule, 
  LinkingCondition, 

  EntityProgress,
  EntityHierarchy,
  LinkingNotification,
  Goal,
  Insurance,
  Asset,
  MonthlyBudget
} from '../types';

export class TransactionLinkingService {
  private static instance: TransactionLinkingService;
  private linkingRules: LinkingRule[] = [];
  private notifications: LinkingNotification[] = [];

  static getInstance(): TransactionLinkingService {
    if (!TransactionLinkingService.instance) {
      TransactionLinkingService.instance = new TransactionLinkingService();
    }
    return TransactionLinkingService.instance;
  }

  // Auto-linking System
  async autoLinkTransaction(
    transaction: Transaction,
    entities: { goals: Goal[]; insurance: Insurance[]; assets: Asset[]; budget: MonthlyBudget }
  ): Promise<TransactionEntityLink[]> {
    console.log('🔗 Auto-linking transaction:', transaction.description, transaction.amount);
    
    const links: TransactionEntityLink[] = [];
    const applicableRules = this.getApplicableRules(transaction);
    
    for (const rule of applicableRules) {
      const ruleLinks = await this.applyRule(transaction, rule, entities);
      links.push(...ruleLinks);
      
      // Update rule statistics
      rule.lastTriggered = new Date().toISOString();
      rule.triggerCount++;
    }

    // If no rules matched, try intelligent suggestions
    if (links.length === 0) {
      const suggestedLinks = await this.generateIntelligentSuggestions(transaction, entities);
      links.push(...suggestedLinks);
    }

    console.log(`✅ Generated ${links.length} auto-links for transaction`);
    return links;
  }

  private getApplicableRules(transaction: Transaction): LinkingRule[] {
    return this.linkingRules
      .filter(rule => rule.isActive)
      .filter(rule => this.evaluateRuleConditions(transaction, rule.conditions))
      .sort((a, b) => b.priority - a.priority);
  }

  private evaluateRuleConditions(transaction: Transaction, conditions: LinkingCondition[]): boolean {
    return conditions.every(condition => this.evaluateCondition(transaction, condition));
  }

  private evaluateCondition(transaction: Transaction, condition: LinkingCondition): boolean {
    let fieldValue: any;
    
    switch (condition.field) {
      case 'amount':
        fieldValue = transaction.amount;
        break;
      case 'description':
        fieldValue = transaction.description;
        break;
      case 'category':
        fieldValue = transaction.category;
        break;
      case 'type':
        fieldValue = transaction.type;
        break;
      case 'bankAccount':
        fieldValue = transaction.bankAccountId || '';
        break;
      case 'paymentMethod':
        fieldValue = transaction.paymentMethod || '';
        break;
      default:
        return false;
    }

    return this.evaluateOperator(fieldValue, condition.operator, condition.value, condition.secondValue, condition.caseSensitive);
  }

  private evaluateOperator(
    fieldValue: any, 
    operator: string, 
    value: string | number, 
    secondValue?: string | number,
    caseSensitive = false
  ): boolean {
    if (typeof fieldValue === 'string' && typeof value === 'string' && !caseSensitive) {
      fieldValue = fieldValue.toLowerCase();
      value = value.toLowerCase();
    }

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value as string);
      case 'startsWith':
        return typeof fieldValue === 'string' && fieldValue.startsWith(value as string);
      case 'endsWith':
        return typeof fieldValue === 'string' && fieldValue.endsWith(value as string);
      case 'greaterThan':
        return typeof fieldValue === 'number' && fieldValue > (value as number);
      case 'lessThan':
        return typeof fieldValue === 'number' && fieldValue < (value as number);
      case 'between':
        return typeof fieldValue === 'number' && 
               fieldValue >= (value as number) && 
               fieldValue <= (secondValue as number);
      case 'regex':
        try {
          const regex = new RegExp(value as string, caseSensitive ? 'g' : 'gi');
          return regex.test(fieldValue as string);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private async applyRule(
    transaction: Transaction,
    rule: LinkingRule,
    entities: { goals: Goal[]; insurance: Insurance[]; assets: Asset[]; budget: MonthlyBudget }
  ): Promise<TransactionEntityLink[]> {
    const links: TransactionEntityLink[] = [];
    let remainingAmount = transaction.amount;

    for (const action of rule.actions) {
      const entity = this.findEntity(action.entityId, action.entityType, entities);
      if (!entity) continue;

      let linkAmount = 0;
      
      switch (action.allocationMethod) {
        case 'fixed_amount':
          linkAmount = Math.min(action.amount || 0, remainingAmount);
          break;
        case 'percentage':
          linkAmount = (transaction.amount * (action.percentage || 0)) / 100;
          break;
        case 'remaining_amount':
          linkAmount = remainingAmount;
          break;
      }

      if (linkAmount > 0) {
        const link: TransactionEntityLink = {
          id: this.generateId(),
          transactionId: transaction.id,
          entityType: action.entityType,
          entityId: action.entityId,
          entityName: this.getEntityName(entity, action.entityType),
          amount: linkAmount,
          percentage: (linkAmount / transaction.amount) * 100,
          linkType: 'rule-based',
          ruleId: rule.id,
          notes: action.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        links.push(link);
        remainingAmount -= linkAmount;

        // Create notification for rule trigger
        this.createNotification({
          type: 'rule_triggered',
          title: `Rule Applied: ${rule.name}`,
          message: `₹${linkAmount.toLocaleString()} linked to ${link.entityName}`,
          entityType: action.entityType,
          entityId: action.entityId,
          transactionId: transaction.id
        });
      }
    }

    return links;
  }

  private async generateIntelligentSuggestions(
    transaction: Transaction,
    entities: { goals: Goal[]; insurance: Insurance[]; assets: Asset[]; budget: MonthlyBudget }
  ): Promise<TransactionEntityLink[]> {
    const suggestions: TransactionEntityLink[] = [];
    
    // Smart matching based on transaction patterns
    const keywords = this.extractKeywords(transaction.description);
    
    // Match with goals
    for (const goal of entities.goals) {
      const confidence = this.calculateMatchingConfidence(keywords, goal.name, goal.category);
      if (confidence > 0.6) {
        suggestions.push(this.createSuggestionLink(transaction, 'goal', goal.id, goal.name, confidence));
      }
    }

    // Match with insurance
    for (const insurance of entities.insurance) {
      const confidence = this.calculateMatchingConfidence(keywords, insurance.policyName, insurance.type);
      if (confidence > 0.6) {
        suggestions.push(this.createSuggestionLink(transaction, 'insurance', insurance.id, insurance.policyName, confidence));
      }
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private calculateMatchingConfidence(keywords: string[], entityName: string, entityCategory: string): number {
    const entityWords = [...this.extractKeywords(entityName), ...this.extractKeywords(entityCategory)];
    const matches = keywords.filter(keyword => 
      entityWords.some(entityWord => entityWord.includes(keyword) || keyword.includes(entityWord))
    );
    
    return matches.length / Math.max(keywords.length, entityWords.length);
  }

  private createSuggestionLink(
    transaction: Transaction,
    entityType: string,
    entityId: string,
    entityName: string,
    confidence: number
  ): TransactionEntityLink {
    return {
      id: this.generateId(),
      transactionId: transaction.id,
      entityType: entityType as any,
      entityId,
      entityName,
      amount: transaction.amount,
      percentage: 100,
      linkType: 'auto',
      notes: `Auto-suggested (${Math.round(confidence * 100)}% confidence)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Manual Linking
  async createManualLink(
    transactionId: string,
    entityType: string,
    entityId: string,
    entityName: string,
    amount: number,
    notes?: string
  ): Promise<TransactionEntityLink> {
    const link: TransactionEntityLink = {
      id: this.generateId(),
      transactionId,
      entityType: entityType as any,
      entityId,
      entityName,
      amount,
      percentage: 0, // Will be calculated when transaction is provided
      linkType: 'manual',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('🔗 Created manual link:', link);
    return link;
  }

  // Multi-entity Split Linking
  async createSplitLinks(
    transactionId: string,
    splits: Array<{
      entityType: string;
      entityId: string;
      entityName: string;
      percentage: number;
      notes?: string;
    }>
  ): Promise<TransactionEntityLink[]> {
    const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Split percentages must total 100%');
    }

    return splits.map(split => ({
      id: this.generateId(),
      transactionId,
      entityType: split.entityType as any,
      entityId: split.entityId,
      entityName: split.entityName,
      amount: 0, // Will be calculated when transaction amount is known
      percentage: split.percentage,
      linkType: 'manual' as const,
      notes: split.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  // Progress Tracking
  calculateEntityProgress(
    entityType: string,
    entityId: string,
    entity: Goal | Insurance | Asset,
    linkedTransactions: Transaction[]
  ): EntityProgress {
    const totalContributions = linkedTransactions.reduce((sum, transaction) => {
      const entityLinks = transaction.entityLinks?.filter(link => 
        link.entityType === entityType && link.entityId === entityId
      ) || [];
      return sum + entityLinks.reduce((linkSum, link) => linkSum + link.amount, 0);
    }, 0);

    let targetAmount = 0;
    let entityName = '';

    if (entityType === 'goal') {
      const goal = entity as Goal;
      targetAmount = goal.targetAmount;
      entityName = goal.name;
    } else if (entityType === 'insurance') {
      const insurance = entity as Insurance;
      targetAmount = insurance.maturityAmount || insurance.coverAmount;
      entityName = insurance.policyName;
    }

    const progressPercentage = targetAmount > 0 ? (totalContributions / targetAmount) * 100 : 0;
    
    // Calculate monthly contribution (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const recentTransactions = linkedTransactions.filter(t => 
      new Date(t.date) >= oneYearAgo
    );
    
    const monthlyContribution = recentTransactions.length > 0 
      ? totalContributions / 12 
      : 0;

    // Project completion date
    let projectedCompletion: string | undefined;
    if (monthlyContribution > 0 && progressPercentage < 100) {
      const remainingAmount = targetAmount - totalContributions;
      const monthsToComplete = remainingAmount / monthlyContribution;
      const completionDate = new Date();
      completionDate.setMonth(completionDate.getMonth() + monthsToComplete);
      projectedCompletion = completionDate.toISOString().split('T')[0];
    }

    return {
      entityType: entityType as any,
      entityId,
      entityName,
      targetAmount,
      currentAmount: totalContributions,
      progressPercentage: Math.min(progressPercentage, 100),
      monthlyContribution,
      projectedCompletion,
      lastUpdated: new Date().toISOString(),
      linkedTransactions: linkedTransactions.map(t => t.id),
      milestones: this.generateMilestones(targetAmount, totalContributions)
    };
  }

  private generateMilestones(targetAmount: number, currentAmount: number) {
    const milestones = [];
    const percentages = [25, 50, 75, 100];
    
    for (const percentage of percentages) {
      const milestoneAmount = (targetAmount * percentage) / 100;
      milestones.push({
        id: this.generateId(),
        name: `${percentage}% Complete`,
        targetAmount: milestoneAmount,
        isAchieved: currentAmount >= milestoneAmount,
        achievedDate: currentAmount >= milestoneAmount ? new Date().toISOString().split('T')[0] : undefined
      });
    }
    
    return milestones;
  }

  // Hierarchical Views
  generateEntityHierarchy(
    goals: Goal[],
    insurance: Insurance[],
    _assets: Asset[],
    transactions: Transaction[]
  ): EntityHierarchy[] {
    const hierarchies: EntityHierarchy[] = [];

    // Group by goal categories
    const goalCategories = [...new Set(goals.map(g => g.category))];
    
    for (const category of goalCategories) {
      const categoryGoals = goals.filter(g => g.category === category);
      const totalAmount = categoryGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
      
      const hierarchy: EntityHierarchy = {
        id: this.generateId(),
        name: this.formatCategoryName(category),
        type: 'goal',
        totalAmount,
        children: [],
        progress: {
          entityType: 'goal',
          entityId: category,
          entityName: this.formatCategoryName(category),
          targetAmount: categoryGoals.reduce((sum, goal) => sum + goal.targetAmount, 0),
          currentAmount: totalAmount,
          progressPercentage: 0,
          monthlyContribution: 0,
          lastUpdated: new Date().toISOString(),
          linkedTransactions: [],
          milestones: []
        }
      };

      // Add individual goals as children
      for (const goal of categoryGoals) {
        const goalTransactions = this.getLinkedTransactions(transactions, 'goal', goal.id);
        // const goalProgress = this.calculateEntityProgress('goal', goal.id, goal, goalTransactions);
        
        hierarchy.children.push({
          id: goal.id,
          name: goal.name,
          type: 'investment',
          amount: goal.currentAmount,
          percentage: totalAmount > 0 ? (goal.currentAmount / totalAmount) * 100 : 0,
          transactions: goalTransactions,
          lastContribution: goalTransactions.length > 0 
            ? goalTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
            : undefined
        });
      }

      // Add related insurance policies
      const relatedInsurance = insurance.filter(ins => 
        this.isInsuranceRelatedToCategory(ins, category)
      );
      
      for (const ins of relatedInsurance) {
        const insTransactions = this.getLinkedTransactions(transactions, 'insurance', ins.id);
        hierarchy.children.push({
          id: ins.id,
          name: ins.policyName,
          type: 'insurance',
          amount: ins.maturityAmount || ins.coverAmount,
          percentage: totalAmount > 0 ? ((ins.maturityAmount || ins.coverAmount) / totalAmount) * 100 : 0,
          transactions: insTransactions,
          lastContribution: insTransactions.length > 0 
            ? insTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
            : undefined
        });
      }

      hierarchy.progress.progressPercentage = hierarchy.progress.targetAmount > 0 
        ? (hierarchy.progress.currentAmount / hierarchy.progress.targetAmount) * 100 
        : 0;

      hierarchies.push(hierarchy);
    }

    return hierarchies;
  }

  private getLinkedTransactions(transactions: Transaction[], entityType: string, entityId: string): Transaction[] {
    return transactions.filter(transaction => 
      transaction.entityLinks?.some(link => 
        link.entityType === entityType && link.entityId === entityId
      )
    );
  }

  private isInsuranceRelatedToCategory(insurance: Insurance, category: string): boolean {
    const categoryKeywords = {
      'retirement': ['retirement', 'pension', 'annuity'],
      'education': ['education', 'child', 'study'],
      'marriage': ['marriage', 'wedding', 'ceremony'],
      'other': []
    };

    const keywords = categoryKeywords[category as keyof typeof categoryKeywords] || [];
    return keywords.some(keyword => 
      insurance.policyName.toLowerCase().includes(keyword) ||
      insurance.type.toLowerCase().includes(keyword)
    );
  }

  // Notification System
  private createNotification(notification: Omit<LinkingNotification, 'id' | 'isRead' | 'createdAt'>) {
    const newNotification: LinkingNotification = {
      ...notification,
      id: this.generateId(),
      isRead: false,
      createdAt: new Date().toISOString()
    };

    this.notifications.push(newNotification);
    console.log('🔔 Created notification:', newNotification.title);
  }

  getNotifications(): LinkingNotification[] {
    return this.notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  markNotificationAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
    }
  }

  // Rule Management
  createLinkingRule(rule: Omit<LinkingRule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>): LinkingRule {
    const newRule: LinkingRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      triggerCount: 0
    };

    this.linkingRules.push(newRule);
    return newRule;
  }

  updateLinkingRule(ruleId: string, updates: Partial<LinkingRule>): LinkingRule | null {
    const ruleIndex = this.linkingRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return null;

    this.linkingRules[ruleIndex] = {
      ...this.linkingRules[ruleIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.linkingRules[ruleIndex];
  }

  deleteLinkingRule(ruleId: string): boolean {
    const ruleIndex = this.linkingRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.linkingRules.splice(ruleIndex, 1);
    return true;
  }

  getLinkingRules(): LinkingRule[] {
    return this.linkingRules;
  }

  // Utility Methods
  private findEntity(
    entityId: string, 
    entityType: string, 
    entities: { goals: Goal[]; insurance: Insurance[]; assets: Asset[]; budget: MonthlyBudget }
  ): Goal | Insurance | Asset | MonthlyBudget | null {
    switch (entityType) {
      case 'goal':
        return entities.goals.find(g => g.id === entityId) || null;
      case 'insurance':
        return entities.insurance.find(i => i.id === entityId) || null;
      case 'asset':
        return entities.assets.find(a => a.id === entityId) || null;
      case 'budget':
        return entities.budget;
      default:
        return null;
    }
  }

  private getEntityName(entity: any, entityType: string): string {
    switch (entityType) {
      case 'goal':
        return entity.name;
      case 'insurance':
        return entity.policyName;
      case 'asset':
        return entity.name;
      case 'budget':
        return 'Monthly Budget';
      default:
        return 'Unknown Entity';
    }
  }

  private formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Initialize with default rules
  initializeDefaultRules() {
    const defaultRules = [
      {
        name: 'SIP to Retirement Goal',
        description: 'Link SIP transactions to retirement goals',
        isActive: true,
        priority: 100,
        conditions: [
          { field: 'description' as const, operator: 'contains' as const, value: 'sip', caseSensitive: false },
          { field: 'type' as const, operator: 'equals' as const, value: 'investment' }
        ],
        actions: [
          {
            entityType: 'goal' as const,
            entityId: 'retirement-goal-id', // This would be dynamic
            allocationMethod: 'percentage' as const,
            percentage: 100
          }
        ]
      },
      {
        name: 'Fixed Deposit to Education',
        description: 'Link FD investments to education goals',
        isActive: true,
        priority: 90,
        conditions: [
          { field: 'description' as const, operator: 'contains' as const, value: 'fixed deposit', caseSensitive: false },
          { field: 'amount' as const, operator: 'greaterThan' as const, value: 5000 }
        ],
        actions: [
          {
            entityType: 'goal' as const,
            entityId: 'education-goal-id', // This would be dynamic
            allocationMethod: 'percentage' as const,
            percentage: 100
          }
        ]
      }
    ];

    defaultRules.forEach(rule => this.createLinkingRule(rule));
  }
}

export const transactionLinkingService = TransactionLinkingService.getInstance();