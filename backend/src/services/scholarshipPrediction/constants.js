// =============================================================================
// ISKOlarship - Prediction Service Constants
// Model version, field mappings, and canonical field names
// =============================================================================

/**
 * MODEL VERSION
 * Tracks the version of the prediction model for compatibility
 */
const MODEL_VERSION = '3.0.0';

/**
 * YEAR LEVEL MAPPING
 * Maps canonical classification values to normalized values (0-1)
 */
const YEAR_LEVEL_MAP = {
  'Incoming Freshman': 0.1,
  'Freshman': 0.2,
  'Sophomore': 0.4,
  'Junior': 0.6,
  'Senior': 0.8,
  'Graduate': 1.0
};

/**
 * ST BRACKET MAPPING
 * Maps canonical ST bracket values to normalized financial need scores (0-1)
 * Higher value = higher financial need
 */
const ST_BRACKET_MAP = {
  'Full Discount with Stipend': 1.0,
  'Full Discount': 0.85,
  'PD80': 0.7,
  'PD60': 0.55,
  'PD40': 0.4,
  'PD20': 0.25,
  'No Discount': 0.1
};

/**
 * FIELD NAME DISPLAY MAPPING
 * Maps internal field names to human-readable display names
 */
const FIELD_NAME_MAP = {
  'gwa': 'GWA',
  'classification': 'Year Level',
  'college': 'College',
  'course': 'Course',
  'annualFamilyIncome': 'Annual Family Income',
  'stBracket': 'ST Bracket',
  'householdSize': 'Household Size',
  'unitsPassed': 'Units Passed',
  'unitsEnrolled': 'Units Enrolled'
};

/**
 * REQUIRED PROFILE FIELDS
 * List of fields that should be completed for optimal matching
 */
const REQUIRED_PROFILE_FIELDS = [
  'gwa', 
  'classification', 
  'college', 
  'course', 
  'annualFamilyIncome', 
  'stBracket', 
  'householdSize'
];

/**
 * MATCH LEVEL THRESHOLDS
 * Probability thresholds for categorizing match strength
 */
const MATCH_LEVELS = {
  STRONG: 0.75,
  GOOD: 0.60,
  MODERATE: 0.45,
  WEAK: 0
};

/**
 * Reference values for normalization
 */
const NORMALIZATION_CONSTANTS = {
  MAX_INCOME: 1000000,
  FULL_LOAD_UNITS: 21
};

module.exports = {
  MODEL_VERSION,
  YEAR_LEVEL_MAP,
  ST_BRACKET_MAP,
  FIELD_NAME_MAP,
  REQUIRED_PROFILE_FIELDS,
  MATCH_LEVELS,
  NORMALIZATION_CONSTANTS
};
