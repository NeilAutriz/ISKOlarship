// Quick test script to verify student data fields
const mongoose = require('mongoose');
const User = require('./src/models/User.model.js');

mongoose.connect('mongodb://localhost:27017/iskolaship')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Test student
    const student = await User.findOne({ email: 'sterix.eligible@up.edu.ph' })
      .select('firstName lastName email studentProfile');
    
    console.log('✅ Student:', student.firstName, student.lastName);
    console.log('📧 Email:', student.email);
    console.log('\n📊 Student Profile Fields:');
    console.log('  • annualFamilyIncome:', student.studentProfile.annualFamilyIncome);
    console.log('  • householdSize:', student.studentProfile.householdSize);
    console.log('  • contactNumber:', student.studentProfile.contactNumber);
    console.log('  • hasExistingScholarship:', student.studentProfile.hasExistingScholarship);
    console.log('  • gwa:', student.studentProfile.gwa);
    console.log('  • stBracket:', student.studentProfile.stBracket);
    console.log('  • college:', student.studentProfile.college);
    console.log('  • course:', student.studentProfile.course);
    
    // Check if any are undefined/null
    const issues = [];
    if (!student.studentProfile.annualFamilyIncome) issues.push('annualFamilyIncome is missing');
    if (!student.studentProfile.householdSize) issues.push('householdSize is missing');
    if (!student.studentProfile.contactNumber) issues.push('contactNumber is missing');
    if (student.studentProfile.hasExistingScholarship === undefined) issues.push('hasExistingScholarship is missing');
    
    if (issues.length > 0) {
      console.log('\n❌ Issues found:');
      issues.forEach(issue => console.log('  -', issue));
    } else {
      console.log('\n✅ All fields are properly populated!');
    }
    
    await mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
