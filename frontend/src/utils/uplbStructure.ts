// =============================================================================
// ISKOlarship - UPLB Organizational Structure
// Complete hierarchy: University → Colleges → Departments/Institutes
// Based on official UPLB organizational structure
// =============================================================================

/**
 * UPLB College codes
 */
export type UPLBCollegeCode = 
  | 'CAS' | 'CAFS' | 'CEM' | 'CEAT' | 'CFNR' 
  | 'CHE' | 'CVM' | 'CDC' | 'CPAF' | 'GS';

/**
 * College information structure
 */
export interface CollegeInfo {
  code: UPLBCollegeCode;
  name: string;
  fullName: string;
}

/**
 * Department information structure
 */
export interface DepartmentInfo {
  code: string;
  name: string;
  college: UPLBCollegeCode;
}

/**
 * University unit information
 */
export interface UniversityUnitInfo {
  code: string;
  name: string;
  type: 'administrative' | 'service' | 'research';
}

/**
 * UPLB Colleges with full information
 */
export const UPLBColleges: Record<UPLBCollegeCode, CollegeInfo> = {
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
 */
export const UPLBDepartments: Record<UPLBCollegeCode, DepartmentInfo[]> = {
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
  // Graduate School (GS) - No specific departments
  // =========================================================================
  GS: []
};

/**
 * University-level administrative units
 */
export const UniversityUnits: UniversityUnitInfo[] = [
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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all college codes as an array
 */
export function getCollegeCodes(): UPLBCollegeCode[] {
  return Object.keys(UPLBColleges) as UPLBCollegeCode[];
}

/**
 * Get college options for dropdown (code and display name)
 */
export function getCollegeOptions(): Array<{ value: string; label: string }> {
  return Object.entries(UPLBColleges).map(([code, info]) => ({
    value: code,
    label: `${code} - ${info.name}`
  }));
}

/**
 * Get departments for a specific college
 */
export function getDepartmentsByCollege(collegeCode: UPLBCollegeCode): DepartmentInfo[] {
  return UPLBDepartments[collegeCode] || [];
}

/**
 * Get department options for dropdown based on selected college
 */
export function getDepartmentOptions(collegeCode: UPLBCollegeCode | null): Array<{ value: string; label: string }> {
  if (!collegeCode) return [];
  
  const departments = UPLBDepartments[collegeCode] || [];
  return departments.map(dept => ({
    value: dept.code,
    label: `${dept.code} - ${dept.name}`
  }));
}

/**
 * Get college info by code
 */
export function getCollegeByCode(code: string): CollegeInfo | null {
  return UPLBColleges[code as UPLBCollegeCode] || null;
}

/**
 * Get college code from legacy college name
 * (e.g., "College of Arts and Sciences" → "CAS")
 */
export function getCollegeCodeFromLegacy(collegeName: string): UPLBCollegeCode | null {
  for (const [code, info] of Object.entries(UPLBColleges)) {
    if (info.name === collegeName || info.fullName === collegeName) {
      return code as UPLBCollegeCode;
    }
  }
  return null;
}

/**
 * Get department info by code
 */
export function getDepartmentByCode(deptCode: string): (DepartmentInfo & { collegeName: string }) | null {
  for (const collegeCode of Object.keys(UPLBDepartments) as UPLBCollegeCode[]) {
    const dept = UPLBDepartments[collegeCode].find(d => d.code === deptCode);
    if (dept) {
      return {
        ...dept,
        collegeName: UPLBColleges[collegeCode].name
      };
    }
  }
  return null;
}

/**
 * Validate if a department belongs to a college
 */
export function isDepartmentInCollege(deptCode: string, collegeCode: UPLBCollegeCode): boolean {
  const departments = UPLBDepartments[collegeCode] || [];
  return departments.some(d => d.code === deptCode);
}

/**
 * Get university unit options for dropdown
 */
export function getUniversityUnitOptions(): Array<{ value: string; label: string }> {
  return UniversityUnits.map(unit => ({
    value: unit.code,
    label: `${unit.code} - ${unit.name}`
  }));
}

/**
 * Get all departments as a flat list with college info
 */
export function getAllDepartments(): Array<DepartmentInfo & { collegeName: string; collegeCode: string }> {
  const allDepts: Array<DepartmentInfo & { collegeName: string; collegeCode: string }> = [];
  
  for (const collegeCode of Object.keys(UPLBDepartments) as UPLBCollegeCode[]) {
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
 * Get display name for admin scope based on level, college, and academic unit
 */
export function getAdminScopeDisplay(
  accessLevel: 'university' | 'college' | 'academic_unit',
  collegeCode?: string | null,
  academicUnitCode?: string | null
): string {
  switch (accessLevel) {
    case 'university':
      return 'University-wide Administrator';
    case 'college':
      if (collegeCode) {
        const college = getCollegeByCode(collegeCode);
        return college ? `${college.code} Administrator` : 'College Administrator';
      }
      return 'College Administrator';
    case 'academic_unit':
      if (academicUnitCode) {
        const dept = getDepartmentByCode(academicUnitCode);
        return dept ? `${dept.code} Administrator (${dept.college})` : 'Academic Unit Administrator';
      }
      return 'Academic Unit Administrator';
    default:
      return 'Administrator';
  }
}
