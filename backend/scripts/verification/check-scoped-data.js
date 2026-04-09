const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const { User } = require('../src/models/User.model');
  const { Scholarship } = require('../src/models/Scholarship.model');
  
  // Check admin levels
  const admins = await User.find({ role: 'admin' }).select('email adminProfile.accessLevel adminProfile.collegeCode adminProfile.academicUnitCode').lean();
  console.log('\n=== ADMIN USERS BY LEVEL ===');
  const byLevel = {};
  admins.forEach(a => {
    const level = a.adminProfile?.accessLevel || 'unknown';
    if (!byLevel[level]) byLevel[level] = [];
    byLevel[level].push({
      email: a.email,
      collegeCode: a.adminProfile?.collegeCode,
      academicUnitCode: a.adminProfile?.academicUnitCode
    });
  });
  Object.entries(byLevel).forEach(([level, users]) => {
    console.log('\n' + level.toUpperCase() + ' (' + users.length + '):');
    users.forEach(u => console.log('  - ' + u.email + ' | College: ' + (u.collegeCode || 'N/A') + ' | Unit: ' + (u.academicUnitCode || 'N/A')));
  });

  // Check scholarship levels
  const scholarships = await Scholarship.find().select('name scholarshipLevel managingCollegeCode managingAcademicUnitCode').lean();
  console.log('\n=== SCHOLARSHIPS BY LEVEL ===');
  const scholarshipsByLevel = {};
  scholarships.forEach(s => {
    const level = s.scholarshipLevel || 'unknown';
    if (!scholarshipsByLevel[level]) scholarshipsByLevel[level] = [];
    scholarshipsByLevel[level].push({
      name: s.name.substring(0, 40),
      collegeCode: s.managingCollegeCode,
      academicUnitCode: s.managingAcademicUnitCode
    });
  });
  Object.entries(scholarshipsByLevel).forEach(([level, items]) => {
    console.log('\n' + level.toUpperCase() + ' (' + items.length + '):');
    items.slice(0, 5).forEach(s => console.log('  - ' + s.name + '... | College: ' + (s.collegeCode || 'N/A') + ' | Unit: ' + (s.academicUnitCode || 'N/A')));
    if (items.length > 5) console.log('  ... and ' + (items.length - 5) + ' more');
  });

  await mongoose.connection.close();
}

check().catch(console.error);
