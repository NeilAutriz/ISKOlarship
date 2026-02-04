/**
 * =============================================================================
 * ISKOlarship - Eligibility Condition Types & Operators
 * =============================================================================
 * 
 * Defines the core types and operators for the flexible eligibility system.
 * This follows OOP principles with clear separation of concerns.
 * 
 * THREE CONDITION TYPES:
 * 1. RANGE - Numeric comparisons (less than, greater than, between, etc.)
 * 2. BOOLEAN - True/False checks (is, isNot)
 * 3. LIST - Collection membership (in, notIn, includes, etc.)
 * 
 * =============================================================================
 */

// =============================================================================
// CONDITION TYPES
// =============================================================================

const ConditionType = Object.freeze({
  RANGE: 'range',
  BOOLEAN: 'boolean',
  LIST: 'list'
});

// =============================================================================
// RANGE OPERATORS
// For numeric comparisons with min/max values
// =============================================================================

const RangeOperator = Object.freeze({
  LESS_THAN: 'lt',                    // value < threshold
  LESS_THAN_OR_EQUAL: 'lte',          // value <= threshold
  GREATER_THAN: 'gt',                 // value > threshold
  GREATER_THAN_OR_EQUAL: 'gte',       // value >= threshold
  EQUAL: 'eq',                        // value === threshold
  NOT_EQUAL: 'neq',                   // value !== threshold
  BETWEEN: 'between',                 // min <= value <= max
  BETWEEN_EXCLUSIVE: 'betweenExcl',   // min < value < max
  OUTSIDE: 'outside'                  // value < min || value > max
});

// =============================================================================
// BOOLEAN OPERATORS
// For true/false condition checks
// =============================================================================

const BooleanOperator = Object.freeze({
  IS: 'is',                           // value === expected
  IS_NOT: 'isNot',                    // value !== expected
  IS_TRUE: 'isTrue',                  // value === true
  IS_FALSE: 'isFalse',                // value === false
  IS_TRUTHY: 'isTruthy',              // !!value
  IS_FALSY: 'isFalsy'                 // !value
});

// =============================================================================
// LIST OPERATORS
// For collection membership and matching
// =============================================================================

const ListOperator = Object.freeze({
  IN: 'in',                           // value is in list
  NOT_IN: 'notIn',                    // value is not in list
  INCLUDES: 'includes',               // list includes value
  INCLUDES_ANY: 'includesAny',        // list includes any of values
  INCLUDES_ALL: 'includesAll',        // list includes all of values
  EXCLUDES: 'excludes',               // list does not include value
  EXCLUDES_ALL: 'excludesAll',        // list does not include any of values
  MATCHES_ANY: 'matchesAny',          // fuzzy match any
  MATCHES_ALL: 'matchesAll'           // fuzzy match all
});

// =============================================================================
// CONDITION CATEGORIES
// For grouping and display purposes
// =============================================================================

const ConditionCategory = Object.freeze({
  ACADEMIC: 'academic',
  FINANCIAL: 'financial',
  STATUS: 'status',
  LOCATION: 'location',
  DEMOGRAPHIC: 'demographic',
  CUSTOM: 'custom'
});

// =============================================================================
// IMPORTANCE LEVELS
// Determines if condition is hard requirement or soft preference
// =============================================================================

const ImportanceLevel = Object.freeze({
  REQUIRED: 'required',     // Must pass - affects eligibility
  PREFERRED: 'preferred',   // Should pass - affects score only
  OPTIONAL: 'optional'      // Nice to have - minimal impact
});

// =============================================================================
// OPERATOR DESCRIPTIONS (for UI/logging)
// =============================================================================

const OperatorDescriptions = Object.freeze({
  // Range
  [RangeOperator.LESS_THAN]: 'less than',
  [RangeOperator.LESS_THAN_OR_EQUAL]: 'at most',
  [RangeOperator.GREATER_THAN]: 'greater than',
  [RangeOperator.GREATER_THAN_OR_EQUAL]: 'at least',
  [RangeOperator.EQUAL]: 'equal to',
  [RangeOperator.NOT_EQUAL]: 'not equal to',
  [RangeOperator.BETWEEN]: 'between',
  [RangeOperator.BETWEEN_EXCLUSIVE]: 'strictly between',
  [RangeOperator.OUTSIDE]: 'outside of',
  
  // Boolean
  [BooleanOperator.IS]: 'is',
  [BooleanOperator.IS_NOT]: 'is not',
  [BooleanOperator.IS_TRUE]: 'must be true',
  [BooleanOperator.IS_FALSE]: 'must be false',
  [BooleanOperator.IS_TRUTHY]: 'must have value',
  [BooleanOperator.IS_FALSY]: 'must not have value',
  
  // List
  [ListOperator.IN]: 'in',
  [ListOperator.NOT_IN]: 'not in',
  [ListOperator.INCLUDES]: 'includes',
  [ListOperator.INCLUDES_ANY]: 'includes any of',
  [ListOperator.INCLUDES_ALL]: 'includes all of',
  [ListOperator.EXCLUDES]: 'excludes',
  [ListOperator.EXCLUDES_ALL]: 'excludes all of',
  [ListOperator.MATCHES_ANY]: 'matches any of',
  [ListOperator.MATCHES_ALL]: 'matches all of'
});

module.exports = {
  ConditionType,
  RangeOperator,
  BooleanOperator,
  ListOperator,
  ConditionCategory,
  ImportanceLevel,
  OperatorDescriptions
};
