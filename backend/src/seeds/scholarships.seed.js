// =============================================================================
// ISKOlarship - Scholarship Seed Data
// Based on UPLB OSG scholarship portfolio and research paper
// =============================================================================

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Scholarship, ScholarshipType, ScholarshipStatus } = require('../models/Scholarship.model');
const { UPLBCollege, YearLevel, STBracket } = require('../models/User.model');

// =============================================================================
// UPLB Scholarship Data (from OSG and research paper)
// =============================================================================

const scholarshipsData = [
  // =========================================================================
  // UNIVERSITY SCHOLARSHIPS
  // =========================================================================
  {
    name: 'University Scholar',
    description: 'Awarded to students who obtain a weighted average of 1.20 or better and carry the normal load prescribed in the curriculum. University Scholars are entitled to free tuition and other school fees.',
    sponsor: 'University of the Philippines',
    type: ScholarshipType.UNIVERSITY,
    awardAmount: 0,
    awardDescription: 'Full tuition and other school fees waiver',
    eligibilityCriteria: {
      minGWA: 1.20,
      requiredYearLevels: [YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: Object.values(UPLBCollege),
      mustNotHaveFailingGrade: true,
      mustNotHaveDisciplinaryAction: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must carry normal load prescribed in curriculum',
        'Must not have any incomplete or dropped subjects'
      ]
    },
    requirements: [
      'Certified True Copy of Grades',
      'Certificate of Registration',
      'Certificate of Good Moral Character'
    ],
    applicationDeadline: new Date('2025-02-15'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 500,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['merit-based', 'university-wide', 'tuition-free'],
    contactEmail: 'osg.uplb@up.edu.ph'
  },
  {
    name: 'College Scholar',
    description: 'Awarded to students who obtain a weighted average of 1.45 to 1.75 and carry the normal load prescribed in the curriculum. College Scholars are entitled to free tuition fees.',
    sponsor: 'University of the Philippines',
    type: ScholarshipType.UNIVERSITY,
    awardAmount: 0,
    awardDescription: 'Tuition fee waiver',
    eligibilityCriteria: {
      minGWA: 1.45,
      maxGWA: 1.75,
      requiredYearLevels: [YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      minUnitsEnrolled: 15,
      eligibleColleges: Object.values(UPLBCollege),
      mustNotHaveFailingGrade: true,
      mustNotHaveDisciplinaryAction: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must carry normal load prescribed in curriculum'
      ]
    },
    requirements: [
      'Certified True Copy of Grades',
      'Certificate of Registration'
    ],
    applicationDeadline: new Date('2025-02-15'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 1000,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['merit-based', 'university-wide', 'tuition-free'],
    contactEmail: 'osg.uplb@up.edu.ph'
  },
  {
    name: 'DOST-SEI Undergraduate Scholarship',
    description: 'The DOST-SEI Merit Scholarship Program provides financial assistance to talented Filipino students pursuing priority S&T courses. Scholars receive tuition, book allowance, and monthly stipend.',
    sponsor: 'Department of Science and Technology - Science Education Institute',
    type: ScholarshipType.GOVERNMENT,
    awardAmount: 10000,
    awardDescription: 'Tuition + ₱7,000 monthly stipend + ₱10,000 book allowance per year',
    eligibilityCriteria: {
      minGWA: 2.0,
      requiredYearLevels: [YearLevel.FRESHMAN, YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: [
        UPLBCollege.CAS,
        UPLBCollege.CEAT,
        UPLBCollege.CAFS
      ],
      eligibleCourses: [
        'BS Computer Science',
        'BS Biology',
        'BS Chemistry',
        'BS Mathematics',
        'BS Statistics',
        'BS Applied Physics',
        'BS Chemical Engineering',
        'BS Civil Engineering',
        'BS Electrical Engineering',
        'BS Agricultural and Biosystems Engineering',
        'BS Food Technology',
        'BS Agricultural Biotechnology'
      ],
      mustNotHaveOtherScholarship: true,
      mustNotHaveFailingGrade: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must have passed the DOST-SEI scholarship examination',
        'Must maintain required GWA per semester'
      ]
    },
    requirements: [
      'DOST-SEI Scholarship Certificate',
      'Certified True Copy of Grades',
      'Certificate of Registration',
      'Certificate of Good Moral Character',
      'PSA Birth Certificate'
    ],
    applicationDeadline: new Date('2025-01-31'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 200,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['government', 'STEM', 'merit-based', 'with-stipend'],
    contactEmail: 'dost-sei@sei.dost.gov.ph',
    websiteUrl: 'https://www.sei.dost.gov.ph'
  },
  {
    name: 'CHED Tulong Dunong Program',
    description: 'A study grant program for financially disadvantaged but academically able Filipino students. Provides financial assistance to cover tuition and other school fees.',
    sponsor: 'Commission on Higher Education',
    type: ScholarshipType.GOVERNMENT,
    awardAmount: 60000,
    awardDescription: '₱60,000 per academic year for tuition and fees',
    eligibilityCriteria: {
      minGWA: 2.5,
      requiredYearLevels: [YearLevel.FRESHMAN, YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: Object.values(UPLBCollege),
      maxAnnualFamilyIncome: 400000,
      mustNotHaveOtherScholarship: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must be a Filipino citizen',
        'Must come from a low-income family'
      ]
    },
    requirements: [
      'CHED Application Form',
      'Certificate of Registration',
      'Income Tax Return or Certificate of Indigency',
      'Barangay Certificate',
      'PSA Birth Certificate'
    ],
    applicationDeadline: new Date('2025-02-28'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 150,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['government', 'need-based', 'tuition-assistance'],
    contactEmail: 'tulong.dunong@ched.gov.ph',
    websiteUrl: 'https://ched.gov.ph'
  },
  {
    name: 'Socialized Tuition System (STS) - Bracket A',
    description: 'Full tuition discount for students from the lowest income bracket. Part of UP\'s commitment to accessible quality education for all Filipinos regardless of financial capacity.',
    sponsor: 'University of the Philippines',
    type: ScholarshipType.UNIVERSITY,
    awardAmount: 0,
    awardDescription: 'Full tuition fee discount (100%)',
    eligibilityCriteria: {
      requiredYearLevels: [YearLevel.FRESHMAN, YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: Object.values(UPLBCollege),
      maxAnnualFamilyIncome: 120000,
      requiredSTBrackets: [STBracket.FULL_DISCOUNT],
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must undergo STS assessment',
        'Annual family income must not exceed ₱120,000'
      ]
    },
    requirements: [
      'STS Application Form',
      'Income Tax Return',
      'Certificate of Indigency (if applicable)',
      'Barangay Certificate',
      'Utility Bills'
    ],
    applicationDeadline: new Date('2025-01-15'),
    academicYear: '2024-2025',
    semester: 'Second',
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['need-based', 'tuition-discount', 'STS'],
    contactEmail: 'sts.uplb@up.edu.ph'
  },
  {
    name: 'UPLB Student Assistantship Program',
    description: 'Provides part-time employment opportunities for financially-challenged students. Assistants work 3-4 hours daily in various university offices and receive monthly stipend.',
    sponsor: 'University of the Philippines Los Baños',
    type: ScholarshipType.UNIVERSITY,
    awardAmount: 5000,
    awardDescription: '₱5,000 monthly stipend for 60-80 hours of work',
    eligibilityCriteria: {
      minGWA: 2.5,
      requiredYearLevels: [YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: Object.values(UPLBCollege),
      maxAnnualFamilyIncome: 300000,
      mustNotHaveOtherScholarship: false,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must be willing to render 60-80 hours of service per month',
        'Must maintain satisfactory academic standing'
      ]
    },
    requirements: [
      'Application Form',
      'Certificate of Registration',
      'Certified True Copy of Grades',
      'Income Documentation',
      'Medical Certificate'
    ],
    applicationDeadline: new Date('2025-02-01'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 300,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['need-based', 'student-employment', 'with-stipend'],
    contactEmail: 'sap.uplb@up.edu.ph'
  },

  // =========================================================================
  // COLLEGE-SPECIFIC SCHOLARSHIPS
  // =========================================================================
  {
    name: 'CAS Dean\'s Scholarship',
    description: 'Merit scholarship for outstanding students of the College of Arts and Sciences. Awarded based on academic excellence and contribution to college activities.',
    sponsor: 'College of Arts and Sciences - UPLB',
    type: ScholarshipType.COLLEGE,
    awardAmount: 15000,
    awardDescription: '₱15,000 per semester',
    eligibilityCriteria: {
      minGWA: 1.50,
      requiredYearLevels: [YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: [UPLBCollege.CAS],
      mustNotHaveFailingGrade: true,
      mustNotHaveDisciplinaryAction: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must be enrolled in CAS',
        'Must have active participation in college activities'
      ]
    },
    requirements: [
      'Application Letter',
      'Certified True Copy of Grades',
      'Certificate of Good Moral Character',
      'List of Extracurricular Activities'
    ],
    applicationDeadline: new Date('2025-02-20'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 20,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['merit-based', 'college-specific', 'CAS'],
    contactEmail: 'cas.uplb@up.edu.ph'
  },
  {
    name: 'CEAT Engineering Excellence Award',
    description: 'Recognizes top-performing engineering students who demonstrate exceptional academic achievement and leadership in the College of Engineering and Agro-Industrial Technology.',
    sponsor: 'College of Engineering and Agro-Industrial Technology - UPLB',
    type: ScholarshipType.COLLEGE,
    awardAmount: 20000,
    awardDescription: '₱20,000 per semester + priority internship placement',
    eligibilityCriteria: {
      minGWA: 1.45,
      requiredYearLevels: [YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: [UPLBCollege.CEAT],
      eligibleCourses: [
        'BS Agricultural and Biosystems Engineering',
        'BS Chemical Engineering',
        'BS Civil Engineering',
        'BS Electrical Engineering',
        'BS Industrial Engineering'
      ],
      mustNotHaveFailingGrade: true,
      mustNotHaveDisciplinaryAction: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must be enrolled in an engineering program',
        'Must demonstrate leadership in engineering organizations'
      ]
    },
    requirements: [
      'Application Form',
      'Certified True Copy of Grades',
      'Recommendation Letter from Department Chair',
      'Portfolio of Engineering Projects',
      'Essay on Engineering Career Goals'
    ],
    applicationDeadline: new Date('2025-02-25'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 15,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['merit-based', 'college-specific', 'CEAT', 'engineering'],
    contactEmail: 'ceat.uplb@up.edu.ph'
  },
  {
    name: 'CEM Business Leaders Scholarship',
    description: 'Scholarship for exceptional students in the College of Economics and Management who show promise in business and economic leadership.',
    sponsor: 'College of Economics and Management - UPLB',
    type: ScholarshipType.COLLEGE,
    awardAmount: 18000,
    awardDescription: '₱18,000 per semester',
    eligibilityCriteria: {
      minGWA: 1.60,
      requiredYearLevels: [YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: [UPLBCollege.CEM],
      eligibleCourses: [
        'BS Economics',
        'BS Agribusiness Economics',
        'BS Accountancy',
        'BS Agricultural Economics'
      ],
      mustNotHaveFailingGrade: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must be active in CEM student organizations',
        'Must have entrepreneurship or business experience'
      ]
    },
    requirements: [
      'Application Form',
      'Certified True Copy of Grades',
      'Business Plan or Case Study',
      'Recommendation Letter'
    ],
    applicationDeadline: new Date('2025-02-18'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 10,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['merit-based', 'college-specific', 'CEM', 'business'],
    contactEmail: 'cem.uplb@up.edu.ph'
  },
  {
    name: 'CAFS Agricultural Innovation Grant',
    description: 'Supports students in agriculture-related programs who are conducting innovative research or projects that contribute to Philippine agricultural development.',
    sponsor: 'College of Agriculture and Food Science - UPLB',
    type: ScholarshipType.COLLEGE,
    awardAmount: 25000,
    awardDescription: '₱25,000 research/project grant + mentorship',
    eligibilityCriteria: {
      minGWA: 1.75,
      requiredYearLevels: [YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: [UPLBCollege.CAFS],
      eligibleCourses: [
        'BS Agriculture',
        'BS Agricultural Chemistry',
        'BS Agricultural Biotechnology',
        'BS Food Technology'
      ],
      mustNotHaveFailingGrade: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must have an approved research proposal',
        'Must be endorsed by a faculty adviser'
      ]
    },
    requirements: [
      'Research Proposal',
      'Certified True Copy of Grades',
      'Faculty Endorsement Letter',
      'Budget Breakdown'
    ],
    applicationDeadline: new Date('2025-03-01'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 25,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['research', 'college-specific', 'CAFS', 'agriculture'],
    contactEmail: 'cafs.uplb@up.edu.ph'
  },

  // =========================================================================
  // PRIVATE SCHOLARSHIPS
  // =========================================================================
  {
    name: 'SM Foundation Scholarship',
    description: 'Full scholarship program by SM Foundation for deserving Filipino students from low-income families. Covers tuition, allowance, and other educational expenses.',
    sponsor: 'SM Foundation Inc.',
    type: ScholarshipType.PRIVATE,
    awardAmount: 80000,
    awardDescription: 'Full tuition + ₱8,000 monthly allowance + book allowance',
    eligibilityCriteria: {
      minGWA: 2.0,
      requiredYearLevels: [YearLevel.FRESHMAN, YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: Object.values(UPLBCollege),
      maxAnnualFamilyIncome: 250000,
      mustNotHaveOtherScholarship: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must be a Filipino citizen',
        'Must come from a family with limited financial resources',
        'Must be willing to participate in SM Foundation activities'
      ]
    },
    requirements: [
      'SM Foundation Application Form',
      'Certified True Copy of Grades',
      'Income Tax Return',
      'Barangay Certificate',
      'Essay on Career Goals',
      '2x2 ID Photo'
    ],
    applicationDeadline: new Date('2025-03-15'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 50,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['private', 'need-based', 'full-scholarship', 'with-stipend'],
    contactEmail: 'scholarship@sm-foundation.org',
    websiteUrl: 'https://www.sm-foundation.org'
  },
  {
    name: 'Ayala Foundation Scholarship',
    description: 'Comprehensive scholarship for outstanding students pursuing degrees aligned with national development priorities. Includes tuition assistance and leadership development programs.',
    sponsor: 'Ayala Foundation Inc.',
    type: ScholarshipType.PRIVATE,
    awardAmount: 100000,
    awardDescription: 'Full tuition + ₱10,000 monthly stipend + leadership training',
    eligibilityCriteria: {
      minGWA: 1.75,
      requiredYearLevels: [YearLevel.FRESHMAN, YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT, UPLBCollege.CEM],
      eligibleCourses: [
        'BS Computer Science',
        'BS Civil Engineering',
        'BS Electrical Engineering',
        'BS Economics',
        'BS Accountancy'
      ],
      maxAnnualFamilyIncome: 400000,
      mustNotHaveOtherScholarship: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must demonstrate leadership potential',
        'Must be willing to participate in community service'
      ]
    },
    requirements: [
      'Online Application',
      'Certified True Copy of Grades',
      'Income Documentation',
      'Essay on Leadership Experience',
      'Two Recommendation Letters'
    ],
    applicationDeadline: new Date('2025-02-28'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 30,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['private', 'merit-based', 'leadership', 'with-stipend'],
    contactEmail: 'scholarship@ayalafoundation.org',
    websiteUrl: 'https://www.ayalafoundation.org'
  },
  {
    name: 'PLDT-Smart Foundation Scholarship',
    description: 'Technology-focused scholarship for students in IT and engineering fields. Provides financial support and industry exposure through internship opportunities.',
    sponsor: 'PLDT-Smart Foundation',
    type: ScholarshipType.PRIVATE,
    awardAmount: 60000,
    awardDescription: '₱60,000 annual grant + internship opportunity',
    eligibilityCriteria: {
      minGWA: 1.85,
      requiredYearLevels: [YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT],
      eligibleCourses: [
        'BS Computer Science',
        'BS Electrical Engineering',
        'BS Statistics',
        'BS Applied Mathematics'
      ],
      maxAnnualFamilyIncome: 500000,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must be pursuing a technology-related course',
        'Must be interested in telecommunications industry'
      ]
    },
    requirements: [
      'Application Form',
      'Certified True Copy of Grades',
      'Resume/CV',
      'Essay on Technology Innovation',
      'Income Documentation'
    ],
    applicationDeadline: new Date('2025-03-10'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 40,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['private', 'technology', 'STEM', 'with-internship'],
    contactEmail: 'scholarship@pldtsmartfoundation.com',
    websiteUrl: 'https://pldtsmartfoundation.com'
  },
  {
    name: 'Jollibee Group Foundation Scholarship',
    description: 'Supports students from entrepreneurial families or those interested in food service and business management. Provides comprehensive financial assistance.',
    sponsor: 'Jollibee Group Foundation',
    type: ScholarshipType.PRIVATE,
    awardAmount: 50000,
    awardDescription: '₱50,000 per academic year',
    eligibilityCriteria: {
      minGWA: 2.25,
      requiredYearLevels: [YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: [UPLBCollege.CEM, UPLBCollege.CHE, UPLBCollege.CAFS],
      eligibleCourses: [
        'BS Agribusiness Economics',
        'BS Food Technology',
        'BS Human Ecology',
        'BS Economics',
        'BS Accountancy'
      ],
      maxAnnualFamilyIncome: 350000,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must have interest in food service or business',
        'Preferably from entrepreneurial family background'
      ]
    },
    requirements: [
      'Application Form',
      'Certified True Copy of Grades',
      'Income Documentation',
      'Essay on Entrepreneurship Goals',
      'Barangay Certificate'
    ],
    applicationDeadline: new Date('2025-02-15'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 35,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['private', 'need-based', 'business', 'food-industry'],
    contactEmail: 'jgfscholar@jollibee.com.ph'
  },

  // =========================================================================
  // THESIS/RESEARCH GRANTS
  // =========================================================================
  {
    name: 'UPLB Undergraduate Thesis Grant',
    description: 'Financial support for undergraduate students conducting thesis research. Covers research materials, equipment usage, and other thesis-related expenses.',
    sponsor: 'University of the Philippines Los Baños',
    type: ScholarshipType.THESIS_GRANT,
    awardAmount: 15000,
    awardDescription: '₱15,000 thesis research grant',
    eligibilityCriteria: {
      minGWA: 2.0,
      requiredYearLevels: [YearLevel.SENIOR],
      eligibleColleges: Object.values(UPLBCollege),
      requiresApprovedThesis: true,
      mustNotHaveThesisGrant: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must have approved thesis proposal',
        'Must have thesis adviser endorsement'
      ]
    },
    requirements: [
      'Approved Thesis Proposal',
      'Thesis Adviser Endorsement',
      'Detailed Budget Breakdown',
      'Certified True Copy of Grades',
      'Certificate of Registration'
    ],
    applicationDeadline: new Date('2025-01-31'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 100,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['research', 'thesis', 'undergraduate'],
    contactEmail: 'research.uplb@up.edu.ph'
  },
  {
    name: 'DOST-ASTHRDP Thesis Support',
    description: 'Research grant for students in science and technology fields. Part of the Accelerated Science and Technology Human Resource Development Program.',
    sponsor: 'Department of Science and Technology',
    type: ScholarshipType.THESIS_GRANT,
    awardAmount: 30000,
    awardDescription: '₱30,000 research grant + laboratory access',
    eligibilityCriteria: {
      minGWA: 1.75,
      requiredYearLevels: [YearLevel.SENIOR],
      eligibleColleges: [UPLBCollege.CAS, UPLBCollege.CEAT, UPLBCollege.CAFS],
      eligibleCourses: [
        'BS Biology',
        'BS Chemistry',
        'BS Computer Science',
        'BS Agricultural Biotechnology',
        'BS Chemical Engineering'
      ],
      requiresApprovedThesis: true,
      mustNotHaveThesisGrant: true,
      isFilipinoOnly: true,
      additionalRequirements: [
        'Thesis must be in priority S&T area',
        'Must have faculty endorsement'
      ]
    },
    requirements: [
      'DOST Application Form',
      'Approved Thesis Proposal',
      'Faculty Endorsement',
      'Research Timeline',
      'Budget Proposal'
    ],
    applicationDeadline: new Date('2025-02-28'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 50,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['research', 'thesis', 'STEM', 'government'],
    contactEmail: 'asthrdp@dost.gov.ph',
    websiteUrl: 'https://www.dost.gov.ph'
  },

  // =========================================================================
  // LOCATION-BASED SCHOLARSHIPS
  // =========================================================================
  {
    name: 'Laguna Provincial Scholarship',
    description: 'Scholarship for students who are bonafide residents of Laguna province. Supports local students in pursuing higher education at UPLB.',
    sponsor: 'Provincial Government of Laguna',
    type: ScholarshipType.GOVERNMENT,
    awardAmount: 20000,
    awardDescription: '₱20,000 per semester',
    eligibilityCriteria: {
      minGWA: 2.25,
      requiredYearLevels: [YearLevel.FRESHMAN, YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: Object.values(UPLBCollege),
      maxAnnualFamilyIncome: 300000,
      eligibleProvinces: ['Laguna'],
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must be a bonafide resident of Laguna',
        'Must have lived in Laguna for at least 3 years'
      ]
    },
    requirements: [
      'Application Form',
      'Barangay Certificate of Residency',
      'Certified True Copy of Grades',
      'Income Documentation',
      'PSA Birth Certificate'
    ],
    applicationDeadline: new Date('2025-02-10'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 100,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['government', 'location-based', 'Laguna'],
    contactEmail: 'scholarship@laguna.gov.ph'
  },
  {
    name: 'Batangas Provincial Educational Assistance',
    description: 'Educational assistance for students from Batangas pursuing studies in any UPLB college. Part of the provincial government\'s education support program.',
    sponsor: 'Provincial Government of Batangas',
    type: ScholarshipType.GOVERNMENT,
    awardAmount: 15000,
    awardDescription: '₱15,000 per semester',
    eligibilityCriteria: {
      minGWA: 2.5,
      requiredYearLevels: [YearLevel.FRESHMAN, YearLevel.SOPHOMORE, YearLevel.JUNIOR, YearLevel.SENIOR],
      eligibleColleges: Object.values(UPLBCollege),
      maxAnnualFamilyIncome: 250000,
      eligibleProvinces: ['Batangas'],
      isFilipinoOnly: true,
      additionalRequirements: [
        'Must be a registered voter of Batangas (or parents)',
        'Must be a bonafide resident of Batangas'
      ]
    },
    requirements: [
      'Application Form',
      'Voter\'s Certificate or Parent\'s Voter ID',
      'Barangay Certificate',
      'Certified True Copy of Grades',
      'Income Tax Return'
    ],
    applicationDeadline: new Date('2025-02-20'),
    academicYear: '2024-2025',
    semester: 'Second',
    slots: 80,
    status: ScholarshipStatus.ACTIVE,
    isActive: true,
    tags: ['government', 'location-based', 'Batangas'],
    contactEmail: 'scholarship@batangas.gov.ph'
  }
];

// =============================================================================
// Seed Function
// =============================================================================

const seedScholarships = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing scholarships
    console.log('🗑️  Clearing existing scholarships...');
    await Scholarship.deleteMany({});
    console.log('✅ Cleared existing scholarships');

    // Create a temporary admin user ID for createdBy field
    const tempAdminId = new mongoose.Types.ObjectId();

    // Add createdBy to each scholarship
    const scholarshipsWithAdmin = scholarshipsData.map(scholarship => ({
      ...scholarship,
      createdBy: tempAdminId
    }));

    // Insert scholarships
    console.log('📚 Inserting scholarships...');
    const result = await Scholarship.insertMany(scholarshipsWithAdmin);
    console.log(`✅ Successfully inserted ${result.length} scholarships`);

    // Summary
    console.log('\n📊 Scholarship Summary:');
    const summary = await Scholarship.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    summary.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    console.log('\n🎉 Scholarship seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding scholarships:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the seed
seedScholarships();
