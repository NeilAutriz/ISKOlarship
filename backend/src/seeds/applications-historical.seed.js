// =============================================================================
// ISKOlarship - Historical Applications Seed
// Generates realistic historical application data for model training
// Each scholarship gets 50+ applications with realistic pass/fail outcomes
// =============================================================================

const mongoose = require('mongoose');

// Filipino first names (common UPLB names)
const firstNames = [
  'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Miguel', 'Carmen', 'Antonio', 'Sofia',
  'Carlos', 'Elena', 'Francisco', 'Luz', 'Ricardo', 'Cristina', 'Manuel', 'Patricia', 'Roberto', 'Isabel',
  'Andres', 'Teresa', 'Luis', 'Angela', 'Eduardo', 'Margarita', 'Fernando', 'Gloria', 'Ramon', 'Victoria',
  'Gabriel', 'Beatriz', 'Rafael', 'Dolores', 'Alberto', 'Mercedes', 'Alejandro', 'Rosario', 'Enrique', 'Concepcion',
  'Mark', 'John', 'Paul', 'Kenneth', 'Christian', 'Angelo', 'Ralph', 'Jerome', 'James', 'Michael',
  'Jasmine', 'Nicole', 'Kathleen', 'Angelica', 'Marie', 'Joy', 'Grace', 'Faith', 'Hope', 'Charity',
  'Gio', 'Jeric', 'KC', 'Bea', 'Kim', 'Jho', 'Migs', 'Chard', 'Yza', 'Pia',
  'Karlo', 'Renz', 'Jolo', 'Vince', 'Nico', 'Trisha', 'Aira', 'Kyla', 'Mika', 'Elaine'
];

// Filipino last names (common surnames)
const lastNames = [
  'Santos', 'Reyes', 'Cruz', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos', 'Castro', 'Rivera',
  'Gonzales', 'Lopez', 'Martinez', 'Rodriguez', 'Hernandez', 'Perez', 'Sanchez', 'Ramirez', 'Aquino', 'Diaz',
  'Bautista', 'Villanueva', 'Fernandez', 'De Leon', 'Del Rosario', 'Pascual', 'Valdez', 'Aguilar', 'De Guzman', 'Manalo',
  'Mercado', 'Soriano', 'Lim', 'Tan', 'Chua', 'Sy', 'Go', 'Ong', 'Co', 'Yap',
  'Santiago', 'Navarro', 'Romero', 'Morales', 'Jimenez', 'Salazar', 'Espiritu', 'Ocampo', 'Enriquez', 'Tolentino',
  'Capistrano', 'Magsaysay', 'Roxas', 'Bonifacio', 'Rizal', 'Luna', 'Mabini', 'Aguinaldo', 'Quezon', 'Laurel',
  'Pangilinan', 'Villafuerte', 'Catacutan', 'Magbanua', 'Macapagal', 'Duterte', 'Marcos', 'Arroyo', 'Estrada', 'Recto'
];

// UPLB Colleges and their courses
const collegeData = {
  'College of Arts and Sciences': {
    code: 'CAS',
    courses: [
      'BS Biology', 'BS Chemistry', 'BS Computer Science', 'BS Mathematics',
      'BS Statistics', 'BS Applied Physics', 'BA Communication Arts', 'BA Sociology',
      'BS Applied Mathematics', 'BA Philosophy'
    ]
  },
  'College of Agriculture and Food Science': {
    code: 'CAFS',
    courses: [
      'BS Agriculture', 'BS Agricultural Biotechnology', 'BS Food Technology',
      'BS Agricultural Chemistry', 'BS Agricultural Economics'
    ]
  },
  'College of Engineering and Agro-Industrial Technology': {
    code: 'CEAT',
    courses: [
      'BS Agricultural Engineering', 'BS Chemical Engineering', 'BS Civil Engineering',
      'BS Electrical Engineering', 'BS Industrial Engineering', 'BS Mechanical Engineering'
    ]
  },
  'College of Economics and Management': {
    code: 'CEM',
    courses: [
      'BS Economics', 'BS Agribusiness Management', 'BS Accountancy',
      'BS Business Administration', 'BS Management'
    ]
  },
  'College of Forestry and Natural Resources': {
    code: 'CFNR',
    courses: [
      'BS Forestry', 'BS Environmental Science', 'BS Geodetic Engineering'
    ]
  },
  'College of Human Ecology': {
    code: 'CHE',
    courses: [
      'BS Human Ecology', 'BS Nutrition', 'BS Family Life and Child Development',
      'BS Social Work'
    ]
  },
  'College of Veterinary Medicine': {
    code: 'CVM',
    courses: ['Doctor of Veterinary Medicine']
  },
  'College of Development Communication': {
    code: 'CDC',
    courses: [
      'BS Development Communication', 'BA Communication Arts'
    ]
  },
  'College of Public Affairs and Development': {
    code: 'CPAF',
    courses: [
      'BS Public Administration', 'BS Community Development',
      'MA Community Development'
    ]
  },
  'Graduate School': {
    code: 'GS',
    courses: ['MS Biology', 'MS Chemistry', 'MS Computer Science', 'PhD Agriculture']
  }
};

// Year levels
const yearLevels = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];

// ST Brackets with income ranges
const stBrackets = [
  { name: 'Full Discount with Stipend', maxIncome: 120000, probability: 0.08 },
  { name: 'Full Discount', maxIncome: 200000, probability: 0.12 },
  { name: 'PD80', maxIncome: 300000, probability: 0.15 },
  { name: 'PD60', maxIncome: 400000, probability: 0.18 },
  { name: 'PD40', maxIncome: 550000, probability: 0.20 },
  { name: 'PD20', maxIncome: 700000, probability: 0.15 },
  { name: 'No Discount', maxIncome: 999999999, probability: 0.12 }
];

// Philippine provinces (nearby UPLB)
const provinces = [
  'Laguna', 'Batangas', 'Quezon', 'Cavite', 'Rizal', 'Metro Manila',
  'Bulacan', 'Pampanga', 'Bataan', 'Nueva Ecija', 'Pangasinan',
  'Ilocos Norte', 'Ilocos Sur', 'La Union', 'Cagayan', 'Isabela',
  'Albay', 'Camarines Sur', 'Sorsogon', 'Cebu', 'Negros Occidental',
  'Davao del Sur', 'Zamboanga del Sur', 'Bukidnon', 'Misamis Oriental'
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate random number in range
 */
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Pick random element from array
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate weighted random ST bracket
 */
function generateSTBracket() {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const bracket of stBrackets) {
    cumulative += bracket.probability;
    if (rand <= cumulative) {
      return {
        name: bracket.name,
        maxIncome: bracket.maxIncome
      };
    }
  }
  
  return stBrackets[stBrackets.length - 1];
}

/**
 * Generate realistic GWA based on year level
 * Higher year = more grade variability
 */
function generateGWA(yearLevel) {
  // Base distribution: mean around 2.25, std 0.5
  let mean, std;
  
  switch (yearLevel) {
    case 'Freshman':
      mean = 2.0; std = 0.4; break;  // Generally better grades
    case 'Sophomore':
      mean = 2.15; std = 0.45; break;
    case 'Junior':
      mean = 2.25; std = 0.5; break;
    case 'Senior':
      mean = 2.3; std = 0.55; break;
    case 'Graduate':
      mean = 1.6; std = 0.3; break;  // Graduate students typically have better grades
    default:
      mean = 2.25; std = 0.5;
  }
  
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  const gwa = mean + z * std;
  
  // Clamp to valid range (1.0 to 5.0)
  return Math.max(1.0, Math.min(5.0, Number(gwa.toFixed(2))));
}

/**
 * Generate annual income based on ST bracket
 */
function generateIncome(stBracket) {
  const bracket = stBrackets.find(b => b.name === stBracket);
  if (!bracket) return randomInRange(200000, 800000);
  
  const prevBracket = stBrackets[stBrackets.indexOf(bracket) - 1];
  const minIncome = prevBracket ? prevBracket.maxIncome : 0;
  const maxIncome = bracket.maxIncome;
  
  return Math.floor(randomInRange(minIncome * 0.8, Math.min(maxIncome * 0.9, 1000000)));
}

/**
 * Generate a random student profile that matches scholarship criteria
 * This ensures we generate students who are actually eligible
 */
function generateStudentProfile(scholarshipCriteria = {}) {
  // If scholarship has specific college requirements, pick from those
  let college, collegeInfo, course;
  
  if (scholarshipCriteria.eligibleColleges && scholarshipCriteria.eligibleColleges.length > 0) {
    // Find a matching college
    const eligibleCollegeNames = scholarshipCriteria.eligibleColleges.map(c => c.toLowerCase());
    const matchingColleges = Object.entries(collegeData).filter(([name, info]) => 
      eligibleCollegeNames.some(ec => 
        name.toLowerCase().includes(ec) || 
        ec.includes(name.toLowerCase()) ||
        info.code.toLowerCase() === ec.toLowerCase()
      )
    );
    
    if (matchingColleges.length > 0) {
      const [collegeName, info] = randomPick(matchingColleges);
      college = collegeName;
      collegeInfo = info;
    }
  }
  
  // Fallback to random college if no match
  if (!college) {
    college = randomPick(Object.keys(collegeData));
    collegeInfo = collegeData[college];
  }
  
  // If scholarship has specific course requirements, pick from those
  if (scholarshipCriteria.eligibleCourses && scholarshipCriteria.eligibleCourses.length > 0) {
    const eligibleCourses = scholarshipCriteria.eligibleCourses;
    // Try to find a matching course in our college
    const matchingCourse = collegeInfo.courses.find(c => 
      eligibleCourses.some(ec => c.toLowerCase().includes(ec.toLowerCase()) || ec.toLowerCase().includes(c.toLowerCase()))
    );
    course = matchingCourse || randomPick(eligibleCourses);
  } else {
    course = randomPick(collegeInfo.courses);
  }
  
  // If scholarship has year level requirements, pick from those
  let yearLevel;
  if (scholarshipCriteria.eligibleClassifications && scholarshipCriteria.eligibleClassifications.length > 0) {
    // Map to our year levels
    const classifications = scholarshipCriteria.eligibleClassifications;
    const mappedLevels = yearLevels.filter(yl => 
      classifications.some(c => c.toLowerCase() === yl.toLowerCase())
    );
    yearLevel = mappedLevels.length > 0 ? randomPick(mappedLevels) : randomPick(yearLevels);
  } else {
    yearLevel = randomPick(yearLevels);
  }
  
  // Generate ST bracket - bias towards meeting income requirements
  let stBracketData = generateSTBracket();
  let annualFamilyIncome;
  
  if (scholarshipCriteria.maxAnnualFamilyIncome) {
    // 70% chance to be under the income limit
    if (Math.random() < 0.7) {
      annualFamilyIncome = Math.floor(randomInRange(
        scholarshipCriteria.maxAnnualFamilyIncome * 0.3, 
        scholarshipCriteria.maxAnnualFamilyIncome * 0.95
      ));
    } else {
      annualFamilyIncome = Math.floor(randomInRange(
        scholarshipCriteria.maxAnnualFamilyIncome * 0.9, 
        scholarshipCriteria.maxAnnualFamilyIncome * 1.3
      ));
    }
  } else {
    annualFamilyIncome = generateIncome(stBracketData.name);
  }
  
  // Generate GWA - bias towards meeting GWA requirements
  let gwa;
  if (scholarshipCriteria.maxGWA) {
    // 70% chance to meet GWA requirement
    if (Math.random() < 0.7) {
      gwa = Number(randomInRange(1.0, scholarshipCriteria.maxGWA).toFixed(2));
    } else {
      gwa = Number(randomInRange(scholarshipCriteria.maxGWA, Math.min(scholarshipCriteria.maxGWA + 1.0, 5.0)).toFixed(2));
    }
  } else {
    gwa = generateGWA(yearLevel);
  }
  
  // Citizenship - 98% Filipino, bias towards eligible citizenships
  let citizenship;
  if (scholarshipCriteria.eligibleCitizenship && scholarshipCriteria.eligibleCitizenship.length > 0) {
    citizenship = Math.random() < 0.95 ? 
      randomPick(scholarshipCriteria.eligibleCitizenship) : 
      randomPick(['Filipino', 'Dual Citizen', 'Foreign National']);
  } else {
    citizenship = Math.random() < 0.98 ? 'Filipino' : randomPick(['Dual Citizen', 'Foreign National']);
  }
  
  return {
    firstName: randomPick(firstNames),
    lastName: randomPick(lastNames),
    studentNumber: `20${Math.floor(randomInRange(18, 24))}-${Math.floor(randomInRange(10000, 99999))}`,
    college,
    collegeCode: collegeInfo.code,
    course,
    classification: yearLevel,
    gwa,
    stBracket: stBracketData.name,
    annualFamilyIncome,
    provinceOfOrigin: randomPick(provinces),
    citizenship,
    unitsEnrolled: Math.floor(randomInRange(12, 21)),
    unitsPassed: yearLevel === 'Freshman' ? Math.floor(randomInRange(0, 40)) :
                 yearLevel === 'Sophomore' ? Math.floor(randomInRange(30, 80)) :
                 yearLevel === 'Junior' ? Math.floor(randomInRange(70, 120)) :
                 yearLevel === 'Senior' ? Math.floor(randomInRange(100, 160)) :
                 Math.floor(randomInRange(36, 60)),
    householdSize: Math.floor(randomInRange(3, 8)),
    hasExistingScholarship: Math.random() < 0.15,
    hasThesisGrant: yearLevel === 'Senior' || yearLevel === 'Graduate' ? Math.random() < 0.1 : false,
    hasApprovedThesisOutline: (yearLevel === 'Senior' || yearLevel === 'Graduate') && Math.random() < 0.3,
    hasDisciplinaryAction: Math.random() < 0.02,
    hasFailingGrade: Math.random() < 0.05
  };
}

/**
 * Determine if an application should be approved based on criteria
 * This simulates realistic approval patterns
 */
function shouldApproveApplication(student, scholarship) {
  const criteria = scholarship.eligibilityCriteria || {};
  const scholarshipType = scholarship.scholarshipType;
  
  // Base approval probability
  let approvalProb = 0.5;
  
  // ==========================================================================
  // HARD CRITERIA (Disqualifying factors)
  // ==========================================================================
  
  // GWA requirement
  if (criteria.maxGWA && student.gwa > criteria.maxGWA) {
    return { approved: false, reason: 'GWA does not meet requirement' };
  }
  
  // Year level requirement
  if (criteria.eligibleClassifications && criteria.eligibleClassifications.length > 0) {
    const normalizedLevel = student.classification.toLowerCase();
    const isEligible = criteria.eligibleClassifications.some(c => 
      c.toLowerCase() === normalizedLevel
    );
    if (!isEligible) {
      return { approved: false, reason: 'Year level not eligible' };
    }
  }
  
  // College requirement
  if (criteria.eligibleColleges && criteria.eligibleColleges.length > 0) {
    const isEligible = criteria.eligibleColleges.some(c => 
      c.toLowerCase().includes(student.college.toLowerCase()) ||
      student.college.toLowerCase().includes(c.toLowerCase())
    );
    if (!isEligible) {
      return { approved: false, reason: 'College not eligible' };
    }
  }
  
  // Citizenship requirement
  if (criteria.eligibleCitizenship && criteria.eligibleCitizenship.length > 0) {
    if (!criteria.eligibleCitizenship.includes(student.citizenship)) {
      return { approved: false, reason: 'Citizenship not eligible' };
    }
  }
  
  // Income requirement
  if (criteria.maxAnnualFamilyIncome && student.annualFamilyIncome > criteria.maxAnnualFamilyIncome) {
    return { approved: false, reason: 'Family income exceeds limit' };
  }
  
  // Disciplinary action
  if (scholarship.mustNotHaveDisciplinaryAction && student.hasDisciplinaryAction) {
    return { approved: false, reason: 'Has disciplinary action' };
  }
  
  // Existing scholarship
  if (scholarship.mustNotHaveOtherScholarship && student.hasExistingScholarship) {
    return { approved: false, reason: 'Already has existing scholarship' };
  }
  
  // ==========================================================================
  // SOFT CRITERIA (Affects probability)
  // ==========================================================================
  
  // GWA scoring (lower is better in Philippine system)
  const gwaScore = Math.max(0, (3.0 - student.gwa) / 2.0); // 1.0 GWA = 1.0 score, 3.0 GWA = 0.0 score
  
  // Income scoring (lower is better for need-based)
  const maxIncome = criteria.maxAnnualFamilyIncome || 500000;
  const incomeScore = Math.max(0, 1 - (student.annualFamilyIncome / maxIncome));
  
  // Document completeness (simulated)
  const docScore = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
  
  // Calculate final probability based on scholarship type
  switch (scholarshipType) {
    case 'University Scholarship':
      // Merit-based: GWA is primary factor
      approvalProb = (gwaScore * 0.6) + (incomeScore * 0.15) + (docScore * 0.25);
      break;
      
    case 'College Scholarship':
      // College-specific: GWA + college match
      approvalProb = (gwaScore * 0.5) + (incomeScore * 0.2) + (docScore * 0.3);
      break;
      
    case 'Government Scholarship':
      // Need + Merit: Both GWA and income matter
      approvalProb = (gwaScore * 0.4) + (incomeScore * 0.4) + (docScore * 0.2);
      break;
      
    case 'Private Scholarship':
      // Varies: Balanced approach
      approvalProb = (gwaScore * 0.35) + (incomeScore * 0.35) + (docScore * 0.3);
      break;
      
    case 'Thesis/Research Grant':
      // Academic focus: GWA primary
      approvalProb = (gwaScore * 0.5) + (incomeScore * 0.15) + (docScore * 0.35);
      break;
      
    default:
      approvalProb = (gwaScore * 0.4) + (incomeScore * 0.3) + (docScore * 0.3);
  }
  
  // Add some randomness to simulate real-world variability
  const randomFactor = (Math.random() - 0.5) * 0.2; // ±10%
  approvalProb = Math.max(0.1, Math.min(0.9, approvalProb + randomFactor));
  
  // Make decision
  const approved = Math.random() < approvalProb;
  
  return {
    approved,
    reason: approved ? 'Meets criteria' : 'Competition/Limited slots',
    probability: approvalProb
  };
}

/**
 * Generate historical applications for a scholarship
 */
function generateApplicationsForScholarship(scholarship, count = 50) {
  const applications = [];
  const criteria = scholarship.eligibilityCriteria || {};
  
  for (let i = 0; i < count; i++) {
    // Pass scholarship criteria to generate more eligible students
    const student = generateStudentProfile(criteria);
    const decision = shouldApproveApplication(student, scholarship);
    
    // Create application object matching Application.model.js schema
    const application = {
      applicant: new mongoose.Types.ObjectId(), // Will be replaced with actual user IDs
      scholarship: scholarship._id,
      status: decision.approved ? 'approved' : 'rejected',
      applicantSnapshot: {
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        gwa: student.gwa,
        classification: student.classification,
        college: student.college,
        course: student.course,
        annualFamilyIncome: student.annualFamilyIncome,
        unitsEnrolled: student.unitsEnrolled,
        unitsPassed: student.unitsPassed,
        provinceOfOrigin: student.provinceOfOrigin,
        citizenship: student.citizenship,
        stBracket: student.stBracket,
        hasExistingScholarship: student.hasExistingScholarship,
        hasThesisGrant: student.hasThesisGrant,
        hasApprovedThesisOutline: student.hasApprovedThesisOutline,
        hasDisciplinaryAction: student.hasDisciplinaryAction,
        hasFailingGrade: student.hasFailingGrade,
        householdSize: student.householdSize
      },
      personalStatement: `I am ${student.firstName} ${student.lastName}, a ${student.classification} student from ${student.college} pursuing ${student.course}. I believe I am a strong candidate for this scholarship because of my dedication to academic excellence and my commitment to serving my community.`,
      documents: [
        {
          name: 'Transcript of Records',
          documentType: 'transcript',
          fileName: 'transcript.pdf',
          fileSize: Math.floor(randomInRange(50000, 500000)),
          mimeType: 'application/pdf',
          uploadedAt: new Date(Date.now() - randomInRange(1, 365) * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Certificate of Registration',
          documentType: 'certificate_of_registration',
          fileName: 'cor.pdf',
          fileSize: Math.floor(randomInRange(30000, 200000)),
          mimeType: 'application/pdf',
          uploadedAt: new Date(Date.now() - randomInRange(1, 365) * 24 * 60 * 60 * 1000)
        }
      ],
      hasTranscript: true,
      hasCertificateOfRegistration: true,
      hasIncomeCertificate: Math.random() < 0.7,
      eligibilityPercentage: decision.approved ? randomInRange(70, 100) : randomInRange(40, 80),
      passedAllEligibilityCriteria: decision.approved,
      statusHistory: [
        {
          status: 'submitted',
          changedBy: new mongoose.Types.ObjectId(),
          changedAt: new Date(Date.now() - randomInRange(30, 180) * 24 * 60 * 60 * 1000),
          notes: 'Application submitted'
        },
        {
          status: 'under_review',
          changedBy: new mongoose.Types.ObjectId(),
          changedAt: new Date(Date.now() - randomInRange(15, 90) * 24 * 60 * 60 * 1000),
          notes: 'Application under review'
        },
        {
          status: decision.approved ? 'approved' : 'rejected',
          changedBy: new mongoose.Types.ObjectId(),
          changedAt: new Date(Date.now() - randomInRange(1, 30) * 24 * 60 * 60 * 1000),
          notes: decision.reason
        }
      ],
      reviewNotes: decision.approved 
        ? 'Applicant meets all requirements and shows strong academic potential.'
        : decision.reason,
      createdAt: new Date(Date.now() - randomInRange(60, 365) * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - randomInRange(1, 30) * 24 * 60 * 60 * 1000)
    };
    
    applications.push(application);
  }
  
  return applications;
}

// =============================================================================
// Main Seed Function
// =============================================================================

/**
 * Seed historical applications for all scholarships
 */
async function seedHistoricalApplications(Application, Scholarship, User, applicationsPerScholarship = 50) {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('Seeding Historical Applications for Model Training');
  console.log('════════════════════════════════════════════════════════════════');
  
  // Get all scholarships
  const scholarships = await Scholarship.find({}).lean();
  
  if (scholarships.length === 0) {
    console.log('⚠️  No scholarships found. Please seed scholarships first.');
    return [];
  }
  
  console.log(`📚 Found ${scholarships.length} scholarships`);
  console.log(`📊 Generating ${applicationsPerScholarship} applications per scholarship`);
  
  // Get admin user for status history
  const admin = await User.findOne({ role: 'admin' }).lean();
  const adminId = admin?._id || new mongoose.Types.ObjectId();
  
  const allApplications = [];
  
  for (const scholarship of scholarships) {
    console.log(`\n   🎯 ${scholarship.name} (${scholarship.scholarshipType})`);
    
    const applications = generateApplicationsForScholarship(scholarship, applicationsPerScholarship);
    
    // Update changedBy references
    applications.forEach(app => {
      app.statusHistory.forEach(sh => {
        sh.changedBy = adminId;
      });
    });
    
    // Insert applications
    const inserted = await Application.insertMany(applications, { ordered: false });
    allApplications.push(...inserted);
    
    const approved = applications.filter(a => a.status === 'approved').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;
    
    console.log(`      ✅ Approved: ${approved} | ❌ Rejected: ${rejected}`);
  }
  
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`✅ Created ${allApplications.length} historical applications`);
  console.log('════════════════════════════════════════════════════════════════\n');
  
  return allApplications;
}

// =============================================================================
// Export
// =============================================================================

module.exports = {
  seedHistoricalApplications,
  generateStudentProfile,
  generateApplicationsForScholarship,
  shouldApproveApplication,
  collegeData,
  yearLevels,
  stBrackets,
  provinces
};
