/**
 * End-to-End Model Selection Integration Test
 * 
 * This test simulates the complete flow from frontend to database:
 * 1. Frontend requests predictions via API
 * 2. Backend loads appropriate model (scholarship_specific or global)
 * 3. Returns modelType for UI display
 * 
 * This ensures the model selection principle works coherently across all layers.
 * 
 * Run with: node scripts/verification/test-e2e-model-selection.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Simulated frontend display logic (matching ScholarshipCard.tsx)
const FRONTEND_DISPLAY = {
  getModelTag: (modelType) => {
    if (modelType === 'scholarship_specific') {
      return { label: 'Local Data', icon: 'Database', color: 'indigo' };
    }
    if (modelType === 'global') {
      return { label: 'Global Data', icon: 'Globe2', color: 'sky' };
    }
    return null;
  }
};

// Test tracking
let passed = 0, failed = 0;

function test(condition, name, details = '') {
  if (condition) {
    passed++;
    console.log(`   ✅ ${name}`);
  } else {
    failed++;
    console.log(`   ❌ ${name}`);
    if (details) console.log(`      → ${details}`);
  }
}

async function runE2ETests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const { Scholarship, User, Application, TrainedModel } = require('../../src/models');
    const { TRAINING_CONFIG } = require('../../src/services/trainingService/constants');
    const { predictApprovalProbability } = require('../../src/services/scholarshipPrediction');
    const { clearModelWeightsCache } = require('../../src/services/logisticRegressionCore/modelCache');
    
    // Clear cache for clean test
    clearModelWeightsCache();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('       END-TO-END MODEL SELECTION INTEGRATION TEST');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n📋 Model Selection Principle:`);
    console.log(`   • ≥${TRAINING_CONFIG.minSamplesPerScholarship} samples → scholarship_specific (Local Data)`);
    console.log(`   • <${TRAINING_CONFIG.minSamplesPerScholarship} samples → global fallback (Global Data)`);
    console.log('');
    
    // =========================================================================
    // Get all scholarships with their application counts
    // =========================================================================
    
    const scholarships = await Scholarship.aggregate([
      {
        $lookup: {
          from: 'applications',
          let: { schId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ['$scholarship', '$$schId'] }, 
                status: { $in: ['approved', 'rejected'] } 
              } 
            },
            { $count: 'count' }
          ],
          as: 'appCount'
        }
      },
      { 
        $addFields: { 
          applicationCount: { $ifNull: [{ $arrayElemAt: ['$appCount.count', 0] }, 0] } 
        } 
      },
      { $sort: { applicationCount: 1 } }
    ]);
    
    const testUser = await User.findOne({ role: 'student' });
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  SCHOLARSHIP CLASSIFICATION');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    const insufficientData = scholarships.filter(s => s.applicationCount < TRAINING_CONFIG.minSamplesPerScholarship);
    const sufficientData = scholarships.filter(s => s.applicationCount >= TRAINING_CONFIG.minSamplesPerScholarship);
    
    console.log(`   Scholarships with insufficient data (<${TRAINING_CONFIG.minSamplesPerScholarship}): ${insufficientData.length}`);
    insufficientData.forEach(s => console.log(`      🌐 ${s.name} (${s.applicationCount} samples)`));
    
    console.log(`\n   Scholarships with sufficient data (≥${TRAINING_CONFIG.minSamplesPerScholarship}): ${sufficientData.length}`);
    if (sufficientData.length > 5) {
      sufficientData.slice(0, 5).forEach(s => console.log(`      📊 ${s.name} (${s.applicationCount} samples)`));
      console.log(`      ... and ${sufficientData.length - 5} more`);
    } else {
      sufficientData.forEach(s => console.log(`      📊 ${s.name} (${s.applicationCount} samples)`));
    }
    
    console.log('');
    
    // =========================================================================
    // Test: Scholarships with insufficient data → Global fallback
    // =========================================================================
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST: Insufficient Data → Global Fallback');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    for (const sch of insufficientData) {
      const fullSch = await Scholarship.findById(sch._id);
      const prediction = await predictApprovalProbability(testUser, fullSch);
      const display = FRONTEND_DISPLAY.getModelTag(prediction.modelType);
      
      test(
        prediction.modelType === 'global',
        `${sch.name} (${sch.applicationCount} samples) → ${display?.label || 'ERROR'}`,
        prediction.modelType !== 'global' ? `Expected: global, Got: ${prediction.modelType}` : ''
      );
    }
    
    console.log('');
    
    // =========================================================================
    // Test: Scholarships with sufficient data → Scholarship-specific
    // =========================================================================
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST: Sufficient Data → Scholarship-Specific');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Test a sample of scholarships with sufficient data
    const sampleSize = Math.min(5, sufficientData.length);
    for (let i = 0; i < sampleSize; i++) {
      const sch = sufficientData[i];
      const fullSch = await Scholarship.findById(sch._id);
      const prediction = await predictApprovalProbability(testUser, fullSch);
      const display = FRONTEND_DISPLAY.getModelTag(prediction.modelType);
      
      test(
        prediction.modelType === 'scholarship_specific',
        `${sch.name} (${sch.applicationCount} samples) → ${display?.label || 'ERROR'}`,
        prediction.modelType !== 'scholarship_specific' ? `Expected: scholarship_specific, Got: ${prediction.modelType}` : ''
      );
    }
    
    console.log('');
    
    // =========================================================================
    // Test: Frontend display mapping
    // =========================================================================
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST: Frontend Display Mapping');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Verify the frontend display logic
    const localTag = FRONTEND_DISPLAY.getModelTag('scholarship_specific');
    const globalTag = FRONTEND_DISPLAY.getModelTag('global');
    
    test(localTag.label === 'Local Data', 'scholarship_specific → "Local Data" label');
    test(localTag.icon === 'Database', 'scholarship_specific → Database icon');
    test(localTag.color === 'indigo', 'scholarship_specific → indigo color');
    
    test(globalTag.label === 'Global Data', 'global → "Global Data" label');
    test(globalTag.icon === 'Globe2', 'global → Globe2 icon');
    test(globalTag.color === 'sky', 'global → sky color');
    
    console.log('');
    
    // =========================================================================
    // Test: Database consistency
    // =========================================================================
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST: Database Consistency');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Check no scholarship with insufficient data has an active specific model
    for (const sch of insufficientData) {
      const model = await TrainedModel.findOne({
        scholarshipId: sch._id,
        modelType: 'scholarship_specific',
        isActive: true
      });
      
      test(
        model === null,
        `${sch.name} has NO active scholarship-specific model in DB`,
        model ? `Found unexpected model: ${model.name}` : ''
      );
    }
    
    // Check active global model exists
    const globalModel = await TrainedModel.findOne({
      modelType: 'global',
      isActive: true
    });
    
    test(globalModel !== null, 'Active global model exists as fallback');
    
    console.log('');
    
    // =========================================================================
    // Summary
    // =========================================================================
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                      E2E TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const total = passed + failed;
    console.log(`   Total Tests:  ${total}`);
    console.log(`   Passed:       ${passed} ✅`);
    console.log(`   Failed:       ${failed} ❌`);
    console.log('');
    
    if (failed === 0) {
      console.log('   🎉 ALL E2E TESTS PASSED!');
      console.log('');
      console.log('   The model selection principle works correctly:');
      console.log('');
      console.log('   ┌─────────────────┬────────────────────┬─────────────┐');
      console.log('   │ Condition       │ Model Used         │ UI Display  │');
      console.log('   ├─────────────────┼────────────────────┼─────────────┤');
      console.log(`   │ ≥${TRAINING_CONFIG.minSamplesPerScholarship} samples     │ scholarship_specific│ 📊 Local    │`);
      console.log(`   │ <${TRAINING_CONFIG.minSamplesPerScholarship} samples     │ global (fallback)   │ 🌐 Global   │`);
      console.log('   └─────────────────┴────────────────────┴─────────────┘');
    } else {
      console.log('   ⚠️  SOME E2E TESTS FAILED');
      console.log('   Please review the failures above.');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('E2E Test error:', error);
    process.exit(1);
  }
}

runE2ETests();
