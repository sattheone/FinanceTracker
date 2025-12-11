import { Goal } from '../types';

/**
 * Migration service to upgrade existing goals to the new format
 */
class GoalMigrationService {
  /**
   * Migrate a single goal to the new format
   */
  migrateGoal(goal: any): Goal {
    return {
      ...goal,
      // Add new fields with defaults if they don't exist
      linkedRecurringTransactions: goal.linkedRecurringTransactions || [],
      linkedTransactionCategories: goal.linkedTransactionCategories || [],
      autoUpdateFromTransactions: goal.autoUpdateFromTransactions ?? true,
      priority: goal.priority || 'medium',
      description: goal.description || undefined,
      milestones: goal.milestones || []
    };
  }

  /**
   * Migrate an array of goals
   */
  migrateGoals(goals: any[]): Goal[] {
    return goals.map(goal => this.migrateGoal(goal));
  }

  /**
   * Check if a goal needs migration
   */
  needsMigration(goal: any): boolean {
    return (
      !goal.hasOwnProperty('linkedRecurringTransactions') ||
      !goal.hasOwnProperty('linkedTransactionCategories') ||
      !goal.hasOwnProperty('autoUpdateFromTransactions') ||
      !goal.hasOwnProperty('priority')
    );
  }

  /**
   * Auto-migrate goals in localStorage
   */
  autoMigrateLocalStorageGoals(): void {
    try {
      const storedGoals = localStorage.getItem('goals');
      if (!storedGoals) return;

      const goals = JSON.parse(storedGoals);
      if (!Array.isArray(goals)) return;

      let needsUpdate = false;
      const migratedGoals = goals.map(goal => {
        if (this.needsMigration(goal)) {
          needsUpdate = true;
          return this.migrateGoal(goal);
        }
        return goal;
      });

      if (needsUpdate) {
        localStorage.setItem('goals', JSON.stringify(migratedGoals));
        console.log('✅ Goals migrated to new format');
      }
    } catch (error) {
      console.error('❌ Error migrating goals:', error);
    }
  }
}

export default new GoalMigrationService();