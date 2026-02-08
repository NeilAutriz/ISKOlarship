// =============================================================================
// ISKOlarship - Prediction Constants
// Standardized scoring constants and model configuration
// =============================================================================

/**
 * SCORING CONSTANTS
 * Single source of truth for feature scoring values.
 * Training and prediction MUST use identical values.
 */
const SCORING = {
  MATCH: 0.65,
  MISMATCH: 0.15,
  NO_RESTRICTION: 0.3,
  UNKNOWN: 0.50,
  PROFILE_COMPLETE: 0.60,
  PROFILE_INCOMPLETE: 0.20,
  TIMING_DEFAULT: 0.30
};

/**
 * FEATURE NAMES
 */
const FEATURE_NAMES = {
  base: [
    'gwaScore', 'yearLevelMatch', 'incomeMatch', 'stBracketMatch',
    'collegeMatch', 'courseMatch', 'citizenshipMatch',
    'documentCompleteness', 'applicationTiming', 'eligibilityScore'
  ],
  interaction: [
    'academicStrength', 'financialNeed', 'programFit',
    'applicationQuality', 'overallFit'
  ],
  get all() { return [...this.base, ...this.interaction]; }
};

/**
 * FACTOR LABELS - Human-readable names for each feature
 */
const FACTOR_LABELS = {
  gwaScore: 'GWA Score',
  yearLevelMatch: 'Year Level',
  incomeMatch: 'Family Income',
  stBracketMatch: 'ST Bracket',
  collegeMatch: 'College',
  courseMatch: 'Course',
  citizenshipMatch: 'Citizenship',
  documentCompleteness: 'Profile Completeness',
  applicationTiming: 'Application Timing',
  eligibilityScore: 'Eligibility Score',
  academicStrength: 'Academic Strength',
  financialNeed: 'Financial Need',
  programFit: 'Program Fit',
  applicationQuality: 'Application Quality',
  overallFit: 'Overall Fit'
};

/**
 * FEATURE DESCRIPTIONS - Detailed descriptions for each feature
 */
const FEATURE_DESCRIPTIONS = {
  gwaScore: 'Normalized GWA score relative to scholarship requirement',
  yearLevelMatch: 'Whether student year level matches scholarship criteria',
  incomeMatch: 'Family income relative to scholarship income cap',
  stBracketMatch: 'Socialized tuition bracket match with criteria',
  collegeMatch: 'Whether student college is eligible',
  courseMatch: 'Whether student course is eligible',
  citizenshipMatch: 'Whether citizenship meets requirements',
  documentCompleteness: 'Profile and document completion status',
  applicationTiming: 'Application submission timing',
  eligibilityScore: 'Overall eligibility criteria match percentage'
};

/**
 * FEATURE DISPLAY NAMES - For training service display
 */
const FEATURE_DISPLAY_NAMES = {
  gwaScore: 'GWA Score',
  yearLevelMatch: 'Year Level Match',
  incomeMatch: 'Income Match',
  stBracketMatch: 'ST Bracket Match',
  collegeMatch: 'College Match',
  courseMatch: 'Course Match',
  citizenshipMatch: 'Citizenship Match',
  documentCompleteness: 'Document Completeness',
  applicationTiming: 'Application Timing',
  eligibilityScore: 'Eligibility Score',
  academicStrength: 'Academic Strength',
  financialNeed: 'Financial Need',
  programFit: 'Program Fit',
  applicationQuality: 'Application Quality',
  overallFit: 'Overall Fit'
};

/**
 * FEATURE CATEGORIES - Group features by category
 */
const FEATURE_CATEGORIES = {
  academic: ['gwaScore', 'yearLevelMatch'],
  financial: ['incomeMatch', 'stBracketMatch'],
  eligibility: ['collegeMatch', 'courseMatch', 'citizenshipMatch'],
  application: ['documentCompleteness', 'applicationTiming', 'eligibilityScore']
};

/**
 * MODEL CONFIGURATION
 * Feature names, categories, and descriptions for the prediction model
 */
const MODEL_CONFIG = {
  // Feature names used by TrainedModel for predictions
  featureNames: FEATURE_NAMES.base,

  // Categorize features for display
  featureCategories: {
    'Academic Performance': ['gwaScore', 'yearLevelMatch'],
    'Financial Need': ['incomeMatch', 'stBracketMatch'],
    'Eligibility': ['collegeMatch', 'courseMatch', 'citizenshipMatch'],
    'Application Quality': ['documentCompleteness', 'eligibilityScore']
  },

  // Human-readable feature descriptions
  featureDescriptions: FEATURE_DESCRIPTIONS
};

module.exports = {
  SCORING,
  FEATURE_NAMES,
  FACTOR_LABELS,
  FEATURE_DESCRIPTIONS,
  FEATURE_DISPLAY_NAMES,
  FEATURE_CATEGORIES,
  MODEL_CONFIG
};
