// =============================================================================
// ISKOlarship - Scoped Admin Users Seed Data
// Admins at different access levels for testing admin scope filtering
// University, College, Academic Unit levels
// =============================================================================

const bcrypt = require('bcryptjs');
const { UPLBCollege } = require('../models/User.model');

// =============================================================================
// Admin Users at Different Access Levels
// Note: These use unique emails to avoid conflicts with legacy admin seeds
// =============================================================================

const scopedAdminUsers = [
  // =========================================================================
  // UNIVERSITY LEVEL ADMINS - Can see ALL scholarships
  // =========================================================================
  {
    email: 'univ.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Maria',
      lastName: 'Santos',
      department: 'Office of Student Affairs',
      accessLevel: 'university',
      collegeCode: null,
      college: null,
      academicUnitCode: null,
      academicUnit: null
    }
  },
  {
    email: 'osfa.university@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Jose',
      lastName: 'Reyes',
      department: 'Office of Scholarships and Financial Assistance',
      accessLevel: 'university',
      collegeCode: null,
      college: null,
      academicUnitCode: null,
      academicUnit: null
    }
  },

  // =========================================================================
  // COLLEGE LEVEL ADMINS - See only college-level scholarships for their college
  // =========================================================================
  
  // CAS - College of Arts and Sciences
  {
    email: 'cas.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Elena',
      lastName: 'Cruz',
      department: 'College of Arts and Sciences',
      accessLevel: 'college',
      collegeCode: 'CAS',
      college: UPLBCollege.CAS,
      academicUnitCode: null,
      academicUnit: null
    }
  },

  // CEAT - College of Engineering and Agro-Industrial Technology
  {
    email: 'ceat.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Roberto',
      lastName: 'Mendoza',
      department: 'College of Engineering and Agro-Industrial Technology',
      accessLevel: 'college',
      collegeCode: 'CEAT',
      college: UPLBCollege.CEAT,
      academicUnitCode: null,
      academicUnit: null
    }
  },

  // CAFS - College of Agriculture and Food Science
  {
    email: 'cafs.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Ana',
      lastName: 'Garcia',
      department: 'College of Agriculture and Food Science',
      accessLevel: 'college',
      collegeCode: 'CAFS',
      college: UPLBCollege.CAFS,
      academicUnitCode: null,
      academicUnit: null
    }
  },

  // CEM - College of Economics and Management
  {
    email: 'cem.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Carlos',
      lastName: 'Torres',
      department: 'College of Economics and Management',
      accessLevel: 'college',
      collegeCode: 'CEM',
      college: UPLBCollege.CEM,
      academicUnitCode: null,
      academicUnit: null
    }
  },

  // CFNR - College of Forestry and Natural Resources
  {
    email: 'cfnr.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Patricia',
      lastName: 'Ramos',
      department: 'College of Forestry and Natural Resources',
      accessLevel: 'college',
      collegeCode: 'CFNR',
      college: UPLBCollege.CFNR,
      academicUnitCode: null,
      academicUnit: null
    }
  },

  // =========================================================================
  // ACADEMIC UNIT LEVEL ADMINS - See only their specific unit's scholarships
  // =========================================================================

  // ICS - Institute of Computer Science (under CAS)
  {
    email: 'ics.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Miguel',
      lastName: 'Fernandez',
      department: 'Institute of Computer Science',
      accessLevel: 'academic_unit',
      collegeCode: 'CAS',
      college: UPLBCollege.CAS,
      academicUnitCode: 'ICS',
      academicUnit: 'Institute of Computer Science'
    }
  },

  // IMSP - Institute of Mathematical Sciences and Physics (under CAS)
  {
    email: 'imsp.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Sofia',
      lastName: 'Villanueva',
      department: 'Institute of Mathematical Sciences and Physics',
      accessLevel: 'academic_unit',
      collegeCode: 'CAS',
      college: UPLBCollege.CAS,
      academicUnitCode: 'IMSP',
      academicUnit: 'Institute of Mathematical Sciences and Physics'
    }
  },

  // IC - Institute of Chemistry (under CAS)
  {
    email: 'ic.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Angela',
      lastName: 'Dela Cruz',
      department: 'Institute of Chemistry',
      accessLevel: 'academic_unit',
      collegeCode: 'CAS',
      college: UPLBCollege.CAS,
      academicUnitCode: 'IC',
      academicUnit: 'Institute of Chemistry'
    }
  },

  // IBS - Institute of Biological Sciences (under CAS)
  {
    email: 'ibs.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Gabriel',
      lastName: 'Santos',
      department: 'Institute of Biological Sciences',
      accessLevel: 'academic_unit',
      collegeCode: 'CAS',
      college: UPLBCollege.CAS,
      academicUnitCode: 'IBS',
      academicUnit: 'Institute of Biological Sciences'
    }
  },

  // DCHE - Department of Chemical Engineering (under CEAT)
  {
    email: 'dche.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Ricardo',
      lastName: 'Aquino',
      department: 'Department of Chemical Engineering',
      accessLevel: 'academic_unit',
      collegeCode: 'CEAT',
      college: UPLBCollege.CEAT,
      academicUnitCode: 'DCHE',
      academicUnit: 'Department of Chemical Engineering'
    }
  },

  // DCE - Department of Civil Engineering (under CEAT)
  {
    email: 'dce.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Fernando',
      lastName: 'Reyes',
      department: 'Department of Civil Engineering',
      accessLevel: 'academic_unit',
      collegeCode: 'CEAT',
      college: UPLBCollege.CEAT,
      academicUnitCode: 'DCE',
      academicUnit: 'Department of Civil Engineering'
    }
  },

  // DAE - Department of Agricultural Economics (under CEM)
  {
    email: 'dae.admin@iskolarship.uplb.edu.ph',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    adminProfile: {
      firstName: 'Carmen',
      lastName: 'Luna',
      department: 'Department of Agricultural Economics',
      accessLevel: 'academic_unit',
      collegeCode: 'CEM',
      college: UPLBCollege.CEM,
      academicUnitCode: 'DAE',
      academicUnit: 'Department of Agricultural Economics'
    }
  }
];

// =============================================================================
// Helper function to hash passwords for all admin users
// =============================================================================

const hashAdminPasswords = async (admins) => {
  const hashedAdmins = [];
  for (const admin of admins) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    hashedAdmins.push({
      ...admin,
      password: hashedPassword
    });
  }
  return hashedAdmins;
};

module.exports = {
  scopedAdminUsers,
  hashAdminPasswords
};
