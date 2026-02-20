// ============================================================================
// ISKOlarship - Core Prediction Logic
// Main prediction functions and model calculations
// ============================================================================

import { StudentProfile, Scholarship } from '../../types';
import { ModelWeights, FeatureVector, PredictionResult } from './types';
import { SCORING } from './constants';
import { extractFeatures } from './features';
import { generatePredictionFactors, getRecommendation } from './factors';
import { fetchModelWeights } from './modelCache';
import { getApiPrediction } from './api';

// ============================================================================
// LEGACY MODEL WEIGHTS (for backward compatibility with local prediction)
// ============================================================================

const MODEL_WEIGHTS = {
  intercept: 0.0,
  gwa: 1.0,
  yearLevelNumeric: 1.0,
  incomeNormalized: -1.0,
  stBracketNumeric: 1.0,
  collegeMatch: 1.0,
  courseMatch: 1.0,
  majorMatch: 1.0,
  meetsIncomeReq: 1.0,
  meetsGWAReq: 1.0,
  profileCompleteness: 1.0
};

// ============================================================================
// MATHEMATICAL FUNCTIONS
// ============================================================================

/**
 * Sigmoid function for probability calculation
 */
export const sigmoid = (z: number): number => {
  return 1 / (1 + Math.exp(-z));
};

/**
 * Calculate prediction probability using legacy weights
 */
const predictProbability = (features: FeatureVector): number => {
  const z = MODEL_WEIGHTS.intercept +
    MODEL_WEIGHTS.gwa * features.gwa +
    MODEL_WEIGHTS.yearLevelNumeric * features.yearLevelNumeric +
    MODEL_WEIGHTS.incomeNormalized * features.incomeNormalized +
    MODEL_WEIGHTS.stBracketNumeric * features.stBracketNumeric +
    MODEL_WEIGHTS.collegeMatch * features.collegeMatch +
    MODEL_WEIGHTS.courseMatch * features.courseMatch +
    MODEL_WEIGHTS.majorMatch * features.majorMatch +
    MODEL_WEIGHTS.meetsIncomeReq * features.meetsIncomeReq +
    MODEL_WEIGHTS.meetsGWAReq * features.meetsGWAReq +
    MODEL_WEIGHTS.profileCompleteness * features.profileCompleteness;
  
  return sigmoid(z);
};

// ============================================================================
// LOCAL PREDICTION (Fallback)
// ============================================================================

/**
 * Client-side prediction (fallback when API is unavailable)
 */
export const predictScholarshipSuccessLocal = (
  student: StudentProfile,
  scholarship: Scholarship
): PredictionResult => {
  // Safety check for undefined inputs
  if (!student || !scholarship) {
    return {
      probability: 0,
      percentageScore: 0,
      confidence: 'low',
      factors: [],
      recommendation: 'Unable to calculate prediction - missing student or scholarship data.',
      trainedModel: false
    };
  }

  // Ensure eligibilityCriteria exists
  if (!scholarship.eligibilityCriteria) {
    scholarship = {
      ...scholarship,
      eligibilityCriteria: {}
    } as Scholarship;
  }

  // Extract features
  const features = extractFeatures(student, scholarship);
  
  // Calculate probability
  const probability = predictProbability(features);
  const percentageScore = Math.round(probability * 100);
  
  // Generate explanation factors
  const factors = generatePredictionFactors(student, scholarship, features, probability);
  
  // Determine confidence level based on profile completeness
  const confidence: 'high' | 'medium' | 'low' = 
    student.profileCompleted ? 'high' :
    student.gwa && student.annualFamilyIncome ? 'medium' : 'low';
  
  return {
    probability,
    percentageScore,
    confidence,
    factors,
    recommendation: getRecommendation(percentageScore),
    trainedModel: false
  };
};

// ============================================================================
// MAIN PREDICTION FUNCTION (Sync)
// ============================================================================

/**
 * Main prediction function - synchronous version
 * For async API prediction, use predictScholarshipSuccessAsync
 */
export const predictScholarshipSuccess = (
  student: StudentProfile,
  scholarship: Scholarship
): PredictionResult => {
  return predictScholarshipSuccessLocal(student, scholarship);
};

// ============================================================================
// ASYNC PREDICTION WITH TRAINED MODEL
// ============================================================================

/**
 * Async prediction function - uses trained model weights
 * 
 * Two-case model loading strategy:
 * 1. PRIMARY: Scholarship-specific model (if sufficient historical data exists)
 * 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
 * 
 * Returns error state if no trained model is available.
 */
export const predictScholarshipSuccessAsync = async (
  student: StudentProfile,
  scholarship: Scholarship
): Promise<PredictionResult> => {
  // Try API prediction first if user is authenticated
  if (scholarship.id) {
    try {
      const apiResult = await getApiPrediction(scholarship.id);
      if (apiResult) {
        const percentageScore = Math.round(apiResult.probability * 100);
        return {
          probability: apiResult.probability,
          percentageScore,
          confidence: apiResult.confidence,
          factors: apiResult.factors,
          recommendation: getRecommendation(percentageScore),
          trainedModel: true,
          modelType: (apiResult.modelType as any) || 'unknown'
        };
      }
    } catch (error) {
    }
    
    // Try to get trained model weights for local prediction
    try {
      const dynamicWeights = await fetchModelWeights(scholarship.id);
      if (dynamicWeights) {
        const result = predictWithDynamicWeights(student, scholarship, dynamicWeights);
        return {
          ...result,
          trainedModel: true
        };
      }
    } catch (error) {
      console.warn('No trained model available:', error);
    }
  }
  
  // NO trained model available - return error state instead of silent fallback
  console.warn('No trained model available. Please train a global model first.');
  return {
    probability: 0,
    percentageScore: 0,
    confidence: 'low',
    factors: [{
      factor: 'Model Not Available',
      contribution: 0,
      description: 'No trained prediction model is available. Please contact an administrator.'
    }],
    recommendation: 'Prediction unavailable. A trained model is required. Please contact an administrator to train the global model.',
    trainedModel: false,
    modelType: 'none'
  };
};

// ============================================================================
// DYNAMIC WEIGHTS PREDICTION
// ============================================================================

/**
 * Predict using dynamic weights from trained model
 * Feature scoring matches training.service.js for consistency
 */
export const predictWithDynamicWeights = (
  student: StudentProfile,
  scholarship: Scholarship,
  weights: ModelWeights
): PredictionResult => {
  // Safety check for undefined inputs
  if (!student || !scholarship) {
    return {
      probability: 0,
      percentageScore: 0,
      confidence: 'low',
      factors: [],
      recommendation: 'Unable to calculate prediction - missing student or scholarship data.',
      trainedModel: true
    };
  }

  // Ensure eligibilityCriteria exists
  const criteria = scholarship.eligibilityCriteria || {} as any;
  
  // Extract features - STANDARDIZED SCORING (synchronized with backend)
  const studentGwa = student.gwa ?? 2.5;
  const gwaNormalized = (5 - studentGwa) / 4; // 0-1, higher is better GWA
  
  // Year level match - STANDARDIZED SCORING
  const yearLevels = criteria.requiredYearLevels || criteria.eligibleClassifications || [];
  const yearLevelMatch = yearLevels.length > 0
    ? (student.yearLevel && yearLevels.includes(student.yearLevel) ? SCORING.MATCH : SCORING.MISMATCH)
    : SCORING.NO_RESTRICTION;
    
  // Income match - STANDARDIZED SCORING
  let incomeMatch: number;
  if (criteria.maxAnnualFamilyIncome) {
    const income = student.annualFamilyIncome ?? 0;
    if (income === 0) {
      incomeMatch = SCORING.UNKNOWN;
    } else if (income <= criteria.maxAnnualFamilyIncome) {
      // Meets requirement - lower income = higher score (0.9 to 1.0 range)
      incomeMatch = 0.9 + (1 - (income / criteria.maxAnnualFamilyIncome)) * 0.1;
    } else {
      incomeMatch = SCORING.MISMATCH;
    }
  } else {
    incomeMatch = SCORING.NO_RESTRICTION;
  }
  
  // ST bracket match - STANDARDIZED SCORING
  const stBrackets = criteria.requiredSTBrackets || criteria.eligibleSTBrackets || [];
  let stBracketMatch: number;
  if (stBrackets.length > 0) {
    const normalizedBracket = (student.stBracket || '').toLowerCase().replace(/\s+/g, '');
    const isMatch = stBrackets.some((b: string) => {
      const nb = b.toLowerCase().replace(/\s+/g, '');
      return normalizedBracket === nb || normalizedBracket.includes(nb);
    });
    if (isMatch) {
      // Use standardized bracket scoring
      const bracketScores: Record<string, number> = {
        'fulldiscountwithstipend': SCORING.MATCH,
        'full discount with stipend': SCORING.MATCH,
        'fulldiscount': 0.95,
        'full discount': 0.95,
        'pd80': 0.9,
        '80% partial discount': 0.9,
        'pd60': SCORING.MISMATCH,
        '60% partial discount': SCORING.MISMATCH,
        'pd40': SCORING.MISMATCH,
        '40% partial discount': SCORING.MISMATCH,
        'pd20': SCORING.MISMATCH,
        '20% partial discount': SCORING.MISMATCH,
        'nodiscount': SCORING.MISMATCH,
        'no discount': SCORING.MISMATCH
      };
      stBracketMatch = bracketScores[normalizedBracket] || SCORING.MATCH;
    } else {
      stBracketMatch = SCORING.MISMATCH;
    }
  } else {
    stBracketMatch = SCORING.NO_RESTRICTION;
  }
    
  // College match - STANDARDIZED SCORING
  let collegeMatch: number;
  if (criteria.eligibleColleges && criteria.eligibleColleges.length > 0) {
    const normalizedCollege = (student.college || '').toLowerCase();
    const isMatch = criteria.eligibleColleges.some((c: string) => {
      const nc = c.toLowerCase();
      return normalizedCollege.includes(nc) || nc.includes(normalizedCollege);
    });
    collegeMatch = isMatch ? SCORING.MATCH : SCORING.MISMATCH;
  } else {
    collegeMatch = SCORING.NO_RESTRICTION;
  }
    
  // Course match - STANDARDIZED SCORING
  let courseMatch: number;
  if (criteria.eligibleCourses && criteria.eligibleCourses.length > 0) {
    const normalizedCourse = (student.course || '').toLowerCase();
    const isMatch = criteria.eligibleCourses.some((c: string) => {
      const nc = c.toLowerCase();
      return normalizedCourse.includes(nc) || nc.includes(normalizedCourse);
    });
    courseMatch = isMatch ? SCORING.MATCH : SCORING.MISMATCH;
  } else {
    courseMatch = SCORING.NO_RESTRICTION;
  }
  
  // Citizenship match - STANDARDIZED SCORING
  let citizenshipMatch: number;
  const eligibleCitizenship = (criteria as any).eligibleCitizenship as string[] | undefined;
  if (eligibleCitizenship && eligibleCitizenship.length > 0) {
    const normalizedCitizenship = (student.citizenship || '').toLowerCase();
    const isMatch = eligibleCitizenship.some((c: string) => 
      normalizedCitizenship === c.toLowerCase()
    );
    citizenshipMatch = isMatch ? SCORING.MATCH : SCORING.MISMATCH;
  } else if (criteria.isFilipinoOnly || criteria.filipinoOnly) {
    citizenshipMatch = student.citizenship === 'Filipino' ? SCORING.MATCH : SCORING.MISMATCH;
  } else {
    citizenshipMatch = SCORING.NO_RESTRICTION;
  }
    
  // Document completeness - STANDARDIZED SCORING
  const documentCompleteness = student.profileCompleted ? SCORING.PROFILE_COMPLETE : SCORING.PROFILE_INCOMPLETE;
  
  // Application timing - STANDARDIZED SCORING
  const applicationTiming = SCORING.TIMING_DEFAULT;
  
  // Calculate eligibility score (percentage of explicit criteria met)
  let matchedCriteria = 0;
  let totalCriteria = 0;
  
  if (criteria.maxGWA) {
    totalCriteria++;
    if (studentGwa <= criteria.maxGWA) matchedCriteria++;
  }
  if (criteria.maxAnnualFamilyIncome) {
    totalCriteria++;
    if ((student.annualFamilyIncome ?? 0) <= criteria.maxAnnualFamilyIncome) matchedCriteria++;
  }
  if (yearLevels.length > 0) {
    totalCriteria++;
    if (yearLevelMatch === SCORING.MATCH) matchedCriteria++;
  }
  if (criteria.eligibleColleges && criteria.eligibleColleges.length > 0) {
    totalCriteria++;
    if (collegeMatch === SCORING.MATCH) matchedCriteria++;
  }
  if (criteria.eligibleCourses && criteria.eligibleCourses.length > 0) {
    totalCriteria++;
    if (courseMatch === SCORING.MATCH) matchedCriteria++;
  }
  
  // Eligibility score - raw proportion of criteria matched
  const eligibilityScore = totalCriteria > 0 ? matchedCriteria / totalCriteria : 0.5;

  // Calculate z using base feature weights (model intercept handles calibration)
  const z = weights.intercept +
    weights.gwaScore * gwaNormalized +
    weights.yearLevelMatch * yearLevelMatch +
    weights.incomeMatch * incomeMatch +
    weights.stBracketMatch * stBracketMatch +
    weights.collegeMatch * collegeMatch +
    weights.courseMatch * courseMatch +
    weights.citizenshipMatch * citizenshipMatch +
    weights.documentCompleteness * documentCompleteness +
    weights.eligibilityScore * eligibilityScore;
  
  // Temperature scaling to spread predictions (matches backend PREDICTION_TEMPERATURE)
  const PREDICTION_TEMPERATURE = 2.0;
  const probability = sigmoid(z / PREDICTION_TEMPERATURE);
  const percentageScore = Math.round(probability * 100);
  
  // Extract features for factor generation
  const features = extractFeatures(student, scholarship);
  
  // Generate explanation factors with trained weights
  const factors = generatePredictionFactors(student, scholarship, features, probability, weights);
  
  // Determine confidence level
  const confidence: 'high' | 'medium' | 'low' = 
    student.profileCompleted ? 'high' :
    student.gwa && student.annualFamilyIncome ? 'medium' : 'low';
  
  return {
    probability,
    percentageScore,
    confidence,
    factors,
    recommendation: getRecommendation(percentageScore),
    trainedModel: true
  };
};
