/**
 * =============================================================================
 * ISKOlarship - Eligibility Engine
 * =============================================================================
 * 
 * The main engine that orchestrates all eligibility condition checks.
 * Provides a clean API for registering conditions and evaluating eligibility.
 * 
 * USAGE:
 * const engine = new EligibilityEngine();
 * engine.register(gwaCondition);
 * engine.register(incomeCondition);
 * const result = engine.check(studentProfile, scholarshipCriteria);
 * 
 * =============================================================================
 */

const { ConditionCategory, ImportanceLevel } = require('../types');

class EligibilityEngine {
  constructor() {
    this.conditions = new Map();
    this.conditionOrder = [];
  }
  
  /**
   * Register a condition with the engine
   * @param {BaseCondition} condition - The condition to register
   * @param {Object} options - Registration options
   * @param {number} options.priority - Order priority (lower = first)
   */
  register(condition, options = {}) {
    if (!condition || !condition.id) {
      throw new Error('Condition must have an id');
    }
    
    const priority = options.priority ?? this.conditionOrder.length;
    
    this.conditions.set(condition.id, {
      condition,
      priority
    });
    
    // Rebuild order
    this._rebuildOrder();
    
    return this;
  }
  
  /**
   * Register multiple conditions at once
   * @param {Array<BaseCondition>} conditions - Conditions to register
   */
  registerAll(conditions) {
    conditions.forEach((condition, index) => {
      this.register(condition, { priority: index });
    });
    return this;
  }
  
  /**
   * Unregister a condition by ID
   */
  unregister(conditionId) {
    this.conditions.delete(conditionId);
    this._rebuildOrder();
    return this;
  }
  
  /**
   * Get a registered condition by ID
   */
  get(conditionId) {
    const entry = this.conditions.get(conditionId);
    return entry ? entry.condition : null;
  }
  
  /**
   * Rebuild the condition order based on priorities
   */
  _rebuildOrder() {
    this.conditionOrder = Array.from(this.conditions.entries())
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([id]) => id);
  }
  
  /**
   * Check all eligibility conditions
   * @param {Object} profile - Student profile
   * @param {Object} criteria - Eligibility criteria
   * @returns {Object} Comprehensive eligibility result
   */
  check(profile, criteria) {
    const results = [];
    const byCategory = {};
    const byType = {};
    const byImportance = {
      [ImportanceLevel.REQUIRED]: [],
      [ImportanceLevel.PREFERRED]: [],
      [ImportanceLevel.OPTIONAL]: []
    };
    
    // Run all condition checks
    for (const conditionId of this.conditionOrder) {
      const { condition } = this.conditions.get(conditionId);
      
      try {
        const result = condition.check(profile, criteria);
        
        // Skip null results (condition was skipped)
        if (result === null) continue;
        
        results.push(result);
        
        // Categorize result
        const category = result.category || ConditionCategory.CUSTOM;
        if (!byCategory[category]) byCategory[category] = [];
        byCategory[category].push(result);
        
        const type = result.type || 'unknown';
        if (!byType[type]) byType[type] = [];
        byType[type].push(result);
        
        const importance = result.importance || ImportanceLevel.REQUIRED;
        byImportance[importance].push(result);
        
      } catch (error) {
        console.error(`Error checking condition ${conditionId}:`, error);
        results.push({
          id: conditionId,
          criterion: condition.name,
          passed: false,
          notes: `Error: ${error.message}`,
          error: true
        });
      }
    }
    
    // Calculate statistics
    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.passed).length;
    const failedChecks = totalChecks - passedChecks;
    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
    
    // Determine overall eligibility (all REQUIRED checks must pass)
    const requiredChecks = byImportance[ImportanceLevel.REQUIRED];
    const passed = requiredChecks.every(r => r.passed);
    
    // Find failed required checks (these are the blockers)
    const failedRequired = requiredChecks.filter(r => !r.passed);
    
    return {
      passed,
      score,
      checks: results,
      summary: {
        total: totalChecks,
        passed: passedChecks,
        failed: failedChecks,
        percentage: score
      },
      byCategory,
      byType,
      byImportance,
      failedRequired,
      metadata: {
        checkedAt: new Date().toISOString(),
        conditionsEvaluated: this.conditionOrder.length,
        conditionsSkipped: this.conditionOrder.length - totalChecks
      }
    };
  }
  
  /**
   * Quick check - returns just pass/fail without details
   * @param {Object} profile - Student profile
   * @param {Object} criteria - Eligibility criteria
   * @returns {boolean} Whether the student is eligible
   */
  quickCheck(profile, criteria) {
    for (const conditionId of this.conditionOrder) {
      const { condition } = this.conditions.get(conditionId);
      
      // Only check required conditions for quick check
      if (condition.importance !== ImportanceLevel.REQUIRED) continue;
      
      try {
        const result = condition.check(profile, criteria);
        if (result && !result.passed) {
          return false;
        }
      } catch (error) {
        console.error(`Error in quick check for ${conditionId}:`, error);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get all registered condition IDs
   */
  getConditionIds() {
    return [...this.conditionOrder];
  }
  
  /**
   * Get all registered conditions
   */
  getAllConditions() {
    return this.conditionOrder.map(id => this.conditions.get(id).condition);
  }
  
  /**
   * Clear all registered conditions
   */
  clear() {
    this.conditions.clear();
    this.conditionOrder = [];
    return this;
  }
  
  /**
   * Create a copy of this engine with all conditions
   */
  clone() {
    const cloned = new EligibilityEngine();
    for (const [id, entry] of this.conditions) {
      cloned.conditions.set(id, { ...entry });
    }
    cloned.conditionOrder = [...this.conditionOrder];
    return cloned;
  }
}

module.exports = EligibilityEngine;
