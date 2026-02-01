const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolarship')
  .then(async () => {
    const { User, Scholarship, TrainedModel } = require('./src/models');
    const logisticRegression = require('./src/services/logisticRegression.service');
    
    // Get all scholarships and check which have trained models
    const scholarships = await Scholarship.find({}).limit(5);
    console.log('Testing predictions for multiple scholarships:\n');
    
    const student = await User.findOne({ role: 'student' });
    if (!student) {
      console.log('No student found');
      process.exit(0);
    }
    
    for (const scholarship of scholarships) {
      // Check if scholarship has a specific model
      const model = await TrainedModel.findOne({ 
        modelType: 'scholarship_specific',
        scholarship: scholarship._id,
        isActive: true
      });
      
      console.log('---');
      console.log('Scholarship:', scholarship.name);
      console.log('Has specific model:', !!model);
      
      const prediction = await logisticRegression.predictAsync(student, scholarship);
      console.log('Using trained model:', prediction.trainedModel);
      console.log('Sample weight (gwaScore):', prediction.factors.find(f => f.factor.includes('GWA'))?.weight || 'N/A');
    }
    
    // Also check global model
    const globalModel = await TrainedModel.findOne({ modelType: 'global', isActive: true });
    console.log('\n--- Global Model ---');
    console.log('Exists:', !!globalModel);
    if (globalModel) {
      console.log('gwaScore weight:', globalModel.weights?.gwaScore);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
