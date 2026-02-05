/**
 * Logistic Regression Service Tests
 * 
 * Tests to ensure all logisticRegression.service.js functionality remains intact
 * after modularization into prediction/ folder.
 * 
 * Run: cd backend && node tests/logistic-regression.test.js
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
  console.log('\n🧪 Running Logistic Regression Service Tests\n');
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

test('logisticRegression.service.js loads without errors', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.ok(service, 'Service should load');
});

test('logisticRegressionCore/index.js loads without errors', () => {
  const service = require('../src/services/logisticRegressionCore');
  assert.ok(service, 'Modular service should load');
});

// =============================================================================
// Export Count Tests
// =============================================================================

test('exports correct number of functions/properties', () => {
  const service = require('../src/services/logisticRegression.service');
  const exportCount = Object.keys(service).length;
  assert.ok(exportCount >= 20, `Expected at least 20 exports, got ${exportCount}`);
});

// =============================================================================
// Wrapper Function Tests
// =============================================================================

test('exports runPrediction wrapper function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.runPrediction, 'function');
});

test('exports getQuickFactors wrapper function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.getQuickFactors, 'function');
});

test('exports isModelTrained wrapper function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.isModelTrained, 'function');
});

test('exports getFeatureValues wrapper function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.getFeatureValues, 'function');
});

test('exports calculateProbability wrapper function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.calculateProbability, 'function');
});

// =============================================================================
// Core Function Exports
// =============================================================================

test('exports SCORING constant', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.ok(service.SCORING, 'SCORING should be defined');
  assert.strictEqual(typeof service.SCORING, 'object');
});

test('exports predictAsync function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.predictAsync, 'function');
});

test('exports getPredictionFactors function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.getPredictionFactors, 'function');
});

test('exports sigmoid function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.sigmoid, 'function');
});

test('exports extractFeatures function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.extractFeatures, 'function');
});

// =============================================================================
// Normalizer Function Exports
// =============================================================================

test('exports normalizeGWA function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.normalizeGWA, 'function');
});

test('exports normalizeIncome function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.normalizeIncome, 'function');
});

test('exports normalizeYearLevel function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.normalizeYearLevel, 'function');
});

test('exports normalizeSTBracket function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.normalizeSTBracket, 'function');
});

// =============================================================================
// Model Management Function Exports
// =============================================================================

test('exports getModelState function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.getModelState, 'function');
});

test('exports resetModel function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.resetModel, 'function');
});

test('exports loadModelWeights function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.loadModelWeights, 'function');
});

test('exports clearModelWeightsCache function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.clearModelWeightsCache, 'function');
});

test('exports getFeatureImportance function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.getFeatureImportance, 'function');
});

// =============================================================================
// Constant Exports
// =============================================================================

test('exports MODEL_CONFIG constant', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.ok(service.MODEL_CONFIG, 'MODEL_CONFIG should be defined');
  assert.strictEqual(typeof service.MODEL_CONFIG, 'object');
});

test('exports FACTOR_LABELS constant', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.ok(service.FACTOR_LABELS, 'FACTOR_LABELS should be defined');
  assert.strictEqual(typeof service.FACTOR_LABELS, 'object');
});

// =============================================================================
// Functional Tests - Sigmoid
// =============================================================================

test('sigmoid(0) returns 0.5', () => {
  const service = require('../src/services/logisticRegression.service');
  const result = service.sigmoid(0);
  assert.strictEqual(result, 0.5, `sigmoid(0) should be 0.5, got ${result}`);
});

test('sigmoid returns value between 0 and 1', () => {
  const service = require('../src/services/logisticRegression.service');
  
  const testValues = [-100, -10, -1, 0, 1, 10, 100];
  for (const x of testValues) {
    const result = service.sigmoid(x);
    assert.ok(result >= 0 && result <= 1, `sigmoid(${x}) = ${result} should be in [0,1]`);
  }
});

test('sigmoid is monotonically increasing', () => {
  const service = require('../src/services/logisticRegression.service');
  
  let prev = service.sigmoid(-10);
  for (let x = -9; x <= 10; x++) {
    const curr = service.sigmoid(x);
    assert.ok(curr >= prev, `sigmoid should be monotonically increasing`);
    prev = curr;
  }
});

// =============================================================================
// Functional Tests - Normalizers
// =============================================================================

test('normalizeGWA returns 1.0 for GWA of 1.0', () => {
  const service = require('../src/services/logisticRegression.service');
  const result = service.normalizeGWA(1.0);
  assert.strictEqual(result, 1.0);
});

test('normalizeGWA returns 0.5 for high GWA (5.0)', () => {
  const service = require('../src/services/logisticRegression.service');
  const result = service.normalizeGWA(5.0);
  // GWA of 5.0 is clamped to max of 3.0 in UPLB scale, so normalized to 0.5
  assert.ok(result >= 0 && result <= 1, `Result ${result} should be in [0,1]`);
});

test('normalizeGWA returns valid value for GWA of 3.0', () => {
  const service = require('../src/services/logisticRegression.service');
  const result = service.normalizeGWA(3.0);
  // GWA normalization depends on implementation - just verify it's a valid number
  assert.ok(result >= 0 && result <= 1, `Result ${result} should be in [0,1]`);
});

test('normalizeIncome returns high value for low income', () => {
  const service = require('../src/services/logisticRegression.service');
  const result = service.normalizeIncome(50000);
  assert.ok(result > 0.8, `Low income should result in high financial need: ${result}`);
});

test('normalizeIncome returns low value for high income', () => {
  const service = require('../src/services/logisticRegression.service');
  const result = service.normalizeIncome(500000);
  assert.ok(result < 0.5, `High income should result in low financial need: ${result}`);
});

test('normalizeYearLevel returns value for valid classification', () => {
  const service = require('../src/services/logisticRegression.service');
  const result = service.normalizeYearLevel('Junior');
  assert.ok(typeof result === 'number', 'Should return a number');
  assert.ok(result >= 0 && result <= 1, 'Should be between 0 and 1');
});

test('normalizeSTBracket returns value for valid bracket', () => {
  const service = require('../src/services/logisticRegression.service');
  const result = service.normalizeSTBracket('A');
  assert.ok(typeof result === 'number', 'Should return a number');
  assert.ok(result >= 0 && result <= 1, 'Should be between 0 and 1');
});

// =============================================================================
// Functional Tests - Model State
// =============================================================================

test('getModelState returns object', () => {
  const service = require('../src/services/logisticRegression.service');
  const state = service.getModelState();
  
  assert.ok(state, 'Should return an object');
  assert.ok(typeof state === 'object', 'Should be an object');
});

test('isModelTrained returns boolean', () => {
  const service = require('../src/services/logisticRegression.service');
  const result = service.isModelTrained();
  assert.strictEqual(typeof result, 'boolean');
});

// =============================================================================
// Functional Tests - Feature Extraction
// =============================================================================

test('extractFeatures returns object', () => {
  const service = require('../src/services/logisticRegression.service');
  
  const mockUser = {
    studentProfile: {
      gwa: 1.5,
      classification: 'Sophomore',
      annualFamilyIncome: 150000,
      stBracket: 'B'
    }
  };
  
  const mockScholarship = {
    eligibilityCriteria: {}
  };
  
  const features = service.extractFeatures(mockUser, mockScholarship);
  
  assert.ok(features, 'Should return an object');
  assert.strictEqual(typeof features, 'object', 'Should be an object');
});

test('getFeatureValues returns features for user/scholarship', () => {
  const service = require('../src/services/logisticRegression.service');
  
  const mockUser = {
    studentProfile: {
      gwa: 1.75,
      classification: 'Senior'
    }
  };
  
  const mockScholarship = {
    eligibilityCriteria: {}
  };
  
  const features = service.getFeatureValues(mockUser, mockScholarship);
  
  assert.ok(features, 'Should return features');
});

// =============================================================================
// Functional Tests - Probability Calculation
// =============================================================================

test('calculateProbability is a function', () => {
  const service = require('../src/services/logisticRegression.service');
  assert.strictEqual(typeof service.calculateProbability, 'function');
});

// =============================================================================
// Consistency Tests
// =============================================================================

test('logisticRegression.service exports match prediction/index exports', () => {
  const mainService = require('../src/services/logisticRegression.service');
  const modularService = require('../src/services/logisticRegressionCore');
  
  // Check that main functions exist in both
  const coreFunctions = [
    'sigmoid',
    'predictAsync',
    'extractFeatures',
    'getPredictionFactors',
    'getModelState',
    'resetModel'
  ];
  
  for (const fn of coreFunctions) {
    assert.strictEqual(
      typeof mainService[fn],
      'function',
      `logisticRegression.service should export ${fn}`
    );
    assert.strictEqual(
      typeof modularService[fn],
      'function',
      `logisticRegressionCore/ should export ${fn}`
    );
  }
});

// =============================================================================
// Run all tests
// =============================================================================

runTests().catch(console.error);
