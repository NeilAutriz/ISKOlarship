#!/usr/bin/env node
// =============================================================================
// ISKOlarship - Admin Scope Verification Script
// Checks admin profiles and scholarships for proper scope configuration
// Run with: node scripts/verification/check-admin-scope.js
// =============================================================================

const mongoose = require('mongoose');
require('dotenv').config();

async function checkAdminScope() {
  try {
    console.log('🔍 ========== ADMIN SCOPE VERIFICATION ==========\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models after connection
    const { User } = require('../../src/models/User.model');
    const { Scholarship } = require('../../src/models/Scholarship.model');

    // =================================================================
    // 1. Check all admin users
    // =================================================================
    console.log('👥 ========== ADMIN USERS ==========\n');
    
    const admins = await User.find({ role: 'admin' }).lean();
    console.log(`Found ${admins.length} admin user(s)\n`);

    for (const admin of admins) {
      const ap = admin.adminProfile || {};
      console.log('----------------------------------------');
      console.log(`📧 Email: ${admin.email}`);
      console.log(`👤 Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`🔐 Access Level: ${ap.accessLevel || '❌ NOT SET'}`);
      console.log(`🏛️  College Code: ${ap.collegeCode || '❌ NOT SET'}`);
      console.log(`📚 Academic Unit Code: ${ap.academicUnitCode || '❌ NOT SET'}`);
      console.log(`🏛️  College (legacy): ${ap.college || 'not set'}`);
      console.log(`📚 Academic Unit (legacy): ${ap.academicUnit || 'not set'}`);
      
      // Validate configuration
      let issues = [];
      
      if (!ap.accessLevel) {
        issues.push('Missing accessLevel');
      }
      
      if (ap.accessLevel === 'college' && !ap.collegeCode) {
        issues.push('College admin missing collegeCode');
      }
      
      if (ap.accessLevel === 'academic_unit') {
        if (!ap.collegeCode) issues.push('Academic unit admin missing collegeCode');
        if (!ap.academicUnitCode) issues.push('Academic unit admin missing academicUnitCode');
      }
      
      if (issues.length > 0) {
        console.log(`⚠️  Issues: ${issues.join(', ')}`);
      } else {
        console.log(`✅ Configuration OK`);
      }
      console.log('');
    }

    // =================================================================
    // 2. Check scholarship distribution
    // =================================================================
    console.log('\n📚 ========== SCHOLARSHIP DISTRIBUTION ==========\n');
    
    const scholarshipsByLevel = await Scholarship.aggregate([
      {
        $group: {
          _id: '$scholarshipLevel',
          count: { $sum: 1 },
          samples: { $push: { name: '$name', collegeCode: '$managingCollegeCode', unitCode: '$managingAcademicUnitCode' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    for (const level of scholarshipsByLevel) {
      console.log(`\n📊 ${level._id || 'null'}: ${level.count} scholarship(s)`);
      // Show first 3 samples
      const samples = level.samples.slice(0, 3);
      samples.forEach(s => {
        console.log(`   - ${s.name}`);
        if (s.collegeCode) console.log(`     College: ${s.collegeCode}`);
        if (s.unitCode) console.log(`     Unit: ${s.unitCode}`);
      });
      if (level.samples.length > 3) {
        console.log(`   ... and ${level.samples.length - 3} more`);
      }
    }

    // =================================================================
    // 3. Check ICS-specific data
    // =================================================================
    console.log('\n\n🖥️  ========== ICS SPECIFIC CHECK ==========\n');
    
    // Find ICS admin(s)
    const icsAdmins = await User.find({
      role: 'admin',
      $or: [
        { 'adminProfile.academicUnitCode': 'ICS' },
        { 'adminProfile.academicUnit': { $regex: /ICS|Institute of Computer Science/i } }
      ]
    }).lean();

    console.log(`Found ${icsAdmins.length} ICS admin(s)`);
    
    for (const admin of icsAdmins) {
      const ap = admin.adminProfile || {};
      console.log(`\n  📧 ${admin.email}`);
      console.log(`  Access Level: ${ap.accessLevel}`);
      console.log(`  College Code: ${ap.collegeCode}`);
      console.log(`  Academic Unit Code: ${ap.academicUnitCode}`);
      
      // Check expected values for ICS
      if (ap.accessLevel !== 'academic_unit') {
        console.log(`  ⚠️  WARNING: accessLevel should be 'academic_unit'`);
      }
      if (ap.collegeCode !== 'CAS') {
        console.log(`  ⚠️  WARNING: collegeCode should be 'CAS' (ICS is under College of Arts and Sciences)`);
      }
      if (ap.academicUnitCode !== 'ICS') {
        console.log(`  ⚠️  WARNING: academicUnitCode should be 'ICS'`);
      }
    }

    // Find ICS scholarships
    const icsScholarships = await Scholarship.find({
      scholarshipLevel: 'academic_unit',
      $or: [
        { managingAcademicUnitCode: 'ICS' },
        { managingAcademicUnit: { $regex: /ICS|Computer Science/i } }
      ]
    }).select('name scholarshipLevel managingCollegeCode managingAcademicUnitCode').lean();

    console.log(`\nFound ${icsScholarships.length} ICS scholarship(s):`);
    icsScholarships.forEach(s => {
      console.log(`  - ${s.name}`);
      console.log(`    Level: ${s.scholarshipLevel}`);
      console.log(`    College: ${s.managingCollegeCode || s.managingCollege}`);
      console.log(`    Unit: ${s.managingAcademicUnitCode || s.managingAcademicUnit}`);
    });

    // =================================================================
    // 4. Simulate ICS admin query
    // =================================================================
    console.log('\n\n🧪 ========== SIMULATING ICS ADMIN QUERY ==========\n');
    
    // This is the exact query the backend would generate for an ICS admin
    const icsQuery = {
      scholarshipLevel: 'academic_unit',
      managingCollegeCode: 'CAS',
      managingAcademicUnitCode: 'ICS'
    };
    
    console.log('Query:', JSON.stringify(icsQuery, null, 2));
    
    const icsResults = await Scholarship.find(icsQuery).lean();
    console.log(`\nResults: ${icsResults.length} scholarship(s) would be visible to ICS admin`);
    icsResults.forEach(s => {
      console.log(`  - ${s.name}`);
    });

    // =================================================================
    // Summary
    // =================================================================
    console.log('\n\n📋 ========== SUMMARY ==========\n');
    
    const totalScholarships = await Scholarship.countDocuments();
    const universityLevel = await Scholarship.countDocuments({ scholarshipLevel: 'university' });
    const collegeLevel = await Scholarship.countDocuments({ scholarshipLevel: 'college' });
    const academicUnitLevel = await Scholarship.countDocuments({ scholarshipLevel: 'academic_unit' });
    const externalLevel = await Scholarship.countDocuments({ scholarshipLevel: 'external' });
    const nullLevel = await Scholarship.countDocuments({ scholarshipLevel: null });
    
    console.log(`Total Scholarships: ${totalScholarships}`);
    console.log(`  - University Level: ${universityLevel}`);
    console.log(`  - College Level: ${collegeLevel}`);
    console.log(`  - Academic Unit Level: ${academicUnitLevel}`);
    console.log(`  - External Level: ${externalLevel}`);
    console.log(`  - No Level (null): ${nullLevel}`);
    
    console.log(`\nTotal Admins: ${admins.length}`);
    const universityAdmins = admins.filter(a => a.adminProfile?.accessLevel === 'university').length;
    const collegeAdmins = admins.filter(a => a.adminProfile?.accessLevel === 'college').length;
    const academicUnitAdmins = admins.filter(a => a.adminProfile?.accessLevel === 'academic_unit').length;
    const unconfiguredAdmins = admins.filter(a => !a.adminProfile?.accessLevel).length;
    
    console.log(`  - University Admins: ${universityAdmins}`);
    console.log(`  - College Admins: ${collegeAdmins}`);
    console.log(`  - Academic Unit Admins: ${academicUnitAdmins}`);
    console.log(`  - Unconfigured Admins: ${unconfiguredAdmins}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkAdminScope();
