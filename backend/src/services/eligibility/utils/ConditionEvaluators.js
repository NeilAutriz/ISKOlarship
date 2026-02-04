/**
 * =============================================================================
 * ISKOlarship - Condition Evaluators
 * =============================================================================
 * 
 * Core evaluation logic for each condition type.
 * These are pure functions that perform the actual comparisons.
 * 
 * =============================================================================
 */

const { RangeOperator, BooleanOperator, ListOperator } = require('../types');

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a value exists and is not empty
 */
function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Normalize string for comparison (lowercase, trim)
 */
function normalizeString(str) {
  if (typeof str !== 'string') return str;
  return str.toLowerCase().trim();
}

/**
 * Get nested value from object using dot notation
 * e.g., getNestedValue(obj, 'studentProfile.gwa')
 * Also handles customFields which may be stored as a Map in MongoDB
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  
  // Handle array of paths (fallback)
  if (Array.isArray(path)) {
    for (const p of path) {
      const value = getNestedValue(obj, p);
      if (hasValue(value)) return value;
    }
    return undefined;
  }
  
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (current === null || current === undefined) return undefined;
    
    // Handle MongoDB Maps (customFields is stored as Map)
    if (current instanceof Map) {
      current = current.get(key);
    } else if (typeof current.get === 'function' && key !== 'get') {
      // Also handle Map-like objects
      current = current.get(key);
    } else {
      current = current[key];
    }
  }
  
  return current;
}

// =============================================================================
// RANGE EVALUATOR
// =============================================================================

/**
 * Evaluate a range condition
 * 
 * @param {number} value - The value to check
 * @param {string} operator - The operator to use
 * @param {number|Object} threshold - The threshold value or {min, max} for between
 * @returns {boolean} Whether the condition passes
 */
function evaluateRange(value, operator, threshold) {
  // If no value provided, can't evaluate
  if (!hasValue(value)) {
    return null; // null means "can't evaluate"
  }
  
  const numValue = Number(value);
  if (isNaN(numValue)) return null;
  
  switch (operator) {
    case RangeOperator.LESS_THAN:
      return numValue < threshold;
      
    case RangeOperator.LESS_THAN_OR_EQUAL:
      return numValue <= threshold;
      
    case RangeOperator.GREATER_THAN:
      return numValue > threshold;
      
    case RangeOperator.GREATER_THAN_OR_EQUAL:
      return numValue >= threshold;
      
    case RangeOperator.EQUAL:
      return numValue === threshold;
      
    case RangeOperator.NOT_EQUAL:
      return numValue !== threshold;
      
    case RangeOperator.BETWEEN:
      if (!threshold.min && !threshold.max) return true;
      const min = threshold.min ?? -Infinity;
      const max = threshold.max ?? Infinity;
      return numValue >= min && numValue <= max;
      
    case RangeOperator.BETWEEN_EXCLUSIVE:
      if (!threshold.min && !threshold.max) return true;
      const minEx = threshold.min ?? -Infinity;
      const maxEx = threshold.max ?? Infinity;
      return numValue > minEx && numValue < maxEx;
      
    case RangeOperator.OUTSIDE:
      if (!threshold.min && !threshold.max) return false;
      const minOut = threshold.min ?? -Infinity;
      const maxOut = threshold.max ?? Infinity;
      return numValue < minOut || numValue > maxOut;
      
    default:
      console.warn(`Unknown range operator: ${operator}`);
      return null;
  }
}

// =============================================================================
// BOOLEAN EVALUATOR
// =============================================================================

/**
 * Evaluate a boolean condition
 * 
 * @param {any} value - The value to check
 * @param {string} operator - The operator to use
 * @param {any} expected - The expected value (for IS/IS_NOT)
 * @returns {boolean} Whether the condition passes
 */
function evaluateBoolean(value, operator, expected = true) {
  switch (operator) {
    case BooleanOperator.IS:
      return value === expected;
      
    case BooleanOperator.IS_NOT:
      return value !== expected;
      
    case BooleanOperator.IS_TRUE:
      return value === true;
      
    case BooleanOperator.IS_FALSE:
      return value === false;
      
    case BooleanOperator.IS_TRUTHY:
      return !!value;
      
    case BooleanOperator.IS_FALSY:
      return !value;
      
    default:
      console.warn(`Unknown boolean operator: ${operator}`);
      return null;
  }
}

// =============================================================================
// LIST EVALUATOR
// =============================================================================

/**
 * Evaluate a list condition
 * 
 * @param {any} value - The value to check (can be single value or array)
 * @param {string} operator - The operator to use
 * @param {Array} list - The list to check against
 * @param {Object} options - Additional options
 * @param {boolean} options.caseSensitive - Whether comparison is case-sensitive
 * @param {boolean} options.fuzzyMatch - Whether to use fuzzy matching
 * @returns {boolean} Whether the condition passes
 */
function evaluateList(value, operator, list, options = {}) {
  const { caseSensitive = false, fuzzyMatch = false } = options;
  
  // If no list specified, condition doesn't apply
  if (!hasValue(list) || !Array.isArray(list) || list.length === 0) {
    return null; // null means "condition doesn't apply"
  }
  
  // Normalize values for comparison
  const normalizeForComparison = (val) => {
    if (!caseSensitive && typeof val === 'string') {
      return normalizeString(val);
    }
    return val;
  };
  
  const normalizedList = list.map(normalizeForComparison);
  const normalizedValue = Array.isArray(value) 
    ? value.map(normalizeForComparison)
    : normalizeForComparison(value);
  
  // Fuzzy match helper
  const fuzzyIncludes = (listItem, checkValue) => {
    if (!fuzzyMatch) return listItem === checkValue;
    if (typeof listItem !== 'string' || typeof checkValue !== 'string') {
      return listItem === checkValue;
    }
    return listItem.includes(checkValue) || checkValue.includes(listItem);
  };
  
  const listContains = (checkValue) => {
    return normalizedList.some(item => fuzzyIncludes(item, checkValue));
  };
  
  switch (operator) {
    case ListOperator.IN:
      // Single value must be in list
      if (!hasValue(normalizedValue)) return null;
      return listContains(normalizedValue);
      
    case ListOperator.NOT_IN:
      // Single value must not be in list
      if (!hasValue(normalizedValue)) return true; // If no value, it's not in the list
      return !listContains(normalizedValue);
      
    case ListOperator.INCLUDES:
      // List must include the single value
      if (!hasValue(normalizedValue)) return null;
      return listContains(normalizedValue);
      
    case ListOperator.INCLUDES_ANY:
      // List must include at least one of the values
      if (!Array.isArray(normalizedValue)) return listContains(normalizedValue);
      return normalizedValue.some(v => listContains(v));
      
    case ListOperator.INCLUDES_ALL:
      // List must include all of the values
      if (!Array.isArray(normalizedValue)) return listContains(normalizedValue);
      return normalizedValue.every(v => listContains(v));
      
    case ListOperator.EXCLUDES:
      // List must not include the single value
      if (!hasValue(normalizedValue)) return true;
      return !listContains(normalizedValue);
      
    case ListOperator.EXCLUDES_ALL:
      // List must not include any of the values
      if (!Array.isArray(normalizedValue)) return !listContains(normalizedValue);
      return normalizedValue.every(v => !listContains(v));
      
    case ListOperator.MATCHES_ANY:
      // Fuzzy match any
      if (!hasValue(normalizedValue)) return null;
      return normalizedList.some(item => fuzzyIncludes(item, normalizedValue));
      
    case ListOperator.MATCHES_ALL:
      // Fuzzy match all (all list items must match the value pattern)
      if (!hasValue(normalizedValue)) return null;
      return normalizedList.every(item => fuzzyIncludes(item, normalizedValue));
      
    default:
      console.warn(`Unknown list operator: ${operator}`);
      return null;
  }
}

// =============================================================================
// UNIFIED EVALUATOR
// =============================================================================

/**
 * Evaluate any condition based on its type
 * 
 * @param {string} conditionType - The type of condition (range, boolean, list)
 * @param {any} value - The value to check
 * @param {string} operator - The operator to use
 * @param {any} threshold - The threshold/expected/list value
 * @param {Object} options - Additional options
 * @returns {boolean|null} Whether the condition passes (null if can't evaluate)
 */
function evaluate(conditionType, value, operator, threshold, options = {}) {
  switch (conditionType) {
    case 'range':
      return evaluateRange(value, operator, threshold);
    case 'boolean':
      return evaluateBoolean(value, operator, threshold);
    case 'list':
      return evaluateList(value, operator, threshold, options);
    default:
      console.warn(`Unknown condition type: ${conditionType}`);
      return null;
  }
}

module.exports = {
  hasValue,
  normalizeString,
  getNestedValue,
  evaluateRange,
  evaluateBoolean,
  evaluateList,
  evaluate
};
