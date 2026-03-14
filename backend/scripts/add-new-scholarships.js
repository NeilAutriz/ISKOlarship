// =============================================================================
// Add 3 New Scholarships to Database (without wiping existing data)
// Run: node scripts/add-new-scholarships.js
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
  // 1. CSFA UP System Senior Graduating Student Scholarship
  {
    name: 'CSFA UP System Senior Graduating Student Scholarship',
    description: `This scholarship supports financially needy senior students from any college of the University of the Philippines System who are expected to graduate at the end of the 2nd semester. Applicants must have a GWA of 2.50 or better, carry at least 15 units, and have no failing, unremoved 4.0 or incomplete grades. Annual gross family income must not exceed ₱300,000.`,
    sponsor: 'UPLB Committee on Student Financial Assistance (CSFA)',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 30000,
    awardDescription: '₱30,000 financial assistance for graduating seniors',
    eligibilityCriteria: {
      maxGWA: 2.5,
      eligibleClassifications: [Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CAFS, UPLBCollege.CEM, UPLBCollege.CEAT, UPLBCollege.CFNR, UPLBCollege.CHE, UPLBCollege.CVM, UPLBCollege.CDC, UPLBCollege.CPAF, UPLBCollege.GS],
      maxAnnualFamilyIncome: 300000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true,
      mustNotHaveGradeOf4: true,
      mustNotHaveIncompleteGrade: true,
      mustBeGraduating: true,
      additionalRequirements: [
        { description: 'Must be a Senior student expected to graduate at the end of 2nd semester', isRequired: true },
        { description: 'Must have carried a load of at least 15 units in the preceding semester', isRequired: true },
        { description: 'Parents annual gross income must not exceed ₱300,000', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: '2x2 Photo', description: 'One (1) recent 2x2 ID photo', isRequired: true },
      { name: 'Income Tax Return', description: 'Current ITR of parents; if exempt, attach BIR Certificate of Exemption; if unemployed, notarized affidavit of income', isRequired: true },
      { name: 'Current Form 5', description: 'Current semester enrollment form', isRequired: true },
      { name: 'True Copy of Grades', description: 'TCG from previous semester(s)', isRequired: true },
      { name: 'Certificate of Good Moral Character', description: 'From College or OSA', isRequired: true },
      { name: 'Birth Certificate', description: 'PSA-issued birth certificate', isRequired: true },
      { name: 'Recommendation Letters', description: 'Three (3) recommendation letters from previous professors', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['senior', 'graduating', 'up-system', 'need-based', 'csfa']
  },

  // 2. Phildev Science & Engineering Scholarship Grants
  {
    name: 'Philippine S&T Development Foundation-Manila, Inc. (Phildev) Science & Engineering Scholarship Grants',
    description: `The Phildev Science & Engineering Scholarship Grants support students pursuing Computer Science or Industrial Engineering at UPLB. This scholarship provides a monthly stipend and book/IT allowance to qualified students who demonstrate academic excellence and financial need. Applicants must be at least sophomores with a GWA of 1.75 or better and annual family income not exceeding ₱500,000.`,
    sponsor: 'Philippine S&T Development Foundation-Manila, Inc. (Phildev)',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 75000,
    awardDescription: '₱7,000/month stipend + ₱5,000 book/IT allowance per semester',
    eligibilityCriteria: {
      maxGWA: 1.75,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT],
      eligibleCourses: ['BS Computer Science', 'BS Industrial Engineering'],
      maxAnnualFamilyIncome: 500000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      additionalRequirements: [
        { description: 'Must be at least sophomore in standing', isRequired: true },
        { description: 'Must be enrolled in Computer Science or Industrial Engineering at UPLB', isRequired: true },
        { description: 'Must be in good mental, physical, and emotional health', isRequired: true },
        { description: 'Must be enrolled in at least 15 units or normal load of the course', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: '2x2 Photo', description: 'One (1) recent 2x2 ID photo', isRequired: true },
      { name: 'Income Tax Return', description: 'Current ITR of parents; if exempt, attach BIR Certificate of Exemption; if unemployed, notarized affidavit of income', isRequired: true },
      { name: 'Current Form 5', description: 'Current semester enrollment form (can be submitted later if unavailable)', isRequired: true },
      { name: 'True Copy of Grades', description: 'TCG from previous semester(s)', isRequired: true },
      { name: 'Certificate of Good Moral Character', description: 'From respective Office of College Secretary', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['phildev', 'science', 'engineering', 'computer science', 'industrial engineering', 'stipend', 'csfa']
  },

  // 3. UPAA of Wisconsin Scholarship - Systemwide
  {
    name: 'UPAA of Wisconsin Scholarship - Systemwide',
    description: `The UPAA of Wisconsin Scholarship provides financial assistance to senior students from any college of the UP System who are expected to graduate at the end of the 2nd semester. Applicants must have a GWA of 2.5 or better, carry at least 15 units, and demonstrate financial need with family gross income not exceeding ₱300,000.`,
    sponsor: 'UP Alumni Association of Wisconsin',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 30000,
    awardDescription: '₱30,000 financial assistance for graduating seniors',
    eligibilityCriteria: {
      maxGWA: 2.5,
      eligibleClassifications: [Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CAFS, UPLBCollege.CEM, UPLBCollege.CEAT, UPLBCollege.CFNR, UPLBCollege.CHE, UPLBCollege.CVM, UPLBCollege.CDC, UPLBCollege.CPAF, UPLBCollege.GS],
      maxAnnualFamilyIncome: 300000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true,
      mustNotHaveGradeOf4: true,
      mustNotHaveIncompleteGrade: true,
      mustBeGraduating: true,
      additionalRequirements: [
        { description: 'Must be a Senior student expected to graduate at the end of 2nd semester', isRequired: true },
        { description: 'Must have carried a load of at least 15 units in the preceding semester', isRequired: true },
        { description: 'Gross family income must not exceed ₱300,000', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: '2x2 Photo', description: 'One (1) recent 2x2 ID photo', isRequired: true },
      { name: 'Income Tax Return', description: 'Current ITR of parents; if exempt, attach BIR Certificate of Exemption; if unemployed, notarized affidavit of income', isRequired: true },
      { name: 'Current Form 5', description: 'Current semester enrollment form (can be submitted later if unavailable)', isRequired: true },
      { name: 'True Copy of Grades', description: 'TCG from previous semester(s)', isRequired: true },
      { name: 'Certificate of Good Moral Character', description: 'From College', isRequired: true },
      { name: 'Birth Certificate', description: 'PSA-issued birth certificate', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 3,
    status: ScholarshipStatus.ACTIVE,
    tags: ['upaa', 'wisconsin', 'senior', 'graduating', 'up-system', 'need-based', 'csfa']
  }
];

async function addNewScholarships() {
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
    
    // Show total scholarships in DB
    const total = await Scholarship.countDocuments();
    console.log(`Total scholarships in database: ${total}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addNewScholarships();
