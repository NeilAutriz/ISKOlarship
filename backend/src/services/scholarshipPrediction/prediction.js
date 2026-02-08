// =============================================================================
// ISKOlarship - Prediction Core
// Main prediction function using logistic regression
// =============================================================================

const { Application } = require('../../models');
const logisticRegression = require('../logisticRegression.service');
const { MODEL_VERSION, MATCH_LEVELS } = require('./constants');
const { checkEligibility } = require('./eligibility');
const { analyzeDetailedFactors, generateRecommendation } = require('./factors');

/**
 * Determine match level based on probability
 * 
 * @param {number} probability - Prediction probability (0-1)
 * @returns {string} Match level description
 */
function getMatchLevel(probability) {
  if (probability >= MATCH_LEVELS.STRONG) return 'Strong Match';
  if (probability >= MATCH_LEVELS.GOOD) return 'Good Match';
  if (probability >= MATCH_LEVELS.MODERATE) return 'Moderate Match';
  return 'Weak Match';
}

/**
 * Predict approval probability using logistic regression
 * 
 * Two-case model loading strategy:
 * 1. PRIMARY: Scholarship-specific model (if sufficient historical data exists)
 * 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
 * 
 * If no trained model exists at all, this will throw an error.
 * A global model must be trained first using: npm run train:global
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @returns {Promise<Object>} Prediction result with probability, factors, and metadata
 * @throws {Error} If no trained model exists
 */
async function predictApprovalProbability(user, scholarship) {
  // Use the async prediction that loads from TrainedModel database
  // This will throw an error if no trained model exists (requires global model at minimum)
  let prediction;
  try {
    prediction = await logisticRegression.predictAsync(user, scholarship);
  } catch (error) {
    // No fallback - a trained model is required
    console.error('Prediction failed:', error.message);
    throw new Error('No trained model available. Please train a global model first. Run: npm run train:global');
  }
  
  const factors = logisticRegression.getPredictionFactors(user, scholarship);
  
  // Check for previous applications to adjust confidence
  const previousApps = await Application.find({
    applicant: user._id,
    status: { $in: ['approved', 'rejected'] }
  });

  const previousApprovals = previousApps.filter(a => a.status === 'approved').length;
  const previousRejections = previousApps.filter(a => a.status === 'rejected').length;

  // Adjust probability slightly based on history (diminishing returns)
  let adjustedProbability = prediction.probability;
  if (previousApprovals > 0) {
    // Diminishing bonus: asymptotically approaches 0.05 max boost
    const historyBonus = 0.05 * (1 - Math.exp(-0.3 * previousApprovals));
    adjustedProbability = Math.min(0.95, adjustedProbability + historyBonus);
  }
  if (previousRejections > 0) {
    // Diminishing penalty: asymptotically approaches 0.05 max reduction
    const historyPenalty = 0.05 * (1 - Math.exp(-0.3 * previousRejections));
    adjustedProbability = Math.max(0.05, adjustedProbability - historyPenalty);
  }

  // Get eligibility check results for detailed factor analysis
  const eligibility = await checkEligibility(user, scholarship);
  
  // Analyze factors in favor and areas to consider
  const detailedFactors = analyzeDetailedFactors(user, scholarship, eligibility, prediction);

  // Ensure factors array contains sanitized objects, preserving subFactors for grouped display
  const sanitizedFactors = (prediction.factors || []).map(f => {
    const sanitized = {
      factor: String(f.factor || ''),
      contribution: Number(f.contribution) || 0,
      rawContribution: Number(f.rawContribution) || 0,
      description: String(f.description || ''),
      met: Boolean(f.met)
    };
    // Preserve subFactors array for grouped expand/collapse display
    if (Array.isArray(f.subFactors) && f.subFactors.length > 0) {
      sanitized.subFactors = f.subFactors.map(sf => ({
        name: String(sf.name || ''),
        value: Number(sf.value) || 0,
        weight: Number(sf.weight) || 0,
        contribution: Number(sf.contribution) || 0
      }));
    }
    return sanitized;
  });

  return {
    probability: Math.round(adjustedProbability * 100) / 100,
    probabilityPercentage: Math.round(adjustedProbability * 100),
    predictedOutcome: adjustedProbability >= 0.5 ? 'approved' : 'rejected',
    confidence: prediction.confidence,
    matchLevel: getMatchLevel(adjustedProbability),
    factors: sanitizedFactors,
    zScore: prediction.zScore,
    intercept: prediction.intercept,
    features: prediction.features,
    modelVersion: MODEL_VERSION,
    trainedModel: true,
    modelType: prediction.modelType,
    modelDescription: prediction.modelType === 'scholarship_specific' 
      ? 'Using model trained on this scholarship\'s historical data'
      : 'Using global model trained on all scholarships',
    previousApprovals,
    previousRejections,
    recommendation: generateRecommendation(adjustedProbability, detailedFactors),
    generatedAt: new Date()
  };
}

module.exports = {
  predictApprovalProbability,
  getMatchLevel
};
