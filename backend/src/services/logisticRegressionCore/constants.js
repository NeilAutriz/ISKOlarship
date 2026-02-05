// =============================================================================
// ISKOlarship - Prediction Constants
// Standardized scoring constants and model configuration
// =============================================================================

/**
 * STANDARDIZED SCORING CONSTANTS
 * Synchronized across all prediction services
 */
const SCORING = {
  MATCH: 1.0,           // Feature matches requirement
  MISMATCH: 0.85,       // Feature doesn't match (small penalty)
  NO_RESTRICTION: 0.95, // No requirement specified
  UNKNOWN: 0.85,        // Value not provided by student
  PROFILE_COMPLETE: 1.0,
  PROFILE_INCOMPLETE: 0.9,
  TIMING_DEFAULT: 0.9,
  ELIGIBILITY_FLOOR: 0.7,
  ELIGIBILITY_RANGE: 0.3,
  CALIBRATION_OFFSET: 3.0
};

/**
 * MODEL CONFIGURATION
 * Feature names, categories, and descriptions for the prediction model
 */
const MODEL_CONFIG = {
  // Feature names used by TrainedModel for predictions
  featureNames: [
    'gwaScore',
    'yearLevelMatch',
    'incomeMatch',
    'stBracketMatch',
    'collegeMatch',
    'courseMatch',
    'citizenshipMatch',
    'documentCompleteness',
    'applicationTiming',
    'eligibilityScore'
  ],
  
  // Categorize features for display
  featureCategories: {
    'Academic Performance': ['gwaScore', 'yearLevelMatch'],
    'Financial Need': ['incomeMatch', 'stBracketMatch'],
    'Eligibility': ['collegeMatch', 'courseMatch', 'citizenshipMatch'],
    'Application Quality': ['documentCompleteness', 'eligibilityScore']
  },
  
  // Human-readable feature descriptions
  featureDescriptions: {
    'gwaScore': 'Your General Weighted Average (inverted - lower is better)',
    'yearLevelMatch': 'Whether your year level matches scholarship requirements',
    'incomeMatch': 'Your family income relative to scholarship limits',
    'stBracketMatch': 'Your ST Bracket match with scholarship requirements',
    'collegeMatch': 'Whether your college is eligible',
    'courseMatch': 'Whether your course/major is eligible',
    'citizenshipMatch': 'Whether your citizenship meets requirements',
    'documentCompleteness': 'Completeness of your profile and documents',
    'eligibilityScore': 'Percentage of scholarship criteria you meet'
  }
};

/**
 * FACTOR LABELS
 * Human-readable labels for prediction factors
 */
const FACTOR_LABELS = {
  gwaScore: 'Academic Performance (GWA)',
  yearLevelMatch: 'Year Level',
  incomeMatch: 'Financial Need',
  stBracketMatch: 'ST Bracket',
  collegeMatch: 'College',
  courseMatch: 'Course/Major',
  citizenshipMatch: 'Citizenship',
  documentCompleteness: 'Profile Completeness',
  eligibilityScore: 'Overall Eligibility'
};

module.exports = {
  SCORING,
  MODEL_CONFIG,
  FACTOR_LABELS
};
