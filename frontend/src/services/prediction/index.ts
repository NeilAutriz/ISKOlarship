// ============================================================================
// ISKOlarship - Prediction Module
// Modular logistic regression prediction service
// ============================================================================
//
// This module is organized into the following files:
//
// - types.ts       : Type definitions (ModelWeights, FeatureVector, PredictionResult)
// - constants.ts   : Scoring constants and configuration
// - modelCache.ts  : Model weights caching and fetching from backend
// - features.ts    : Feature extraction from student profiles
// - factors.ts     : Prediction factor generation and explanations
// - api.ts         : Backend API prediction functions
// - prediction.ts  : Core prediction logic and calculations
//
// ============================================================================

// Re-export types
export type { 
  ModelWeights, 
  FeatureVector, 
  PredictionResult,
  ApiPredictionResult 
} from './types';

// Re-export constants
export { 
  SCORING, 
  MIN_ACCURACY_THRESHOLD, 
  EXPECTED_POSITIVE_FEATURES,
  CACHE_TTL 
} from './constants';

// Re-export model cache functions
export { 
  fetchModelWeights, 
  clearModelWeightsCache,
  isModelCached,
  validateTrainedWeights 
} from './modelCache';

// Re-export feature engineering
export { 
  extractFeatures,
  yearLevelToNumeric,
  stBracketToNumeric,
  normalizeGWA,
  normalizeIncome,
  getSTBracketScore
} from './features';

// Re-export factor generation
export { 
  generatePredictionFactors,
  getRecommendation 
} from './factors';

// Re-export API functions
export { getApiPrediction } from './api';

// Re-export main prediction functions
export {
  predictScholarshipSuccess,
  predictScholarshipSuccessAsync,
  predictScholarshipSuccessLocal,
  predictWithDynamicWeights,
  sigmoid
} from './prediction';
