// =============================================================================
// ISKOlarship - Main Prediction Function
// Core async prediction using trained models from database
// =============================================================================

const { loadModelWeights } = require('./modelCache');
const { sigmoid, calculateConfidence } = require('./normalizers');
const { extractFeatures, calculateEligibilityScore } = require('./features');
const { generateFactors } = require('./factors');

// =============================================================================
// Main Prediction Function
// =============================================================================

/**
 * Predict approval probability using trained models from database (async version)
 * 
 * Model Loading Strategy (Two Cases Only):
 * 1. PRIMARY: Scholarship-specific model (if scholarship has sufficient historical data)
 * 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
 * 
 * @param {object} user - User object with studentProfile
 * @param {object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Promise<object>} Prediction result with probability, factors, and metadata
 * @throws {Error} If no trained model exists
 */
async function predictAsync(user, scholarship) {
  const scholarshipId = scholarship._id?.toString() || scholarship.id;
  
  // Load weights from database (cached)
  // This will throw an error if no trained model exists
  const modelResult = await loadModelWeights(scholarshipId);
  const dbWeights = modelResult.weights;
  const usedModelType = modelResult.modelType;
  
  // Extract features from user and scholarship
  const extractedFeatures = extractFeatures(user, scholarship);
  const {
    gwaScore,
    yearLevelMatch,
    incomeMatch,
    stBracketMatch,
    collegeMatch,
    courseMatch,
    citizenshipMatch,
    documentCompleteness,
    applicationTiming,
    yearLevels,
    stBrackets
  } = extractedFeatures;
  
  // Calculate eligibility score
  const eligibilityResult = calculateEligibilityScore(user, scholarship, courseMatch);
  let { eligibilityScore } = eligibilityResult;
  const { matchedCriteria, totalCriteria } = eligibilityResult;

  // Global model compensation: the global model was trained across all scholarships,
  // so its weights tend to produce inflated scores for individual scholarships.
  // Reduce eligibility-related features to bring predictions closer to reality.
  if (usedModelType === 'global') {
    eligibilityScore = eligibilityScore * 0.85;
  }
  
  // Build feature values object for computation
  // 10 base features + 5 interaction features (must match training)
  const features = {
    gwaScore,
    yearLevelMatch,
    incomeMatch,
    stBracketMatch,
    collegeMatch,
    courseMatch,
    citizenshipMatch,
    documentCompleteness,
    applicationTiming,
    eligibilityScore,
    // Interaction features (same formulas as trainingService/featureExtraction.js)
    academicStrength: gwaScore * yearLevelMatch,
    financialNeed: incomeMatch * stBracketMatch,
    programFit: collegeMatch * courseMatch,
    applicationQuality: documentCompleteness * applicationTiming,
    overallFit: eligibilityScore * (gwaScore * yearLevelMatch)
  };
  
  // Use weights from database (guaranteed to exist)
  const weights = dbWeights;
  
  // Use intercept from weights
  const intercept = weights.intercept ?? 0.0;
  
  // Calculate z-score using model's learned intercept (bias)
  let z = intercept;
  const contributions = {};
  
  for (const [featureName, featureValue] of Object.entries(features)) {
    const weight = weights[featureName] ?? 0;
    const contribution = featureValue * weight;
    z += contribution;
    contributions[featureName] = {
      value: featureValue,
      weight: weight,
      contribution: contribution
    };
  }
  
  // Apply sigmoid with temperature scaling to spread predictions.
  // For eligible students, features cluster in [0.50, 0.85] (never MISMATCH),
  // causing z-scores to saturate the sigmoid. Temperature > 1 softens the
  // sigmoid curve, preserving rank order while creating visible differentiation
  // between scholarships with different model weights and criteria.
  const PREDICTION_TEMPERATURE = 2.0;
  const probability = sigmoid(z / PREDICTION_TEMPERATURE);
  
  // Generate human-readable factors
  const studentProfile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  const matchData = {
    yearLevels,
    stBrackets,
    collegeMatch,
    courseMatch,
    eligibilityScore,
    matchedCriteria,
    totalCriteria
  };
  
  const factors = generateFactors(contributions, studentProfile, criteria, matchData);
  
  return {
    probability: probability,
    probabilityPercentage: Math.round(probability * 100),
    predictedOutcome: probability >= 0.5 ? 'likely_approved' : 'needs_improvement',
    confidence: calculateConfidence(probability),
    factors: factors,
    zScore: z,
    intercept: intercept,
    trainedModel: true, // Always true - we require a trained model
    modelType: usedModelType, // 'scholarship_specific' or 'global'
    modelVersion: '3.0.0-trained',
    disclaimer: usedModelType === 'scholarship_specific' 
      ? 'Prediction based on this scholarship\'s historical approval patterns.'
      : 'Prediction based on historical patterns across all scholarships (global model).'
  };
}

module.exports = {
  predictAsync
};
