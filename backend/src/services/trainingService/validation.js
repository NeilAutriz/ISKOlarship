// =============================================================================
// Training Service - Cross-Validation and Metrics
// Functions for model validation and evaluation
// =============================================================================

const { shuffleArraySeeded } = require('./mathFunctions');

/**
 * Create K folds for cross-validation
 * @param {Array} samples - Training samples
 * @param {number} k - Number of folds
 * @param {SeededRandom} rng - Seeded random number generator
 * @returns {Array} Array of fold arrays
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
 * Calculate average metrics across folds
 * @param {Array} foldMetrics - Array of metric objects from each fold
 * @param {number} k - Number of folds
 * @returns {Object} Averaged metrics
 */
function calculateAverageMetrics(foldMetrics, k) {
  return {
    accuracy: foldMetrics.reduce((sum, m) => sum + m.accuracy, 0) / k,
    precision: foldMetrics.reduce((sum, m) => sum + m.precision, 0) / k,
    recall: foldMetrics.reduce((sum, m) => sum + m.recall, 0) / k,
    f1Score: foldMetrics.reduce((sum, m) => sum + m.f1Score, 0) / k,
    truePositives: foldMetrics.reduce((sum, m) => sum + m.truePositives, 0),
    trueNegatives: foldMetrics.reduce((sum, m) => sum + m.trueNegatives, 0),
    falsePositives: foldMetrics.reduce((sum, m) => sum + m.falsePositives, 0),
    falseNegatives: foldMetrics.reduce((sum, m) => sum + m.falseNegatives, 0)
  };
}

/**
 * Calculate standard deviation of accuracy across folds
 * @param {Array} foldMetrics - Array of metric objects from each fold
 * @param {number} avgAccuracy - Average accuracy
 * @param {number} k - Number of folds
 * @returns {number} Standard deviation
 */
function calculateAccuracyStd(foldMetrics, avgAccuracy, k) {
  return Math.sqrt(
    foldMetrics.reduce((sum, m) => sum + Math.pow(m.accuracy - avgAccuracy, 2), 0) / k
  );
}

/**
 * Average weights from multiple folds
 * @param {Array} foldWeights - Array of weight objects from each fold
 * @param {Array} featureNames - List of feature names
 * @param {number} k - Number of folds
 * @returns {Object} Averaged weights
 */
function averageWeights(foldWeights, featureNames, k) {
  const finalWeights = {};
  for (const feature of featureNames) {
    finalWeights[feature] = foldWeights.reduce((sum, w) => sum + w[feature], 0) / k;
  }
  return finalWeights;
}

/**
 * Average biases from multiple folds
 * @param {Array} foldBiases - Array of bias values from each fold
 * @param {number} k - Number of folds
 * @returns {number} Averaged bias
 */
function averageBiases(foldBiases, k) {
  return foldBiases.reduce((sum, b) => sum + b, 0) / k;
}

module.exports = {
  createKFolds,
  calculateAverageMetrics,
  calculateAccuracyStd,
  averageWeights,
  averageBiases
};
