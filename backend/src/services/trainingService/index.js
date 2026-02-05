// =============================================================================
// Training Service - Main Entry Point
// Re-exports all public functions for backward compatibility
// =============================================================================

// Configuration and Constants
const {
  SCORING_CONFIG,
  TRAINING_CONFIG,
  FEATURE_DISPLAY_NAMES,
  FEATURE_CATEGORIES
} = require('./constants');

// Seeded Random Number Generator
const {
  SeededRandom,
  getSeededRandom,
  resetSeededRandom
} = require('./seededRandom');

// Feature Extraction
const {
  normalizeGWA,
  checkYearLevelMatch,
  checkIncomeMatch,
  checkSTBracketMatch,
  checkCollegeMatch,
  checkCourseMatch,
  checkCitizenshipMatch,
  calculateDocumentCompleteness,
  calculateApplicationTiming,
  extractFeatures,
  extractFeaturesFromUserAndScholarship
} = require('./featureExtraction');

// Mathematical Functions
const {
  sigmoid,
  binaryCrossEntropy,
  dotProduct,
  shuffleArraySeeded,
  shuffleArray
} = require('./mathFunctions');

// Validation
const {
  createKFolds,
  calculateAverageMetrics,
  calculateAccuracyStd,
  averageWeights,
  averageBiases
} = require('./validation');

// Model Training
const {
  initializeWeights,
  trainModel,
  evaluateModel,
  calculateFeatureImportance
} = require('./modelTraining');

// Training API (main exported functions)
const {
  trainGlobalModel,
  trainScholarshipModel,
  trainAllScholarshipModels,
  getPrediction,
  getTrainingStats
} = require('./trainingApi');

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Main API Functions (backward compatible)
  trainGlobalModel,
  trainScholarshipModel,
  trainAllScholarshipModels,
  getPrediction,
  getTrainingStats,
  extractFeatures,
  extractFeaturesFromUserAndScholarship,
  
  // Configuration (backward compatible)
  TRAINING_CONFIG,
  FEATURE_DISPLAY_NAMES,
  FEATURE_CATEGORIES,
  
  // Additional exports for advanced usage
  SCORING_CONFIG,
  SeededRandom,
  getSeededRandom,
  resetSeededRandom,
  
  // Feature extraction utilities
  normalizeGWA,
  checkYearLevelMatch,
  checkIncomeMatch,
  checkSTBracketMatch,
  checkCollegeMatch,
  checkCourseMatch,
  checkCitizenshipMatch,
  calculateDocumentCompleteness,
  calculateApplicationTiming,
  
  // Mathematical functions
  sigmoid,
  binaryCrossEntropy,
  dotProduct,
  shuffleArraySeeded,
  shuffleArray,
  
  // Validation utilities
  createKFolds,
  calculateAverageMetrics,
  calculateAccuracyStd,
  averageWeights,
  averageBiases,
  
  // Model training utilities
  initializeWeights,
  trainModel,
  evaluateModel,
  calculateFeatureImportance
};
