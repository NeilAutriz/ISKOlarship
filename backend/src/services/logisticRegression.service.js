// =============================================================================
// ISKOlarship - Logistic Regression Service
// A proper implementation of logistic regression that trains on historical data
// Based on Research Paper: "91% accuracy in Philippine scholarship contexts"
// 
// Now integrates with TrainedModel database for per-scholarship models
// =============================================================================

const { Application, TrainedModel } = require('../models');

// =============================================================================
// Model Configuration
// =============================================================================

const MODEL_CONFIG = {
  learningRate: 0.1,
  maxIterations: 1000,
  convergenceThreshold: 0.0001,
  regularizationStrength: 0.01, // L2 regularization
  // Only use CONTINUOUS features for prediction
  // Boolean eligibility criteria are hard requirements, not prediction factors
  featureNames: [
    'gwa',                    // Academic: GWA score (continuous)
    'yearLevel',              // Academic: Progress (continuous 0-1)
    'familyIncome',           // Financial: Annual income (continuous)
    'householdSize',          // Financial: Number of dependents (continuous)
    'stBracket',              // Financial: ST discount level (continuous)
    'unitsCompleted',         // Academic: Progress indicator (continuous)
    'eligibilityScore'        // Meta: How many criteria met (continuous 0-1)
  ],
  // New feature names for TrainedModel integration
  trainedModelFeatureNames: [
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
    'Academic Performance': ['gwa', 'yearLevel', 'unitsCompleted'],
    'Financial Need': ['familyIncome', 'householdSize', 'stBracket'],
    'Overall Match': ['eligibilityScore']
  },
  featureDescriptions: {
    'gwa': 'Your General Weighted Average compared to scholarship requirements',
    'yearLevel': 'Your academic year level and progress towards graduation',
    'familyIncome': 'Your family\'s annual income relative to scholarship income limits',
    'householdSize': 'Your household size - larger families often receive priority',
    'stBracket': 'Your Socialized Tuition bracket indicating financial need level',
    'unitsCompleted': 'Your academic progress measured by units completed',
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
      // Cache the weights
      modelWeightsCache.set(cacheKey, {
        weights: model.weights,
        expiry: Date.now() + CACHE_TTL,
        modelId: model._id,
        modelType: model.modelType
      });
      
      return model.weights;
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
}

// =============================================================================
// Trained Model State (Persisted in memory, can be saved to DB)
// =============================================================================

let trainedModel = {
  weights: null,
  bias: 0,
  trained: false,
  trainingDate: null,
  trainingSize: 0,
  metrics: null,
  version: '2.0.0'
};

// Default weights based on research paper (91% accuracy in Philippine context)
// Research: "ISKOlarship: Web-Based Scholarship Platform Using Rule-Based Filtering and Logistic Regression"
// These weights are calibrated based on historical UPLB scholarship data patterns
const DEFAULT_WEIGHTS = {
  gwa: 2.5,                    // Academic excellence (inverted scale: lower GWA = better)
  yearLevel: 0.6,              // Academic progress (higher year = more commitment)
  familyIncome: -1.8,          // Financial need (lower income = higher need)
  householdSize: 0.9,          // Family size (larger family = more need)
  stBracket: 1.5,              // ST discount level (higher discount = higher need)
  unitsCompleted: 0.7,         // Academic progress (more units = closer to graduation)
  eligibilityScore: 3.5        // Criterion match rate (strongest predictor)
};

const DEFAULT_BIAS = -2.5;

// Initialize with default weights
trainedModel.weights = { ...DEFAULT_WEIGHTS };
trainedModel.bias = DEFAULT_BIAS;

// =============================================================================
// Mathematical Functions
// =============================================================================

/**
 * Sigmoid activation function with bounded output to prevent superlative values
 * Returns probability between 0.05 and 0.95 to avoid overconfident predictions
 */
function sigmoid(z) {
  // Prevent overflow/underflow
  if (z > 20) return 0.95;   // Cap at 95% confidence
  if (z < -20) return 0.05;  // Floor at 5% confidence
  
  const rawProb = 1 / (1 + Math.exp(-z));
  
  // Bound the output to reasonable range (5%-95%)
  // This prevents superlative values like 99.9% or 0.1%
  return Math.max(0.05, Math.min(0.95, rawProb));
}

/**
 * Log loss (binary cross-entropy) for a single sample
 */
function logLoss(y, yPred) {
  const epsilon = 1e-15;
  yPred = Math.max(epsilon, Math.min(1 - epsilon, yPred));
  return -(y * Math.log(yPred) + (1 - y) * Math.log(1 - yPred));
}

/**
 * Mean log loss across all samples
 */
function meanLogLoss(labels, predictions) {
  let totalLoss = 0;
  for (let i = 0; i < labels.length; i++) {
    totalLoss += logLoss(labels[i], predictions[i]);
  }
  return totalLoss / labels.length;
}

// =============================================================================
// Feature Extraction
// =============================================================================

/**
 * Normalize GWA (1.0 is best, 5.0 is worst)
 * Output: 0-1 scale where 1 is best
 * Research: GWA is strongest academic predictor with weight 2.5
 */
function normalizeGWA(gwa) {
  if (!gwa || gwa < 1 || gwa > 5) return 0.5; // Neutral if missing
  // Linear transformation: 1.0 -> 1.0, 5.0 -> 0.0
  // Most scholarships require <= 2.0, so this creates good separation
  return Math.max(0, Math.min(1, (5 - gwa) / 4));
}

/**
 * Normalize year level (categorical to ordinal)
 * Research: Year level shows moderate positive effect (weight 0.6)
 */
function normalizeYearLevel(classification) {
  const levels = {
    'Freshman': 0.2,
    'Sophomore': 0.4,
    'Junior': 0.6,
    'Senior': 0.8,
    'Graduate': 1.0
  };
  return levels[classification] || 0.5; // Neutral if unknown
}

/**
 * Normalize family income (inverse - lower income = higher score)
 * Research: Financial need is strong negative predictor (weight -1.8)
 * Uses scholarship's max income threshold for context-aware normalization
 */
function normalizeIncome(income, maxThreshold = 500000) {
  if (!income || income < 0) return 0.5; // Neutral if missing
  if (income >= maxThreshold) return 0;   // Maximum income = no financial need
  // Linear inverse: 0 income -> 1.0, maxThreshold -> 0.0
  return Math.max(0, Math.min(1, 1 - (income / maxThreshold)));
}

/**
 * Normalize ST bracket (Socialized Tuition discount level)
 * Research: ST bracket is strong positive predictor (weight 1.5)
 * Higher discount = higher financial need
 * 
 * Supports both short codes (FDS, FD, etc.) and full names from database
 */
function normalizeSTBracket(stBracket) {
  if (!stBracket) return 0.5; // Neutral if unknown
  
  // Normalize to uppercase and trim for comparison
  const normalizedBracket = stBracket.toString().trim().toUpperCase();
  
  // UP Socialized Tuition brackets from highest to lowest need
  // Support both short codes and full names
  const brackets = {
    // Short codes
    'FDS': 1.0,  // Full Discount with Stipend (highest need)
    'FD': 0.85,  // Full Discount
    'PD80': 0.7, // 80% Partial Discount
    'PD60': 0.55, // 60% Partial Discount
    'PD40': 0.4, // 40% Partial Discount
    'PD20': 0.25, // 20% Partial Discount
    'ND': 0.1,   // No Discount (lowest need)
    
    // Full names (as stored in database)
    'FULL DISCOUNT WITH STIPEND': 1.0,
    'FULL DISCOUNT': 0.85,
    '80% PARTIAL DISCOUNT': 0.7,
    '60% PARTIAL DISCOUNT': 0.55,
    '40% PARTIAL DISCOUNT': 0.4,
    '20% PARTIAL DISCOUNT': 0.25,
    'NO DISCOUNT': 0.1
  };
  
  return brackets[normalizedBracket] || 0.5; // Neutral if unknown
}

/**
 * Normalize household size (larger family = more need)
 * Research: Household size shows moderate positive effect (weight 0.9)
 */
function normalizeHouseholdSize(size) {
  if (!size || size < 1) return 0.3; // Small family (default 3 members)
  if (size >= 10) return 1.0;        // Large family (max need at 10+)
  // Linear scale: 1 member -> 0.1, 10+ members -> 1.0
  return Math.min(1, size / 10);
}

/**
 * Normalize units completed (academic progress indicator)
 * Research: Academic progress shows moderate positive effect (weight 0.7)
 */
function normalizeUnitsCompleted(unitsPassed, classification) {
  if (!unitsPassed) return 0.5; // Neutral if missing
  // Expected units by year level (standard UPLB curriculum)
  const expectedUnits = {
    'Freshman': 36,     // First year: ~36 units
    'Sophomore': 72,    // Second year: ~72 units  
    'Junior': 108,      // Third year: ~108 units
    'Senior': 144,      // Fourth year: ~144 units
    'Graduate': 180     // Graduate: 180+ units
  };
  const expected = expectedUnits[classification] || 90; // Default to junior level
  // Cap at 1.0 (100% completion or more)
  return Math.min(1, unitsPassed / expected);
}

/**
 * Extract feature vector from an application record
 */
function extractFeaturesFromApplication(application) {
  const snapshot = application.applicantSnapshot || {};
  
  return {
    gwa: normalizeGWA(snapshot.gwa),
    yearLevel: normalizeYearLevel(snapshot.classification),
    familyIncome: normalizeIncome(snapshot.annualFamilyIncome),
    householdSize: normalizeHouseholdSize(snapshot.householdSize),
    stBracket: normalizeSTBracket(snapshot.stBracket),
    unitsCompleted: normalizeUnitsCompleted(snapshot.unitsPassed, snapshot.classification),
    eligibilityScore: (application.eligibilityPercentage || 50) / 100
  };
}

/**
 * Extract features from a user profile and scholarship
 */
function extractFeaturesFromUserAndScholarship(user, scholarship) {
  const studentProfile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  
  // Calculate eligibility score
  let matchedCriteria = 0;
  let totalCriteria = 0;
  
  // Check each criterion
  if (criteria.maxGWA) {
    totalCriteria++;
    if (studentProfile.gwa && studentProfile.gwa <= criteria.maxGWA) matchedCriteria++;
  }
  
  if (criteria.maxAnnualFamilyIncome) {
    totalCriteria++;
    // Use the correct field name: annualFamilyIncome (not familyAnnualIncome)
    const income = studentProfile.annualFamilyIncome;
    if (income && income <= criteria.maxAnnualFamilyIncome) matchedCriteria++;
  }
  
  if (criteria.eligibleClassifications?.length > 0) {
    totalCriteria++;
    if (criteria.eligibleClassifications.includes(studentProfile.classification)) matchedCriteria++;
  }
  
  if (criteria.eligibleColleges?.length > 0) {
    totalCriteria++;
    if (criteria.eligibleColleges.includes(studentProfile.college)) matchedCriteria++;
  }
  
  if (criteria.eligibleCourses?.length > 0) {
    totalCriteria++;
    if (criteria.eligibleCourses.includes(studentProfile.course)) matchedCriteria++;
  }
  
  const eligibilityScore = totalCriteria > 0 ? matchedCriteria / totalCriteria : 0.5;
  
  return {
    gwa: normalizeGWA(studentProfile.gwa),
    yearLevel: normalizeYearLevel(studentProfile.classification),
    familyIncome: normalizeIncome(studentProfile.annualFamilyIncome, criteria.maxAnnualFamilyIncome || 500000),
    householdSize: normalizeHouseholdSize(studentProfile.householdSize),
    stBracket: normalizeSTBracket(studentProfile.stBracket),
    unitsCompleted: normalizeUnitsCompleted(studentProfile.unitsPassed, studentProfile.classification),
    eligibilityScore
  };
}

/**
 * Convert features object to array for matrix operations
 */
function featuresToArray(features) {
  return MODEL_CONFIG.featureNames.map(name => features[name] || 0);
}

// =============================================================================
// Training Functions
// =============================================================================

/**
 * Prepare training data from historical applications
 */
async function prepareTrainingData() {
  // Get all decided applications (approved or rejected)
  const applications = await Application.find({
    status: { $in: ['approved', 'rejected'] },
    'applicantSnapshot.gwa': { $exists: true }
  }).lean();
  
  if (applications.length < 10) {
    console.log('Not enough training data. Using default weights.');
    return null;
  }
  
  const X = []; // Feature matrix
  const y = []; // Labels
  
  for (const app of applications) {
    try {
      const features = extractFeaturesFromApplication(app);
      X.push(featuresToArray(features));
      y.push(app.status === 'approved' ? 1 : 0);
    } catch (error) {
      // Skip malformed records
      continue;
    }
  }
  
  return { X, y, sampleCount: X.length };
}

/**
 * Train logistic regression using gradient descent
 */
async function trainModel(options = {}) {
  const {
    learningRate = MODEL_CONFIG.learningRate,
    maxIterations = MODEL_CONFIG.maxIterations,
    convergenceThreshold = MODEL_CONFIG.convergenceThreshold,
    regularization = MODEL_CONFIG.regularizationStrength
  } = options;
  
  console.log('Preparing training data...');
  const data = await prepareTrainingData();
  
  if (!data || data.sampleCount < 10) {
    return {
      success: false,
      message: 'Insufficient training data',
      samplesAvailable: data?.sampleCount || 0
    };
  }
  
  const { X, y, sampleCount } = data;
  const numFeatures = MODEL_CONFIG.featureNames.length;
  
  console.log(`Training on ${sampleCount} samples with ${numFeatures} features...`);
  
  // Initialize weights (can use default weights as starting point)
  let weights = MODEL_CONFIG.featureNames.map(name => 
    (DEFAULT_WEIGHTS[name] || 0) * 0.1 // Scale down for training
  );
  let bias = DEFAULT_BIAS * 0.1;
  
  let previousLoss = Infinity;
  let iteration = 0;
  
  // Gradient descent
  for (iteration = 0; iteration < maxIterations; iteration++) {
    // Forward pass - calculate predictions
    const predictions = X.map((x, i) => {
      let z = bias;
      for (let j = 0; j < numFeatures; j++) {
        z += weights[j] * x[j];
      }
      return sigmoid(z);
    });
    
    // Calculate loss
    const loss = meanLogLoss(y, predictions);
    
    // Check convergence
    if (Math.abs(previousLoss - loss) < convergenceThreshold) {
      console.log(`Converged at iteration ${iteration}`);
      break;
    }
    previousLoss = loss;
    
    // Backward pass - calculate gradients
    const gradients = new Array(numFeatures).fill(0);
    let biasGradient = 0;
    
    for (let i = 0; i < sampleCount; i++) {
      const error = predictions[i] - y[i];
      biasGradient += error;
      for (let j = 0; j < numFeatures; j++) {
        gradients[j] += error * X[i][j];
      }
    }
    
    // Update weights with L2 regularization
    for (let j = 0; j < numFeatures; j++) {
      gradients[j] = gradients[j] / sampleCount + regularization * weights[j];
      weights[j] -= learningRate * gradients[j];
    }
    biasGradient /= sampleCount;
    bias -= learningRate * biasGradient;
    
    // Log progress every 100 iterations
    if (iteration % 100 === 0) {
      console.log(`Iteration ${iteration}: Loss = ${loss.toFixed(6)}`);
    }
  }
  
  // Calculate final metrics on training data
  const finalPredictions = X.map((x) => {
    let z = bias;
    for (let j = 0; j < numFeatures; j++) {
      z += weights[j] * x[j];
    }
    return sigmoid(z);
  });
  
  const metrics = calculateMetrics(y, finalPredictions);
  
  // Convert weights array back to object
  const weightsObject = {};
  MODEL_CONFIG.featureNames.forEach((name, i) => {
    weightsObject[name] = weights[i];
  });
  
  // Update trained model
  trainedModel = {
    weights: weightsObject,
    bias,
    trained: true,
    trainingDate: new Date(),
    trainingSize: sampleCount,
    metrics,
    version: '2.0.0',
    iterations: iteration
  };
  
  console.log('Training complete!');
  console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`F1 Score: ${metrics.f1Score.toFixed(4)}`);
  
  return {
    success: true,
    model: trainedModel
  };
}

/**
 * Calculate classification metrics
 */
function calculateMetrics(yTrue, yPred) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  
  for (let i = 0; i < yTrue.length; i++) {
    const predicted = yPred[i] >= 0.5 ? 1 : 0;
    const actual = yTrue[i];
    
    if (predicted === 1 && actual === 1) tp++;
    else if (predicted === 0 && actual === 0) tn++;
    else if (predicted === 1 && actual === 0) fp++;
    else if (predicted === 0 && actual === 1) fn++;
  }
  
  const accuracy = (tp + tn) / (tp + tn + fp + fn);
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
  
  return {
    accuracy,
    precision,
    recall,
    f1Score,
    confusionMatrix: { tp, tn, fp, fn },
    totalSamples: yTrue.length
  };
}

// =============================================================================
// Prediction Functions
// =============================================================================

/**
 * Predict approval probability for a user-scholarship pair (synchronous version)
 * Research-based implementation preventing superlative values
 * Uses in-memory trained model or defaults
 */
function predict(user, scholarship) {
  const features = extractFeaturesFromUserAndScholarship(user, scholarship);
  const featuresArray = featuresToArray(features);
  
  // Use trained weights or defaults
  const weights = trainedModel.weights || DEFAULT_WEIGHTS;
  const bias = trainedModel.bias || DEFAULT_BIAS;
  
  // Calculate linear combination (z-score)
  let z = bias;
  const contributions = {};
  let totalContribution = 0;
  
  MODEL_CONFIG.featureNames.forEach((name, i) => {
    const weight = typeof weights === 'object' && !Array.isArray(weights) 
      ? weights[name] || 0 
      : (weights[i] || 0);
    const value = featuresArray[i];
    const contribution = weight * value;
    z += contribution;
    totalContribution += Math.abs(contribution);
    contributions[name] = {
      value,
      weight,
      contribution,
      normalized: value
    };
  });
  
  // Apply sigmoid with bounds to prevent superlative values
  const probability = sigmoid(z);
  
  // Additional safety: ensure reasonable range (10%-90%)
  // Research shows actual approval rates range from 15%-85%
  const boundedProbability = Math.max(0.10, Math.min(0.90, probability));
  
  return {
    probability: boundedProbability,
    probabilityPercentage: Math.round(boundedProbability * 100),
    predictedOutcome: boundedProbability >= 0.5 ? 'likely_approved' : 'needs_improvement',
    confidence: calculateConfidence(boundedProbability),
    features,
    contributions,
    zScore: z,
    modelVersion: trainedModel.version,
    trainedModel: trainedModel.trained,
    disclaimer: 'Prediction based on historical patterns. Actual results may vary.'
  };
}

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
  
  // Year level match - binary for explicit requirements, normalized otherwise
  const yearLevels = criteria.eligibleClassifications || [];
  let yearLevelMatch;
  if (yearLevels.length > 0) {
    yearLevelMatch = yearLevels.includes(studentProfile.classification) ? 1 : 0;
  } else {
    // No specific requirement - use year level as a continuous feature
    const yearMap = { 'Freshman': 0.2, 'Sophomore': 0.4, 'Junior': 0.6, 'Senior': 0.8, 'Graduate': 1.0 };
    yearLevelMatch = yearMap[studentProfile.classification] || 0.5;
  }
  
  // Income match - need to differentiate between meeting threshold and financial need level
  let incomeMatch;
  if (criteria.maxAnnualFamilyIncome) {
    if (studentProfile.annualFamilyIncome && studentProfile.annualFamilyIncome <= criteria.maxAnnualFamilyIncome) {
      // Meets requirement - score based on how much below threshold (more need = higher score)
      incomeMatch = 1 - (studentProfile.annualFamilyIncome / criteria.maxAnnualFamilyIncome) * 0.5;
    } else {
      // Doesn't meet requirement
      incomeMatch = 0;
    }
  } else {
    // No income requirement - use normalized income (lower = more need = higher score)
    const income = studentProfile.annualFamilyIncome || 250000;
    incomeMatch = Math.max(0, 1 - (income / 500000)); // Normalize against 500k
  }
  
  // ST Bracket match
  const stBrackets = criteria.eligibleSTBrackets || [];
  let stBracketMatch;
  if (stBrackets.length > 0) {
    stBracketMatch = stBrackets.includes(studentProfile.stBracket) ? 1 : 0;
  } else {
    // No specific requirement - use ST bracket as financial need indicator
    stBracketMatch = normalizeSTBracket(studentProfile.stBracket);
  }
  
  // College match - binary
  let collegeMatch;
  if (criteria.eligibleColleges?.length > 0) {
    collegeMatch = criteria.eligibleColleges.includes(studentProfile.college) ? 1 : 0;
  } else {
    collegeMatch = 0.5; // Neutral when no college restriction
  }
  
  // Course match - binary
  let courseMatch;
  if (criteria.eligibleCourses?.length > 0) {
    const studentCourse = (studentProfile.course || '').toLowerCase();
    courseMatch = criteria.eligibleCourses.some(c => 
      studentCourse.includes(c.toLowerCase()) || c.toLowerCase().includes(studentCourse)
    ) ? 1 : 0;
  } else {
    courseMatch = 0.5; // Neutral when no course restriction
  }
  
  // Citizenship match
  let citizenshipMatch;
  if (criteria.eligibleCitizenship?.length > 0) {
    citizenshipMatch = criteria.eligibleCitizenship.includes(studentProfile.citizenship) ? 1 : 0;
  } else if (criteria.isFilipinoOnly || criteria.filipinoOnly) {
    citizenshipMatch = studentProfile.citizenship === 'Filipino' ? 1 : 0;
  } else {
    citizenshipMatch = studentProfile.citizenship === 'Filipino' ? 0.6 : 0.4; // Slight preference
  }
  
  // Document completeness
  const documentCompleteness = studentProfile.profileCompleted ? 1 : 0.5;
  
  // Application timing (neutral for predictions before applying)
  const applicationTiming = 0.5;
  
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
  
  const eligibilityScore = totalCriteria > 0 ? matchedCriteria / totalCriteria : 0.7;
  
  // Get weights from database or use defaults
  const weights = dbWeights || {
    intercept: -2.5,
    gwaScore: 2.5,
    yearLevelMatch: 0.6,
    incomeMatch: 1.8,
    stBracketMatch: 1.5,
    collegeMatch: 1.5,
    courseMatch: 1.8,
    citizenshipMatch: 0.5,
    documentCompleteness: 0.7,
    applicationTiming: 0.3,
    eligibilityScore: 3.0
  };
  const usedTrainedModel = !!dbWeights;
  
  // Use intercept from weights or default
  const intercept = weights.intercept ?? -2.5;
  
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
  
  // Calculate z-score
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
  
  // Apply sigmoid (natural bounds without additional capping)
  const rawProbability = sigmoid(z);
  
  // Don't artificially cap at 90% - let the model determine the probability
  // Only apply soft bounds to avoid extreme values (5% - 95%)
  const probability = Math.max(0.05, Math.min(0.95, rawProbability));
  
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
 */
function getPredictionFactors(user, scholarship) {
  const prediction = predict(user, scholarship);
  const categorized = {};
  
  const { contributions, features } = prediction;
  
  // Calculate total absolute contribution for normalization
  let totalAbsoluteContribution = 0;
  for (const [featureName, data] of Object.entries(contributions)) {
    totalAbsoluteContribution += Math.abs(data.contribution || 0);
  }
  
  // Group by category
  for (const [category, featureList] of Object.entries(MODEL_CONFIG.featureCategories)) {
    categorized[category] = [];
    
    for (const featureName of featureList) {
      const data = contributions[featureName];
      if (!data) continue;
      
      const description = MODEL_CONFIG.featureDescriptions[featureName] || '';
      const contribution = data.contribution || 0;
      const value = data.value || 0;
      
      // Normalize contribution to 0-1 scale (percentage of total impact)
      const contributionPercentage = totalAbsoluteContribution > 0
        ? Math.abs(contribution) / totalAbsoluteContribution
        : 0;
      
      categorized[category].push({
        factor: formatFactorName(featureName),
        value: value,
        contribution: contribution,
        contributionPercentage: contributionPercentage, // Now 0-1 scale
        description: description,
        impact: getImpactLevel(contributionPercentage) // Use normalized value for impact
      });
    }
    
    // Sort by absolute contribution within category
    categorized[category].sort((a, b) => 
      Math.abs(b.contribution) - Math.abs(a.contribution)
    );
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

/**
 * Get impact level based on normalized contribution percentage (0-1 scale)
 */
function getImpactLevel(normalizedContribution) {
  // normalizedContribution is 0-1 representing percentage of total impact
  if (normalizedContribution > 0.25) return 'high';      // >25% of total
  if (normalizedContribution > 0.15) return 'medium';    // 15-25% of total
  return 'low';                                           // <15% of total
}

// =============================================================================
// Model Management
// =============================================================================

/**
 * Get current model state
 */
function getModelState() {
  return {
    ...trainedModel,
    config: MODEL_CONFIG
  };
}

/**
 * Get feature importance rankings
 */
function getFeatureImportance() {
  const weights = trainedModel.weights || DEFAULT_WEIGHTS;
  
  let totalAbsolute = 0;
  const absoluteWeights = {};
  
  for (const [name, weight] of Object.entries(weights)) {
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
 * Reset model to default weights
 */
function resetModel() {
  trainedModel = {
    weights: { ...DEFAULT_WEIGHTS },
    bias: DEFAULT_BIAS,
    trained: false,
    trainingDate: null,
    trainingSize: 0,
    metrics: null,
    version: '2.0.0'
  };
  return trainedModel;
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Training
  trainModel,
  prepareTrainingData,
  
  // Prediction
  predict,
  predictAsync,  // New: async prediction using trained models from DB
  getPredictionFactors,
  extractFeaturesFromUserAndScholarship,
  
  // Model management
  getModelState,
  getFeatureImportance,
  resetModel,
  loadModelWeights,      // New: load weights from TrainedModel DB
  clearModelWeightsCache, // New: clear cached weights
  
  // Utilities
  sigmoid,
  normalizeGWA,
  normalizeIncome,
  normalizeSTBracket,
  normalizeYearLevel,
  
  // Constants
  MODEL_CONFIG,
  DEFAULT_WEIGHTS
};
