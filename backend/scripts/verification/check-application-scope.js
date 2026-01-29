// =============================================================================
// Application Scope Verification Script
// Tests that admins only see applications they should have access to
// =============================================================================

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function checkApplicationScope() {
  console.log('\n🔍 ========== APPLICATION SCOPE VERIFICATION ==========\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const { User } = require('../../src/models/User.model');
    const { Scholarship } = require('../../src/models/Scholarship.model');
    const { Application } = require('../../src/models/Application.model');
    
    // Get all admins
    const admins = await User.find({ role: 'admin' }).lean();
    console.log(`Found ${admins.length} admin accounts\n`);
    
    // Get total application counts
    const totalApplications = await Application.countDocuments();
    console.log(`Total Applications in Database: ${totalApplications}\n`);
    
    // Get all scholarships for reference
    const allScholarships = await Scholarship.find().lean();
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    for (const admin of admins) {
      const profile = admin.adminProfile;
      console.log(`👤 Admin: ${admin.email}`);
      console.log(`   Access Level: ${profile?.accessLevel || 'NOT SET'}`);
      console.log(`   College: ${profile?.collegeCode || 'N/A'}`);
      console.log(`   Academic Unit: ${profile?.academicUnitCode || 'N/A'}`);
      
      // Build the same query the middleware uses
      let scholarshipQuery = {};
      let accessDescription = '';
      
      if (profile?.accessLevel === 'university') {
        // University admin sees all
        accessDescription = 'ALL applications (university-level access)';
      } else if (profile?.accessLevel === 'college') {
        // College admin sees college and unit scholarships within their college
        scholarshipQuery = {
          $or: [
            { scholarshipLevel: 'university' }, // They can see university scholarships too
            {
              scholarshipLevel: 'college',
              managingCollegeCode: profile.collegeCode
            },
            {
              scholarshipLevel: 'academic_unit',
              managingCollegeCode: profile.collegeCode
            }
          ]
        };
        accessDescription = `College: ${profile.collegeCode} (college + unit level)`;
      } else if (profile?.accessLevel === 'academic_unit') {
        // Academic unit admin sees only their unit's scholarships
        scholarshipQuery = {
          scholarshipLevel: 'academic_unit',
          managingCollegeCode: profile.collegeCode,
          managingAcademicUnitCode: profile.academicUnitCode
        };
        accessDescription = `Academic Unit: ${profile.academicUnitCode} in ${profile.collegeCode}`;
      } else {
        console.log('   ⚠️ Invalid access level - cannot determine scope\n');
        console.log('───────────────────────────────────────────────────────────\n');
        continue;
      }
      
      console.log(`   Scope: ${accessDescription}`);
      
      // Find matching scholarships
      const scopedScholarships = Object.keys(scholarshipQuery).length > 0 
        ? await Scholarship.find(scholarshipQuery).lean()
        : allScholarships;
      
      const scholarshipIds = scopedScholarships.map(s => s._id);
      
      // Count applications for these scholarships
      const applicationCount = await Application.countDocuments({
        scholarship: { $in: scholarshipIds }
      });
      
      console.log(`   📋 Visible Scholarships: ${scopedScholarships.length}`);
      console.log(`   📋 Visible Applications: ${applicationCount}`);
      
      // Show breakdown by scholarship
      if (scopedScholarships.length > 0 && scopedScholarships.length <= 10) {
        console.log(`   Scholarship Breakdown:`);
        for (const scholarship of scopedScholarships) {
          const appCount = await Application.countDocuments({ scholarship: scholarship._id });
          console.log(`      - ${scholarship.name}: ${appCount} applications`);
        }
      }
      
      // Verify clean separation
      if (profile?.accessLevel === 'academic_unit') {
        // Check that NO applications from other units are visible
        const otherUnitScholarships = await Scholarship.find({
          managingAcademicUnitCode: { $ne: profile.academicUnitCode }
        }).lean();
        
        const wrongApplications = await Application.countDocuments({
          scholarship: { $in: otherUnitScholarships.map(s => s._id) }
        });
        
        if (wrongApplications > 0) {
          console.log(`   ✅ Correctly excluded: ${wrongApplications} applications from other units`);
        }
      }
      
      console.log('\n───────────────────────────────────────────────────────────\n');
    }
    
    // Test specific ICS admin case
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SPECIFIC TEST: ICS Admin Scope Verification');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const icsAdmin = await User.findOne({ 
      'adminProfile.academicUnitCode': 'ICS' 
    }).lean();
    
    if (icsAdmin) {
      console.log(`Testing ICS Admin: ${icsAdmin.email}`);
      
      // Get ICS scholarships
      const icsScholarships = await Scholarship.find({
        scholarshipLevel: 'academic_unit',
        managingCollegeCode: 'CAS',
        managingAcademicUnitCode: 'ICS'
      }).lean();
      
      console.log(`\nICS Scholarships Found: ${icsScholarships.length}`);
      
      for (const scholarship of icsScholarships) {
        const apps = await Application.find({ scholarship: scholarship._id })
          .populate('applicant', 'email firstName lastName')
          .lean();
        
        console.log(`\n  📘 ${scholarship.name}`);
        console.log(`     Level: ${scholarship.scholarshipLevel}`);
        console.log(`     Applications: ${apps.length}`);
        
        if (apps.length > 0) {
          console.log('     Sample Applicants:');
          apps.slice(0, 3).forEach(app => {
            console.log(`       - ${app.applicant?.firstName} ${app.applicant?.lastName} (${app.status})`);
          });
        }
      }
      
      // Verify no unauthorized access
      const nonICSapplications = await Application.aggregate([
        {
          $lookup: {
            from: 'scholarships',
            localField: 'scholarship',
            foreignField: '_id',
            as: 'scholarshipData'
          }
        },
        { $unwind: '$scholarshipData' },
        {
          $match: {
            'scholarshipData.managingAcademicUnitCode': { $ne: 'ICS' }
          }
        },
        { $count: 'total' }
      ]);
      
      const nonICSCount = nonICSapplications[0]?.total || 0;
      console.log(`\n✅ Applications ICS admin should NOT see: ${nonICSCount}`);
      
      const icsAppCount = await Application.aggregate([
        {
          $lookup: {
            from: 'scholarships',
            localField: 'scholarship',
            foreignField: '_id',
            as: 'scholarshipData'
          }
        },
        { $unwind: '$scholarshipData' },
        {
          $match: {
            'scholarshipData.managingAcademicUnitCode': 'ICS'
          }
        },
        { $count: 'total' }
      ]);
      
      const icsCount = icsAppCount[0]?.total || 0;
      console.log(`✅ Applications ICS admin SHOULD see: ${icsCount}`);
      
      if (icsCount === 0) {
        console.log('\n⚠️  NOTE: No ICS applications found. Run the seed script:');
        console.log('   node src/seeds/applications-uplb-realistic.seed.js');
      }
      
    } else {
      console.log('❌ No ICS admin found in database');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Application Scope Verification Complete');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkApplicationScope();
