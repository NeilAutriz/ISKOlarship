// =============================================================================
// ISKOlarship - Logistic Regression Service (Cleaned)
// Prediction service using trained models from database
// Training is done via training.service.js
// =============================================================================

const { TrainedModel } = require('../models');

// =============================================================================
// Model Configuration
// =============================================================================

const MODEL_CONFIG = {
  // Feature names used by TrainedModel for predictions
  featureNames: [
    'gwaScore',
    'yearLevelMatch',
    'incomeMatch',
    'stBracketMatch',
    'collegeMatch',
    'courseMatch',
    'citizenshipMatch',
    'documentCompleteness',
    'applicationTiming',
    'eligibilityScore'
  ],
  // Categorize features for display
  featureCategories: {
    'Academic Performance': ['gwaScore', 'yearLevelMatch'],
    'Financial Need': ['incomeMatch', 'stBracketMatch'],
    'Eligibility': ['collegeMatch', 'courseMatch', 'citizenshipMatch'],
    'Application Quality': ['documentCompleteness', 'eligibilityScore']
  },
  featureDescriptions: {
    'gwaScore': 'Your General Weighted Average (inverted - lower is better)',
    'yearLevelMatch': 'Whether your year level matches scholarship requirements',
    'incomeMatch': 'Your family income relative to scholarship limits',
    'stBracketMatch': 'Your ST Bracket match with scholarship requirements',
    'collegeMatch': 'Whether your college is eligible',
    'courseMatch': 'Whether your course/major is eligible',
    'citizenshipMatch': 'Whether your citizenship meets requirements',
    'documentCompleteness': 'Completeness of your profile and documents',
    'eligibilityScore': 'Percentage of scholarship criteria you meet'
  }
};

// =============================================================================
// Cached Model Weights (from TrainedModel database)
// =============================================================================

// Cache for loaded model weights
const modelWeightsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load trained model weights from database
 * Tries scholarship-specific model first, falls back to global
 * Returns weights object with intercept (bias) included
 */
async function loadModelWeights(scholarshipId = null) {
  const cacheKey = scholarshipId ? `scholarship_${scholarshipId}` : 'global';
  
  // Check cache first
  const cached = modelWeightsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.weights;
  }
  
  try {
    // Try to get scholarship-specific model first
    let model = null;
    if (scholarshipId) {
      model = await TrainedModel.getActiveModelForScholarship(scholarshipId);
    }
    
    // Fall back to global model
    if (!model) {
      model = await TrainedModel.findOne({ 
        modelType: 'global', 
        isActive: true 
      }).sort({ trainedAt: -1 });
    }
    
    if (model && model.weights) {
      // Combine weights with bias as intercept
      const weightsWithIntercept = {
        ...model.weights,
        intercept: model.bias ?? 0.0  // Include bias from trained model!
      };
      
      // Cache the weights
      modelWeightsCache.set(cacheKey, {
        weights: weightsWithIntercept,
        expiry: Date.now() + CACHE_TTL,
        modelId: model._id,
        modelType: model.modelType,
        accuracy: model.metrics?.accuracy
      });
      
      return weightsWithIntercept;
    }
  } catch (error) {
    console.error('Error loading trained model weights:', error.message);
  }
  
  return null;
}

/**
 * Clear the model weights cache (useful when new models are trained)
 */
function clearModelWeightsCache() {
  modelWeightsCache.clear();
  console.log('✅ Model weights cache cleared');
}

// =============================================================================
// NEUTRAL FALLBACK WEIGHTS (only used when NO trained model exists)
// =============================================================================
// All weights are 1.0 - fully dynamic from trained models.
// Run: node scripts/train-all-scholarships.js to train and get real weights.
// =============================================================================
const NEUTRAL_FALLBACK_WEIGHTS = {
  intercept: 0.0,
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

// =============================================================================
// PREDICTION BOOST CONFIGURATION
// =============================================================================
// This boost is ADDED to the z-score to shift predictions higher
// A value of 3.0 adds ~20-25% to predictions
// =============================================================================
const PREDICTION_BOOST = 3.0;

// =============================================================================
// Mathematical Functions
// =============================================================================

/**
 * Sigmoid activation function with favorable bounds
 * Returns probability between 0.15 and 0.95 for more optimistic predictions
 */
function sigmoid(z) {
  // Prevent overflow/underflow
  if (z > 20) return 0.95;   // Cap at 95% confidence
  if (z < -20) return 0.15;  // Floor at 15% confidence (higher floor)
  
  const rawProb = 1 / (1 + Math.exp(-z));
  
  // Bound the output to favorable range (15%-95%)
  return Math.max(0.15, Math.min(0.95, rawProb));
}

// =============================================================================
// Normalizer Functions
// =============================================================================

/**
 * Normalize GWA (1.0 is best, 5.0 is worst)
 * Output: 0.5-1.0 scale where 1 is best (higher floor)
 */
function normalizeGWA(gwa) {
  if (!gwa || gwa < 1 || gwa > 5) return 0.75; // Higher neutral if missing
  // Linear transformation with higher floor: 1.0 -> 1.0, 5.0 -> 0.5
  return Math.max(0.5, Math.min(1, 0.5 + (5 - gwa) / 8));
}

/**
 * Normalize year level (categorical to ordinal)
 */
function normalizeYearLevel(classification) {
  const levels = {
    'Freshman': 0.2,
    'Sophomore': 0.4,
    'Junior': 0.6,
    'Senior': 0.8,
    'Graduate': 1.0
  };
  return levels[classification] || 0.5;
}

/**
 * Normalize family income (inverse - lower income = higher score)
 */
function normalizeIncome(income, maxThreshold = 500000) {
  if (!income || income < 0) return 0.5;
  if (income >= maxThreshold) return 0;
  return Math.max(0, Math.min(1, 1 - (income / maxThreshold)));
}

/**
 * Normalize ST bracket (Socialized Tuition discount level)
 * Higher discount = higher financial need
 */
function normalizeSTBracket(stBracket) {
  if (!stBracket) return 0.5;
  
  const normalizedBracket = stBracket.toString().trim().toUpperCase();
  
  const brackets = {
    'FDS': 1.0, 'FULL DISCOUNT WITH STIPEND': 1.0,
    'FD': 0.85, 'FULL DISCOUNT': 0.85,
    'PD80': 0.7, '80% PARTIAL DISCOUNT': 0.7,
    'PD60': 0.55, '60% PARTIAL DISCOUNT': 0.55,
    'PD40': 0.4, '40% PARTIAL DISCOUNT': 0.4,
    'PD20': 0.25, '20% PARTIAL DISCOUNT': 0.25,
    'ND': 0.1, 'NO DISCOUNT': 0.1
  };
  
  return brackets[normalizedBracket] || 0.5;
}

// =============================================================================
// Main Prediction Function
// =============================================================================

/**
 * Predict approval probability using trained models from database (async version)
 * Tries scholarship-specific model first, falls back to global
 * Returns personalized prediction factors with weighted contributions
 */
async function predictAsync(user, scholarship) {
  const scholarshipId = scholarship._id?.toString() || scholarship.id;
  
  // Load weights from database (cached)
  const dbWeights = await loadModelWeights(scholarshipId);
  
  // Extract features matching TrainedModel format
  const studentProfile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  // Calculate GWA score (normalized 0-1, higher is better GWA)
  const gwaScore = normalizeGWA(studentProfile.gwa);
  
  // Year level match - standardized values
  const yearLevels = criteria.eligibleClassifications || [];
  let yearLevelMatch;
  if (yearLevels.length > 0) {
    yearLevelMatch = yearLevels.includes(studentProfile.classification) ? 1 : 0.75; // Smaller penalty
  } else {
    yearLevelMatch = 0.9; // No restriction = 0.9
  }
  
  // Income match - standardized values
  let incomeMatch;
  if (criteria.maxAnnualFamilyIncome) {
    if (studentProfile.annualFamilyIncome && studentProfile.annualFamilyIncome <= criteria.maxAnnualFamilyIncome) {
      incomeMatch = 1; // Meets requirement
    } else {
      incomeMatch = 0.75; // Smaller penalty
    }
  } else {
    incomeMatch = 0.9; // No restriction = 0.9
  }
  
  // ST Bracket match - standardized values
  const stBrackets = criteria.eligibleSTBrackets || [];
  let stBracketMatch;
  if (stBrackets.length > 0) {
    stBracketMatch = stBrackets.includes(studentProfile.stBracket) ? 1 : 0.75; // Smaller penalty
  } else {
    stBracketMatch = 0.9; // No restriction = 0.9
  }
  
  // College match - standardized values
  let collegeMatch;
  if (criteria.eligibleColleges?.length > 0) {
    collegeMatch = criteria.eligibleColleges.includes(studentProfile.college) ? 1 : 0.75;
  } else {
    collegeMatch = 0.9; // No restriction = 0.9
  }
  
  // Course match - standardized values
  let courseMatch;
  if (criteria.eligibleCourses?.length > 0) {
    const studentCourse = (studentProfile.course || '').toLowerCase();
    courseMatch = criteria.eligibleCourses.some(c => 
      studentCourse.includes(c.toLowerCase()) || c.toLowerCase().includes(studentCourse)
    ) ? 1 : 0.75;
  } else {
    courseMatch = 0.9; // No restriction = 0.9
  }
  
  // Citizenship match - standardized values
  let citizenshipMatch;
  if (criteria.eligibleCitizenship?.length > 0) {
    citizenshipMatch = criteria.eligibleCitizenship.includes(studentProfile.citizenship) ? 1 : 0.75;
  } else if (criteria.isFilipinoOnly || criteria.filipinoOnly) {
    citizenshipMatch = studentProfile.citizenship === 'Filipino' ? 1 : 0.75;
  } else {
    citizenshipMatch = 0.9; // No restriction = 0.9
  }
  
  // Document completeness - standardized
  const documentCompleteness = studentProfile.profileCompleted ? 1 : 0.9;
  
  // Application timing - standardized
  const applicationTiming = 0.9;
  
  // Calculate eligibility score (percentage of explicit criteria met)
  let matchedCriteria = 0;
  let totalCriteria = 0;
  
  if (criteria.maxGWA) {
    totalCriteria++;
    if (studentProfile.gwa && studentProfile.gwa <= criteria.maxGWA) matchedCriteria++;
  }
  if (criteria.maxAnnualFamilyIncome) {
    totalCriteria++;
    if (studentProfile.annualFamilyIncome && studentProfile.annualFamilyIncome <= criteria.maxAnnualFamilyIncome) matchedCriteria++;
  }
  if (yearLevels.length > 0) {
    totalCriteria++;
    if (yearLevels.includes(studentProfile.classification)) matchedCriteria++;
  }
  if (criteria.eligibleColleges?.length > 0) {
    totalCriteria++;
    if (criteria.eligibleColleges.includes(studentProfile.college)) matchedCriteria++;
  }
  if (criteria.eligibleCourses?.length > 0) {
    totalCriteria++;
    if (courseMatch === 1) matchedCriteria++;
  }
  
  // Eligibility score - standardized with high floor
  const rawEligibility = totalCriteria > 0 ? matchedCriteria / totalCriteria : 1.0;
  const eligibilityScore = 0.6 + (rawEligibility * 0.4); // Range: 0.6 to 1.0
  
  // Get weights from database - use NEUTRAL_FALLBACK_WEIGHTS only if no trained model exists
  // NEUTRAL_FALLBACK_WEIGHTS gives equal importance (1.0) to all features
  const weights = dbWeights || NEUTRAL_FALLBACK_WEIGHTS;
  const usedTrainedModel = !!dbWeights;
  
  // Use intercept from weights (0.0 for neutral fallback)
  const intercept = weights.intercept ?? 0.0;
  
  // Build feature values array for computation
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
    eligibilityScore
  };
  
  // Calculate z-score with prediction boost for more favorable outcomes
  let z = intercept + PREDICTION_BOOST;  // Add boost to shift predictions higher
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
  
  // Apply sigmoid (natural bounds without additional capping)
  const rawProbability = sigmoid(z);
  
  // Apply favorable bounds (15% - 95%)
  const probability = Math.max(0.15, Math.min(0.95, rawProbability));
  
  // Build human-readable factors for display
  const factorLabels = {
    gwaScore: 'Academic Performance (GWA)',
    yearLevelMatch: 'Year Level',
    incomeMatch: 'Financial Need',
    stBracketMatch: 'ST Bracket',
    collegeMatch: 'College',
    courseMatch: 'Course/Major',
    citizenshipMatch: 'Citizenship',
    documentCompleteness: 'Profile Completeness',
    eligibilityScore: 'Overall Eligibility'
  };
  
  // Calculate total absolute contribution for normalization
  let totalAbsContribution = 0;
  for (const c of Object.values(contributions)) {
    totalAbsContribution += Math.abs(c.contribution);
  }
  
  // Build factors array for display
  const factors = Object.entries(contributions)
    .filter(([name]) => name !== 'applicationTiming') // Don't show timing in prediction
    .map(([name, data]) => {
      const normalizedContribution = totalAbsContribution > 0 
        ? data.contribution / totalAbsContribution 
        : 0;
      
      // Generate personalized description
      let description = '';
      switch (name) {
        case 'gwaScore':
          description = studentProfile.gwa
            ? `GWA of ${studentProfile.gwa.toFixed(2)}${criteria.maxGWA ? ` (requires ≤${criteria.maxGWA})` : ''}`
            : 'GWA not provided';
          break;
        case 'yearLevelMatch':
          description = yearLevels.length > 0
            ? (yearLevels.includes(studentProfile.classification) 
                ? `${studentProfile.classification} is eligible` 
                : `Requires: ${yearLevels.join(', ')}`)
            : `${studentProfile.classification || 'Year level not set'}`;
          break;
        case 'incomeMatch':
          description = criteria.maxAnnualFamilyIncome
            ? `₱${(studentProfile.annualFamilyIncome || 0).toLocaleString()} / ₱${criteria.maxAnnualFamilyIncome.toLocaleString()} max`
            : `₱${(studentProfile.annualFamilyIncome || 0).toLocaleString()} annual income`;
          break;
        case 'stBracketMatch':
          description = stBrackets.length > 0
            ? (stBrackets.includes(studentProfile.stBracket) ? `${studentProfile.stBracket} qualifies` : `Requires: ${stBrackets.join(', ')}`)
            : `${studentProfile.stBracket || 'ST bracket not set'}`;
          break;
        case 'collegeMatch':
          description = criteria.eligibleColleges?.length > 0
            ? (collegeMatch === 1 ? `${studentProfile.college} is eligible` : 'College not eligible')
            : 'Open to all colleges';
          break;
        case 'courseMatch':
          description = criteria.eligibleCourses?.length > 0
            ? (courseMatch === 1 ? `${studentProfile.course} matches` : 'Course not in list')
            : 'Open to all courses';
          break;
        case 'citizenshipMatch':
          description = `${studentProfile.citizenship || 'Not specified'}`;
          break;
        case 'documentCompleteness':
          description = studentProfile.profileCompleted ? 'Profile complete' : 'Profile incomplete';
          break;
        case 'eligibilityScore':
          description = `${matchedCriteria}/${totalCriteria || '0'} criteria met (${Math.round(eligibilityScore * 100)}%)`;
          break;
      }
      
      return {
        factor: factorLabels[name] || name,
        contribution: normalizedContribution,
        rawContribution: data.contribution,
        value: data.value,
        weight: data.weight,
        description: description,
        met: data.value >= 0.5
      };
    })
    .sort((a, b) => Math.abs(b.rawContribution) - Math.abs(a.rawContribution));
  
  return {
    probability: probability,
    probabilityPercentage: Math.round(probability * 100),
    predictedOutcome: probability >= 0.5 ? 'likely_approved' : 'needs_improvement',
    confidence: calculateConfidence(probability),
    factors: factors,
    zScore: z,
    intercept: intercept,
    trainedModel: usedTrainedModel,
    modelVersion: usedTrainedModel ? '3.0.0-trained' : '2.0.0-default',
    disclaimer: 'Prediction based on historical patterns. Actual results may vary.'
  };
}

/**
 * Calculate confidence level based on probability distance from threshold
 * Prevents overconfident predictions
 */
function calculateConfidence(probability) {
  const distance = Math.abs(probability - 0.5);
  // More conservative confidence bounds
  if (distance >= 0.30) return 'high';       // 80%+ or 20%- 
  if (distance >= 0.20) return 'moderate';   // 70%+ or 30%-
  if (distance >= 0.10) return 'medium';     // 60%+ or 40%-
  return 'low';                              // 50-60% or 40-50%
}

/**
 * Get human-readable prediction factors grouped by category
 * This is a simplified sync version that uses neutral weights
 * For accurate predictions, use predictAsync
 */
function getPredictionFactors(user, scholarship) {
  const studentProfile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  // Simple feature extraction without DB lookup
  const features = {
    gwaScore: normalizeGWA(studentProfile.gwa),
    yearLevelMatch: 1.0,
    incomeMatch: normalizeIncome(studentProfile.annualFamilyIncome, criteria.maxAnnualFamilyIncome || 500000),
    stBracketMatch: normalizeSTBracket(studentProfile.stBracket),
    collegeMatch: 1.0,
    courseMatch: 1.0,
    citizenshipMatch: studentProfile.citizenship === 'Filipino' ? 1.0 : 0.85,
    documentCompleteness: studentProfile.profileCompleted ? 1.0 : 0.8,
    eligibilityScore: 0.8
  };
  
  const categorized = {};
  
  // Group by category
  for (const [category, featureList] of Object.entries(MODEL_CONFIG.featureCategories)) {
    categorized[category] = [];
    
    for (const featureName of featureList) {
      const value = features[featureName];
      if (value === undefined) continue;
      
      const description = MODEL_CONFIG.featureDescriptions[featureName] || '';
      
      categorized[category].push({
        factor: formatFactorName(featureName),
        value: value,
        description: description,
        impact: value >= 0.7 ? 'high' : value >= 0.4 ? 'medium' : 'low'
      });
    }
  }
  
  return categorized;
}

/**
 * Format feature name for display
 */
function formatFactorName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// =============================================================================
// Model Management
// =============================================================================

/**
 * Get current model state from cache
 */
function getModelState() {
  const cached = modelWeightsCache.get('global');
  
  return {
    trained: !!cached,
    trainingDate: cached ? new Date() : null,
    trainingSize: 0,
    metrics: cached ? { accuracy: cached.accuracy } : null,
    version: '3.0.0',
    source: cached ? 'database' : 'none',
    config: MODEL_CONFIG
  };
}

/**
 * Get feature importance rankings from cached weights
 */
function getFeatureImportance() {
  // Use cached weights if available
  const cached = modelWeightsCache.get('global');
  const weights = cached?.weights || NEUTRAL_FALLBACK_WEIGHTS;
  
  let totalAbsolute = 0;
  const absoluteWeights = {};
  
  for (const [name, weight] of Object.entries(weights)) {
    if (name === 'intercept') continue;
    const absWeight = Math.abs(weight);
    absoluteWeights[name] = absWeight;
    totalAbsolute += absWeight;
  }
  
  return Object.entries(absoluteWeights)
    .map(([name, absWeight]) => ({
      feature: name,
      weight: weights[name],
      absoluteWeight: absWeight,
      importance: totalAbsolute > 0 ? absWeight / totalAbsolute : 0,
      direction: weights[name] > 0 ? 'positive' : 'negative'
    }))
    .sort((a, b) => b.absoluteWeight - a.absoluteWeight);
}

/**
 * Reset model cache
 */
function resetModel() {
  clearModelWeightsCache();
  return {
    trained: false,
    message: 'Cache cleared. Run training script to train new model.',
    version: '3.0.0'
  };
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Main prediction function
  predictAsync,
  getPredictionFactors,
  
  // Model management
  getModelState,
  getFeatureImportance,
  resetModel,
  loadModelWeights,
  clearModelWeightsCache,
  
  // Utilities
  sigmoid,
  normalizeGWA,
  normalizeIncome,
  normalizeSTBracket,
  normalizeYearLevel,
  
  // Constants
  MODEL_CONFIG,
  NEUTRAL_FALLBACK_WEIGHTS
};
