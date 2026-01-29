// =============================================================================
// ISKOlarship - Scoped Scholarship Seed Data
// Scholarships at different admin levels for testing admin scope filtering
// University, College, Academic Unit levels
// =============================================================================

const { ScholarshipType, ScholarshipStatus, ScholarshipLevel } = require('../models/Scholarship.model');
const { UPLBCollege, Classification, Citizenship, STBracket } = require('../models/User.model');

// =============================================================================
// Helper function to create dates
// =============================================================================

const createDeadline = (monthsFromNow) => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date;
};

// =============================================================================
// UNIVERSITY-LEVEL SCHOLARSHIPS
// Managed by University admins, visible to all
// =============================================================================

const universityScholarships = [
  {
    name: 'UPLB University Scholarship Program (USP)',
    description: `The UPLB University Scholarship Program is the flagship merit-based scholarship for all UPLB students demonstrating exceptional academic performance. This scholarship covers tuition and provides a monthly stipend to support students throughout their undergraduate studies.`,
    sponsor: 'University of the Philippines Los Baños',
    type: ScholarshipType.UNIVERSITY,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 100000,
    awardDescription: 'Full tuition + ₱5,000 monthly stipend',
    eligibilityCriteria: {
      eligibleColleges: Object.values(UPLBCollege),
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 1.75,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Certificate of Good Moral Character', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 100,
    status: ScholarshipStatus.ACTIVE,
    tags: ['university', 'merit', 'tuition', 'stipend']
  },
  {
    name: 'DOST-SEI Science and Technology Undergraduate Scholarship',
    description: `The Department of Science and Technology - Science Education Institute (DOST-SEI) scholarship supports Filipino students pursuing degrees in science, mathematics, and engineering. This national scholarship aims to develop the country's pool of scientists and engineers.`,
    sponsor: 'Department of Science and Technology - SEI',
    type: ScholarshipType.GOVERNMENT,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 80000,
    awardDescription: 'Full tuition + ₱7,000 monthly stipend + book allowance',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT],
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.0,
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'DOST Application Form', isRequired: true },
      { name: 'Certificate of Family Income', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 50,
    status: ScholarshipStatus.ACTIVE,
    tags: ['government', 'dost', 'science', 'engineering']
  },
  {
    name: 'CHED Tulong Dunong Program',
    description: `The Commission on Higher Education (CHED) Tulong Dunong Program provides financial assistance to deserving Filipino students enrolled in undergraduate programs. This aims to democratize access to quality higher education.`,
    sponsor: 'Commission on Higher Education',
    type: ScholarshipType.GOVERNMENT,
    scholarshipLevel: ScholarshipLevel.UNIVERSITY,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 60000,
    awardDescription: '₱60,000 per academic year',
    eligibilityCriteria: {
      eligibleColleges: Object.values(UPLBCollege),
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      maxAnnualFamilyIncome: 300000,
      mustNotHaveOtherScholarship: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'ITR or Certificate of No Income', isRequired: true },
      { name: 'Barangay Certificate of Residency', isRequired: true }
    ],
    applicationDeadline: createDeadline(4),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 200,
    status: ScholarshipStatus.ACTIVE,
    tags: ['government', 'ched', 'financial aid']
  }
];

// =============================================================================
// COLLEGE-LEVEL SCHOLARSHIPS
// Managed by College admins, each tagged to specific college
// =============================================================================

const collegeScholarships = [
  // CAS - College of Arts and Sciences
  {
    name: 'CAS Dean\'s Excellence Award',
    description: `The College of Arts and Sciences Dean's Excellence Award recognizes outstanding CAS students who demonstrate exceptional academic performance and contribute to the college community. Recipients receive financial support and academic recognition.`,
    sponsor: 'College of Arts and Sciences',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: null,
    totalGrant: 30000,
    awardDescription: '₱30,000 per semester',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS],
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 1.5,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Endorsement Letter from Department Chair', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cas', 'merit', 'dean']
  },
  {
    name: 'CAS Student Assistance Fund',
    description: `Financial assistance for CAS students experiencing temporary financial difficulties. This fund aims to ensure that no CAS student has to discontinue their studies due to financial constraints.`,
    sponsor: 'CAS Alumni Association',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: null,
    totalGrant: 15000,
    awardDescription: '₱15,000 one-time assistance',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS],
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      maxAnnualFamilyIncome: 200000
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'Letter explaining financial need', isRequired: true },
      { name: 'Income Tax Return or Certificate of No Income', isRequired: true }
    ],
    applicationDeadline: createDeadline(1),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 30,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cas', 'financial aid', 'assistance']
  },

  // CEAT - College of Engineering and Agro-Industrial Technology
  {
    name: 'CEAT Engineering Excellence Scholarship',
    description: `The College of Engineering and Agro-Industrial Technology Excellence Scholarship supports outstanding engineering students who show promise in technical innovation and academic excellence.`,
    sponsor: 'College of Engineering and Agro-Industrial Technology',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CEAT',
    managingAcademicUnitCode: null,
    totalGrant: 40000,
    awardDescription: '₱40,000 per academic year',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 1.75,
      minUnitsEnrolled: 18,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Portfolio of Engineering Projects', isRequired: false }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 20,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ceat', 'engineering', 'merit']
  },
  {
    name: 'CEAT Women in Engineering Scholarship',
    description: `Scholarship program encouraging women to pursue engineering careers by providing financial support and mentorship opportunities to female engineering students at CEAT.`,
    sponsor: 'CEAT Alumni Foundation',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CEAT',
    managingAcademicUnitCode: null,
    totalGrant: 35000,
    awardDescription: '₱35,000 per semester + mentorship program',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.25
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Essay on Women in Engineering', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ceat', 'women', 'engineering', 'diversity']
  },

  // CAFS - College of Agriculture and Food Science
  {
    name: 'CAFS Agricultural Leadership Award',
    description: `The College of Agriculture and Food Science Agricultural Leadership Award recognizes students who demonstrate leadership in agricultural innovation and food science research.`,
    sponsor: 'College of Agriculture and Food Science',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CAFS',
    managingAcademicUnitCode: null,
    totalGrant: 25000,
    awardDescription: '₱25,000 per semester',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAFS],
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.0,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Leadership Activities Portfolio', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 12,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cafs', 'agriculture', 'leadership']
  },

  // CEM - College of Economics and Management
  {
    name: 'CEM Business Innovation Grant',
    description: `The College of Economics and Management Business Innovation Grant supports students developing innovative business ideas and entrepreneurial projects. Recipients receive funding and business mentorship.`,
    sponsor: 'CEM Business School Foundation',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CEM',
    managingAcademicUnitCode: null,
    totalGrant: 50000,
    awardDescription: '₱50,000 innovation grant + mentorship',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CEM],
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.5
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'Business Plan Proposal', isRequired: true },
      { name: 'Endorsement from Faculty Adviser', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 8,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cem', 'business', 'innovation', 'entrepreneurship']
  },

  // CFNR - College of Forestry and Natural Resources
  {
    name: 'CFNR Environmental Stewardship Scholarship',
    description: `The College of Forestry and Natural Resources Environmental Stewardship Scholarship supports students committed to environmental conservation and sustainable natural resource management.`,
    sponsor: 'CFNR Alumni Association',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.COLLEGE,
    managingCollegeCode: 'CFNR',
    managingAcademicUnitCode: null,
    totalGrant: 30000,
    awardDescription: '₱30,000 per academic year',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CFNR],
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.25,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Essay on Environmental Conservation', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['cfnr', 'forestry', 'environment', 'conservation']
  }
];

// =============================================================================
// ACADEMIC UNIT-LEVEL SCHOLARSHIPS  
// Managed by Academic Unit (Department/Institute) admins
// =============================================================================

const academicUnitScholarships = [
  // ICS - Institute of Computer Science (under CAS)
  {
    name: 'ICS Programming Excellence Award',
    description: `The Institute of Computer Science Programming Excellence Award recognizes outstanding programmers and software developers among ICS students. This scholarship supports students who excel in competitive programming and software development.`,
    sponsor: 'Institute of Computer Science',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'ICS',
    totalGrant: 20000,
    awardDescription: '₱20,000 per semester',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Computer Science'],
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.0
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Portfolio of Programming Projects', isRequired: true },
      { name: 'Competitive Programming Certificates', isRequired: false }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ics', 'computer science', 'programming', 'software']
  },
  {
    name: 'ICS Research Assistantship Grant',
    description: `Research assistantship for ICS students interested in conducting research in artificial intelligence, machine learning, data science, or software engineering under faculty supervision.`,
    sponsor: 'ICS Research Foundation',
    type: ScholarshipType.THESIS_GRANT,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'ICS',
    totalGrant: 25000,
    awardDescription: '₱25,000 research grant',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Computer Science'],
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.25
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'Research Proposal', isRequired: true },
      { name: 'Faculty Adviser Endorsement', isRequired: true }
    ],
    applicationDeadline: createDeadline(1),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 8,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ics', 'research', 'ai', 'machine learning']
  },

  // IMSP - Institute of Mathematical Sciences and Physics (under CAS)
  {
    name: 'IMSP Mathematics Olympiad Scholarship',
    description: `Scholarship for IMSP students who have represented UPLB or the Philippines in national or international mathematics competitions. This recognizes mathematical talent and supports continued excellence.`,
    sponsor: 'IMSP Alumni Foundation',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'IMSP',
    totalGrant: 25000,
    awardDescription: '₱25,000 per semester',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Mathematics', 'BS Applied Mathematics', 'BS Statistics'],
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.0
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Math Competition Certificates/Awards', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['imsp', 'mathematics', 'olympiad', 'competition']
  },
  {
    name: 'IMSP Physics Research Grant',
    description: `Research grant for physics students conducting experimental or theoretical research. Supports students working on physics thesis projects with equipment and material costs.`,
    sponsor: 'Philippine Physics Society - UPLB Chapter',
    type: ScholarshipType.THESIS_GRANT,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'IMSP',
    totalGrant: 30000,
    awardDescription: '₱30,000 research grant',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Applied Physics'],
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      requiresApprovedThesisOutline: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'Approved Thesis Outline', isRequired: true },
      { name: 'Research Budget Proposal', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 4,
    status: ScholarshipStatus.ACTIVE,
    tags: ['imsp', 'physics', 'research', 'thesis']
  },

  // IC - Institute of Chemistry (under CAS)
  {
    name: 'IC Laboratory Excellence Award',
    description: `The Institute of Chemistry Laboratory Excellence Award recognizes chemistry students who demonstrate exceptional laboratory skills and research aptitude in chemical sciences.`,
    sponsor: 'Institute of Chemistry',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'IC',
    totalGrant: 20000,
    awardDescription: '₱20,000 per semester',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Chemistry', 'BS Agricultural Chemistry'],
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.0,
      mustNotHaveDisciplinaryAction: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Laboratory Course Grades', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 6,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ic', 'chemistry', 'laboratory', 'research']
  },

  // DCHE - Department of Chemical Engineering (under CEAT)
  {
    name: 'DCHE Process Engineering Innovation Award',
    description: `Scholarship for chemical engineering students who demonstrate innovation in process engineering design and optimization. Supports students working on sustainable chemical processes.`,
    sponsor: 'Philippine Institute of Chemical Engineers - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CEAT',
    managingAcademicUnitCode: 'DCHE',
    totalGrant: 30000,
    awardDescription: '₱30,000 per academic year',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleCourses: ['BS Chemical Engineering'],
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.25
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Design Project Portfolio', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['dche', 'chemical engineering', 'process', 'innovation']
  },

  // DCS - Department of Civil Engineering (under CEAT)
  {
    name: 'DCE Structural Engineering Scholarship',
    description: `Scholarship for civil engineering students specializing in structural engineering. Supports students excelling in structural analysis and design courses.`,
    sponsor: 'Philippine Institute of Civil Engineers - UPLB',
    type: ScholarshipType.COLLEGE,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CEAT',
    managingAcademicUnitCode: 'DCE',
    totalGrant: 25000,
    awardDescription: '₱25,000 per semester',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleCourses: ['BS Civil Engineering'],
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.0
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Endorsement from Structural Engineering Instructor', isRequired: false }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['dce', 'civil engineering', 'structural', 'design']
  },

  // DAE - Department of Agricultural Economics (under CEM)
  {
    name: 'DAE Agricultural Economics Research Grant',
    description: `Research grant for agricultural economics students conducting thesis research on agricultural markets, rural development, or food policy. Supports field research and data collection.`,
    sponsor: 'Philippine Agricultural Economics and Development Association',
    type: ScholarshipType.THESIS_GRANT,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CEM',
    managingAcademicUnitCode: 'DAE',
    totalGrant: 20000,
    awardDescription: '₱20,000 research grant',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CEM],
      eligibleCourses: ['BS Agricultural Economics', 'BS Economics'],
      eligibleClassifications: [Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      requiresApprovedThesisOutline: true
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'Approved Thesis Proposal', isRequired: true },
      { name: 'Research Budget', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 6,
    status: ScholarshipStatus.ACTIVE,
    tags: ['dae', 'agricultural economics', 'research', 'thesis']
  },

  // IBS - Institute of Biological Sciences (under CAS)
  {
    name: 'IBS Biodiversity Research Fellowship',
    description: `Research fellowship for biology students conducting research on Philippine biodiversity, ecology, or conservation. Supports field work and laboratory expenses.`,
    sponsor: 'Biodiversity Management Bureau Partnership',
    type: ScholarshipType.THESIS_GRANT,
    scholarshipLevel: ScholarshipLevel.ACADEMIC_UNIT,
    managingCollegeCode: 'CAS',
    managingAcademicUnitCode: 'IBS',
    totalGrant: 35000,
    awardDescription: '₱35,000 research fellowship',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS],
      eligibleCourses: ['BS Biology'],
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.0
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'Research Proposal on Biodiversity', isRequired: true },
      { name: 'Faculty Adviser Endorsement', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 4,
    status: ScholarshipStatus.ACTIVE,
    tags: ['ibs', 'biology', 'biodiversity', 'ecology', 'research']
  }
];

// =============================================================================
// EXTERNAL SCHOLARSHIPS
// Managed by University admins only
// =============================================================================

const externalScholarships = [
  {
    name: 'SM Foundation Scholarship',
    description: `The SM Foundation College Scholarship Program provides financial support to deserving Filipino students from low-income families. The scholarship covers tuition, books, and allowances.`,
    sponsor: 'SM Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.EXTERNAL,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 100000,
    awardDescription: 'Full tuition + allowances',
    eligibilityCriteria: {
      eligibleColleges: Object.values(UPLBCollege),
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      maxAnnualFamilyIncome: 180000,
      minGWA: 1.0,
      maxGWA: 2.0
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Certificate of Family Income', isRequired: true },
      { name: 'SM Foundation Application Form', isRequired: true }
    ],
    applicationDeadline: createDeadline(4),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 20,
    status: ScholarshipStatus.ACTIVE,
    tags: ['external', 'sm foundation', 'private', 'financial aid']
  },
  {
    name: 'Ayala Foundation Scholarship',
    description: `The Ayala Foundation Scholarship supports exceptional Filipino students pursuing degrees in fields aligned with Ayala's business interests including technology, engineering, and management.`,
    sponsor: 'Ayala Foundation',
    type: ScholarshipType.PRIVATE,
    scholarshipLevel: ScholarshipLevel.EXTERNAL,
    managingCollegeCode: null,
    managingAcademicUnitCode: null,
    totalGrant: 120000,
    awardDescription: '₱120,000 per academic year',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT, UPLBCollege.CEM],
      eligibleClassifications: [Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 1.75
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Essay on Career Goals', isRequired: true },
      { name: 'Recommendation Letter', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['external', 'ayala', 'private', 'technology', 'engineering']
  }
];

// =============================================================================
// Export all scholarships combined
// =============================================================================

const scopedScholarshipsData = [
  ...universityScholarships,
  ...collegeScholarships,
  ...academicUnitScholarships,
  ...externalScholarships
];

module.exports = {
  scopedScholarshipsData,
  universityScholarships,
  collegeScholarships,
  academicUnitScholarships,
  externalScholarships
};
