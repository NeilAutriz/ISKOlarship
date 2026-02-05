/**
 * API Endpoint Test - Model Type in Predictions
 * 
 * This test verifies that the API correctly returns modelType in prediction responses,
 * which the frontend uses to display "Local Data" vs "Global Data" tags.
 * 
 * Run with: node scripts/verification/test-api-model-type.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Test results tracking
const testResults = { passed: 0, failed: 0, tests: [] };

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
    
    const { Scholarship, User, Application } = require('../../src/models');
    const { TRAINING_CONFIG } = require('../../src/services/trainingService/constants');
    const { predictApprovalProbability } = require('../../src/services/scholarshipPrediction');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('       API MODEL TYPE VERIFICATION TESTS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nThese tests verify the API returns correct modelType for frontend display\n');
    
    // Get test data
    const testUser = await User.findOne({ role: 'student' });
    const albaceaScholarship = await Scholarship.findOne({ name: /ICS Albacea/i });
    
    // Get a data-rich scholarship (not Albacea)
    const allScholarships = await Scholarship.find({}).lean();
    const dataRichScholarship = allScholarships.find(s => !s.name.includes('Albacea'));
    const fullDataRichScholarship = await Scholarship.findById(dataRichScholarship._id);
    
    if (!testUser) {
      console.log('❌ No test user found. Please seed the database first.');
      process.exit(1);
    }
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST GROUP 1: Prediction API Response Structure');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Test 1.1: Check response contains modelType field
    const result = await predictApprovalProbability(testUser, fullDataRichScholarship);
    assert(
      'modelType' in result,
      'API response contains modelType field',
      Object.keys(result).join(', ')
    );
    
    // Test 1.2: Check modelType is valid value
    assert(
      ['scholarship_specific', 'global'].includes(result.modelType),
      'modelType is valid (scholarship_specific or global)',
      `Got: ${result.modelType}`
    );
    
    // Test 1.3: Check modelDescription field exists
    assert(
      'modelDescription' in result,
      'API response contains modelDescription field'
    );
    
    // Test 1.4: Check probability is in response
    assert(
      typeof result.probability === 'number',
      'API response contains probability as number',
      `Type: ${typeof result.probability}`
    );
    
    console.log('');
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST GROUP 2: Model Type for Different Scholarships');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Test 2.1: Data-rich scholarship returns scholarship_specific
    const dataRichResult = await predictApprovalProbability(testUser, fullDataRichScholarship);
    assert(
      dataRichResult.modelType === 'scholarship_specific',
      `Data-rich scholarship (${fullDataRichScholarship.name}) → scholarship_specific`,
      `Got: ${dataRichResult.modelType}`
    );
    
    // Test 2.2: Albacea (insufficient data) returns global
    const albaceaResult = await predictApprovalProbability(testUser, albaceaScholarship);
    assert(
      albaceaResult.modelType === 'global',
      `ICS Albacea Award (1 sample) → global`,
      `Got: ${albaceaResult.modelType}`
    );
    
    // Test 2.3: Model description is appropriate
    assert(
      dataRichResult.modelDescription.includes('scholarship') || 
      dataRichResult.modelDescription.includes('historical'),
      'scholarship_specific has appropriate description',
      dataRichResult.modelDescription
    );
    
    assert(
      albaceaResult.modelDescription.includes('global') || 
      albaceaResult.modelDescription.includes('all scholarships'),
      'global has appropriate description',
      albaceaResult.modelDescription
    );
    
    console.log('');
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST GROUP 3: Frontend Display Mapping');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Test frontend display logic
    const getDisplayTag = (modelType) => {
      if (modelType === 'scholarship_specific') return 'Local Data';
      if (modelType === 'global') return 'Global Data';
      return 'Unknown';
    };
    
    // Test 3.1: Local Data tag for scholarship_specific
    assert(
      getDisplayTag(dataRichResult.modelType) === 'Local Data',
      'scholarship_specific → "Local Data" tag',
      getDisplayTag(dataRichResult.modelType)
    );
    
    // Test 3.2: Global Data tag for global
    assert(
      getDisplayTag(albaceaResult.modelType) === 'Global Data',
      'global → "Global Data" tag',
      getDisplayTag(albaceaResult.modelType)
    );
    
    console.log('');
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST GROUP 4: Batch Prediction (Multiple Scholarships)');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    // Test batch predictions for multiple scholarships
    const scholarships = await Scholarship.find({}).limit(5).lean();
    const batchResults = [];
    
    for (const sch of scholarships) {
      const fullSch = await Scholarship.findById(sch._id);
      const pred = await predictApprovalProbability(testUser, fullSch);
      batchResults.push({
        name: sch.name,
        modelType: pred.modelType
      });
    }
    
    // Test 4.1: All batch results have modelType
    const allHaveModelType = batchResults.every(r => r.modelType);
    assert(
      allHaveModelType,
      'All batch predictions have modelType',
      batchResults.map(r => `${r.name}: ${r.modelType}`).join('\n      ')
    );
    
    // Test 4.2: modelType values are consistent
    const validTypes = batchResults.every(r => 
      ['scholarship_specific', 'global'].includes(r.modelType)
    );
    assert(
      validTypes,
      'All batch modelType values are valid',
      batchResults.map(r => r.modelType).join(', ')
    );
    
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                      TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log(`   Total Tests:  ${testResults.passed + testResults.failed}`);
    console.log(`   Passed:       ${testResults.passed} ✅`);
    console.log(`   Failed:       ${testResults.failed} ❌`);
    console.log('');
    
    if (testResults.failed === 0) {
      console.log('   🎉 ALL TESTS PASSED!');
      console.log('');
      console.log('   ✅ API correctly returns modelType in prediction responses');
      console.log('   ✅ Frontend can use modelType to display:');
      console.log('      • "Local Data" 📊 for scholarship_specific');
      console.log('      • "Global Data" 🌐 for global fallback');
    } else {
      console.log('   ⚠️  SOME TESTS FAILED');
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
