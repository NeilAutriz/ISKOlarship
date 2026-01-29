const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verifyData() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolars');
  
  const { Application, Scholarship, User } = require('../src/models');
  
  console.log('=== DATA VERIFICATION ===\n');
  
  // Users summary
  const users = await User.find({}).lean();
  const students = users.filter(u => u.role === 'student');
  const admins = users.filter(u => u.role === 'admin');
  
  console.log('USERS:', users.length);
  console.log('  Students:', students.length);
  console.log('  Admins:', admins.length);
  
  // Admin distribution
  const adminByLevel = { university: 0, college: 0, academic_unit: 0 };
  admins.forEach(a => {
    if (a.adminLevel) adminByLevel[a.adminLevel]++;
  });
  console.log('  Admin distribution:', JSON.stringify(adminByLevel));
  console.log('');
  
  // Scholarships summary
  const scholarships = await Scholarship.find({}).lean();
  const scholarshipByScope = { university: 0, college: 0, academic_unit: 0 };
  scholarships.forEach(s => {
    if (s.scopeLevel) scholarshipByScope[s.scopeLevel]++;
  });
  
  console.log('SCHOLARSHIPS:', scholarships.length);
  console.log('  By scope:', JSON.stringify(scholarshipByScope));
  
  // Show scholarship names by scope
  console.log('\n  University level scholarships:');
  scholarships.filter(s => s.scopeLevel === 'university').slice(0, 5).forEach(s => {
    console.log(`    - ${s.name.substring(0, 50)}...`);
  });
  
  console.log('\n  College level scholarships:');
  scholarships.filter(s => s.scopeLevel === 'college').slice(0, 5).forEach(s => {
    console.log(`    - ${s.name.substring(0, 50)} (${s.targetCollege})`);
  });
  
  console.log('\n  Academic unit level scholarships:');
  scholarships.filter(s => s.scopeLevel === 'academic_unit').slice(0, 5).forEach(s => {
    console.log(`    - ${s.name.substring(0, 50)} (${s.targetCollege}/${s.targetAcademicUnit})`);
  });
  console.log('');
  
  // Applications summary
  const apps = await Application.find({}).populate('scholarship', 'name scopeLevel').lean();
  
  const byStatus = {};
  const byScope = { university: 0, college: 0, academic_unit: 0, unknown: 0 };
  
  apps.forEach(app => {
    byStatus[app.status] = (byStatus[app.status] || 0) + 1;
    const scope = app.scholarship?.scopeLevel || 'unknown';
    byScope[scope]++;
  });
  
  console.log('APPLICATIONS:', apps.length);
  console.log('  By status:', JSON.stringify(byStatus));
  console.log('  By scholarship scope:', JSON.stringify(byScope));
  
  // Check application format
  const sample = apps.find(a => a.statusHistory && a.statusHistory.length > 0);
  if (sample) {
    console.log('\n  SAMPLE APPLICATION FORMAT:');
    console.log(`    statusHistory: ${sample.statusHistory?.length || 0} entries`);
    console.log(`    documents: ${sample.documents?.length || 0} files`);
    console.log(`    eligibilityChecks: ${sample.eligibilityChecks?.length || 0} checks`);
    console.log(`    applicantSnapshot: ${sample.applicantSnapshot ? 'yes' : 'no'}`);
    console.log(`    prediction: ${sample.prediction ? 'yes' : 'no'}`);
    
    if (sample.prediction) {
      console.log(`      - probability: ${sample.prediction.probability}`);
      console.log(`      - predictedOutcome: ${sample.prediction.predictedOutcome}`);
      console.log(`      - confidence: ${sample.prediction.confidence}`);
    }
  }
  
  console.log('\n=== VERIFICATION COMPLETE ===');
  await mongoose.disconnect();
}

verifyData().catch(console.error);
