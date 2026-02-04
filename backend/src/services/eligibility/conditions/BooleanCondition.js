/**
 * =============================================================================
 * ISKOlarship - Boolean Condition Class
 * =============================================================================
 * 
 * Handles true/false eligibility conditions.
 * Examples: Has Approved Thesis, Has Disciplinary Action, Has Other Scholarship
 * 
 * =============================================================================
 */

const BaseCondition = require('./BaseCondition');
const { ConditionType, BooleanOperator, OperatorDescriptions } = require('../types');
const { evaluateBoolean, hasValue } = require('../utils');

class BooleanCondition extends BaseCondition {
  /**
   * Create a boolean condition
   * @param {Object} config - Condition configuration
   * @param {string} config.operator - The comparison operator (from BooleanOperator)
   * @param {any} config.expectedValue - The expected value (for IS/IS_NOT operators)
   * @param {boolean} config.invertCheck - If true, invert the final result
   */
  constructor(config) {
    super(config);
    
    this.operator = config.operator || BooleanOperator.IS_TRUE;
    this.expectedValue = config.expectedValue !== undefined ? config.expectedValue : true;
    this.invertCheck = config.invertCheck || false;
    
    // For conditions like "must NOT have scholarship"
    // The criteria specifies "mustNotHaveOtherScholarship: true"
    // But we need to check if student "hasOtherScholarship: false"
    this.requiresNegation = config.requiresNegation || false;
  }
  
  getType() {
    return ConditionType.BOOLEAN;
  }
  
  shouldSkipCheck(profile, criteria) {
    // For boolean conditions, skip if the criteria field is false/not set
    // (meaning the requirement is not enforced)
    const criteriaValue = this.getCriteriaValue(criteria);
    
    // If criteria is not set or is false, skip the check
    if (!criteriaValue) {
      return true;
    }
    
    return false;
  }
  
  evaluate(studentValue, criteriaValue) {
    // If criteria requires something NOT to be present
    // e.g., mustNotHaveOtherScholarship: true means student should NOT have scholarship
    let result;
    
    if (this.requiresNegation) {
      // We want the student value to be false/falsy
      result = evaluateBoolean(studentValue, BooleanOperator.IS_FALSY);
    } else if (this.operator === BooleanOperator.IS_TRUE) {
      // We want the student value to be true
      result = evaluateBoolean(studentValue, BooleanOperator.IS_TRUTHY);
    } else if (this.operator === BooleanOperator.IS_FALSE) {
      // We want the student value to be false
      result = evaluateBoolean(studentValue, BooleanOperator.IS_FALSY);
    } else {
      result = evaluateBoolean(studentValue, this.operator, this.expectedValue);
    }
    
    // Apply inversion if configured
    if (this.invertCheck && result !== null) {
      result = !result;
    }
    
    return result;
  }
  
  formatStudentValue(value) {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    if (!hasValue(value)) return 'Not specified';
    return String(value);
  }
  
  formatCriteriaValue(value) {
    if (!value) return 'Not required';
    
    // For negation conditions, phrase appropriately
    if (this.requiresNegation) {
      return 'Required (must not have)';
    }
    
    return 'Required';
  }
}

module.exports = BooleanCondition;
