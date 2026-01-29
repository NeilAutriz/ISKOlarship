require('dotenv').config();
const mongoose = require('mongoose');

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolars');
  
  const { User } = require('./src/models/User.model');
  const { Scholarship } = require('./src/models/Scholarship.model');
  const { getScholarshipScopeFilter } = require('./src/middleware/adminScope.middleware');
  
  console.log('\n=== COMPREHENSIVE SCOPE VERIFICATION ===\n');
  
  // Fetch all admin accounts
  const admins = await User.find({ role: 'admin' }).lean();
  console.log('Total Admin Accounts:', admins.length);
  
  // Group by access level
  for (const admin of admins) {
    const profile = admin.adminProfile || {};
    const accessLevel = profile.accessLevel || 'NO ACCESS LEVEL SET';
    const collegeCode = profile.collegeCode || 'N/A';
    const academicUnitCode = profile.academicUnitCode || 'N/A';
    
    console.log('\n---');
    console.log('Admin:', admin.email);
    console.log('  Access Level:', accessLevel);
    console.log('  College Code:', collegeCode);
    console.log('  Academic Unit Code:', academicUnitCode);
    
    // Build scope filter for this admin
    const filter = getScholarshipScopeFilter(admin);
    console.log('  Filter:', JSON.stringify(filter));
    
    // Count scholarships with this filter
    const count = await Scholarship.countDocuments(filter);
    console.log('  Scholarships Visible:', count);
    
    // Show some sample scholarship names
    const samples = await Scholarship.find(filter).select('name scholarshipLevel').limit(3).lean();
    if (samples.length > 0) {
      samples.forEach(s => console.log('    -', s.name, '(' + s.scholarshipLevel + ')'));
      if (count > 3) console.log('    ... and', count - 3, 'more');
    }
  }
  
  // Summary
  console.log('\n\n=== SCHOLARSHIP DISTRIBUTION ===');
  const scholarshipsByLevel = await Scholarship.aggregate([
    { $group: { _id: '$scholarshipLevel', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  scholarshipsByLevel.forEach(s => console.log(' ', s._id + ':', s.count, 'scholarships'));
  
  const total = await Scholarship.countDocuments();
  console.log('\n  TOTAL:', total, 'scholarships');
  
  await mongoose.disconnect();
  console.log('\n✅ Verification Complete!');
}

verify().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
