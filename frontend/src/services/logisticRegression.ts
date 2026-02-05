// ============================================================================
// ISKOlarship - Logistic Regression Prediction Service
// ============================================================================
//
// This file has been modularized for better readability and maintainability.
// All functionality is now in the ./prediction/ folder:
//
// - prediction/types.ts       : Type definitions
// - prediction/constants.ts   : Scoring constants and configuration
// - prediction/modelCache.ts  : Model weights caching and fetching
// - prediction/features.ts    : Feature extraction from student profiles
// - prediction/factors.ts     : Prediction factor generation
// - prediction/api.ts         : Backend API prediction functions
// - prediction/prediction.ts  : Core prediction logic
//
// This file re-exports everything for backward compatibility.
// ============================================================================

// Re-export everything from the prediction module
export {
  // Types
  type ModelWeights,
  type FeatureVector,
  type PredictionResult,
  type ApiPredictionResult,
  
  // Constants
  SCORING,
  MIN_ACCURACY_THRESHOLD,
  EXPECTED_POSITIVE_FEATURES,
  CACHE_TTL,
  
  // Model cache
  fetchModelWeights,
  clearModelWeightsCache,
  isModelCached,
  validateTrainedWeights,
  
  // Feature engineering
  extractFeatures,
  yearLevelToNumeric,
  stBracketToNumeric,
  normalizeGWA,
  normalizeIncome,
  getSTBracketScore,
  
  // Factor generation
  generatePredictionFactors,
  getRecommendation,
  
  // API
  getApiPrediction,
  
  // Main prediction functions
  predictScholarshipSuccess,
  predictScholarshipSuccessAsync,
  predictScholarshipSuccessLocal,
  predictWithDynamicWeights,
  sigmoid
} from './prediction';
