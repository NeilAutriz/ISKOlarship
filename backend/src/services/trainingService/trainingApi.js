// =============================================================================
// Training Service - Training API
// High-level training functions for global and scholarship-specific models
// =============================================================================

const { Application } = require('../../models');
const { Scholarship } = require('../../models/Scholarship.model');
const { TrainedModel } = require('../../models/TrainedModel.model');
const { clearModelWeightsCache } = require('../logisticRegression.service');

const { TRAINING_CONFIG, FEATURE_DISPLAY_NAMES, FEATURE_CATEGORIES } = require('./constants');
const { SeededRandom, resetSeededRandom, getSeededRandom } = require('./seededRandom');
const { extractFeatures, extractFeaturesFromUserAndScholarship } = require('./featureExtraction');
const { trainModel, evaluateModel, calculateFeatureImportance } = require('./modelTraining');
const { createKFolds, calculateAverageMetrics, calculateAccuracyStd, averageWeights, averageBiases } = require('./validation');

/**
 * Train global model on all applications using K-Fold Cross-Validation
 * This ensures consistent, reproducible results
 * @param {string} adminId - ID of admin performing training (optional)
 * @returns {Object} Training results with model, metrics, and feature importance
 */
async function trainGlobalModel(adminId = null) {
  console.log('🎯 Training Global Model with K-Fold Cross-Validation...');
  
  // Reset the seeded random for reproducibility
  resetSeededRandom(TRAINING_CONFIG.randomSeed);
  const seededRandom = getSeededRandom();
  
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
  const avgMetrics = calculateAverageMetrics(foldMetrics, k);
  
  // Calculate standard deviation of accuracy (for reporting consistency)
  const accuracyStd = calculateAccuracyStd(foldMetrics, avgMetrics.accuracy, k);
  
  console.log(`\n✅ Cross-Validation Complete!`);
  console.log(`   Average Accuracy: ${(avgMetrics.accuracy * 100).toFixed(1)}% (±${(accuracyStd * 100).toFixed(1)}%)`);
  console.log(`   Precision: ${(avgMetrics.precision * 100).toFixed(1)}%`);
  console.log(`   Recall: ${(avgMetrics.recall * 100).toFixed(1)}%`);
  console.log(`   F1 Score: ${(avgMetrics.f1Score * 100).toFixed(1)}%`);
  
  // Average the weights from all folds for final model
  const finalWeights = averageWeights(foldWeights, TRAINING_CONFIG.featureNames, k);
  const finalBias = averageBiases(foldBiases, k);
  
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
 * @param {string} scholarshipId - ID of the scholarship
 * @param {string} adminId - ID of admin performing training (optional)
 * @returns {Object} Training results with model, scholarship, metrics, and feature importance
 */
async function trainScholarshipModel(scholarshipId, adminId = null) {
  console.log(`🎯 Training model for scholarship: ${scholarshipId}`);
  
  // Reset the seeded random for reproducibility
  resetSeededRandom(TRAINING_CONFIG.randomSeed);
  const seededRandom = getSeededRandom();
  
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
  const avgMetrics = calculateAverageMetrics(foldMetrics, k);
  
  // Calculate standard deviation of accuracy
  const accuracyStd = calculateAccuracyStd(foldMetrics, avgMetrics.accuracy, k);
  
  console.log(`\n✅ Cross-Validation Complete!`);
  console.log(`   Average Accuracy: ${(avgMetrics.accuracy * 100).toFixed(1)}% (±${(accuracyStd * 100).toFixed(1)}%)`);
  
  // Average the weights from all folds for final model
  const finalWeights = averageWeights(foldWeights, TRAINING_CONFIG.featureNames, k);
  const finalBias = averageBiases(foldBiases, k);
  
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
 * @param {string} adminId - ID of admin performing training (optional)
 * @returns {Array} Array of training results for each scholarship
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
 * 
 * Two-case model loading strategy:
 * 1. PRIMARY: Scholarship-specific model (if sufficient historical data exists)
 * 2. FALLBACK: Global model (trained on ALL scholarships in the platform)
 * 
 * Throws error if no trained model exists.
 * @param {Object} user - User document with studentProfile
 * @param {Object} scholarship - Scholarship document
 * @returns {Object} Prediction with probability, confidence, and factors
 */
async function getPrediction(user, scholarship) {
  let usedModelType = 'scholarship_specific';
  
  // Get model (scholarship-specific or global fallback)
  let model = await TrainedModel.getActiveModelForScholarship(scholarship._id || scholarship.id);
  
  if (!model) {
    model = await TrainedModel.findOne({
      modelType: 'global',
      isActive: true
    }).sort({ trainedAt: -1 });
    usedModelType = 'global';
  }
  
  // NO OTHER CASES: If no model exists, throw error
  if (!model) {
    throw new Error('No trained model available. Please train a global model first using: npm run train:global');
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
    modelType: usedModelType, // 'scholarship_specific' or 'global'
    modelDescription: usedModelType === 'scholarship_specific'
      ? 'Using model trained on this scholarship\'s historical data (primary)'
      : 'Using global model trained on all scholarships (fallback)',
    featureContributions,
    topFactors: model.getFeatureRanking().slice(0, 3)
  };
}

/**
 * Get training statistics
 * @returns {Object} Statistics about training data and models
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

module.exports = {
  trainGlobalModel,
  trainScholarshipModel,
  trainAllScholarshipModels,
  getPrediction,
  getTrainingStats
};
