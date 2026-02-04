/**
 * =============================================================================
 * ISKOlarship - Unified Eligibility Checking System
 * =============================================================================
 * 
 * ARCHITECTURE:
 * 
 * eligibility/
 * ├── index.js              # Main entry point (this file)
 * ├── types/                # Enums and type definitions
 * │   ├── index.js
 * │   └── ConditionTypes.js # ConditionType, Operators, Categories
 * ├── conditions/           # OOP Condition Classes
 * │   ├── index.js
 * │   ├── BaseCondition.js  # Abstract base class
 * │   ├── RangeCondition.js # Numeric: GWA, Income, Units
 * │   ├── BooleanCondition.js # True/False: Scholarship, Thesis
 * │   └── ListCondition.js  # Lists: College, Year Level, Course
 * ├── utils/                # Utilities
 * │   ├── index.js
 * │   ├── normalizers.js    # Value normalization (ST Bracket, etc.)
 * │   └── ConditionEvaluators.js # Comparison functions
 * ├── engine/               # Core Engine
 * │   ├── index.js
 * │   ├── EligibilityEngine.js # Main orchestrator
 * │   └── ScholarshipConditions.js # Pre-configured conditions
 * └── core/                 # Legacy (will be removed)
 * 
 * USAGE:
 * const eligibility = require('./eligibility');
 * const result = await eligibility.checkEligibility(user, scholarship);
 * 
 * =============================================================================
 */

// Import organized modules
const types = require('./types');
const conditions = require('./conditions');
const utils = require('./utils');
const engine = require('./engine');

// Create a singleton engine instance
let _engine = null;

function getEngine() {
  if (!_engine) {
    _engine = engine.createEngine();
  }
  return _engine;
}

// =============================================================================
// CUSTOM CONDITION PROCESSOR
// =============================================================================

/**
 * Process custom conditions defined by scholarship admins
 * These are dynamic conditions that can be configured per scholarship
 * 
 * @param {Object} profile - Student profile
 * @param {Array} customConditions - Array of custom condition definitions
 * @returns {Object} Results of custom condition checks
 */
function processCustomConditions(profile, customConditions) {
  if (!customConditions || !Array.isArray(customConditions) || customConditions.length === 0) {
    return { checks: [], passed: true, failedRequired: [] };
  }
  
  const checks = [];
  const failedRequired = [];
  
  for (const condition of customConditions) {
    // Skip inactive conditions
    if (condition.isActive === false) continue;
    
    try {
      const result = evaluateCustomCondition(profile, condition);
      checks.push(result);
      
      // Track failed required conditions
      if (!result.passed && condition.importance === 'required') {
        failedRequired.push(result);
      }
    } catch (error) {
      console.error(`Error evaluating custom condition ${condition.id}:`, error);
      checks.push({
        id: condition.id,
        criterion: condition.name,
        passed: false,
        applicantValue: 'Error',
        requiredValue: condition.value,
        notes: `Evaluation error: ${error.message}`,
        type: condition.conditionType,
        category: condition.category || 'custom',
        importance: condition.importance || 'required',
        isCustom: true
      });
    }
  }
  
  // All required custom conditions must pass
  const requiredChecks = checks.filter(c => c.importance === 'required');
  const passed = requiredChecks.every(c => c.passed);
  
  return { checks, passed, failedRequired };
}

/**
 * Evaluate a single custom condition
 * 
 * @param {Object} profile - Student profile
 * @param {Object} condition - Custom condition definition
 * @returns {Object} Condition check result
 */
function evaluateCustomCondition(profile, condition) {
  const { id, name, description, conditionType, studentField, operator, value, category, importance } = condition;
  
  // Get student value from profile
  const studentValue = utils.getNestedValue(profile, studentField);
  
  let passed = false;
  let formattedStudentValue = studentValue;
  let formattedCriteriaValue = value;
  
  switch (conditionType) {
    case 'range':
      passed = utils.evaluateRange(studentValue, operator, value);
      formattedStudentValue = studentValue != null ? String(studentValue) : 'Not specified';
      formattedCriteriaValue = formatRangeValue(operator, value);
      break;
      
    case 'boolean':
      passed = utils.evaluateBoolean(studentValue, operator, value);
      formattedStudentValue = studentValue ? 'Yes' : 'No';
      formattedCriteriaValue = value ? 'Required' : 'Not required';
      break;
      
    case 'list':
      passed = utils.evaluateList(studentValue, operator, value);
      formattedStudentValue = Array.isArray(studentValue) ? studentValue.join(', ') : (studentValue || 'Not specified');
      formattedCriteriaValue = Array.isArray(value) ? value.join(', ') : String(value);
      break;
      
    default:
      passed = false;
      formattedCriteriaValue = 'Unknown condition type';
  }
  
  // Handle null (can't evaluate)
  if (passed === null) {
    passed = importance !== 'required'; // Fail required, pass optional
  }
  
  return {
    id,
    criterion: name,
    passed,
    applicantValue: formattedStudentValue,
    requiredValue: formattedCriteriaValue,
    notes: passed ? 'Meets requirement' : 'Does not meet requirement',
    type: conditionType,
    category: category || 'custom',
    importance: importance || 'required',
    isCustom: true,
    description
  };
}

/**
 * Format range value for display
 */
function formatRangeValue(operator, value) {
  const opMap = {
    'lt': '<',
    'lte': '≤',
    'gt': '>',
    'gte': '≥',
    'eq': '=',
    'neq': '≠',
    'between': 'between'
  };
  
  if (operator === 'between' && typeof value === 'object') {
    return `${value.min || '∞'} - ${value.max || '∞'}`;
  }
  
  return `${opMap[operator] || operator} ${value}`;
}

// =============================================================================
// MAIN ELIGIBILITY CHECK FUNCTION
// =============================================================================

/**
 * Check all eligibility criteria for a student against a scholarship
 * This is the main entry point for eligibility checking.
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Promise<Object>} Eligibility result with passed status, score, and detailed checks
 * @throws {Error} If user or scholarship is invalid
 */
async function checkEligibility(user, scholarship) {
  // Input validation
  if (!user) {
    throw new Error('User object is required for eligibility check');
  }
  
  if (!scholarship) {
    throw new Error('Scholarship object is required for eligibility check');
  }
  
  // Extract profile and criteria with defaults
  const profile = user.studentProfile || user;
  const criteria = scholarship.eligibilityCriteria || {};
  const customConditions = criteria.customConditions || [];
  
  try {
    const eligibilityEngine = getEngine();
    
    // Check standard conditions
    const result = eligibilityEngine.check(profile, criteria);
    
    // Process custom conditions if any
    const customResults = processCustomConditions(profile, customConditions);
    
    // Merge custom results with standard results
    const allChecks = [...result.checks, ...customResults.checks];
    const allPassed = result.passed && customResults.passed;
    const totalChecks = result.summary.total + customResults.checks.length;
    const passedChecks = result.summary.passed + customResults.checks.filter(c => c.passed).length;
    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
    
    // Transform to match the expected output format
    return {
      passed: allPassed,
      score,
      checks: allChecks,
      summary: {
        total: totalChecks,
        passed: passedChecks,
        failed: totalChecks - passedChecks,
        percentage: score
      },
      breakdown: {
        range: {
          checks: result.byType.range || [],
          passed: (result.byType.range || []).every(c => c.passed),
          count: (result.byType.range || []).length,
          passedCount: (result.byType.range || []).filter(c => c.passed).length
        },
        list: {
          checks: result.byType.list || [],
          passed: (result.byType.list || []).every(c => c.passed),
          count: (result.byType.list || []).length,
          passedCount: (result.byType.list || []).filter(c => c.passed).length
        },
        boolean: {
          checks: result.byType.boolean || [],
          passed: (result.byType.boolean || []).every(c => c.passed),
          count: (result.byType.boolean || []).length,
          passedCount: (result.byType.boolean || []).filter(c => c.passed).length
        },
        custom: {
          checks: customResults.checks,
          passed: customResults.passed,
          count: customResults.checks.length,
          passedCount: customResults.checks.filter(c => c.passed).length
        }
      },
      categories: result.byCategory,
      failedRequired: [...result.failedRequired, ...customResults.failedRequired],
      metadata: {
        ...result.metadata,
        scholarshipId: scholarship._id?.toString() || scholarship.id || null,
        userId: user._id?.toString() || user.id || null,
        customConditionsCount: customConditions.length
      }
    };
  } catch (error) {
    console.error('Eligibility check error:', error);
    
    return {
      passed: false,
      score: 0,
      checks: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        percentage: 0
      },
      breakdown: {
        range: { checks: [], passed: false, count: 0, passedCount: 0 },
        list: { checks: [], passed: false, count: 0, passedCount: 0 },
        boolean: { checks: [], passed: false, count: 0, passedCount: 0 }
      },
      categories: {},
      error: error.message,
      metadata: {
        checkedAt: new Date().toISOString(),
        scholarshipId: scholarship?._id?.toString() || null,
        userId: user?._id?.toString() || null
      }
    };
  }
}

/**
 * Quick eligibility check - returns just pass/fail
 * Useful for filtering large numbers of scholarships
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {boolean} Whether the student is eligible
 */
function quickCheck(user, scholarship) {
  if (!user || !scholarship) {
    return false;
  }
  
  const profile = user.studentProfile || user;
  const criteria = scholarship.eligibilityCriteria || {};
  
  return getEngine().quickCheck(profile, criteria);
}

/**
 * Get detailed eligibility breakdown by category
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Object} Eligibility breakdown by category
 */
async function getEligibilityBreakdown(user, scholarship) {
  const result = await checkEligibility(user, scholarship);
  
  return {
    passed: result.passed,
    score: result.score,
    academic: result.categories?.academic || [],
    financial: result.categories?.financial || [],
    status: result.categories?.status || [],
    location: result.categories?.location || [],
    demographic: result.categories?.demographic || [],
    blockers: result.failedRequired || []
  };
}

/**
 * Check multiple scholarships for a single user
 * Returns sorted results with eligibility status
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Array} scholarships - Array of scholarship objects
 * @returns {Array} Array of {scholarship, eligibility} objects, sorted by score
 */
async function checkMultipleScholarships(user, scholarships) {
  if (!user || !Array.isArray(scholarships)) {
    return [];
  }
  
  const results = await Promise.all(
    scholarships.map(async (scholarship) => {
      const eligibility = await checkEligibility(user, scholarship);
      return {
        scholarship,
        eligibility,
        passed: eligibility.passed,
        score: eligibility.score
      };
    })
  );
  
  // Sort by eligibility (passed first), then by score
  return results.sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? -1 : 1;
    return b.score - a.score;
  });
}

/**
 * Get the eligibility engine for advanced usage
 * Allows registering custom conditions
 */
function getEligibilityEngine() {
  return getEngine();
}

/**
 * Reset the engine (useful for testing)
 */
function resetEngine() {
  _engine = engine.createEngine();
  return _engine;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Main functions
  checkEligibility,
  quickCheck,
  getEligibilityBreakdown,
  checkMultipleScholarships,
  
  // Engine access
  getEligibilityEngine,
  resetEngine,
  
  // Organized modules
  types,
  conditions,
  utils,
  engine,
  
  // Types (re-exported for convenience)
  ConditionType: types.ConditionType,
  RangeOperator: types.RangeOperator,
  BooleanOperator: types.BooleanOperator,
  ListOperator: types.ListOperator,
  ConditionCategory: types.ConditionCategory,
  ImportanceLevel: types.ImportanceLevel,
  
  // Condition classes (for creating custom conditions)
  BaseCondition: conditions.BaseCondition,
  RangeCondition: conditions.RangeCondition,
  BooleanCondition: conditions.BooleanCondition,
  ListCondition: conditions.ListCondition,
  
  // Engine
  EligibilityEngine: engine.EligibilityEngine,
  
  // Utilities
  normalizers: utils.normalizers,
  normalizeSTBracket: utils.normalizeSTBracket,
  stBracketsMatch: utils.stBracketsMatch,
  normalizeYearLevel: utils.normalizeYearLevel,
  normalizeCollege: utils.normalizeCollege,
  
  // Factory
  createEngine: engine.createEngine
};
