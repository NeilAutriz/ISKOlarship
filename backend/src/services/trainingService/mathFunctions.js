// =============================================================================
// Training Service - Mathematical Functions
// Core mathematical operations for logistic regression
// =============================================================================

const { getSeededRandom } = require('./seededRandom');

/**
 * Sigmoid activation function with numerical stability
 * @param {number} z - Input value
 * @returns {number} Output between 0 and 1
 */
function sigmoid(z) {
  // Clip to prevent overflow
  const clipped = Math.max(-500, Math.min(500, z));
  return 1 / (1 + Math.exp(-clipped));
}

/**
 * Binary cross-entropy loss
 * @param {number} yTrue - True label (0 or 1)
 * @param {number} yPred - Predicted probability
 * @returns {number} Loss value
 */
function binaryCrossEntropy(yTrue, yPred) {
  const eps = 1e-15;
  const p = Math.max(eps, Math.min(1 - eps, yPred));
  return -(yTrue * Math.log(p) + (1 - yTrue) * Math.log(1 - p));
}

/**
 * Compute dot product of weights and features
 * @param {Object} weights - Weight dictionary
 * @param {Object} features - Feature dictionary
 * @returns {number} Dot product result
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
 * @param {Array} array - Array to shuffle
 * @param {SeededRandom} rng - Seeded random number generator
 * @returns {Array} Shuffled array (new array, original unchanged)
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
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (new array, original unchanged)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = {
  sigmoid,
  binaryCrossEntropy,
  dotProduct,
  shuffleArraySeeded,
  shuffleArray
};
