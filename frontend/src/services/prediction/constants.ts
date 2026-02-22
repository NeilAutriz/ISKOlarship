// ============================================================================
// ISKOlarship - Prediction Constants
// Standardized scoring constants (synchronized with backend services)
// ============================================================================

// ============================================================================
// STANDARDIZED SCORING CONSTANTS
// These values are synchronized with backend/src/services/training.service.js
// ============================================================================

export const SCORING = {
  MATCH: 0.85,           // Feature matches requirement (synced with backend)
  MISMATCH: 0.15,        // Feature doesn't match (synced with backend)
  NO_RESTRICTION: 0.50,  // No requirement specified (synced with backend)
  UNKNOWN: 0.50,         // Value not provided by student (synced with backend)
  TIMING_DEFAULT: 0.50,
  ELIGIBILITY_FLOOR: 0.0,
  ELIGIBILITY_RANGE: 1.0,
  CALIBRATION_OFFSET: 0.0
} as const;

// ============================================================================
// MODEL VALIDATION CONSTANTS
// ============================================================================

// Minimum accuracy threshold to use trained weights (55% - slightly above random)
export const MIN_ACCURACY_THRESHOLD = 0.55;

// Features that should typically be positive (used for adjustment)
export const EXPECTED_POSITIVE_FEATURES = [
  'eligibilityScore', 
  'gwaScore', 
  'incomeMatch', 
  'citizenshipMatch'
];

// Cache TTL for model weights (5 minutes)
export const CACHE_TTL = 5 * 60 * 1000;

// ============================================================================
// MODEL LOADING STRATEGY
// ============================================================================
// 1. PRIMARY: Scholarship-specific model (if scholarship has sufficient historical data)
// 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
// 
// NO neutral/default weights for actual predictions.
// A trained model MUST exist on the backend for predictions to work.
// ============================================================================
