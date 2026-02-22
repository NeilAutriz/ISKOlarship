// =============================================================================
// Train on ALL UPLB Scholarship Data
// =============================================================================
// This script trains the logistic regression model on ALL scholarship 
// applications in the database to derive data-driven weights specific
// to UPLB scholarships.
//
// Usage: node scripts/train-all-scholarships.js
// =============================================================================

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolaship';

// Import models
const { Application } = require('../src/models');
const { Scholarship } = require('../src/models/Scholarship.model');
const { TrainedModel } = require('../src/models/TrainedModel.model');
const { User } = require('../src/models/User.model');

// Import cache clearing function (for live server updates)
let clearModelWeightsCache = null;
try {
  clearModelWeightsCache = require('../src/services/logisticRegression.service').clearModelWeightsCache;
} catch (e) {
  // Script may run standalone without the service
}

// =============================================================================
// Training Configuration
// =============================================================================
const TRAINING_CONFIG = {
  learningRate: 0.1,
  epochs: 1000,
  batchSize: 16,
  regularization: 0.0001,
  convergenceThreshold: 0.00001,
  earlyStoppingPatience: 100,
  kFolds: 5,
  minSamples: 20
};

// Features to train (base features only - simpler and more stable)
const FEATURE_NAMES = [
  'gwaScore',
  'yearLevelMatch',
  'incomeMatch',
  'stBracketMatch',
  'collegeMatch',
  'courseMatch',
  'citizenshipMatch',
  'applicationTiming',
  'eligibilityScore'
];

// =============================================================================
// Feature Extraction Functions
// =============================================================================

function normalizeGWA(gwa, requiredGWA = 3.0) {
  if (!gwa || gwa < 1 || gwa > 5) return 0.5;
  const normalized = (5 - gwa) / 4;
  if (gwa <= requiredGWA) {
    const bonus = (requiredGWA - gwa) / requiredGWA * 0.2;
    return Math.min(1, normalized + bonus);
  }
  return normalized;
}

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

function checkIncomeMatch(studentIncome, maxIncome) {
  if (!maxIncome) return 0.8;
  if (!studentIncome) return 0.5;
  if (studentIncome <= maxIncome) {
    return 1.0 - (studentIncome / maxIncome) * 0.3;
  }
  return 0.0;
}

function checkSTBracketMatch(studentBracket, eligibleBrackets) {
  if (!eligibleBrackets || eligibleBrackets.length === 0) return 0.8;
  if (!studentBracket) return 0.5;
  
  const normalized = studentBracket.toLowerCase().replace(/\s+/g, '');
  const isMatch = eligibleBrackets.some(bracket => {
    const normalizedBracket = bracket.toLowerCase().replace(/\s+/g, '');
    return normalized === normalizedBracket || normalized.includes(normalizedBracket);
  });
  
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

function checkCitizenshipMatch(studentCitizenship, eligibleCitizenship) {
  if (!eligibleCitizenship || eligibleCitizenship.length === 0) return 1.0;
  if (!studentCitizenship) return 0.8;
  
  const normalized = studentCitizenship.toLowerCase();
  const isMatch = eligibleCitizenship.some(citizenship => 
    normalized === citizenship.toLowerCase()
  );
  return isMatch ? 1.0 : 0.0;
}

function calculateApplicationTiming(submittedAt, deadline) {
  if (!submittedAt || !deadline) return 0.7;
  
  const submitted = new Date(submittedAt);
  const dead = new Date(deadline);
  const daysBeforeDeadline = (dead - submitted) / (1000 * 60 * 60 * 24);
  
  if (daysBeforeDeadline < 0) return 0.0;
  if (daysBeforeDeadline > 30) return 1.0;
  if (daysBeforeDeadline > 14) return 0.9;
  if (daysBeforeDeadline > 7) return 0.7;
  if (daysBeforeDeadline > 3) return 0.5;
  return 0.3;
}

// =============================================================================
// Extract features from an application
// =============================================================================
function extractFeatures(application, scholarship, studentProfile) {
  const criteria = scholarship.eligibilityCriteria || {};
  
  const gwaScore = normalizeGWA(
    studentProfile?.gwa || application.academicInfo?.gwa,
    criteria.maxGWA || 3.0
  );
  
  const yearLevels = criteria.eligibleYearLevels || 
                     criteria.yearLevels || 
                     scholarship.yearLevels || [];
  const yearLevelMatch = checkYearLevelMatch(
    studentProfile?.classification || application.academicInfo?.yearLevel,
    yearLevels
  );
  
  const incomeMatch = checkIncomeMatch(
    studentProfile?.annualFamilyIncome || application.financialInfo?.annualFamilyIncome,
    criteria.maxAnnualFamilyIncome
  );
  
  const stBracketMatch = checkSTBracketMatch(
    studentProfile?.stBracket || application.financialInfo?.stBracket,
    criteria.eligibleSTBrackets || criteria.stBrackets
  );
  
  const collegeMatch = checkCollegeMatch(
    studentProfile?.college,
    criteria.eligibleColleges
  );
  
  const courseMatch = checkCourseMatch(
    studentProfile?.course,
    criteria.eligibleCourses
  );
  
  const citizenshipMatch = checkCitizenshipMatch(
    studentProfile?.citizenship,
    criteria.eligibleCitizenship
  );
  
  const applicationTiming = calculateApplicationTiming(
    application.submittedAt,
    scholarship.applicationDeadline
  );
  
  // Calculate eligibility score
  let matchedCriteria = 0;
  let totalCriteria = 0;
  
  if (criteria.maxGWA) {
    totalCriteria++;
    const gwa = studentProfile?.gwa || application.academicInfo?.gwa;
    if (gwa && gwa <= criteria.maxGWA) matchedCriteria++;
  }
  if (criteria.maxAnnualFamilyIncome) {
    totalCriteria++;
    const income = studentProfile?.annualFamilyIncome || application.financialInfo?.annualFamilyIncome;
    if (income && income <= criteria.maxAnnualFamilyIncome) matchedCriteria++;
  }
  if (yearLevels.length > 0) {
    totalCriteria++;
    if (yearLevelMatch === 1.0) matchedCriteria++;
  }
  if (criteria.eligibleColleges?.length > 0) {
    totalCriteria++;
    if (collegeMatch === 1.0) matchedCriteria++;
  }
  if (criteria.eligibleCourses?.length > 0) {
    totalCriteria++;
    if (courseMatch === 1.0) matchedCriteria++;
  }
  
  const eligibilityScore = totalCriteria > 0 ? matchedCriteria / totalCriteria : 0.8;
  
  return {
    gwaScore,
    yearLevelMatch,
    incomeMatch,
    stBracketMatch,
    collegeMatch,
    courseMatch,
    citizenshipMatch,
    applicationTiming,
    eligibilityScore
  };
}

// =============================================================================
// Mathematical Functions
// =============================================================================

function sigmoid(z) {
  const clipped = Math.max(-500, Math.min(500, z));
  return 1 / (1 + Math.exp(-clipped));
}

function binaryCrossEntropy(yTrue, yPred) {
  const eps = 1e-15;
  const p = Math.max(eps, Math.min(1 - eps, yPred));
  return -(yTrue * Math.log(p) + (1 - yTrue) * Math.log(1 - p));
}

function dotProduct(weights, features) {
  let sum = 0;
  for (const [key, value] of Object.entries(features)) {
    if (weights[key] !== undefined) {
      sum += weights[key] * value;
    }
  }
  return sum;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// =============================================================================
// Training Function
// =============================================================================

function trainModel(samples, config = {}) {
  const {
    learningRate = TRAINING_CONFIG.learningRate,
    epochs = TRAINING_CONFIG.epochs,
    batchSize = TRAINING_CONFIG.batchSize,
    regularization = TRAINING_CONFIG.regularization,
    earlyStoppingPatience = TRAINING_CONFIG.earlyStoppingPatience
  } = config;
  
  // Initialize weights with small positive values
  let weights = {};
  for (const feature of FEATURE_NAMES) {
    weights[feature] = 0.5;
  }
  let bias = 0;
  
  // Calculate class weights
  const positiveCount = samples.filter(s => s.label === 1).length;
  const negativeCount = samples.filter(s => s.label === 0).length;
  const total = samples.length;
  
  const positiveWeight = total / (2 * Math.max(1, positiveCount));
  const negativeWeight = total / (2 * Math.max(1, negativeCount));
  
  console.log(`   Class distribution: ${positiveCount} approved, ${negativeCount} rejected`);
  console.log(`   Class weights: positive=${positiveWeight.toFixed(2)}, negative=${negativeWeight.toFixed(2)}`);
  
  // Track best model
  let bestWeights = { ...weights };
  let bestBias = bias;
  let bestLoss = Infinity;
  let noImprovementCount = 0;
  
  const effectiveBatchSize = Math.min(batchSize, Math.floor(samples.length / 2));
  const initialLR = learningRate;
  
  // Train
  for (let epoch = 0; epoch < epochs; epoch++) {
    const currentLR = initialLR / (1 + 0.001 * epoch);
    const shuffled = shuffleArray(samples);
    
    let epochLoss = 0;
    let sampleCount = 0;
    
    for (let i = 0; i < shuffled.length; i += effectiveBatchSize) {
      const batch = shuffled.slice(i, i + effectiveBatchSize);
      
      const weightGradients = {};
      for (const feature of FEATURE_NAMES) {
        weightGradients[feature] = 0;
      }
      let biasGradient = 0;
      
      for (const sample of batch) {
        const z = bias + dotProduct(weights, sample.features);
        const prediction = sigmoid(z);
        const error = prediction - sample.label;
        
        const classWeight = sample.label === 1 ? positiveWeight : negativeWeight;
        const weightedError = error * classWeight;
        
        for (const feature of FEATURE_NAMES) {
          const featureValue = sample.features[feature] || 0;
          weightGradients[feature] += weightedError * featureValue;
        }
        biasGradient += weightedError;
        
        epochLoss += binaryCrossEntropy(sample.label, prediction) * classWeight;
        sampleCount++;
      }
      
      // Update weights with regularization
      for (const feature of FEATURE_NAMES) {
        const gradient = weightGradients[feature] / batch.length;
        const regTerm = regularization * weights[feature];
        weights[feature] -= currentLR * (gradient + regTerm);
        // Clip weights
        weights[feature] = Math.max(-5, Math.min(5, weights[feature]));
      }
      
      const biasGradientAvg = biasGradient / batch.length;
      bias -= currentLR * biasGradientAvg;
      // Clip bias
      bias = Math.max(-3, Math.min(3, bias));
    }
    
    epochLoss /= sampleCount;
    
    // Track best model
    if (epochLoss < bestLoss - TRAINING_CONFIG.convergenceThreshold) {
      bestLoss = epochLoss;
      bestWeights = { ...weights };
      bestBias = bias;
      noImprovementCount = 0;
    } else {
      noImprovementCount++;
    }
    
    // Early stopping
    if (noImprovementCount >= earlyStoppingPatience) {
      console.log(`   Early stopping at epoch ${epoch + 1}`);
      break;
    }
    
    // Progress logging
    if ((epoch + 1) % 100 === 0) {
      console.log(`   Epoch ${epoch + 1}: loss=${epochLoss.toFixed(6)}`);
    }
  }
  
  return {
    weights: bestWeights,
    bias: bestBias,
    loss: bestLoss
  };
}

// =============================================================================
// Evaluate Model
// =============================================================================

function evaluateModel(weights, bias, samples) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  const predictions = [];
  
  for (const sample of samples) {
    const z = bias + dotProduct(weights, sample.features);
    const prob = sigmoid(z);
    const predicted = prob >= 0.5 ? 1 : 0;
    
    predictions.push({ actual: sample.label, predicted, probability: prob });
    
    if (sample.label === 1 && predicted === 1) tp++;
    else if (sample.label === 0 && predicted === 0) tn++;
    else if (sample.label === 0 && predicted === 1) fp++;
    else fn++;
  }
  
  const accuracy = (tp + tn) / samples.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  
  return {
    accuracy,
    precision,
    recall,
    f1Score: f1,
    confusionMatrix: { tp, tn, fp, fn }
  };
}

// =============================================================================
// Main Training Script
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║       UPLB Scholarship Model Training (All Scholarships)           ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');
    
    // Get all applications with their scholarships and students
    console.log('📊 Loading all scholarship applications...');
    
    const applications = await Application.find({
      status: { $in: ['approved', 'rejected'] }
    }).populate('scholarship').populate('applicant');
    
    console.log(`   Found ${applications.length} applications (approved/rejected)`);
    
    if (applications.length < TRAINING_CONFIG.minSamples) {
      console.log('');
      console.log('⚠️  Not enough data for training. Need at least', TRAINING_CONFIG.minSamples, 'samples.');
      console.log('');
      console.log('📝 Generating synthetic training data from scholarships...');
      
      // Generate synthetic data from scholarship criteria
      await generateSyntheticTrainingData();
      return;
    }
    
    // Prepare training samples
    console.log('');
    console.log('🔧 Extracting features from applications...');
    
    const samples = [];
    let skipped = 0;
    
    for (const app of applications) {
      if (!app.scholarship) {
        skipped++;
        continue;
      }
      
      // Get student profile from the applicant or the applicantSnapshot
      let studentProfile = null;
      if (app.applicant && app.applicant.studentProfile) {
        studentProfile = app.applicant.studentProfile;
      } else if (app.applicantSnapshot) {
        studentProfile = app.applicantSnapshot;
      }
      
      const features = extractFeatures(app, app.scholarship, studentProfile);
      const label = app.status === 'approved' ? 1 : 0;
      
      samples.push({
        features,
        label,
        applicationId: app._id
      });
    }
    
    console.log(`   Extracted features from ${samples.length} applications (${skipped} skipped)`);
    
    // Show label distribution
    const approved = samples.filter(s => s.label === 1).length;
    const rejected = samples.filter(s => s.label === 0).length;
    console.log(`   Distribution: ${approved} approved (${(approved/samples.length*100).toFixed(1)}%), ${rejected} rejected (${(rejected/samples.length*100).toFixed(1)}%)`);
    
    // Train the model
    console.log('');
    console.log('🎓 Training logistic regression model...');
    console.log('');
    
    const result = trainModel(samples, TRAINING_CONFIG);
    
    // Evaluate on all data
    console.log('');
    console.log('📈 Evaluating model...');
    const metrics = evaluateModel(result.weights, result.bias, samples);
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                      TRAINING RESULTS                              ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Model Performance:');
    console.log(`   Accuracy:  ${(metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   Precision: ${(metrics.precision * 100).toFixed(2)}%`);
    console.log(`   Recall:    ${(metrics.recall * 100).toFixed(2)}%`);
    console.log(`   F1 Score:  ${(metrics.f1Score * 100).toFixed(2)}%`);
    console.log('');
    console.log('🧮 Confusion Matrix:');
    console.log(`   True Positives:  ${metrics.confusionMatrix.tp}`);
    console.log(`   True Negatives:  ${metrics.confusionMatrix.tn}`);
    console.log(`   False Positives: ${metrics.confusionMatrix.fp}`);
    console.log(`   False Negatives: ${metrics.confusionMatrix.fn}`);
    console.log('');
    
    // Output the trained weights
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                 TRAINED WEIGHTS (UPLB Data-Driven)                 ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Copy these weights to DEFAULT_PREDICTION_WEIGHTS in:');
    console.log('  - backend/src/services/logisticRegression.service.js');
    console.log('  - frontend/src/services/logisticRegression.ts');
    console.log('');
    console.log('const DEFAULT_PREDICTION_WEIGHTS = {');
    console.log(`  intercept: ${result.bias.toFixed(4)},`);
    
    // Sort features by absolute weight value
    const sortedFeatures = FEATURE_NAMES.sort((a, b) => 
      Math.abs(result.weights[b]) - Math.abs(result.weights[a])
    );
    
    for (const feature of sortedFeatures) {
      const weight = result.weights[feature];
      console.log(`  ${feature}: ${weight.toFixed(4)},`);
    }
    console.log('};');
    console.log('');
    
    // Feature importance ranking
    console.log('📈 Feature Importance Ranking (by absolute weight):');
    for (let i = 0; i < sortedFeatures.length; i++) {
      const feature = sortedFeatures[i];
      const weight = result.weights[feature];
      const importance = (Math.abs(weight) / sortedFeatures.reduce((sum, f) => sum + Math.abs(result.weights[f]), 0) * 100).toFixed(1);
      console.log(`   ${i + 1}. ${feature}: ${weight.toFixed(4)} (${importance}% importance)`);
    }
    
    // Save to database as global model
    console.log('');
    console.log('💾 Saving trained model to database...');
    
    const trainedModel = new TrainedModel({
      name: 'UPLB Global Model (All Scholarships)',
      modelType: 'global',
      version: '1.0.0',
      weights: {
        ...result.weights,
        intercept: result.bias
      },
      bias: result.bias,
      metrics: {
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1Score,
        truePositives: metrics.confusionMatrix.tp,
        trueNegatives: metrics.confusionMatrix.tn,
        falsePositives: metrics.confusionMatrix.fp,
        falseNegatives: metrics.confusionMatrix.fn
      },
      trainingStats: {
        totalSamples: samples.length,
        approvedCount: approved,
        rejectedCount: rejected,
        trainSetSize: samples.length,
        testSetSize: 0
      },
      trainingConfig: {
        learningRate: TRAINING_CONFIG.learningRate,
        epochs: TRAINING_CONFIG.epochs,
        regularization: TRAINING_CONFIG.regularization
      },
      isActive: true,
      trainedAt: new Date()
    });
    
    // Deactivate previous global models
    await TrainedModel.updateMany(
      { modelType: 'global' },
      { isActive: false }
    );
    
    await trainedModel.save();
    console.log('✅ Model saved to database');
    
    // Clear weights cache if available (for live server)
    if (clearModelWeightsCache) {
      clearModelWeightsCache();
      console.log('🔄 Cleared model weights cache');
    }
    
    console.log('');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('✅ Training complete!');
    console.log('   The model is now active and will be used for predictions.');
    console.log('════════════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('🔌 Disconnected from MongoDB');
  }
}

// =============================================================================
// Generate Synthetic Training Data from Scholarships
// =============================================================================

async function generateSyntheticTrainingData() {
  console.log('');
  console.log('📝 Generating synthetic data from existing scholarships...');
  
  const scholarships = await Scholarship.find({});
  console.log(`   Found ${scholarships.length} scholarships`);
  
  if (scholarships.length === 0) {
    console.log('❌ No scholarships found. Please create scholarships first.');
    return;
  }
  
  const samples = [];
  
  for (const scholarship of scholarships) {
    const criteria = scholarship.eligibilityCriteria || {};
    
    // Generate ~10 synthetic samples per scholarship
    for (let i = 0; i < 10; i++) {
      // Randomly decide if this will be an approved or rejected case
      const isApproved = Math.random() > 0.4; // 60% approval rate
      
      // Generate features based on whether approved or rejected
      const features = {};
      
      if (isApproved) {
        // Generate features for an approved student (high scores)
        features.gwaScore = 0.7 + Math.random() * 0.3; // 0.7-1.0
        features.yearLevelMatch = 1.0;
        features.incomeMatch = 0.8 + Math.random() * 0.2;
        features.stBracketMatch = 0.7 + Math.random() * 0.3;
        features.collegeMatch = 1.0;
        features.courseMatch = 1.0;
        features.citizenshipMatch = 1.0;
        features.applicationTiming = 0.7 + Math.random() * 0.3;
        features.eligibilityScore = 0.8 + Math.random() * 0.2;
      } else {
        // Generate features for a rejected student (mixed/low scores)
        features.gwaScore = 0.3 + Math.random() * 0.4; // 0.3-0.7
        features.yearLevelMatch = Math.random() > 0.5 ? 1.0 : 0.0;
        features.incomeMatch = Math.random() * 0.7;
        features.stBracketMatch = Math.random() * 0.6;
        features.collegeMatch = Math.random() > 0.3 ? 1.0 : 0.0;
        features.courseMatch = Math.random() > 0.3 ? 1.0 : 0.0;
        features.citizenshipMatch = Math.random() > 0.2 ? 1.0 : 0.0;
        features.applicationTiming = 0.3 + Math.random() * 0.5;
        features.eligibilityScore = 0.2 + Math.random() * 0.5;
      }
      
      samples.push({
        features,
        label: isApproved ? 1 : 0
      });
    }
  }
  
  console.log(`   Generated ${samples.length} synthetic samples`);
  
  // Train on synthetic data
  console.log('');
  console.log('🎓 Training on synthetic data...');
  console.log('');
  
  const result = trainModel(samples, TRAINING_CONFIG);
  const metrics = evaluateModel(result.weights, result.bias, samples);
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              SYNTHETIC DATA TRAINING RESULTS                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📊 Model Performance:');
  console.log(`   Accuracy:  ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`   Precision: ${(metrics.precision * 100).toFixed(2)}%`);
  console.log(`   Recall:    ${(metrics.recall * 100).toFixed(2)}%`);
  console.log(`   F1 Score:  ${(metrics.f1Score * 100).toFixed(2)}%`);
  console.log('');
  
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║          TRAINED WEIGHTS (Based on UPLB Scholarships)              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('const DEFAULT_PREDICTION_WEIGHTS = {');
  console.log(`  intercept: ${result.bias.toFixed(4)},`);
  
  const sortedFeatures = FEATURE_NAMES.sort((a, b) => 
    Math.abs(result.weights[b]) - Math.abs(result.weights[a])
  );
  
  for (const feature of sortedFeatures) {
    console.log(`  ${feature}: ${result.weights[feature].toFixed(4)},`);
  }
  console.log('};');
  console.log('');
  
  // Save to database
  console.log('💾 Saving model to database...');
  
  const trainedModel = new TrainedModel({
    name: 'UPLB Model (Synthetic Training)',
    type: 'global',
    version: '1.0.0',
    weights: {
      ...result.weights,
      intercept: result.bias
    },
    bias: result.bias,
    metrics: metrics,
    trainingInfo: {
      totalSamples: samples.length,
      approvedCount: samples.filter(s => s.label === 1).length,
      rejectedCount: samples.filter(s => s.label === 0).length,
      featureCount: FEATURE_NAMES.length,
      isSynthetic: true,
      trainedAt: new Date()
    },
    isActive: true,
    isGlobal: true
  });
  
  await TrainedModel.updateMany({ isGlobal: true }, { isActive: false });
  await trainedModel.save();
  
  console.log('✅ Model saved!');
  console.log('');
  console.log('⚠️  Note: This model was trained on synthetic data.');
  console.log('   Re-run training after collecting more real applications.');
}

// Run the script
main().catch(console.error);
