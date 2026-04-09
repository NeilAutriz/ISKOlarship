require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const { User, Application, Scholarship } = require('../src/models');

  const admin = await User.findOne({ email: 'mgautriz@up.edu.ph' });
  console.log('=== YOUR ADMIN SCOPE ===');
  console.log('Email:', admin.email);
  console.log('Access Level:', admin.adminProfile.accessLevel);
  console.log('College:', admin.adminProfile.collegeCode);
  console.log('Academic Unit:', admin.adminProfile.academicUnitCode);

  // Find out-of-scope scholarships
  console.log('\n=== OUT-OF-SCOPE SCHOLARSHIPS (would trigger Access Restricted) ===');
  const outSchols = await Scholarship.find({
    $or: [
      { scholarshipLevel: 'college', managingCollegeCode: { $ne: admin.adminProfile.collegeCode } },
      { scholarshipLevel: 'academic_unit', managingCollegeCode: { $ne: admin.adminProfile.collegeCode } },
    ]
  }).select('_id name scholarshipLevel managingCollegeCode managingAcademicUnitCode').lean();
  outSchols.forEach(s => console.log('  ID:', s._id, '|', s.name, '| level:', s.scholarshipLevel, '| college:', s.managingCollegeCode));

  // Find out-of-scope applications
  console.log('\n=== OUT-OF-SCOPE APPLICATIONS (would trigger Access Restricted) ===');
  const outScholIds = outSchols.map(s => s._id);
  const outApps = await Application.find({ scholarship: { $in: outScholIds } })
    .select('_id scholarship status')
    .populate('scholarship', 'name managingCollegeCode')
    .limit(5)
    .lean();
  outApps.forEach(a => console.log('  ID:', a._id, '| scholarship:', a.scholarship?.name, '| college:', a.scholarship?.managingCollegeCode));

  // Find in-scope for comparison
  console.log('\n=== IN-SCOPE SCHOLARSHIPS (should work fine) ===');
  const inSchols = await Scholarship.find({
    $or: [
      { scholarshipLevel: 'university' },
      { managingCollegeCode: admin.adminProfile.collegeCode },
    ]
  }).select('_id name scholarshipLevel managingCollegeCode').lean();
  inSchols.forEach(s => console.log('  ID:', s._id, '|', s.name, '| level:', s.scholarshipLevel));

  // Print frontend URLs
  console.log('\n============================================');
  console.log('FRONTEND URLS TO TEST "Access Restricted"');
  console.log('============================================');
  if (outSchols.length > 0) {
    console.log('\nScholarship Applicants (out-of-scope):');
    outSchols.slice(0, 3).forEach(s => {
      console.log('  http://localhost:5173/admin/scholarships/' + s._id + '/applicants');
    });
    console.log('\nEdit Scholarship (out-of-scope):');
    outSchols.slice(0, 3).forEach(s => {
      console.log('  http://localhost:5173/admin/scholarships/' + s._id + '/edit');
    });
  }
  if (outApps.length > 0) {
    console.log('\nApplication Review (out-of-scope):');
    outApps.slice(0, 3).forEach(a => {
      console.log('  http://localhost:5173/admin/applications/' + a._id);
    });
  }

  await mongoose.disconnect();
})();
