/**
 * =============================================================================
 * ISKOlarship - Eligibility Engine
 * =============================================================================
 * 
 * The core engine that orchestrates eligibility checking:
 * - EligibilityEngine: Registers and evaluates conditions
 * - ScholarshipConditions: Pre-configured conditions for ISKOlarship
 * 
 * =============================================================================
 */

const EligibilityEngine = require('./EligibilityEngine');
const ScholarshipConditions = require('./ScholarshipConditions');

/**
 * Create a pre-configured eligibility engine with all scholarship conditions
 */
function createEngine() {
  return ScholarshipConditions.createEngine();
}

module.exports = {
  EligibilityEngine,
  ScholarshipConditions,
  createEngine,
  
  // Re-export individual conditions for customization
  ...ScholarshipConditions
};
