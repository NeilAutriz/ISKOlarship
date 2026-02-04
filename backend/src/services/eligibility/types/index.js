/**
 * =============================================================================
 * ISKOlarship - Eligibility Condition Types and Enums
 * =============================================================================
 * 
 * Central location for all type definitions, enums, and operators.
 * Re-exports from ConditionTypes.js for clean imports.
 * 
 * =============================================================================
 */

const {
  ConditionType,
  RangeOperator,
  BooleanOperator,
  ListOperator,
  ConditionCategory,
  ImportanceLevel,
  OperatorDescriptions
} = require('./ConditionTypes');

module.exports = {
  ConditionType,
  RangeOperator,
  BooleanOperator,
  ListOperator,
  ConditionCategory,
  ImportanceLevel,
  OperatorDescriptions
};
