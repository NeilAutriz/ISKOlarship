const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { User, Scholarship } = require('./src/models');
  const logisticService = require('./src/services/logisticRegression.service');
  
  // Find multiple students with profiles
  const students = await User.find({ role: 'student', 'studentProfile.gwa': { $exists: true } }).limit(3);
  const scholarships = await Scholarship.find().limit(3);
  
  console.log('Testing prediction variability across students and scholarships\n');
  console.log('=' .repeat(80));
  
  for (const student of students) {
    console.log(`\nStudent: ${student.studentProfile.firstName} ${student.studentProfile.lastName}`);
    console.log(`  GWA: ${student.studentProfile.gwa}, Year: ${student.studentProfile.classification}`);
    console.log(`  College: ${student.studentProfile.college}`);
    console.log(`  Income: ₱${(student.studentProfile.annualFamilyIncome || 0).toLocaleString()}`);
    console.log('-'.repeat(80));
    
    for (const scholarship of scholarships) {
      const result = await logisticService.predictAsync(student, scholarship);
      console.log(`  ${scholarship.name.substring(0, 40).padEnd(40)} | ${result.probabilityPercentage}% | ${result.confidence}`);
    }
  }
  
  await mongoose.disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
