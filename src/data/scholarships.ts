// ============================================================================
// ISKOlarship - UPLB Scholarships Database
// Based on actual UPLB Office of Scholarships and Grants (OSG) data
// ============================================================================

import {
  Scholarship,
  ScholarshipType,
  YearLevel,
  UPLBCollege,
  AgricultureMajor,
  STBracket
} from '../types';

export const scholarships: Scholarship[] = [
  // ============================================================================
  // THESIS GRANTS
  // ============================================================================
  {
    id: 'aasp-sterix-thesis',
    name: 'Adopt-a-Student Program (AASP) - Sterix Incorporated Gift of HOPE Thesis Grant',
    description: 'Thesis grant for senior BS Biology or BS Agriculture (Major in Entomology) students. Provides financial support for thesis completion to students from low-income families.',
    sponsor: 'Sterix Incorporated',
    type: ScholarshipType.THESIS_GRANT,
    awardAmount: 15000,
    awardDescription: 'One-time thesis grant',
    eligibilityCriteria: {
      eligibleCourses: ['BS Biology', 'BS Agriculture'],
      eligibleMajors: [AgricultureMajor.ENTOMOLOGY],
      requiredYearLevels: [YearLevel.SENIOR],
      isFilipinoOnly: true,
      requiresApprovedThesis: true,
      minGWA: 2.5,
      maxAnnualFamilyIncome: 250000,
      mustNotHaveThesisGrant: true,
      additionalRequirements: [
        'Must have an approved Thesis Outline',
        'Must be a Filipino citizen'
      ]
    },
    requirements: [
      'Approved Thesis Outline (certified by adviser)',
      'Certificate of Grades/True Copy of Grades',
      'Certificate of Family Income',
      'Letter of Intent'
    ],
    applicationDeadline: new Date('2025-02-28'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 2,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['thesis', 'biology', 'agriculture', 'entomology']
  },
  {
    id: 'lbmfi-thesis',
    name: 'Lifebank Microfinance Foundation, Inc. (LBMFI) Undergraduate Thesis Grant',
    description: 'Thesis grant for students pursuing research in organic agriculture. Open to all BS courses at UPLB.',
    sponsor: 'Lifebank Microfinance Foundation, Inc.',
    type: ScholarshipType.THESIS_GRANT,
    awardAmount: 20000,
    awardDescription: 'Thesis research grant',
    eligibilityCriteria: {
      eligibleColleges: Object.values(UPLBCollege) as UPLBCollege[],
      minUnitsEnrolled: 38,
      mustNotHaveDisciplinaryAction: true,
      additionalRequirements: [
        'Must have passed at least 38 units of course work',
        'Must not have a grade of "5", "4" or "Inc." in the semester immediately preceding the application',
        'Is interested to pursue a thesis in the basic, applied or interdisciplinary aspects of organic agriculture'
      ]
    },
    requirements: [
      'Thesis Proposal on Organic Agriculture',
      'True Copy of Grades',
      'Certificate of No Disciplinary Action',
      'Endorsement from Thesis Adviser'
    ],
    applicationDeadline: new Date('2025-03-15'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 5,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['thesis', 'organic agriculture', 'research']
  },
  {
    id: 'aasp-che-alumni-thesis',
    name: 'Adopt-a-Student Program (AASP) - College of Human Ecology Alumni Association Thesis Grant',
    description: 'Thesis grant for graduating CHE students with financial need.',
    sponsor: 'College of Human Ecology Alumni Association',
    type: ScholarshipType.THESIS_GRANT,
    awardAmount: 10000,
    awardDescription: 'Thesis completion grant',
    eligibilityCriteria: {
      eligibleColleges: [UPLBCollege.CHE],
      requiredYearLevels: [YearLevel.SENIOR],
      requiredSTBrackets: [STBracket.PD80, STBracket.FULL_DISCOUNT, STBracket.FULL_DISCOUNT_WITH_STIPEND],
      mustNotHaveDisciplinaryAction: true,
      requiresApprovedThesis: true,
      mustNotHaveThesisGrant: true,
      additionalRequirements: [
        'CHE students graduating this semester',
        'Must belong to ST Bracket PD80, Full Discount or Full Discount with Stipend',
        'Must have an approved thesis proposal certified by Thesis/Academic Adviser, Unit Heads and CHE Dean'
      ]
    },
    requirements: [
      'Approved Thesis Proposal',
      'Certificate of ST Bracket',
      'Certificate of No Disciplinary Action from CHE',
      'Endorsement from Dean\'s Office'
    ],
    applicationDeadline: new Date('2025-01-31'),
    academicYear: '2024-2025',
    semester: 'First',
    slots: 3,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['thesis', 'CHE', 'graduating']
  },

  // ============================================================================
  // SCHOLARSHIP PROGRAMS
  // ============================================================================
  {
    id: 'aasp-tuazon',
    name: 'Adopt-a-Student Program (AASP) - Dr. Ernesto Tuazon',
    description: 'Scholarship for Junior or Senior students from Ilocos Sur or Laguna (preferably Calauan) pursuing chemistry-related courses.',
    sponsor: 'Dr. Ernesto Tuazon',
    type: ScholarshipType.PRIVATE,
    awardAmount: 25000,
    awardDescription: 'Semestral scholarship grant',
    eligibilityCriteria: {
      requiredYearLevels: [YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleCourses: ['BS Chemistry', 'BS Agricultural Chemistry', 'BS Chemical Engineering'],
      eligibleProvinces: ['Ilocos Sur', 'Laguna'],
      minGWA: 2.5,
      maxAnnualFamilyIncome: 150000,
      mustNotHaveOtherScholarship: true,
      minUnitsEnrolled: 15,
      additionalRequirements: [
        'Must be from Ilocos Sur or Laguna (preferably Calauan)',
        'Must be enrolled in at least 15 units at the time of the award'
      ]
    },
    requirements: [
      'True Copy of Grades',
      'Certificate of Residency',
      'Certificate of Family Income',
      'Application Form',
      'Photo (2x2)'
    ],
    applicationDeadline: new Date('2025-02-15'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 2,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['chemistry', 'Ilocos Sur', 'Laguna', 'Calauan']
  },
  {
    id: 'sterix-hope-scholarship',
    name: 'Sterix Incorporated Gift of HOPE (Holistic Offerings to Promote Excellence) Scholarship Program',
    description: 'Scholarship for Junior BS Biology or BS Agriculture (Major in Entomology) students with financial need.',
    sponsor: 'Sterix Incorporated',
    type: ScholarshipType.PRIVATE,
    awardAmount: 30000,
    awardDescription: 'Semestral scholarship covering tuition and stipend',
    eligibilityCriteria: {
      eligibleCourses: ['BS Biology', 'BS Agriculture'],
      eligibleMajors: [AgricultureMajor.ENTOMOLOGY],
      requiredYearLevels: [YearLevel.JUNIOR],
      isFilipinoOnly: true,
      minGWA: 2.5,
      minUnitsEnrolled: 15,
      maxAnnualFamilyIncome: 250000,
      mustNotHaveOtherScholarship: true,
      additionalRequirements: [
        'Must be a Filipino citizen',
        'Must be enrolling to at least 15 units'
      ]
    },
    requirements: [
      'Application Form',
      'True Copy of Grades',
      'Certificate of Registration',
      'Certificate of Family Income',
      'Barangay Indigency Certificate',
      'Essay: Why I deserve this scholarship'
    ],
    applicationDeadline: new Date('2025-01-20'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 3,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['biology', 'agriculture', 'entomology', 'Filipino']
  },
  {
    id: 'aasp-ables',
    name: 'Adopt-a-Student Program (AASP) - Dr. Higino A. Ables',
    description: 'Scholarship for UPLB students from Sorsogon or Camarines Sur.',
    sponsor: 'Dr. Higino A. Ables',
    type: ScholarshipType.PRIVATE,
    awardAmount: 20000,
    awardDescription: 'Semestral scholarship grant',
    eligibilityCriteria: {
      eligibleProvinces: ['Sorsogon', 'Camarines Sur'],
      requiredYearLevels: [YearLevel.FRESHMAN, YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      minGWA: 2.5,
      minUnitsEnrolled: 15,
      maxAnnualFamilyIncome: 150000,
      mustNotHaveOtherScholarship: true,
      additionalRequirements: [
        'Must be a bonafide UPLB student',
        'Must come from Sorsogon or Camarines Sur',
        'Old Freshman, Sophomore, Junior or Senior standing'
      ]
    },
    requirements: [
      'Certificate of Residency (from Sorsogon or Camarines Sur)',
      'True Copy of Grades',
      'Certificate of Family Income',
      'Certificate of Registration',
      'Application Form'
    ],
    applicationDeadline: new Date('2025-02-01'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 2,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['Bicol', 'Sorsogon', 'Camarines Sur']
  },
  {
    id: 'aasp-cdo-odyssey',
    name: 'Adopt-a-Student Program (AASP) – Corazon Dayro Ong (CDO Odyssey Foundation, Inc.)',
    description: 'Scholarship for junior or senior students in BS Nutrition, BS Agriculture major in Animal Science, and BS Forestry.',
    sponsor: 'CDO Odyssey Foundation, Inc.',
    type: ScholarshipType.PRIVATE,
    awardAmount: 25000,
    awardDescription: 'Semestral scholarship grant',
    eligibilityCriteria: {
      requiredYearLevels: [YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleCourses: ['BS Nutrition', 'BS Agriculture', 'BS Forestry'],
      eligibleMajors: [AgricultureMajor.ANIMAL_SCIENCE],
      maxAnnualFamilyIncome: 250000,
      mustNotHaveOtherScholarship: true,
      mustNotHaveDisciplinaryAction: true,
      additionalRequirements: [
        'Must not have been the subject of any disciplinary action worse than a five-day class suspension'
      ]
    },
    requirements: [
      'Application Form',
      'True Copy of Grades',
      'Certificate of Family Income',
      'Certificate of No Disciplinary Action',
      'Personal Essay'
    ],
    applicationDeadline: new Date('2025-02-28'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 4,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['nutrition', 'animal science', 'forestry']
  },
  {
    id: 'aasp-fdf',
    name: 'Adopt-a-Student Program (AASP) - FDF',
    description: 'Scholarship for graduating students.',
    sponsor: 'FDF Foundation',
    type: ScholarshipType.PRIVATE,
    awardAmount: 15000,
    awardDescription: 'Graduation assistance grant',
    eligibilityCriteria: {
      requiredYearLevels: [YearLevel.SENIOR],
      additionalRequirements: [
        'Must be a graduating student this Second Semester, A.Y. 2024-2025'
      ]
    },
    requirements: [
      'Certificate of Graduation Candidacy',
      'True Copy of Grades',
      'Application Form'
    ],
    applicationDeadline: new Date('2025-03-01'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 5,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['graduating', 'senior']
  },
  {
    id: 'aasp-nicolas-angel',
    name: 'Adopt-a-Student Program (AASP) - Nicolas Nick Angel II',
    description: 'Scholarship for senior BS Agriculture or BS Forestry students who will graduate within the next academic year.',
    sponsor: 'Nicolas Nick Angel II',
    type: ScholarshipType.PRIVATE,
    awardAmount: 22000,
    awardDescription: 'Semestral scholarship grant',
    eligibilityCriteria: {
      requiredYearLevels: [YearLevel.SENIOR],
      eligibleCourses: ['BS Agriculture', 'BS Forestry'],
      minGWA: 2.5,
      maxAnnualFamilyIncome: 250000,
      mustNotHaveOtherScholarship: true,
      minUnitsEnrolled: 15,
      additionalRequirements: [
        'Must graduate by 2nd Semester AY 2025-2026',
        'Must be enrolled in at least 15 units at the time of the award'
      ]
    },
    requirements: [
      'True Copy of Grades',
      'Certificate of Family Income',
      'Certificate of Registration',
      'Application Form',
      'Study Plan showing graduation timeline'
    ],
    applicationDeadline: new Date('2025-02-15'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 2,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['agriculture', 'forestry', 'senior']
  },
  {
    id: 'aasp-humein',
    name: 'Adopt-a-Student Program (AASP) - Human Ecology Institute of the Philippines, Inc. (HUMEIN-Phils)',
    description: 'Scholarship for financially needy UPLB students.',
    sponsor: 'Human Ecology Institute of the Philippines, Inc.',
    type: ScholarshipType.PRIVATE,
    awardAmount: 18000,
    awardDescription: 'Semestral financial assistance',
    eligibilityCriteria: {
      maxAnnualFamilyIncome: 250000,
      additionalRequirements: [
        'Must be financially in need with gross annual family income from all sources not more than ₱250,000.00'
      ]
    },
    requirements: [
      'Certificate of Family Income',
      'Barangay Indigency Certificate',
      'True Copy of Grades',
      'Application Form',
      'Essay: Financial challenges and educational goals'
    ],
    applicationDeadline: new Date('2025-02-20'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 5,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['financial need', 'general']
  },
  {
    id: 'aasp-ims',
    name: 'Adopt-a-Student Program (AASP) - IMS Program',
    description: 'Scholarship for students in Mathematics-related programs at UPLB.',
    sponsor: 'Institute of Mathematical Sciences and Physics',
    type: ScholarshipType.COLLEGE,
    awardAmount: 20000,
    awardDescription: 'Semestral scholarship for Math students',
    eligibilityCriteria: {
      eligibleCourses: ['BS Applied Mathematics', 'BS Mathematics', 'BS Mathematics and Science Teaching'],
      requiredYearLevels: [YearLevel.JUNIOR, YearLevel.SENIOR],
      minUnitsEnrolled: 15,
      requiredSTBrackets: [STBracket.PD80, STBracket.FULL_DISCOUNT, STBracket.FULL_DISCOUNT_WITH_STIPEND],
      additionalRequirements: [
        'Must be at least junior standing',
        'Must be enrolled in at least 15 units (unless graduating with certification from the college)',
        'Must have a good academic standing',
        'Must belong to ST-S bracket PD80 to FDS'
      ]
    },
    requirements: [
      'True Copy of Grades',
      'Certificate of ST Bracket',
      'Certificate of Registration',
      'Recommendation from IMSP faculty'
    ],
    applicationDeadline: new Date('2025-01-31'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 4,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['mathematics', 'IMSP', 'CAS']
  },
  {
    id: 'aasp-camilla-ables',
    name: 'Adopt-a-Student Program (AASP) - Camilla Yandoc Ables',
    description: 'Scholarship for Junior or Senior students of BS Agriculture major in Plant Pathology.',
    sponsor: 'Camilla Yandoc Ables',
    type: ScholarshipType.PRIVATE,
    awardAmount: 20000,
    awardDescription: 'Semestral scholarship grant',
    eligibilityCriteria: {
      requiredYearLevels: [YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleCourses: ['BS Agriculture'],
      eligibleMajors: [AgricultureMajor.PLANT_PATHOLOGY],
      minGWA: 2.5,
      maxAnnualFamilyIncome: 150000,
      mustNotHaveOtherScholarship: true,
      minUnitsEnrolled: 15,
      additionalRequirements: [
        'Must be enrolled in at least 15 units at the time of the award'
      ]
    },
    requirements: [
      'True Copy of Grades',
      'Certificate of Major/Specialization',
      'Certificate of Family Income',
      'Certificate of Registration',
      'Application Form'
    ],
    applicationDeadline: new Date('2025-02-10'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 2,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['agriculture', 'plant pathology', 'CAFS']
  },
  {
    id: 'basf-agri',
    name: 'BASF Agricultural Research Foundation Inc. Scholarship Grant',
    description: 'Scholarship for sophomore BS Agriculture students majoring in Crop Protection (Entomology, Plant Pathology, or Weed Science).',
    sponsor: 'BASF Agricultural Research Foundation Inc.',
    type: ScholarshipType.PRIVATE,
    awardAmount: 50000,
    awardDescription: 'Annual scholarship covering tuition and living allowance',
    eligibilityCriteria: {
      requiredYearLevels: [YearLevel.SOPHOMORE],
      eligibleCourses: ['BS Agriculture'],
      eligibleMajors: [
        AgricultureMajor.ENTOMOLOGY,
        AgricultureMajor.PLANT_PATHOLOGY,
        AgricultureMajor.WEED_SCIENCE
      ],
      minGWA: 2.5,
      minUnitsEnrolled: 15,
      maxAnnualFamilyIncome: 500000,
      mustNotHaveOtherScholarship: true,
      additionalRequirements: [
        'Must have no grade of "4", "5", or "INC" in the semester immediately preceding the application',
        'One (1) slot each for Entomology, Plant Pathology, and Weed Science majors'
      ]
    },
    requirements: [
      'True Copy of Grades (no 4, 5, or INC)',
      'Certificate of Major/Specialization in Crop Protection',
      'Certificate of Family Income',
      'Certificate of Registration',
      'Application Form',
      'Two (2) Recommendation Letters'
    ],
    applicationDeadline: new Date('2025-06-30'),
    academicYear: '2025-2026',
    semester: 'First',
    slots: 3,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-01'),
    tags: ['agriculture', 'crop protection', 'BASF', 'entomology', 'plant pathology', 'weed science']
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getScholarshipById = (id: string): Scholarship | undefined => {
  return scholarships.find(s => s.id === id);
};

export const getActiveScholarships = (): Scholarship[] => {
  return scholarships.filter(s => s.isActive);
};

export const getScholarshipsByType = (type: ScholarshipType): Scholarship[] => {
  return scholarships.filter(s => s.type === type);
};

export const getUpcomingDeadlines = (days: number = 30): Scholarship[] => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return scholarships
    .filter(s => s.isActive && s.applicationDeadline >= now && s.applicationDeadline <= futureDate)
    .sort((a, b) => a.applicationDeadline.getTime() - b.applicationDeadline.getTime());
};

export const getScholarshipStats = () => {
  const active = scholarships.filter(s => s.isActive);
  const totalSlots = active.reduce((sum, s) => sum + (s.slots || 0), 0);
  const totalAmount = active.reduce((sum, s) => sum + (s.awardAmount || 0), 0);
  const totalFunding = active.reduce((sum, s) => sum + ((s.awardAmount || 0) * (s.slots || 1)), 0);
  
  return {
    totalScholarships: scholarships.length,
    activeScholarships: active.length,
    totalSlots,
    totalFunding,
    averageAmount: Math.round(totalAmount / active.length),
    byType: {
      university: scholarships.filter(s => s.type === ScholarshipType.UNIVERSITY).length,
      college: scholarships.filter(s => s.type === ScholarshipType.COLLEGE).length,
      government: scholarships.filter(s => s.type === ScholarshipType.GOVERNMENT).length,
      private: scholarships.filter(s => s.type === ScholarshipType.PRIVATE).length,
      thesisGrant: scholarships.filter(s => s.type === ScholarshipType.THESIS_GRANT).length
    }
  };
};