/**
 * Prediction Service Tests
 * 
 * Tests to ensure all prediction.service.js functionality remains intact
 * after modularization into predictionService/ folder.
 * 
 * Run: cd backend && npm test -- --grep "Prediction Service"
 * Or:  cd backend && node tests/prediction-service.test.js
 */

const assert = require('assert');

// Test counter
let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧪 Running Prediction Service Tests\n');
  console.log('='.repeat(60));
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// =============================================================================
// Module Loading Tests
// =============================================================================

test('prediction.service.js loads without errors', () => {
  const service = require('../src/services/prediction.service');
  assert.ok(service, 'Service should load');
});

test('scholarshipPrediction/index.js loads without errors', () => {
  const service = require('../src/services/scholarshipPrediction');
  assert.ok(service, 'Modular service should load');
});

// =============================================================================
// Export Tests - Main Functions
// =============================================================================

test('exports checkEligibility function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.checkEligibility, 'function');
});

test('exports predictApprovalProbability function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.predictApprovalProbability, 'function');
});

test('exports getRecommendations function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.getRecommendations, 'function');
});

test('exports getModelStats function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.getModelStats, 'function');
});

test('exports getFeatureImportance function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.getFeatureImportance, 'function');
});

test('exports trainModel function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.trainModel, 'function');
});

// =============================================================================
// Export Tests - Helper Functions
// =============================================================================

test('exports runFullAnalysis wrapper function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.runFullAnalysis, 'function');
});

test('exports getQuickEligibility wrapper function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.getQuickEligibility, 'function');
});

test('exports isModelReady wrapper function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.isModelReady, 'function');
});

test('exports sigmoid function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.sigmoid, 'function');
});

test('exports extractFeatures function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.extractFeatures, 'function');
});

test('exports formatFactorName function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.formatFactorName, 'function');
});

test('exports analyzeDetailedFactors function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.analyzeDetailedFactors, 'function');
});

test('exports generateRecommendation function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.generateRecommendation, 'function');
});

test('exports getMatchLevel function', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.getMatchLevel, 'function');
});

// =============================================================================
// Export Tests - Constants
// =============================================================================

test('exports MODEL_VERSION constant', () => {
  const service = require('../src/services/prediction.service');
  assert.ok(service.MODEL_VERSION, 'MODEL_VERSION should be defined');
  assert.strictEqual(typeof service.MODEL_VERSION, 'string');
});

test('exports MATCH_LEVELS constant', () => {
  const service = require('../src/services/prediction.service');
  assert.ok(service.MATCH_LEVELS, 'MATCH_LEVELS should be defined');
  assert.ok(Array.isArray(service.MATCH_LEVELS) || typeof service.MATCH_LEVELS === 'object');
});

test('exports YEAR_LEVEL_MAP constant', () => {
  const service = require('../src/services/prediction.service');
  assert.ok(service.YEAR_LEVEL_MAP, 'YEAR_LEVEL_MAP should be defined');
  assert.strictEqual(typeof service.YEAR_LEVEL_MAP, 'object');
});

test('exports ST_BRACKET_MAP constant', () => {
  const service = require('../src/services/prediction.service');
  assert.ok(service.ST_BRACKET_MAP, 'ST_BRACKET_MAP should be defined');
  assert.strictEqual(typeof service.ST_BRACKET_MAP, 'object');
});

test('exports FIELD_NAME_MAP constant', () => {
  const service = require('../src/services/prediction.service');
  assert.ok(service.FIELD_NAME_MAP, 'FIELD_NAME_MAP should be defined');
  assert.strictEqual(typeof service.FIELD_NAME_MAP, 'object');
});

// =============================================================================
// Export Tests - Nested logisticRegression
// =============================================================================

test('exports logisticRegression object', () => {
  const service = require('../src/services/prediction.service');
  assert.ok(service.logisticRegression, 'logisticRegression should be defined');
  assert.strictEqual(typeof service.logisticRegression, 'object');
});

test('logisticRegression has getModelState method', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.logisticRegression.getModelState, 'function');
});

test('logisticRegression has resetModel method', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.logisticRegression.resetModel, 'function');
});

test('logisticRegression has clearModelWeightsCache method', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(typeof service.logisticRegression.clearModelWeightsCache, 'function');
});

// =============================================================================
// Functional Tests - Sigmoid
// =============================================================================

test('sigmoid(0) returns 0.5', () => {
  const service = require('../src/services/prediction.service');
  const result = service.sigmoid(0);
  assert.strictEqual(result, 0.5, `sigmoid(0) should be 0.5, got ${result}`);
});

test('sigmoid returns value between 0 and 1', () => {
  const service = require('../src/services/prediction.service');
  
  const testValues = [-100, -10, -1, 0, 1, 10, 100];
  for (const x of testValues) {
    const result = service.sigmoid(x);
    assert.ok(result >= 0 && result <= 1, `sigmoid(${x}) = ${result} should be in [0,1]`);
  }
});

test('sigmoid(-x) + sigmoid(x) = 1', () => {
  const service = require('../src/services/prediction.service');
  
  const testValues = [0.5, 1, 2, 5, 10];
  for (const x of testValues) {
    const sum = service.sigmoid(-x) + service.sigmoid(x);
    assert.ok(Math.abs(sum - 1) < 0.0001, `sigmoid(-${x}) + sigmoid(${x}) = ${sum}, should be ~1`);
  }
});

// =============================================================================
// Functional Tests - getMatchLevel
// =============================================================================

test('getMatchLevel returns "Strong Match" for >= 0.75', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(service.getMatchLevel(0.75), 'Strong Match');
  assert.strictEqual(service.getMatchLevel(0.90), 'Strong Match');
  assert.strictEqual(service.getMatchLevel(1.0), 'Strong Match');
});

test('getMatchLevel returns "Good Match" for >= 0.60', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(service.getMatchLevel(0.60), 'Good Match');
  assert.strictEqual(service.getMatchLevel(0.74), 'Good Match');
});

test('getMatchLevel returns "Moderate Match" for >= 0.45', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(service.getMatchLevel(0.45), 'Moderate Match');
  assert.strictEqual(service.getMatchLevel(0.59), 'Moderate Match');
});

test('getMatchLevel returns "Weak Match" for < 0.45', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(service.getMatchLevel(0.44), 'Weak Match');
  assert.strictEqual(service.getMatchLevel(0.0), 'Weak Match');
});

// =============================================================================
// Functional Tests - formatFactorName
// =============================================================================

test('formatFactorName converts gwa to GWA', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(service.formatFactorName('gwa'), 'GWA');
});

test('formatFactorName converts annualFamilyIncome correctly', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(service.formatFactorName('annualFamilyIncome'), 'Annual Family Income');
});

test('formatFactorName converts stBracket to ST Bracket', () => {
  const service = require('../src/services/prediction.service');
  assert.strictEqual(service.formatFactorName('stBracket'), 'ST Bracket');
});

// =============================================================================
// Functional Tests - generateRecommendation
// =============================================================================

test('generateRecommendation returns string for high probability', () => {
  const service = require('../src/services/prediction.service');
  const result = service.generateRecommendation(0.80, { areasToConsider: [] });
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.includes('Strongly recommended'), result);
});

test('generateRecommendation returns string for low probability', () => {
  const service = require('../src/services/prediction.service');
  const result = service.generateRecommendation(0.20, { areasToConsider: [] });
  assert.strictEqual(typeof result, 'string');
  assert.ok(result.includes('Not recommended'), result);
});

// =============================================================================
// Functional Tests - extractFeatures
// =============================================================================

test('extractFeatures returns object with expected keys', () => {
  const service = require('../src/services/prediction.service');
  
  const mockUser = {
    studentProfile: {
      gwa: 1.5,
      classification: 'Junior',
      college: 'CAS',
      course: 'BSCS',
      annualFamilyIncome: 100000,
      stBracket: 'A',
      unitsEnrolled: 18
    },
    email: 'test@example.com'
  };
  
  const mockScholarship = {
    eligibilityCriteria: {
      maxGWA: 2.0,
      eligibleColleges: ['CAS']
    }
  };
  
  const features = service.extractFeatures(mockUser, mockScholarship);
  
  assert.ok(features, 'extractFeatures should return an object');
  assert.ok('gwa' in features, 'Features should have gwa');
  assert.ok('yearLevel' in features, 'Features should have yearLevel');
  assert.ok('financialNeed' in features, 'Features should have financialNeed');
  assert.ok('collegeMatch' in features, 'Features should have collegeMatch');
});

test('extractFeatures normalizes GWA correctly', () => {
  const service = require('../src/services/prediction.service');
  
  const mockUser = {
    studentProfile: { gwa: 1.0 },
    email: 'test@example.com'
  };
  
  const mockScholarship = { eligibilityCriteria: {} };
  
  const features = service.extractFeatures(mockUser, mockScholarship);
  
  // GWA of 1.0 should normalize to 1.0 (best)
  assert.strictEqual(features.gwa, 1.0, 'GWA 1.0 should normalize to 1.0');
});

// =============================================================================
// Consistency Tests - Both modules export same functions
// =============================================================================

test('prediction.service exports same functions as predictionService/index', () => {
  const mainService = require('../src/services/prediction.service');
  const modularService = require('../src/services/scholarshipPrediction');
  
  // Check key functions exist in both
  const requiredFunctions = [
    'checkEligibility',
    'predictApprovalProbability',
    'getRecommendations',
    'getModelStats',
    'getFeatureImportance',
    'trainModel',
    'sigmoid',
    'extractFeatures',
    'analyzeDetailedFactors',
    'generateRecommendation',
    'getMatchLevel'
  ];
  
  for (const fn of requiredFunctions) {
    assert.strictEqual(
      typeof mainService[fn], 
      'function', 
      `prediction.service should export ${fn}`
    );
    assert.strictEqual(
      typeof modularService[fn], 
      'function', 
      `scholarshipPrediction should export ${fn}`
    );
  }
});

test('both modules export same constants', () => {
  const mainService = require('../src/services/prediction.service');
  const modularService = require('../src/services/scholarshipPrediction');
  
  assert.strictEqual(mainService.MODEL_VERSION, modularService.MODEL_VERSION);
  assert.deepStrictEqual(mainService.YEAR_LEVEL_MAP, modularService.YEAR_LEVEL_MAP);
  assert.deepStrictEqual(mainService.ST_BRACKET_MAP, modularService.ST_BRACKET_MAP);
});

// =============================================================================
// Integration Tests - isModelReady
// =============================================================================

test('isModelReady returns boolean', async () => {
  const service = require('../src/services/prediction.service');
  const result = await service.isModelReady();
  assert.strictEqual(typeof result, 'boolean');
});

// =============================================================================
// Run all tests
// =============================================================================

runTests().catch(console.error);
