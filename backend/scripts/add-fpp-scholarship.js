// =============================================================================
// Add Foundation For Philippine Progress Scholarship to Database
// (without wiping existing data)
// Run: node scripts/add-fpp-scholarship.js
// =============================================================================

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Scholarship, ScholarshipType, ScholarshipStatus, ScholarshipLevel } = require('../src/models/Scholarship.model');
const { User, UPLBCollege, Classification, Citizenship } = require('../src/models/User.model');

const createDeadline = (monthsFromNow) => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date;
};

const createStartDate = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

const newScholarships = [
  {
    name: 'Foundation For Philippine Progress Undergraduate Fellowship Grant',
    description: `The Foundation For Philippine Progress Undergraduate Fellowship Grant provides financial support to deserving UPLB students with Sophomore, Junior, or Senior classification. It is open to any student from the College of Agriculture and Food Sciences (CAFS), OR BS Industrial Engineering students, OR BS Computer Science students. Applicants must have a minimum GWA of 2.50 and belong to a family whose gross income does not exceed ₱300,000.00 per annum.`,
    sponsor: 'Foundation For Philippine Progress',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 50000,
    awardDescription: 'Undergraduate fellowship grant',
    eligibilityCriteria: {
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCourses: ['BS Industrial Engineering', 'BS Computer Science'],
      eligibleColleges: [UPLBCollege.CAFS, UPLBCollege.CEAT, UPLBCollege.CAS],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.5,
      maxAnnualFamilyIncome: 300000,
      additionalRequirements: [
        { description: 'Must be any CAFS student, OR a BS Industrial Engineering student, OR a BS Computer Science student', isRequired: true },
        { description: 'Must have a minimum GWA of 2.50', isRequired: true },
        { description: 'Family gross income must not exceed ₱300,000.00 per annum', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Photo in the Application Form', description: 'Recent photo attached to the application form', isRequired: true },
      { name: 'Proof of Income', description: "Parents' ITR, SALN, BIR Certification, Affidavit of Income, Tax Exemption, Certificate of Employment and Compensation, Contract with Employer, or Certificate of Indigency", isRequired: true },
      { name: 'Birth Certificate', description: 'PSA-issued birth certificate', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['fpp', 'fellowship', 'agriculture', 'engineering', 'computer science', 'csfa']
  }
];

async function addScholarships() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolarship';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Find an admin user to set as createdBy
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found in database. Please create an admin first.');
      process.exit(1);
    }
    console.log(`Using admin: ${adminUser.email}\n`);

    let added = 0;
    let skipped = 0;

    for (const scholarship of newScholarships) {
      // Check if already exists by name
      const existing = await Scholarship.findOne({ name: scholarship.name });
      if (existing) {
        console.log(`SKIPPED (already exists): ${scholarship.name}`);
        skipped++;
        continue;
      }

      const doc = new Scholarship({
        ...scholarship,
        createdBy: adminUser._id
      });
      await doc.save();
      console.log(`ADDED: ${scholarship.name}`);
      added++;
    }

    console.log(`\nDone! Added: ${added}, Skipped: ${skipped}`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

addScholarships();
