// Test script to verify prediction API returns proper feature contributions
const mongoose = require('mongoose');
const { User, Scholarship } = require('./src/models');
const predictionService = require('./src/services/prediction.service');

mongoose.connect('mongodb://localhost:27017/iskolaship')
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Get test student
    const student = await User.findOne({ 
      email: 'sterix.eligible@up.edu.ph' 
    });
    
    if (!student) {
      console.log('❌ Test student not found');
      process.exit(1);
    }
    
    console.log('👤 Testing with:', student.firstName, student.lastName);
    console.log('📧 Email:', student.email);
    console.log('📊 GWA:', student.studentProfile.gwa);
    console.log('💰 Annual Family Income:', student.studentProfile.annualFamilyIncome);
    console.log('👨‍👩‍👧‍👦 Household Size:', student.studentProfile.householdSize);
    console.log('📱 Contact:', student.studentProfile.contactNumber);
    console.log();
    
    // Get a scholarship
    const scholarship = await Scholarship.findOne({ 
      name: /Sterix/i 
    });
    
    if (!scholarship) {
      console.log('❌ Test scholarship not found');
      process.exit(1);
    }
    
    console.log('🎓 Testing scholarship:', scholarship.name);
    console.log();
    
    // Get prediction
    console.log('🔮 Running prediction...\n');
    const prediction = await predictionService.predictApprovalProbability(
      student, 
      scholarship
    );
    
    console.log('📈 Prediction Results:');
    console.log('  • Probability:', `${(prediction.probability * 100).toFixed(1)}%`);
    console.log('  • Predicted Outcome:', prediction.predictedOutcome);
    console.log('  • Confidence:', prediction.confidence);
    console.log();
    
    console.log('🎯 Feature Contributions:');
    if (prediction.featureContributions) {
      const sorted = Object.entries(prediction.featureContributions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      for (const [feature, contribution] of sorted) {
        const percentage = (contribution * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(contribution * 50));
        console.log(`  • ${feature.padEnd(25)} ${percentage.padStart(6)}% ${bar}`);
      }
      
      // Check for NaN values
      const hasNaN = Object.values(prediction.featureContributions).some(v => isNaN(v));
      if (hasNaN) {
        console.log('\n❌ WARNING: Some contributions are NaN!');
      } else {
        console.log('\n✅ All contributions are valid numbers!');
      }
    } else {
      console.log('  ❌ No feature contributions found!');
    }
    
    console.log();
    console.log('🔬 Raw Features:');
    if (prediction.features) {
      for (const [feature, value] of Object.entries(prediction.features)) {
        console.log(`  • ${feature.padEnd(25)} = ${value}`);
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
