/**
 * Model Selection Principle - Comprehensive Test Suite
 * 
 * PRINCIPLE:
 * - PRIMARY: Scholarship-specific model if ≥30 approved/rejected applications
 * - FALLBACK: Global model if <30 applications
 * 
 * These tests verify the model selection works correctly across:
 * - Database layer (TrainedModel queries)
 * - Backend service layer (loadModelWeights, getPrediction)
 * - API layer (prediction endpoints)
 * 
 * Run with: node scripts/verification/test-model-selection.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function assert(condition, testName, details = '') {
  if (condition) {
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'PASSED', details });
    console.log(`   ✅ ${testName}`);
  } else {
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'FAILED', details });
    console.log(`   ❌ ${testName}`);
    if (details) console.log(`      Details: ${details}`);
  }
}

async function runTests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const { Scholarship, Application, TrainedModel, User } = require('../../src/models');
    const { TRAINING_CONFIG } = require('../../src/services/trainingService/constants');
    const { loadModelWeights, clearModelWeightsCache } = require('../../src/services/logisticRegressionCore/modelCache');
    const { predictAsync } = require('../../src/services/logisticRegressionCore/prediction');
    const scholarshipPrediction = require('../../src/services/scholarshipPrediction');
    
    // Clear cache to ensure fresh tests
    clearModelWeightsCache();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('       MODEL SELECTION PRINCIPLE - COMPREHENSIVE TESTS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\nMinimum samples threshold: ${TRAINING_CONFIG.minSamplesPerScholarship}`);
    console.log('');
    
    // =========================================================================
    // SETUP: Get test data
    // =========================================================================
    
    // Find a scholarship with sufficient data (should use specific model)
    const scholarshipsWithData = await Scholarship.aggregate([
      {
        $lookup: {
          from: 'applications',
          let: { schId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$scholarship', '$$schId'] }, status: { $in: ['approved', 'rejected'] } } },
            { $count: 'count' }
          ],
          as: 'appCount'
        }
      },
      { $addFields: { applicationCount: { $ifNull: [{ $arrayElemAt: ['$appCount.count', 0] }, 0] } } },
      { $match: { applicationCount: { $gte: TRAINING_CONFIG.minSamplesPerScholarship } } },
      { $limit: 1 }
    ]);
    
    const scholarshipWithData = scholarshipsWithData[0];
    
    // Find ICS Albacea Award (scholarship with insufficient data)
    const albaceaScholarship = await Scholarship.findOne({ name: /ICS Albacea/i }).lean();
    
    // Get a test user
    const testUser = await User.findOne({ role: 'student' }).lean();
    
    // =========================================================================
    // TEST GROUP 1: Database Layer Tests
    // =========================================================================
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST GROUP 1: Database Layer');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Test 1.1: Verify scholarship-specific model exists for data-rich scholarship
    const specificModel = await TrainedModel.findOne({
      scholarshipId: scholarshipWithData._id,
      modelType: 'scholarship_specific',
      isActive: true
    });
    assert(
      specificModel !== null,
      'Scholarship with ≥30 samples has active scholarship-specific model',
      `Scholarship: ${scholarshipWithData.name}, Count: ${scholarshipWithData.applicationCount}`
    );
    
    // Test 1.2: Verify NO scholarship-specific model for Albacea (insufficient data)
    const albaceaModel = await TrainedModel.findOne({
      scholarshipId: albaceaScholarship?._id,
      modelType: 'scholarship_specific',
      isActive: true
    });
    assert(
      albaceaModel === null,
      'ICS Albacea Award (1 sample) has NO active scholarship-specific model',
      albaceaModel ? `Found unexpected model: ${albaceaModel.name}` : 'Correctly no model'
    );
    
    // Test 1.3: Verify global model exists as fallback
    const globalModel = await TrainedModel.findOne({
      modelType: 'global',
      isActive: true
    });
    assert(
      globalModel !== null,
      'Active global model exists for fallback',
      globalModel ? `Model: ${globalModel.name}` : 'No global model!'
    );
    
    // Test 1.4: Verify getActiveModelForScholarship static method
    const modelForDataRich = await TrainedModel.getActiveModelForScholarship(scholarshipWithData._id);
    assert(
      modelForDataRich && modelForDataRich.modelType === 'scholarship_specific',
      'getActiveModelForScholarship returns scholarship-specific for data-rich scholarship'
    );
    
    // Test 1.5: Verify getActiveModelForScholarship returns global fallback for insufficient data
    // Note: This function returns global as fallback, not null. That's the intended behavior.
    const modelForAlbacea = await TrainedModel.getActiveModelForScholarship(albaceaScholarship?._id);
    assert(
      modelForAlbacea && modelForAlbacea.modelType === 'global',
      'getActiveModelForScholarship returns GLOBAL fallback for scholarship with insufficient data',
      modelForAlbacea ? `Got: ${modelForAlbacea.modelType}` : 'Got: null'
    );
    
    console.log('');
    
    // =========================================================================
    // TEST GROUP 2: Model Cache Layer Tests
    // =========================================================================
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST GROUP 2: Model Cache Layer (loadModelWeights)');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Clear cache before testing
    clearModelWeightsCache();
    
    // Test 2.1: Load model for data-rich scholarship → should be scholarship_specific
    const dataRichResult = await loadModelWeights(scholarshipWithData._id.toString());
    assert(
      dataRichResult.modelType === 'scholarship_specific',
      'loadModelWeights returns scholarship_specific for data-rich scholarship',
      `Got: ${dataRichResult.modelType}, Expected: scholarship_specific`
    );
    
    // Test 2.2: Load model for ICS Albacea → should fallback to global
    const albaceaResult = await loadModelWeights(albaceaScholarship._id.toString());
    assert(
      albaceaResult.modelType === 'global',
      'loadModelWeights returns global (fallback) for ICS Albacea',
      `Got: ${albaceaResult.modelType}, Expected: global`
    );
    
    // Test 2.3: Verify weights are returned
    assert(
      dataRichResult.weights && Object.keys(dataRichResult.weights).length > 0,
      'loadModelWeights returns valid weights for scholarship-specific model'
    );
    
    assert(
      albaceaResult.weights && Object.keys(albaceaResult.weights).length > 0,
      'loadModelWeights returns valid weights for global fallback'
    );
    
    // Test 2.4: Load model for non-existent scholarship → should fallback to global
    const fakeScholarshipId = new mongoose.Types.ObjectId();
    const fakeResult = await loadModelWeights(fakeScholarshipId.toString());
    assert(
      fakeResult.modelType === 'global',
      'loadModelWeights returns global for non-existent scholarship',
      `Got: ${fakeResult.modelType}, Expected: global`
    );
    
    console.log('');
    
    // =========================================================================
    // TEST GROUP 3: Prediction Service Layer Tests
    // =========================================================================
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST GROUP 3: Prediction Service Layer');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    if (testUser) {
      // Test 3.1: Prediction for data-rich scholarship returns scholarship_specific modelType
      const fullScholarshipWithData = await Scholarship.findById(scholarshipWithData._id);
      const fullUser = await User.findById(testUser._id);
      
      const predictionDataRich = await predictAsync(fullUser, fullScholarshipWithData);
      assert(
        predictionDataRich.modelType === 'scholarship_specific',
        'predictAsync returns scholarship_specific for data-rich scholarship',
        `Got: ${predictionDataRich.modelType}`
      );
      
      // Test 3.2: Prediction for ICS Albacea returns global modelType
      const fullAlbacea = await Scholarship.findById(albaceaScholarship._id);
      const predictionAlbacea = await predictAsync(fullUser, fullAlbacea);
      assert(
        predictionAlbacea.modelType === 'global',
        'predictAsync returns global for ICS Albacea (insufficient data)',
        `Got: ${predictionAlbacea.modelType}`
      );
      
      // Test 3.3: Verify probability is returned
      assert(
        typeof predictionDataRich.probability === 'number' && 
        predictionDataRich.probability >= 0 && 
        predictionDataRich.probability <= 1,
        'predictAsync returns valid probability (0-1)',
        `Probability: ${predictionDataRich.probability}`
      );
      
      // Test 3.4: scholarshipPrediction service test (predictApprovalProbability)
      const spResult = await scholarshipPrediction.predictApprovalProbability(fullUser, fullAlbacea);
      assert(
        spResult.modelType === 'global',
        'scholarshipPrediction.predictApprovalProbability returns global for insufficient data',
        `Got: ${spResult.modelType}`
      );
    } else {
      console.log('   ⚠️  Skipping prediction tests - no test user found');
    }
    
    console.log('');
    
    // =========================================================================
    // TEST GROUP 4: Edge Cases
    // =========================================================================
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST GROUP 4: Edge Cases');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Test 4.1: Scholarship with exactly 30 samples should use specific model
    const exactThreshold = await Scholarship.aggregate([
      {
        $lookup: {
          from: 'applications',
          let: { schId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$scholarship', '$$schId'] }, status: { $in: ['approved', 'rejected'] } } },
            { $count: 'count' }
          ],
          as: 'appCount'
        }
      },
      { $addFields: { applicationCount: { $ifNull: [{ $arrayElemAt: ['$appCount.count', 0] }, 0] } } },
      { $match: { applicationCount: TRAINING_CONFIG.minSamplesPerScholarship } },
      { $limit: 1 }
    ]);
    
    if (exactThreshold.length > 0) {
      const exactModel = await TrainedModel.findOne({
        scholarshipId: exactThreshold[0]._id,
        modelType: 'scholarship_specific',
        isActive: true
      });
      assert(
        exactModel !== null,
        `Scholarship with exactly ${TRAINING_CONFIG.minSamplesPerScholarship} samples has specific model`,
        `Scholarship: ${exactThreshold[0].name}`
      );
    } else {
      console.log(`   ℹ️  No scholarship with exactly ${TRAINING_CONFIG.minSamplesPerScholarship} samples found`);
    }
    
    // Test 4.2: Scholarship with 29 samples should NOT have specific model
    const justBelowThreshold = await Scholarship.aggregate([
      {
        $lookup: {
          from: 'applications',
          let: { schId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$scholarship', '$$schId'] }, status: { $in: ['approved', 'rejected'] } } },
            { $count: 'count' }
          ],
          as: 'appCount'
        }
      },
      { $addFields: { applicationCount: { $ifNull: [{ $arrayElemAt: ['$appCount.count', 0] }, 0] } } },
      { $match: { applicationCount: TRAINING_CONFIG.minSamplesPerScholarship - 1 } },
      { $limit: 1 }
    ]);
    
    if (justBelowThreshold.length > 0) {
      const belowModel = await TrainedModel.findOne({
        scholarshipId: justBelowThreshold[0]._id,
        modelType: 'scholarship_specific',
        isActive: true
      });
      assert(
        belowModel === null,
        `Scholarship with ${TRAINING_CONFIG.minSamplesPerScholarship - 1} samples has NO specific model`,
        `Scholarship: ${justBelowThreshold[0].name}`
      );
    } else {
      console.log(`   ℹ️  No scholarship with exactly ${TRAINING_CONFIG.minSamplesPerScholarship - 1} samples found`);
    }
    
    // Test 4.3: Multiple calls to loadModelWeights should return consistent results
    clearModelWeightsCache();
    const call1 = await loadModelWeights(albaceaScholarship._id.toString());
    const call2 = await loadModelWeights(albaceaScholarship._id.toString());
    assert(
      call1.modelType === call2.modelType && call1.modelType === 'global',
      'Multiple loadModelWeights calls return consistent results',
      `Call1: ${call1.modelType}, Call2: ${call2.modelType}`
    );
    
    console.log('');
    
    // =========================================================================
    // TEST GROUP 5: Model Type Consistency
    // =========================================================================
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST GROUP 5: Model Type Values Consistency');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Test 5.1: modelType values match expected enum
    assert(
      dataRichResult.modelType === 'scholarship_specific',
      'scholarship_specific modelType string is exact match'
    );
    
    assert(
      albaceaResult.modelType === 'global',
      'global modelType string is exact match'
    );
    
    // Test 5.2: No other modelType values exist in active models
    const allActiveModels = await TrainedModel.find({ isActive: true }).lean();
    const modelTypes = [...new Set(allActiveModels.map(m => m.modelType))];
    assert(
      modelTypes.every(t => ['global', 'scholarship_specific'].includes(t)),
      'All active models have valid modelType (global or scholarship_specific)',
      `Found types: ${modelTypes.join(', ')}`
    );
    
    console.log('');
    
    // =========================================================================
    // SUMMARY
    // =========================================================================
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                      TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log(`   Total Tests:  ${testResults.passed + testResults.failed}`);
    console.log(`   Passed:       ${testResults.passed} ✅`);
    console.log(`   Failed:       ${testResults.failed} ❌`);
    console.log('');
    
    if (testResults.failed === 0) {
      console.log('   🎉 ALL TESTS PASSED!\n');
      console.log('   The model selection principle is working correctly:');
      console.log('   • Scholarships with ≥30 samples → scholarship_specific model');
      console.log('   • Scholarships with <30 samples → global fallback');
    } else {
      console.log('   ⚠️  SOME TESTS FAILED\n');
      console.log('   Failed tests:');
      testResults.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`   • ${t.name}: ${t.details}`));
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    await mongoose.disconnect();
    
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

runTests();
