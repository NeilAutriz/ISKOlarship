/**
 * =============================================================================
 * ISKOlarship - Range Condition Class
 * =============================================================================
 * 
 * Handles numeric range-based eligibility conditions.
 * Examples: GWA, Income, Units Enrolled, Household Size
 * 
 * =============================================================================
 */

const BaseCondition = require('./BaseCondition');
const { ConditionType, RangeOperator, OperatorDescriptions } = require('../types');
const { evaluateRange, hasValue } = require('../utils');

class RangeCondition extends BaseCondition {
  /**
   * Create a range condition
   * @param {Object} config - Condition configuration
   * @param {string} config.operator - The comparison operator (from RangeOperator)
   * @param {string} config.minField - Field name for minimum value (for BETWEEN)
   * @param {string} config.maxField - Field name for maximum value (for BETWEEN)
   * @param {number} config.defaultMin - Default minimum value
   * @param {number} config.defaultMax - Default maximum value
   */
  constructor(config) {
    super(config);
    
    this.operator = config.operator || RangeOperator.LESS_THAN_OR_EQUAL;
    
    // For BETWEEN operator, we need min and max fields
    this.minField = config.minField;
    this.maxField = config.maxField;
    this.minFields = this._normalizeFields(config.minField || config.minFields);
    this.maxFields = this._normalizeFields(config.maxField || config.maxFields);
    
    // Default min/max values
    this.defaultMin = config.defaultMin;
    this.defaultMax = config.defaultMax;
    
    // Special handling for "inverted" ranges (like GWA where lower is better)
    this.inverted = config.inverted || false;
    
    // No restriction value (e.g., maxGWA of 5.0 means no restriction)
    this.noRestrictionValue = config.noRestrictionValue;
  }
  
  getType() {
    return ConditionType.RANGE;
  }
  
  /**
   * Get min value from criteria
   */
  getMinValue(criteria) {
    for (const field of this.minFields) {
      const value = this._getNestedValue(criteria, field);
      if (hasValue(value)) return value;
    }
    return this.defaultMin;
  }
  
  /**
   * Get max value from criteria
   */
  getMaxValue(criteria) {
    for (const field of this.maxFields) {
      const value = this._getNestedValue(criteria, field);
      if (hasValue(value)) return value;
    }
    return this.defaultMax;
  }
  
  _getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  }
  
  /**
   * Check if the criteria represents "no restriction"
   */
  isNoRestriction(criteria) {
    if (this.noRestrictionValue === undefined) return false;
    
    const max = this.getMaxValue(criteria);
    const min = this.getMinValue(criteria);
    
    // For inverted ranges (like GWA where lower is better):
    // max at noRestrictionValue with no min restriction = no restriction
    // Use defaultMin instead of hardcoded 1.0 for flexibility
    if (this.inverted) {
      const minThreshold = this.defaultMin ?? -Infinity;
      return max >= this.noRestrictionValue && (!hasValue(min) || min <= minThreshold);
    }
    
    return max === this.noRestrictionValue;
  }
  
  shouldSkipCheck(profile, criteria) {
    // Check if this is a "no restriction" case
    if (this.isNoRestriction(criteria)) {
      return true;
    }
    
    return super.shouldSkipCheck(profile, criteria);
  }
  
  getCriteriaValue(criteria) {
    if (this.operator === RangeOperator.BETWEEN || 
        this.operator === RangeOperator.BETWEEN_EXCLUSIVE ||
        this.operator === RangeOperator.OUTSIDE) {
      return {
        min: this.getMinValue(criteria),
        max: this.getMaxValue(criteria)
      };
    }
    
    // For single-value operators, use the appropriate field
    // Default to max for "less than" operators, min for "greater than"
    if (this.operator === RangeOperator.LESS_THAN || 
        this.operator === RangeOperator.LESS_THAN_OR_EQUAL) {
      return this.getMaxValue(criteria) ?? super.getCriteriaValue(criteria);
    }
    
    if (this.operator === RangeOperator.GREATER_THAN ||
        this.operator === RangeOperator.GREATER_THAN_OR_EQUAL) {
      return this.getMinValue(criteria) ?? super.getCriteriaValue(criteria);
    }
    
    return super.getCriteriaValue(criteria);
  }
  
  evaluate(studentValue, criteriaValue) {
    return evaluateRange(studentValue, this.operator, criteriaValue);
  }
  
  formatCriteriaValue(value) {
    if (!hasValue(value)) return 'No requirement';
    
    // Handle BETWEEN operator
    if (typeof value === 'object' && (value.min !== undefined || value.max !== undefined)) {
      const min = value.min;
      const max = value.max;
      
      if (hasValue(min) && hasValue(max)) {
        return `${this._formatNumber(min)} - ${this._formatNumber(max)}`;
      } else if (hasValue(max)) {
        return `≤ ${this._formatNumber(max)}`;
      } else if (hasValue(min)) {
        return `≥ ${this._formatNumber(min)}`;
      }
      return 'No requirement';
    }
    
    // Single value with operator
    const opDesc = OperatorDescriptions[this.operator] || this.operator;
    return `${opDesc} ${this._formatNumber(value)}`;
  }
  
  _formatNumber(value) {
    if (typeof value !== 'number') return String(value);
    
    // Format based on the type of value (detect from field names or value range)
    if (this.id.toLowerCase().includes('gwa') || (value >= 1 && value <= 5)) {
      return value.toFixed(2);
    }
    
    if (this.id.toLowerCase().includes('income') || value >= 1000) {
      return `₱${value.toLocaleString()}`;
    }
    
    return value.toString();
  }
}

module.exports = RangeCondition;
