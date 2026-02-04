/**
 * =============================================================================
 * ISKOlarship - Eligibility Conditions
 * =============================================================================
 * 
 * OOP-based condition classes for eligibility checking:
 * - BaseCondition: Abstract base class
 * - RangeCondition: Numeric comparisons (GWA, Income, Units)
 * - BooleanCondition: True/False checks (Has Scholarship, Has Thesis)
 * - ListCondition: Collection membership (College, Year Level, Course)
 * 
 * =============================================================================
 */

const BaseCondition = require('./BaseCondition');
const RangeCondition = require('./RangeCondition');
const BooleanCondition = require('./BooleanCondition');
const ListCondition = require('./ListCondition');

module.exports = {
  BaseCondition,
  RangeCondition,
  BooleanCondition,
  ListCondition
};
