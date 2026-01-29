// =============================================================================
// ISKOlarship - Realistic Scholarship Seed Data
// Well-known Philippine companies and organizations with proper scoping
// Based on actual scholarship programs in the Philippines
// =============================================================================

const { ScholarshipType, ScholarshipStatus, ScholarshipLevel } = require('../models/Scholarship.model');
const { UPLBCollege, Classification, Citizenship, STBracket } = require('../models/User.model');

// =============================================================================
// Helper Functions
// =============================================================================

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

// Standard required documents for most scholarships
const standardDocuments = [
  { name: 'Transcript of Records (TOR)', description: 'Official transcript with registrar seal', isRequired: true },
  { name: 'Certificate of Registration', description: 'Current semester enrollment proof', isRequired: true },
  { name: 'Personal Statement/Essay', description: 'Statement of purpose or motivation', isRequired: true },
  { name: 'Valid ID', description: 'Government-issued identification', isRequired: true },
  { name: '2x2 Photo', description: 'Recent ID photo', isRequired: true },
  { name: 'Income Tax Return (ITR)', description: 'Family income proof (if applicable)', isRequired: false },
  { name: 'Approved Thesis Outline', description: 'For thesis/research grant applicants', isRequired: false }
];

const financialAidDocuments = [
  { name: 'Transcript of Records (TOR)', description: 'Official transcript with registrar seal', isRequired: true },
  { name: 'Certificate of Registration', description: 'Current semester enrollment proof', isRequired: true },
  { name: 'Income Tax Return (ITR)', description: 'Latest ITR of parents/guardian', isRequired: true },
  { name: 'Certificate of Indigency', description: 'From barangay or DSWD', isRequired: true },
  { name: 'Sworn Statement of Family Income', description: 'Notarized statement', isRequired: true },
  { name: 'Valid ID', description: 'Government-issued identification', isRequired: true },
  { name: '2x2 Photo', description: 'Recent ID photo', isRequired: true }
];

const researchGrantDocuments = [
  { name: 'Transcript of Records (TOR)', description: 'Official transcript with registrar seal', isRequired: true },
  { name: 'Certificate of Registration', description: 'Current semester enrollment proof', isRequired: true },
  { name: 'Approved Thesis/Research Proposal', description: 'With adviser signature', isRequired: true },
  { name: 'Research Budget Proposal', description: 'Itemized research expenses', isRequired: true },
  { name: 'Faculty Adviser Endorsement Letter', description: 'From thesis adviser', isRequired: true },
  { name: 'Valid ID', description: 'Government-issued identification', isRequired: true }
];

// =============================================================================
// UNIVERSITY-LEVEL SCHOLARSHIPS (Private/Corporate - National)
// Managed by University admins, visible to all
// =============================================================================

const universityScholarships = [
  // =========================================================================
  // FOOD & BEVERAGE INDUSTRY
  // =========================================================================
  {
    name: 'Jollibee Group Foundation Scholarship',
    description: `The Jollibee Group Foundation Scholarship Program supports Filipino students pursuing courses in food science, hospitality management, and related fields. As one of the Philippines' largest food service companies, JGF is committed to developing future leaders in the food industry through comprehensive scholarship support including tuition assistance, internship opportunities, and potential employment pathways within the Jollibee Group of Companies.`,
    sponsor: 'Jollibee Group Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 45000,
    awardDescription: '₱45,000 + internship + employment priority',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CHE, UPLBCollege.CAFS, UPLBCollege.CEM],
      eligibleCourses: ['BS Food Technology', 'BS Nutrition', 'BS Food Science'],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(3),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 30,
    status: ScholarshipStatus.ACTIVE,
    tags: ['jollibee', 'food science', 'hospitality', 'corporate', 'internship']
  },
  {
    name: 'San Miguel Foundation Scholarship Program',
    description: `The San Miguel Foundation Scholarship Program provides comprehensive financial assistance to deserving Filipino students pursuing degrees in engineering, food technology, business, and agriculture. As one of the largest conglomerates in the Philippines, San Miguel Corporation is committed to developing human capital that will contribute to national development and industry growth.`,
    sponsor: 'San Miguel Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 80000,
    awardDescription: 'Full tuition + ₱5,000 monthly stipend',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CEAT, UPLBCollege.CAFS, UPLBCollege.CEM, UPLBCollege.CHE],
      maxAnnualFamilyIncome: 350000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: financialAidDocuments,
    applicationDeadline: createDeadline(4),
    applicationStartDate: createStartDate(45),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 25,
    status: ScholarshipStatus.ACTIVE,
    tags: ['san miguel', 'engineering', 'food technology', 'business', 'corporate']
  },
  {
    name: 'Monde Nissin Foundation Academic Excellence Award',
    description: `The Monde Nissin Foundation Academic Excellence Award recognizes and supports outstanding Filipino students in food science, food technology, and related agricultural courses. This scholarship aims to cultivate future food scientists and technologists who will contribute to food security and innovation in the Philippines.`,
    sponsor: 'Monde Nissin Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 50000,
    awardDescription: '₱50,000 per academic year + summer internship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.75,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAFS, UPLBCollege.CHE],
      eligibleCourses: ['BS Food Technology', 'BS Food Science', 'BS Agricultural Chemistry'],
      maxAnnualFamilyIncome: 500000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(15),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['monde nissin', 'food science', 'food technology', 'merit', 'corporate']
  },

  // =========================================================================
  // TELECOMMUNICATIONS & TECHNOLOGY
  // =========================================================================
  {
    name: 'Globe Bridging Communities Scholarship',
    description: `The Globe Bridging Communities Scholarship supports Filipino students pursuing degrees in computer science, information technology, engineering, and telecommunications. Globe Telecom is committed to bridging the digital divide by investing in the education of future technology leaders who will drive innovation and connectivity across the Philippines.`,
    sponsor: 'Globe Telecom Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 75000,
    awardDescription: '₱75,000 per year + Globe internship + mentorship program',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT],
      eligibleCourses: ['BS Computer Science', 'BS Computer Engineering', 'BS Electrical Engineering'],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(3),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 20,
    status: ScholarshipStatus.ACTIVE,
    tags: ['globe', 'technology', 'computer science', 'telecommunications', 'internship']
  },
  {
    name: 'PLDT-Smart Foundation Tech Scholars Program',
    description: `The PLDT-Smart Foundation Tech Scholars Program provides comprehensive support to academically excellent and financially deserving students pursuing courses in information technology, computer science, and engineering. This program aims to develop the next generation of Filipino tech innovators who will lead the country's digital transformation.`,
    sponsor: 'PLDT-Smart Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 100000,
    awardDescription: 'Full tuition + ₱7,000 monthly allowance + laptop',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.75,
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT],
      eligibleCourses: ['BS Computer Science', 'BS Computer Engineering', 'BS Electrical Engineering', 'BS Applied Mathematics'],
      maxAnnualFamilyIncome: 300000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: financialAidDocuments,
    applicationDeadline: createDeadline(4),
    applicationStartDate: createStartDate(60),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['pldt', 'smart', 'technology', 'it', 'engineering', 'merit']
  },

  // =========================================================================
  // RETAIL & REAL ESTATE
  // =========================================================================
  {
    name: 'SM Foundation College Scholarship Program',
    description: `The SM Foundation College Scholarship Program is a comprehensive educational assistance program for academically qualified but financially challenged Filipino students. The scholarship covers tuition, books, uniform, and provides a monthly allowance. SM Foundation is committed to providing equal opportunities for deserving students to pursue higher education.`,
    sponsor: 'SM Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 120000,
    awardDescription: 'Full tuition + books + ₱5,000 monthly allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: Object.values(UPLBCollege),
      maxAnnualFamilyIncome: 180000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: financialAidDocuments,
    applicationDeadline: createDeadline(5),
    applicationStartDate: createStartDate(90),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 50,
    status: ScholarshipStatus.ACTIVE,
    tags: ['sm foundation', 'financial aid', 'comprehensive', 'stipend']
  },
  {
    name: 'Ayala Foundation Scholarship for Excellence',
    description: `The Ayala Foundation Scholarship for Excellence supports exceptional Filipino students pursuing degrees in fields aligned with sustainable development, technology, and business. Ayala Foundation is committed to nation-building through education, and this scholarship aims to develop future leaders who will contribute to the country's progress.`,
    sponsor: 'Ayala Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 150000,
    awardDescription: '₱150,000 per year + mentorship + internship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.5,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT, UPLBCollege.CEM, UPLBCollege.CFNR],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true,
      mustNotHaveGradeOf4: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(3),
    applicationStartDate: createStartDate(45),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 20,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ayala', 'excellence', 'merit', 'leadership', 'sustainable development']
  },

  // =========================================================================
  // BANKING & FINANCE
  // =========================================================================
  {
    name: 'BDO Foundation Educational Assistance Grant',
    description: `The BDO Foundation Educational Assistance Grant provides financial support to deserving Filipino students pursuing degrees in business, economics, and finance. BDO is committed to financial literacy and developing the next generation of Filipino business leaders and financial professionals.`,
    sponsor: 'BDO Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 60000,
    awardDescription: '₱60,000 per academic year',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CEM],
      eligibleCourses: ['BS Economics', 'BS Accountancy', 'BS Agribusiness Management', 'BS Agricultural Economics'],
      maxAnnualFamilyIncome: 350000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['bdo', 'banking', 'business', 'economics', 'finance']
  },
  {
    name: 'Metrobank Foundation Search for Outstanding Filipinos Scholarship',
    description: `The Metrobank Foundation Search for Outstanding Filipinos Scholarship recognizes and supports Filipino students who demonstrate exceptional academic achievement and leadership potential. This prestigious scholarship aims to cultivate the country's future leaders in various fields.`,
    sponsor: 'Metrobank Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 100000,
    awardDescription: '₱100,000 + recognition + networking opportunities',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.5,
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: Object.values(UPLBCollege),
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true,
      additionalRequirements: [
        { description: 'Must have demonstrated leadership in student organizations', isRequired: true }
      ]
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(4),
    applicationStartDate: createStartDate(60),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['metrobank', 'outstanding', 'leadership', 'merit', 'prestigious']
  },

  // =========================================================================
  // ENERGY & UTILITIES
  // =========================================================================
  {
    name: 'Meralco Foundation Engineering Scholarship',
    description: `The Meralco Foundation Engineering Scholarship supports Filipino students pursuing electrical engineering and related fields. As the country's largest electric distribution utility, Meralco is committed to developing future engineers who will power the nation's growth and contribute to sustainable energy solutions.`,
    sponsor: 'Meralco Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 70000,
    awardDescription: '₱70,000 per year + internship at Meralco',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 18,
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleCourses: ['BS Electrical Engineering', 'BS Mechanical Engineering'],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(3),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 12,
    status: ScholarshipStatus.ACTIVE,
    tags: ['meralco', 'engineering', 'electrical', 'energy', 'internship']
  },
  {
    name: 'Shell Philippines Foundation Technical Scholarship',
    description: `The Shell Philippines Foundation Technical Scholarship provides comprehensive support to Filipino students pursuing careers in energy, engineering, and environmental sciences. Shell is committed to developing human talent that will drive innovation in the energy sector and contribute to sustainable development.`,
    sponsor: 'Shell Philippines Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 90000,
    awardDescription: '₱90,000 per year + Shell internship + career development',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.75,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CEAT, UPLBCollege.CAS],
      eligibleCourses: ['BS Chemical Engineering', 'BS Mechanical Engineering', 'BS Chemistry'],
      maxAnnualFamilyIncome: 350000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(3),
    applicationStartDate: createStartDate(45),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['shell', 'energy', 'engineering', 'chemistry', 'internship']
  },

  // =========================================================================
  // AGRICULTURE & AGRIBUSINESS
  // =========================================================================
  {
    name: 'East-West Seed Foundation Agricultural Scholarship',
    description: `The East-West Seed Foundation Agricultural Scholarship supports Filipino students pursuing degrees in agriculture, horticulture, and crop science. As a leading vegetable seed company in the Philippines, East-West Seed is committed to developing future agricultural scientists and farm leaders who will contribute to food security.`,
    sponsor: 'East-West Seed Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 40000,
    awardDescription: '₱40,000 per year + farm immersion program',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAFS],
      eligibleCourses: ['BS Agriculture', 'BS Agricultural Biotechnology'],
      eligibleMajors: ['Crop Science', 'Horticulture', 'Plant Pathology'],
      maxAnnualFamilyIncome: 300000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 20,
    status: ScholarshipStatus.ACTIVE,
    tags: ['east-west seed', 'agriculture', 'crop science', 'horticulture', 'farm']
  },
  {
    name: 'Pilmico Foods Corporation Agricultural Leaders Scholarship',
    description: `The Pilmico Foods Corporation Agricultural Leaders Scholarship supports Filipino students pursuing animal science, veterinary medicine, and agricultural courses. Pilmico is committed to developing future leaders in the Philippine agribusiness sector who will contribute to sustainable livestock and poultry production.`,
    sponsor: 'Pilmico Foods Corporation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 55000,
    awardDescription: '₱55,000 per year + OJT at Pilmico facilities',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAFS, UPLBCollege.CVM],
      eligibleCourses: ['BS Agriculture', 'Doctor of Veterinary Medicine'],
      eligibleMajors: ['Animal Science'],
      maxAnnualFamilyIncome: 350000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(3),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['pilmico', 'animal science', 'veterinary', 'agriculture', 'livestock']
  },

  // =========================================================================
  // GOVERNMENT SCHOLARSHIPS
  // =========================================================================
  {
    name: 'DOST-SEI Undergraduate Science Scholarship',
    description: `The Department of Science and Technology - Science Education Institute (DOST-SEI) Undergraduate Scholarship provides comprehensive support to Filipino students pursuing priority courses in science, mathematics, engineering, and technology. This national scholarship aims to develop the country's pool of scientists, engineers, and technologists.`,
    sponsor: 'Department of Science and Technology - SEI',
    type: ScholarshipType.GOVERNMENT,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 96000,
    awardDescription: 'Full tuition + ₱8,000 monthly stipend + book allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT, UPLBCollege.CAFS],
      eligibleCourses: ['BS Computer Science', 'BS Mathematics', 'BS Applied Mathematics', 'BS Statistics', 'BS Chemistry', 'BS Applied Physics', 'BS Biology', 'BS Chemical Engineering', 'BS Civil Engineering', 'BS Electrical Engineering', 'BS Mechanical Engineering', 'BS Food Technology'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: financialAidDocuments,
    applicationDeadline: createDeadline(4),
    applicationStartDate: createStartDate(60),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 100,
    status: ScholarshipStatus.ACTIVE,
    tags: ['dost', 'government', 'science', 'engineering', 'technology', 'national']
  },
  {
    name: 'CHED Tulong Dunong Financial Assistance Program',
    description: `The Commission on Higher Education (CHED) Tulong Dunong Program provides financial assistance to deserving Filipino students enrolled in priority courses. This program aims to democratize access to quality higher education by supporting students from low-income families.`,
    sponsor: 'Commission on Higher Education',
    type: ScholarshipType.GOVERNMENT,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 60000,
    awardDescription: '₱60,000 financial assistance per year',
    eligibilityCriteria: {
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: Object.values(UPLBCollege),
      maxAnnualFamilyIncome: 250000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true
    },
    requiredDocuments: financialAidDocuments,
    applicationDeadline: createDeadline(5),
    applicationStartDate: createStartDate(90),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 200,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ched', 'government', 'financial aid', 'tulong dunong']
  },
  {
    name: 'UPLB University Scholarship Program (USP)',
    description: `The UPLB University Scholarship Program is the flagship merit-based scholarship for UPLB students demonstrating exceptional academic performance. University Scholars receive tuition exemption and other privileges including priority in enrollment and access to university resources.`,
    sponsor: 'University of the Philippines Los Baños',
    type: ScholarshipType.UNIVERSITY,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 50000,
    awardDescription: 'Full tuition exemption + University Scholar status',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.45,
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      minUnitsPassed: 15,
      eligibleColleges: Object.values(UPLBCollege),
      eligibleCitizenship: [Citizenship.FILIPINO, Citizenship.DUAL_CITIZEN],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true,
      mustNotHaveGradeOf4: true,
      mustNotHaveIncompleteGrade: true
    },
    requiredDocuments: [
      { name: 'Transcript of Records (TOR)', description: 'Official TOR with GWA computation', isRequired: true },
      { name: 'Certificate of Registration', description: 'Current semester enrollment', isRequired: true },
      { name: 'Certificate of Good Moral Character', description: 'From OSA', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(15),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 150,
    status: ScholarshipStatus.ACTIVE,
    tags: ['uplb', 'university', 'merit', 'honors', 'academic excellence']
  }
];

// =============================================================================
// COLLEGE-LEVEL SCHOLARSHIPS
// Managed by College admins, each tagged to specific college
// =============================================================================

const collegeScholarships = [
  // =========================================================================
  // CAS - College of Arts and Sciences
  // =========================================================================
  {
    name: 'CAS Dean\'s Merit Scholarship',
    description: `The College of Arts and Sciences Dean's Merit Scholarship recognizes outstanding CAS students who demonstrate exceptional academic performance in mathematics, sciences, and humanities. This scholarship supports the college's mission of nurturing well-rounded scholars and future leaders.`,
    sponsor: 'College of Arts and Sciences - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: null,
    totalGrant: 35000,
    awardDescription: '₱35,000 per semester + Dean\'s Citation',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.75,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 20,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cas', 'dean', 'merit', 'academic excellence']
  },
  {
    name: 'CAS Alumni Association Financial Aid',
    description: `The CAS Alumni Association Financial Aid provides assistance to financially deserving CAS students who maintain good academic standing. This fund ensures that no CAS student is left behind due to financial constraints.`,
    sponsor: 'CAS Alumni Association',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: null,
    totalGrant: 20000,
    awardDescription: '₱20,000 one-time financial aid',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleColleges: [UPLBCollege.CAS],
      maxAnnualFamilyIncome: 200000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: financialAidDocuments,
    applicationDeadline: createDeadline(1),
    applicationStartDate: createStartDate(15),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 30,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cas', 'alumni', 'financial aid']
  },

  // =========================================================================
  // CEAT - College of Engineering and Agro-Industrial Technology
  // =========================================================================
  {
    name: 'CEAT Engineering Excellence Award',
    description: `The College of Engineering and Agro-Industrial Technology Engineering Excellence Award recognizes outstanding engineering students who demonstrate technical excellence and innovation. Recipients are expected to represent CEAT in engineering competitions and contribute to the college community.`,
    sponsor: 'College of Engineering and Agro-Industrial Technology - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CEAT',
    managingAcademicUnitCode: null,
    totalGrant: 45000,
    awardDescription: '₱45,000 per academic year + lab fee waiver',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.75,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 18,
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true,
      mustNotHaveGradeOf4: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ceat', 'engineering', 'excellence', 'technical']
  },
  {
    name: 'CEAT Women in Engineering Scholarship',
    description: `The CEAT Women in Engineering Scholarship encourages and supports female students pursuing engineering degrees. This scholarship aims to promote gender diversity in engineering fields and develop future women leaders in the Philippine engineering profession.`,
    sponsor: 'CEAT Women in Engineering Alliance',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CEAT',
    managingAcademicUnitCode: null,
    totalGrant: 40000,
    awardDescription: '₱40,000 per year + mentorship program',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      additionalRequirements: [
        { description: 'Must be a female student', isRequired: true }
      ]
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(3),
    applicationStartDate: createStartDate(45),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ceat', 'women', 'engineering', 'diversity', 'gender']
  },

  // =========================================================================
  // CAFS - College of Agriculture and Food Science
  // =========================================================================
  {
    name: 'CAFS Future Farmers Scholarship',
    description: `The College of Agriculture and Food Science Future Farmers Scholarship supports students committed to careers in agriculture and food production. This scholarship develops future agricultural leaders who will contribute to Philippine food security and rural development.`,
    sponsor: 'College of Agriculture and Food Science - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CAFS',
    managingAcademicUnitCode: null,
    totalGrant: 30000,
    awardDescription: '₱30,000 per year + farm practicum support',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAFS],
      maxAnnualFamilyIncome: 300000,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 25,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cafs', 'agriculture', 'farming', 'food security']
  },
  {
    name: 'CAFS Agricultural Research Excellence Grant',
    description: `The CAFS Agricultural Research Excellence Grant supports senior students conducting thesis research in agricultural sciences, food science, or related fields. This grant covers research materials, field work, and laboratory expenses.`,
    sponsor: 'CAFS Research Foundation',
    type: ScholarshipType.THESIS_GRANT,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CAFS',
    managingAcademicUnitCode: null,
    totalGrant: 25000,
    awardDescription: '₱25,000 research grant',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.SENIOR],
      eligibleColleges: [UPLBCollege.CAFS],
      eligibleCitizenship: [Citizenship.FILIPINO],
      requiresApprovedThesisOutline: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: researchGrantDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cafs', 'research', 'thesis', 'agriculture']
  },

  // =========================================================================
  // CEM - College of Economics and Management
  // =========================================================================
  {
    name: 'CEM Business Leaders Scholarship',
    description: `The College of Economics and Management Business Leaders Scholarship recognizes students who demonstrate academic excellence and leadership potential in business and economics. Recipients are expected to actively participate in CEM activities and represent the college in academic competitions.`,
    sponsor: 'College of Economics and Management - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CEM',
    managingAcademicUnitCode: null,
    totalGrant: 40000,
    awardDescription: '₱40,000 per year + business case competition sponsorship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.75,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CEM],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cem', 'business', 'economics', 'leadership']
  },
  {
    name: 'CEM Entrepreneurship Development Grant',
    description: `The CEM Entrepreneurship Development Grant supports CEM students with viable business ideas or startups. This grant provides seed funding and mentorship to develop student entrepreneurs who will contribute to economic development.`,
    sponsor: 'CEM Entrepreneurship Council',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CEM',
    managingAcademicUnitCode: null,
    totalGrant: 50000,
    awardDescription: '₱50,000 seed fund + business mentorship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleColleges: [UPLBCollege.CEM],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      additionalRequirements: [
        { description: 'Must have a viable business plan or existing startup', isRequired: true }
      ]
    },
    requiredDocuments: [
      ...standardDocuments.slice(0, 4),
      { name: 'Business Plan', description: 'Detailed business proposal', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: createStartDate(45),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 8,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cem', 'entrepreneurship', 'startup', 'business']
  },

  // =========================================================================
  // CHE - College of Human Ecology
  // =========================================================================
  {
    name: 'CHE Nutrition and Wellness Scholarship',
    description: `The College of Human Ecology Nutrition and Wellness Scholarship supports students pursuing degrees in nutrition, food science, and human development. This scholarship develops future professionals who will contribute to improving Filipino health and well-being.`,
    sponsor: 'College of Human Ecology - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CHE',
    managingAcademicUnitCode: null,
    totalGrant: 30000,
    awardDescription: '₱30,000 per year + practicum support',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CHE],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['che', 'nutrition', 'wellness', 'health']
  },

  // =========================================================================
  // CFNR - College of Forestry and Natural Resources
  // =========================================================================
  {
    name: 'CFNR Environmental Conservation Scholarship',
    description: `The College of Forestry and Natural Resources Environmental Conservation Scholarship supports students committed to environmental protection and sustainable natural resource management. This scholarship develops future environmental stewards and forest managers.`,
    sponsor: 'College of Forestry and Natural Resources - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CFNR',
    managingAcademicUnitCode: null,
    totalGrant: 35000,
    awardDescription: '₱35,000 per year + field work support',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CFNR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 12,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cfnr', 'forestry', 'environment', 'conservation']
  },

  // =========================================================================
  // CVM - College of Veterinary Medicine
  // =========================================================================
  {
    name: 'CVM Veterinary Excellence Award',
    description: `The College of Veterinary Medicine Veterinary Excellence Award recognizes outstanding veterinary medicine students who demonstrate exceptional academic performance and dedication to animal health and welfare.`,
    sponsor: 'College of Veterinary Medicine - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CVM',
    managingAcademicUnitCode: null,
    totalGrant: 50000,
    awardDescription: '₱50,000 per year + clinical rotation support',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 18,
      eligibleColleges: [UPLBCollege.CVM],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cvm', 'veterinary', 'animal health', 'excellence']
  },

  // =========================================================================
  // CDC - College of Development Communication
  // =========================================================================
  {
    name: 'CDC Communication Arts Scholarship',
    description: `The College of Development Communication Communication Arts Scholarship supports students pursuing degrees in development communication and related fields. This scholarship develops future communication professionals who will contribute to social change and development.`,
    sponsor: 'College of Development Communication - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CDC',
    managingAcademicUnitCode: null,
    totalGrant: 30000,
    awardDescription: '₱30,000 per year + production support',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CDC],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cdc', 'communication', 'media', 'development']
  }
];

// =============================================================================
// ACADEMIC UNIT-LEVEL SCHOLARSHIPS
// Managed by Academic Unit (Department/Institute) admins
// =============================================================================

const academicUnitScholarships = [
  // =========================================================================
  // ICS - Institute of Computer Science (under CAS)
  // =========================================================================
  {
    name: 'ICS Programming Excellence Award',
    description: `The Institute of Computer Science Programming Excellence Award recognizes outstanding programmers and software developers among ICS students. This scholarship supports students who excel in competitive programming, software development, and computer science research.`,
    sponsor: 'Institute of Computer Science - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'ICS',
    totalGrant: 25000,
    awardDescription: '₱25,000 per semester + programming competition support',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Computer Science'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: [
      ...standardDocuments.slice(0, 5),
      { name: 'Programming Portfolio', description: 'GitHub/GitLab profile or project samples', isRequired: true },
      { name: 'Competition Certificates', description: 'Programming competition certificates (if any)', isRequired: false }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 8,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ics', 'computer science', 'programming', 'software']
  },
  {
    name: 'ICS Artificial Intelligence Research Grant',
    description: `The ICS Artificial Intelligence Research Grant supports computer science students conducting thesis research in artificial intelligence, machine learning, data science, or related fields. This grant covers computational resources, datasets, and research materials.`,
    sponsor: 'ICS AI and Data Science Laboratory',
    type: ScholarshipType.THESIS_GRANT,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'ICS',
    totalGrant: 30000,
    awardDescription: '₱30,000 research grant + cloud computing credits',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: [Classification.SENIOR],
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Computer Science'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      requiresApprovedThesisOutline: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: researchGrantDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 6,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ics', 'ai', 'machine learning', 'research', 'thesis']
  },

  // =========================================================================
  // IMSP - Institute of Mathematical Sciences and Physics (under CAS)
  // =========================================================================
  {
    name: 'IMSP Mathematics Olympiad Scholarship',
    description: `The Institute of Mathematical Sciences and Physics Mathematics Olympiad Scholarship recognizes students who have excelled in mathematics competitions. This scholarship supports future mathematicians and scientists who demonstrate exceptional problem-solving abilities.`,
    sponsor: 'IMSP Mathematical Society',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'IMSP',
    totalGrant: 25000,
    awardDescription: '₱25,000 per semester + competition fee coverage',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Mathematics', 'BS Applied Mathematics', 'BS Statistics'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: [
      ...standardDocuments.slice(0, 5),
      { name: 'Math Competition Certificates', description: 'Awards from math olympiads/competitions', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['imsp', 'mathematics', 'olympiad', 'competition']
  },
  {
    name: 'IMSP Physics Research Grant',
    description: `The IMSP Physics Research Grant supports physics students conducting experimental or theoretical research. This grant covers laboratory equipment, materials, and research-related expenses for thesis projects in physics.`,
    sponsor: 'Philippine Physics Society - UPLB Chapter',
    type: ScholarshipType.THESIS_GRANT,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'IMSP',
    totalGrant: 35000,
    awardDescription: '₱35,000 research grant + lab equipment access',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.SENIOR],
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Applied Physics'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      requiresApprovedThesisOutline: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: researchGrantDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 4,
    status: ScholarshipStatus.ACTIVE,
    tags: ['imsp', 'physics', 'research', 'thesis']
  },

  // =========================================================================
  // IC - Institute of Chemistry (under CAS)
  // =========================================================================
  {
    name: 'IC Chemical Sciences Excellence Award',
    description: `The Institute of Chemistry Chemical Sciences Excellence Award recognizes outstanding chemistry students who demonstrate exceptional laboratory skills and research potential. This scholarship supports future chemists and chemical scientists.`,
    sponsor: 'Institute of Chemistry - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'IC',
    totalGrant: 25000,
    awardDescription: '₱25,000 per semester + lab supplies support',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Chemistry', 'BS Agricultural Chemistry'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 8,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ic', 'chemistry', 'laboratory', 'research']
  },

  // =========================================================================
  // IBS - Institute of Biological Sciences (under CAS)
  // =========================================================================
  {
    name: 'IBS Biodiversity Research Fellowship',
    description: `The Institute of Biological Sciences Biodiversity Research Fellowship supports biology students conducting research on Philippine biodiversity, ecology, or conservation biology. This fellowship covers field work, laboratory expenses, and research materials.`,
    sponsor: 'Biodiversity Conservation Society - UPLB',
    type: ScholarshipType.THESIS_GRANT,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'IBS',
    totalGrant: 40000,
    awardDescription: '₱40,000 research fellowship + field equipment',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Biology'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      requiresApprovedThesisOutline: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: researchGrantDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ibs', 'biology', 'biodiversity', 'ecology', 'conservation']
  },

  // =========================================================================
  // DCHE - Department of Chemical Engineering (under CEAT)
  // =========================================================================
  {
    name: 'DCHE Process Engineering Innovation Award',
    description: `The Department of Chemical Engineering Process Engineering Innovation Award recognizes chemical engineering students who demonstrate innovation in process design and optimization. This award supports future process engineers who will contribute to sustainable chemical manufacturing.`,
    sponsor: 'Philippine Institute of Chemical Engineers - UPLB Student Chapter',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CEAT',
    managingAcademicUnitCode: 'DCHE',
    totalGrant: 30000,
    awardDescription: '₱30,000 per year + plant tour sponsorship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 18,
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleCourses: ['BS Chemical Engineering'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 6,
    status: ScholarshipStatus.ACTIVE,
    tags: ['dche', 'chemical engineering', 'process', 'innovation']
  },

  // =========================================================================
  // DCE - Department of Civil Engineering (under CEAT)
  // =========================================================================
  {
    name: 'DCE Structural Engineering Excellence Scholarship',
    description: `The Department of Civil Engineering Structural Engineering Excellence Scholarship supports civil engineering students excelling in structural analysis and design. This scholarship develops future structural engineers who will build safe and resilient infrastructure.`,
    sponsor: 'Philippine Institute of Civil Engineers - UPLB Student Chapter',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CEAT',
    managingAcademicUnitCode: 'DCE',
    totalGrant: 28000,
    awardDescription: '₱28,000 per year + PICE convention sponsorship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 18,
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleCourses: ['BS Civil Engineering'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 6,
    status: ScholarshipStatus.ACTIVE,
    tags: ['dce', 'civil engineering', 'structural', 'infrastructure']
  },

  // =========================================================================
  // DEE - Department of Electrical Engineering (under CEAT)
  // =========================================================================
  {
    name: 'DEE Power Systems Engineering Scholarship',
    description: `The Department of Electrical Engineering Power Systems Engineering Scholarship supports electrical engineering students interested in power systems, renewable energy, and electrical infrastructure. This scholarship develops future power engineers who will contribute to the country's energy security.`,
    sponsor: 'Institute of Integrated Electrical Engineers - UPLB Chapter',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CEAT',
    managingAcademicUnitCode: 'DEE',
    totalGrant: 30000,
    awardDescription: '₱30,000 per year + IIEE convention sponsorship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 18,
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleCourses: ['BS Electrical Engineering'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    requiredDocuments: standardDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['dee', 'electrical engineering', 'power systems', 'energy']
  },

  // =========================================================================
  // DAE - Department of Agricultural and Applied Economics (under CEM)
  // =========================================================================
  {
    name: 'DAE Agricultural Economics Research Grant',
    description: `The Department of Agricultural and Applied Economics Research Grant supports students conducting thesis research on agricultural markets, rural development, food policy, or agribusiness. This grant covers field research, surveys, and data collection expenses.`,
    sponsor: 'Philippine Agricultural Economics and Development Association - UPLB',
    type: ScholarshipType.THESIS_GRANT,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CEM',
    managingAcademicUnitCode: 'DAE',
    totalGrant: 25000,
    awardDescription: '₱25,000 research grant + PAEDA conference sponsorship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: [Classification.SENIOR],
      eligibleColleges: [UPLBCollege.CEM],
      eligibleCourses: ['BS Agricultural Economics', 'BS Economics'],
      eligibleCitizenship: [Citizenship.FILIPINO],
      requiresApprovedThesisOutline: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: researchGrantDocuments,
    applicationDeadline: createDeadline(2),
    applicationStartDate: createStartDate(30),
    academicYear: '2026-2027',
    semester: 'First',
    slots: 8,
    status: ScholarshipStatus.ACTIVE,
    tags: ['dae', 'agricultural economics', 'research', 'thesis', 'rural development']
  }
];

// =============================================================================
// EXPORT ALL SCHOLARSHIPS
// =============================================================================

const realisticScholarshipsData = [
  ...universityScholarships,
  ...collegeScholarships,
  ...academicUnitScholarships
];

module.exports = {
  realisticScholarshipsData,
  universityScholarships,
  collegeScholarships,
  academicUnitScholarships,
  standardDocuments,
  financialAidDocuments,
  researchGrantDocuments
};
