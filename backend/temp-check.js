require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolars');
  const { Scholarship, User } = require('./src/models');
  const { getScholarshipScopeFilter } = require('./src/middleware/adminScope.middleware');
  
  console.log('=== ACADEMIC UNIT ADMINS ===');
  const unitAdmins = await User.find({ 
    role: 'admin', 
    'adminProfile.accessLevel': 'academic_unit' 
  }).lean();
  
  unitAdmins.forEach(a => {
    console.log(JSON.stringify({
      email: a.email,
      accessLevel: a.adminProfile?.accessLevel,
      collegeCode: a.adminProfile?.collegeCode,
      academicUnitCode: a.adminProfile?.academicUnitCode
    }));
  });
  
  console.log('\n=== ICS ADMIN FILTER TEST ===');
  const icsAdmin = await User.findOne({ email: 'ics.admin@iskolarship.uplb.edu.ph' });
  if (icsAdmin) {
    const filter = getScholarshipScopeFilter(icsAdmin);
    console.log('Filter generated:', JSON.stringify(filter, null, 2));
    
    const scholarships = await Scholarship.find(filter).lean();
    console.log('Scholarships returned:', scholarships.length);
    scholarships.forEach(s => console.log('-', s.name));
  }
  
  console.log('\n=== ICS SCHOLARSHIPS IN DB ===');
  const icsScholarships = await Scholarship.find({
    scholarshipLevel: 'academic_unit',
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'ICS'
  }).lean();
  console.log('Count:', icsScholarships.length);
  icsScholarships.forEach(s => console.log('-', s.name));
  
  console.log('\n=== ALL ACADEMIC UNIT SCHOLARSHIPS ===');
  const allUnitScholarships = await Scholarship.find({
    scholarshipLevel: 'academic_unit'
  }).lean();
  console.log('Count:', allUnitScholarships.length);
  allUnitScholarships.forEach(s => {
    console.log(`- ${s.name.substring(0, 40)} (${s.managingCollegeCode}/${s.managingAcademicUnitCode})`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
