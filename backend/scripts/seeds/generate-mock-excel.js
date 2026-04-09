#!/usr/bin/env node
// =============================================================================
// Generate Excel File with CSFA Historical Scholarship Applications
// Uses the actual 25 CSFA-administered scholarship programs from the seed data
// =============================================================================

const ExcelJS = require('exceljs');
const path = require('path');

// ─── Reuse same data pools from seed ────────────────────────────────────────

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

const lastNames = [
  'Santos', 'Reyes', 'Cruz', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos', 'Castro', 'Rivera',
  'Gonzales', 'Lopez', 'Martinez', 'Rodriguez', 'Hernandez', 'Perez', 'Sanchez', 'Ramirez', 'Aquino', 'Diaz',
  'Bautista', 'Villanueva', 'Fernandez', 'De Leon', 'Del Rosario', 'Pascual', 'Valdez', 'Aguilar', 'De Guzman', 'Manalo',
  'Mercado', 'Soriano', 'Lim', 'Tan', 'Chua', 'Sy', 'Go', 'Ong', 'Co', 'Yap',
  'Santiago', 'Navarro', 'Romero', 'Morales', 'Jimenez', 'Salazar', 'Espiritu', 'Ocampo', 'Enriquez', 'Tolentino'
];

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
    courses: ['BS Forestry', 'BS Environmental Science', 'BS Geodetic Engineering']
  },
  'College of Human Ecology': {
    code: 'CHE',
    courses: ['BS Human Ecology', 'BS Nutrition', 'BS Family Life and Child Development', 'BS Social Work']
  },
  'College of Veterinary Medicine': {
    code: 'CVM',
    courses: ['Doctor of Veterinary Medicine']
  },
  'College of Development Communication': {
    code: 'CDC',
    courses: ['BS Development Communication', 'BA Communication Arts']
  },
  'College of Public Affairs and Development': {
    code: 'CPAF',
    courses: ['BS Public Administration', 'BS Community Development']
  },
  'Graduate School': {
    code: 'GS',
    courses: ['MS Biology', 'MS Chemistry', 'MS Computer Science', 'PhD Agriculture']
  }
};

const yearLevels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

const stBrackets = [
  { name: 'Full Discount with Stipend', maxIncome: 120000, probability: 0.08 },
  { name: 'Full Discount', maxIncome: 200000, probability: 0.12 },
  { name: 'PD80', maxIncome: 300000, probability: 0.15 },
  { name: 'PD60', maxIncome: 400000, probability: 0.18 },
  { name: 'PD40', maxIncome: 550000, probability: 0.20 },
  { name: 'PD20', maxIncome: 700000, probability: 0.15 },
  { name: 'No Discount', maxIncome: 999999999, probability: 0.12 }
];

const provinces = [
  'Laguna', 'Batangas', 'Quezon', 'Cavite', 'Rizal', 'Metro Manila',
  'Bulacan', 'Pampanga', 'Bataan', 'Nueva Ecija', 'Pangasinan',
  'Ilocos Norte', 'Ilocos Sur', 'La Union', 'Cagayan', 'Isabela',
  'Albay', 'Camarines Sur', 'Sorsogon', 'Cebu', 'Negros Occidental',
  'Davao del Sur', 'Zamboanga del Sur', 'Bukidnon', 'Misamis Oriental'
];

// =============================================================================
// 25 ACTUAL CSFA-ADMINISTERED SCHOLARSHIPS (from scholarships-realistic.seed.js)
// =============================================================================

const scholarships = [
  {
    name: 'Adopt-a-Student Program (AASP) - Institute of Mathematical Sciences',
    type: 'College Scholarship',
    maxGWA: 3.0,
    maxIncome: null,
    eligibleColleges: ['CAS'],
    eligibleCourses: ['BS Applied Mathematics', 'BS Mathematics'],
    eligibleClassifications: ['Senior'],
    slots: 5,
    totalGrant: 40000
  },
  {
    name: 'Adopt-a-Student Program (AASP) - Camilla Yandoc Ables',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: 150000,
    eligibleColleges: ['CAFS'],
    eligibleCourses: ['BS Agriculture'],
    eligibleClassifications: ['Junior', 'Senior'],
    slots: 3,
    totalGrant: 45000
  },
  {
    name: 'Adopt-a-Student Program (AASP) - Norma P. Ables',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: 150000,
    eligibleColleges: ['CAFS', 'CHE'],
    eligibleCourses: ['BS Agriculture', 'BS Nutrition'],
    eligibleClassifications: ['Junior', 'Senior'],
    slots: 3,
    totalGrant: 45000
  },
  {
    name: 'Archie B.M. Laaño Quezonian Scholarships',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: null,
    eligibleColleges: null,
    eligibleCourses: null,
    eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    eligibleProvinces: ['Quezon'],
    slots: 5,
    totalGrant: 40000
  },
  {
    name: 'Adolfo S. Suzara Foundation, Inc. Scholarship',
    type: 'Private Scholarship',
    maxGWA: 2.0,
    maxIncome: 200000,
    eligibleColleges: null,
    eligibleCourses: null,
    eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    slots: 10,
    totalGrant: 50000
  },
  {
    name: 'Scholarship Program for Foreign Students (PhD)',
    type: 'University Scholarship',
    maxGWA: 1.75,
    maxIncome: null,
    eligibleColleges: ['GS'],
    eligibleCourses: null,
    eligibleClassifications: ['Graduate'],
    citizenshipRestriction: 'Foreign National',
    slots: 5,
    totalGrant: 80000
  },
  {
    name: 'SMPFC Future Leaders Scholarship Program',
    type: 'Private Scholarship',
    maxGWA: 2.0,
    maxIncome: 500000,
    eligibleColleges: null,
    eligibleCourses: null,
    eligibleClassifications: ['Sophomore'],
    slots: 10,
    totalGrant: 60000
  },
  {
    name: 'UPAA Hongkong Scholarship Grant',
    type: 'Private Scholarship',
    maxGWA: null,
    maxIncome: null,
    eligibleColleges: null,
    eligibleCourses: null,
    eligibleClassifications: ['Senior'],
    slots: 5,
    totalGrant: 50000
  },
  {
    name: 'UT Foundation, Inc. Scholarship',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: null,
    eligibleColleges: null,
    eligibleCourses: null,
    eligibleClassifications: ['Freshman', 'Sophomore'],
    eligibleSTBrackets: ['Full Discount', 'Full Discount with Stipend'],
    slots: 5,
    totalGrant: 50000
  },
  {
    name: "Upsilon Sigma Phi - Sigma Delta Phi '69 Scholarship",
    type: 'Private Scholarship',
    maxGWA: 1.75,
    maxIncome: null,
    eligibleColleges: null,
    eligibleCourses: null,
    eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
    slots: 5,
    totalGrant: 45000
  },
  {
    name: 'Upsilon Sigma Phi North America (USPNA) Scholarship Program',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: 500000,
    eligibleColleges: ['CAS', 'CEAT', 'CAFS'],
    eligibleCourses: null,
    eligibleClassifications: ['Sophomore'],
    slots: 10,
    totalGrant: 50000
  },
  {
    name: 'Adopt-a-Student Program (AASP) - Sterix Incorporated Gift of HOPE Thesis Grant',
    type: 'Thesis/Research Grant',
    maxGWA: 2.5,
    maxIncome: 250000,
    eligibleColleges: ['CAS', 'CAFS'],
    eligibleCourses: ['BS Biology', 'BS Agriculture'],
    eligibleClassifications: ['Senior'],
    slots: 5,
    totalGrant: 25000
  },
  {
    name: 'Lifebank Microfinance Foundation, Inc. (LBMFI) Undergraduate Thesis Grant',
    type: 'Thesis/Research Grant',
    maxGWA: null,
    maxIncome: null,
    eligibleColleges: null,
    eligibleCourses: null,
    eligibleClassifications: ['Junior', 'Senior'],
    slots: 5,
    totalGrant: 30000
  },
  {
    name: 'Sterix Incorporated Gift of HOPE Scholarship Program',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: 250000,
    eligibleColleges: ['CAS', 'CAFS'],
    eligibleCourses: ['BS Biology', 'BS Agriculture'],
    eligibleClassifications: ['Junior'],
    slots: 5,
    totalGrant: 40000
  },
  {
    name: 'SM Sustainability Scholarship',
    type: 'Private Scholarship',
    maxGWA: null,
    maxIncome: 150000,
    eligibleColleges: ['CFNR'],
    eligibleCourses: ['BS Forestry'],
    eligibleClassifications: ['Junior'],
    slots: 5,
    totalGrant: 50000
  },
  {
    name: 'Adopt-a-Student Program (AASP) - College of Human Ecology Alumni Association Thesis Grant',
    type: 'Thesis/Research Grant',
    maxGWA: null,
    maxIncome: null,
    eligibleColleges: ['CHE'],
    eligibleCourses: null,
    eligibleClassifications: ['Senior'],
    eligibleSTBrackets: ['PD80', 'Full Discount', 'Full Discount with Stipend'],
    slots: 5,
    totalGrant: 25000
  },
  {
    name: 'Adopt-a-Student Program (AASP) - Dr. Higino A. Ables',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: 150000,
    eligibleColleges: null,
    eligibleCourses: null,
    eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    eligibleProvinces: ['Sorsogon', 'Camarines Sur'],
    slots: 3,
    totalGrant: 40000
  },
  {
    name: 'Adopt-a-Student Program (AASP) - Corazon Dayro Ong (CDO Odyssey Foundation, Inc.)',
    type: 'Private Scholarship',
    maxGWA: null,
    maxIncome: 250000,
    eligibleColleges: ['CAFS', 'CFNR'],
    eligibleCourses: ['BS Agriculture', 'BS Forestry'],
    eligibleClassifications: ['Senior'],
    slots: 5,
    totalGrant: 45000
  },
  {
    name: 'Adopt-a-Student Program (AASP) - FDF',
    type: 'Private Scholarship',
    maxGWA: null,
    maxIncome: null,
    eligibleColleges: null,
    eligibleCourses: null,
    eligibleClassifications: ['Senior'],
    slots: 5,
    totalGrant: 30000
  },
  {
    name: 'Adopt-a-Student Program (AASP) - Nicolas Nick Angel II',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: 250000,
    eligibleColleges: ['CAFS', 'CFNR'],
    eligibleCourses: ['BS Agriculture', 'BS Forestry'],
    eligibleClassifications: ['Senior'],
    slots: 3,
    totalGrant: 45000
  },
  {
    name: 'Adopt-a-Student Program (AASP) - Human Ecology Institute of the Philippines, Inc. (HUMEIN-Phils)',
    type: 'Private Scholarship',
    maxGWA: null,
    maxIncome: 250000,
    eligibleColleges: ['CHE'],
    eligibleCourses: null,
    eligibleClassifications: ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    slots: 5,
    totalGrant: 35000
  },
  {
    name: 'CSFA UP System Senior Graduating Student Scholarship',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: 300000,
    eligibleColleges: ['CAS', 'CAFS', 'CEM', 'CEAT', 'CFNR', 'CHE', 'CVM', 'CDC', 'CPAF', 'GS'],
    eligibleCourses: null,
    eligibleClassifications: ['Senior'],
    slots: 5,
    totalGrant: 30000
  },
  {
    name: 'Philippine S&T Development Foundation-Manila, Inc. (Phildev) Science & Engineering Scholarship Grants',
    type: 'Private Scholarship',
    maxGWA: 1.75,
    maxIncome: 500000,
    eligibleColleges: ['CAS', 'CEAT'],
    eligibleCourses: ['BS Computer Science', 'BS Industrial Engineering'],
    eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
    slots: 10,
    totalGrant: 75000
  },
  {
    name: 'UPAA of Wisconsin Scholarship - Systemwide',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: 300000,
    eligibleColleges: ['CAS', 'CAFS', 'CEM', 'CEAT', 'CFNR', 'CHE', 'CVM', 'CDC', 'CPAF', 'GS'],
    eligibleCourses: null,
    eligibleClassifications: ['Senior'],
    slots: 3,
    totalGrant: 30000
  },
  {
    name: 'Foundation For Philippine Progress Undergraduate Fellowship Grant',
    type: 'Private Scholarship',
    maxGWA: 2.5,
    maxIncome: 300000,
    eligibleColleges: ['CAFS', 'CAS', 'CEAT'],
    eligibleCourses: ['BS Industrial Engineering', 'BS Computer Science', 'BS Agriculture'],
    eligibleClassifications: ['Sophomore', 'Junior', 'Senior'],
    slots: 10,
    totalGrant: 50000
  }
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSTBracket(scholarship) {
  if (scholarship.eligibleSTBrackets && scholarship.eligibleSTBrackets.length > 0) {
    if (Math.random() < 0.7) {
      return randomPick(scholarship.eligibleSTBrackets);
    }
    return randomPick(stBrackets.map(b => b.name));
  }
  const rand = Math.random();
  let cumulative = 0;
  for (const bracket of stBrackets) {
    cumulative += bracket.probability;
    if (rand <= cumulative) return bracket.name;
  }
  return stBrackets[stBrackets.length - 1].name;
}

function generateGWA(yearLevel) {
  let mean, std;
  switch (yearLevel) {
    case 'Freshman': mean = 2.0; std = 0.4; break;
    case 'Sophomore': mean = 2.15; std = 0.45; break;
    case 'Junior': mean = 2.25; std = 0.5; break;
    case 'Senior': mean = 2.3; std = 0.55; break;
    case 'Graduate': mean = 1.5; std = 0.3; break;
    default: mean = 2.25; std = 0.5;
  }
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const gwa = mean + z * std;
  return Math.max(1.0, Math.min(5.0, Number(gwa.toFixed(2))));
}

function generateIncome(stBracket) {
  const bracket = stBrackets.find(b => b.name === stBracket);
  if (!bracket) return Math.floor(randomInRange(200000, 800000));
  const prevBracket = stBrackets[stBrackets.indexOf(bracket) - 1];
  const minIncome = prevBracket ? prevBracket.maxIncome : 0;
  const maxIncome = bracket.maxIncome;
  return Math.floor(randomInRange(minIncome * 0.8, Math.min(maxIncome * 0.9, 1000000)));
}

function generateStudentProfile(scholarship) {
  let college, collegeInfo, course;

  if (scholarship.eligibleColleges && scholarship.eligibleColleges.length > 0) {
    const matchingColleges = Object.entries(collegeData).filter(([, info]) =>
      scholarship.eligibleColleges.some(ec => ec.toUpperCase() === info.code)
    );
    if (matchingColleges.length > 0) {
      if (Math.random() < 0.8) {
        const [collegeName, info] = randomPick(matchingColleges);
        college = collegeName;
        collegeInfo = info;
      }
    }
  }

  if (!college) {
    college = randomPick(Object.keys(collegeData));
    collegeInfo = collegeData[college];
  }

  if (scholarship.eligibleCourses && scholarship.eligibleCourses.length > 0 && Math.random() < 0.75) {
    const matchingCourses = scholarship.eligibleCourses.filter(c => collegeInfo.courses.includes(c));
    if (matchingCourses.length > 0) {
      course = randomPick(matchingCourses);
    } else {
      course = randomPick(collegeInfo.courses);
    }
  } else {
    course = randomPick(collegeInfo.courses);
  }

  let yearLevel;
  if (scholarship.eligibleClassifications && scholarship.eligibleClassifications.length > 0) {
    if (Math.random() < 0.8) {
      yearLevel = randomPick(scholarship.eligibleClassifications);
    } else {
      yearLevel = randomPick(yearLevels);
    }
  } else {
    yearLevel = randomPick(yearLevels);
  }

  const stBracket = generateSTBracket(scholarship);

  let annualFamilyIncome;
  if (scholarship.maxIncome) {
    if (Math.random() < 0.7) {
      annualFamilyIncome = Math.floor(randomInRange(scholarship.maxIncome * 0.3, scholarship.maxIncome * 0.95));
    } else {
      annualFamilyIncome = Math.floor(randomInRange(scholarship.maxIncome * 0.9, scholarship.maxIncome * 1.3));
    }
  } else {
    annualFamilyIncome = generateIncome(stBracket);
  }

  let gwa;
  if (scholarship.maxGWA) {
    if (Math.random() < 0.7) {
      gwa = Number(randomInRange(1.0, scholarship.maxGWA).toFixed(2));
    } else {
      gwa = Number(randomInRange(scholarship.maxGWA, Math.min(scholarship.maxGWA + 1.0, 5.0)).toFixed(2));
    }
  } else {
    gwa = generateGWA(yearLevel);
  }

  let citizenship;
  if (scholarship.citizenshipRestriction === 'Foreign National') {
    citizenship = Math.random() < 0.85 ? 'Foreign National' : 'Filipino';
  } else {
    citizenship = Math.random() < 0.98 ? 'Filipino' : randomPick(['Dual Citizen', 'Foreign National']);
  }

  let provinceOfOrigin;
  if (scholarship.eligibleProvinces && scholarship.eligibleProvinces.length > 0) {
    if (Math.random() < 0.75) {
      provinceOfOrigin = randomPick(scholarship.eligibleProvinces);
    } else {
      provinceOfOrigin = randomPick(provinces);
    }
  } else {
    provinceOfOrigin = randomPick(provinces);
  }

  return {
    firstName: randomPick(firstNames),
    lastName: randomPick(lastNames),
    studentNumber: `20${Math.floor(randomInRange(18, 26))}-${String(Math.floor(randomInRange(10000, 99999))).padStart(5, '0')}`,
    college,
    collegeCode: collegeInfo.code,
    course,
    classification: yearLevel,
    gwa,
    stBracket,
    annualFamilyIncome,
    provinceOfOrigin,
    citizenship,
    unitsEnrolled: yearLevel === 'Graduate' ? Math.floor(randomInRange(9, 15)) : Math.floor(randomInRange(12, 21)),
    unitsPassed: yearLevel === 'Freshman' ? Math.floor(randomInRange(0, 40)) :
                 yearLevel === 'Sophomore' ? Math.floor(randomInRange(30, 80)) :
                 yearLevel === 'Junior' ? Math.floor(randomInRange(70, 120)) :
                 yearLevel === 'Graduate' ? Math.floor(randomInRange(15, 60)) :
                 Math.floor(randomInRange(100, 160)),
    householdSize: Math.floor(randomInRange(3, 8)),
    hasExistingScholarship: Math.random() < 0.15,
    hasThesisGrant: (yearLevel === 'Senior' || yearLevel === 'Graduate') ? Math.random() < 0.1 : false,
    hasApprovedThesisOutline: (yearLevel === 'Senior' || yearLevel === 'Graduate') && Math.random() < 0.3,
    hasDisciplinaryAction: Math.random() < 0.02,
    hasFailingGrade: Math.random() < 0.05
  };
}

function shouldApprove(student, scholarship) {
  if (scholarship.maxGWA && student.gwa > scholarship.maxGWA) return false;
  if (scholarship.maxIncome && student.annualFamilyIncome > scholarship.maxIncome) return false;
  if (student.hasDisciplinaryAction) return false;
  if (student.hasExistingScholarship && Math.random() < 0.8) return false;
  if (student.hasFailingGrade && Math.random() < 0.7) return false;

  if (scholarship.citizenshipRestriction === 'Foreign National' && student.citizenship === 'Filipino') return false;

  if (scholarship.eligibleProvinces && scholarship.eligibleProvinces.length > 0) {
    if (!scholarship.eligibleProvinces.includes(student.provinceOfOrigin)) return false;
  }

  if (scholarship.eligibleColleges && scholarship.eligibleColleges.length > 0) {
    if (!scholarship.eligibleColleges.includes(student.collegeCode)) return false;
  }

  if (scholarship.eligibleClassifications && scholarship.eligibleClassifications.length > 0) {
    if (!scholarship.eligibleClassifications.includes(student.classification)) return false;
  }

  if (scholarship.eligibleCourses && scholarship.eligibleCourses.length > 0) {
    if (!scholarship.eligibleCourses.includes(student.course)) {
      if (Math.random() < 0.85) return false;
    }
  }

  if (scholarship.eligibleSTBrackets && scholarship.eligibleSTBrackets.length > 0) {
    if (!scholarship.eligibleSTBrackets.includes(student.stBracket)) return false;
  }

  const gwaScore = Math.max(0, (3.0 - student.gwa) / 2.0);
  const maxIncome = scholarship.maxIncome || 500000;
  const incomeScore = Math.max(0, 1 - (student.annualFamilyIncome / maxIncome));
  const docScore = Math.random() * 0.3 + 0.7;

  let prob;
  switch (scholarship.type) {
    case 'University Scholarship':
      prob = gwaScore * 0.6 + incomeScore * 0.15 + docScore * 0.25; break;
    case 'College Scholarship':
      prob = gwaScore * 0.5 + incomeScore * 0.2 + docScore * 0.3; break;
    case 'Thesis/Research Grant':
      prob = gwaScore * 0.5 + incomeScore * 0.15 + docScore * 0.35; break;
    default:
      prob = gwaScore * 0.35 + incomeScore * 0.35 + docScore * 0.3;
  }

  prob += (Math.random() - 0.5) * 0.2;
  prob = Math.max(0.1, Math.min(0.9, prob));

  return Math.random() < prob;
}

function randomDate(daysAgoMin, daysAgoMax) {
  const ms = randomInRange(daysAgoMin, daysAgoMax) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function generateExcel() {
  const MIN_APPS = 30;
  const MAX_APPS = 40;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ISKOlarship System';
  workbook.created = new Date();

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet 1: Scholarships
  // ═══════════════════════════════════════════════════════════════════════════
  const scholarshipsSheet = workbook.addWorksheet('Scholarships', {
    properties: { tabColor: { argb: 'FF4472C4' } }
  });

  scholarshipsSheet.columns = [
    { header: 'Scholarship Name', key: 'name', width: 70 },
    { header: 'Type', key: 'type', width: 25 },
    { header: 'Max GWA', key: 'maxGWA', width: 12 },
    { header: 'Max Annual Family Income (PHP)', key: 'maxIncome', width: 32 },
    { header: 'Eligible Colleges', key: 'eligibleColleges', width: 40 },
    { header: 'Eligible Classifications', key: 'eligibleClassifications', width: 35 },
    { header: 'Slots', key: 'slots', width: 10 },
    { header: 'Total Grant (PHP)', key: 'totalGrant', width: 20 },
    { header: 'Academic Year', key: 'academicYear', width: 16 },
    { header: 'Semester', key: 'semester', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

  scholarshipsSheet.getRow(1).eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  for (const s of scholarships) {
    scholarshipsSheet.addRow({
      name: s.name,
      type: s.type,
      maxGWA: s.maxGWA || 'N/A',
      maxIncome: s.maxIncome || 'N/A',
      eligibleColleges: s.eligibleColleges ? s.eligibleColleges.join(', ') : 'All',
      eligibleClassifications: s.eligibleClassifications ? s.eligibleClassifications.join(', ') : 'All',
      slots: s.slots,
      totalGrant: s.totalGrant,
      academicYear: '2025-2026',
      semester: 'First',
      status: 'active'
    });
  }

  scholarshipsSheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    if (rowNum % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet 2: Historical Applications
  // ═══════════════════════════════════════════════════════════════════════════
  const applicationsSheet = workbook.addWorksheet('Historical Applications', {
    properties: { tabColor: { argb: 'FF70AD47' } }
  });

  applicationsSheet.columns = [
    { header: 'Application #', key: 'appNum', width: 14 },
    { header: 'Scholarship Name', key: 'scholarshipName', width: 60 },
    { header: 'Scholarship Type', key: 'scholarshipType', width: 22 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Student Number', key: 'studentNumber', width: 16 },
    { header: 'First Name', key: 'firstName', width: 15 },
    { header: 'Last Name', key: 'lastName', width: 15 },
    { header: 'GWA', key: 'gwa', width: 8 },
    { header: 'Classification', key: 'classification', width: 16 },
    { header: 'College', key: 'college', width: 45 },
    { header: 'College Code', key: 'collegeCode', width: 14 },
    { header: 'Course', key: 'course', width: 35 },
    { header: 'Annual Family Income (PHP)', key: 'annualFamilyIncome', width: 28 },
    { header: 'ST Bracket', key: 'stBracket', width: 26 },
    { header: 'Units Enrolled', key: 'unitsEnrolled', width: 16 },
    { header: 'Units Passed', key: 'unitsPassed', width: 14 },
    { header: 'Province of Origin', key: 'provinceOfOrigin', width: 22 },
    { header: 'Citizenship', key: 'citizenship', width: 16 },
    { header: 'Household Size', key: 'householdSize', width: 16 },
    { header: 'Has Existing Scholarship', key: 'hasExistingScholarship', width: 24 },
    { header: 'Has Thesis Grant', key: 'hasThesisGrant', width: 18 },
    { header: 'Has Approved Thesis Outline', key: 'hasApprovedThesisOutline', width: 28 },
    { header: 'Has Disciplinary Action', key: 'hasDisciplinaryAction', width: 24 },
    { header: 'Has Failing Grade', key: 'hasFailingGrade', width: 18 },
    { header: 'Eligibility %', key: 'eligibilityPercentage', width: 14 },
    { header: 'Has Transcript', key: 'hasTranscript', width: 16 },
    { header: 'Has Income Certificate', key: 'hasIncomeCertificate', width: 22 },
    { header: 'Has Certificate of Registration', key: 'hasCertificateOfRegistration', width: 30 },
    { header: 'Submitted Date', key: 'submittedDate', width: 16 },
    { header: 'Decision Date', key: 'decisionDate', width: 16 },
    { header: 'Academic Year', key: 'academicYear', width: 16 },
    { header: 'Semester', key: 'semester', width: 12 },
    { header: 'Review Notes', key: 'reviewNotes', width: 50 },
  ];

  const appHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };

  applicationsSheet.getRow(1).eachCell(cell => {
    cell.fill = appHeaderFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  applicationsSheet.views = [{ state: 'frozen', ySplit: 1 }];

  let appCounter = 0;
  const summaryData = [];

  for (const scholarship of scholarships) {
    let approvedCount = 0;
    let rejectedCount = 0;
    const numApps = MIN_APPS + Math.floor(Math.random() * (MAX_APPS - MIN_APPS + 1));

    for (let i = 0; i < numApps; i++) {
      appCounter++;
      const student = generateStudentProfile(scholarship);
      const approved = shouldApprove(student, scholarship);
      const status = approved ? 'approved' : 'rejected';

      if (approved) approvedCount++;
      else rejectedCount++;

      const submittedDate = randomDate(30, 180);
      const decisionDate = randomDate(1, 29);
      const eligPct = approved
        ? Number(randomInRange(70, 100).toFixed(1))
        : Number(randomInRange(40, 80).toFixed(1));

      const row = applicationsSheet.addRow({
        appNum: appCounter,
        scholarshipName: scholarship.name,
        scholarshipType: scholarship.type,
        status,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        gwa: student.gwa,
        classification: student.classification,
        college: student.college,
        collegeCode: student.collegeCode,
        course: student.course,
        annualFamilyIncome: student.annualFamilyIncome,
        stBracket: student.stBracket,
        unitsEnrolled: student.unitsEnrolled,
        unitsPassed: student.unitsPassed,
        provinceOfOrigin: student.provinceOfOrigin,
        citizenship: student.citizenship,
        householdSize: student.householdSize,
        hasExistingScholarship: student.hasExistingScholarship ? 'Yes' : 'No',
        hasThesisGrant: student.hasThesisGrant ? 'Yes' : 'No',
        hasApprovedThesisOutline: student.hasApprovedThesisOutline ? 'Yes' : 'No',
        hasDisciplinaryAction: student.hasDisciplinaryAction ? 'Yes' : 'No',
        hasFailingGrade: student.hasFailingGrade ? 'Yes' : 'No',
        eligibilityPercentage: eligPct,
        hasTranscript: 'Yes',
        hasIncomeCertificate: Math.random() < 0.7 ? 'Yes' : 'No',
        hasCertificateOfRegistration: 'Yes',
        submittedDate: formatDate(submittedDate),
        decisionDate: formatDate(decisionDate),
        academicYear: '2025-2026',
        semester: randomPick(['First', 'Second']),
        reviewNotes: approved
          ? 'Applicant meets all requirements and shows strong academic potential.'
          : randomPick([
              'GWA does not meet minimum requirement.',
              'Family income exceeds the scholarship limit.',
              'Limited slots. Application not prioritized.',
              'Incomplete documentation submitted.',
              'Did not meet eligibility criteria.',
              'College/course not eligible for this scholarship.',
              'Classification does not match scholarship requirements.',
              'Province restriction not met.'
            ])
      });

      const statusCell = row.getCell('status');
      if (approved) {
        statusCell.font = { bold: true, color: { argb: 'FF006100' } };
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      } else {
        statusCell.font = { bold: true, color: { argb: 'FF9C0006' } };
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      }

      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle' };
      });
    }

    summaryData.push({
      name: scholarship.name,
      type: scholarship.type,
      approved: approvedCount,
      rejected: rejectedCount,
      total: numApps,
      approvalRate: Number(((approvedCount / numApps) * 100).toFixed(1))
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet 3: Summary / Analytics
  // ═══════════════════════════════════════════════════════════════════════════
  const summarySheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: 'FFED7D31' } }
  });

  summarySheet.columns = [
    { header: 'Scholarship Name', key: 'name', width: 70 },
    { header: 'Type', key: 'type', width: 25 },
    { header: 'Total Applications', key: 'total', width: 20 },
    { header: 'Approved', key: 'approved', width: 12 },
    { header: 'Rejected', key: 'rejected', width: 12 },
    { header: 'Approval Rate (%)', key: 'approvalRate', width: 18 },
  ];

  const summaryHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };

  summarySheet.getRow(1).eachCell(cell => {
    cell.fill = summaryHeaderFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  for (const s of summaryData) {
    const row = summarySheet.addRow(s);
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle' };
    });
  }

  const totalApproved = summaryData.reduce((sum, s) => sum + s.approved, 0);
  const totalRejected = summaryData.reduce((sum, s) => sum + s.rejected, 0);
  const totalAll = summaryData.reduce((sum, s) => sum + s.total, 0);
  const totalRow = summarySheet.addRow({
    name: 'TOTAL',
    type: '',
    total: totalAll,
    approved: totalApproved,
    rejected: totalRejected,
    approvalRate: Number(((totalApproved / totalAll) * 100).toFixed(1))
  });
  totalRow.font = { bold: true, size: 12 };
  totalRow.eachCell(cell => {
    cell.border = {
      top: { style: 'medium' }, left: { style: 'thin' },
      bottom: { style: 'medium' }, right: { style: 'thin' }
    };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
  });

  summarySheet.eachRow((row, rowNum) => {
    if (rowNum <= 1 || rowNum === summarySheet.rowCount) return;
    if (rowNum % 2 === 0) {
      row.eachCell(cell => {
        if (!cell.fill || cell.fill.fgColor?.argb !== 'FFFFF2CC') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Write the file
  // ═══════════════════════════════════════════════════════════════════════════
  const outputPath = path.join(__dirname, '..', '..', 'ISKOlarship_CSFA_Historical_Data.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log('════════════════════════════════════════════════════════════════');
  console.log('  ISKOlarship CSFA Historical Data - Excel Generated');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`\n📊 File: ${outputPath}`);
  console.log(`📝 CSFA Scholarships: ${scholarships.length}`);
  console.log(`📋 Total Applications: ${appCounter}`);
  console.log(`✅ Approved: ${totalApproved} (${((totalApproved / totalAll) * 100).toFixed(1)}%)`);
  console.log(`❌ Rejected: ${totalRejected} (${((totalRejected / totalAll) * 100).toFixed(1)}%)`);
  console.log('\nSheets:');
  console.log('  1. Scholarships              - 25 CSFA-administered scholarship definitions');
  console.log('  2. Historical Applications   - 30-40 apps per scholarship with applicant snapshots');
  console.log('  3. Summary                   - Approval/rejection stats per scholarship\n');
}

generateExcel().catch(err => {
  console.error('Error generating Excel:', err);
  process.exit(1);
});
