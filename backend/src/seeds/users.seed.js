// =============================================================================
// ISKOlarship - Users Seed Data
// Based on ERD from research paper
// Contains realistic student data for testing rule-based filtering
// =============================================================================

const bcrypt = require('bcryptjs');
const {
  UPLBCollege,
  UPLBCourse,
  Classification,
  Citizenship,
  STBracket,
  PhilippineProvinces
} = require('../models/User.model');

// =============================================================================
// Admin Users
// =============================================================================

const adminUsers = [
  {
    email: 'admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Maria',
      lastName: 'Santos',
      department: 'Office of Student Affairs',
      accessLevel: 'university'  // Highest level - university-wide access
    }
  },
  {
    email: 'osfa.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Jose',
      lastName: 'Reyes',
      department: 'Office of Scholarships and Financial Assistance',
      accessLevel: 'university'  // University level for OSFA
    }
  },
  {
    email: 'cafs.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Elena',
      lastName: 'Cruz',
      department: 'College of Agriculture and Food Science',
      accessLevel: 'college'  // College level access
    }
  }
];

// =============================================================================
// Helper Functions
// =============================================================================

// Generate student number
const generateStudentNumber = (year, index) => {
  const yearPart = year.toString();
  const indexPart = (index + 1).toString().padStart(5, '0');
  return `${yearPart}-${indexPart}`;
};

// Random from array
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Random number in range
const randomBetween = (min, max) => Math.random() * (max - min) + min;

// Round GWA to 2 decimal places
const roundGWA = (gwa) => Math.round(gwa * 100) / 100;

// Generate random units based on classification
const getUnitsForClassification = (classification) => {
  switch (classification) {
    case Classification.INCOMING_FRESHMAN: return 0;
    case Classification.FRESHMAN: return Math.floor(randomBetween(15, 30));
    case Classification.SOPHOMORE: return Math.floor(randomBetween(31, 60));
    case Classification.JUNIOR: return Math.floor(randomBetween(61, 100));
    case Classification.SENIOR: return Math.floor(randomBetween(101, 150));
    case Classification.GRADUATE: return Math.floor(randomBetween(150, 180));
    default: return 0;
  }
};

// =============================================================================
// Course Mappings by College
// =============================================================================

const coursesByCollege = {
  [UPLBCollege.CAFS]: [
    'BS Agriculture',
    'BS Agricultural Biotechnology',
    'BS Agricultural Chemistry',
    'BS Food Technology'
  ],
  [UPLBCollege.CAS]: [
    'BS Biology',
    'BS Chemistry',
    'BS Mathematics',
    'BS Applied Mathematics',
    'BS Statistics',
    'BS Computer Science',
    'BS Applied Physics'
  ],
  [UPLBCollege.CDC]: [
    'BS Human Ecology',
    'BS Development Communication'
  ],
  [UPLBCollege.CEAT]: [
    'BS Civil Engineering',
    'BS Chemical Engineering',
    'BS Electrical Engineering',
    'BS Mechanical Engineering',
    'BS Agricultural and Biosystems Engineering',
    'BS Computer Engineering'
  ],
  [UPLBCollege.CEM]: [
    'BS Economics',
    'BS Agricultural Economics',
    'BS Agribusiness Management',
    'BS Accountancy'
  ],
  [UPLBCollege.CFNR]: [
    'BS Forestry',
    'BS Geo-informatics'
  ],
  [UPLBCollege.CHE]: [
    'BS Nutrition',
    'BS Food Science',
    'BS Family Life and Child Development'
  ],
  [UPLBCollege.CVM]: [
    'Doctor of Veterinary Medicine'
  ],
  [UPLBCollege.GRADUATE]: [
    'MS Biology',
    'MS Chemistry',
    'MS Agriculture',
    'PhD Forestry'
  ]
};

// =============================================================================
// Major Mappings (for specific courses)
// =============================================================================

const majorsByCourse = {
  'BS Agriculture': ['Animal Science', 'Crop Science', 'Entomology', 'Plant Pathology', 'Weed Science', 'Horticulture', 'Soil Science'],
  'BS Biology': ['Cell Biology', 'Ecology', 'Genetics', 'Microbiology', 'Zoology'],
  'BS Mathematics and Science Teaching': ['Biology', 'Chemistry', 'Mathematics', 'Physics'],
  'BS Forestry': ['Forest Resources Management', 'Social Forestry'],
  'BS Nutrition': ['Clinical Nutrition', 'Community Nutrition']
};

// =============================================================================
// Filipino Names
// =============================================================================

const firstNames = [
  'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Carlos', 'Elena',
  'Miguel', 'Sofia', 'Antonio', 'Isabella', 'Francisco', 'Gabriela', 'Manuel',
  'Carmen', 'Rafael', 'Patricia', 'Fernando', 'Andrea', 'Ricardo', 'Beatriz',
  'Eduardo', 'Cristina', 'Luis', 'Daniela', 'Marco', 'Victoria', 'Pablo',
  'Angelica', 'Diego', 'Maricel', 'Adrian', 'Jasmine', 'Benedict', 'Kate',
  'Christian', 'Nicole', 'Daniel', 'Samantha', 'Elijah', 'Trisha', 'Gabriel',
  'Bianca', 'Joshua', 'Clarisse', 'Kevin', 'Diana', 'Mark', 'Erica',
  'Nathan', 'Frances', 'Oliver', 'Grace', 'Patrick', 'Hannah', 'Quincy',
  'Irene', 'Ryan', 'Julia', 'Stephen', 'Katrina', 'Timothy', 'Liza',
  'Vincent', 'Monica', 'William', 'Nina', 'Xavier', 'Olivia', 'Zachary', 'Paula'
];

const lastNames = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Aquino', 'Garcia', 'Mendoza',
  'Torres', 'Gonzales', 'Ramos', 'Fernandez', 'Lopez', 'Martinez', 'Perez',
  'Rivera', 'Villanueva', 'Dela Cruz', 'Del Rosario', 'Castillo', 'Soriano',
  'Tan', 'Lim', 'Chua', 'Sy', 'Ong', 'Go', 'Co', 'Yap', 'Ang', 'Lee',
  'Hernandez', 'Francisco', 'Pascual', 'Diaz', 'Castro', 'Mercado', 'Salvador',
  'Ignacio', 'Manalo', 'Navarro', 'Aguilar', 'Santiago', 'Valdez', 'Morales',
  'Padilla', 'Salazar', 'Domingo', 'Flores', 'Luna', 'Medina'
];

const middleNames = [
  'Andres', 'Bernardo', 'Carlos', 'David', 'Enrique', 'Felix', 'Gregorio',
  'Hernando', 'Ignacio', 'Jorge', 'Lorenzo', 'Miguel', 'Nicolas', 'Oscar',
  'Pablo', 'Ramon', 'Salvador', 'Teodoro', 'Vicente', 'Alejandro',
  'Maria', 'Ana', 'Rosa', 'Elena', 'Sofia', 'Isabel', 'Carmen', 'Lucia',
  'Teresa', 'Angela', 'Rosario', 'Concepcion', 'Esperanza', 'Pilar'
];

// =============================================================================
// Address Templates
// =============================================================================

const barangays = [
  'Barangay 1', 'Barangay 2', 'Barangay 3', 'Poblacion', 'San Jose',
  'San Antonio', 'San Miguel', 'Santo Niño', 'Bagong Silang', 'Maligaya',
  'Mabuhay', 'Masagana', 'Masaya', 'Maginhawa', 'Mapayapa'
];

const cities = [
  'Los Baños', 'Calamba', 'San Pablo', 'Bay', 'Santa Cruz',
  'Biñan', 'Cabuyao', 'Victoria', 'Pila', 'Calauan'
];

const generateAddress = (province) => {
  const number = Math.floor(Math.random() * 500) + 1;
  const streetName = randomFrom(['Rizal', 'Mabini', 'Bonifacio', 'Luna', 'Aguinaldo', 'Quezon', 'Laurel']);
  const street = `${number} ${streetName} Street`;
  const barangay = randomFrom(barangays);
  const city = province === 'Laguna' ? randomFrom(cities) : `${province} City`;
  const zipCode = String(Math.floor(Math.random() * 9000) + 1000);
  
  return {
    street,
    barangay,
    city,
    province,
    zipCode,
    fullAddress: `${street}, ${barangay}, ${city}, ${province} ${zipCode}`
  };
};

// =============================================================================
// Generate 50+ Student Users
// =============================================================================

const generateStudentData = () => {
  const students = [];
  const baseYear = 2021;
  
  // Distribution of students across classifications
  const classificationDistribution = [
    { classification: Classification.FRESHMAN, count: 8 },
    { classification: Classification.SOPHOMORE, count: 12 },
    { classification: Classification.JUNIOR, count: 15 },
    { classification: Classification.SENIOR, count: 15 },
    { classification: Classification.GRADUATE, count: 5 }
  ];

  let studentIndex = 0;

  classificationDistribution.forEach(({ classification, count }) => {
    for (let i = 0; i < count; i++) {
      // Determine year based on classification
      let enrollmentYear;
      switch (classification) {
        case Classification.FRESHMAN: enrollmentYear = 2024; break;
        case Classification.SOPHOMORE: enrollmentYear = 2023; break;
        case Classification.JUNIOR: enrollmentYear = 2022; break;
        case Classification.SENIOR: enrollmentYear = 2021; break;
        case Classification.GRADUATE: enrollmentYear = 2020; break;
        default: enrollmentYear = 2023;
      }

      // Select college and course
      const college = randomFrom(Object.values(UPLBCollege).filter(c => c !== UPLBCollege.GRADUATE));
      const coursesForCollege = coursesByCollege[college] || ['BS Agriculture'];
      const course = randomFrom(coursesForCollege);
      
      // Determine major if applicable
      const majors = majorsByCourse[course];
      const major = majors ? randomFrom(majors) : null;

      // Generate GWA (realistic distribution - most students between 1.5-2.5)
      const gwaDistribution = Math.random();
      let gwa;
      if (gwaDistribution < 0.15) {
        gwa = roundGWA(randomBetween(1.0, 1.5)); // Dean's lister
      } else if (gwaDistribution < 0.5) {
        gwa = roundGWA(randomBetween(1.51, 2.0)); // Above average
      } else if (gwaDistribution < 0.85) {
        gwa = roundGWA(randomBetween(2.01, 2.5)); // Average
      } else {
        gwa = roundGWA(randomBetween(2.51, 3.0)); // Below average
      }

      // Generate income (realistic distribution)
      const incomeDistribution = Math.random();
      let familyIncome;
      if (incomeDistribution < 0.25) {
        familyIncome = Math.floor(randomBetween(50000, 150000)); // Low income
      } else if (incomeDistribution < 0.55) {
        familyIncome = Math.floor(randomBetween(150001, 250000)); // Lower middle
      } else if (incomeDistribution < 0.8) {
        familyIncome = Math.floor(randomBetween(250001, 400000)); // Middle
      } else {
        familyIncome = Math.floor(randomBetween(400001, 800000)); // Upper middle
      }

      // Determine ST Bracket based on income
      let stBracket;
      if (familyIncome <= 100000) {
        stBracket = STBracket.FULL_DISCOUNT_WITH_STIPEND;
      } else if (familyIncome <= 150000) {
        stBracket = STBracket.FULL_DISCOUNT;
      } else if (familyIncome <= 200000) {
        stBracket = STBracket.PD80;
      } else if (familyIncome <= 300000) {
        stBracket = STBracket.PD60;
      } else if (familyIncome <= 400000) {
        stBracket = STBracket.PD40;
      } else if (familyIncome <= 500000) {
        stBracket = STBracket.PD20;
      } else {
        stBracket = STBracket.NO_DISCOUNT;
      }

      // Select province with some bias toward specific provinces for location-based scholarships
      let province;
      const provinceRandom = Math.random();
      if (provinceRandom < 0.1) {
        province = 'Laguna'; // Local students
      } else if (provinceRandom < 0.15) {
        province = 'Ilocos Sur'; // For Dr. Tuazon scholarship
      } else if (provinceRandom < 0.2) {
        province = 'Sorsogon'; // For Dr. Ables scholarship
      } else if (provinceRandom < 0.25) {
        province = 'Camarines Sur'; // For Dr. Ables scholarship
      } else {
        province = randomFrom(PhilippineProvinces);
      }

      // Names
      const firstName = randomFrom(firstNames);
      const lastName = randomFrom(lastNames);
      const middleName = randomFrom(middleNames);

      // Scholarship eligibility flags (only essential ones)
      const hasDisciplinaryAction = Math.random() < 0.05; // 5% have disciplinary issues
      const hasExistingScholarship = Math.random() < 0.2; // 20% have other scholarships
      
      // Generate householdSize (realistic distribution)
      const householdSize = Math.floor(randomBetween(3, 8));
      
      // Generate contact number
      const contactNumber = `+639${Math.floor(Math.random() * 900000000 + 100000000)}`;

      // Thesis grant (for seniors only)
      const hasThesisGrant = classification === Classification.SENIOR && Math.random() < 0.3;

      students.push({
        email: `student${studentIndex + 1}@up.edu.ph`,
        role: 'student',
        isActive: true,
        isEmailVerified: true,
        studentProfile: {
          studentNumber: generateStudentNumber(enrollmentYear, studentIndex),
          firstName,
          lastName,
          middleName,
          suffix: Math.random() < 0.05 ? randomFrom(['Jr.', 'II', 'III']) : null,
          homeAddress: generateAddress(province),
          provinceOfOrigin: province,
          college,
          course,
          major,
          classification,
          gwa,
          unitsEnrolled: Math.floor(randomBetween(15, 21)),
          unitsPassed: getUnitsForClassification(classification),
          annualFamilyIncome: familyIncome,
          householdSize,
          contactNumber,
          stBracket,
          citizenship: Citizenship.FILIPINO,
          hasDisciplinaryAction,
          hasExistingScholarship,
          hasThesisGrant,
          isGraduating: classification === Classification.SENIOR && Math.random() < 0.7
        }
      });

      studentIndex++;
    }
  });

  // Add specific students to ensure scholarship eligibility testing
  
  // Student eligible for Sterix HOPE Thesis Grant
  students.push({
    email: 'sterix.eligible@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2021-00100',
      firstName: 'Angela',
      lastName: 'Reyes',
      middleName: 'Maria',
      homeAddress: {
        street: '123 University Ave',
        barangay: 'Anos',
        city: 'Los Baños',
        province: 'Laguna',
        zipCode: '4030',
        fullAddress: '123 University Ave, Anos, Los Baños, Laguna 4030'
      },
      provinceOfOrigin: 'Laguna',
      college: UPLBCollege.CAS,
      course: 'BS Biology',
      major: 'Entomology',
      classification: Classification.SENIOR,
      gwa: 1.85,
      unitsEnrolled: 18,
      unitsPassed: 120,
      annualFamilyIncome: 180000,
      householdSize: 5,
      contactNumber: '+639171234567',
      stBracket: STBracket.PD80,
      citizenship: Citizenship.FILIPINO,
,
      hasThesisGrant: false,
      isGraduating: true,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: false
    }
  });

  // Student eligible for Dr. Tuazon Scholarship (Chemistry, Ilocos Sur)
  students.push({
    email: 'tuazon.eligible@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2022-00101',
      firstName: 'Roberto',
      lastName: 'Valdez',
      middleName: 'Jose',
      homeAddress: {
        street: '456 Rizal Street',
        barangay: 'Poblacion',
        city: 'Vigan',
        province: 'Ilocos Sur',
        zipCode: '2700',
        fullAddress: '456 Rizal Street, Poblacion, Vigan, Ilocos Sur 2700'
      },
      provinceOfOrigin: 'Ilocos Sur',
      college: UPLBCollege.CAS,
      course: 'BS Chemistry',
      classification: Classification.JUNIOR,
      gwa: 2.15,
      unitsEnrolled: 18,
      unitsPassed: 85,
      annualFamilyIncome: 120000,
      householdSize: 6,
      contactNumber: '+639181234568',
      stBracket: STBracket.FULL_DISCOUNT,
      citizenship: Citizenship.FILIPINO,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: false
    }
  });

  // Student eligible for Dr. Ables Scholarship (Sorsogon)
  students.push({
    email: 'ables.eligible@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2023-00102',
      firstName: 'Marisa',
      lastName: 'Espinosa',
      middleName: 'Carmen',
      homeAddress: {
        street: '789 Bonifacio Street',
        barangay: 'Polvorista',
        city: 'Sorsogon City',
        province: 'Sorsogon',
        zipCode: '4700',
        fullAddress: '789 Bonifacio Street, Polvorista, Sorsogon City, Sorsogon 4700'
      },
      provinceOfOrigin: 'Sorsogon',
      college: UPLBCollege.CEAT,
      course: 'BS Civil Engineering',
      classification: Classification.SOPHOMORE,
      gwa: 1.95,
      unitsEnrolled: 21,
      unitsPassed: 45,
      annualFamilyIncome: 130000,
      householdSize: 4,
      contactNumber: '+639191234569',
      stBracket: STBracket.FULL_DISCOUNT,
      citizenship: Citizenship.FILIPINO,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: false
    }
  });

  // Student eligible for BASF Scholarship (Agriculture Crop Protection Sophomore)
  students.push({
    email: 'basf.eligible@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2023-00103',
      firstName: 'Jerome',
      lastName: 'Santos',
      middleName: 'Miguel',
      homeAddress: {
        street: '321 Luna Street',
        barangay: 'Poblacion',
        city: 'Batangas City',
        province: 'Batangas',
        zipCode: '4200',
        fullAddress: '321 Luna Street, Poblacion, Batangas City, Batangas 4200'
      },
      provinceOfOrigin: 'Batangas',
      college: UPLBCollege.CAFS,
      course: 'BS Agriculture',
      major: 'Entomology',
      classification: Classification.SOPHOMORE,
      gwa: 1.75,
      unitsEnrolled: 18,
      unitsPassed: 38,
      annualFamilyIncome: 280000,
      householdSize: 5,
      contactNumber: '+639201234570',
      stBracket: STBracket.PD60,
      citizenship: Citizenship.FILIPINO,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: false
    }
  });

  // Student eligible for CHE Alumni Thesis Grant
  students.push({
    email: 'che.eligible@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2021-00104',
      firstName: 'Patricia',
      lastName: 'Fernandez',
      middleName: 'Elena',
      homeAddress: {
        street: '555 Mabini Street',
        barangay: 'Poblacion',
        city: 'Calamba',
        province: 'Laguna',
        zipCode: '4027',
        fullAddress: '555 Mabini Street, Poblacion, Calamba, Laguna 4027'
      },
      provinceOfOrigin: 'Laguna',
      college: UPLBCollege.CHE,
      course: 'BS Nutrition',
      classification: Classification.SENIOR,
      gwa: 1.65,
      unitsEnrolled: 15,
      unitsPassed: 135,
      annualFamilyIncome: 95000,
      householdSize: 7,
      contactNumber: '+639211234571',
      stBracket: STBracket.FULL_DISCOUNT_WITH_STIPEND,
      citizenship: Citizenship.FILIPINO,
,
      hasThesisGrant: false,
      isGraduating: true,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: false
    }
  });

  // Student eligible for DOST-SEI (High GWA in Science course)
  students.push({
    email: 'dost.eligible@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2024-00105',
      firstName: 'Gabriel',
      lastName: 'Aquino',
      middleName: 'Rafael',
      homeAddress: {
        street: '888 Quezon Street',
        barangay: 'San Antonio',
        city: 'Makati',
        province: 'Metro Manila',
        zipCode: '1200',
        fullAddress: '888 Quezon Street, San Antonio, Makati, Metro Manila 1200'
      },
      provinceOfOrigin: 'Metro Manila',
      college: UPLBCollege.CAS,
      course: 'BS Computer Science',
      classification: Classification.FRESHMAN,
      gwa: 1.25,
      unitsEnrolled: 18,
      unitsPassed: 18,
      annualFamilyIncome: 350000,
      householdSize: 4,
      contactNumber: '+639221234572',
      stBracket: STBracket.PD40,
      citizenship: Citizenship.FILIPINO,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: false
    }
  });

  // Student eligible for CDO Odyssey (Forestry Junior)
  students.push({
    email: 'cdo.eligible@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2022-00106',
      firstName: 'Marco',
      lastName: 'Villanueva',
      middleName: 'Antonio',
      homeAddress: {
        street: '777 Laurel Street',
        barangay: 'Carmen',
        city: 'Cagayan de Oro',
        province: 'Misamis Oriental',
        zipCode: '9000',
        fullAddress: '777 Laurel Street, Carmen, Cagayan de Oro, Misamis Oriental 9000'
      },
      provinceOfOrigin: 'Misamis Oriental',
      college: UPLBCollege.CFNR,
      course: 'BS Forestry',
      classification: Classification.JUNIOR,
      gwa: 2.35,
      unitsEnrolled: 18,
      unitsPassed: 75,
      annualFamilyIncome: 200000,
      householdSize: 5,
      contactNumber: '+639231234573',
      stBracket: STBracket.PD80,
      citizenship: Citizenship.FILIPINO,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: false
    }
  });

  // Student eligible for IMS Program (Math Junior)
  students.push({
    email: 'ims.eligible@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2022-00107',
      firstName: 'Sophia',
      lastName: 'Tan',
      middleName: 'Grace',
      homeAddress: {
        street: '444 Aguinaldo Street',
        barangay: 'Diliman',
        city: 'Quezon City',
        province: 'Metro Manila',
        zipCode: '1100',
        fullAddress: '444 Aguinaldo Street, Diliman, Quezon City, Metro Manila 1100'
      },
      provinceOfOrigin: 'Metro Manila',
      college: UPLBCollege.CAS,
      course: 'BS Applied Mathematics',
      classification: Classification.JUNIOR,
      gwa: 1.55,
      unitsEnrolled: 18,
      unitsPassed: 80,
      annualFamilyIncome: 140000,
      householdSize: 6,
      contactNumber: '+639241234574',
      stBracket: STBracket.FULL_DISCOUNT,
      citizenship: Citizenship.FILIPINO,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: false
    }
  });

  // Student with failing grades (should be ineligible for most)
  students.push({
    email: 'failing.student@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2022-00108',
      firstName: 'Paulo',
      lastName: 'Mendoza',
      middleName: 'Jose',
      homeAddress: {
        street: '999 Test Street',
        barangay: 'Batong Malake',
        city: 'Los Baños',
        province: 'Laguna',
        zipCode: '4030',
        fullAddress: '999 Test Street, Batong Malake, Los Baños, Laguna 4030'
      },
      provinceOfOrigin: 'Laguna',
      college: UPLBCollege.CAFS,
      course: 'BS Agriculture',
      major: 'Animal Science',
      classification: Classification.JUNIOR,
      gwa: 2.85,
      unitsEnrolled: 15,
      unitsPassed: 60,
      annualFamilyIncome: 180000,
      householdSize: 5,
      contactNumber: '+639251234575',
      stBracket: STBracket.PD80,
      citizenship: Citizenship.FILIPINO,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: false
    }
  });

  // Student with existing scholarship (should be ineligible for exclusive ones)
  students.push({
    email: 'has.scholarship@up.edu.ph',
    role: 'student',
    isActive: true,
    isEmailVerified: true,
    studentProfile: {
      studentNumber: '2021-00109',
      firstName: 'Diana',
      lastName: 'Garcia',
      middleName: 'Marie',
      homeAddress: {
        street: '111 Scholar Street',
        barangay: 'Mayondon',
        city: 'Los Baños',
        province: 'Laguna',
        zipCode: '4030',
        fullAddress: '111 Scholar Street, Mayondon, Los Baños, Laguna 4030'
      },
      provinceOfOrigin: 'Laguna',
      college: UPLBCollege.CAS,
      course: 'BS Biology',
      classification: Classification.SENIOR,
      gwa: 1.45,
      unitsEnrolled: 18,
      unitsPassed: 125,
      annualFamilyIncome: 200000,
      householdSize: 4,
      contactNumber: '+639261234576',
      stBracket: STBracket.PD80,
      citizenship: Citizenship.FILIPINO,
,
,
,
,
      hasDisciplinaryAction: false,
      hasExistingScholarship: true
    }
  });

  return students;
};

// =============================================================================
// Seed Function
// =============================================================================

const seedUsers = async (User) => {
  try {
    await User.deleteMany({});
    console.log('Cleared existing users');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin users
    const adminsWithPassword = adminUsers.map(admin => ({
      ...admin,
      password: hashedPassword
    }));

    // Create student users
    const studentsData = generateStudentData();
    const studentsWithPassword = studentsData.map(student => ({
      ...student,
      password: hashedPassword
    }));

    const allUsers = [...adminsWithPassword, ...studentsWithPassword];
    const insertedUsers = await User.insertMany(allUsers);

    console.log(`Inserted ${insertedUsers.length} users (${adminsWithPassword.length} admins, ${studentsWithPassword.length} students)`);

    // Find and return admin user for scholarship seeding
    const adminUser = insertedUsers.find(u => u.role === 'admin');
    const studentUsers = insertedUsers.filter(u => u.role === 'student');

    return {
      adminUser,
      studentUsers,
      allUsers: insertedUsers
    };
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

module.exports = {
  adminUsers,
  generateStudentData,
  seedUsers
};
