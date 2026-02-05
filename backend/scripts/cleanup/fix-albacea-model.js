/**
 * Fix ICS Albacea Award Model
 * 
 * This script removes the incorrectly created scholarship-specific model
 * for ICS Albacea Award, which only has 1 application and should use
 * the global model as fallback.
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixAlbaceaModel() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { TrainedModel } = require('../../src/models');
    
    // Find and delete the ICS Albacea Award scholarship-specific model
    const albaceaModel = await TrainedModel.findOne({
      name: { $regex: /ICS Albacea/i },
      modelType: 'scholarship_specific',
      isActive: true
    });
    
    if (albaceaModel) {
      console.log('\n📋 Found ICS Albacea Award Model:');
      console.log('   Name:', albaceaModel.name);
      console.log('   Type:', albaceaModel.modelType);
      console.log('   ScholarshipID:', albaceaModel.scholarshipId);
      console.log('   Active:', albaceaModel.isActive);
      
      // Delete it
      await TrainedModel.deleteOne({ _id: albaceaModel._id });
      console.log('\n✅ Deleted the incorrectly created ICS Albacea Award Model');
    } else {
      console.log('No active ICS Albacea Award scholarship-specific model found');
    }
    
    // Verify global model exists for fallback
    const globalModel = await TrainedModel.findOne({ modelType: 'global', isActive: true });
    if (globalModel) {
      console.log('✅ Global model is available for fallback');
      console.log('   Name:', globalModel.name);
    } else {
      console.log('⚠️ No active global model found - predictions will fail!');
    }
    
    // Also clean up any other scholarships with insufficient data that have models
    console.log('\n📊 Checking for other invalid scholarship-specific models...');
    
    const { Scholarship, Application } = require('../../src/models');
    const { TRAINING_CONFIG } = require('../../src/services/trainingService/constants');
    
    // Get all active scholarship-specific models
    const activeModels = await TrainedModel.find({
      modelType: 'scholarship_specific',
      isActive: true
    }).lean();
    
    let cleanedCount = 0;
    
    for (const model of activeModels) {
      if (!model.scholarshipId) continue;
      
      // Count applications for this scholarship
      const count = await Application.countDocuments({
        scholarship: model.scholarshipId,
        status: { $in: ['approved', 'rejected'] }
      });
      
      if (count < TRAINING_CONFIG.minSamplesPerScholarship) {
        // Get scholarship name
        const scholarship = await Scholarship.findById(model.scholarshipId).lean();
        const name = scholarship?.name || model.scholarshipId;
        
        console.log(`   ⚠️ ${name}: Only ${count}/${TRAINING_CONFIG.minSamplesPerScholarship} samples - deleting model`);
        await TrainedModel.deleteOne({ _id: model._id });
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`\n✅ Cleaned up ${cleanedCount} invalid scholarship-specific models`);
    } else {
      console.log('\n✅ No other invalid models found');
    }
    
    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAlbaceaModel();
