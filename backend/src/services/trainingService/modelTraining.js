// =============================================================================
// Training Service - Model Training
// Core training algorithms: weight initialization, gradient descent, evaluation
// =============================================================================

const { TRAINING_CONFIG } = require('./constants');
const { sigmoid, binaryCrossEntropy, dotProduct, shuffleArraySeeded } = require('./mathFunctions');
const { getSeededRandom } = require('./seededRandom');

/**
 * Initialize weights with EQUAL values for fully dynamic learning
 * All weights start the same - the model learns importance from data
 * @param {string} scholarshipType - Type of scholarship (currently unused but reserved for future use)
 * @returns {Object} Initial weight dictionary
 */
function initializeWeights(scholarshipType = null) {
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
 * Train logistic regression model using mini-batch gradient descent
 * with early stopping, class weighting, and best model tracking
 * Uses seeded random for reproducibility
 * @param {Array} samples - Training samples with features and labels
 * @param {Object} config - Training configuration overrides
 * @returns {Object} Trained model with weights, bias, history
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
  
  // Get the seeded random instance
  const seededRandom = getSeededRandom();
  
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
 * @param {Object} weights - Model weights
 * @param {number} bias - Model bias
 * @param {Array} testSamples - Test samples with features and labels
 * @param {number} threshold - Classification threshold (default: 0.5)
 * @returns {Object} Evaluation metrics
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
 * @param {Object} weights - Model weights
 * @returns {Object} Feature importance dictionary (values sum to 1)
 */
function calculateFeatureImportance(weights) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + Math.abs(w), 0);
  
  const importance = {};
  for (const [feature, weight] of Object.entries(weights)) {
    importance[feature] = totalWeight > 0 ? Math.abs(weight) / totalWeight : 0;
  }
  
  return importance;
}

module.exports = {
  initializeWeights,
  trainModel,
  evaluateModel,
  calculateFeatureImportance
};
