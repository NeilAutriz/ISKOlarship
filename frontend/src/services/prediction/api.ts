// ============================================================================
// ISKOlarship - API Prediction
// Backend API-based prediction functions
// ============================================================================

import { PredictionFactor } from '../../types';
import { predictionApi } from '../apiClient';
import { ApiPredictionResult } from './types';

// ============================================================================
// API PREDICTION
// ============================================================================

/**
 * Get prediction from backend API (uses trained model)
 * This is the primary method when the user is authenticated
 */
export const getApiPrediction = async (
  scholarshipId: string
): Promise<ApiPredictionResult | null> => {
  try {
    const response = await predictionApi.getProbability(scholarshipId);
    if (response.success && response.data) {
      const data = response.data as any;
      return {
        probability: data.probability || 0.5,
        factors: data.factors?.map((f: any) => ({
          factor: f.factor || f.name,
          contribution: f.contribution || 0,
          description: f.description || ''
        })) || [],
        trainedModel: data.trainedModel || false,
        confidence: data.confidence || 'medium',
        modelType: data.modelType
      };
    }
    return null;
  } catch (error) {
    console.error('API prediction failed, falling back to client-side:', error);
    return null;
  }
};
