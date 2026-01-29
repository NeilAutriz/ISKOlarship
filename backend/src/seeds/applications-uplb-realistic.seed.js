// =============================================================================
// ISKOlarship - Realistic UPLB Student Applications Seed Data
// Filipino students with realistic profiles applying to scoped scholarships
// =============================================================================

const mongoose = require('mongoose');
const { ApplicationStatus } = require('../models/Application.model');
const { Classification, STBracket, UPLBCollege, Citizenship } = require('../models/User.model');

// =============================================================================
// Realistic Filipino Names (Common UPLB Student Names)
// =============================================================================

const filipinoFirstNames = {
  male: [
    'Juan Carlos', 'Miguel Angelo', 'Jose Mari', 'Rafael', 'Gabriel',
    'Antonio', 'Francisco', 'Manuel', 'Luis', 'Carlos',
    'Marco', 'Paolo', 'Lorenzo', 'Andres', 'Joaquin',
    'Diego', 'Sebastian', 'Mateo', 'Leonardo', 'Daniel',
    'Jayson', 'Mark Joseph', 'John Paul', 'Christian', 'Nathaniel',
    'Emmanuel', 'Patrick', 'Kenneth', 'Vincent', 'Raphael'
  ],
  female: [
    'Maria Clara', 'Ana Patricia', 'Sofia', 'Isabella', 'Gabriella',
    'Camille', 'Nicole', 'Angelica', 'Patricia', 'Samantha',
    'Bianca', 'Alexis', 'Jasmine', 'Hannah', 'Michelle',
    'Katherine', 'Alexandra', 'Stephanie', 'Victoria', 'Daniela',
    'Francesca', 'Mariana', 'Juliana', 'Christina', 'Angela',
    'Regina', 'Monica', 'Diana', 'Teresa', 'Elena'
  ]
};

const filipinoLastNames = [
  'Santos', 'Reyes', 'Cruz', 'Garcia', 'Mendoza',
  'Torres', 'Flores', 'Gonzales', 'Ramos', 'Castillo',
  'Rivera', 'Aquino', 'Villanueva', 'Fernandez', 'Bautista',
  'De Leon', 'Del Rosario', 'Mercado', 'Ocampo', 'Pascual',
  'Navarro', 'Aguilar', 'Diaz', 'Morales', 'Ramirez',
  'Hernandez', 'Lopez', 'Martinez', 'Rodriguez', 'Perez',
  'Panganiban', 'Dimaculangan', 'Tolentino', 'Manalo', 'Lacson',
  'Soriano', 'Ignacio', 'Salvador', 'Corpuz', 'Adriano'
];

// =============================================================================
// UPLB Programs by College
// =============================================================================

const programsByCollege = {
  'CAS': [
    { course: 'BS Computer Science', academicUnit: 'ICS', academicUnitCode: 'ICS' },
    { course: 'BS Applied Physics', academicUnit: 'Institute of Mathematical Sciences and Physics', academicUnitCode: 'IMSP' },
    { course: 'BS Mathematics', academicUnit: 'Institute of Mathematical Sciences and Physics', academicUnitCode: 'IMSP' },
    { course: 'BS Statistics', academicUnit: 'Institute of Mathematical Sciences and Physics', academicUnitCode: 'IMSP' },
    { course: 'BS Chemistry', academicUnit: 'Institute of Chemistry', academicUnitCode: 'IC' },
    { course: 'BS Biology', academicUnit: 'Institute of Biological Sciences', academicUnitCode: 'IBS' },
    { course: 'BA Communication Arts', academicUnit: 'Department of Humanities', academicUnitCode: 'DHUM' },
    { course: 'BA Sociology', academicUnit: 'Department of Social Sciences', academicUnitCode: 'DSS' },
    { course: 'BA Philosophy', academicUnit: 'Department of Humanities', academicUnitCode: 'DHUM' }
  ],
  'CEAT': [
    { course: 'BS Agricultural and Biosystems Engineering', academicUnit: 'Department of Agricultural and Biosystems Engineering', academicUnitCode: 'DABE' },
    { course: 'BS Chemical Engineering', academicUnit: 'Department of Chemical Engineering', academicUnitCode: 'DCHE' },
    { course: 'BS Civil Engineering', academicUnit: 'Department of Civil Engineering', academicUnitCode: 'DCE' },
    { course: 'BS Electrical Engineering', academicUnit: 'Department of Electrical Engineering', academicUnitCode: 'DEE' },
    { course: 'BS Industrial Engineering', academicUnit: 'Department of Industrial Engineering', academicUnitCode: 'DIE' },
    { course: 'BS Mechanical Engineering', academicUnit: 'Department of Mechanical Engineering', academicUnitCode: 'DME' }
  ],
  'CEM': [
    { course: 'BS Economics', academicUnit: 'Department of Economics', academicUnitCode: 'DECON' },
    { course: 'BS Agribusiness Management', academicUnit: 'Department of Agribusiness Management and Entrepreneurship', academicUnitCode: 'DAME' },
    { course: 'BS Agricultural Economics', academicUnit: 'Department of Agricultural and Applied Economics', academicUnitCode: 'DAE' },
    { course: 'BS Accountancy', academicUnit: 'Department of Accounting', academicUnitCode: 'DACC' }
  ],
  'CAFS': [
    { course: 'BS Agriculture', academicUnit: 'Institute of Crop Science', academicUnitCode: 'ICropS' },
    { course: 'BS Food Technology', academicUnit: 'Institute of Food Science', academicUnitCode: 'IFS' },
    { course: 'BS Agricultural Chemistry', academicUnit: 'Department of Agricultural Chemistry', academicUnitCode: 'DAC' }
  ],
  'CFNR': [
    { course: 'BS Forestry', academicUnit: 'College of Forestry and Natural Resources', academicUnitCode: 'CFNR' }
  ],
  'CHE': [
    { course: 'BS Human Ecology', academicUnit: 'Department of Human and Family Development Studies', academicUnitCode: 'DHFDS' },
    { course: 'BS Nutrition', academicUnit: 'Institute of Human Nutrition and Food', academicUnitCode: 'IHNF' }
  ],
  'CVM': [
    { course: 'Doctor of Veterinary Medicine', academicUnit: 'College of Veterinary Medicine', academicUnitCode: 'CVM' }
  ],
  'CDC': [
    { course: 'BS Development Communication', academicUnit: 'College of Development Communication', academicUnitCode: 'CDC' }
  ]
};

// Laguna/CALABARZON municipalities for province of origin
const lagunaMunicipalities = [
  'Los Baños', 'Bay', 'Calamba', 'San Pablo', 'Santa Cruz',
  'Nagcarlan', 'Liliw', 'Pagsanjan', 'Pakil', 'Lumban',
  'Paete', 'Pangil', 'Siniloan', 'Famy', 'Mabitac',
  'Victoria', 'Pila', 'Calauan', 'Alaminos', 'San Pedro'
];

// Valid Philippine Provinces (matching User model enum - CALABARZON focus for UPLB)
const validProvinces = [
  'Laguna', 'Batangas', 'Cavite', 'Rizal', 'Quezon',  // CALABARZON
  'Metro Manila', 'Bulacan', 'Pampanga', 'Tarlac', 'Nueva Ecija',  // Central Luzon
  'Pangasinan', 'La Union', 'Ilocos Sur', 'Ilocos Norte', 'Cagayan',  // Northern Luzon
  'Isabela', 'Cebu', 'Leyte', 'Albay', 'Camarines Sur'  // Others
];

// =============================================================================
// Helper Functions
// =============================================================================

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));

// Generate realistic GWA (UP uses 1.0-5.0 scale, lower is better)
const generateGWA = (isHighAchiever = false) => {
  if (isHighAchiever) {
    return parseFloat(randomBetween(1.0, 1.75).toFixed(2));
  }
  // Normal distribution centered around 2.0
  const gwa = randomBetween(1.25, 3.0);
  return parseFloat(gwa.toFixed(2));
};

// Generate ST Bracket based on income (matching User model enum)
// STBracket: Full Discount with Stipend, Full Discount, PD80, PD60, PD40, PD20, No Discount
const getSTBracket = (income) => {
  if (income < 100000) return 'Full Discount with Stipend';
  if (income < 200000) return 'Full Discount';
  if (income < 350000) return 'PD80';
  if (income < 500000) return 'PD60';
  if (income < 750000) return 'PD40';
  if (income < 1000000) return 'PD20';
  return 'No Discount';
};

// Generate family income based on ST bracket
const generateFamilyIncome = (targetBracket = null) => {
  const brackets = {
    'Full Discount with Stipend': randomInt(50000, 99999),
    'Full Discount': randomInt(100000, 199999),
    'PD80': randomInt(200000, 349999),
    'PD60': randomInt(350000, 499999),
    'PD40': randomInt(500000, 749999),
    'PD20': randomInt(750000, 999999),
    'No Discount': randomInt(1000000, 2500000)
  };
  
  if (targetBracket && brackets[targetBracket]) {
    return brackets[targetBracket];
  }
  
  // Weighted distribution (more students in lower brackets at UPLB)
  const weights = [0.15, 0.25, 0.25, 0.15, 0.10, 0.05, 0.05]; // Full Discount with Stipend to No Discount
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      return brackets[Object.keys(brackets)[i]];
    }
  }
  return brackets['PD80'];
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Generate student number (UPLB format: YYYY-NNNNN)
const generateStudentNumber = (yearLevel) => {
  const currentYear = new Date().getFullYear();
  const entryYear = currentYear - (parseInt(yearLevel) || 1);
  const number = randomInt(10000, 99999);
  return `${entryYear}-${number}`;
};

// =============================================================================
// Generate Realistic Student Profile
// =============================================================================

const generateStudentProfile = (collegeCode, programInfo) => {
  const isMale = Math.random() > 0.55; // UPLB has slightly more females
  const firstName = randomElement(isMale ? filipinoFirstNames.male : filipinoFirstNames.female);
  const lastName = randomElement(filipinoLastNames);
  const yearLevels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
  const classification = randomElement(yearLevels);
  const isHighAchiever = Math.random() < 0.3; // 30% are high achievers
  const familyIncome = generateFamilyIncome();
  
  return {
    firstName,
    lastName,
    email: `${firstName.toLowerCase().replace(/\s/g, '')}.${lastName.toLowerCase()}@up.edu.ph`,
    studentNumber: generateStudentNumber(yearLevels.indexOf(classification) + 1),
    college: collegeCode,
    collegeFullName: UPLBCollege[collegeCode] || collegeCode,
    course: programInfo.course,
    major: programInfo.course.includes('Engineering') ? 'General' : null,
    academicUnit: programInfo.academicUnit,
    academicUnitCode: programInfo.academicUnitCode,
    classification,
    gwa: generateGWA(isHighAchiever),
    unitsEnrolled: randomInt(15, 21),
    unitsPassed: randomInt(90, 140),
    annualFamilyIncome: familyIncome,
    stBracket: getSTBracket(familyIncome),
    householdSize: randomInt(3, 8),
    provinceOfOrigin: Math.random() < 0.4 ? 'Laguna' : randomElement(validProvinces),
    citizenship: 'Filipino',
    hasExistingScholarship: Math.random() < 0.15,
    hasThesisGrant: Math.random() < 0.05,
    hasApprovedThesisOutline: classification === 'Senior' ? Math.random() < 0.4 : false,
    hasDisciplinaryAction: Math.random() < 0.02,
    hasFailingGrade: Math.random() < 0.08
  };
};

// =============================================================================
// Document Types
// =============================================================================

const generateDocuments = (scholarshipType, uploadDate) => {
  const baseDocuments = [
    { name: 'Transcript of Records', documentType: 'transcript', required: true },
    { name: 'Certificate of Registration', documentType: 'certificate_of_registration', required: true }
  ];
  
  const additionalDocuments = [];
  
  // Add income certificate for need-based scholarships
  if (scholarshipType.includes('Need') || scholarshipType.includes('Financial')) {
    additionalDocuments.push({ name: 'Income Tax Return', documentType: 'income_certificate', required: true });
  }
  
  // Add personal statement
  additionalDocuments.push({ name: 'Personal Statement', documentType: 'personal_statement', required: false });
  
  const allDocs = [...baseDocuments, ...additionalDocuments];
  
  return allDocs.map(doc => ({
    name: doc.name,
    documentType: doc.documentType,
    fileName: `${doc.documentType}_${Date.now()}.pdf`,
    fileSize: randomInt(50000, 500000),
    mimeType: 'application/pdf',
    uploadedAt: uploadDate,
    verified: Math.random() < 0.3
  }));
};

// =============================================================================
// Generate Eligibility Checks
// =============================================================================

const generateEligibilityChecks = (studentProfile, scholarship) => {
  const checks = [];
  const criteria = scholarship.eligibilityCriteria || {};
  
  // GWA Check
  if (criteria.maxGWA) {
    const passed = studentProfile.gwa <= criteria.maxGWA;
    checks.push({
      criterion: 'GWA Requirement',
      criterionType: 'gwa',
      passed,
      applicantValue: studentProfile.gwa,
      requiredValue: `≤ ${criteria.maxGWA}`,
      weight: 1,
      notes: passed ? 'Meets GWA requirement' : 'Does not meet minimum GWA'
    });
  }
  
  // Income Check
  if (criteria.maxAnnualFamilyIncome) {
    const passed = studentProfile.annualFamilyIncome <= criteria.maxAnnualFamilyIncome;
    checks.push({
      criterion: 'Annual Family Income',
      criterionType: 'income',
      passed,
      applicantValue: `₱${studentProfile.annualFamilyIncome.toLocaleString()}`,
      requiredValue: `≤ ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`,
      weight: 1,
      notes: passed ? 'Within income limit' : 'Exceeds income limit'
    });
  }
  
  // Year Level Check
  if (criteria.eligibleClassifications && criteria.eligibleClassifications.length > 0) {
    const passed = criteria.eligibleClassifications.includes(studentProfile.classification);
    checks.push({
      criterion: 'Year Level',
      criterionType: 'classification',
      passed,
      applicantValue: studentProfile.classification,
      requiredValue: criteria.eligibleClassifications.join(', '),
      weight: 1,
      notes: passed ? 'Eligible year level' : 'Not eligible for this year level'
    });
  }
  
  // Citizenship Check
  checks.push({
    criterion: 'Citizenship',
    criterionType: 'citizenship',
    passed: studentProfile.citizenship === 'Filipino',
    applicantValue: studentProfile.citizenship,
    requiredValue: 'Filipino',
    weight: 1,
    notes: 'Must be Filipino citizen'
  });
  
  return checks;
};

// =============================================================================
// Seed Function
// =============================================================================

async function seedRealisticApplications() {
  const { User } = require('../models/User.model');
  const { Scholarship } = require('../models/Scholarship.model');
  const { Application } = require('../models/Application.model');
  
  console.log('📋 ========== SEEDING REALISTIC UPLB APPLICATIONS ==========\n');
  
  // Get all scholarships grouped by level
  const scholarships = await Scholarship.find({ isActive: true }).lean();
  
  const scholarshipsByLevel = {
    university: scholarships.filter(s => s.scholarshipLevel === 'university'),
    college: scholarships.filter(s => s.scholarshipLevel === 'college'),
    academic_unit: scholarships.filter(s => s.scholarshipLevel === 'academic_unit')
  };
  
  console.log(`Found ${scholarships.length} scholarships:`);
  console.log(`  - University: ${scholarshipsByLevel.university.length}`);
  console.log(`  - College: ${scholarshipsByLevel.college.length}`);
  console.log(`  - Academic Unit: ${scholarshipsByLevel.academic_unit.length}`);
  
  const createdStudents = [];
  const createdApplications = [];
  
  // Generate applications for each scholarship level
  
  // 1. University-level scholarships (students from any college can apply)
  console.log('\n📚 Creating applications for UNIVERSITY scholarships...');
  for (const scholarship of scholarshipsByLevel.university.slice(0, 5)) {
    const numApplications = randomInt(8, 15);
    for (let i = 0; i < numApplications; i++) {
      const collegeCode = randomElement(Object.keys(programsByCollege));
      const programInfo = randomElement(programsByCollege[collegeCode]);
      const studentProfile = generateStudentProfile(collegeCode, programInfo);
      
      // Create user
      const user = new User({
        email: studentProfile.email,
        password: 'Student123!', // Will be hashed by pre-save hook
        firstName: studentProfile.firstName,
        lastName: studentProfile.lastName,
        role: 'student',
        isEmailVerified: true,
        studentProfile: {
          studentNumber: studentProfile.studentNumber,
          firstName: studentProfile.firstName,
          lastName: studentProfile.lastName,
          college: studentProfile.collegeFullName,
          course: studentProfile.course,
          major: studentProfile.major,
          classification: studentProfile.classification,
          gwa: studentProfile.gwa,
          unitsEnrolled: studentProfile.unitsEnrolled,
          unitsPassed: studentProfile.unitsPassed,
          annualFamilyIncome: studentProfile.annualFamilyIncome,
          stBracket: studentProfile.stBracket,
          householdSize: studentProfile.householdSize,
          provinceOfOrigin: studentProfile.provinceOfOrigin,
          citizenship: studentProfile.citizenship,
          hasExistingScholarship: studentProfile.hasExistingScholarship,
          hasThesisGrant: studentProfile.hasThesisGrant,
          hasApprovedThesisOutline: studentProfile.hasApprovedThesisOutline,
          hasDisciplinaryAction: studentProfile.hasDisciplinaryAction,
          hasFailingGrade: studentProfile.hasFailingGrade
        }
      });
      
      try {
        await user.save();
        createdStudents.push(user);
        
        // Create application
        const submittedDate = daysAgo(randomInt(1, 30));
        const eligibilityChecks = generateEligibilityChecks(studentProfile, scholarship);
        const allPassed = eligibilityChecks.every(c => c.passed);
        const passedCount = eligibilityChecks.filter(c => c.passed).length;
        
        // Determine status based on eligibility and time
        let status = ApplicationStatus.SUBMITTED;
        const rand = Math.random();
        if (rand < 0.3) status = ApplicationStatus.UNDER_REVIEW;
        else if (rand < 0.5 && allPassed) status = ApplicationStatus.APPROVED;
        else if (rand < 0.6 && !allPassed) status = ApplicationStatus.REJECTED;
        
        const application = new Application({
          applicant: user._id,
          scholarship: scholarship._id,
          status,
          personalStatement: `I am ${studentProfile.firstName} ${studentProfile.lastName}, a ${studentProfile.classification} student from ${studentProfile.course} at ${studentProfile.collegeFullName}. I am applying for this scholarship because I believe in the value of education and wish to contribute to society through my studies.`,
          documents: generateDocuments(scholarship.type, submittedDate),
          applicantSnapshot: {
            studentNumber: studentProfile.studentNumber,
            firstName: studentProfile.firstName,
            lastName: studentProfile.lastName,
            gwa: studentProfile.gwa,
            classification: studentProfile.classification,
            college: studentProfile.collegeFullName,
            course: studentProfile.course,
            annualFamilyIncome: studentProfile.annualFamilyIncome,
            stBracket: studentProfile.stBracket,
            citizenship: studentProfile.citizenship
          },
          eligibilityChecks,
          passedAllEligibilityCriteria: allPassed,
          eligibilityPercentage: (passedCount / eligibilityChecks.length) * 100,
          criteriaPassed: passedCount,
          criteriaTotal: eligibilityChecks.length,
          academicYear: '2025-2026',
          semester: 'First',
          submittedAt: submittedDate,
          statusHistory: [{
            status: ApplicationStatus.SUBMITTED,
            changedBy: user._id,
            changedAt: submittedDate,
            notes: 'Application submitted'
          }]
        });
        
        await application.save();
        createdApplications.push(application);
        
      } catch (err) {
        if (err.code !== 11000) { // Ignore duplicate key errors
          console.error(`Error creating student/application: ${err.message}`);
        }
      }
    }
    console.log(`  ✅ ${scholarship.name}: Created applications`);
  }
  
  // 2. College-level scholarships (students from specific college)
  console.log('\n📚 Creating applications for COLLEGE scholarships...');
  for (const scholarship of scholarshipsByLevel.college) {
    const collegeName = scholarship.managingCollege;
    const collegeCode = scholarship.managingCollegeCode;
    
    if (!collegeCode || !programsByCollege[collegeCode]) {
      console.log(`  ⚠️ Skipping ${scholarship.name} - no programs for college ${collegeCode}`);
      continue;
    }
    
    const numApplications = randomInt(5, 10);
    for (let i = 0; i < numApplications; i++) {
      const programInfo = randomElement(programsByCollege[collegeCode]);
      const studentProfile = generateStudentProfile(collegeCode, programInfo);
      
      const user = new User({
        email: `${studentProfile.email.split('@')[0]}${randomInt(1, 999)}@up.edu.ph`,
        password: 'Student123!',
        firstName: studentProfile.firstName,
        lastName: studentProfile.lastName,
        role: 'student',
        isEmailVerified: true,
        studentProfile: {
          studentNumber: studentProfile.studentNumber,
          firstName: studentProfile.firstName,
          lastName: studentProfile.lastName,
          college: studentProfile.collegeFullName,
          course: studentProfile.course,
          classification: studentProfile.classification,
          gwa: studentProfile.gwa,
          unitsEnrolled: studentProfile.unitsEnrolled,
          unitsPassed: studentProfile.unitsPassed,
          annualFamilyIncome: studentProfile.annualFamilyIncome,
          stBracket: studentProfile.stBracket,
          householdSize: studentProfile.householdSize,
          provinceOfOrigin: studentProfile.provinceOfOrigin,
          citizenship: studentProfile.citizenship,
          hasExistingScholarship: studentProfile.hasExistingScholarship,
          hasDisciplinaryAction: studentProfile.hasDisciplinaryAction
        }
      });
      
      try {
        await user.save();
        createdStudents.push(user);
        
        const submittedDate = daysAgo(randomInt(1, 30));
        const eligibilityChecks = generateEligibilityChecks(studentProfile, scholarship);
        const allPassed = eligibilityChecks.every(c => c.passed);
        const passedCount = eligibilityChecks.filter(c => c.passed).length;
        
        let status = ApplicationStatus.SUBMITTED;
        const rand = Math.random();
        if (rand < 0.3) status = ApplicationStatus.UNDER_REVIEW;
        else if (rand < 0.5 && allPassed) status = ApplicationStatus.APPROVED;
        else if (rand < 0.6 && !allPassed) status = ApplicationStatus.REJECTED;
        
        const application = new Application({
          applicant: user._id,
          scholarship: scholarship._id,
          status,
          personalStatement: `As a proud ${studentProfile.classification} student of ${studentProfile.course} in ${collegeName}, I am honored to apply for this college scholarship.`,
          documents: generateDocuments(scholarship.type, submittedDate),
          applicantSnapshot: {
            studentNumber: studentProfile.studentNumber,
            firstName: studentProfile.firstName,
            lastName: studentProfile.lastName,
            gwa: studentProfile.gwa,
            classification: studentProfile.classification,
            college: studentProfile.collegeFullName,
            course: studentProfile.course,
            annualFamilyIncome: studentProfile.annualFamilyIncome,
            stBracket: studentProfile.stBracket,
            citizenship: studentProfile.citizenship
          },
          eligibilityChecks,
          passedAllEligibilityCriteria: allPassed,
          eligibilityPercentage: (passedCount / eligibilityChecks.length) * 100,
          criteriaPassed: passedCount,
          criteriaTotal: eligibilityChecks.length,
          academicYear: '2025-2026',
          semester: 'First',
          submittedAt: submittedDate,
          statusHistory: [{
            status: ApplicationStatus.SUBMITTED,
            changedBy: user._id,
            changedAt: submittedDate,
            notes: 'Application submitted'
          }]
        });
        
        await application.save();
        createdApplications.push(application);
        
      } catch (err) {
        if (err.code !== 11000) {
          console.error(`Error: ${err.message}`);
        }
      }
    }
    console.log(`  ✅ ${scholarship.name} (${collegeCode}): Created applications`);
  }
  
  // 3. Academic Unit-level scholarships (students from specific department/institute)
  console.log('\n📚 Creating applications for ACADEMIC UNIT scholarships...');
  for (const scholarship of scholarshipsByLevel.academic_unit) {
    const unitCode = scholarship.managingAcademicUnitCode;
    const collegeCode = scholarship.managingCollegeCode;
    
    if (!collegeCode || !programsByCollege[collegeCode]) {
      console.log(`  ⚠️ Skipping ${scholarship.name} - no programs for ${collegeCode}`);
      continue;
    }
    
    // Find programs matching this academic unit
    const matchingPrograms = programsByCollege[collegeCode].filter(
      p => p.academicUnitCode === unitCode
    );
    
    if (matchingPrograms.length === 0) {
      console.log(`  ⚠️ Skipping ${scholarship.name} - no programs for unit ${unitCode}`);
      continue;
    }
    
    const numApplications = randomInt(3, 8);
    for (let i = 0; i < numApplications; i++) {
      const programInfo = randomElement(matchingPrograms);
      const studentProfile = generateStudentProfile(collegeCode, programInfo);
      
      const user = new User({
        email: `${studentProfile.email.split('@')[0]}${randomInt(1, 9999)}@up.edu.ph`,
        password: 'Student123!',
        firstName: studentProfile.firstName,
        lastName: studentProfile.lastName,
        role: 'student',
        isEmailVerified: true,
        studentProfile: {
          studentNumber: studentProfile.studentNumber,
          firstName: studentProfile.firstName,
          lastName: studentProfile.lastName,
          college: studentProfile.collegeFullName,
          course: studentProfile.course,
          classification: studentProfile.classification,
          gwa: studentProfile.gwa,
          unitsEnrolled: studentProfile.unitsEnrolled,
          unitsPassed: studentProfile.unitsPassed,
          annualFamilyIncome: studentProfile.annualFamilyIncome,
          stBracket: studentProfile.stBracket,
          householdSize: studentProfile.householdSize,
          provinceOfOrigin: studentProfile.provinceOfOrigin,
          citizenship: studentProfile.citizenship,
          hasExistingScholarship: studentProfile.hasExistingScholarship,
          hasDisciplinaryAction: studentProfile.hasDisciplinaryAction
        }
      });
      
      try {
        await user.save();
        createdStudents.push(user);
        
        const submittedDate = daysAgo(randomInt(1, 30));
        const eligibilityChecks = generateEligibilityChecks(studentProfile, scholarship);
        const allPassed = eligibilityChecks.every(c => c.passed);
        const passedCount = eligibilityChecks.filter(c => c.passed).length;
        
        let status = ApplicationStatus.SUBMITTED;
        const rand = Math.random();
        if (rand < 0.3) status = ApplicationStatus.UNDER_REVIEW;
        else if (rand < 0.5 && allPassed) status = ApplicationStatus.APPROVED;
        else if (rand < 0.6 && !allPassed) status = ApplicationStatus.REJECTED;
        
        const application = new Application({
          applicant: user._id,
          scholarship: scholarship._id,
          status,
          personalStatement: `I am a dedicated ${studentProfile.classification} student specializing in ${studentProfile.course} at the ${programInfo.academicUnit}. This scholarship would help me pursue my academic goals.`,
          documents: generateDocuments(scholarship.type, submittedDate),
          applicantSnapshot: {
            studentNumber: studentProfile.studentNumber,
            firstName: studentProfile.firstName,
            lastName: studentProfile.lastName,
            gwa: studentProfile.gwa,
            classification: studentProfile.classification,
            college: studentProfile.collegeFullName,
            course: studentProfile.course,
            annualFamilyIncome: studentProfile.annualFamilyIncome,
            stBracket: studentProfile.stBracket,
            citizenship: studentProfile.citizenship
          },
          eligibilityChecks,
          passedAllEligibilityCriteria: allPassed,
          eligibilityPercentage: (passedCount / eligibilityChecks.length) * 100,
          criteriaPassed: passedCount,
          criteriaTotal: eligibilityChecks.length,
          academicYear: '2025-2026',
          semester: 'First',
          submittedAt: submittedDate,
          statusHistory: [{
            status: ApplicationStatus.SUBMITTED,
            changedBy: user._id,
            changedAt: submittedDate,
            notes: 'Application submitted'
          }]
        });
        
        await application.save();
        createdApplications.push(application);
        
      } catch (err) {
        if (err.code !== 11000) {
          console.error(`Error: ${err.message}`);
        }
      }
    }
    console.log(`  ✅ ${scholarship.name} (${unitCode}): Created applications`);
  }
  
  console.log('\n========================================');
  console.log(`✅ Created ${createdStudents.length} student accounts`);
  console.log(`✅ Created ${createdApplications.length} applications`);
  console.log('========================================\n');
  
  return { students: createdStudents, applications: createdApplications };
}

module.exports = { seedRealisticApplications };

// Run directly if called as script
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const mongoose = require('mongoose');
  
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('✅ Connected to MongoDB\n');
      await seedRealisticApplications();
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}
