// =============================================================================
// ISKOlarship - Trained Model Schema
// Stores dynamically trained logistic regression weights per scholarship
// =============================================================================

const mongoose = require('mongoose');

// =============================================================================
// Feature Metadata Sub-Schema
// =============================================================================

const featureMetadataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['academic', 'financial', 'eligibility', 'demographic', 'other']
  },
  importance: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  }
}, { _id: false });

// =============================================================================
// Training Metrics Sub-Schema
// =============================================================================

const trainingMetricsSchema = new mongoose.Schema({
  // Classification metrics
  accuracy: {
    type: Number,
    min: 0,
    max: 1
  },
  precision: {
    type: Number,
    min: 0,
    max: 1
  },
  recall: {
    type: Number,
    min: 0,
    max: 1
  },
  f1Score: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Training loss metrics
  finalLoss: Number,
  convergenceEpoch: Number,
  
  // Confusion matrix
  truePositives: Number,
  trueNegatives: Number,
  falsePositives: Number,
  falseNegatives: Number,
  
  // AUC-ROC if computed
  aucRoc: Number
}, { _id: false });

// =============================================================================
// Trained Model Schema
// =============================================================================

const trainedModelSchema = new mongoose.Schema({
  // Model identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  version: {
    type: String,
    default: '1.0.0'
  },
  
  // Link to specific scholarship (null = global model)
  scholarshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship',
    default: null,
    index: true
  },
  
  // Model type
  modelType: {
    type: String,
    enum: ['global', 'scholarship_specific'],
    default: 'global'
  },
  
  // Scholarship type for category-based models
  scholarshipType: {
    type: String,
    enum: ['University Scholarship', 'College Scholarship', 'Government Scholarship', 'Private Scholarship', 'Thesis/Research Grant', null],
    default: null
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: false
  },
  
  // Trained weights (the actual model parameters)
  weights: {
    gwaScore: { type: Number, default: 0 },
    yearLevelMatch: { type: Number, default: 0 },
    incomeMatch: { type: Number, default: 0 },
    stBracketMatch: { type: Number, default: 0 },
    collegeMatch: { type: Number, default: 0 },
    courseMatch: { type: Number, default: 0 },
    citizenshipMatch: { type: Number, default: 0 },
    documentCompleteness: { type: Number, default: 0 },
    applicationTiming: { type: Number, default: 0 },
    eligibilityScore: { type: Number, default: 0 },
    // Interaction features
    academicStrength: { type: Number, default: 0 },
    financialNeed: { type: Number, default: 0 },
    programFit: { type: Number, default: 0 },
    applicationQuality: { type: Number, default: 0 },
    overallFit: { type: Number, default: 0 }
  },
  
  // Bias term
  bias: {
    type: Number,
    default: 0
  },
  
  // Feature metadata
  features: [featureMetadataSchema],
  
  // Training metrics
  metrics: trainingMetricsSchema,
  
  // Training configuration
  trainingConfig: {
    learningRate: { type: Number, default: 0.1 },
    epochs: { type: Number, default: 1000 },
    regularization: { type: Number, default: 0.01 },
    trainTestSplit: { type: Number, default: 0.8 },
    minSamples: { type: Number, default: 30 }
  },
  
  // Training data statistics
  trainingStats: {
    totalSamples: { type: Number, default: 0 },
    approvedCount: { type: Number, default: 0 },
    rejectedCount: { type: Number, default: 0 },
    trainSetSize: { type: Number, default: 0 },
    testSetSize: { type: Number, default: 0 }
  },
  
  // Feature importance ranking
  featureImportance: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Timestamps
  trainedAt: {
    type: Date,
    default: Date.now
  },
  
  trainedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Notes
  notes: String
  
}, {
  timestamps: true
});

// =============================================================================
// Indexes
// =============================================================================

// Unique active model per scholarship (or global)
trainedModelSchema.index(
  { scholarshipId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Fast lookup for scholarship-specific models
trainedModelSchema.index({ scholarshipId: 1, trainedAt: -1 });

// Fast lookup for active global model
trainedModelSchema.index({ modelType: 1, isActive: 1 });

// =============================================================================
// Static Methods
// =============================================================================

/**
 * Get the active model for a scholarship (or global fallback)
 */
trainedModelSchema.statics.getActiveModelForScholarship = async function(scholarshipId) {
  // First try scholarship-specific model
  if (scholarshipId) {
    const specificModel = await this.findOne({
      scholarshipId: scholarshipId,
      isActive: true
    });
    if (specificModel) return specificModel;
  }
  
  // Fallback to global model
  const globalModel = await this.findOne({
    modelType: 'global',
    isActive: true
  });
  
  return globalModel;
};

/**
 * Get all models for a scholarship (history)
 */
trainedModelSchema.statics.getModelsForScholarship = async function(scholarshipId) {
  return this.find({ scholarshipId })
    .sort({ trainedAt: -1 })
    .populate('trainedBy', 'email')
    .lean();
};

/**
 * Activate a model (deactivate others for same scholarship/global)
 */
trainedModelSchema.statics.activateModel = async function(modelId) {
  const model = await this.findById(modelId);
  if (!model) throw new Error('Model not found');
  
  // Deactivate other models for same scope
  await this.updateMany(
    {
      scholarshipId: model.scholarshipId,
      _id: { $ne: modelId }
    },
    { isActive: false }
  );
  
  // Activate this model
  model.isActive = true;
  await model.save();
  
  return model;
};

// =============================================================================
// Instance Methods
// =============================================================================

/**
 * Predict probability for a feature vector
 */
trainedModelSchema.methods.predict = function(features) {
  const weights = this.weights;

  // Compute z = w·x + b
  let z = this.bias;

  for (const [feature, value] of Object.entries(features)) {
    if (weights[feature] !== undefined) {
      z += weights[feature] * value;
    }
  }

  // Pure sigmoid — no artificial output capping
  const clipped = Math.max(-500, Math.min(500, z));
  return 1 / (1 + Math.exp(-clipped));
};

/**
 * Get feature importance ranking
 */
trainedModelSchema.methods.getFeatureRanking = function() {
  const weights = this.weights;
  
  return Object.entries(weights)
    .map(([feature, weight]) => ({
      feature,
      weight,
      absoluteWeight: Math.abs(weight),
      direction: weight > 0 ? 'positive' : 'negative'
    }))
    .sort((a, b) => b.absoluteWeight - a.absoluteWeight);
};

// =============================================================================
// Export
// =============================================================================

const TrainedModel = mongoose.model('TrainedModel', trainedModelSchema);

module.exports = { TrainedModel, trainedModelSchema };
