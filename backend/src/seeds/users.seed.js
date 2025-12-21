// =============================================================================
// ISKOlarship - User Seed Data
// Creates sample students and admin users for testing
// =============================================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { User, UserRole, YearLevel, UPLBCollege, STBracket, AdminAccessLevel } = require('../models/User.model');

// =============================================================================
// Sample UPLB Students (diverse profiles for testing filtering & predictions)
// =============================================================================

const studentsData = [
  // =========================================================================
  // HIGH-PERFORMING STUDENTS (University Scholar candidates)
  // =========================================================================
  {
    email: 'maria.santos@up.edu.ph',
    password: 'Student123!',
    firstName: 'Maria',
    lastName: 'Santos',
    middleName: 'Cruz',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2021-12345',
      course: 'BS Computer Science',
      college: UPLBCollege.CAS,
      yearLevel: YearLevel.JUNIOR,
      gwa: 1.15,
      totalUnitsEarned: 90,
      currentUnitsEnrolled: 18,
      stBracket: STBracket.BRACKET_E,
      annualFamilyIncome: 850000,
      province: 'Laguna',
      city: 'Los Baños',
      barangay: 'Batong Malake',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },
  {
    email: 'juan.delacruz@up.edu.ph',
    password: 'Student123!',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    middleName: 'Reyes',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2020-54321',
      course: 'BS Chemical Engineering',
      college: UPLBCollege.CEAT,
      yearLevel: YearLevel.SENIOR,
      gwa: 1.18,
      totalUnitsEarned: 120,
      currentUnitsEnrolled: 15,
      stBracket: STBracket.BRACKET_D,
      annualFamilyIncome: 600000,
      province: 'Batangas',
      city: 'Lipa',
      barangay: 'Marawoy',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: true
    }
  },
  {
    email: 'ana.garcia@up.edu.ph',
    password: 'Student123!',
    firstName: 'Ana',
    lastName: 'Garcia',
    middleName: 'Lopez',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2021-11111',
      course: 'BS Biology',
      college: UPLBCollege.CAS,
      yearLevel: YearLevel.JUNIOR,
      gwa: 1.22,
      totalUnitsEarned: 85,
      currentUnitsEnrolled: 18,
      stBracket: STBracket.BRACKET_C,
      annualFamilyIncome: 450000,
      province: 'Quezon',
      city: 'Lucena',
      barangay: 'Ibabang Dupay',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },

  // =========================================================================
  // COLLEGE SCHOLAR CANDIDATES (GWA 1.45-1.75)
  // =========================================================================
  {
    email: 'pedro.martinez@up.edu.ph',
    password: 'Student123!',
    firstName: 'Pedro',
    lastName: 'Martinez',
    middleName: 'Villanueva',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2022-22222',
      course: 'BS Economics',
      college: UPLBCollege.CEM,
      yearLevel: YearLevel.SOPHOMORE,
      gwa: 1.55,
      totalUnitsEarned: 45,
      currentUnitsEnrolled: 18,
      stBracket: STBracket.BRACKET_B,
      annualFamilyIncome: 280000,
      province: 'Laguna',
      city: 'Calamba',
      barangay: 'Real',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },
  {
    email: 'carla.fernandez@up.edu.ph',
    password: 'Student123!',
    firstName: 'Carla',
    lastName: 'Fernandez',
    middleName: 'Aquino',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2021-33333',
      course: 'BS Civil Engineering',
      college: UPLBCollege.CEAT,
      yearLevel: YearLevel.JUNIOR,
      gwa: 1.68,
      totalUnitsEarned: 78,
      currentUnitsEnrolled: 18,
      stBracket: STBracket.BRACKET_C,
      annualFamilyIncome: 380000,
      province: 'Cavite',
      city: 'Bacoor',
      barangay: 'Molino',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },

  // =========================================================================
  // NEED-BASED SCHOLARSHIP CANDIDATES (Low income, Full Discount)
  // =========================================================================
  {
    email: 'jose.ramos@up.edu.ph',
    password: 'Student123!',
    firstName: 'Jose',
    lastName: 'Ramos',
    middleName: 'Mendoza',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2023-44444',
      course: 'BS Agriculture',
      college: UPLBCollege.CAFS,
      yearLevel: YearLevel.FRESHMAN,
      gwa: 2.0,
      totalUnitsEarned: 21,
      currentUnitsEnrolled: 21,
      stBracket: STBracket.FULL_DISCOUNT,
      annualFamilyIncome: 95000,
      province: 'Laguna',
      city: 'Bay',
      barangay: 'Sta. Cruz',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },
  {
    email: 'rosa.villanueva@up.edu.ph',
    password: 'Student123!',
    firstName: 'Rosa',
    lastName: 'Villanueva',
    middleName: 'Bernardo',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2022-55555',
      course: 'BS Development Communication',
      college: UPLBCollege.CDC,
      yearLevel: YearLevel.SOPHOMORE,
      gwa: 1.85,
      totalUnitsEarned: 42,
      currentUnitsEnrolled: 18,
      stBracket: STBracket.FULL_DISCOUNT,
      annualFamilyIncome: 110000,
      province: 'Batangas',
      city: 'Tanauan',
      barangay: 'Poblacion',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },
  {
    email: 'miguel.torres@up.edu.ph',
    password: 'Student123!',
    firstName: 'Miguel',
    lastName: 'Torres',
    middleName: 'Perez',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2021-66666',
      course: 'BS Food Technology',
      college: UPLBCollege.CAFS,
      yearLevel: YearLevel.JUNIOR,
      gwa: 1.95,
      totalUnitsEarned: 81,
      currentUnitsEnrolled: 15,
      stBracket: STBracket.BRACKET_A,
      annualFamilyIncome: 150000,
      province: 'Laguna',
      city: 'San Pablo',
      barangay: 'San Roque',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },

  // =========================================================================
  // DOST SCHOLAR CANDIDATES
  // =========================================================================
  {
    email: 'lisa.reyes@up.edu.ph',
    password: 'Student123!',
    firstName: 'Lisa',
    lastName: 'Reyes',
    middleName: 'Castillo',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2022-77777',
      course: 'BS Statistics',
      college: UPLBCollege.CAS,
      yearLevel: YearLevel.SOPHOMORE,
      gwa: 1.45,
      totalUnitsEarned: 48,
      currentUnitsEnrolled: 18,
      stBracket: STBracket.BRACKET_C,
      annualFamilyIncome: 420000,
      province: 'Rizal',
      city: 'Antipolo',
      barangay: 'San Jose',
      hasExistingScholarship: true,
      existingScholarshipName: 'DOST-SEI Merit Scholar',
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },
  {
    email: 'mark.gonzales@up.edu.ph',
    password: 'Student123!',
    firstName: 'Mark',
    lastName: 'Gonzales',
    middleName: 'Aguilar',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2020-88888',
      course: 'BS Electrical Engineering',
      college: UPLBCollege.CEAT,
      yearLevel: YearLevel.SENIOR,
      gwa: 1.52,
      totalUnitsEarned: 130,
      currentUnitsEnrolled: 12,
      stBracket: STBracket.BRACKET_D,
      annualFamilyIncome: 520000,
      province: 'Quezon',
      city: 'Lucban',
      barangay: 'Samil',
      hasExistingScholarship: true,
      existingScholarshipName: 'DOST-SEI Merit Scholar',
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: true
    }
  },

  // =========================================================================
  // STUDENTS WITH CHALLENGES (for testing edge cases)
  // =========================================================================
  {
    email: 'kevin.cruz@up.edu.ph',
    password: 'Student123!',
    firstName: 'Kevin',
    lastName: 'Cruz',
    middleName: 'Santos',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2022-99999',
      course: 'BS Accountancy',
      college: UPLBCollege.CEM,
      yearLevel: YearLevel.SOPHOMORE,
      gwa: 2.8,
      totalUnitsEarned: 39,
      currentUnitsEnrolled: 15,
      stBracket: STBracket.BRACKET_B,
      annualFamilyIncome: 320000,
      province: 'Laguna',
      city: 'Sta. Rosa',
      barangay: 'Balibago',
      hasExistingScholarship: false,
      hasFailingGrade: true,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },
  {
    email: 'angela.lim@up.edu.ph',
    password: 'Student123!',
    firstName: 'Angela',
    lastName: 'Lim',
    middleName: 'Tan',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2021-10101',
      course: 'BS Human Ecology',
      college: UPLBCollege.CHE,
      yearLevel: YearLevel.JUNIOR,
      gwa: 2.35,
      totalUnitsEarned: 72,
      currentUnitsEnrolled: 18,
      stBracket: STBracket.BRACKET_C,
      annualFamilyIncome: 400000,
      province: 'Manila',
      city: 'Quezon City',
      barangay: 'Diliman',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: true,
      hasApprovedThesis: false
    }
  },

  // =========================================================================
  // SENIOR THESIS STUDENTS
  // =========================================================================
  {
    email: 'paulo.castro@up.edu.ph',
    password: 'Student123!',
    firstName: 'Paulo',
    lastName: 'Castro',
    middleName: 'Rivera',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2020-12121',
      course: 'BS Agricultural Biotechnology',
      college: UPLBCollege.CAFS,
      yearLevel: YearLevel.SENIOR,
      gwa: 1.72,
      totalUnitsEarned: 132,
      currentUnitsEnrolled: 9,
      stBracket: STBracket.BRACKET_C,
      annualFamilyIncome: 380000,
      province: 'Laguna',
      city: 'Los Baños',
      barangay: 'Anos',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: true,
      thesisTitle: 'Development of Drought-Resistant Rice Varieties Using CRISPR Technology'
    }
  },
  {
    email: 'diana.morales@up.edu.ph',
    password: 'Student123!',
    firstName: 'Diana',
    lastName: 'Morales',
    middleName: 'Bautista',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2020-13131',
      course: 'BS Chemistry',
      college: UPLBCollege.CAS,
      yearLevel: YearLevel.SENIOR,
      gwa: 1.38,
      totalUnitsEarned: 128,
      currentUnitsEnrolled: 12,
      stBracket: STBracket.BRACKET_D,
      annualFamilyIncome: 550000,
      province: 'Batangas',
      city: 'Batangas City',
      barangay: 'Kumintang Ibaba',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: true,
      thesisTitle: 'Synthesis of Novel Antimicrobial Compounds from Philippine Medicinal Plants'
    }
  },

  // =========================================================================
  // MORE DIVERSE STUDENT PROFILES
  // =========================================================================
  {
    email: 'gabriel.luna@up.edu.ph',
    password: 'Student123!',
    firstName: 'Gabriel',
    lastName: 'Luna',
    middleName: 'Soriano',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2023-14141',
      course: 'BS Applied Mathematics',
      college: UPLBCollege.CAS,
      yearLevel: YearLevel.FRESHMAN,
      gwa: 1.65,
      totalUnitsEarned: 24,
      currentUnitsEnrolled: 21,
      stBracket: STBracket.BRACKET_B,
      annualFamilyIncome: 240000,
      province: 'Laguna',
      city: 'Biñan',
      barangay: 'Dela Paz',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },
  {
    email: 'sophia.mendez@up.edu.ph',
    password: 'Student123!',
    firstName: 'Sophia',
    lastName: 'Mendez',
    middleName: 'Ocampo',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2022-15151',
      course: 'BS Forestry',
      college: UPLBCollege.CFNR,
      yearLevel: YearLevel.SOPHOMORE,
      gwa: 1.88,
      totalUnitsEarned: 45,
      currentUnitsEnrolled: 18,
      stBracket: STBracket.BRACKET_A,
      annualFamilyIncome: 180000,
      province: 'Laguna',
      city: 'Pagsanjan',
      barangay: 'Biñan',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },
  {
    email: 'rafael.santos@up.edu.ph',
    password: 'Student123!',
    firstName: 'Rafael',
    lastName: 'Santos',
    middleName: 'Dizon',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2021-16161',
      course: 'Doctor of Veterinary Medicine',
      college: UPLBCollege.CVM,
      yearLevel: YearLevel.JUNIOR,
      gwa: 1.92,
      totalUnitsEarned: 95,
      currentUnitsEnrolled: 21,
      stBracket: STBracket.BRACKET_C,
      annualFamilyIncome: 420000,
      province: 'Cavite',
      city: 'Tagaytay',
      barangay: 'Maharlika',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: false
    }
  },
  {
    email: 'patricia.yap@up.edu.ph',
    password: 'Student123!',
    firstName: 'Patricia',
    lastName: 'Yap',
    middleName: 'Chua',
    role: UserRole.STUDENT,
    studentProfile: {
      studentNumber: '2020-17171',
      course: 'BS Agribusiness Economics',
      college: UPLBCollege.CEM,
      yearLevel: YearLevel.SENIOR,
      gwa: 1.78,
      totalUnitsEarned: 125,
      currentUnitsEnrolled: 12,
      stBracket: STBracket.BRACKET_E,
      annualFamilyIncome: 900000,
      province: 'Metro Manila',
      city: 'Makati',
      barangay: 'San Lorenzo',
      hasExistingScholarship: false,
      hasFailingGrade: false,
      hasDisciplinaryAction: false,
      hasApprovedThesis: true,
      thesisTitle: 'Value Chain Analysis of Organic Vegetables in Benguet'
    }
  }
];

// =============================================================================
// Admin Users
// =============================================================================

const adminsData = [
  {
    email: 'admin@up.edu.ph',
    password: 'Admin123!',
    firstName: 'System',
    lastName: 'Administrator',
    role: UserRole.ADMIN,
    adminProfile: {
      employeeId: 'UPLB-001',
      department: 'Office of Student Services',
      position: 'System Administrator',
      accessLevel: AdminAccessLevel.UNIVERSITY,
      permissions: [
        'manage_scholarships',
        'manage_users',
        'approve_applications',
        'view_reports',
        'manage_system'
      ]
    }
  },
  {
    email: 'osg.staff@up.edu.ph',
    password: 'Staff123!',
    firstName: 'OSG',
    lastName: 'Staff',
    role: UserRole.ADMIN,
    adminProfile: {
      employeeId: 'OSG-001',
      department: 'Office of Scholarships and Grants',
      position: 'Scholarship Coordinator',
      accessLevel: AdminAccessLevel.UNIVERSITY,
      permissions: [
        'manage_scholarships',
        'approve_applications',
        'view_reports'
      ]
    }
  },
  {
    email: 'cas.coordinator@up.edu.ph',
    password: 'Coord123!',
    firstName: 'CAS',
    lastName: 'Coordinator',
    role: UserRole.ADMIN,
    adminProfile: {
      employeeId: 'CAS-001',
      department: 'College of Arts and Sciences',
      position: 'College Scholarship Coordinator',
      accessLevel: AdminAccessLevel.COLLEGE,
      permissions: [
        'manage_scholarships',
        'approve_applications',
        'view_reports'
      ]
    }
  }
];

// =============================================================================
// Seed Function
// =============================================================================

const seedUsers = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    console.log('🗑️  Clearing existing users...');
    await User.deleteMany({});
    console.log('✅ Cleared existing users');

    // Hash passwords and prepare users
    console.log('🔐 Hashing passwords...');
    const salt = await bcrypt.genSalt(10);

    const preparedStudents = await Promise.all(
      studentsData.map(async (student) => ({
        ...student,
        password: await bcrypt.hash(student.password, salt)
      }))
    );

    const preparedAdmins = await Promise.all(
      adminsData.map(async (admin) => ({
        ...admin,
        password: await bcrypt.hash(admin.password, salt)
      }))
    );

    // Insert students
    console.log('👨‍🎓 Inserting students...');
    const studentsResult = await User.insertMany(preparedStudents);
    console.log(`✅ Successfully inserted ${studentsResult.length} students`);

    // Insert admins
    console.log('👤 Inserting admins...');
    const adminsResult = await User.insertMany(preparedAdmins);
    console.log(`✅ Successfully inserted ${adminsResult.length} admins`);

    // Summary
    console.log('\n📊 User Summary:');
    console.log(`   Students: ${studentsResult.length}`);
    console.log(`   Admins: ${adminsResult.length}`);
    console.log(`   Total: ${studentsResult.length + adminsResult.length}`);

    // College distribution
    console.log('\n🏛️  Students by College:');
    const collegeStats = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$studentProfile.college', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    collegeStats.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    console.log('\n🎉 User seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the seed
seedUsers();
