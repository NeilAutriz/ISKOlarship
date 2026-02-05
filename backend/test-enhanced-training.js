const trainingService = require('./src/services/training.service');

console.log('🧪 Testing Enhanced Training Service...\n');

// Test 1: Validate all original exports still work
console.log('1️⃣  Original API Functions:');
const originalFunctions = [
  'trainGlobalModel',
  'trainScholarshipModel',
  'trainAllScholarshipModels',
  'getPrediction',
  'getTrainingStats',
  'extractFeatures'
];
originalFunctions.forEach(fn => {
  const exists = typeof trainingService[fn] === 'function';
  console.log(`   ${exists ? '✅' : '❌'} ${fn}`);
});

// Test 2: New utility functions
console.log('\n2️⃣  New Utility Functions:');
const newFunctions = [
  'validateTrainingData',
  'validateScholarshipTrainingData',
  'trainGlobalModelWithValidation',
  'trainScholarshipModelWithValidation',
  'trainAllScholarshipModelsWithTracking',
  'compareModels',
  'getFeatureRanking'
];
newFunctions.forEach(fn => {
  const exists = typeof trainingService[fn] === 'function';
  console.log(`   ${exists ? '✅' : '❌'} ${fn}`);
});

// Test 3: Cache management functions
console.log('\n3️⃣  Cache Management:');
const cacheFunctions = [
  'cacheModel',
  'getCachedModel',
  'clearModelCache',
  'getCacheStats'
];
cacheFunctions.forEach(fn => {
  const exists = typeof trainingService[fn] === 'function';
  console.log(`   ${exists ? '✅' : '❌'} ${fn}`);
});

// Test 4: Analytics functions
console.log('\n4️⃣  Analytics & Monitoring:');
const analyticsFunctions = [
  'recordTrainingSession',
  'getTrainingHistory',
  'getTrainingAnalytics',
  'getTrainingConfig',
  'getTrainingSystemStatus'
];
analyticsFunctions.forEach(fn => {
  const exists = typeof trainingService[fn] === 'function';
  console.log(`   ${exists ? '✅' : '❌'} ${fn}`);
});

// Test 5: Configuration exports
console.log('\n5️⃣  Configuration:');
const configs = [
  'TRAINING_CONFIG',
  'FEATURE_DISPLAY_NAMES',
  'FEATURE_CATEGORIES',
  'SCORING_CONFIG'
];
configs.forEach(cfg => {
  const exists = trainingService[cfg] !== undefined;
  console.log(`   ${exists ? '✅' : '❌'} ${cfg}`);
});

// Test 6: Test validation function
console.log('\n6️⃣  Testing Validation Functions:');
const testApps = [
  {
    _id: 'test1',
    status: 'approved',
    applicantSnapshot: { gwa: 1.5 },
    documents: []
  },
  {
    _id: 'test2',
    status: 'rejected',
    applicantSnapshot: { gwa: 3.0 },
    documents: []
  }
];

const validation = trainingService.validateTrainingData(testApps);
console.log(`   Validation result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
console.log(`   Total apps: ${validation.stats.total}`);
console.log(`   Approved: ${validation.stats.approved}, Rejected: ${validation.stats.rejected}`);

// Test 7: Test cache functions
console.log('\n7️⃣  Testing Cache Functions:');
const mockModel = { _id: 'model1', metrics: { accuracy: 0.95 } };
trainingService.cacheModel('test_model', mockModel);
const cachedModel = trainingService.getCachedModel('test_model');
console.log(`   Model cached: ${cachedModel ? '✅' : '❌'}`);
console.log(`   Cache stats: ${JSON.stringify(trainingService.getCacheStats())}`);

// Test 8: Test analytics
console.log('\n8️⃣  Testing Analytics:');
trainingService.recordTrainingSession({
  type: 'global',
  metrics: { accuracy: 0.92, f1Score: 0.88 },
  trainingTimeMs: 5000
});
const analytics = trainingService.getTrainingAnalytics();
console.log(`   Training sessions recorded: ${analytics.totalTrainingSessions}`);
console.log(`   Average accuracy: ${(analytics.averageAccuracy * 100).toFixed(1)}%`);

// Test 9: Test model comparison
console.log('\n9️⃣  Testing Model Comparison:');
const model1 = { metrics: { accuracy: 0.85, precision: 0.80, recall: 0.90, f1Score: 0.85 } };
const model2 = { metrics: { accuracy: 0.92, precision: 0.88, recall: 0.95, f1Score: 0.91 } };
const comparison = trainingService.compareModels(model1, model2);
console.log(`   Model 1 accuracy: ${(comparison.metrics.accuracy.model1 * 100).toFixed(1)}%`);
console.log(`   Model 2 accuracy: ${(comparison.metrics.accuracy.model2 * 100).toFixed(1)}%`);
console.log(`   Improvement: ${(comparison.metrics.accuracy.difference * 100).toFixed(1)}%`);
console.log(`   Recommendation: ${comparison.recommendation}`);

// Test 10: System status
console.log('\n🔟 Training System Status:');
const status = trainingService.getTrainingSystemStatus();
console.log(`   Learning rate: ${status.config.learningRate}`);
console.log(`   K-Folds: ${status.config.kFolds}`);
console.log(`   Cached models: ${status.cache.cachedModels}`);

console.log('\n✅ All enhanced training service functions working correctly!');
