// =============================================================================
// Training Service - Constants and Configuration
// Centralized configuration for training service
// =============================================================================

const {
  SCORING,
  FEATURE_NAMES,
  FEATURE_DISPLAY_NAMES,
  FEATURE_CATEGORIES
} = require('../logisticRegressionCore/constants');

/**
 * Backward-compatible alias: SCORING_CONFIG === SCORING
 * Both training and prediction now share the same scoring constants
 * from the single source of truth at logisticRegressionCore/constants.js.
 */
const SCORING_CONFIG = SCORING;

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
  baseFeatureNames: FEATURE_NAMES.base,
  featureNames: FEATURE_NAMES.all
};

module.exports = {
  SCORING_CONFIG,
  TRAINING_CONFIG,
  FEATURE_DISPLAY_NAMES,
  FEATURE_CATEGORIES
};
