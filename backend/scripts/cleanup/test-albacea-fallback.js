/**
 * Test that ICS Albacea Award now uses global model fallback
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testModelFallback() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { loadModelWeights } = require('../../src/services/logisticRegressionCore/modelCache');
    
    // ICS Albacea Award scholarship ID
    const scholarshipId = '6981658afa113014b71c1027';
    
    console.log('\nTesting model loading for ICS Albacea Award...');
    
    const result = await loadModelWeights(scholarshipId);
    
    console.log('\nModel loaded successfully!');
    console.log('  Model Type:', result.modelType);
    console.log('  Expected: global (since scholarship has < 30 samples)');
    
    if (result.modelType === 'global') {
      console.log('\n✅ CORRECT! Now using global model as fallback');
    } else {
      console.log('\n❌ INCORRECT! Should be using global model');
    }
    
    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testModelFallback();
