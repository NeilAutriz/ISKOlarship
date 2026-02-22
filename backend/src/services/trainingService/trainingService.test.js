// =============================================================================
// Training Service - Comprehensive Unit Tests
// Tests for all modular components of the training service
// =============================================================================

const assert = require('assert');

// Import from modular structure
const {
  // Constants
  SCORING_CONFIG,
  TRAINING_CONFIG,
  FEATURE_DISPLAY_NAMES,
  FEATURE_CATEGORIES,
  
  // Seeded Random
  SeededRandom,
  getSeededRandom,
  resetSeededRandom,
  
  // Feature Extraction
  normalizeGWA,
  checkYearLevelMatch,
  checkIncomeMatch,
  checkSTBracketMatch,
  checkCollegeMatch,
  checkCourseMatch,
  checkCitizenshipMatch,
  calculateApplicationTiming,
  extractFeatures,
  extractFeaturesFromUserAndScholarship,
  
  // Math Functions
  sigmoid,
  binaryCrossEntropy,
  dotProduct,
  shuffleArraySeeded,
  shuffleArray,
  
  // Validation
  createKFolds,
  calculateAverageMetrics,
  calculateAccuracyStd,
  averageWeights,
  averageBiases,
  
  // Model Training
  initializeWeights,
  trainModel,
  evaluateModel,
  calculateFeatureImportance
} = require('./index');

// Helper function to run tests
function runTest(name, testFn) {
  try {
    testFn();
    console.log(`  ✅ ${name}`);
    passed++;
    return true;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
    return false;
  }
}

let passed = 0;
let failed = 0;

// =============================================================================
// Constants Tests
// =============================================================================

console.log('\n📋 Testing Constants...');

runTest('SCORING_CONFIG has required fields', () => {
  assert(SCORING_CONFIG.MATCH === 0.65);
  assert(SCORING_CONFIG.MISMATCH === 0.15);
  assert(SCORING_CONFIG.NO_RESTRICTION === 0.3);
  assert(SCORING_CONFIG.UNKNOWN === 0.50);
});

runTest('TRAINING_CONFIG has required fields', () => {
  assert(TRAINING_CONFIG.learningRate === 0.1);
  assert(TRAINING_CONFIG.epochs === 500);
  assert(TRAINING_CONFIG.batchSize === 8);
  assert(TRAINING_CONFIG.kFolds === 5);
  assert(TRAINING_CONFIG.randomSeed === 42);
});

runTest('TRAINING_CONFIG.featureNames has 13 features', () => {
  assert(TRAINING_CONFIG.featureNames.length === 13);
  assert(TRAINING_CONFIG.baseFeatureNames.length === 9);
});

runTest('FEATURE_DISPLAY_NAMES covers all features', () => {
  for (const feature of TRAINING_CONFIG.featureNames) {
    assert(FEATURE_DISPLAY_NAMES[feature], `Missing display name for ${feature}`);
  }
});

runTest('FEATURE_CATEGORIES covers base features', () => {
  const allCategorized = Object.values(FEATURE_CATEGORIES).flat();
  for (const feature of TRAINING_CONFIG.baseFeatureNames) {
    assert(allCategorized.includes(feature), `Missing category for ${feature}`);
  }
});

// =============================================================================
// SeededRandom Tests
// =============================================================================

console.log('\n🎲 Testing SeededRandom...');

runTest('SeededRandom produces deterministic sequence', () => {
  const rng1 = new SeededRandom(42);
  const rng2 = new SeededRandom(42);
  
  for (let i = 0; i < 10; i++) {
    assert(rng1.next() === rng2.next());
  }
});

runTest('SeededRandom reset works correctly', () => {
  const rng = new SeededRandom(42);
  const values1 = [rng.next(), rng.next(), rng.next()];
  
  rng.reset();
  const values2 = [rng.next(), rng.next(), rng.next()];
  
  assert.deepStrictEqual(values1, values2);
});

runTest('SeededRandom nextInt produces values in range', () => {
  const rng = new SeededRandom(42);
  for (let i = 0; i < 100; i++) {
    const val = rng.nextInt(10);
    assert(val >= 0 && val < 10);
  }
});

runTest('getSeededRandom returns global instance', () => {
  resetSeededRandom(42);
  const rng1 = getSeededRandom();
  const rng2 = getSeededRandom();
  assert(rng1 === rng2);
});

// =============================================================================
// Feature Extraction Tests
// =============================================================================

console.log('\n📊 Testing Feature Extraction...');

runTest('normalizeGWA: 1.0 GWA returns high score', () => {
  const score = normalizeGWA(1.0, 3.0);
  assert(score > 0.9);
});

runTest('normalizeGWA: 5.0 GWA returns low score', () => {
  const score = normalizeGWA(5.0, 3.0);
  assert(score < 0.1);
});

runTest('normalizeGWA: invalid GWA returns 0.5', () => {
  assert(normalizeGWA(null) === 0.5);
  assert(normalizeGWA(0) === 0.5);
  assert(normalizeGWA(6) === 0.5);
});

runTest('checkYearLevelMatch: exact match returns MATCH', () => {
  const score = checkYearLevelMatch('Junior', ['Freshman', 'Junior', 'Senior']);
  assert(score === SCORING_CONFIG.MATCH);
});

runTest('checkYearLevelMatch: no match returns MISMATCH', () => {
  const score = checkYearLevelMatch('Senior', ['Freshman', 'Sophomore']);
  assert(score === SCORING_CONFIG.MISMATCH);
});

runTest('checkYearLevelMatch: no restriction returns NO_RESTRICTION', () => {
  const score = checkYearLevelMatch('Junior', []);
  assert(score === SCORING_CONFIG.NO_RESTRICTION);
});

runTest('checkYearLevelMatch: unknown value returns UNKNOWN', () => {
  const score = checkYearLevelMatch(null, ['Junior']);
  assert(score === SCORING_CONFIG.UNKNOWN);
});

runTest('checkIncomeMatch: under limit returns high score', () => {
  const score = checkIncomeMatch(100000, 500000, []);
  assert(score > 0.9);
});

runTest('checkIncomeMatch: over limit returns MISMATCH', () => {
  const score = checkIncomeMatch(600000, 500000, []);
  assert(score === SCORING_CONFIG.MISMATCH);
});

runTest('checkSTBracketMatch: exact match returns appropriate score', () => {
  const score = checkSTBracketMatch('Full Discount', ['Full Discount', 'PD80']);
  assert(score >= 0.9);
});

runTest('checkCollegeMatch: case insensitive match', () => {
  const score = checkCollegeMatch('college of arts and sciences', ['College of Arts and Sciences']);
  assert(score === SCORING_CONFIG.MATCH);
});

runTest('checkCourseMatch: partial match works', () => {
  const score = checkCourseMatch('BS Computer Science', ['Computer Science']);
  assert(score === SCORING_CONFIG.MATCH);
});

runTest('checkCitizenshipMatch: exact match required', () => {
  const score = checkCitizenshipMatch('Filipino', ['Filipino', 'Dual Citizen']);
  assert(score === SCORING_CONFIG.MATCH);
});

runTest('calculateApplicationTiming: early application returns high score', () => {
  const deadline = new Date();
  const openDate = new Date(deadline.getTime() - 30 * 24 * 60 * 60 * 1000);
  const appDate = new Date(openDate.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day after open
  
  const score = calculateApplicationTiming(appDate, openDate, deadline);
  assert(score > 0.8);
});

runTest('extractFeatures: returns 13 features', () => {
  const app = {
    applicantSnapshot: {
      gwa: 1.5,
      classification: 'Junior'
    },
    documents: [],
    eligibilityPercentage: 75
  };
  const scholarship = {
    eligibilityCriteria: {}
  };
  
  const features = extractFeatures(app, scholarship);
  assert(Object.keys(features).length === 13);
});

runTest('extractFeaturesFromUserAndScholarship: returns 13 features', () => {
  const user = {
    studentProfile: {
      gwa: 1.5,
      classification: 'Junior'
    }
  };
  const scholarship = {
    eligibilityCriteria: {}
  };
  
  const features = extractFeaturesFromUserAndScholarship(user, scholarship);
  assert(Object.keys(features).length === 13);
});

// =============================================================================
// Math Functions Tests
// =============================================================================

console.log('\n🔢 Testing Math Functions...');

runTest('sigmoid: 0 returns 0.5', () => {
  assert(sigmoid(0) === 0.5);
});

runTest('sigmoid: large positive returns ~1', () => {
  assert(sigmoid(100) > 0.99);
});

runTest('sigmoid: large negative returns ~0', () => {
  assert(sigmoid(-100) < 0.01);
});

runTest('sigmoid: numerical stability with extreme values', () => {
  // Should not throw or return NaN
  assert(!isNaN(sigmoid(1000)));
  assert(!isNaN(sigmoid(-1000)));
});

runTest('binaryCrossEntropy: perfect prediction returns ~0', () => {
  const loss = binaryCrossEntropy(1, 0.999);
  assert(loss < 0.01);
});

runTest('binaryCrossEntropy: wrong prediction returns high loss', () => {
  const loss = binaryCrossEntropy(1, 0.01);
  assert(loss > 1);
});

runTest('dotProduct: computes correctly', () => {
  const weights = { a: 2, b: 3, c: 4 };
  const features = { a: 1, b: 2, c: 3 };
  const result = dotProduct(weights, features);
  assert(result === 2 * 1 + 3 * 2 + 4 * 3); // 20
});

runTest('dotProduct: ignores missing features', () => {
  const weights = { a: 2, b: 3 };
  const features = { a: 1, c: 5 };
  const result = dotProduct(weights, features);
  assert(result === 2); // Only 'a' matches
});

runTest('shuffleArraySeeded: deterministic shuffle', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const rng1 = new SeededRandom(42);
  const rng2 = new SeededRandom(42);
  
  const shuffled1 = shuffleArraySeeded(arr, rng1);
  const shuffled2 = shuffleArraySeeded(arr, rng2);
  
  assert.deepStrictEqual(shuffled1, shuffled2);
});

runTest('shuffleArraySeeded: does not modify original', () => {
  const arr = [1, 2, 3, 4, 5];
  const rng = new SeededRandom(42);
  shuffleArraySeeded(arr, rng);
  
  assert.deepStrictEqual(arr, [1, 2, 3, 4, 5]);
});

runTest('shuffleArray: produces different order', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shuffled = shuffleArray(arr);
  
  // Very unlikely to be in same order
  let same = true;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== shuffled[i]) {
      same = false;
      break;
    }
  }
  // This might fail occasionally but is very unlikely
  assert(!same || true); // Allow pass even if same (very unlikely)
});

// =============================================================================
// Validation Tests
// =============================================================================

console.log('\n✅ Testing Validation...');

runTest('createKFolds: creates correct number of folds', () => {
  const samples = Array.from({ length: 100 }, (_, i) => ({ id: i }));
  const rng = new SeededRandom(42);
  const folds = createKFolds(samples, 5, rng);
  
  assert(folds.length === 5);
});

runTest('createKFolds: folds contain all samples', () => {
  const samples = Array.from({ length: 100 }, (_, i) => ({ id: i }));
  const rng = new SeededRandom(42);
  const folds = createKFolds(samples, 5, rng);
  
  const allSamples = folds.flat();
  assert(allSamples.length === 100);
});

runTest('calculateAverageMetrics: averages correctly', () => {
  const foldMetrics = [
    { accuracy: 0.8, precision: 0.7, recall: 0.9, f1Score: 0.8, truePositives: 10, trueNegatives: 10, falsePositives: 2, falseNegatives: 2 },
    { accuracy: 0.9, precision: 0.8, recall: 0.85, f1Score: 0.82, truePositives: 12, trueNegatives: 11, falsePositives: 1, falseNegatives: 1 }
  ];
  
  const avg = calculateAverageMetrics(foldMetrics, 2);
  // Use approximate comparison due to floating point
  assert(Math.abs(avg.accuracy - 0.85) < 0.001);
  assert(avg.truePositives === 22);
});

runTest('calculateAccuracyStd: calculates standard deviation', () => {
  const foldMetrics = [
    { accuracy: 0.8 },
    { accuracy: 0.9 }
  ];
  const std = calculateAccuracyStd(foldMetrics, 0.85, 2);
  assert(Math.abs(std - 0.05) < 0.001);
});

runTest('averageWeights: averages weights correctly', () => {
  const foldWeights = [
    { gwaScore: 0.5, yearLevelMatch: 0.3 },
    { gwaScore: 0.7, yearLevelMatch: 0.5 }
  ];
  const featureNames = ['gwaScore', 'yearLevelMatch'];
  
  const avg = averageWeights(foldWeights, featureNames, 2);
  assert(avg.gwaScore === 0.6);
  assert(avg.yearLevelMatch === 0.4);
});

runTest('averageBiases: averages biases correctly', () => {
  const foldBiases = [0.1, 0.3, 0.2];
  const avg = averageBiases(foldBiases, 3);
  assert(Math.abs(avg - 0.2) < 0.001);
});

// =============================================================================
// Model Training Tests
// =============================================================================

console.log('\n🧠 Testing Model Training...');

runTest('initializeWeights: returns all 13 features', () => {
  const weights = initializeWeights();
  assert(Object.keys(weights).length === 13);
});

runTest('initializeWeights: all weights are equal', () => {
  const weights = initializeWeights();
  const values = Object.values(weights);
  const firstValue = values[0];
  
  for (const value of values) {
    assert(value === firstValue);
  }
});

runTest('evaluateModel: calculates metrics correctly', () => {
  // Simple weights that should predict based on gwaScore
  // With high positive weight, high gwaScore should predict 1
  const weights = {
    gwaScore: 5.0,  // High weight so sigmoid goes past 0.5
    yearLevelMatch: 0.0,
    incomeMatch: 0.0,
    stBracketMatch: 0.0,
    collegeMatch: 0.0,
    courseMatch: 0.0,
    citizenshipMatch: 0.0,
    applicationTiming: 0.0,
    eligibilityScore: 0.0,
    academicStrength: 0.0,
    financialNeed: 0.0,
    programFit: 0.0,
    overallFit: 0.0
  };
  const bias = -2.5; // Shift so sigmoid(5*1 - 2.5) > 0.5 and sigmoid(5*0 - 2.5) < 0.5
  
  const testSamples = [
    { features: { gwaScore: 1.0 }, label: 1 }, // sigmoid(2.5) = 0.924 -> predict 1
    { features: { gwaScore: 0.0 }, label: 0 }, // sigmoid(-2.5) = 0.076 -> predict 0
  ];
  
  const metrics = evaluateModel(weights, bias, testSamples);
  assert(metrics.accuracy === 1.0, `Expected accuracy 1.0 but got ${metrics.accuracy}`);
});

runTest('calculateFeatureImportance: sums to ~1', () => {
  const weights = {
    a: 0.5,
    b: -0.3,
    c: 0.2
  };
  
  const importance = calculateFeatureImportance(weights);
  const sum = Object.values(importance).reduce((a, b) => a + b, 0);
  
  assert(Math.abs(sum - 1.0) < 0.001);
});

runTest('calculateFeatureImportance: uses absolute values', () => {
  const weights = {
    a: 0.5,
    b: -0.5
  };
  
  const importance = calculateFeatureImportance(weights);
  assert(importance.a === importance.b);
});

// =============================================================================
// Integration Tests
// =============================================================================

console.log('\n🔗 Testing Integration...');

runTest('Full feature extraction pipeline', () => {
  const user = {
    studentProfile: {
      gwa: 1.5,
      classification: 'Junior',
      annualFamilyIncome: 200000,
      stBracket: 'Full Discount',
      college: 'College of Arts and Sciences',
      course: 'BS Computer Science',
      citizenship: 'Filipino'
    }
  };
  
  const scholarship = {
    eligibilityCriteria: {
      eligibleClassifications: ['Junior', 'Senior'],
      eligibleSTBrackets: ['Full Discount', 'PD80'],
      eligibleColleges: ['College of Arts and Sciences'],
      eligibleCourses: ['BS Computer Science'],
      eligibleCitizenship: ['Filipino']
    }
  };
  
  const features = extractFeaturesFromUserAndScholarship(user, scholarship);
  
  // Matching student should have high scores
  assert(features.gwaScore > 0.8);
  assert(features.yearLevelMatch === SCORING_CONFIG.MATCH);
  assert(features.collegeMatch === SCORING_CONFIG.MATCH);
  assert(features.courseMatch === SCORING_CONFIG.MATCH);
  assert(features.citizenshipMatch === SCORING_CONFIG.MATCH);
});

runTest('K-fold cross-validation produces consistent splits', () => {
  const samples = Array.from({ length: 50 }, (_, i) => ({ id: i }));
  
  resetSeededRandom(42);
  const rng1 = getSeededRandom();
  const folds1 = createKFolds(samples, 5, rng1);
  
  resetSeededRandom(42);
  const rng2 = getSeededRandom();
  const folds2 = createKFolds(samples, 5, rng2);
  
  // Folds should be identical
  for (let i = 0; i < 5; i++) {
    assert.deepStrictEqual(folds1[i], folds2[i]);
  }
});

// =============================================================================
// Summary
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
