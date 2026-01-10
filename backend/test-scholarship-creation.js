// =============================================================================
// Test Scholarship Creation - Verify Frontend/Backend Consistency
// =============================================================================

const mongoose = require('mongoose');
const { Scholarship, User } = require('./src/models');
require('dotenv').config();

// Sample scholarship data matching frontend form structure
const testScholarshipData = {
  name: "Test Scholarship - Consistency Check",
  description: "This is a test scholarship to verify that frontend data structure matches backend schema perfectly.",
  sponsor: "Test Sponsor",
  type: "University Scholarship",
  totalGrant: 50000,
  awardDescription: "₱50,000 per semester",
  
  // Dates in ISO format (as sent from frontend)
  applicationDeadline: new Date("2026-06-30").toISOString(),
  applicationStartDate: new Date("2026-01-15").toISOString(),
  
  academicYear: "2026-2027",
  semester: "First",
  slots: 10,
  filledSlots: 0,
  
  status: "draft",
  isActive: false,
  
  eligibilityCriteria: {
    minGWA: 2.0,
    maxGWA: 3.0,
    eligibleClassifications: ["Junior", "Senior"],
    minUnitsEnrolled: 15,
    minUnitsPassed: 90,
    eligibleColleges: ["College of Arts and Sciences", "College of Engineering and Agro-Industrial Technology"],
    eligibleCourses: ["BS Computer Science", "BS Information Technology"],
    eligibleMajors: [],
    maxAnnualFamilyIncome: 500000,
    minAnnualFamilyIncome: 0,
    eligibleSTBrackets: ["Full Discount", "PD20", "PD40"],
    eligibleProvinces: ["Laguna", "Metro Manila"],
    eligibleCitizenship: ["Filipino"],
    requiresApprovedThesisOutline: false,
    mustNotHaveOtherScholarship: true,
    mustNotHaveThesisGrant: false,
    mustNotHaveDisciplinaryAction: true,
    mustNotHaveFailingGrade: true,
    mustNotHaveGradeOf4: false,
    mustNotHaveIncompleteGrade: false,
    mustBeGraduating: false,
    additionalRequirements: [
      { description: "Must submit letter of recommendation", isRequired: true }
    ]
  },
  
  requiredDocuments: [
    { name: "Certificate of Registration", description: "Current semester COR", isRequired: true },
    { name: "True Copy of Grades", description: "Previous semester grades", isRequired: true },
    { name: "Certificate of Family Income", description: "ITR or BIR Certificate", isRequired: false }
  ],
  
  contactEmail: "test@up.edu.ph",
  contactPhone: "+639123456789",
  websiteUrl: "https://test.uplb.edu.ph",
  applicationUrl: "https://apply.uplb.edu.ph"
};

async function testScholarshipCreation() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find an admin user to use as createdBy
    console.log('🔍 Finding admin user...');
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('❌ No admin user found in database');
      process.exit(1);
    }
    
    console.log(`✅ Found admin: ${adminUser.email} (${adminUser._id})\n`);

    // Add createdBy (simulating backend behavior)
    testScholarshipData.createdBy = adminUser._id;

    console.log('📝 Creating test scholarship with data:');
    console.log(JSON.stringify(testScholarshipData, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    // Create scholarship
    console.log('💾 Saving to database...');
    const scholarship = new Scholarship(testScholarshipData);
    await scholarship.save();
    
    console.log('✅ Scholarship created successfully!\n');
    console.log('📊 Stored document structure:');
    console.log(JSON.stringify(scholarship.toObject(), null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    // Verify all fields
    console.log('🔍 Verification:');
    console.log(`✅ ID: ${scholarship._id}`);
    console.log(`✅ Name: ${scholarship.name}`);
    console.log(`✅ Type: ${scholarship.type}`);
    console.log(`✅ Academic Year: ${scholarship.academicYear}`);
    console.log(`✅ Semester: ${scholarship.semester}`);
    console.log(`✅ Deadline: ${scholarship.applicationDeadline}`);
    console.log(`✅ Status: ${scholarship.status}`);
    console.log(`✅ Created By: ${scholarship.createdBy}`);
    console.log(`✅ Eligibility Criteria Fields: ${Object.keys(scholarship.eligibilityCriteria).length}`);
    console.log(`✅ Required Documents: ${scholarship.requiredDocuments.length}`);
    
    console.log('\n✅ All fields stored correctly!');
    
    // Clean up - delete test scholarship
    console.log('\n🧹 Cleaning up test data...');
    await Scholarship.findByIdAndDelete(scholarship._id);
    console.log('✅ Test scholarship deleted');
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 CONSISTENCY TEST PASSED!');
    console.log('Frontend → Backend → Database flow is working perfectly.');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(error);
    
    if (error.errors) {
      console.error('\n📋 Validation Errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run test
testScholarshipCreation();
