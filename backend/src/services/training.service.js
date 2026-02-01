// =============================================================================
// ISKOlarship - Model Training Service
// Implements actual logistic regression training with gradient descent
// Supports per-scholarship model training
// =============================================================================

const { Application } = require('../models');
const { Scholarship } = require('../models/Scholarship.model');
const { TrainedModel } = require('../models/TrainedModel.model');

// =============================================================================
// Configuration
// =============================================================================

const TRAINING_CONFIG = {
  learningRate: 0.1,
  epochs: 1000,
  regularization: 0.01,
  trainTestSplit: 0.8,
  minSamplesGlobal: 50,
  minSamplesPerScholarship: 30,
  convergenceThreshold: 0.0001,
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
  ]
};

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
  eligibilityScore: 'Overall Eligibility'
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
  eligibilityScore: 'eligibility'
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
 */
function extractFeatures(application, scholarship) {
  const snapshot = application.applicantSnapshot || {};
  const criteria = scholarship?.eligibilityCriteria || {};
  
  return {
    gwaScore: normalizeGWA(snapshot.gwa, criteria.maxGWA || criteria.minGWA || 3.0),
    yearLevelMatch: checkYearLevelMatch(snapshot.classification, criteria.eligibleClassifications),
    incomeMatch: checkIncomeMatch(snapshot.annualFamilyIncome, criteria.maxAnnualFamilyIncome, criteria.eligibleSTBrackets),
    stBracketMatch: checkSTBracketMatch(snapshot.stBracket, criteria.eligibleSTBrackets),
    collegeMatch: checkCollegeMatch(snapshot.college, criteria.eligibleColleges),
    courseMatch: checkCourseMatch(snapshot.course, criteria.eligibleCourses),
    citizenshipMatch: checkCitizenshipMatch(snapshot.citizenship, criteria.eligibleCitizenship),
    documentCompleteness: calculateDocumentCompleteness(application.documents, scholarship?.requiredDocuments),
    applicationTiming: calculateApplicationTiming(application.createdAt, scholarship?.applicationStartDate, scholarship?.applicationDeadline),
    eligibilityScore: (application.eligibilityPercentage || 50) / 100
  };
}

/**
 * Extract features from user profile and scholarship (for predictions)
 */
function extractFeaturesFromUserAndScholarship(user, scholarship) {
  const profile = user.studentProfile || {};
  const criteria = scholarship?.eligibilityCriteria || {};
  
  return {
    gwaScore: normalizeGWA(profile.gwa, criteria.maxGWA || criteria.minGWA || 3.0),
    yearLevelMatch: checkYearLevelMatch(profile.classification, criteria.eligibleClassifications),
    incomeMatch: checkIncomeMatch(profile.annualFamilyIncome, criteria.maxAnnualFamilyIncome, criteria.eligibleSTBrackets),
    stBracketMatch: checkSTBracketMatch(profile.stBracket, criteria.eligibleSTBrackets),
    collegeMatch: checkCollegeMatch(profile.college, criteria.eligibleColleges),
    courseMatch: checkCourseMatch(profile.course, criteria.eligibleCourses),
    citizenshipMatch: checkCitizenshipMatch(profile.citizenship, criteria.eligibleCitizenship),
    documentCompleteness: 0.8, // Assume partial docs for predictions
    applicationTiming: 0.7, // Assume reasonable timing for predictions
    eligibilityScore: 0.7 // Will be calculated by eligibility service
  };
}

// =============================================================================
// Mathematical Functions
// =============================================================================

/**
 * Sigmoid activation function
 */
function sigmoid(z) {
  if (z > 20) return 0.95;
  if (z < -20) return 0.05;
  const raw = 1 / (1 + Math.exp(-z));
  return Math.max(0.05, Math.min(0.95, raw));
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

// =============================================================================
// Training Functions
// =============================================================================

/**
 * Initialize weights based on scholarship type
 * Different scholarship types have different feature importance
 */
function initializeWeights(scholarshipType) {
  // Default weights
  const weights = {
    gwaScore: 1.5,
    yearLevelMatch: 0.8,
    incomeMatch: 1.0,
    stBracketMatch: 0.8,
    collegeMatch: 1.0,
    courseMatch: 0.8,
    citizenshipMatch: 0.5,
    documentCompleteness: 1.2,
    applicationTiming: 0.4,
    eligibilityScore: 2.0
  };
  
  // Adjust based on scholarship type
  switch (scholarshipType) {
    case 'University Scholarship':
      // Merit-based: Higher GWA weight
      weights.gwaScore = 2.5;
      weights.incomeMatch = 0.8;
      break;
      
    case 'College Scholarship':
      // College-specific: Higher college/course match
      weights.collegeMatch = 2.0;
      weights.courseMatch = 1.5;
      weights.gwaScore = 1.8;
      break;
      
    case 'Government Scholarship':
      // Need + Merit based
      weights.gwaScore = 2.0;
      weights.incomeMatch = 1.8;
      weights.stBracketMatch = 1.5;
      break;
      
    case 'Private Scholarship':
      // Varies - balanced
      weights.gwaScore = 1.8;
      weights.incomeMatch = 1.5;
      weights.documentCompleteness = 1.5;
      break;
      
    case 'Thesis/Research Grant':
      // Academic focus
      weights.gwaScore = 2.2;
      weights.yearLevelMatch = 1.5; // Must be senior/graduate
      weights.courseMatch = 1.2;
      break;
  }
  
  return weights;
}

/**
 * Train logistic regression model using gradient descent
 */
async function trainModel(samples, config = {}) {
  const {
    learningRate = TRAINING_CONFIG.learningRate,
    epochs = TRAINING_CONFIG.epochs,
    regularization = TRAINING_CONFIG.regularization,
    scholarshipType = null
  } = config;
  
  // Initialize weights
  let weights = initializeWeights(scholarshipType);
  let bias = -1.0;
  
  // Training history
  const history = [];
  let prevLoss = Infinity;
  let convergenceEpoch = epochs;
  
  // Train
  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    
    // Shuffle samples each epoch
    const shuffled = [...samples].sort(() => Math.random() - 0.5);
    
    for (const sample of shuffled) {
      // Forward pass
      const z = dotProduct(weights, sample.features) + bias;
      const prediction = sigmoid(z);
      const error = sample.label - prediction;
      
      // Backward pass (gradient descent)
      for (const [feature, value] of Object.entries(sample.features)) {
        if (weights[feature] !== undefined) {
          // Update weight with L2 regularization
          weights[feature] += learningRate * (error * value - regularization * weights[feature]);
        }
      }
      bias += learningRate * error;
      
      // Accumulate loss
      totalLoss += binaryCrossEntropy(sample.label, prediction);
    }
    
    const avgLoss = totalLoss / samples.length;
    history.push({ epoch, loss: avgLoss });
    
    // Check convergence
    if (Math.abs(prevLoss - avgLoss) < TRAINING_CONFIG.convergenceThreshold) {
      convergenceEpoch = epoch;
      break;
    }
    prevLoss = avgLoss;
  }
  
  return {
    weights,
    bias,
    history,
    convergenceEpoch,
    finalLoss: history[history.length - 1]?.loss || 0
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
 * Train global model on all applications
 */
async function trainGlobalModel(adminId = null) {
  console.log('🎯 Training Global Model...');
  
  // Fetch all applications with outcomes
  const applications = await Application.find({
    status: { $in: ['approved', 'rejected'] }
  }).populate('scholarship').lean();
  
  if (applications.length < TRAINING_CONFIG.minSamplesGlobal) {
    throw new Error(`Insufficient training data. Need at least ${TRAINING_CONFIG.minSamplesGlobal} samples, found ${applications.length}`);
  }
  
  console.log(`📊 Found ${applications.length} applications for training`);
  
  // Extract features and labels
  const samples = applications.map(app => ({
    features: extractFeatures(app, app.scholarship),
    label: app.status === 'approved' ? 1 : 0
  }));
  
  // Split into train/test
  const shuffled = samples.sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * TRAINING_CONFIG.trainTestSplit);
  const trainSamples = shuffled.slice(0, splitIndex);
  const testSamples = shuffled.slice(splitIndex);
  
  console.log(`📈 Training on ${trainSamples.length} samples, testing on ${testSamples.length}`);
  
  // Count outcomes
  const approvedCount = samples.filter(s => s.label === 1).length;
  const rejectedCount = samples.filter(s => s.label === 0).length;
  
  // Train
  const { weights, bias, convergenceEpoch, finalLoss } = await trainModel(trainSamples, {
    scholarshipType: null
  });
  
  // Evaluate
  const metrics = evaluateModel(weights, bias, testSamples);
  
  console.log(`✅ Training complete! Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
  
  // Calculate feature importance
  const featureImportance = calculateFeatureImportance(weights);
  
  // Build feature metadata
  const features = Object.keys(weights).map(name => ({
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
    version: '2.0.0',
    scholarshipId: null,
    modelType: 'global',
    isActive: true,
    weights,
    bias,
    features,
    metrics: {
      ...metrics,
      convergenceEpoch,
      finalLoss
    },
    trainingConfig: TRAINING_CONFIG,
    trainingStats: {
      totalSamples: samples.length,
      approvedCount,
      rejectedCount,
      trainSetSize: trainSamples.length,
      testSetSize: testSamples.length
    },
    featureImportance,
    trainedBy: adminId,
    notes: `Trained on ${applications.length} applications`
  });
  
  await model.save();
  
  return {
    model,
    metrics,
    featureImportance
  };
}

/**
 * Train model for a specific scholarship
 */
async function trainScholarshipModel(scholarshipId, adminId = null) {
  console.log(`🎯 Training model for scholarship: ${scholarshipId}`);
  
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
  const samples = applications.map(app => ({
    features: extractFeatures(app, scholarship),
    label: app.status === 'approved' ? 1 : 0
  }));
  
  // Split into train/test
  const shuffled = samples.sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * TRAINING_CONFIG.trainTestSplit);
  const trainSamples = shuffled.slice(0, splitIndex);
  const testSamples = shuffled.slice(splitIndex);
  
  console.log(`📈 Training on ${trainSamples.length} samples, testing on ${testSamples.length}`);
  
  // Count outcomes
  const approvedCount = samples.filter(s => s.label === 1).length;
  const rejectedCount = samples.filter(s => s.label === 0).length;
  
  // Train with scholarship type-specific initialization
  const { weights, bias, convergenceEpoch, finalLoss } = await trainModel(trainSamples, {
    scholarshipType: scholarship.scholarshipType
  });
  
  // Evaluate
  const metrics = evaluateModel(weights, bias, testSamples);
  
  console.log(`✅ Training complete! Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
  
  // Calculate feature importance
  const featureImportance = calculateFeatureImportance(weights);
  
  // Build feature metadata
  const features = Object.keys(weights).map(name => ({
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
    version: '2.0.0',
    scholarshipId,
    scholarshipType: scholarship.scholarshipType,
    modelType: 'scholarship_specific',
    isActive: true,
    weights,
    bias,
    features,
    metrics: {
      ...metrics,
      convergenceEpoch,
      finalLoss
    },
    trainingConfig: TRAINING_CONFIG,
    trainingStats: {
      totalSamples: samples.length,
      approvedCount,
      rejectedCount,
      trainSetSize: trainSamples.length,
      testSetSize: testSamples.length
    },
    featureImportance,
    trainedBy: adminId,
    notes: `Trained specifically for ${scholarship.name}`
  });
  
  await model.save();
  
  return {
    model,
    scholarship,
    metrics,
    featureImportance
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
