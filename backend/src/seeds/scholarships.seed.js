// =============================================================================
// ISKOlarship - Scholarship Seed Data
// Based on actual UPLB scholarships from the research paper
// =============================================================================

const { ScholarshipType, ScholarshipStatus } = require('../models/Scholarship.model');
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
// ACTUAL UPLB SCHOLARSHIPS
// Based on List of scholarships provided in research
// =============================================================================

const scholarshipsData = [
  // =========================================================================
  // 1. Sterix HOPE Thesis Grant
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) - Sterix Incorporated Gift of HOPE Thesis Grant',
    description: `The Sterix Incorporated Gift of HOPE (Holistic Offerings to Promote Excellence) Thesis Grant supports senior BS Biology and BS Agriculture (Major in Entomology) students who are working on their undergraduate thesis. This grant provides financial assistance for thesis-related expenses to help students complete their research successfully.

The scholarship aims to nurture future scientists and agricultural experts who will contribute to the advancement of biological sciences and sustainable pest management in the Philippines.`,
    sponsor: 'Sterix Incorporated',
    type: ScholarshipType.THESIS_GRANT,
    totalGrant: 25000,
    awardDescription: '₱25,000 one-time thesis grant',
    eligibilityCriteria: {
      eligibleCourses: ['BS Biology', 'BS Agriculture'],
      eligibleMajors: ['Entomology'],
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CAFS],
      eligibleClassifications: [Classification.SENIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      requiresApprovedThesisOutline: true,
      minGWA: 1.0,
      maxGWA: 2.5,
      maxAnnualFamilyIncome: 250000,
      mustNotHaveThesisGrant: true,
      additionalRequirements: [
        { description: 'Must have an approved Thesis Outline', isRequired: true },
        { description: 'Must not be a recipient of other thesis grants', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades (Latest Semester)', isRequired: true },
      { name: 'Approved Thesis Outline', isRequired: true },
      { name: 'Certificate of Family Income (ITR or BIR Certificate)', isRequired: true },
      { name: 'Letter of Intent', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['thesis', 'biology', 'agriculture', 'entomology', 'research', 'sterix']
  },

  // =========================================================================
  // 2. Dr. Ernesto Tuazon Scholarship
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) - Dr. Ernesto Tuazon',
    description: `The Dr. Ernesto Tuazon Scholarship is a merit-based financial assistance program for junior or senior students from Ilocos Sur or Laguna (preferably Calauan) pursuing degrees in Chemistry, Agricultural Chemistry, or Chemical Engineering.

This scholarship honors the legacy of Dr. Ernesto Tuazon by supporting students from his home regions who demonstrate academic excellence and financial need in the chemical sciences.`,
    sponsor: 'Dr. Ernesto Tuazon Foundation',
    type: ScholarshipType.PRIVATE,
    totalGrant: 40000,
    awardDescription: '₱40,000 per academic year',
    eligibilityCriteria: {
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleProvinces: ['Ilocos Sur', 'Laguna'],
      eligibleCourses: ['BS Chemistry', 'BS Agricultural Chemistry', 'BS Chemical Engineering'],
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CAFS, UPLBCollege.CEAT],
      minGWA: 1.0,
      maxGWA: 2.5,
      maxAnnualFamilyIncome: 150000,
      mustNotHaveOtherScholarship: true,
      minUnitsEnrolled: 15,
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: [
        { description: 'Must be from Ilocos Sur or Laguna (preferably Calauan)', isRequired: true },
        { description: 'Must be enrolled in at least 15 units', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Certificate of Residency (from Ilocos Sur or Laguna)', isRequired: true },
      { name: 'Income Tax Return or Certificate of No Income', isRequired: true },
      { name: 'Personal Essay', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 3,
    status: ScholarshipStatus.ACTIVE,
    tags: ['chemistry', 'ilocos sur', 'laguna', 'calauan', 'tuazon']
  },

  // =========================================================================
  // 3. LBMFI Undergraduate Thesis Grant
  // =========================================================================
  {
    name: 'Lifebank Microfinance Foundation, Inc. (LBMFI) Undergraduate Thesis Grant',
    description: `The Lifebank Microfinance Foundation, Inc. (LBMFI) Undergraduate Thesis Grant supports UPLB students conducting thesis research in the basic, applied, or interdisciplinary aspects of organic agriculture.

This grant promotes sustainable agricultural practices and supports student researchers who are passionate about organic farming methods and environmental sustainability.`,
    sponsor: 'Lifebank Microfinance Foundation, Inc.',
    type: ScholarshipType.THESIS_GRANT,
    totalGrant: 20000,
    awardDescription: '₱20,000 thesis research grant',
    eligibilityCriteria: {
      eligibleColleges: Object.values(UPLBCollege),
      minUnitsPassed: 38,
      mustNotHaveFailingGrade: true,
      mustNotHaveGradeOf4: true,
      mustNotHaveIncompleteGrade: true,
      mustNotHaveDisciplinaryAction: true,
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: [
        { description: 'Must be interested in pursuing thesis in organic agriculture', isRequired: true },
        { description: 'Thesis must focus on basic, applied, or interdisciplinary aspects of organic agriculture', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Thesis Proposal related to Organic Agriculture', isRequired: true },
      { name: 'Certificate of Good Moral Character', isRequired: true },
      { name: 'Letter of Intent explaining interest in organic agriculture', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['thesis', 'organic agriculture', 'sustainability', 'research', 'lbmfi']
  },

  // =========================================================================
  // 4. Sterix HOPE Scholarship Program
  // =========================================================================
  {
    name: 'Sterix Incorporated Gift of HOPE (Holistic Offerings to Promote Excellence) Scholarship Program',
    description: `The Sterix Incorporated Gift of HOPE Scholarship Program provides comprehensive financial support to junior students pursuing BS Biology or BS Agriculture (Major in Entomology). This scholarship covers tuition and provides a stipend to help students focus on their studies.

Sterix Incorporated is committed to developing the next generation of scientists who will advance agricultural pest management and biological research in the Philippines.`,
    sponsor: 'Sterix Incorporated',
    type: ScholarshipType.PRIVATE,
    totalGrant: 80000,
    awardDescription: '₱80,000 per year (tuition + stipend)',
    eligibilityCriteria: {
      eligibleCourses: ['BS Biology', 'BS Agriculture'],
      eligibleMajors: ['Entomology'],
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CAFS],
      eligibleClassifications: [Classification.JUNIOR],
      eligibleCitizenship: [Citizenship.FILIPINO],
      minGWA: 1.0,
      maxGWA: 2.5,
      minUnitsEnrolled: 15,
      maxAnnualFamilyIncome: 250000,
      mustNotHaveOtherScholarship: true,
      additionalRequirements: [
        { description: 'Must be enrolling in at least 15 units for the semester', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Income Tax Return', isRequired: true },
      { name: 'Certificate of Good Moral Character', isRequired: true },
      { name: 'Personal Essay', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 5,
    status: ScholarshipStatus.ACTIVE,
    tags: ['biology', 'agriculture', 'entomology', 'sterix', 'hope']
  },

  // =========================================================================
  // 5. CHE Alumni Association Thesis Grant
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) - College of Human Ecology Alumni Association Thesis Grant',
    description: `The College of Human Ecology Alumni Association Thesis Grant supports graduating CHE students who demonstrate financial need and academic commitment. This grant helps cover thesis-related expenses for students in ST Bracket PD80 to Full Discount with Stipend.

The CHE Alumni Association is dedicated to supporting current students and fostering a strong community of human ecology professionals.`,
    sponsor: 'College of Human Ecology Alumni Association',
    type: ScholarshipType.THESIS_GRANT,
    totalGrant: 15000,
    awardDescription: '₱15,000 thesis grant',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CHE],
      eligibleClassifications: [Classification.SENIOR],
      mustBeGraduating: true,
      eligibleSTBrackets: [STBracket.PD80, STBracket.FULL_DISCOUNT, STBracket.FULL_DISCOUNT_WITH_STIPEND],
      mustNotHaveDisciplinaryAction: true,
      requiresApprovedThesisOutline: true,
      mustNotHaveThesisGrant: true,
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: [
        { description: 'Must be graduating this semester', isRequired: true },
        { description: 'Thesis proposal must be approved by Thesis Adviser, Unit Head, and CHE Dean', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'Approved Thesis Proposal with certification', isRequired: true },
      { name: 'ST Bracket Certification', isRequired: true },
      { name: 'Certificate of Good Moral Character from CHE', isRequired: true }
    ],
    applicationDeadline: createDeadline(1),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 8,
    status: ScholarshipStatus.ACTIVE,
    tags: ['thesis', 'che', 'human ecology', 'alumni', 'graduating']
  },

  // =========================================================================
  // 6. Dr. Higino A. Ables Scholarship
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) - Dr. Higino A. Ables',
    description: `The Dr. Higino A. Ables Scholarship supports UPLB students from Sorsogon or Camarines Sur who demonstrate academic excellence and financial need. This scholarship honors Dr. Ables' commitment to education in the Bicol region.`,
    sponsor: 'Dr. Higino A. Ables Foundation',
    type: ScholarshipType.PRIVATE,
    totalGrant: 50000,
    awardDescription: '₱50,000 per academic year',
    eligibilityCriteria: {
      eligibleProvinces: ['Sorsogon', 'Camarines Sur'],
      eligibleClassifications: [Classification.FRESHMAN, Classification.SOPHOMORE, Classification.JUNIOR, Classification.SENIOR],
      minGWA: 1.0,
      maxGWA: 2.5,
      minUnitsEnrolled: 15,
      maxAnnualFamilyIncome: 150000,
      mustNotHaveOtherScholarship: true,
      eligibleCitizenship: [Citizenship.FILIPINO],
      eligibleColleges: Object.values(UPLBCollege),
      additionalRequirements: [
        { description: 'Must be from Sorsogon or Camarines Sur', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Certificate of Residency from Sorsogon or Camarines Sur', isRequired: true },
      { name: 'Income Tax Return', isRequired: true },
      { name: 'Personal Essay', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 4,
    status: ScholarshipStatus.ACTIVE,
    tags: ['bicol', 'sorsogon', 'camarines sur', 'ables']
  },

  // =========================================================================
  // 7. CDO Odyssey Foundation Scholarship
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) – Corazon Dayro Ong (CDO Odyssey Foundation, Inc.)',
    description: `The Corazon Dayro Ong Scholarship through CDO Odyssey Foundation, Inc. supports junior and senior students in BS Nutrition, BS Agriculture major in Animal Science, and BS Forestry.`,
    sponsor: 'CDO Odyssey Foundation, Inc.',
    type: ScholarshipType.PRIVATE,
    totalGrant: 60000,
    awardDescription: '₱60,000 per academic year',
    eligibilityCriteria: {
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleCourses: ['BS Nutrition', 'BS Agriculture', 'BS Forestry'],
      eligibleMajors: ['Animal Science'],
      eligibleColleges: [UPLBCollege.CHE, UPLBCollege.CAFS, UPLBCollege.CFNR],
      maxAnnualFamilyIncome: 250000,
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: [
        { description: 'Must not have been subject of disciplinary action worse than 5-day class suspension', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Income Tax Return or Certificate', isRequired: true },
      { name: 'Certificate of Good Moral Character', isRequired: true },
      { name: 'Personal Statement', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 6,
    status: ScholarshipStatus.ACTIVE,
    tags: ['nutrition', 'animal science', 'forestry', 'cdo', 'odyssey']
  },

  // =========================================================================
  // 8. FDF Scholarship
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) - FDF',
    description: `The FDF Scholarship provides financial assistance to graduating students in their final semester at UPLB.`,
    sponsor: 'FDF Foundation',
    type: ScholarshipType.PRIVATE,
    totalGrant: 30000,
    awardDescription: '₱30,000 graduation grant',
    eligibilityCriteria: {
      eligibleClassifications: [Classification.SENIOR],
      mustBeGraduating: true,
      eligibleColleges: Object.values(UPLBCollege),
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: [
        { description: 'Must be a graduating student this Second Semester, A.Y. 2024-2025', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Certificate of Candidacy for Graduation', isRequired: true },
      { name: 'Personal Essay', isRequired: true }
    ],
    applicationDeadline: createDeadline(1),
    applicationStartDate: new Date(),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    tags: ['graduating', 'fdf', 'graduation grant']
  },

  // =========================================================================
  // 9. Nicolas Nick Angel II Scholarship
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) - Nicolas Nick Angel II',
    description: `The Nicolas Nick Angel II Scholarship supports senior BS Agriculture and BS Forestry students who will graduate by the 2nd Semester of A.Y. 2025-2026.`,
    sponsor: 'Nicolas Nick Angel II Foundation',
    type: ScholarshipType.PRIVATE,
    totalGrant: 45000,
    awardDescription: '₱45,000 per academic year',
    eligibilityCriteria: {
      eligibleClassifications: [Classification.SENIOR],
      eligibleCourses: ['BS Agriculture', 'BS Forestry'],
      eligibleColleges: [UPLBCollege.CAFS, UPLBCollege.CFNR],
      minGWA: 1.0,
      maxGWA: 2.5,
      maxAnnualFamilyIncome: 250000,
      mustNotHaveOtherScholarship: true,
      minUnitsEnrolled: 15,
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: [
        { description: 'Must graduate by 2nd Semester AY 2025-2026', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Income Tax Return', isRequired: true },
      { name: 'Personal Essay', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 4,
    status: ScholarshipStatus.ACTIVE,
    tags: ['agriculture', 'forestry', 'angel', 'senior']
  },

  // =========================================================================
  // 10. HUMEIN-Phils Scholarship
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) - Human Ecology Institute of the Philippines, Inc. (HUMEIN-Phils)',
    description: `The Human Ecology Institute of the Philippines, Inc. (HUMEIN-Phils) Scholarship provides financial assistance to students who demonstrate significant financial need.`,
    sponsor: 'Human Ecology Institute of the Philippines, Inc.',
    type: ScholarshipType.PRIVATE,
    totalGrant: 35000,
    awardDescription: '₱35,000 per academic year',
    eligibilityCriteria: {
      maxAnnualFamilyIncome: 250000,
      eligibleColleges: Object.values(UPLBCollege),
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: [
        { description: 'Must demonstrate financial need', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Income Tax Return or Certificate of No Income', isRequired: true },
      { name: 'Personal Essay on financial need', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    tags: ['financial need', 'humein', 'human ecology']
  },

  // =========================================================================
  // 11. IMS Program Scholarship
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) - IMS Program',
    description: `The IMS Program Scholarship supports junior and senior students in BS Applied Mathematics, BS Mathematics, or BS Mathematics and Science Teaching (Major in Mathematics).`,
    sponsor: 'Institute of Mathematical Sciences',
    type: ScholarshipType.COLLEGE,
    totalGrant: 40000,
    awardDescription: '₱40,000 per academic year',
    eligibilityCriteria: {
      eligibleCourses: ['BS Applied Mathematics', 'BS Mathematics', 'BS Mathematics and Science Teaching'],
      eligibleMajors: ['Mathematics'],
      eligibleColleges: [UPLBCollege.CAS],
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      minUnitsEnrolled: 15,
      minGWA: 1.0,
      maxGWA: 2.75,
      eligibleSTBrackets: [STBracket.PD80, STBracket.FULL_DISCOUNT, STBracket.FULL_DISCOUNT_WITH_STIPEND],
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: [
        { description: 'Must have good academic standing', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'ST Bracket Certification', isRequired: true },
      { name: 'IMS Endorsement', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 6,
    status: ScholarshipStatus.ACTIVE,
    tags: ['mathematics', 'ims', 'applied math', 'math teaching']
  },

  // =========================================================================
  // 12. Camilla Yandoc Ables Scholarship
  // =========================================================================
  {
    name: 'Adopt-a-Student Program (AASP) - Camilla Yandoc Ables',
    description: `The Camilla Yandoc Ables Scholarship supports junior and senior students pursuing BS Agriculture major in Plant Pathology.`,
    sponsor: 'Camilla Yandoc Ables Foundation',
    type: ScholarshipType.PRIVATE,
    totalGrant: 45000,
    awardDescription: '₱45,000 per academic year',
    eligibilityCriteria: {
      eligibleClassifications: [Classification.JUNIOR, Classification.SENIOR],
      eligibleCourses: ['BS Agriculture'],
      eligibleMajors: ['Plant Pathology'],
      eligibleColleges: [UPLBCollege.CAFS],
      minGWA: 1.0,
      maxGWA: 2.5,
      maxAnnualFamilyIncome: 150000,
      mustNotHaveOtherScholarship: true,
      minUnitsEnrolled: 15,
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: []
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Income Tax Return', isRequired: true },
      { name: 'Personal Essay', isRequired: true }
    ],
    applicationDeadline: createDeadline(2),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 3,
    status: ScholarshipStatus.ACTIVE,
    tags: ['plant pathology', 'agriculture', 'ables', 'crop protection']
  },

  // =========================================================================
  // 13. BASF Agricultural Research Foundation Scholarship
  // =========================================================================
  {
    name: 'BASF Agricultural Research Foundation Inc. Scholarship Grant',
    description: `The BASF Agricultural Research Foundation Inc. Scholarship Grant supports sophomore BS Agriculture students majoring in Crop Protection (Entomology, Plant Pathology, or Weed Science).`,
    sponsor: 'BASF Agricultural Research Foundation Inc.',
    type: ScholarshipType.PRIVATE,
    totalGrant: 100000,
    awardDescription: '₱100,000 per academic year',
    eligibilityCriteria: {
      eligibleClassifications: [Classification.SOPHOMORE],
      eligibleCourses: ['BS Agriculture'],
      eligibleMajors: ['Entomology', 'Plant Pathology', 'Weed Science', 'Crop Protection'],
      eligibleColleges: [UPLBCollege.CAFS],
      minGWA: 1.0,
      maxGWA: 2.5,
      mustNotHaveFailingGrade: true,
      mustNotHaveGradeOf4: true,
      mustNotHaveIncompleteGrade: true,
      minUnitsEnrolled: 15,
      maxAnnualFamilyIncome: 500000,
      mustNotHaveOtherScholarship: true,
      eligibleCitizenship: [Citizenship.FILIPINO],
      additionalRequirements: [
        { description: 'One slot for Entomology major', isRequired: false },
        { description: 'One slot for Plant Pathology major', isRequired: false },
        { description: 'One slot for Weed Science major', isRequired: false }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Income Tax Return', isRequired: true },
      { name: 'Certificate of Good Moral Character', isRequired: true },
      { name: 'Personal Essay on interest in Crop Protection', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 3,
    status: ScholarshipStatus.ACTIVE,
    tags: ['basf', 'crop protection', 'entomology', 'plant pathology', 'weed science', 'agriculture']
  },

  // =========================================================================
  // 14. DOST-SEI Merit Scholarship (Government)
  // =========================================================================
  {
    name: 'DOST-SEI Merit Scholarship Program',
    description: `The Department of Science and Technology - Science Education Institute (DOST-SEI) Merit Scholarship Program provides comprehensive financial assistance to students pursuing priority science and technology courses.`,
    sponsor: 'Department of Science and Technology - Science Education Institute',
    type: ScholarshipType.GOVERNMENT,
    totalGrant: 120000,
    awardDescription: 'Full tuition + ₱7,000 monthly stipend + book allowance',
    eligibilityCriteria: {
      eligibleCourses: [
        'BS Biology', 'BS Chemistry', 'BS Mathematics', 'BS Applied Mathematics',
        'BS Computer Science', 'BS Statistics', 'BS Physics', 'BS Agricultural Chemistry',
        'BS Chemical Engineering', 'BS Civil Engineering', 'BS Electrical Engineering',
        'BS Mechanical Engineering', 'BS Computer Engineering', 'BS Food Technology',
        'BS Nutrition', 'BS Agricultural Engineering'
      ],
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT, UPLBCollege.CAFS, UPLBCollege.CHE],
      minGWA: 1.0,
      maxGWA: 2.0,
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      additionalRequirements: [
        { description: 'Must be enrolled in a priority S&T course', isRequired: true },
        { description: 'Must maintain required GWA to retain scholarship', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'DOST-SEI Qualification Exam Result', isRequired: true },
      { name: 'Birth Certificate', isRequired: true },
      { name: 'Income Tax Return', isRequired: true }
    ],
    applicationDeadline: createDeadline(4),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 50,
    status: ScholarshipStatus.ACTIVE,
    tags: ['dost', 'sei', 'government', 'science', 'technology', 'merit']
  },

  // =========================================================================
  // 15. SM Foundation Scholarship
  // =========================================================================
  {
    name: 'SM Foundation College Scholarship Program',
    description: `The SM Foundation College Scholarship Program provides comprehensive support to deserving students who demonstrate financial need and academic potential.`,
    sponsor: 'SM Foundation',
    type: ScholarshipType.PRIVATE,
    totalGrant: 150000,
    awardDescription: 'Full tuition + ₱5,000 monthly allowance + book allowance',
    eligibilityCriteria: {
      minGWA: 1.0,
      maxGWA: 2.0,
      maxAnnualFamilyIncome: 300000,
      eligibleColleges: Object.values(UPLBCollege),
      eligibleCitizenship: [Citizenship.FILIPINO],
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      additionalRequirements: [
        { description: 'Must demonstrate significant financial need', isRequired: true },
        { description: 'Must participate in SM Foundation activities', isRequired: true }
      ]
    },
    requiredDocuments: [
      { name: 'Certificate of Registration', isRequired: true },
      { name: 'True Copy of Grades', isRequired: true },
      { name: 'Income Tax Return', isRequired: true },
      { name: 'Barangay Certificate of Indigency', isRequired: true },
      { name: 'Personal Essay', isRequired: true },
      { name: 'Photo ID', isRequired: true }
    ],
    applicationDeadline: createDeadline(3),
    applicationStartDate: new Date(),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 20,
    status: ScholarshipStatus.ACTIVE,
    tags: ['sm foundation', 'private', 'financial need', 'comprehensive']
  }
];

// =============================================================================
// Seed Function
// =============================================================================

const seedScholarships = async (Scholarship, adminUserId) => {
  try {
    await Scholarship.deleteMany({});
    console.log('Cleared existing scholarships');

    const scholarshipsWithAdmin = scholarshipsData.map(scholarship => ({
      ...scholarship,
      createdBy: adminUserId
    }));

    const insertedScholarships = await Scholarship.insertMany(scholarshipsWithAdmin);
    console.log(`Inserted ${insertedScholarships.length} scholarships`);

    return insertedScholarships;
  } catch (error) {
    console.error('Error seeding scholarships:', error);
    throw error;
  }
};

module.exports = {
  scholarshipsData,
  seedScholarships
};
