// =============================================================================
// ISKOlarship - Analytics & Model Management
// Model statistics, feature importance, and training
// =============================================================================

const { Application } = require('../../models');
const logisticRegression = require('../logisticRegression.service');
const { MODEL_VERSION } = require('./constants');

/**
 * Get model performance statistics
 * Calculates accuracy, precision, recall, and F1 score from historical predictions
 * 
 * @returns {Promise<Object>} Model statistics with confusion matrix
 */
async function getModelStats() {
  // Get the trained model state
  const modelState = logisticRegression.getModelState();
  
  // Get applications with predictions that have been decided
  const decidedApps = await Application.find({
    status: { $in: ['approved', 'rejected'] },
    'prediction.probability': { $exists: true }
  }).lean();

  if (decidedApps.length === 0) {
    return {
      totalPredictions: 0,
      accuracy: modelState.metrics?.accuracy || null,
      precision: modelState.metrics?.precision || null,
      recall: modelState.metrics?.recall || null,
      f1Score: modelState.metrics?.f1Score || null,
      message: 'Not enough data for statistics',
      modelVersion: MODEL_VERSION,
      trained: modelState.trained,
      trainingDate: modelState.trainingDate,
      trainingSize: modelState.trainingSize
    };
  }

  // Calculate metrics from actual predictions
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const app of decidedApps) {
    const predictedProb = app.prediction?.probability || 0.5;
    const predicted = predictedProb >= 0.5 ? 'approved' : 'rejected';
    const actual = app.status;

    if (predicted === 'approved' && actual === 'approved') {
      truePositives++;
    } else if (predicted === 'rejected' && actual === 'rejected') {
      trueNegatives++;
    } else if (predicted === 'approved' && actual === 'rejected') {
      falsePositives++;
    } else if (predicted === 'rejected' && actual === 'approved') {
      falseNegatives++;
    }
  }

  const total = decidedApps.length;
  const accuracy = (truePositives + trueNegatives) / total;
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

  return {
    modelVersion: MODEL_VERSION,
    totalPredictions: total,
    accuracy: Math.round(accuracy * 100) / 100,
    precision: Math.round(precision * 100) / 100,
    recall: Math.round(recall * 100) / 100,
    f1Score: Math.round(f1Score * 100) / 100,
    confusionMatrix: {
      truePositives,
      trueNegatives,
      falsePositives,
      falseNegatives
    },
    trained: modelState.trained,
    trainingDate: modelState.trainingDate,
    trainingSize: modelState.trainingSize,
    lastUpdated: new Date()
  };
}

/**
 * Get feature importance analysis
 * Shows which features have the most impact on predictions
 * 
 * @returns {Promise<Object>} Feature importance with model metadata
 */
async function getFeatureImportance() {
  const importance = logisticRegression.getFeatureImportance();
  const modelState = logisticRegression.getModelState();

  return {
    factors: importance,
    modelVersion: MODEL_VERSION,
    trained: modelState.trained,
    trainingSize: modelState.trainingSize,
    description: 'Feature importance based on logistic regression weights trained on historical data'
  };
}

/**
 * Train model with historical application data
 * NOTE: For full training with database persistence, use:
 *   node scripts/train-all-scholarships.js
 * 
 * @returns {Promise<Object>} Training result with metrics
 */
async function trainModel() {
  console.log('Starting model training...');
  
  // Use the dedicated training service for database-backed training
  const trainingService = require('../training.service');
  const result = await trainingService.trainGlobalModel();
  
  // Clear prediction cache to use new weights
  logisticRegression.clearModelWeightsCache();
  
  if (!result.success) {
    return {
      status: 'failed',
      message: result.message,
      samplesAvailable: result.samplesUsed || 0
    };
  }
  
  return {
    status: 'completed',
    message: 'Model training completed and saved to database',
    samplesUsed: result.samplesUsed,
    accuracy: result.accuracy,
    f1Score: result.f1Score,
    modelVersion: MODEL_VERSION,
    trainingDate: new Date()
  };
}

module.exports = {
  getModelStats,
  getFeatureImportance,
  trainModel
};
