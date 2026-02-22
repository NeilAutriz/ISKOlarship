// ============================================================================
// ISKOlarship - Model Cache
// Handles fetching and caching of trained model weights
// ============================================================================

import { trainingApi } from '../apiClient';
import { ModelWeights } from './types';
import { MIN_ACCURACY_THRESHOLD, EXPECTED_POSITIVE_FEATURES, CACHE_TTL } from './constants';

// ============================================================================
// CACHE STATE
// ============================================================================

// Cache for trained model weights
const modelWeightsCache: Map<string, ModelWeights> = new Map();
const cacheExpiry: Map<string, number> = new Map();

// ============================================================================
// WEIGHT VALIDATION
// ============================================================================

/**
 * Validate trained weights and adjust problematic negative weights
 * Uses the model's own learned magnitudes for adjustment
 */
export const validateTrainedWeights = (
  modelData: any
): { weights: ModelWeights; isAdjusted: boolean; adjustments: string[] } | null => {
  const adjustments: string[] = [];
  
  // Check model accuracy
  const accuracy = modelData.metrics?.accuracy || modelData.accuracy || 0;
  if (accuracy < MIN_ACCURACY_THRESHOLD) {
    console.warn(`Model accuracy (${(accuracy * 100).toFixed(1)}%) below threshold (${MIN_ACCURACY_THRESHOLD * 100}%)`);
    return null;
  }
  
  // Extract raw weights
  const rawWeights = modelData.weights || {};
  
  // Build adjusted weights
  const adjustedWeights: ModelWeights = {
    intercept: rawWeights.intercept ?? modelData.bias ?? 0.0,
    eligibilityScore: rawWeights.eligibilityScore ?? 1.0,
    gwaScore: rawWeights.gwaScore ?? 1.0,
    incomeMatch: rawWeights.incomeMatch ?? 1.0,
    stBracketMatch: rawWeights.stBracketMatch ?? 1.0,
    collegeMatch: rawWeights.collegeMatch ?? 1.0,
    courseMatch: rawWeights.courseMatch ?? 1.0,
    yearLevelMatch: rawWeights.yearLevelMatch ?? 1.0,
    citizenshipMatch: rawWeights.citizenshipMatch ?? 1.0,
    applicationTiming: rawWeights.applicationTiming ?? 1.0
  };
  
  // Adjust problematic negative weights using absolute values
  for (const key of EXPECTED_POSITIVE_FEATURES) {
    const value = adjustedWeights[key as keyof ModelWeights];
    if (typeof value === 'number' && value < 0) {
      const absValue = Math.abs(value);
      adjustedWeights[key as keyof ModelWeights] = absValue;
      adjustments.push(`${key}: ${value.toFixed(2)} → ${absValue.toFixed(2)}`);
    }
  }
  
  if (adjustments.length > 0) {
  }
  
  return {
    weights: adjustedWeights,
    isAdjusted: adjustments.length > 0,
    adjustments
  };
};

// ============================================================================
// FETCH MODEL WEIGHTS
// ============================================================================

/**
 * Fetch model weights from the training API
 * Uses per-scholarship models when available, falls back to global model
 * 
 * Two-case loading strategy:
 * 1. PRIMARY: Scholarship-specific model
 * 2. FALLBACK: Global model
 */
export const fetchModelWeights = async (scholarshipId?: string): Promise<ModelWeights | null> => {
  const cacheKey = scholarshipId || 'global';
  
  // Check cache first
  const cached = modelWeightsCache.get(cacheKey);
  const expiry = cacheExpiry.get(cacheKey);
  if (cached && expiry && Date.now() < expiry) {
    return cached;
  }
  
  try {
    let response;
    
    // CASE 1 (PRIMARY): Try scholarship-specific model first
    if (scholarshipId) {
      response = await trainingApi.getScholarshipModel(scholarshipId);
      if (!response.success || !response.data) {
        // CASE 2 (FALLBACK): Fall back to global model
        response = await trainingApi.getActiveModel();
      }
    } else {
      response = await trainingApi.getActiveModel();
    }
    
    if (response.success && response.data) {
      const modelData = response.data as any;
      
      // Validate and adjust weights
      const validationResult = validateTrainedWeights(modelData);
      
      if (validationResult) {
        const { weights, isAdjusted } = validationResult;
        
        // Cache the validated weights
        modelWeightsCache.set(cacheKey, weights);
        cacheExpiry.set(cacheKey, Date.now() + CACHE_TTL);
        
        return weights;
      } else {
        // Model failed validation
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch model weights:', error);
    return null;
  }
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear the model weights cache (useful when new models are trained)
 */
export const clearModelWeightsCache = (): void => {
  modelWeightsCache.clear();
  cacheExpiry.clear();
};

/**
 * Check if a model is cached for the given scholarship
 */
export const isModelCached = (scholarshipId?: string): boolean => {
  const cacheKey = scholarshipId || 'global';
  const expiry = cacheExpiry.get(cacheKey);
  return Boolean(modelWeightsCache.has(cacheKey) && expiry && Date.now() < expiry);
};
