// =============================================================================
// ISKOlarship - UPLB Organizational Structure
// Complete hierarchy: University → Colleges → Departments/Institutes
// Based on official UPLB organizational structure
// =============================================================================

/**
 * UPLB Colleges with abbreviations
 * Used for admin scope and scholarship management
 */
const UPLBColleges = {
  CAS: {
    code: 'CAS',
    name: 'College of Arts and Sciences',
    fullName: 'College of Arts and Sciences'
  },
  CAFS: {
    code: 'CAFS',
    name: 'College of Agriculture and Food Science',
    fullName: 'College of Agriculture and Food Science'
  },
  CEM: {
    code: 'CEM',
    name: 'College of Economics and Management',
    fullName: 'College of Economics and Management'
  },
  CEAT: {
    code: 'CEAT',
    name: 'College of Engineering and Agro-Industrial Technology',
    fullName: 'College of Engineering and Agro-Industrial Technology'
  },
  CFNR: {
    code: 'CFNR',
    name: 'College of Forestry and Natural Resources',
    fullName: 'College of Forestry and Natural Resources'
  },
  CHE: {
    code: 'CHE',
    name: 'College of Human Ecology',
    fullName: 'College of Human Ecology'
  },
  CVM: {
    code: 'CVM',
    name: 'College of Veterinary Medicine',
    fullName: 'College of Veterinary Medicine'
  },
  CDC: {
    code: 'CDC',
    name: 'College of Development Communication',
    fullName: 'College of Development Communication'
  },
  CPAF: {
    code: 'CPAF',
    name: 'College of Public Affairs and Development',
    fullName: 'College of Public Affairs and Development'
  },
  GS: {
    code: 'GS',
    name: 'Graduate School',
    fullName: 'Graduate School'
  }
};

/**
 * UPLB Departments/Institutes organized by College
 * Each department includes code, name, and parent college
 */
const UPLBDepartments = {
  // =========================================================================
  // College of Arts and Sciences (CAS)
  // =========================================================================
  CAS: [
    { code: 'IBS', name: 'Institute of Biological Sciences', college: 'CAS' },
    { code: 'IC', name: 'Institute of Chemistry', college: 'CAS' },
    { code: 'ICS', name: 'Institute of Computer Science', college: 'CAS' },
    { code: 'IMSP', name: 'Institute of Mathematical Sciences and Physics', college: 'CAS' },
    { code: 'ISTAT', name: 'Institute of Statistics', college: 'CAS' },
    { code: 'DHUM', name: 'Department of Humanities', college: 'CAS' },
    { code: 'DSOCS', name: 'Department of Social Sciences', college: 'CAS' },
    { code: 'DHKPE', name: 'Department of Human Kinetics and Physical Education', college: 'CAS' }
  ],

  // =========================================================================
  // College of Agriculture and Food Science (CAFS)
  // =========================================================================
  CAFS: [
    { code: 'IANSCI', name: 'Institute of Animal Science', college: 'CAFS' },
    { code: 'ICS-CAFS', name: 'Institute of Crop Science', college: 'CAFS' },
    { code: 'IWEP', name: 'Institute of Weed Science, Entomology, and Plant Pathology', college: 'CAFS' },
    { code: 'ASI', name: 'Agricultural Systems Institute', college: 'CAFS' },
    { code: 'ISSAS', name: 'Institute of Soil Science and Agrometeorology', college: 'CAFS' },
    { code: 'IFSM', name: 'Institute of Food Science and Technology', college: 'CAFS' },
    { code: 'DBGB', name: 'Department of Basic General Biochemistry', college: 'CAFS' }
  ],

  // =========================================================================
  // College of Economics and Management (CEM)
  // =========================================================================
  CEM: [
    { code: 'DAE', name: 'Department of Agricultural and Applied Economics', college: 'CEM' },
    { code: 'DE', name: 'Department of Economics', college: 'CEM' },
    { code: 'DAF', name: 'Department of Agribusiness Management and Finance', college: 'CEM' }
  ],

  // =========================================================================
  // College of Engineering and Agro-Industrial Technology (CEAT)
  // =========================================================================
  CEAT: [
    { code: 'IABE', name: 'Institute of Agricultural and Biosystems Engineering', college: 'CEAT' },
    { code: 'DCHE', name: 'Department of Chemical Engineering', college: 'CEAT' },
    { code: 'DCE', name: 'Department of Civil Engineering', college: 'CEAT' },
    { code: 'DEE', name: 'Department of Electrical Engineering', college: 'CEAT' },
    { code: 'DMME', name: 'Department of Mechanical and Manufacturing Engineering', college: 'CEAT' },
    { code: 'DIET', name: 'Department of Industrial Engineering and Technology', college: 'CEAT' }
  ],

  // =========================================================================
  // College of Forestry and Natural Resources (CFNR)
  // =========================================================================
  CFNR: [
    { code: 'IFRN', name: 'Institute of Renewable Natural Resources', college: 'CFNR' },
    { code: 'DFR', name: 'Department of Forest Resources', college: 'CFNR' },
    { code: 'DFBS', name: 'Department of Forest Biological Sciences', college: 'CFNR' },
    { code: 'DFPM', name: 'Department of Forest Products and Paper Science', college: 'CFNR' },
    { code: 'DSE', name: 'Department of Social Forestry and Forest Governance', college: 'CFNR' }
  ],

  // =========================================================================
  // College of Human Ecology (CHE)
  // =========================================================================
  CHE: [
    { code: 'IHD', name: 'Institute of Human Development', college: 'CHE' },
    { code: 'DFE', name: 'Department of Family and Consumer Sciences', college: 'CHE' },
    { code: 'DFST', name: 'Department of Food Science and Technology', college: 'CHE' },
    { code: 'DNC', name: 'Department of Nutritional and Community Sciences', college: 'CHE' }
  ],

  // =========================================================================
  // College of Veterinary Medicine (CVM)
  // =========================================================================
  CVM: [
    { code: 'DVBS', name: 'Department of Veterinary Basic Sciences', college: 'CVM' },
    { code: 'DVCS', name: 'Department of Veterinary Clinical Sciences', college: 'CVM' },
    { code: 'DVPH', name: 'Department of Veterinary Paraclinical Sciences', college: 'CVM' }
  ],

  // =========================================================================
  // College of Development Communication (CDC)
  // =========================================================================
  CDC: [
    { code: 'DSCE', name: 'Department of Science Communication', college: 'CDC' },
    { code: 'DEDC', name: 'Department of Educational Development Communication', college: 'CDC' },
    { code: 'DCDC', name: 'Department of Community Development Communication', college: 'CDC' }
  ],

  // =========================================================================
  // College of Public Affairs and Development (CPAF)
  // =========================================================================
  CPAF: [
    { code: 'IGA', name: 'Institute of Governance and Administration', college: 'CPAF' },
    { code: 'DCDR', name: 'Department of Community Development', college: 'CPAF' },
    { code: 'DAS', name: 'Department of Applied Social Sciences', college: 'CPAF' }
  ],

  // =========================================================================
  // Graduate School (GS) - No specific departments (uses college departments)
  // =========================================================================
  GS: []
};

/**
 * University-level administrative units (not under any college)
 * For university-level admins
 */
const UniversityUnits = [
  { code: 'OC', name: "Office of the Chancellor", type: 'administrative' },
  { code: 'OVCAA', name: 'Office of the Vice Chancellor for Academic Affairs', type: 'administrative' },
  { code: 'OVCA', name: 'Office of the Vice Chancellor for Administration', type: 'administrative' },
  { code: 'OVCRE', name: 'Office of the Vice Chancellor for Research and Extension', type: 'administrative' },
  { code: 'OVCPD', name: 'Office of the Vice Chancellor for Planning and Development', type: 'administrative' },
  { code: 'OSA', name: 'Office of Student Affairs', type: 'administrative' },
  { code: 'USFA', name: 'University Student Financial Assistance', type: 'administrative' },
  { code: 'OUR', name: 'Office of the University Registrar', type: 'administrative' },
  { code: 'LIBRARY', name: 'University Library', type: 'service' },
  { code: 'UHS', name: 'University Health Service', type: 'service' },
  { code: 'URC', name: 'University Research Center', type: 'research' }
];

/**
 * Get all college codes as an array
 */
function getCollegeCodes() {
  return Object.keys(UPLBColleges);
}

/**
 * Get all college names as an array
 */
function getCollegeNames() {
  return Object.values(UPLBColleges).map(c => c.name);
}

/**
 * Get college info by code
 */
function getCollegeByCode(code) {
  return UPLBColleges[code] || null;
}

/**
 * Get departments for a specific college
 */
function getDepartmentsByCollege(collegeCode) {
  return UPLBDepartments[collegeCode] || [];
}

/**
 * Get all department codes for a college
 */
function getDepartmentCodes(collegeCode) {
  return (UPLBDepartments[collegeCode] || []).map(d => d.code);
}

/**
 * Get department info by code
 */
function getDepartmentByCode(deptCode) {
  for (const collegeCode of Object.keys(UPLBDepartments)) {
    const dept = UPLBDepartments[collegeCode].find(d => d.code === deptCode);
    if (dept) return dept;
  }
  return null;
}

/**
 * Validate if a department belongs to a college
 */
function isDepartmentInCollege(deptCode, collegeCode) {
  const departments = UPLBDepartments[collegeCode] || [];
  return departments.some(d => d.code === deptCode);
}

/**
 * Get all university units
 */
function getUniversityUnits() {
  return UniversityUnits;
}

/**
 * Get flat list of all departments with their college info
 */
function getAllDepartments() {
  const allDepts = [];
  for (const collegeCode of Object.keys(UPLBDepartments)) {
    const college = UPLBColleges[collegeCode];
    for (const dept of UPLBDepartments[collegeCode]) {
      allDepts.push({
        ...dept,
        collegeName: college.name,
        collegeCode: college.code
      });
    }
  }
  return allDepts;
}

/**
 * Get organizational structure for dropdown options
 */
function getOrganizationalStructure() {
  return {
    colleges: Object.entries(UPLBColleges).map(([code, info]) => ({
      code,
      name: info.name,
      departments: UPLBDepartments[code] || []
    })),
    universityUnits: UniversityUnits
  };
}

module.exports = {
  UPLBColleges,
  UPLBDepartments,
  UniversityUnits,
  getCollegeCodes,
  getCollegeNames,
  getCollegeByCode,
  getDepartmentsByCollege,
  getDepartmentCodes,
  getDepartmentByCode,
  isDepartmentInCollege,
  getUniversityUnits,
  getAllDepartments,
  getOrganizationalStructure
};
