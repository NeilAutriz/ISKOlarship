// =============================================================================
// Training Service - Constants and Configuration
// Centralized configuration for training service
// =============================================================================

/**
 * Standardized scoring constants (synchronized across all services)
 */
const SCORING_CONFIG = {
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
 * Training configuration parameters
 */
const TRAINING_CONFIG = {
  learningRate: 0.1,         // Increased for faster convergence
  epochs: 500,               // More epochs with early stopping
  batchSize: 8,              // Smaller batches for better gradient estimation
  regularization: 0.0001,    // Very light regularization
  trainTestSplit: 0.8,
  minSamplesGlobal: 50,
  minSamplesPerScholarship: 30,
  convergenceThreshold: 0.00001,
  earlyStoppingPatience: 50, // More patience
  kFolds: 5,                 // 5-fold cross-validation for consistent results
  randomSeed: 42,            // Fixed seed for reproducibility
  // Base features
  baseFeatureNames: [
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
  // All features including interactions
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
    'eligibilityScore',
    // Interaction features
    'academicStrength',      // gwa * yearLevel
    'financialNeed',         // income * stBracket
    'programFit',            // college * course
    'applicationQuality',    // docs * timing
    'overallFit'             // eligibility * academic
  ]
};

/**
 * Feature display names for UI presentation
 */
const FEATURE_DISPLAY_NAMES = {
  gwaScore: 'GWA Score',
  yearLevelMatch: 'Year Level Match',
  incomeMatch: 'Income Eligibility',
  stBracketMatch: 'ST Bracket Match',
  collegeMatch: 'College Match',
  courseMatch: 'Course/Program Match',
  citizenshipMatch: 'Citizenship Match',
  documentCompleteness: 'Document Completeness',
  applicationTiming: 'Application Timing',
  eligibilityScore: 'Overall Eligibility',
  // Interaction features
  academicStrength: 'Academic Strength',
  financialNeed: 'Financial Need',
  programFit: 'Program Fit',
  applicationQuality: 'Application Quality',
  overallFit: 'Overall Fit'
};

/**
 * Feature categories for grouping
 */
const FEATURE_CATEGORIES = {
  gwaScore: 'academic',
  yearLevelMatch: 'academic',
  incomeMatch: 'financial',
  stBracketMatch: 'financial',
  collegeMatch: 'eligibility',
  courseMatch: 'eligibility',
  citizenshipMatch: 'demographic',
  documentCompleteness: 'eligibility',
  applicationTiming: 'other',
  eligibilityScore: 'eligibility',
  // Interaction features
  academicStrength: 'academic',
  financialNeed: 'financial',
  programFit: 'eligibility',
  applicationQuality: 'eligibility',
  overallFit: 'eligibility'
};

module.exports = {
  SCORING_CONFIG,
  TRAINING_CONFIG,
  FEATURE_DISPLAY_NAMES,
  FEATURE_CATEGORIES
};
