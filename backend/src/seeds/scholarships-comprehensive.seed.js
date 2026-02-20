/**
 * =============================================================================
 * ISKOlarship - Comprehensive Scholarships Seed Data
 * =============================================================================
 * 
 * 50 Realistic UPLB Scholarships with varied criteria to ensure
 * different student profiles can match different scholarships.
 * 
 * Criteria Types:
 * - RANGE: minGWA, maxGWA, minAnnualFamilyIncome, maxAnnualFamilyIncome, 
 *          minUnitsEnrolled, minUnitsPassed, minHouseholdSize, maxHouseholdSize
 * - LIST: eligibleClassifications, eligibleColleges, eligibleCourses, 
 *         eligibleMajors, eligibleSTBrackets, eligibleProvinces, eligibleCitizenship
 * - BOOLEAN: requiresApprovedThesisOutline, mustNotHaveOtherScholarship,
 *            mustNotHaveThesisGrant, mustNotHaveDisciplinaryAction,
 *            mustNotHaveFailingGrade, mustNotHaveGradeOf4,
 *            mustNotHaveIncompleteGrade, mustBeGraduating
 * 
 * =============================================================================
 */

const mongoose = require('mongoose');

// Valid Scholarship Types from Scholarship.model.js
const SCHOLARSHIP_TYPES = {
  UNIVERSITY: 'University Scholarship',
  COLLEGE: 'College Scholarship',
  GOVERNMENT: 'Government Scholarship',
  PRIVATE: 'Private Scholarship',
  THESIS_GRANT: 'Thesis/Research Grant'
};

// UPLB Colleges
const COLLEGES = {
  CAS: 'College of Arts and Sciences',
  CAFS: 'College of Agriculture and Food Science',
  CEM: 'College of Economics and Management',
  CEAT: 'College of Engineering and Agro-Industrial Technology',
  CFNR: 'College of Forestry and Natural Resources',
  CHE: 'College of Human Ecology',
  CVM: 'College of Veterinary Medicine',
  CDC: 'College of Development Communication',
  CPAF: 'College of Public Affairs and Development',
  GS: 'Graduate School'
};

const ALL_COLLEGES = Object.values(COLLEGES);

// Year Levels
const YEAR_LEVELS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

// ST Brackets
const ST_BRACKETS = {
  FDS: 'Full Discount with Stipend',
  FD: 'Full Discount',
  PD80: 'PD80',
  PD60: 'PD60',
  PD40: 'PD40',
  PD20: 'PD20',
  ND: 'No Discount'
};

// Philippine Regions for province-based scholarships
const LUZON_PROVINCES = ['Batangas', 'Laguna', 'Cavite', 'Rizal', 'Quezon', 'Bulacan', 'Pampanga', 'Tarlac', 'Pangasinan', 'La Union', 'Ilocos Norte', 'Ilocos Sur', 'Cagayan', 'Isabela', 'Nueva Ecija', 'Aurora', 'Zambales', 'Bataan'];
const VISAYAS_PROVINCES = ['Cebu', 'Bohol', 'Leyte', 'Samar', 'Negros Occidental', 'Negros Oriental', 'Iloilo', 'Capiz', 'Aklan', 'Antique', 'Guimaras'];
const MINDANAO_PROVINCES = ['Davao del Sur', 'Davao del Norte', 'South Cotabato', 'North Cotabato', 'Bukidnon', 'Misamis Oriental', 'Misamis Occidental', 'Zamboanga del Sur', 'Zamboanga del Norte', 'Lanao del Norte', 'Lanao del Sur', 'Sultan Kudarat', 'Maguindanao'];

// Standard required documents
const STANDARD_DOCUMENTS = [
  { name: 'Transcript of Records (TOR)', description: 'Official transcript with registrar seal', isRequired: true },
  { name: 'Certificate of Registration', description: 'Current semester enrollment proof', isRequired: true },
  { name: 'Personal Statement/Essay', description: 'Statement of purpose or motivation', isRequired: true },
  { name: 'Valid ID', description: 'Government-issued identification', isRequired: true },
  { name: '2x2 Photo', description: 'Recent ID photo', isRequired: true },
  { name: 'Income Tax Return (ITR)', description: 'Family income proof (if applicable)', isRequired: false },
  { name: 'Approved Thesis Outline', description: 'For thesis/research grant applicants', isRequired: false }
];

// Helper to get future deadline
const futureDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

// Helper to get start date (before deadline)
const startDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

/**
 * Generate 50 realistic scholarships
 */
const scholarships = [
  // ===========================================================================
  // CATEGORY 1: OPEN TO ALL (Minimal restrictions)
  // ===========================================================================
  {
    name: 'UPLB General Academic Excellence Award',
    description: 'Recognition for outstanding academic performance across all colleges. Open to all undergraduate students maintaining excellent grades.',
    sponsor: 'University of the Philippines Los Baños',
    type: 'University Scholarship',
    totalGrant: 30000,
    awardDescription: 'Full tuition + ₱30,000 stipend per semester',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.75,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleCourses: [],
      eligibleMajors: [],
      eligibleSTBrackets: [],
      eligibleProvinces: [],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: false,
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    slots: 50,
    applicationDeadline: futureDate(60),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'UPLB Student Financial Assistance Program (STFAP)',
    description: 'Financial assistance for students with demonstrated financial need. Priority given to students from low-income families.',
    sponsor: 'University of the Philippines Los Baños',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 25000,
    awardDescription: 'Tuition subsidy + ₱10,000 living allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 3.0,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 400000,
      eligibleSTBrackets: [ST_BRACKETS.FDS, ST_BRACKETS.FD, ST_BRACKETS.PD80, ST_BRACKETS.PD60],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: false
    },
    slots: 200,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-5),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'UPLB Book Allowance Grant',
    description: 'Support for purchasing academic materials and textbooks. Open to all students in good academic standing.',
    sponsor: 'UPLB Office of Student Affairs',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 5000,
    awardDescription: '₱5,000 book allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 3.5,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 500000,
      eligibleCitizenship: ['Filipino']
    },
    slots: 500,
    applicationDeadline: futureDate(30),
    applicationStartDate: startDate(-7),
    academicYear: '2026-2027',
    semester: 'First'
  },
  
  // ===========================================================================
  // CATEGORY 2: MERIT-BASED SCHOLARSHIPS
  // ===========================================================================
  {
    name: "Dean's List Honor Scholarship",
    description: 'Exclusive scholarship for students consistently on the Dean\'s List. Recognizes sustained academic excellence.',
    sponsor: 'UPLB Academic Council',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 40000,
    awardDescription: 'Full tuition + ₱40,000 annual stipend',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.45,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 18,
      eligibleColleges: ALL_COLLEGES,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true,
      mustNotHaveGradeOf4: true
    },
    slots: 25,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'DOST-SEI Merit Scholarship Program',
    description: 'Government scholarship for science and technology students. Full support from DOST-Science Education Institute.',
    sponsor: 'Department of Science and Technology',
    type: 'Government Scholarship',
    totalGrant: 60000,
    awardDescription: 'Full tuition + ₱7,000 monthly stipend + book allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CAS, COLLEGES.CEAT, COLLEGES.CAFS, COLLEGES.CHE],
      eligibleCourses: [
        'BS Biology', 'BS Chemistry', 'BS Mathematics', 'BS Physics',
        'BS Computer Science', 'BS Applied Mathematics',
        'BS Agricultural Chemistry', 'BS Food Technology',
        'BS Chemical Engineering', 'BS Civil Engineering',
        'BS Electrical Engineering', 'BS Agricultural Engineering',
        'BS Mechanical Engineering', 'BS Computer Engineering',
        'BS Industrial Engineering', 'BS Agricultural Biotechnology'
      ],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    slots: 100,
    applicationDeadline: futureDate(90),
    applicationStartDate: startDate(-30),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'SM Foundation College Scholarship',
    description: 'Full scholarship for academically excellent students from financially challenged families.',
    sponsor: 'SM Foundation, Inc.',
    type: 'Private Scholarship',
    totalGrant: 80000,
    awardDescription: 'Full tuition + monthly allowance + uniform + supplies',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 300000,
      eligibleSTBrackets: [ST_BRACKETS.FDS, ST_BRACKETS.FD, ST_BRACKETS.PD80],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    slots: 50,
    applicationDeadline: futureDate(75),
    applicationStartDate: startDate(-15),
    academicYear: '2026-2027',
    semester: 'First'
  },
  
  // ===========================================================================
  // CATEGORY 3: COLLEGE-SPECIFIC SCHOLARSHIPS
  // ===========================================================================
  {
    name: 'CAFS Agricultural Excellence Award',
    description: 'For outstanding students in agricultural sciences committed to Philippine agriculture development.',
    sponsor: 'College of Agriculture and Food Science Alumni Association',
    type: 'College Scholarship',
    totalGrant: 25000,
    awardDescription: '₱25,000 per semester',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CAFS],
      eligibleCourses: ['BS Agriculture', 'BS Agricultural Biotechnology', 'BS Agricultural Chemistry', 'BS Food Technology'],
      maxAnnualFamilyIncome: 500000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 20,
    applicationDeadline: futureDate(40),
    applicationStartDate: startDate(-5),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'CAS Science Achievers Grant',
    description: 'Supporting future scientists in the College of Arts and Sciences.',
    sponsor: 'CAS Dean\'s Office',
    type: 'College Scholarship',
    totalGrant: 20000,
    awardDescription: '₱20,000 research grant + lab supplies',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CAS],
      eligibleCourses: ['BS Biology', 'BS Chemistry', 'BS Mathematics', 'BS Physics', 'BS Computer Science', 'BS Statistics'],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveFailingGrade: true
    },
    slots: 30,
    applicationDeadline: futureDate(50),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'CEAT Engineering Scholarship',
    description: 'Supporting future engineers dedicated to nation-building.',
    sponsor: 'Philippine Society of Agricultural Engineers - UPLB Chapter',
    type: 'College Scholarship',
    totalGrant: 30000,
    awardDescription: '₱30,000 per semester + engineering tools allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CEAT],
      eligibleCourses: [
        'BS Agricultural Engineering', 'BS Civil Engineering',
        'BS Electrical Engineering', 'BS Chemical Engineering',
        'BS Industrial Engineering', 'BS Mechanical Engineering'
      ],
      maxAnnualFamilyIncome: 600000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      mustNotHaveFailingGrade: true
    },
    slots: 25,
    applicationDeadline: futureDate(55),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'CEM Business Leaders Scholarship',
    description: 'Developing future business leaders and economists for national development.',
    sponsor: 'CEM Alumni Foundation',
    type: 'College Scholarship',
    totalGrant: 25000,
    awardDescription: '₱25,000 + mentorship program',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CEM],
      eligibleCourses: ['BS Accountancy', 'BS Agribusiness Economics', 'BS Economics'],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    slots: 15,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-7),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'CHE Human Ecology Scholarship',
    description: 'For students dedicated to improving quality of life through human ecology.',
    sponsor: 'Human Ecology Institute of the Philippines',
    type: 'College Scholarship',
    totalGrant: 20000,
    awardDescription: '₱20,000 per semester',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: [COLLEGES.CHE],
      maxAnnualFamilyIncome: 350000,
      eligibleSTBrackets: [ST_BRACKETS.FDS, ST_BRACKETS.FD, ST_BRACKETS.PD80, ST_BRACKETS.PD60],
      eligibleCitizenship: ['Filipino']
    },
    slots: 30,
    applicationDeadline: futureDate(40),
    applicationStartDate: startDate(-5),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'CFNR Forestry Conservation Award',
    description: 'For students passionate about forest conservation and environmental protection.',
    sponsor: 'Philippine Forestry Association',
    type: 'College Scholarship',
    totalGrant: 22000,
    awardDescription: '₱22,000 + field work allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CFNR],
      eligibleCourses: ['BS Forestry', 'BS Environmental Science'],
      maxAnnualFamilyIncome: 450000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 20,
    applicationDeadline: futureDate(50),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'CVM Veterinary Medicine Excellence Award',
    description: 'Supporting future veterinarians committed to animal welfare and public health.',
    sponsor: 'Philippine Veterinary Medical Association',
    type: 'College Scholarship',
    totalGrant: 35000,
    awardDescription: '₱35,000 + clinical supplies allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 18,
      eligibleColleges: [COLLEGES.CVM],
      eligibleCourses: ['Doctor of Veterinary Medicine'],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      mustNotHaveFailingGrade: true
    },
    slots: 15,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'CDC Development Communication Scholarship',
    description: 'For future development communicators dedicated to social change.',
    sponsor: 'CDC Alumni Association',
    type: 'College Scholarship',
    totalGrant: 20000,
    awardDescription: '₱20,000 + equipment access',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CDC],
      eligibleCourses: ['BS Development Communication'],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: ['Filipino']
    },
    slots: 20,
    applicationDeadline: futureDate(40),
    applicationStartDate: startDate(-7),
    academicYear: '2026-2027',
    semester: 'First'
  },
  
  // ===========================================================================
  // CATEGORY 4: NEED-BASED SCHOLARSHIPS
  // ===========================================================================
  {
    name: 'Tulong Dunong Program',
    description: 'Government education subsidy for students from low-income families.',
    sponsor: 'Commission on Higher Education (CHED)',
    type: 'Government Scholarship',
    totalGrant: 20000,
    awardDescription: 'Full tuition + miscellaneous fees subsidy',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 3.0,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 250000,
      eligibleSTBrackets: [ST_BRACKETS.FDS, ST_BRACKETS.FD],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 100,
    applicationDeadline: futureDate(60),
    applicationStartDate: startDate(-20),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Iskolar ng Bayan Assistance Fund',
    description: 'Emergency financial assistance for students facing sudden financial difficulties.',
    sponsor: 'UPLB Office of Student Affairs',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 15000,
    awardDescription: '₱15,000 emergency fund',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 3.5,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 300000,
      eligibleCitizenship: ['Filipino']
    },
    slots: 150,
    applicationDeadline: futureDate(30),
    applicationStartDate: startDate(-5),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Working Students Grant',
    description: 'Support for students who work while studying to support their education.',
    sponsor: 'UPLB Student Welfare Office',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 12000,
    awardDescription: '₱12,000 semester allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 3.0,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 350000,
      eligibleCitizenship: ['Filipino']
    },
    slots: 75,
    applicationDeadline: futureDate(35),
    applicationStartDate: startDate(-7),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Single Parent Family Support Grant',
    description: 'Financial support for students from single-parent households.',
    sponsor: 'DSWD - Department of Social Welfare and Development',
    type: SCHOLARSHIP_TYPES.GOVERNMENT,
    totalGrant: 18000,
    awardDescription: '₱18,000 per semester',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 3.0,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 250000,
      eligibleSTBrackets: [ST_BRACKETS.FDS, ST_BRACKETS.FD, ST_BRACKETS.PD80],
      eligibleCitizenship: ['Filipino']
    },
    slots: 50,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  
  // ===========================================================================
  // CATEGORY 5: REGIONAL/PROVINCIAL SCHOLARSHIPS
  // ===========================================================================
  {
    name: 'Laguna Provincial Scholarship',
    description: 'For students from Laguna province pursuing higher education at UPLB.',
    sponsor: 'Provincial Government of Laguna',
    type: 'Government Scholarship',
    totalGrant: 25000,
    awardDescription: 'Full tuition + ₱15,000 allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleProvinces: ['Laguna'],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 40,
    applicationDeadline: futureDate(50),
    applicationStartDate: startDate(-15),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Batangas Scholars Program',
    description: 'Supporting Batangueño students in their pursuit of excellence.',
    sponsor: 'Provincial Government of Batangas',
    type: 'Government Scholarship',
    totalGrant: 22000,
    awardDescription: '₱22,000 per semester',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleProvinces: ['Batangas'],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 35,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Cavite Educational Assistance',
    description: 'For deserving students from Cavite province.',
    sponsor: 'Provincial Government of Cavite',
    type: 'Government Scholarship',
    totalGrant: 20000,
    awardDescription: '₱20,000 per semester',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.75,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      eligibleProvinces: ['Cavite'],
      maxAnnualFamilyIncome: 350000,
      eligibleCitizenship: ['Filipino']
    },
    slots: 50,
    applicationDeadline: futureDate(40),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Visayas Students Scholarship',
    description: 'For students from the Visayas region studying at UPLB.',
    sponsor: 'Visayas Development Foundation',
    type: SCHOLARSHIP_TYPES.PRIVATE,
    totalGrant: 28000,
    awardDescription: '₱28,000 per semester + transportation allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleProvinces: VISAYAS_PROVINCES,
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 30,
    applicationDeadline: futureDate(55),
    applicationStartDate: startDate(-15),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Mindanao Peace and Development Scholarship',
    description: 'Supporting students from Mindanao for national integration.',
    sponsor: 'Mindanao Development Authority',
    type: 'Government Scholarship',
    totalGrant: 35000,
    awardDescription: 'Full tuition + ₱20,000 living allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleProvinces: MINDANAO_PROVINCES,
      maxAnnualFamilyIncome: 350000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 25,
    applicationDeadline: futureDate(60),
    applicationStartDate: startDate(-20),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Northern Luzon Scholars Fund',
    description: 'For students from Northern Luzon provinces.',
    sponsor: 'Northern Luzon Federation of Alumni',
    type: SCHOLARSHIP_TYPES.PRIVATE,
    totalGrant: 20000,
    awardDescription: '₱20,000 per semester',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      eligibleProvinces: ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan', 'Cagayan', 'Isabela', 'Aurora'],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: ['Filipino']
    },
    slots: 35,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  
  // ===========================================================================
  // CATEGORY 6: THESIS/RESEARCH GRANTS
  // ===========================================================================
  {
    name: 'UPLB Undergraduate Thesis Grant',
    description: 'Support for undergraduate thesis research across all disciplines.',
    sponsor: 'UPLB Research Office',
    type: SCHOLARSHIP_TYPES.THESIS_GRANT,
    totalGrant: 15000,
    awardDescription: '₱15,000 research fund',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Senior'],
      minUnitsEnrolled: 12,
      minUnitsPassed: 120,
      eligibleColleges: ALL_COLLEGES,
      eligibleCitizenship: ['Filipino'],
      requiresApprovedThesisOutline: true,
      mustNotHaveThesisGrant: true
    },
    slots: 100,
    applicationDeadline: futureDate(40),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Agriculture Research Thesis Support',
    description: 'For thesis research in agricultural sciences.',
    sponsor: 'Philippine Council for Agriculture and Fisheries',
    type: SCHOLARSHIP_TYPES.THESIS_GRANT,
    totalGrant: 25000,
    awardDescription: '₱25,000 research grant + lab access',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Senior'],
      minUnitsEnrolled: 12,
      minUnitsPassed: 120,
      eligibleColleges: [COLLEGES.CAFS],
      eligibleCourses: ['BS Agriculture', 'BS Agricultural Biotechnology', 'BS Agricultural Chemistry'],
      eligibleCitizenship: ['Filipino'],
      requiresApprovedThesisOutline: true,
      mustNotHaveThesisGrant: true,
      mustBeGraduating: true
    },
    slots: 30,
    applicationDeadline: futureDate(35),
    applicationStartDate: startDate(-7),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Environmental Science Research Award',
    description: 'For thesis research in environmental and natural resource sciences.',
    sponsor: 'Environmental Management Bureau',
    type: SCHOLARSHIP_TYPES.THESIS_GRANT,
    totalGrant: 20000,
    awardDescription: '₱20,000 + field work allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: ['Senior'],
      minUnitsEnrolled: 12,
      minUnitsPassed: 110,
      eligibleColleges: [COLLEGES.CFNR, COLLEGES.CAS],
      eligibleCourses: ['BS Forestry', 'BS Environmental Science', 'BS Biology'],
      eligibleCitizenship: ['Filipino'],
      requiresApprovedThesisOutline: true,
      mustNotHaveThesisGrant: true
    },
    slots: 25,
    applicationDeadline: futureDate(40),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Engineering Innovation Thesis Grant',
    description: 'Supporting innovative engineering thesis projects.',
    sponsor: 'Philippine Institute of Engineers',
    type: SCHOLARSHIP_TYPES.THESIS_GRANT,
    totalGrant: 30000,
    awardDescription: '₱30,000 project fund + equipment access',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Senior'],
      minUnitsEnrolled: 15,
      minUnitsPassed: 130,
      eligibleColleges: [COLLEGES.CEAT],
      eligibleCitizenship: ['Filipino'],
      requiresApprovedThesisOutline: true,
      mustNotHaveThesisGrant: true,
      mustBeGraduating: true
    },
    slots: 20,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  
  // ===========================================================================
  // CATEGORY 7: PRIVATE/CORPORATE SCHOLARSHIPS
  // ===========================================================================
  {
    name: 'Ayala Foundation Scholarship',
    description: 'Comprehensive scholarship from Ayala Corporation for top students.',
    sponsor: 'Ayala Foundation, Inc.',
    type: 'Private Scholarship',
    totalGrant: 100000,
    awardDescription: 'Full tuition + ₱10,000 monthly allowance + laptop',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.75,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 500000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    slots: 20,
    applicationDeadline: futureDate(75),
    applicationStartDate: startDate(-30),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'San Miguel Corporation Educational Grant',
    description: 'Supporting future leaders in agribusiness and food science.',
    sponsor: 'San Miguel Corporation Foundation',
    type: 'Private Scholarship',
    totalGrant: 50000,
    awardDescription: '₱50,000 per year + internship opportunity',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CAFS, COLLEGES.CHE, COLLEGES.CEM],
      eligibleCourses: ['BS Food Technology', 'BS Agriculture', 'BS Agribusiness Economics', 'BS Nutrition'],
      maxAnnualFamilyIncome: 500000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 25,
    applicationDeadline: futureDate(60),
    applicationStartDate: startDate(-20),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'PLDT-Smart Digital Leaders Scholarship',
    description: 'For IT and Computer Science students with leadership potential.',
    sponsor: 'PLDT-Smart Foundation',
    type: 'Private Scholarship',
    totalGrant: 60000,
    awardDescription: 'Full tuition + gadget allowance + internet',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CAS, COLLEGES.CEAT],
      eligibleCourses: ['BS Computer Science', 'BS Computer Engineering', 'BS Electrical Engineering'],
      maxAnnualFamilyIncome: 600000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      mustNotHaveFailingGrade: true
    },
    slots: 30,
    applicationDeadline: futureDate(55),
    applicationStartDate: startDate(-15),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Metrobank Foundation Scholarship',
    description: 'Full scholarship for top performing students.',
    sponsor: 'Metrobank Foundation',
    type: 'Private Scholarship',
    totalGrant: 75000,
    awardDescription: 'Full tuition + ₱8,000 monthly stipend',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.5,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 18,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true,
      mustNotHaveGradeOf4: true
    },
    slots: 15,
    applicationDeadline: futureDate(65),
    applicationStartDate: startDate(-25),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Jollibee Group Foundation Scholarship',
    description: 'For students in food science and hospitality-related courses.',
    sponsor: 'Jollibee Group Foundation',
    type: 'Private Scholarship',
    totalGrant: 45000,
    awardDescription: '₱45,000 + internship + employment priority',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CHE, COLLEGES.CAFS],
      eligibleCourses: ['BS Food Technology', 'BS Nutrition', 'BS Hotel and Restaurant Management'],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 30,
    applicationDeadline: futureDate(50),
    applicationStartDate: startDate(-15),
    academicYear: '2026-2027',
    semester: 'First'
  },
  
  // ===========================================================================
  // CATEGORY 8: SPECIAL PROGRAMS
  // ===========================================================================
  {
    name: 'Student Athletes Scholarship',
    description: 'For varsity athletes maintaining good academic standing.',
    sponsor: 'UPLB Sports Development Office',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 30000,
    awardDescription: 'Full tuition + sports equipment + travel allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 3.0,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveDisciplinaryAction: true
    },
    slots: 50,
    applicationDeadline: futureDate(40),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Cultural and Arts Scholarship',
    description: 'For students excelling in cultural and performing arts.',
    sponsor: 'UPLB Cultural Office',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 20000,
    awardDescription: '₱20,000 + performance opportunities',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 3.0,
      eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveDisciplinaryAction: true
    },
    slots: 40,
    applicationDeadline: futureDate(35),
    applicationStartDate: startDate(-7),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Student Leaders Grant',
    description: 'For student organization officers with leadership excellence.',
    sponsor: 'UPLB Student Council',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 15000,
    awardDescription: '₱15,000 + leadership training',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveDisciplinaryAction: true,
      mustNotHaveFailingGrade: true
    },
    slots: 30,
    applicationDeadline: futureDate(30),
    applicationStartDate: startDate(-5),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'ROTC Academic Excellence Award',
    description: 'For ROTC cadets with outstanding academic and military performance.',
    sponsor: 'Armed Forces of the Philippines',
    type: SCHOLARSHIP_TYPES.GOVERNMENT,
    totalGrant: 25000,
    awardDescription: '₱25,000 + uniform + training allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveDisciplinaryAction: true
    },
    slots: 25,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Peer Tutoring Service Award',
    description: 'For students who provide peer tutoring services.',
    sponsor: 'UPLB Office of Academic Affairs',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 10000,
    awardDescription: '₱10,000 + certificate',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveDisciplinaryAction: true
    },
    slots: 50,
    applicationDeadline: futureDate(25),
    applicationStartDate: startDate(-5),
    academicYear: '2026-2027',
    semester: 'First'
  },
  
  // ===========================================================================
  // CATEGORY 9: FRESHMAN-SPECIFIC SCHOLARSHIPS
  // ===========================================================================
  {
    name: 'UPLB Freshman Welcome Scholarship',
    description: 'Welcome grant for incoming freshmen with excellent entrance exam scores.',
    sponsor: 'UPLB Admissions Office',
    type: 'University Scholarship',
    totalGrant: 20000,
    awardDescription: '₱20,000 first semester grant',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 5.0, // No GWA requirement for freshmen
      eligibleClassifications: ['Freshman'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleCitizenship: ['Filipino']
    },
    slots: 100,
    applicationDeadline: futureDate(60),
    applicationStartDate: startDate(-30),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'First Generation College Student Grant',
    description: 'For first-generation college students from their family.',
    sponsor: 'UPLB Alumni Association',
    type: SCHOLARSHIP_TYPES.UNIVERSITY,
    totalGrant: 25000,
    awardDescription: '₱25,000 + mentorship program',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 3.0,
      eligibleClassifications: ['Freshman', 'Sophomore'],
      minUnitsEnrolled: 12,
      eligibleColleges: ALL_COLLEGES,
      maxAnnualFamilyIncome: 300000,
      eligibleSTBrackets: [ST_BRACKETS.FDS, ST_BRACKETS.FD, ST_BRACKETS.PD80],
      eligibleCitizenship: ['Filipino']
    },
    slots: 50,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-15),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'Valedictorian/Salutatorian Scholarship',
    description: 'For high school valedictorians and salutatorians.',
    sponsor: 'DepEd-UPLB Partnership',
    type: SCHOLARSHIP_TYPES.GOVERNMENT,
    totalGrant: 40000,
    awardDescription: 'Full first year scholarship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 5.0, // No college GWA yet
      eligibleClassifications: ['Freshman'],
      minUnitsEnrolled: 15,
      eligibleColleges: ALL_COLLEGES,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 30,
    applicationDeadline: futureDate(75),
    applicationStartDate: startDate(-40),
    academicYear: '2026-2027',
    semester: 'First'
  },
  
  // ===========================================================================
  // CATEGORY 10: ADOPT-A-STUDENT PROGRAMS (Various sponsors)
  // ===========================================================================
  {
    name: 'AASP - Cargill Philippines Scholarship',
    description: 'Adopt-a-Student Program sponsored by Cargill for agribusiness students.',
    sponsor: 'Cargill Philippines, Inc.',
    type: 'Private Scholarship',
    totalGrant: 35000,
    awardDescription: '₱35,000 + internship opportunity',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CAFS, COLLEGES.CEM],
      eligibleCourses: ['BS Agribusiness Economics', 'BS Agriculture', 'BS Food Technology'],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 20,
    applicationDeadline: futureDate(50),
    applicationStartDate: startDate(-15),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'AASP - BAYER CropScience Scholarship',
    description: 'Supporting future agricultural scientists.',
    sponsor: 'Bayer CropScience Philippines',
    type: 'Private Scholarship',
    totalGrant: 40000,
    awardDescription: '₱40,000 + research attachment',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleClassifications: ['Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CAFS],
      eligibleCourses: ['BS Agriculture', 'BS Agricultural Biotechnology', 'BS Agricultural Chemistry'],
      eligibleMajors: ['Plant Pathology', 'Entomology', 'Crop Science', 'Soil Science'],
      maxAnnualFamilyIncome: 500000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 15,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'AASP - East-West Seed Company Grant',
    description: 'For students in seed technology and crop improvement.',
    sponsor: 'East-West Seed Company',
    type: 'Private Scholarship',
    totalGrant: 30000,
    awardDescription: '₱30,000 + seed technology training',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.25,
      eligibleClassifications: ['Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CAFS],
      eligibleCourses: ['BS Agriculture', 'BS Agricultural Biotechnology'],
      eligibleMajors: ['Crop Science', 'Plant Breeding', 'Horticulture'],
      maxAnnualFamilyIncome: 400000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 15,
    applicationDeadline: futureDate(40),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'AASP - Pilmico Foods Corporation Scholarship',
    description: 'For students in animal science and food processing.',
    sponsor: 'Pilmico Foods Corporation',
    type: 'Private Scholarship',
    totalGrant: 35000,
    awardDescription: '₱35,000 + farm visit + internship',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.5,
      eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
      minUnitsEnrolled: 15,
      eligibleColleges: [COLLEGES.CAFS, COLLEGES.CHE],
      eligibleCourses: ['BS Agriculture', 'BS Food Technology'],
      eligibleMajors: ['Animal Science', 'Poultry Science'],
      maxAnnualFamilyIncome: 450000,
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true
    },
    slots: 20,
    applicationDeadline: futureDate(45),
    applicationStartDate: startDate(-10),
    academicYear: '2026-2027',
    semester: 'First'
  },
  {
    name: 'AASP - SEARCA Development Scholarship',
    description: 'For students with commitment to Southeast Asian agricultural development.',
    sponsor: 'Southeast Asian Regional Center for Graduate Study and Research in Agriculture',
    type: SCHOLARSHIP_TYPES.PRIVATE,
    totalGrant: 50000,
    awardDescription: '₱50,000 + research grant + SEARCA attachment',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 1.75,
      eligibleClassifications: ['Senior'],
      minUnitsEnrolled: 12,
      minUnitsPassed: 120,
      eligibleColleges: [COLLEGES.CAFS, COLLEGES.CFNR, COLLEGES.CHE],
      eligibleCitizenship: ['Filipino'],
      mustNotHaveOtherScholarship: true,
      requiresApprovedThesisOutline: true
    },
    slots: 10,
    applicationDeadline: futureDate(60),
    applicationStartDate: startDate(-20),
    academicYear: '2026-2027',
    semester: 'First'
  }
];

// Add required documents and default values to all scholarships
const completeScholarships = scholarships.map((s, index) => ({
  ...s,
  requiredDocuments: STANDARD_DOCUMENTS,
  status: 'active',
  isActive: true,
  tags: [],
  filledSlots: 0,
  // Spread the rest of eligibilityCriteria with defaults
  eligibilityCriteria: {
    minGWA: 1.0,
    maxGWA: 5.0,
    eligibleClassifications: [],
    minUnitsEnrolled: 12,
    minUnitsPassed: 0,
    eligibleColleges: [],
    eligibleCourses: [],
    eligibleMajors: [],
    maxAnnualFamilyIncome: null,
    minAnnualFamilyIncome: 0,
    eligibleSTBrackets: [],
    eligibleProvinces: [],
    eligibleCitizenship: ['Filipino'],
    requiresApprovedThesisOutline: false,
    mustNotHaveOtherScholarship: false,
    mustNotHaveThesisGrant: false,
    mustNotHaveDisciplinaryAction: false,
    mustNotHaveFailingGrade: false,
    mustNotHaveGradeOf4: false,
    mustNotHaveIncompleteGrade: false,
    mustBeGraduating: false,
    additionalRequirements: [],
    // Override with actual criteria
    ...s.eligibilityCriteria
  }
}));

module.exports = {
  scholarships: completeScholarships,
  COLLEGES,
  YEAR_LEVELS,
  ST_BRACKETS,
  STANDARD_DOCUMENTS
};
