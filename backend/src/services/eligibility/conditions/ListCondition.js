/**
 * =============================================================================
 * ISKOlarship - List Condition Class
 * =============================================================================
 * 
 * Handles list/collection-based eligibility conditions.
 * Examples: Year Level, College, Course, ST Bracket, Province
 * 
 * =============================================================================
 */

const BaseCondition = require('./BaseCondition');
const { ConditionType, ListOperator, OperatorDescriptions } = require('../types');
const { evaluateList, hasValue } = require('../utils');

class ListCondition extends BaseCondition {
  /**
   * Create a list condition
   * @param {Object} config - Condition configuration
   * @param {string} config.operator - The comparison operator (from ListOperator)
   * @param {boolean} config.caseSensitive - Whether comparison is case-sensitive
   * @param {boolean} config.fuzzyMatch - Whether to use fuzzy matching
   * @param {Object} config.valueMapping - Map to normalize values (e.g., ST bracket codes)
   */
  constructor(config) {
    super(config);
    
    this.operator = config.operator || ListOperator.IN;
    this.caseSensitive = config.caseSensitive || false;
    this.fuzzyMatch = config.fuzzyMatch || false;
    
    // Value mapping for normalization (e.g., 'FDS' -> 'Full Discount with Stipend')
    this.valueMapping = config.valueMapping || null;
    
    // Alternative field names for the same data (for API compatibility)
    this.alternativeFields = config.alternativeFields || [];
  }
  
  getType() {
    return ConditionType.LIST;
  }
  
  /**
   * Normalize a value using the value mapping
   */
  normalizeValue(value) {
    if (!this.valueMapping) return value;
    
    if (Array.isArray(value)) {
      return value.map(v => this._normalizeSingleValue(v));
    }
    
    return this._normalizeSingleValue(value);
  }
  
  _normalizeSingleValue(value) {
    if (!this.valueMapping || !value) return value;
    
    // Try direct lookup
    const normalized = typeof value === 'string' ? value.toUpperCase() : value;
    if (this.valueMapping[normalized]) {
      return this.valueMapping[normalized];
    }
    
    // Try to find by value (reverse lookup)
    for (const [key, mappedValue] of Object.entries(this.valueMapping)) {
      if (typeof mappedValue === 'string' && 
          mappedValue.toUpperCase() === normalized) {
        return mappedValue;
      }
    }
    
    return value;
  }
  
  getStudentValue(profile) {
    const value = super.getStudentValue(profile);
    return this.normalizeValue(value);
  }
  
  getCriteriaValue(criteria) {
    // Try main fields first
    let value = super.getCriteriaValue(criteria);
    
    // Try alternative fields
    if (!hasValue(value)) {
      for (const field of this.alternativeFields) {
        const altValue = this._getNestedValue(criteria, field);
        if (hasValue(altValue)) {
          value = altValue;
          break;
        }
      }
    }
    
    // Ensure it's an array
    if (hasValue(value) && !Array.isArray(value)) {
      value = [value];
    }
    
    return this.normalizeValue(value);
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
  
  evaluate(studentValue, criteriaValue) {
    return evaluateList(studentValue, this.operator, criteriaValue, {
      caseSensitive: this.caseSensitive,
      fuzzyMatch: this.fuzzyMatch
    });
  }
  
  formatStudentValue(value) {
    if (!hasValue(value)) return 'Not specified';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }
  
  formatCriteriaValue(value) {
    if (!hasValue(value)) return 'Any';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'Any';
      if (value.length <= 3) return value.join(', ');
      return `${value.slice(0, 3).join(', ')} +${value.length - 3} more`;
    }
    return String(value);
  }
}

module.exports = ListCondition;
