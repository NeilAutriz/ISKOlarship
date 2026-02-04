/**
 * =============================================================================
 * ISKOlarship - Eligibility Utilities
 * =============================================================================
 * 
 * Utility functions for eligibility checking:
 * - Value normalizers (ST Bracket, Year Level, College, etc.)
 * - Condition evaluators (range, boolean, list comparisons)
 * 
 * =============================================================================
 */

const normalizers = require('./normalizers');
const evaluators = require('./ConditionEvaluators');

module.exports = {
  // Normalizers
  ...normalizers,
  normalizers,
  
  // Evaluators
  ...evaluators,
  evaluators
};
