// ============================================================================
// ISKOlarship - Logistic Regression Prediction Service
// Implements scholarship success probability prediction based on:
// - Research showing 91% accuracy in Philippine scholarship contexts
// - Features: GWA, year level, income, ST bracket, college
// Note: This service uses trained models from backend API with fallback
// to client-side predictions using default weights
// ============================================================================

import {
  StudentProfile,
  Scholarship,
  HistoricalApplication,
  PredictionFactor,
  YearLevel,
  UPLBCollege,
  STBracket,
  MatchResult
} from '../types';
import { predictionApi, trainingApi } from './apiClient';

// ============================================================================
// DYNAMIC MODEL WEIGHTS CACHE
// Fetched from trained models stored in the database
// ============================================================================

// STANDARDIZED SCORING CONSTANTS (synchronized with backend services)
const SCORING = {
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

interface ModelWeights {
  intercept: number;
  gwaScore: number;
  yearLevelMatch: number;
  incomeMatch: number;
  stBracketMatch: number;
  collegeMatch: number;
  courseMatch: number;
  citizenshipMatch: number;
  documentCompleteness: number;
  applicationTiming: number;
  eligibilityScore: number;
}

// Cache for trained model weights
const modelWeightsCache: Map<string, ModelWeights> = new Map();
const cacheExpiry: Map<string, number> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Minimum accuracy threshold to use trained weights (55% - slightly above random)
const MIN_ACCURACY_THRESHOLD = 0.55;

// Neutral fallback weights (only used when NO trained model exists)
const NEUTRAL_FALLBACK_WEIGHTS: ModelWeights = {
  intercept: SCORING.CALIBRATION_OFFSET, // Use standardized calibration offset
  eligibilityScore: 1.0,
  gwaScore: 1.0,
  incomeMatch: 1.0,
  stBracketMatch: 1.0,
  collegeMatch: 1.0,
  courseMatch: 1.0,
  yearLevelMatch: 1.0,
  citizenshipMatch: 1.0,
  documentCompleteness: 1.0,
  applicationTiming: 1.0
};

// Features that should typically be positive (used for adjustment)
const EXPECTED_POSITIVE_FEATURES = ['eligibilityScore', 'gwaScore', 'incomeMatch', 'citizenshipMatch'];

/**
 * Validate trained weights and adjust problematic negative weights
 * Uses the model's own learned magnitudes for adjustment
 */
const validateTrainedWeights = (
  modelData: any
): { weights: ModelWeights; isAdjusted: boolean; adjustments: string[] } | null => {
  const adjustments: string[] = [];
  
  // Check model accuracy
  const accuracy = modelData.metrics?.accuracy || modelData.accuracy || 0;
  if (accuracy < MIN_ACCURACY_THRESHOLD) {
    console.warn(`Model accuracy (${(accuracy * 100).toFixed(1)}%) below threshold (${MIN_ACCURACY_THRESHOLD * 100}%)`);
    return null; // Use neutral fallback
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
    documentCompleteness: rawWeights.documentCompleteness ?? 1.0,
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
    console.log('⚡ Adjusted negative weights:', adjustments);
  }
  
  return {
    weights: adjustedWeights,
    isAdjusted: adjustments.length > 0,
    adjustments
  };
};

/**
 * Fetch model weights from the training API
 * Uses per-scholarship models when available, falls back to global model
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
    
    // Try to get scholarship-specific model first
    if (scholarshipId) {
      response = await trainingApi.getScholarshipModel(scholarshipId);
      if (!response.success || !response.data) {
        // Fall back to global model
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
        
        console.log(`✅ Loaded ${isAdjusted ? 'adjusted' : 'trained'} ${scholarshipId ? 'scholarship-specific' : 'global'} model weights`);
        
        // Cache the validated weights
        modelWeightsCache.set(cacheKey, weights);
        cacheExpiry.set(cacheKey, Date.now() + CACHE_TTL);
        
        return weights;
      } else {
        // Model failed validation
        console.log('⚠️ Model failed validation, using neutral fallback');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch model weights:', error);
    return null;
  }
};

/**
 * Clear the model weights cache (useful when new models are trained)
 */
export const clearModelWeightsCache = () => {
  modelWeightsCache.clear();
  cacheExpiry.clear();
};

// ============================================================================
// API-BASED PREDICTION (Primary method when authenticated)
// ============================================================================

/**
 * Get prediction from backend API (uses trained model)
 */
export const getApiPrediction = async (
  scholarshipId: string
): Promise<{
  probability: number;
  factors: PredictionFactor[];
  trainedModel: boolean;
  confidence: 'high' | 'medium' | 'low';
} | null> => {
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
        confidence: data.confidence || 'medium'
      };
    }
    return null;
  } catch (error) {
    console.error('API prediction failed, falling back to client-side:', error);
    return null;
  }
};

// ============================================================================
// FEATURE ENGINEERING
// Convert student profiles and scholarship criteria to numerical features
// ============================================================================

interface FeatureVector {
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

const yearLevelToNumeric: Record<YearLevel, number> = {
  [YearLevel.INCOMING_FRESHMAN]: 0,
  [YearLevel.FRESHMAN]: 1,
  [YearLevel.SOPHOMORE]: 2,
  [YearLevel.JUNIOR]: 3,
  [YearLevel.SENIOR]: 4,
  [YearLevel.GRADUATE]: 5
};

const stBracketToNumeric: Record<STBracket, number> = {
  [STBracket.FULL_DISCOUNT_WITH_STIPEND]: 6,
  [STBracket.FULL_DISCOUNT]: 5,
  [STBracket.PD80]: 4,
  [STBracket.PD60]: 3,
  [STBracket.PD40]: 2,
  [STBracket.PD20]: 1,
  [STBracket.NO_DISCOUNT]: 0
};

const extractFeatures = (
  student: StudentProfile,
  scholarship: Scholarship
): FeatureVector => {
  const criteria = scholarship.eligibilityCriteria || {};
  
  // GWA normalization (invert so higher is better: 5-gwa gives 4 for 1.0, 0 for 5.0)
  // Use 2.5 as default if GWA is not available (neutral value)
  const studentGwa = student.gwa ?? 2.5;
  const gwaNormalized = (5 - studentGwa) / 4;
  
  // Year level numeric
  const yearLevelNumeric = yearLevelToNumeric[student.yearLevel] || 1;
  
  // Income normalization (relative to scholarship threshold)
  const maxIncome = criteria.maxAnnualFamilyIncome || 500000;
  const studentIncome = student.annualFamilyIncome ?? 0;
  const incomeNormalized = Math.min(studentIncome / maxIncome, 1);
  
  // ST Bracket numeric
  const stBracketNumeric = student.stBracket 
    ? stBracketToNumeric[student.stBracket] / 6 
    : 0.5;
  
  // College match
  const collegeMatch = !criteria.eligibleColleges || 
    criteria.eligibleColleges.length === 0 ||
    (student.college && criteria.eligibleColleges.includes(student.college)) ? 1 : 0;
  
  // Course match
  const courseMatch = !criteria.eligibleCourses || 
    criteria.eligibleCourses.length === 0 ||
    (student.course && criteria.eligibleCourses.some(c => 
      c && student.course && student.course.toLowerCase().includes(c.toLowerCase())
    )) ? 1 : 0;
  
  // Major match
  const majorMatch = !criteria.eligibleMajors || 
    criteria.eligibleMajors.length === 0 ||
    (student.major && criteria.eligibleMajors.some(m => 
      m && student.major && student.major.toLowerCase().includes(m.toLowerCase())
    )) ? 1 : 0;
  
  // Meets income requirement
  const meetsIncomeReq = !criteria.maxAnnualFamilyIncome || 
    studentIncome <= criteria.maxAnnualFamilyIncome ? 1 : 0;
  
  // Meets GWA requirement (in UPLB, maxGWA is the threshold - student GWA must be <= maxGWA)
  const meetsGWAReq = !criteria.maxGWA || studentGwa <= criteria.maxGWA ? 1 : 0;
  
  // Profile completeness (simple check)
  const profileCompleteness = student.profileCompleted ? 1 : 0.7;
  
  return {
    gwa: gwaNormalized,
    yearLevelNumeric: yearLevelNumeric / 5,
    incomeNormalized,
    stBracketNumeric,
    collegeMatch,
    courseMatch,
    majorMatch,
    meetsIncomeReq,
    meetsGWAReq,
    profileCompleteness
  };
};

// ============================================================================
// LOGISTIC REGRESSION MODEL
// Uses dynamic weights from trained models when available
// ============================================================================

// ==========================================================================
// FULLY DYNAMIC WEIGHTS FROM DATABASE
// ==========================================================================
// Weights are ALWAYS loaded from the TrainedModel database via the API.
// The model is trained on actual UPLB scholarship application data.
//
// To train/update the model:
//   node scripts/train-all-scholarships.js (in backend)
//
// Neutral fallback is only used when NO trained model exists in the database.
// ==========================================================================

// Alias for backward compatibility - uses neutral fallback
const DEFAULT_MODEL_WEIGHTS = NEUTRAL_FALLBACK_WEIGHTS;

// Legacy weights mapping for backward compatibility
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

// Sigmoid function for probability calculation
const sigmoid = (z: number): number => {
  return 1 / (1 + Math.exp(-z));
};

// Calculate prediction probability
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
// PREDICTION FACTOR EXPLANATION
// Provides interpretable explanations for prediction scores
// ============================================================================

const generatePredictionFactors = (
  student: StudentProfile,
  scholarship: Scholarship,
  features: FeatureVector,
  probability: number
): PredictionFactor[] => {
  const factors: PredictionFactor[] = [];
  const criteria = scholarship.eligibilityCriteria;
  const weights = DEFAULT_MODEL_WEIGHTS;
  
  // Helper to normalize GWA (1.0 = best = 1.0, 5.0 = worst = 0.0)
  const normalizeGWA = (gwa: number | undefined): number => {
    if (gwa === undefined || gwa === null) return 0.5;
    return Math.max(0, Math.min(1, (5 - gwa) / 4));
  };
  
  // Helper to normalize income (lower = higher score)
  const normalizeIncome = (income: number | undefined, max: number | undefined): number => {
    if (!income || !max) return 0.5;
    if (income <= max) {
      return 1 - (income / max) * 0.5; // 0.5 to 1.0
    }
    return 0; // Exceeds max
  };
  
  // Helper to get ST Bracket score
  const getSTBracketScore = (bracket: string | undefined): number => {
    const bracketMap: Record<string, number> = {
      'Full Discount with Stipend': 1.0,
      'Full Discount': 0.9,
      'PD80': 0.8,
      'PD60': 0.6,
      'PD40': 0.4,
      'PD20': 0.2,
      'No Discount': 0.1
    };
    return bracketMap[bracket || ''] || 0.5;
  };
  
  // 1. Overall Eligibility Score
  let eligibleCount = 0;
  let totalCriteria = 0;
  
  if (criteria.maxGWA) {
    totalCriteria++;
    if (student.gwa && student.gwa <= criteria.maxGWA) eligibleCount++;
  }
  if (criteria.maxAnnualFamilyIncome) {
    totalCriteria++;
    if (student.annualFamilyIncome && student.annualFamilyIncome <= criteria.maxAnnualFamilyIncome) eligibleCount++;
  }
  if (criteria.eligibleColleges?.length) {
    totalCriteria++;
    if (student.college && criteria.eligibleColleges.includes(student.college)) eligibleCount++;
  }
  if (criteria.eligibleClassifications?.length || criteria.requiredYearLevels?.length) {
    totalCriteria++;
    const yearLevels = criteria.eligibleClassifications || criteria.requiredYearLevels || [];
    if (student.yearLevel && yearLevels.includes(student.yearLevel)) eligibleCount++;
  }
  
  const eligibilityScore = totalCriteria > 0 ? eligibleCount / totalCriteria : 1;
  const eligibilityWeight = weights.eligibilityScore;
  const eligibilityContrib = eligibilityScore * eligibilityWeight;
  
  factors.push({
    factor: 'Overall Eligibility',
    value: eligibilityScore,
    weight: eligibilityWeight,
    rawContribution: eligibilityContrib,
    contribution: 0, // Will be normalized later
    description: `${eligibleCount}/${totalCriteria} criteria met (${Math.round(eligibilityScore * 100)}%)`,
    met: eligibilityScore >= 0.5
  });
  
  // 2. College Match
  const collegeMatch = criteria.eligibleColleges?.length 
    ? (criteria.eligibleColleges.includes(student.college || '') ? 1 : 0)
    : 0.5;
  const collegeWeight = weights.collegeMatch;
  const collegeContrib = collegeMatch * collegeWeight;
  
  factors.push({
    factor: 'College',
    value: collegeMatch,
    weight: collegeWeight,
    rawContribution: collegeContrib,
    contribution: 0,
    description: criteria.eligibleColleges?.length 
      ? (collegeMatch === 1 ? `${student.college} is eligible` : 'College not in eligible list')
      : 'Open to all colleges',
    met: collegeMatch >= 0.5
  });
  
  // 3. Financial Need (Income)
  const incomeValue = normalizeIncome(student.annualFamilyIncome, criteria.maxAnnualFamilyIncome || 500000);
  const incomeWeight = weights.incomeMatch;
  const incomeContrib = incomeValue * incomeWeight;
  
  factors.push({
    factor: 'Financial Need',
    value: incomeValue,
    weight: incomeWeight,
    rawContribution: incomeContrib,
    contribution: 0,
    description: criteria.maxAnnualFamilyIncome
      ? `₱${(student.annualFamilyIncome || 0).toLocaleString()} / ₱${criteria.maxAnnualFamilyIncome.toLocaleString()} max`
      : `₱${(student.annualFamilyIncome || 0).toLocaleString()} annual income`,
    met: !criteria.maxAnnualFamilyIncome || (student.annualFamilyIncome || 0) <= criteria.maxAnnualFamilyIncome
  });
  
  // 4. Citizenship
  const citizenshipMatch = student.citizenship === 'Filipino' ? 1 : 0.4;
  const citizenshipWeight = weights.citizenshipMatch;
  const citizenshipContrib = citizenshipMatch * citizenshipWeight;
  
  factors.push({
    factor: 'Citizenship',
    value: citizenshipMatch,
    weight: citizenshipWeight,
    rawContribution: citizenshipContrib,
    contribution: 0,
    description: student.citizenship || 'Not specified',
    met: citizenshipMatch >= 0.5
  });
  
  // 5. Academic Performance (GWA)
  const gwaValue = normalizeGWA(student.gwa);
  const gwaWeight = weights.gwaScore;
  const gwaContrib = gwaValue * gwaWeight;
  
  factors.push({
    factor: 'Academic Performance (GWA)',
    value: gwaValue,
    weight: gwaWeight,
    rawContribution: gwaContrib,
    contribution: 0,
    description: student.gwa 
      ? `GWA of ${student.gwa.toFixed(2)}${criteria.maxGWA ? ` (requires ≤${criteria.maxGWA})` : ''}`
      : 'GWA not provided',
    met: !criteria.maxGWA || (student.gwa || 5) <= criteria.maxGWA
  });
  
  // 6. Year Level
  const yearLevels = criteria.eligibleClassifications || criteria.requiredYearLevels || [];
  const yearLevelMatch = yearLevels.length 
    ? (yearLevels.includes(student.yearLevel || '' as any) ? 1 : 0)
    : 0.5;
  const yearLevelWeight = weights.yearLevelMatch;
  const yearLevelContrib = yearLevelMatch * yearLevelWeight;
  
  factors.push({
    factor: 'Year Level',
    value: yearLevelMatch,
    weight: yearLevelWeight,
    rawContribution: yearLevelContrib,
    contribution: 0,
    description: yearLevels.length 
      ? (yearLevelMatch === 1 ? `${student.yearLevel} is eligible` : `Requires: ${yearLevels.join(', ')}`)
      : (student.yearLevel || 'Not specified'),
    met: yearLevelMatch >= 0.5
  });
  
  // 7. Course/Major
  const courseMatch = criteria.eligibleCourses?.length
    ? (criteria.eligibleCourses.some(c => 
        (student.course || '').toLowerCase().includes(c.toLowerCase()) ||
        c.toLowerCase().includes((student.course || '').toLowerCase())
      ) ? 1 : 0)
    : 0.5;
  const courseWeight = weights.courseMatch;
  const courseContrib = courseMatch * courseWeight;
  
  factors.push({
    factor: 'Course/Major',
    value: courseMatch,
    weight: courseWeight,
    rawContribution: courseContrib,
    contribution: 0,
    description: criteria.eligibleCourses?.length 
      ? (courseMatch === 1 ? `${student.course} matches` : 'Course not in list')
      : 'Open to all courses',
    met: courseMatch >= 0.5
  });
  
  // 8. ST Bracket
  const stBrackets = criteria.requiredSTBrackets || criteria.eligibleSTBrackets || [];
  const stBracketMatch = stBrackets.length 
    ? (stBrackets.includes(student.stBracket || '') ? 1 : getSTBracketScore(student.stBracket))
    : getSTBracketScore(student.stBracket);
  const stBracketWeight = weights.stBracketMatch;
  const stBracketContrib = stBracketMatch * stBracketWeight;
  
  factors.push({
    factor: 'ST Bracket',
    value: stBracketMatch,
    weight: stBracketWeight,
    rawContribution: stBracketContrib,
    contribution: 0,
    description: stBrackets.length 
      ? (stBrackets.includes(student.stBracket || '') ? `${student.stBracket} qualifies` : `Requires: ${stBrackets.join(', ')}`)
      : (student.stBracket || 'Not specified'),
    met: !stBrackets.length || stBrackets.includes(student.stBracket || '')
  });
  
  // 9. Profile Completeness
  const profileComplete = student.profileCompleted ? 1 : 0.5;
  const profileWeight = weights.documentCompleteness;
  const profileContrib = profileComplete * profileWeight;
  
  factors.push({
    factor: 'Profile Completeness',
    value: profileComplete,
    weight: profileWeight,
    rawContribution: profileContrib,
    contribution: 0,
    description: student.profileCompleted ? 'Profile complete' : 'Profile incomplete',
    met: student.profileCompleted || false
  });
  
  // Calculate total absolute contribution for normalization
  const totalAbsContrib = factors.reduce((sum, f) => sum + Math.abs(f.rawContribution || 0), 0);
  
  // Normalize contributions
  factors.forEach(f => {
    f.contribution = totalAbsContrib > 0 ? (f.rawContribution || 0) / totalAbsContrib : 0;
  });
  
  // Sort by absolute raw contribution (most impactful first)
  return factors.sort((a, b) => Math.abs(b.rawContribution || 0) - Math.abs(a.rawContribution || 0));
};

// ============================================================================
// PUBLIC API
// ============================================================================

export interface PredictionResult {
  probability: number;           // 0-1 probability
  percentageScore: number;       // 0-100 percentage
  confidence: 'high' | 'medium' | 'low';
  factors: PredictionFactor[];
  recommendation: string;
  trainedModel?: boolean;        // Whether this used a trained model
}

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
  
  // Generate recommendation
  let recommendation: string;
  if (percentageScore >= 75) {
    recommendation = 'Strongly recommended! Your profile is an excellent match for this scholarship.';
  } else if (percentageScore >= 60) {
    recommendation = 'Good match. You have a solid chance of approval with a complete application.';
  } else if (percentageScore >= 40) {
    recommendation = 'Moderate match. Consider strengthening your application with additional documentation.';
  } else if (percentageScore >= 25) {
    recommendation = 'Low match. Review eligibility criteria carefully before applying.';
  } else {
    recommendation = 'Not recommended. You may not meet key eligibility requirements.';
  }
  
  return {
    probability,
    percentageScore,
    confidence,
    factors,
    recommendation,
    trainedModel: false
  };
};

/**
 * Main prediction function - tries API first, falls back to local
 */
export const predictScholarshipSuccess = (
  student: StudentProfile,
  scholarship: Scholarship
): PredictionResult => {
  // For synchronous compatibility, use local prediction
  // For async API prediction, use predictScholarshipSuccessAsync
  return predictScholarshipSuccessLocal(student, scholarship);
};

/**
 * Async prediction function - uses trained model weights when available
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
          trainedModel: apiResult.trainedModel
        };
      }
    } catch (error) {
      console.log('API prediction unavailable, trying local with dynamic weights');
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
      console.log('Dynamic weights unavailable, using default weights');
    }
  }
  
  // Fallback to local prediction with default weights
  return predictScholarshipSuccessLocal(student, scholarship);
};

/**
 * Predict using dynamic weights from trained model
 * Feature scoring matches training.service.js for consistency
 */
const predictWithDynamicWeights = (
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
      // Use standardized bracket scoring (all matches get high scores)
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
  
  // Eligibility score with STANDARDIZED high floor
  const rawEligibility = totalCriteria > 0 ? matchedCriteria / totalCriteria : 1.0;
  const eligibilityScore = SCORING.ELIGIBILITY_FLOOR + (rawEligibility * SCORING.ELIGIBILITY_RANGE);
  
  // Calculate z using base feature weights only (no interaction features needed)
  // Add calibration offset for trained models (already in intercept for fallback)
  const z = weights.intercept +
    (weights.intercept === SCORING.CALIBRATION_OFFSET ? 0 : SCORING.CALIBRATION_OFFSET) + // Add offset if not already included
    weights.gwaScore * gwaNormalized +
    weights.yearLevelMatch * yearLevelMatch +
    weights.incomeMatch * incomeMatch +
    weights.stBracketMatch * stBracketMatch +
    weights.collegeMatch * collegeMatch +
    weights.courseMatch * courseMatch +
    weights.citizenshipMatch * citizenshipMatch +
    weights.documentCompleteness * documentCompleteness +
    weights.eligibilityScore * eligibilityScore;
  
  const probability = sigmoid(z);
  const percentageScore = Math.round(probability * 100);
  
  // Extract features for factor generation
  const features = extractFeatures(student, scholarship);
  
  // Generate explanation factors
  const factors = generatePredictionFactors(student, scholarship, features, probability);
  
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

/**
 * Get recommendation text based on score
 */
const getRecommendation = (percentageScore: number): string => {
  if (percentageScore >= 75) {
    return 'Strongly recommended! Your profile is an excellent match for this scholarship.';
  } else if (percentageScore >= 60) {
    return 'Good match. You have a solid chance of approval with a complete application.';
  } else if (percentageScore >= 40) {
    return 'Moderate match. Consider strengthening your application with additional documentation.';
  } else if (percentageScore >= 25) {
    return 'Low match. Review eligibility criteria carefully before applying.';
  } else {
    return 'Not recommended. You may not meet key eligibility requirements.';
  }
};