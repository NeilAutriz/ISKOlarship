// =============================================================================
// ISKOlarship - Model Training Service
// Implements actual logistic regression training with gradient descent
// Supports per-scholarship model training
// =============================================================================

const { Application } = require('../models');
const { Scholarship } = require('../models/Scholarship.model');
const { TrainedModel } = require('../models/TrainedModel.model');
const { clearModelWeightsCache } = require('./logisticRegression.service');

// =============================================================================
// Configuration
// =============================================================================

const TRAINING_CONFIG = {
  learningRate: 0.1,         // Increased for faster convergence
  epochs: 500,               // More epochs with early stopping
  batchSize: 8,              // Smaller batches for better gradient estimation
  regularization: 0.0001,    // Very light regularization
  trainTestSplit: 0.8,
  minSamplesGlobal: 50,
  minSamplesPerScholarship: 30,
  convergenceThreshold: 0.00001,
  earlyStoppingPatience: 50, // More patience
  kFolds: 5,                 // 5-fold cross-validation for consistent results
  randomSeed: 42,            // Fixed seed for reproducibility
  // Base features
  baseFeatureNames: [
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
  // All features including interactions
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
    'eligibilityScore',
    // Interaction features
    'academicStrength',      // gwa * yearLevel
    'financialNeed',         // income * stBracket
    'programFit',            // college * course
    'applicationQuality',    // docs * timing
    'overallFit'             // eligibility * academic
  ]
};

// =============================================================================
// Seeded Random Number Generator (for reproducibility)
// =============================================================================

class SeededRandom {
  constructor(seed = 42) {
    this.seed = seed;
    this.current = seed;
  }
  
  // Linear Congruential Generator
  next() {
    this.current = (this.current * 1103515245 + 12345) & 0x7fffffff;
    return this.current / 0x7fffffff;
  }
  
  // Reset to initial seed
  reset() {
    this.current = this.seed;
  }
  
  // Get random integer in range [0, max)
  nextInt(max) {
    return Math.floor(this.next() * max);
  }
}

// Global seeded random instance
let seededRandom = new SeededRandom(TRAINING_CONFIG.randomSeed);

// Feature display names
const FEATURE_DISPLAY_NAMES = {
  gwaScore: 'GWA Score',
  yearLevelMatch: 'Year Level Match',
  incomeMatch: 'Income Eligibility',
  stBracketMatch: 'ST Bracket Match',
  collegeMatch: 'College Match',
  courseMatch: 'Course/Program Match',
  citizenshipMatch: 'Citizenship Match',
  documentCompleteness: 'Document Completeness',
  applicationTiming: 'Application Timing',
  eligibilityScore: 'Overall Eligibility',
  // Interaction features
  academicStrength: 'Academic Strength',
  financialNeed: 'Financial Need',
  programFit: 'Program Fit',
  applicationQuality: 'Application Quality',
  overallFit: 'Overall Fit'
};

// Feature categories
const FEATURE_CATEGORIES = {
  gwaScore: 'academic',
  yearLevelMatch: 'academic',
  incomeMatch: 'financial',
  stBracketMatch: 'financial',
  collegeMatch: 'eligibility',
  courseMatch: 'eligibility',
  citizenshipMatch: 'demographic',
  documentCompleteness: 'eligibility',
  applicationTiming: 'other',
  eligibilityScore: 'eligibility',
  // Interaction features
  academicStrength: 'academic',
  financialNeed: 'financial',
  programFit: 'eligibility',
  applicationQuality: 'eligibility',
  overallFit: 'eligibility'
};

// =============================================================================
// Feature Extraction Functions
// =============================================================================

/**
 * Normalize GWA to 0-1 scale (lower GWA is better in Philippine system)
 */
function normalizeGWA(gwa, requiredGWA = 3.0) {
  if (!gwa || gwa < 1 || gwa > 5) return 0.5;
  
  // Convert to 0-1 where higher is better
  // 1.0 GWA = 1.0, 5.0 GWA = 0.0
  const normalized = (5 - gwa) / 4;
  
  // Bonus for meeting/exceeding requirement
  if (gwa <= requiredGWA) {
    const bonus = (requiredGWA - gwa) / requiredGWA * 0.2;
    return Math.min(1, normalized + bonus);
  }
  
  return normalized;
}

/**
 * Check year level match
 */
function checkYearLevelMatch(studentYearLevel, eligibleYearLevels) {
  if (!eligibleYearLevels || eligibleYearLevels.length === 0) return 1.0;
  if (!studentYearLevel) return 0.5;
  
  const normalized = studentYearLevel.toLowerCase().replace(/\s+/g, '');
  const isMatch = eligibleYearLevels.some(level => {
    const normalizedLevel = level.toLowerCase().replace(/\s+/g, '');
    return normalized === normalizedLevel || normalized.includes(normalizedLevel);
  });
  
  return isMatch ? 1.0 : 0.0;
}

/**
 * Check income eligibility
 */
function checkIncomeMatch(studentIncome, maxIncome, stBrackets) {
  if (!maxIncome && (!stBrackets || stBrackets.length === 0)) return 0.8; // No requirement
  
  // Income-based check
  if (maxIncome) {
    if (!studentIncome) return 0.5;
    if (studentIncome <= maxIncome) {
      // Lower income = higher score for need-based
      return 1.0 - (studentIncome / maxIncome) * 0.5;
    }
    return 0.0;
  }
  
  return 0.8;
}

/**
 * Check ST Bracket match
 */
function checkSTBracketMatch(studentBracket, eligibleBrackets) {
  if (!eligibleBrackets || eligibleBrackets.length === 0) return 0.8;
  if (!studentBracket) return 0.5;
  
  const normalized = studentBracket.toLowerCase().replace(/\s+/g, '');
  const isMatch = eligibleBrackets.some(bracket => {
    const normalizedBracket = bracket.toLowerCase().replace(/\s+/g, '');
    return normalized === normalizedBracket || normalized.includes(normalizedBracket);
  });
  
  // ST bracket importance scoring
  const bracketScores = {
    'fulldiscountwithstipend': 1.0,
    'fulldiscount': 0.9,
    'pd80': 0.7,
    'pd60': 0.5,
    'pd40': 0.3,
    'pd20': 0.2,
    'nodiscount': 0.1
  };
  
  return isMatch ? (bracketScores[normalized] || 0.8) : 0.0;
}

/**
 * Check college match
 */
function checkCollegeMatch(studentCollege, eligibleColleges) {
  if (!eligibleColleges || eligibleColleges.length === 0) return 1.0;
  if (!studentCollege) return 0.5;
  
  const normalized = studentCollege.toLowerCase();
  const isMatch = eligibleColleges.some(college => {
    const normalizedCollege = college.toLowerCase();
    return normalized.includes(normalizedCollege) || normalizedCollege.includes(normalized);
  });
  
  return isMatch ? 1.0 : 0.0;
}

/**
 * Check course/program match
 */
function checkCourseMatch(studentCourse, eligibleCourses) {
  if (!eligibleCourses || eligibleCourses.length === 0) return 1.0;
  if (!studentCourse) return 0.5;
  
  const normalized = studentCourse.toLowerCase();
  const isMatch = eligibleCourses.some(course => {
    const normalizedCourse = course.toLowerCase();
    return normalized.includes(normalizedCourse) || normalizedCourse.includes(normalized);
  });
  
  return isMatch ? 1.0 : 0.0;
}

/**
 * Check citizenship match
 */
function checkCitizenshipMatch(studentCitizenship, eligibleCitizenship) {
  if (!eligibleCitizenship || eligibleCitizenship.length === 0) return 1.0;
  if (!studentCitizenship) return 0.8;
  
  const normalized = studentCitizenship.toLowerCase();
  const isMatch = eligibleCitizenship.some(citizenship => 
    normalized === citizenship.toLowerCase()
  );
  
  return isMatch ? 1.0 : 0.0;
}

/**
 * Calculate document completeness score
 */
function calculateDocumentCompleteness(documents, requiredDocs) {
  if (!requiredDocs || requiredDocs.length === 0) return 1.0;
  if (!documents || documents.length === 0) return 0.0;
  
  const uploadedTypes = new Set(documents.map(d => {
    const docType = d.documentType || d.type || d.name || '';
    return typeof docType === 'string' ? docType.toLowerCase() : '';
  }));
  
  let matched = 0;
  let totalRequired = 0;
  
  for (const required of requiredDocs) {
    // Handle both string format and object format {name, description, isRequired}
    let requiredName = '';
    let isRequired = true;
    
    if (typeof required === 'string') {
      requiredName = required;
    } else if (required && typeof required === 'object') {
      requiredName = required.name || required.documentType || '';
      isRequired = required.isRequired !== false; // Default to true
    }
    
    if (!requiredName || !isRequired) continue;
    
    totalRequired++;
    const normalizedRequired = requiredName.toLowerCase();
    
    // Check if any uploaded doc matches (partial match for flexibility)
    for (const uploaded of uploadedTypes) {
      if (uploaded.includes(normalizedRequired) || normalizedRequired.includes(uploaded)) {
        matched++;
        break;
      }
    }
  }
  
  return totalRequired > 0 ? matched / totalRequired : 1.0;
}

/**
 * Calculate application timing score
 */
function calculateApplicationTiming(applicationDate, openDate, deadlineDate) {
  if (!applicationDate || !deadlineDate) return 0.5;
  
  const app = new Date(applicationDate);
  const open = openDate ? new Date(openDate) : new Date(deadlineDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const deadline = new Date(deadlineDate);
  
  const totalWindow = deadline.getTime() - open.getTime();
  const timeSinceOpen = app.getTime() - open.getTime();
  
  if (timeSinceOpen < 0) return 0.9; // Before opening - very early
  if (timeSinceOpen > totalWindow) return 0.1; // After deadline
  
  // Earlier = better
  const percentThrough = timeSinceOpen / totalWindow;
  return 1.0 - (percentThrough * 0.8); // 0.2 to 1.0 range
}

/**
 * Extract features from an application for training/prediction
 * Includes interaction features for better predictive power
 */
function extractFeatures(application, scholarship) {
  const snapshot = application.applicantSnapshot || {};
  const criteria = scholarship?.eligibilityCriteria || {};
  
  // Base features
  const gwaScore = normalizeGWA(snapshot.gwa, criteria.maxGWA || criteria.minGWA || 3.0);
  const yearLevelMatch = checkYearLevelMatch(snapshot.classification, criteria.eligibleClassifications);
  const incomeMatch = checkIncomeMatch(snapshot.annualFamilyIncome, criteria.maxAnnualFamilyIncome, criteria.eligibleSTBrackets);
  const stBracketMatch = checkSTBracketMatch(snapshot.stBracket, criteria.eligibleSTBrackets);
  const collegeMatch = checkCollegeMatch(snapshot.college, criteria.eligibleColleges);
  const courseMatch = checkCourseMatch(snapshot.course, criteria.eligibleCourses);
  const citizenshipMatch = checkCitizenshipMatch(snapshot.citizenship, criteria.eligibleCitizenship);
  const documentCompleteness = calculateDocumentCompleteness(application.documents, scholarship?.requiredDocuments);
  const applicationTiming = calculateApplicationTiming(application.createdAt, scholarship?.applicationStartDate, scholarship?.applicationDeadline);
  const eligibilityScore = (application.eligibilityPercentage || 50) / 100;
  
  // Interaction features (capture non-linear relationships)
  const academicStrength = gwaScore * yearLevelMatch;
  const financialNeed = incomeMatch * stBracketMatch;
  const programFit = collegeMatch * courseMatch;
  const applicationQuality = documentCompleteness * applicationTiming;
  const overallFit = eligibilityScore * academicStrength;
  
  return {
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
    // Interaction features
    academicStrength,
    financialNeed,
    programFit,
    applicationQuality,
    overallFit
  };
}

/**
 * Extract features from user profile and scholarship (for predictions)
 */
function extractFeaturesFromUserAndScholarship(user, scholarship) {
  const profile = user.studentProfile || {};
  const criteria = scholarship?.eligibilityCriteria || {};
  
  // Base features
  const gwaScore = normalizeGWA(profile.gwa, criteria.maxGWA || criteria.minGWA || 3.0);
  const yearLevelMatch = checkYearLevelMatch(profile.classification, criteria.eligibleClassifications);
  const incomeMatch = checkIncomeMatch(profile.annualFamilyIncome, criteria.maxAnnualFamilyIncome, criteria.eligibleSTBrackets);
  const stBracketMatch = checkSTBracketMatch(profile.stBracket, criteria.eligibleSTBrackets);
  const collegeMatch = checkCollegeMatch(profile.college, criteria.eligibleColleges);
  const courseMatch = checkCourseMatch(profile.course, criteria.eligibleCourses);
  const citizenshipMatch = checkCitizenshipMatch(profile.citizenship, criteria.eligibleCitizenship);
  const documentCompleteness = 0.8; // Assume partial docs for predictions
  const applicationTiming = 0.7; // Assume reasonable timing for predictions
  const eligibilityScore = 0.7; // Will be calculated by eligibility service
  
  // Interaction features
  const academicStrength = gwaScore * yearLevelMatch;
  const financialNeed = incomeMatch * stBracketMatch;
  const programFit = collegeMatch * courseMatch;
  const applicationQuality = documentCompleteness * applicationTiming;
  const overallFit = eligibilityScore * academicStrength;
  
  return {
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
    // Interaction features
    academicStrength,
    financialNeed,
    programFit,
    applicationQuality,
    overallFit
  };
}

// =============================================================================
// Mathematical Functions
// =============================================================================

/**
 * Sigmoid activation function with numerical stability
 */
function sigmoid(z) {
  // Clip to prevent overflow
  const clipped = Math.max(-500, Math.min(500, z));
  return 1 / (1 + Math.exp(-clipped));
}

/**
 * Binary cross-entropy loss
 */
function binaryCrossEntropy(yTrue, yPred) {
  const eps = 1e-15;
  const p = Math.max(eps, Math.min(1 - eps, yPred));
  return -(yTrue * Math.log(p) + (1 - yTrue) * Math.log(1 - p));
}

/**
 * Dot product
 */
function dotProduct(weights, features) {
  let sum = 0;
  for (const [key, value] of Object.entries(features)) {
    if (weights[key] !== undefined) {
      sum += weights[key] * value;
    }
  }
  return sum;
}

/**
 * Fisher-Yates shuffle using seeded random (deterministic)
 */
function shuffleArraySeeded(array, rng) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Fisher-Yates shuffle with Math.random (for backward compatibility)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// =============================================================================
// Training Functions
// =============================================================================

/**
 * Initialize weights with EQUAL values for fully dynamic learning
 * All weights start the same - the model learns importance from data
 */
function initializeWeights(scholarshipType) {
  // All weights start equal at 0.1 - fully dynamic, no bias
  const INITIAL_VALUE = 0.1;
  
  const weights = {
    // Base features - all equal
    gwaScore: INITIAL_VALUE,
    yearLevelMatch: INITIAL_VALUE,
    incomeMatch: INITIAL_VALUE,
    stBracketMatch: INITIAL_VALUE,
    collegeMatch: INITIAL_VALUE,
    courseMatch: INITIAL_VALUE,
    citizenshipMatch: INITIAL_VALUE,
    documentCompleteness: INITIAL_VALUE,
    applicationTiming: INITIAL_VALUE,
    eligibilityScore: INITIAL_VALUE,
    // Interaction features - all equal
    academicStrength: INITIAL_VALUE,
    financialNeed: INITIAL_VALUE,
    programFit: INITIAL_VALUE,
    applicationQuality: INITIAL_VALUE,
    overallFit: INITIAL_VALUE
  };
  
  return weights;
}

/**
 * K-Fold Cross-Validation to get stable metrics
 */
function createKFolds(samples, k, rng) {
  // Shuffle samples deterministically
  const shuffled = shuffleArraySeeded(samples, rng);
  
  const foldSize = Math.floor(shuffled.length / k);
  const folds = [];
  
  for (let i = 0; i < k; i++) {
    const start = i * foldSize;
    const end = i === k - 1 ? shuffled.length : start + foldSize;
    folds.push(shuffled.slice(start, end));
  }
  
  return folds;
}

/**
 * Train logistic regression model using mini-batch gradient descent
 * with early stopping, class weighting, and best model tracking
 * Uses seeded random for reproducibility
 */
async function trainModel(samples, config = {}) {
  const {
    learningRate = TRAINING_CONFIG.learningRate,
    epochs = TRAINING_CONFIG.epochs,
    batchSize = TRAINING_CONFIG.batchSize,
    regularization = TRAINING_CONFIG.regularization,
    earlyStoppingPatience = TRAINING_CONFIG.earlyStoppingPatience,
    scholarshipType = null
  } = config;
  
  // Initialize weights
  let weights = initializeWeights(scholarshipType);
  let bias = 0;
  
  // Calculate class weights for imbalanced data
  const positiveCount = samples.filter(s => s.label === 1).length;
  const negativeCount = samples.filter(s => s.label === 0).length;
  const total = samples.length;
  
  // Class weights: higher weight for minority class
  const positiveWeight = total / (2 * Math.max(1, positiveCount));
  const negativeWeight = total / (2 * Math.max(1, negativeCount));
  
  console.log(`   Class weights: positive=${positiveWeight.toFixed(2)}, negative=${negativeWeight.toFixed(2)}`);
  
  // Track best model
  let bestWeights = { ...weights };
  let bestBias = bias;
  let bestLoss = Infinity;
  let noImprovementCount = 0;
  
  // Training history
  const history = [];
  let convergenceEpoch = epochs;
  
  // Ensure batch size doesn't exceed sample count
  const effectiveBatchSize = Math.min(batchSize, Math.floor(samples.length / 2));
  
  // Learning rate schedule - decay over time
  const initialLR = learningRate;
  
  // Train
  for (let epoch = 0; epoch < epochs; epoch++) {
    // Learning rate decay
    const currentLR = initialLR / (1 + 0.001 * epoch);
    
    // Shuffle samples at the start of each epoch using seeded random
    const shuffled = shuffleArraySeeded(samples, seededRandom);
    
    let epochLoss = 0;
    let sampleCount = 0;
    
    // Process mini-batches
    for (let i = 0; i < shuffled.length; i += effectiveBatchSize) {
      const batch = shuffled.slice(i, i + effectiveBatchSize);
      
      // Accumulate gradients for the batch
      const weightGradients = {};
      for (const feature of Object.keys(weights)) {
        weightGradients[feature] = 0;
      }
      let biasGradient = 0;
      let batchLoss = 0;
      
      for (const sample of batch) {
        // Class weight for this sample
        const classWeight = sample.label === 1 ? positiveWeight : negativeWeight;
        
        // Forward pass
        const z = dotProduct(weights, sample.features) + bias;
        const prediction = sigmoid(z);
        const error = (prediction - sample.label) * classWeight;
        
        // Accumulate weighted gradients
        for (const [feature, value] of Object.entries(sample.features)) {
          if (weightGradients[feature] !== undefined) {
            weightGradients[feature] += error * value;
          }
        }
        biasGradient += error;
        
        // Accumulate weighted loss
        batchLoss += binaryCrossEntropy(sample.label, prediction) * classWeight;
      }
      
      // Update weights using averaged gradients + L2 regularization
      const batchScale = 1 / batch.length;
      for (const feature of Object.keys(weights)) {
        const gradient = weightGradients[feature] * batchScale + regularization * weights[feature];
        weights[feature] -= currentLR * gradient;
        
        // Clip weights to prevent extreme values that cause prediction spikes
        // Reasonable range for logistic regression weights: [-5, 5]
        weights[feature] = Math.max(-5, Math.min(5, weights[feature]));
      }
      bias -= currentLR * biasGradient * batchScale;
      // Clip bias as well
      bias = Math.max(-3, Math.min(3, bias));
      
      epochLoss += batchLoss;
      sampleCount += batch.length;
    }
    
    const avgLoss = epochLoss / sampleCount;
    
    // Track best model
    if (avgLoss < bestLoss) {
      bestLoss = avgLoss;
      bestWeights = { ...weights };
      bestBias = bias;
      noImprovementCount = 0;
    } else {
      noImprovementCount++;
    }
    
    // Early stopping
    if (noImprovementCount >= earlyStoppingPatience) {
      console.log(`   Early stopping at epoch ${epoch + 1} (no improvement for ${earlyStoppingPatience} epochs)`);
      convergenceEpoch = epoch + 1;
      break;
    }
    
    // Log progress every 50 epochs
    if ((epoch + 1) % 50 === 0 || epoch === 0) {
      // Calculate training accuracy
      let correct = 0;
      for (const sample of samples) {
        const z = dotProduct(weights, sample.features) + bias;
        const pred = sigmoid(z) >= 0.5 ? 1 : 0;
        if (pred === sample.label) correct++;
      }
      const accuracy = correct / samples.length;
      
      history.push({ epoch: epoch + 1, loss: avgLoss, accuracy });
      console.log(`   Epoch ${epoch + 1}: Loss = ${avgLoss.toFixed(4)}, Accuracy = ${(accuracy * 100).toFixed(1)}%`);
    }
    
    // Check for convergence
    if (avgLoss < TRAINING_CONFIG.convergenceThreshold) {
      console.log(`   Converged at epoch ${epoch + 1}`);
      convergenceEpoch = epoch + 1;
      break;
    }
  }
  
  // Return the best model found during training
  return {
    weights: bestWeights,
    bias: bestBias,
    history,
    convergenceEpoch,
    finalLoss: bestLoss
  };
}

/**
 * Evaluate model on test set
 */
function evaluateModel(weights, bias, testSamples, threshold = 0.5) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  
  for (const sample of testSamples) {
    const z = dotProduct(weights, sample.features) + bias;
    const prediction = sigmoid(z);
    const predicted = prediction >= threshold ? 1 : 0;
    
    if (sample.label === 1 && predicted === 1) tp++;
    else if (sample.label === 0 && predicted === 0) tn++;
    else if (sample.label === 0 && predicted === 1) fp++;
    else fn++;
  }
  
  const accuracy = (tp + tn) / testSamples.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  
  return {
    accuracy,
    precision,
    recall,
    f1Score,
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn
  };
}

/**
 * Calculate feature importance from weights
 */
function calculateFeatureImportance(weights) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + Math.abs(w), 0);
  
  const importance = {};
  for (const [feature, weight] of Object.entries(weights)) {
    importance[feature] = totalWeight > 0 ? Math.abs(weight) / totalWeight : 0;
  }
  
  return importance;
}

// =============================================================================
// Main Training API
// =============================================================================

/**
 * Train global model on all applications using K-Fold Cross-Validation
 * This ensures consistent, reproducible results
 */
async function trainGlobalModel(adminId = null) {
  console.log('🎯 Training Global Model with K-Fold Cross-Validation...');
  
  // Reset the seeded random for reproducibility
  seededRandom = new SeededRandom(TRAINING_CONFIG.randomSeed);
  
  // Fetch all applications with outcomes
  const applications = await Application.find({
    status: { $in: ['approved', 'rejected'] }
  }).populate('scholarship').lean();
  
  if (applications.length < TRAINING_CONFIG.minSamplesGlobal) {
    throw new Error(`Insufficient training data. Need at least ${TRAINING_CONFIG.minSamplesGlobal} samples, found ${applications.length}`);
  }
  
  console.log(`📊 Found ${applications.length} applications for training`);
  
  // Extract features and labels
  const allSamples = applications.map(app => ({
    features: extractFeatures(app, app.scholarship),
    label: app.status === 'approved' ? 1 : 0
  }));
  
  // Count outcomes
  const approvedCount = allSamples.filter(s => s.label === 1).length;
  const rejectedCount = allSamples.filter(s => s.label === 0).length;
  
  console.log(`   Approved: ${approvedCount}, Rejected: ${rejectedCount}`);
  
  // Create K folds using seeded random
  const k = TRAINING_CONFIG.kFolds;
  const folds = createKFolds(allSamples, k, seededRandom);
  
  console.log(`📈 Performing ${k}-fold cross-validation...`);
  
  // Store metrics from each fold
  const foldMetrics = [];
  const foldWeights = [];
  const foldBiases = [];
  
  // Train on each fold
  for (let i = 0; i < k; i++) {
    console.log(`\n   Fold ${i + 1}/${k}:`);
    
    // Create train/test split for this fold
    const testSamples = folds[i];
    const trainSamples = folds.filter((_, idx) => idx !== i).flat();
    
    // Train model
    const { weights, bias, convergenceEpoch, finalLoss } = await trainModel(trainSamples, {
      scholarshipType: null
    });
    
    // Evaluate on held-out fold
    const metrics = evaluateModel(weights, bias, testSamples);
    
    console.log(`   Fold ${i + 1} Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
    
    foldMetrics.push(metrics);
    foldWeights.push(weights);
    foldBiases.push(bias);
  }
  
  // Calculate average metrics across folds
  const avgMetrics = {
    accuracy: foldMetrics.reduce((sum, m) => sum + m.accuracy, 0) / k,
    precision: foldMetrics.reduce((sum, m) => sum + m.precision, 0) / k,
    recall: foldMetrics.reduce((sum, m) => sum + m.recall, 0) / k,
    f1Score: foldMetrics.reduce((sum, m) => sum + m.f1Score, 0) / k,
    truePositives: foldMetrics.reduce((sum, m) => sum + m.truePositives, 0),
    trueNegatives: foldMetrics.reduce((sum, m) => sum + m.trueNegatives, 0),
    falsePositives: foldMetrics.reduce((sum, m) => sum + m.falsePositives, 0),
    falseNegatives: foldMetrics.reduce((sum, m) => sum + m.falseNegatives, 0)
  };
  
  // Calculate standard deviation of accuracy (for reporting consistency)
  const accuracyStd = Math.sqrt(
    foldMetrics.reduce((sum, m) => sum + Math.pow(m.accuracy - avgMetrics.accuracy, 2), 0) / k
  );
  
  console.log(`\n✅ Cross-Validation Complete!`);
  console.log(`   Average Accuracy: ${(avgMetrics.accuracy * 100).toFixed(1)}% (±${(accuracyStd * 100).toFixed(1)}%)`);
  console.log(`   Precision: ${(avgMetrics.precision * 100).toFixed(1)}%`);
  console.log(`   Recall: ${(avgMetrics.recall * 100).toFixed(1)}%`);
  console.log(`   F1 Score: ${(avgMetrics.f1Score * 100).toFixed(1)}%`);
  
  // Average the weights from all folds for final model
  const finalWeights = {};
  for (const feature of TRAINING_CONFIG.featureNames) {
    finalWeights[feature] = foldWeights.reduce((sum, w) => sum + w[feature], 0) / k;
  }
  const finalBias = foldBiases.reduce((sum, b) => sum + b, 0) / k;
  
  // Calculate feature importance from averaged weights
  const featureImportance = calculateFeatureImportance(finalWeights);
  
  // Build feature metadata
  const features = Object.keys(finalWeights).map(name => ({
    name,
    displayName: FEATURE_DISPLAY_NAMES[name] || name,
    category: FEATURE_CATEGORIES[name] || 'other',
    importance: featureImportance[name]
  }));
  
  // Deactivate previous global models
  await TrainedModel.updateMany(
    { modelType: 'global' },
    { isActive: false }
  );
  
  // Save new model
  const model = new TrainedModel({
    name: `Global Model v${Date.now()}`,
    version: '2.1.0',
    scholarshipId: null,
    modelType: 'global',
    isActive: true,
    weights: finalWeights,
    bias: finalBias,
    features,
    metrics: {
      ...avgMetrics,
      accuracyStd,
      foldAccuracies: foldMetrics.map(m => m.accuracy)
    },
    trainingConfig: TRAINING_CONFIG,
    trainingStats: {
      totalSamples: allSamples.length,
      approvedCount,
      rejectedCount,
      kFolds: k
    },
    featureImportance,
    trainedBy: adminId,
    notes: `Trained with ${k}-fold cross-validation on ${applications.length} applications`
  });
  
  await model.save();
  
  // Clear the cached weights so predictions use the new model
  clearModelWeightsCache();
  console.log('🔄 Cleared model weights cache');
  
  return {
    model,
    metrics: avgMetrics,
    featureImportance,
    foldAccuracies: foldMetrics.map(m => m.accuracy)
  };
}

/**
 * Train model for a specific scholarship using K-Fold Cross-Validation
 */
async function trainScholarshipModel(scholarshipId, adminId = null) {
  console.log(`🎯 Training model for scholarship: ${scholarshipId}`);
  
  // Reset the seeded random for reproducibility
  seededRandom = new SeededRandom(TRAINING_CONFIG.randomSeed);
  
  // Get scholarship
  const scholarship = await Scholarship.findById(scholarshipId);
  if (!scholarship) {
    throw new Error('Scholarship not found');
  }
  
  // Fetch applications for this scholarship with outcomes
  const applications = await Application.find({
    scholarship: scholarshipId,
    status: { $in: ['approved', 'rejected'] }
  }).lean();
  
  if (applications.length < TRAINING_CONFIG.minSamplesPerScholarship) {
    throw new Error(`Insufficient training data for this scholarship. Need at least ${TRAINING_CONFIG.minSamplesPerScholarship} samples, found ${applications.length}`);
  }
  
  console.log(`📊 Found ${applications.length} applications for ${scholarship.name}`);
  
  // Extract features and labels
  const allSamples = applications.map(app => ({
    features: extractFeatures(app, scholarship),
    label: app.status === 'approved' ? 1 : 0
  }));
  
  // Count outcomes
  const approvedCount = allSamples.filter(s => s.label === 1).length;
  const rejectedCount = allSamples.filter(s => s.label === 0).length;
  
  console.log(`   Approved: ${approvedCount}, Rejected: ${rejectedCount}`);
  
  // Create K folds using seeded random
  const k = TRAINING_CONFIG.kFolds;
  const folds = createKFolds(allSamples, k, seededRandom);
  
  console.log(`📈 Performing ${k}-fold cross-validation...`);
  
  // Store metrics from each fold
  const foldMetrics = [];
  const foldWeights = [];
  const foldBiases = [];
  
  // Train on each fold
  for (let i = 0; i < k; i++) {
    console.log(`   Fold ${i + 1}/${k}:`);
    
    // Create train/test split for this fold
    const testSamples = folds[i];
    const trainSamples = folds.filter((_, idx) => idx !== i).flat();
    
    // Train with scholarship type-specific initialization
    const { weights, bias, convergenceEpoch, finalLoss } = await trainModel(trainSamples, {
      scholarshipType: scholarship.scholarshipType
    });
    
    // Evaluate on held-out fold
    const metrics = evaluateModel(weights, bias, testSamples);
    
    console.log(`   Fold ${i + 1} Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
    
    foldMetrics.push(metrics);
    foldWeights.push(weights);
    foldBiases.push(bias);
  }
  
  // Calculate average metrics across folds
  const avgMetrics = {
    accuracy: foldMetrics.reduce((sum, m) => sum + m.accuracy, 0) / k,
    precision: foldMetrics.reduce((sum, m) => sum + m.precision, 0) / k,
    recall: foldMetrics.reduce((sum, m) => sum + m.recall, 0) / k,
    f1Score: foldMetrics.reduce((sum, m) => sum + m.f1Score, 0) / k,
    truePositives: foldMetrics.reduce((sum, m) => sum + m.truePositives, 0),
    trueNegatives: foldMetrics.reduce((sum, m) => sum + m.trueNegatives, 0),
    falsePositives: foldMetrics.reduce((sum, m) => sum + m.falsePositives, 0),
    falseNegatives: foldMetrics.reduce((sum, m) => sum + m.falseNegatives, 0)
  };
  
  // Calculate standard deviation of accuracy
  const accuracyStd = Math.sqrt(
    foldMetrics.reduce((sum, m) => sum + Math.pow(m.accuracy - avgMetrics.accuracy, 2), 0) / k
  );
  
  console.log(`\n✅ Cross-Validation Complete!`);
  console.log(`   Average Accuracy: ${(avgMetrics.accuracy * 100).toFixed(1)}% (±${(accuracyStd * 100).toFixed(1)}%)`);
  
  // Average the weights from all folds for final model
  const finalWeights = {};
  for (const feature of TRAINING_CONFIG.featureNames) {
    finalWeights[feature] = foldWeights.reduce((sum, w) => sum + w[feature], 0) / k;
  }
  const finalBias = foldBiases.reduce((sum, b) => sum + b, 0) / k;
  
  // Calculate feature importance
  const featureImportance = calculateFeatureImportance(finalWeights);
  
  // Build feature metadata
  const features = Object.keys(finalWeights).map(name => ({
    name,
    displayName: FEATURE_DISPLAY_NAMES[name] || name,
    category: FEATURE_CATEGORIES[name] || 'other',
    importance: featureImportance[name]
  }));
  
  // Deactivate previous models for this scholarship
  await TrainedModel.updateMany(
    { scholarshipId },
    { isActive: false }
  );
  
  // Save new model
  const model = new TrainedModel({
    name: `${scholarship.name} Model v${Date.now()}`,
    version: '2.1.0',
    scholarshipId,
    scholarshipType: scholarship.scholarshipType,
    modelType: 'scholarship_specific',
    isActive: true,
    weights: finalWeights,
    bias: finalBias,
    features,
    metrics: {
      ...avgMetrics,
      accuracyStd,
      foldAccuracies: foldMetrics.map(m => m.accuracy)
    },
    trainingConfig: TRAINING_CONFIG,
    trainingStats: {
      totalSamples: allSamples.length,
      approvedCount,
      rejectedCount,
      kFolds: k
    },
    featureImportance,
    trainedBy: adminId,
    notes: `Trained with ${k}-fold cross-validation for ${scholarship.name}`
  });
  
  await model.save();
  
  // Clear the cached weights so predictions use the new model
  clearModelWeightsCache();
  console.log('🔄 Cleared model weights cache');
  
  return {
    model,
    scholarship,
    metrics: avgMetrics,
    featureImportance,
    foldAccuracies: foldMetrics.map(m => m.accuracy)
  };
}

/**
 * Train models for all scholarships with sufficient data
 */
async function trainAllScholarshipModels(adminId = null) {
  console.log('🎯 Training models for all scholarships with sufficient data...');
  
  const results = [];
  
  // Get all scholarships
  const scholarships = await Scholarship.find({ status: 'active' }).lean();
  
  for (const scholarship of scholarships) {
    // Count applications
    const count = await Application.countDocuments({
      scholarship: scholarship._id,
      status: { $in: ['approved', 'rejected'] }
    });
    
    if (count >= TRAINING_CONFIG.minSamplesPerScholarship) {
      try {
        const result = await trainScholarshipModel(scholarship._id, adminId);
        results.push({
          scholarshipId: scholarship._id,
          scholarshipName: scholarship.name,
          success: true,
          ...result.metrics
        });
      } catch (error) {
        results.push({
          scholarshipId: scholarship._id,
          scholarshipName: scholarship.name,
          success: false,
          error: error.message
        });
      }
    } else {
      results.push({
        scholarshipId: scholarship._id,
        scholarshipName: scholarship.name,
        success: false,
        error: `Insufficient data (${count}/${TRAINING_CONFIG.minSamplesPerScholarship})`
      });
    }
  }
  
  return results;
}

/**
 * Get prediction for a user and scholarship
 */
async function getPrediction(user, scholarship) {
  // Get model (scholarship-specific or global fallback)
  const model = await TrainedModel.getActiveModelForScholarship(scholarship._id || scholarship.id);
  
  if (!model) {
    // No trained model, use default weights
    return {
      probability: 0.5,
      confidence: 'low',
      message: 'No trained model available',
      usingDefault: true
    };
  }
  
  // Extract features
  const features = extractFeaturesFromUserAndScholarship(user, scholarship);
  
  // Get prediction
  const probability = model.predict(features);
  
  // Determine confidence
  let confidence = 'low';
  if (probability >= 0.7 || probability <= 0.3) confidence = 'high';
  else if (probability >= 0.5 || probability <= 0.5) confidence = 'medium';
  
  // Get feature contributions
  const featureContributions = {};
  for (const [feature, value] of Object.entries(features)) {
    if (model.weights[feature] !== undefined) {
      featureContributions[feature] = model.weights[feature] * value;
    }
  }
  
  return {
    probability,
    confidence,
    predictedOutcome: probability >= 0.5 ? 'approved' : 'rejected',
    modelId: model._id,
    modelType: model.modelType,
    featureContributions,
    topFactors: model.getFeatureRanking().slice(0, 3)
  };
}

/**
 * Get training statistics
 */
async function getTrainingStats() {
  // Count applications by status
  const statusCounts = await Application.aggregate([
    { $match: { status: { $in: ['approved', 'rejected'] } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // Count by scholarship
  const scholarshipCounts = await Application.aggregate([
    { $match: { status: { $in: ['approved', 'rejected'] } } },
    { $group: { _id: '$scholarship', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  // Get model count
  const modelCount = await TrainedModel.countDocuments();
  const activeModels = await TrainedModel.countDocuments({ isActive: true });
  
  // Scholarships with enough data
  const scholarshipsWithEnoughData = scholarshipCounts.filter(
    s => s.count >= TRAINING_CONFIG.minSamplesPerScholarship
  ).length;
  
  return {
    totalApplications: statusCounts.reduce((sum, s) => sum + s.count, 0),
    approvedCount: statusCounts.find(s => s._id === 'approved')?.count || 0,
    rejectedCount: statusCounts.find(s => s._id === 'rejected')?.count || 0,
    totalModels: modelCount,
    activeModels,
    scholarshipsWithData: scholarshipCounts.length,
    scholarshipsWithEnoughData,
    minSamplesRequired: TRAINING_CONFIG.minSamplesPerScholarship,
    scholarshipBreakdown: scholarshipCounts
  };
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  trainGlobalModel,
  trainScholarshipModel,
  trainAllScholarshipModels,
  getPrediction,
  getTrainingStats,
  extractFeatures,
  extractFeaturesFromUserAndScholarship,
  TRAINING_CONFIG,
  FEATURE_DISPLAY_NAMES,
  FEATURE_CATEGORIES
};
