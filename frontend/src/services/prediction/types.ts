// ============================================================================
// ISKOlarship - Prediction Types
// Type definitions for the prediction system
// ============================================================================

import { PredictionFactor } from '../../types';

// ============================================================================
// MODEL WEIGHTS INTERFACE
// ============================================================================

export interface ModelWeights {
  intercept: number;
  gwaScore: number;
  yearLevelMatch: number;
  incomeMatch: number;
  stBracketMatch: number;
  collegeMatch: number;
  courseMatch: number;
  citizenshipMatch: number;
  applicationTiming: number;
  eligibilityScore: number;
}

// ============================================================================
// FEATURE VECTOR INTERFACE
// ============================================================================

export interface FeatureVector {
  gwa: number;                    // Normalized GWA (1.0-5.0 scale inverted)
  yearLevelNumeric: number;       // 1-4 for year levels
  incomeNormalized: number;       // Income / max income threshold
  stBracketNumeric: number;       // 0-6 based on discount level
  collegeMatch: number;           // 1 if college matches, 0 otherwise
  courseMatch: number;            // 1 if course matches, 0 otherwise
  majorMatch: number;             // 1 if major matches, 0 otherwise
  meetsIncomeReq: number;         // 1 if under income threshold, 0 otherwise
  meetsGWAReq: number;            // 1 if meets GWA requirement, 0 otherwise
  profileCompleteness: number;    // 0-1 based on profile completion
}

// ============================================================================
// PREDICTION RESULT INTERFACE
// ============================================================================

export interface PredictionResult {
  probability: number;           // 0-1 probability
  percentageScore: number;       // 0-100 percentage
  confidence: 'high' | 'medium' | 'low';
  factors: PredictionFactor[];
  recommendation: string;
  trainedModel?: boolean;        // Whether this used a trained model
  modelType?: 'scholarship_specific' | 'global' | 'none' | 'unknown'; // Type of model used
}

// ============================================================================
// API PREDICTION RESULT
// ============================================================================

export interface ApiPredictionResult {
  probability: number;
  factors: PredictionFactor[];
  trainedModel: boolean;
  confidence: 'high' | 'medium' | 'low';
  modelType?: string;
}
