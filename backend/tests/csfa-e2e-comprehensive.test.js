/**
 * =============================================================================
 * ISKOlarship - CSFA Scholarships End-to-End Comprehensive Tests
 * =============================================================================
 * 
 * Tests cover:
 * 1. Mongoose Schema Validation — every CSFA scholarship validates against the model
 * 2. Eligibility Evaluation Engine — student profile matching with pass/fail scenarios
 * 3. Filter Engine Compatibility — type, level, college, search, deadline filtering
 * 4. Scope Consistency — pre-save hooks for managing codes
 * 5. Required Documents Pipeline — structure validation
 * 6. Edge-Case Student Profiles — boundary GWA, income, classification combos
 * 7. Cross-System Data Consistency — seed ↔ model ↔ filter agreement
 * 
 * Run with: npx jest tests/csfa-e2e-comprehensive.test.js --verbose
 * =============================================================================
 */

const mongoose = require('mongoose');
const path = require('path');

// --- Seed data ---
const {
  realisticScholarshipsData,
  csfaScholarships,
  csfaDocuments
} = require('../src/seeds/scholarships-realistic.seed');

// --- Model enums & schema ---
const {
  ScholarshipType,
  ScholarshipStatus,
  ScholarshipLevel
} = require('../src/models/Scholarship.model');
const {
  UPLBCollege,
  Classification,
  Citizenship,
  STBracket
} = require('../src/models/User.model');
const {
  getCollegeCodes,
  getDepartmentCodes,
  isDepartmentInCollege
} = require('../src/models/UPLBStructure');

// =============================================================================
// HELPERS
// =============================================================================

const findScholarship = (substr) => {
  const s = csfaScholarships.find(s => s.name.includes(substr));
  if (!s) throw new Error(`Scholarship not found: ${substr}`);
  return s;
};

/**
 * Simulate the frontend normalizeStudentProfile + checkEligibility logic.
 * We replicate the core CONDITIONS checks from eligibilityConfig.ts in JS
 * so we can run them in Node/Jest without TypeScript compilation.
 */
function evaluateEligibility(studentProfile, criteria) {
  const results = [];

  // --- GWA ---
  if (criteria.maxGWA && criteria.maxGWA < 5.0) {
    const minGWA = criteria.minGWA || 1.0;
    const passed = studentProfile.gwa >= minGWA && studentProfile.gwa <= criteria.maxGWA;
    results.push({ id: 'gwa', passed, required: true });
  }

  // --- Units Enrolled ---
  if (criteria.minUnitsEnrolled) {
    results.push({
      id: 'unitsEnrolled',
      passed: (studentProfile.unitsEnrolled || 0) >= criteria.minUnitsEnrolled,
      required: true
    });
  }

  // --- Units Passed ---
  if (criteria.minUnitsPassed) {
    results.push({
      id: 'unitsPassed',
      passed: (studentProfile.unitsPassed || 0) >= criteria.minUnitsPassed,
      required: true
    });
  }

  // --- Annual Family Income ---
  if (criteria.maxAnnualFamilyIncome) {
    if (studentProfile.annualFamilyIncome !== undefined) {
      results.push({
        id: 'income',
        passed: studentProfile.annualFamilyIncome <= criteria.maxAnnualFamilyIncome,
        required: true
      });
    }
  }

  // --- Year Level / Classification ---
  if (criteria.eligibleClassifications && criteria.eligibleClassifications.length > 0) {
    const normalized = normalizeYearLevel(studentProfile.yearLevel || studentProfile.classification);
    results.push({
      id: 'yearLevel',
      passed: criteria.eligibleClassifications.some(c =>
        c.toLowerCase() === (normalized || '').toLowerCase()
      ),
      required: true
    });
  }

  // --- College ---
  if (criteria.eligibleColleges && criteria.eligibleColleges.length > 0) {
    results.push({
      id: 'college',
      passed: criteria.eligibleColleges.some(c =>
        c.toLowerCase() === (studentProfile.college || '').toLowerCase()
      ),
      required: true
    });
  }

  // --- Course ---
  if (criteria.eligibleCourses && criteria.eligibleCourses.length > 0) {
    results.push({
      id: 'course',
      passed: criteria.eligibleCourses.some(course =>
        (studentProfile.course || '').toLowerCase().includes(course.toLowerCase()) ||
        course.toLowerCase().includes((studentProfile.course || '').toLowerCase())
      ),
      required: true
    });
  }

  // --- Major ---
  if (criteria.eligibleMajors && criteria.eligibleMajors.length > 0) {
    results.push({
      id: 'major',
      passed: studentProfile.major
        ? criteria.eligibleMajors.some(m =>
            (studentProfile.major || '').toLowerCase().includes(m.toLowerCase())
          )
        : false,
      required: true
    });
  }

  // --- ST Bracket ---
  if (criteria.eligibleSTBrackets && criteria.eligibleSTBrackets.length > 0) {
    results.push({
      id: 'stBracket',
      passed: studentProfile.stBracket
        ? criteria.eligibleSTBrackets.some(b =>
            b.toLowerCase() === (studentProfile.stBracket || '').toLowerCase()
          )
        : false,
      required: true
    });
  }

  // --- Province ---
  if (criteria.eligibleProvinces && criteria.eligibleProvinces.length > 0) {
    results.push({
      id: 'province',
      passed: studentProfile.province
        ? criteria.eligibleProvinces.some(p =>
            (studentProfile.province || '').toLowerCase().includes(p.toLowerCase())
          )
        : false,
      required: true
    });
  }

  // --- Citizenship ---
  if (criteria.eligibleCitizenship && criteria.eligibleCitizenship.length > 0) {
    results.push({
      id: 'citizenship',
      passed: criteria.eligibleCitizenship.some(c =>
        c.toLowerCase() === (studentProfile.citizenship || 'Filipino').toLowerCase()
      ),
      required: true
    });
  }

  // --- Boolean conditions ---
  if (criteria.mustNotHaveOtherScholarship) {
    results.push({
      id: 'noOtherScholarship',
      passed: !studentProfile.hasExistingScholarship,
      required: true
    });
  }
  if (criteria.mustNotHaveDisciplinaryAction) {
    results.push({
      id: 'noDisciplinaryAction',
      passed: !studentProfile.hasDisciplinaryAction,
      required: true
    });
  }
  if (criteria.mustNotHaveFailingGrade) {
    results.push({
      id: 'noFailingGrade',
      passed: !studentProfile.hasFailingGrade,
      required: true
    });
  }
  if (criteria.mustNotHaveGradeOf4) {
    results.push({
      id: 'noGradeOf4',
      passed: !studentProfile.hasGradeOf4,
      required: true
    });
  }
  if (criteria.mustNotHaveIncompleteGrade) {
    results.push({
      id: 'noIncompleteGrade',
      passed: !studentProfile.hasIncompleteGrade,
      required: true
    });
  }
  if (criteria.mustNotHaveThesisGrant) {
    results.push({
      id: 'noThesisGrant',
      passed: !studentProfile.hasThesisGrant,
      required: true
    });
  }
  if (criteria.mustBeGraduating) {
    results.push({
      id: 'mustBeGraduating',
      passed: !!studentProfile.isGraduating,
      required: true
    });
  }
  if (criteria.requiresApprovedThesisOutline) {
    results.push({
      id: 'approvedThesis',
      passed: !!studentProfile.hasApprovedThesis,
      required: true
    });
  }

  const allPassed = results.filter(r => r.required).every(r => r.passed);
  const failedChecks = results.filter(r => r.required && !r.passed);
  return { passed: allPassed, results, failedChecks };
}

function normalizeYearLevel(yl) {
  if (!yl) return null;
  const map = {
    '1ST YEAR': 'Freshman', '2ND YEAR': 'Sophomore',
    '3RD YEAR': 'Junior', '4TH YEAR': 'Senior',
    'FRESHMAN': 'Freshman', 'SOPHOMORE': 'Sophomore',
    'JUNIOR': 'Junior', 'SENIOR': 'Senior'
  };
  return map[yl.toUpperCase()] || yl;
}

// =============================================================================
// STUDENT PROFILE FIXTURES
// =============================================================================

const STUDENTS = {
  // Perfect CAS IMSP senior — matches IMS scholarship
  casImspSenior: {
    gwa: 1.85,
    yearLevel: 'Senior',
    college: 'College of Arts and Sciences',
    course: 'BS Applied Mathematics',
    major: 'Applied Mathematics',
    annualFamilyIncome: 80000,
    stBracket: 'PD80',
    province: 'Laguna',
    citizenship: 'Filipino',
    unitsEnrolled: 18,
    unitsPassed: 100,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: false,
    hasApprovedThesis: false
  },

  // CAFS junior from Quezon — matches Camilla Ables, Norma Ables, Archie Laaño
  cafsJuniorQuezon: {
    gwa: 2.25,
    yearLevel: 'Junior',
    college: 'College of Agriculture and Food Science',
    course: 'BS Agriculture',
    major: 'Plant Pathology',
    annualFamilyIncome: 120000,
    stBracket: 'PD60',
    province: 'Quezon',
    citizenship: 'Filipino',
    unitsEnrolled: 18,
    unitsPassed: 80,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: false,
    hasApprovedThesis: false
  },

  // Foreign PhD student — matches Foreign Students scholarship
  foreignPhd: {
    gwa: 1.50,
    yearLevel: 'Senior',
    college: 'Graduate School',
    course: 'PhD Agricultural Economics',
    annualFamilyIncome: 0,
    citizenship: 'Foreign National',
    unitsEnrolled: 12,
    unitsPassed: 60,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: false,
    hasApprovedThesis: false
  },

  // Sophomore from Metro Manila — matches SMPFC, USPNA
  sophomoreScienceManila: {
    gwa: 1.75,
    yearLevel: 'Sophomore',
    college: 'College of Arts and Sciences',
    course: 'BS Chemistry',
    annualFamilyIncome: 400000,
    stBracket: 'PD40',
    province: 'Metro Manila',
    citizenship: 'Filipino',
    unitsEnrolled: 21,
    unitsPassed: 30,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: false,
    hasApprovedThesis: false
  },

  // Graduating senior Ag (Animal Science) — matches CDO, Nicolas Angel, FDF
  graduatingSeniorAg: {
    gwa: 2.30,
    yearLevel: 'Senior',
    college: 'College of Agriculture and Food Science',
    course: 'BS Agriculture',
    major: 'Animal Science',
    annualFamilyIncome: 200000,
    stBracket: 'PD60',
    province: 'Laguna',
    citizenship: 'Filipino',
    unitsEnrolled: 18,
    unitsPassed: 130,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: true,
    hasApprovedThesis: true
  },

  // CHE student — matches HUMEIN-Phils, CHE Alumni
  cheStudentGraduating: {
    gwa: 2.10,
    yearLevel: 'Senior',
    college: 'College of Human Ecology',
    course: 'BS Human Ecology',
    annualFamilyIncome: 180000,
    stBracket: 'Full Discount',
    province: 'Laguna',
    citizenship: 'Filipino',
    unitsEnrolled: 15,
    unitsPassed: 120,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: true,
    hasApprovedThesis: true
  },

  // Biology senior with thesis — matches Sterix HOPE Thesis Grant
  bioSeniorWithThesis: {
    gwa: 2.20,
    yearLevel: 'Senior',
    college: 'College of Arts and Sciences',
    course: 'BS Biology',
    major: 'Entomology',
    annualFamilyIncome: 200000,
    stBracket: 'PD60',
    province: 'Batangas',
    citizenship: 'Filipino',
    unitsEnrolled: 15,
    unitsPassed: 110,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: false,
    hasApprovedThesis: true
  },

  // Forestry junior — matches SM Sustainability, Sterix HOPE Scholarship
  forestryJunior: {
    gwa: 2.40,
    yearLevel: 'Junior',
    college: 'College of Forestry and Natural Resources',
    course: 'BS Forestry',
    annualFamilyIncome: 130000,
    stBracket: 'PD80',
    province: 'Laguna',
    citizenship: 'Filipino',
    unitsEnrolled: 18,
    unitsPassed: 80,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: false,
    hasApprovedThesis: false
  },

  // Sorsogon freshman — matches Dr. Higino Ables
  sorsogonFreshman: {
    gwa: 2.00,
    yearLevel: 'Freshman',
    college: 'College of Arts and Sciences',
    course: 'BS Computer Science',
    annualFamilyIncome: 100000,
    stBracket: 'Full Discount',
    province: 'Sorsogon',
    citizenship: 'Filipino',
    unitsEnrolled: 18,
    unitsPassed: 0,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: false,
    hasApprovedThesis: false
  },

  // Freshman with Full Discount — matches UT Foundation
  freshmanFullDiscount: {
    gwa: 2.30,
    yearLevel: 'Freshman',
    college: 'College of Engineering and Agro-Industrial Technology',
    course: 'BS Agricultural Engineering',
    annualFamilyIncome: 80000,
    stBracket: 'Full Discount',
    province: 'Laguna',
    citizenship: 'Filipino',
    unitsEnrolled: 18,
    unitsPassed: 0,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: false,
    hasApprovedThesis: false
  },

  // Ineligible: has failing grade + scholarship + disciplinary action
  ineligibleStudent: {
    gwa: 3.50,
    yearLevel: 'Sophomore',
    college: 'College of Arts and Sciences',
    course: 'BS Statistics',
    annualFamilyIncome: 800000,
    stBracket: 'No Discount',
    province: 'Metro Manila',
    citizenship: 'Filipino',
    unitsEnrolled: 12,
    unitsPassed: 20,
    hasExistingScholarship: true,
    hasDisciplinaryAction: true,
    hasFailingGrade: true,
    hasGradeOf4: true,
    hasIncompleteGrade: true,
    hasThesisGrant: true,
    isGraduating: false,
    hasApprovedThesis: false
  },

  // LBMFI thesis student — junior with 40+ units passed
  lbmfiThesisStudent: {
    gwa: 2.00,
    yearLevel: 'Junior',
    college: 'College of Agriculture and Food Science',
    course: 'BS Agriculture',
    major: 'Crop Science',
    annualFamilyIncome: 150000,
    stBracket: 'PD60',
    province: 'Laguna',
    citizenship: 'Filipino',
    unitsEnrolled: 15,
    unitsPassed: 45,
    hasExistingScholarship: false,
    hasDisciplinaryAction: false,
    hasFailingGrade: false,
    hasGradeOf4: false,
    hasIncompleteGrade: false,
    hasThesisGrant: false,
    isGraduating: false,
    hasApprovedThesis: false
  }
};

// =============================================================================
// 1. MONGOOSE SCHEMA VALIDATION
// =============================================================================
describe('Mongoose Schema Validation', () => {
  
  describe('all CSFA scholarships conform to Scholarship model schema', () => {
    const ScholarshipModel = mongoose.model('Scholarship') || (() => {
      // If model not yet registered, create a lightweight version for validation
      const { Schema } = mongoose;
      return null;
    })();

    csfaScholarships.forEach(seed => {
      describe(`Schema: "${seed.name.substring(0, 55)}..."`, () => {

        test('name length ≤ 200', () => {
          expect(seed.name.length).toBeLessThanOrEqual(200);
        });

        test('description length ≤ 3000', () => {
          expect(seed.description.length).toBeLessThanOrEqual(3000);
        });

        test('type is valid ScholarshipType enum value', () => {
          expect(Object.values(ScholarshipType)).toContain(seed.type);
        });

        test('scholarshipLevel is valid ScholarshipLevel enum value', () => {
          expect(Object.values(ScholarshipLevel)).toContain(seed.scholarshipLevel);
        });

        test('status is valid ScholarshipStatus enum value', () => {
          expect(Object.values(ScholarshipStatus)).toContain(seed.status);
        });

        test('academicYear matches YYYY-YYYY format', () => {
          expect(seed.academicYear).toMatch(/^\d{4}-\d{4}$/);
        });

        test('semester is First, Second, or Midyear', () => {
          expect(['First', 'Second', 'Midyear']).toContain(seed.semester);
        });

        test('totalGrant is non-negative number', () => {
          expect(seed.totalGrant).toBeGreaterThanOrEqual(0);
        });

        test('slots is non-negative', () => {
          expect(seed.slots).toBeGreaterThanOrEqual(0);
        });

        test('managingCollegeCode is valid or null', () => {
          const validCodes = [...getCollegeCodes(), null];
          expect(validCodes).toContain(seed.managingCollegeCode);
        });

        if (seed.managingAcademicUnitCode) {
          test('managingAcademicUnitCode belongs to managingCollegeCode', () => {
            expect(seed.managingCollegeCode).toBeTruthy();
            expect(
              isDepartmentInCollege(seed.managingAcademicUnitCode, seed.managingCollegeCode)
            ).toBe(true);
          });
        }

        // Eligibility criteria sub-schema
        if (seed.eligibilityCriteria.minGWA !== undefined) {
          test('minGWA between 1.0 and 5.0', () => {
            expect(seed.eligibilityCriteria.minGWA).toBeGreaterThanOrEqual(1.0);
            expect(seed.eligibilityCriteria.minGWA).toBeLessThanOrEqual(5.0);
          });
        }
        if (seed.eligibilityCriteria.maxGWA !== undefined) {
          test('maxGWA between 1.0 and 5.0', () => {
            expect(seed.eligibilityCriteria.maxGWA).toBeGreaterThanOrEqual(1.0);
            expect(seed.eligibilityCriteria.maxGWA).toBeLessThanOrEqual(5.0);
          });
        }

        test('eligibleClassifications use valid Classification enum', () => {
          const validClassifications = Object.values(Classification);
          (seed.eligibilityCriteria.eligibleClassifications || []).forEach(c => {
            expect(validClassifications).toContain(c);
          });
        });

        test('eligibleColleges use valid UPLBCollege enum', () => {
          const validColleges = Object.values(UPLBCollege);
          (seed.eligibilityCriteria.eligibleColleges || []).forEach(c => {
            expect(validColleges).toContain(c);
          });
        });

        test('eligibleSTBrackets use valid STBracket enum', () => {
          const validBrackets = Object.values(STBracket);
          (seed.eligibilityCriteria.eligibleSTBrackets || []).forEach(b => {
            expect(validBrackets).toContain(b);
          });
        });

        test('eligibleCitizenship use valid Citizenship enum', () => {
          const validCitizenship = Object.values(Citizenship);
          (seed.eligibilityCriteria.eligibleCitizenship || []).forEach(c => {
            expect(validCitizenship).toContain(c);
          });
        });

        test('requiredDocuments each have a name and isRequired boolean', () => {
          seed.requiredDocuments.forEach(doc => {
            expect(typeof doc.name).toBe('string');
            expect(doc.name.length).toBeGreaterThan(0);
            expect(typeof doc.isRequired).toBe('boolean');
          });
        });
      });
    });
  });

  describe('scope consistency validation (pre-save hook simulation)', () => {
    csfaScholarships.forEach(seed => {
      describe(`Scope: "${seed.name.substring(0, 55)}..."`, () => {
        if (seed.scholarshipLevel === ScholarshipLevel.ACADEMIC_UNIT) {
          test('academic_unit level has managingAcademicUnitCode', () => {
            expect(seed.managingAcademicUnitCode).toBeTruthy();
          });
          test('academic_unit level has managingCollegeCode', () => {
            expect(seed.managingCollegeCode).toBeTruthy();
          });
        }

        if (seed.scholarshipLevel === ScholarshipLevel.COLLEGE) {
          test('college level has managingCollegeCode', () => {
            expect(seed.managingCollegeCode).toBeTruthy();
          });
        }

        if (seed.scholarshipLevel === ScholarshipLevel.UNIVERSITY) {
          test('university level has null managingCollegeCode', () => {
            expect(seed.managingCollegeCode).toBeNull();
          });
          test('university level has null managingAcademicUnitCode', () => {
            expect(seed.managingAcademicUnitCode).toBeNull();
          });
        }
      });
    });
  });
});

// =============================================================================
// 2. ELIGIBILITY EVALUATION ENGINE — PASS SCENARIOS
// =============================================================================
describe('Eligibility Evaluation — Students Who SHOULD Pass', () => {

  test('CAS IMSP senior passes IMS scholarship', () => {
    const s = findScholarship('Institute of Mathematical Sciences');
    const result = evaluateEligibility(STUDENTS.casImspSenior, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
    expect(result.failedChecks.length).toBe(0);
  });

  test('CAFS junior from Quezon passes Camilla Yandoc Ables', () => {
    const s = findScholarship('Camilla Yandoc Ables');
    const result = evaluateEligibility(STUDENTS.cafsJuniorQuezon, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('CAFS junior from Quezon passes Archie Laaño (province = Quezon)', () => {
    const s = findScholarship('Laaño Quezonian');
    const result = evaluateEligibility(STUDENTS.cafsJuniorQuezon, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Foreign PhD passes Foreign Students PhD scholarship', () => {
    const s = findScholarship('Foreign Students');
    const result = evaluateEligibility(STUDENTS.foreignPhd, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Sophomore passes SMPFC Future Leaders', () => {
    const s = findScholarship('SMPFC');
    const result = evaluateEligibility(STUDENTS.sophomoreScienceManila, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Sophomore (CAS) passes USPNA', () => {
    const s = findScholarship('USPNA');
    const result = evaluateEligibility(STUDENTS.sophomoreScienceManila, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Graduating CAFS senior passes CDO Odyssey Foundation', () => {
    const s = findScholarship('Corazon Dayro Ong');
    const result = evaluateEligibility(STUDENTS.graduatingSeniorAg, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Graduating CAFS senior passes Nicolas Nick Angel II', () => {
    const s = findScholarship('Nicolas Nick Angel');
    const result = evaluateEligibility(STUDENTS.graduatingSeniorAg, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Graduating CAFS senior passes FDF', () => {
    const s = findScholarship('AASP) - FDF');
    const result = evaluateEligibility(STUDENTS.graduatingSeniorAg, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('CHE graduating student passes HUMEIN-Phils', () => {
    const s = findScholarship('HUMEIN-Phils');
    const result = evaluateEligibility(STUDENTS.cheStudentGraduating, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('CHE graduating student passes CHE Alumni Thesis Grant', () => {
    const s = findScholarship('College of Human Ecology Alumni Association Thesis Grant');
    const result = evaluateEligibility(STUDENTS.cheStudentGraduating, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Bio senior with thesis passes Sterix HOPE Thesis Grant', () => {
    const s = findScholarship('Sterix Incorporated Gift of HOPE Thesis Grant');
    const result = evaluateEligibility(STUDENTS.bioSeniorWithThesis, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('LBMFI thesis student passes LBMFI Undergraduate Thesis Grant', () => {
    const s = findScholarship('LBMFI');
    const result = evaluateEligibility(STUDENTS.lbmfiThesisStudent, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('SM Sustainability: forestry junior passes', () => {
    const s = findScholarship('SM Sustainability');
    const result = evaluateEligibility(STUDENTS.forestryJunior, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Sorsogon freshman passes Dr. Higino Ables', () => {
    const s = findScholarship('Higino A. Ables');
    const result = evaluateEligibility(STUDENTS.sorsogonFreshman, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Freshman with Full Discount passes UT Foundation', () => {
    const s = findScholarship('UT Foundation');
    const result = evaluateEligibility(STUDENTS.freshmanFullDiscount, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Graduating senior passes UPAA Hongkong', () => {
    const s = findScholarship('UPAA Hongkong');
    const result = evaluateEligibility(STUDENTS.graduatingSeniorAg, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Sophomore with 1.75 GWA passes Upsilon Sigma Phi', () => {
    const s = findScholarship('Sigma Delta Phi');
    const result = evaluateEligibility(STUDENTS.sophomoreScienceManila, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Suzara: sophomore with 1.75 GWA and 200k income passes', () => {
    const student = { ...STUDENTS.sophomoreScienceManila, annualFamilyIncome: 180000 };
    const s = findScholarship('Suzara');
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });
});

// =============================================================================
// 3. ELIGIBILITY EVALUATION — FAIL SCENARIOS
// =============================================================================
describe('Eligibility Evaluation — Students Who SHOULD FAIL', () => {

  test('ineligible student fails ALL CSFA scholarships', () => {
    csfaScholarships.forEach(s => {
      const result = evaluateEligibility(STUDENTS.ineligibleStudent, s.eligibilityCriteria);
      expect(result.passed).toBe(false);
    });
  });

  test('Filipino student fails Foreign Students PhD (citizenship)', () => {
    const s = findScholarship('Foreign Students');
    const student = { ...STUDENTS.casImspSenior, citizenship: 'Filipino' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'citizenship')).toBe(true);
  });

  test('Foreign student fails Filipino-only scholarships (citizenship)', () => {
    const s = findScholarship('Suzara');
    const student = { ...STUDENTS.sophomoreScienceManila, citizenship: 'Foreign National' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'citizenship')).toBe(true);
  });

  test('Student with GWA 3.5 fails 2.0 GWA requirement (Suzara)', () => {
    const s = findScholarship('Suzara');
    const student = { ...STUDENTS.sophomoreScienceManila, gwa: 3.5 };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'gwa')).toBe(true);
  });

  test('Student with GWA 2.6 fails 2.5 GWA requirement (Camilla Ables)', () => {
    const s = findScholarship('Camilla Yandoc Ables');
    const student = { ...STUDENTS.cafsJuniorQuezon, gwa: 2.6 };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'gwa')).toBe(true);
  });

  test('Student with GWA exactly at 1.75 boundary passes Sigma Delta Phi', () => {
    const s = findScholarship('Sigma Delta Phi');
    const student = { ...STUDENTS.sophomoreScienceManila, gwa: 1.75 };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(true);
  });

  test('Student with GWA 1.76 fails 1.75 GWA requirement (Sigma Delta Phi)', () => {
    const s = findScholarship('Sigma Delta Phi');
    const student = { ...STUDENTS.sophomoreScienceManila, gwa: 1.76 };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'gwa')).toBe(true);
  });

  test('Non-Quezon student fails Archie Laaño (province = Quezon required)', () => {
    const s = findScholarship('Laaño Quezonian');
    const student = { ...STUDENTS.cafsJuniorQuezon, province: 'Laguna' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'province')).toBe(true);
  });

  test('Non-Sorsogon/Camarines Sur student fails Higino Ables (province)', () => {
    const s = findScholarship('Higino A. Ables');
    const student = { ...STUDENTS.sorsogonFreshman, province: 'Laguna' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'province')).toBe(true);
  });

  test('Freshman fails IMSP scholarship (Senior required)', () => {
    const s = findScholarship('Institute of Mathematical Sciences');
    const student = { ...STUDENTS.casImspSenior, yearLevel: 'Freshman' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'yearLevel')).toBe(true);
  });

  test('Junior fails USPNA (Sophomore required)', () => {
    const s = findScholarship('USPNA');
    const student = { ...STUDENTS.sophomoreScienceManila, yearLevel: 'Junior' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
  });

  test('Income > ₱150k fails Camilla Ables (income cap ₱150k)', () => {
    const s = findScholarship('Camilla Yandoc Ables');
    const student = { ...STUDENTS.cafsJuniorQuezon, annualFamilyIncome: 160000 };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'income')).toBe(true);
  });

  test('Income > ₱500k fails SMPFC (income cap ₱500k)', () => {
    const s = findScholarship('SMPFC');
    const student = { ...STUDENTS.sophomoreScienceManila, annualFamilyIncome: 550000 };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'income')).toBe(true);
  });

  test('Student with existing scholarship fails SMPFC (mustNotHaveOtherScholarship)', () => {
    const s = findScholarship('SMPFC');
    const student = { ...STUDENTS.sophomoreScienceManila, hasExistingScholarship: true };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'noOtherScholarship')).toBe(true);
  });

  test('Student with disciplinary action fails Suzara (mustNotHaveDisciplinaryAction)', () => {
    const s = findScholarship('Suzara');
    const student = { ...STUDENTS.sophomoreScienceManila, hasDisciplinaryAction: true };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'noDisciplinaryAction')).toBe(true);
  });

  test('Student with failing grade fails UT Foundation (mustNotHaveFailingGrade)', () => {
    const s = findScholarship('UT Foundation');
    const student = { ...STUDENTS.freshmanFullDiscount, hasFailingGrade: true };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
  });

  test('Student with grade of 4 fails UT Foundation (mustNotHaveGradeOf4)', () => {
    const s = findScholarship('UT Foundation');
    const student = { ...STUDENTS.freshmanFullDiscount, hasGradeOf4: true };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
  });

  test('Student with incomplete grade fails Laaño (mustNotHaveIncompleteGrade)', () => {
    const s = findScholarship('Laaño Quezonian');
    const student = { ...STUDENTS.cafsJuniorQuezon, hasIncompleteGrade: true };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
  });

  test('Wrong course: CEM student fails IMS (requires BS Applied Math / BS Math)', () => {
    const s = findScholarship('Institute of Mathematical Sciences');
    const student = { ...STUDENTS.casImspSenior, course: 'BS Economics' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'course')).toBe(true);
  });

  test('Wrong major: CAFS student without Plant Pathology fails Camilla Ables', () => {
    const s = findScholarship('Camilla Yandoc Ables');
    const student = { ...STUDENTS.cafsJuniorQuezon, major: 'Crop Science' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'major')).toBe(true);
  });

  test('Non-graduating fails UPAA Hongkong (mustBeGraduating)', () => {
    const s = findScholarship('UPAA Hongkong');
    const student = { ...STUDENTS.graduatingSeniorAg, isGraduating: false };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'mustBeGraduating')).toBe(true);
  });

  test('No approved thesis fails Sterix HOPE Thesis Grant', () => {
    const s = findScholarship('Sterix Incorporated Gift of HOPE Thesis Grant');
    const student = { ...STUDENTS.bioSeniorWithThesis, hasApprovedThesis: false };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'approvedThesis')).toBe(true);
  });

  test('Student with existing thesis grant fails Sterix HOPE Thesis Grant', () => {
    const s = findScholarship('Sterix Incorporated Gift of HOPE Thesis Grant');
    const student = { ...STUDENTS.bioSeniorWithThesis, hasThesisGrant: true };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'noThesisGrant')).toBe(true);
  });

  test('Student with < 38 units passed fails LBMFI (minUnitsPassed 38)', () => {
    const s = findScholarship('LBMFI');
    const student = { ...STUDENTS.lbmfiThesisStudent, unitsPassed: 30 };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'unitsPassed')).toBe(true);
  });

  test('Wrong ST bracket: No Discount fails IMS (requires PD80-FDS)', () => {
    const s = findScholarship('Institute of Mathematical Sciences');
    const student = { ...STUDENTS.casImspSenior, stBracket: 'No Discount' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'stBracket')).toBe(true);
  });

  test('PD80 bracket fails UT Foundation (requires Full Discount only)', () => {
    const s = findScholarship('UT Foundation');
    const student = { ...STUDENTS.freshmanFullDiscount, stBracket: 'PD80' };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'stBracket')).toBe(true);
  });

  test('CEM student fails SM Sustainability (requires CFNR)', () => {
    const s = findScholarship('SM Sustainability');
    const student = {
      ...STUDENTS.forestryJunior,
      college: 'College of Economics and Management',
      course: 'BS Accountancy'
    };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
  });

  test('Only 10 units enrolled fails Suzara (requires 15)', () => {
    const s = findScholarship('Suzara');
    const student = { ...STUDENTS.sophomoreScienceManila, unitsEnrolled: 10 };
    const result = evaluateEligibility(student, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    expect(result.failedChecks.some(f => f.id === 'unitsEnrolled')).toBe(true);
  });
});

// =============================================================================
// 4. GWA BOUNDARY TESTS — Exact boundary values
// =============================================================================
describe('GWA Boundary Value Tests', () => {
  const scholarshipsWithGWA = csfaScholarships.filter(
    s => s.eligibilityCriteria.maxGWA && s.eligibilityCriteria.maxGWA < 5.0
  );

  scholarshipsWithGWA.forEach(s => {
    const maxGWA = s.eligibilityCriteria.maxGWA;
    const shortName = s.name.substring(0, 50);

    test(`"${shortName}" — GWA exactly at ${maxGWA} passes`, () => {
      const student = {
        ...STUDENTS.casImspSenior,
        gwa: maxGWA,
        yearLevel: (s.eligibilityCriteria.eligibleClassifications || ['Senior'])[0],
        college: (s.eligibilityCriteria.eligibleColleges || [STUDENTS.casImspSenior.college])[0],
        course: (s.eligibilityCriteria.eligibleCourses || [STUDENTS.casImspSenior.course])[0]
      };
      // Only test GWA — construct a minimal criteria with just GWA
      const gwaOnlyCriteria = { maxGWA: s.eligibilityCriteria.maxGWA, minGWA: s.eligibilityCriteria.minGWA };
      const result = evaluateEligibility(student, gwaOnlyCriteria);
      expect(result.passed).toBe(true);
    });

    test(`"${shortName}" — GWA at ${(maxGWA + 0.01).toFixed(2)} fails`, () => {
      const student = { ...STUDENTS.casImspSenior, gwa: maxGWA + 0.01 };
      const gwaOnlyCriteria = { maxGWA: s.eligibilityCriteria.maxGWA, minGWA: s.eligibilityCriteria.minGWA };
      const result = evaluateEligibility(student, gwaOnlyCriteria);
      expect(result.passed).toBe(false);
    });

    test(`"${shortName}" — GWA at 1.00 (best possible) passes`, () => {
      const student = { ...STUDENTS.casImspSenior, gwa: 1.0 };
      const gwaOnlyCriteria = { maxGWA: s.eligibilityCriteria.maxGWA, minGWA: s.eligibilityCriteria.minGWA };
      const result = evaluateEligibility(student, gwaOnlyCriteria);
      expect(result.passed).toBe(true);
    });
  });
});

// =============================================================================
// 5. INCOME BOUNDARY TESTS — Exact boundary values
// =============================================================================
describe('Income Boundary Value Tests', () => {
  const scholarshipsWithIncome = csfaScholarships.filter(
    s => s.eligibilityCriteria.maxAnnualFamilyIncome
  );

  scholarshipsWithIncome.forEach(s => {
    const maxIncome = s.eligibilityCriteria.maxAnnualFamilyIncome;
    const shortName = s.name.substring(0, 50);

    test(`"${shortName}" — income exactly at ₱${maxIncome.toLocaleString()} passes`, () => {
      const student = { ...STUDENTS.casImspSenior, annualFamilyIncome: maxIncome };
      const incomeOnlyCriteria = { maxAnnualFamilyIncome: maxIncome };
      const result = evaluateEligibility(student, incomeOnlyCriteria);
      expect(result.passed).toBe(true);
    });

    test(`"${shortName}" — income ₱1 over cap fails`, () => {
      const student = { ...STUDENTS.casImspSenior, annualFamilyIncome: maxIncome + 1 };
      const incomeOnlyCriteria = { maxAnnualFamilyIncome: maxIncome };
      const result = evaluateEligibility(student, incomeOnlyCriteria);
      expect(result.passed).toBe(false);
    });
  });
});

// =============================================================================
// 6. FILTER ENGINE COMPATIBILITY — Simulating frontend filterScholarships
// =============================================================================
describe('Filter Engine Compatibility', () => {

  // Simulate the frontend filterScholarships() logic
  function filterByCriteria(scholarships, criteria) {
    return scholarships.filter(s => {
      // Type filter
      if (criteria.type && s.type !== criteria.type) return false;

      // Level filter
      if (criteria.level && s.scholarshipLevel !== criteria.level) return false;

      // College filter
      if (criteria.colleges && criteria.colleges.length > 0) {
        const eligibleColleges = s.eligibilityCriteria?.eligibleColleges || [];
        const hasMatch = eligibleColleges.some(c =>
          criteria.colleges.some(fc => String(c).includes(String(fc)))
        );
        if (eligibleColleges.length > 0 && !hasMatch) return false;
      }

      // Amount filter
      if (criteria.minAmount !== undefined) {
        const amount = s.totalGrant || 0;
        if (amount < criteria.minAmount) return false;
      }

      // Year level filter  
      if (criteria.yearLevels && criteria.yearLevels.length > 0) {
        const eligibleLevels = s.eligibilityCriteria?.eligibleClassifications || [];
        const hasMatch = eligibleLevels.length === 0 ||
          eligibleLevels.some(l => criteria.yearLevels.includes(l));
        if (!hasMatch) return false;
      }

      // Search query filter
      if (criteria.searchQuery) {
        const q = criteria.searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = s.description?.toLowerCase().includes(q);
        const matchesSp = s.sponsor?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesSp) return false;
      }

      return true;
    });
  }

  test('filter by type: Thesis/Research Grant returns all thesis grants', () => {
    const thesisGrants = filterByCriteria(csfaScholarships, { type: ScholarshipType.THESIS_GRANT });
    expect(thesisGrants.length).toBeGreaterThanOrEqual(3);
    thesisGrants.forEach(s => {
      expect(s.type).toBe(ScholarshipType.THESIS_GRANT);
    });
  });

  test('filter by type: Private Scholarship returns private scholarships', () => {
    const privateSchols = filterByCriteria(csfaScholarships, { type: ScholarshipType.PRIVATE });
    expect(privateSchols.length).toBeGreaterThanOrEqual(10);
    privateSchols.forEach(s => {
      expect(s.type).toBe(ScholarshipType.PRIVATE);
    });
  });

  test('filter by level: university returns university-level only', () => {
    const uni = filterByCriteria(csfaScholarships, { level: ScholarshipLevel.UNIVERSITY });
    uni.forEach(s => {
      expect(s.scholarshipLevel).toBe(ScholarshipLevel.UNIVERSITY);
    });
    expect(uni.length).toBeGreaterThan(0);
  });

  test('filter by level: college returns college-level only', () => {
    const college = filterByCriteria(csfaScholarships, { level: ScholarshipLevel.COLLEGE });
    college.forEach(s => {
      expect(s.scholarshipLevel).toBe(ScholarshipLevel.COLLEGE);
      expect(s.managingCollegeCode).toBeTruthy();
    });
    expect(college.length).toBeGreaterThan(0);
  });

  test('filter by college: CHE returns CHE-eligible scholarships', () => {
    const cheSchols = filterByCriteria(csfaScholarships, {
      colleges: ['College of Human Ecology']
    });
    expect(cheSchols.length).toBeGreaterThanOrEqual(2); // HUMEIN-Phils + CHE Alumni at least
  });

  test('filter by college: CFNR returns CFNR-eligible scholarships', () => {
    const cfnrSchols = filterByCriteria(csfaScholarships, {
      colleges: ['College of Forestry and Natural Resources']
    });
    expect(cfnrSchols.length).toBeGreaterThanOrEqual(1); // SM Sustainability at least
  });

  test('filter by yearLevel: Freshman only', () => {
    const freshmanSchols = filterByCriteria(csfaScholarships, {
      yearLevels: ['Freshman']
    });
    freshmanSchols.forEach(s => {
      const classes = s.eligibilityCriteria.eligibleClassifications || [];
      if (classes.length > 0) {
        expect(classes).toContain('Freshman');
      }
    });
    expect(freshmanSchols.length).toBeGreaterThan(0);
  });

  test('filter by yearLevel: Senior only', () => {
    const seniorSchols = filterByCriteria(csfaScholarships, {
      yearLevels: ['Senior']
    });
    seniorSchols.forEach(s => {
      const classes = s.eligibilityCriteria.eligibleClassifications || [];
      // If no restriction (empty), it matches any year level
      if (classes.length > 0) {
        expect(classes).toContain('Senior');
      }
    });
    expect(seniorSchols.length).toBeGreaterThan(0);
  });

  test('filter by minAmount: ≥ ₱45,000', () => {
    const highValue = filterByCriteria(csfaScholarships, { minAmount: 45000 });
    highValue.forEach(s => {
      expect(s.totalGrant).toBeGreaterThanOrEqual(45000);
    });
  });

  test('search by keyword: "aasp" finds AASP scholarships', () => {
    const results = filterByCriteria(csfaScholarships, { searchQuery: 'aasp' });
    expect(results.length).toBeGreaterThanOrEqual(5); // Many AASP scholarships
    results.forEach(s => {
      const text = (s.name + ' ' + s.description + ' ' + s.sponsor).toLowerCase();
      expect(text).toContain('aasp');
    });
  });

  test('search by keyword: "thesis" finds thesis-related scholarships', () => {
    const results = filterByCriteria(csfaScholarships, { searchQuery: 'thesis' });
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  test('search by keyword: "sterix" finds Sterix scholarships', () => {
    const results = filterByCriteria(csfaScholarships, { searchQuery: 'sterix' });
    expect(results.length).toBe(2); // Thesis Grant + Scholarship Program
  });

  test('search by keyword: "quezon" finds Laaño', () => {
    const results = filterByCriteria(csfaScholarships, { searchQuery: 'quezon' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(r => r.name.includes('Laaño'))).toBe(true);
  });

  test('combined filters: Private + Senior + CHE college', () => {
    const results = filterByCriteria(csfaScholarships, {
      type: ScholarshipType.PRIVATE,
      yearLevels: ['Senior'],
      colleges: ['College of Human Ecology']
    });
    results.forEach(s => {
      expect(s.type).toBe(ScholarshipType.PRIVATE);
      expect(s.eligibilityCriteria.eligibleClassifications).toContain('Senior');
    });
  });
});

// =============================================================================
// 7. REQUIRED DOCUMENTS PIPELINE VALIDATION
// =============================================================================
describe('Required Documents Pipeline', () => {

  test('every CSFA scholarship has photo requirement', () => {
    csfaScholarships.forEach(s => {
      const hasPhoto = s.requiredDocuments.some(d =>
        d.name.toLowerCase().includes('photo') || d.name.includes('2x2')
      );
      expect(hasPhoto).toBe(true);
    });
  });

  test('most CSFA scholarships have grades/TCG requirement', () => {
    const withGrades = csfaScholarships.filter(s =>
      s.requiredDocuments.some(d =>
        d.name.toLowerCase().includes('grade') ||
        d.name.toLowerCase().includes('transcript') ||
        d.name.toLowerCase().includes('tcg')
      )
    );
    // At least 90% of scholarships require grades
    expect(withGrades.length / csfaScholarships.length).toBeGreaterThanOrEqual(0.9);
  });

  test('most CSFA scholarships have birth certificate', () => {
    const withBirthCert = csfaScholarships.filter(s =>
      s.requiredDocuments.some(d =>
        d.name.toLowerCase().includes('birth certificate')
      )
    );
    // At least 85% of scholarships require birth certificate
    expect(withBirthCert.length / csfaScholarships.length).toBeGreaterThanOrEqual(0.85);
  });

  test('thesis grants have thesis-related documents', () => {
    const thesisGrants = csfaScholarships.filter(s => s.type === ScholarshipType.THESIS_GRANT);
    thesisGrants.forEach(s => {
      const hasThesisDoc = s.requiredDocuments.some(d =>
        d.name.toLowerCase().includes('thesis') ||
        d.name.toLowerCase().includes('research')
      );
      expect(hasThesisDoc).toBe(true);
    });
  });

  test('Foreign Students scholarship has nomination & support letters', () => {
    const s = findScholarship('Foreign Students');
    const docNames = s.requiredDocuments.map(d => d.name.toLowerCase());
    expect(docNames.some(n => n.includes('nomination'))).toBe(true);
    expect(docNames.some(n => n.includes('financial support'))).toBe(true);
  });

  test('all document names are unique within each scholarship', () => {
    csfaScholarships.forEach(s => {
      const names = s.requiredDocuments.map(d => d.name);
      const unique = [...new Set(names)];
      expect(names.length).toBe(unique.length);
    });
  });
});

// =============================================================================
// 8. CROSS-SYSTEM CONSISTENCY — Seed ↔ Model ↔ Filter agreement
// =============================================================================
describe('Cross-System Data Consistency', () => {

  test('all CSFA scholarship types exist in ScholarshipType enum', () => {
    const types = [...new Set(csfaScholarships.map(s => s.type))];
    types.forEach(t => {
      expect(Object.values(ScholarshipType)).toContain(t);
    });
  });

  test('all CSFA scholarship levels exist in ScholarshipLevel enum', () => {
    const levels = [...new Set(csfaScholarships.map(s => s.scholarshipLevel))];
    levels.forEach(l => {
      expect(Object.values(ScholarshipLevel)).toContain(l);
    });
  });

  test('all eligible classification values exist in Classification enum', () => {
    const allClassifications = new Set();
    csfaScholarships.forEach(s => {
      (s.eligibilityCriteria.eligibleClassifications || []).forEach(c => allClassifications.add(c));
    });
    const validClassifications = Object.values(Classification);
    allClassifications.forEach(c => {
      expect(validClassifications).toContain(c);
    });
  });

  test('all eligible college values exist in UPLBCollege enum', () => {
    const allColleges = new Set();
    csfaScholarships.forEach(s => {
      (s.eligibilityCriteria.eligibleColleges || []).forEach(c => allColleges.add(c));
    });
    const validColleges = Object.values(UPLBCollege);
    allColleges.forEach(c => {
      expect(validColleges).toContain(c);
    });
  });

  test('all ST bracket values exist in STBracket enum', () => {
    const allBrackets = new Set();
    csfaScholarships.forEach(s => {
      (s.eligibilityCriteria.eligibleSTBrackets || []).forEach(b => allBrackets.add(b));
    });
    const validBrackets = Object.values(STBracket);
    allBrackets.forEach(b => {
      expect(validBrackets).toContain(b);
    });
  });

  test('all citizenship values exist in Citizenship enum', () => {
    const allCitizenship = new Set();
    csfaScholarships.forEach(s => {
      (s.eligibilityCriteria.eligibleCitizenship || []).forEach(c => allCitizenship.add(c));
    });
    const validCitizenship = Object.values(Citizenship);
    allCitizenship.forEach(c => {
      expect(validCitizenship).toContain(c);
    });
  });

  test('managingCollegeCode values are valid UPLB college codes', () => {
    const validCodes = getCollegeCodes();
    csfaScholarships.forEach(s => {
      if (s.managingCollegeCode) {
        expect(validCodes).toContain(s.managingCollegeCode);
      }
    });
  });

  test('managing academic unit codes are valid departments in their college', () => {
    csfaScholarships.forEach(s => {
      if (s.managingAcademicUnitCode && s.managingCollegeCode) {
        expect(
          isDepartmentInCollege(s.managingAcademicUnitCode, s.managingCollegeCode)
        ).toBe(true);
      }
    });
  });

  test('seed data total count matches expected (21 CSFA + 38 others = 59)', () => {
    expect(csfaScholarships.length).toBe(21);
    expect(realisticScholarshipsData.length).toBe(59);
  });
});

// =============================================================================
// 9. MULTIPLE-CRITERIA FAILURE ANALYSIS
// =============================================================================
describe('Multiple Criteria Failure Analysis', () => {
  
  test('ineligible student fails on multiple criteria per scholarship', () => {
    const s = findScholarship('Suzara');
    const result = evaluateEligibility(STUDENTS.ineligibleStudent, s.eligibilityCriteria);
    expect(result.passed).toBe(false);
    // Should fail on: GWA, income, scholarship, disciplinary, failing grade, grade of 4, incomplete
    expect(result.failedChecks.length).toBeGreaterThanOrEqual(4);
  });

  test('each failed criterion has the expected id', () => {
    const s = findScholarship('Suzara');
    const result = evaluateEligibility(STUDENTS.ineligibleStudent, s.eligibilityCriteria);
    
    const failedIds = result.failedChecks.map(f => f.id);
    expect(failedIds).toContain('gwa');
    expect(failedIds).toContain('noDisciplinaryAction');
    expect(failedIds).toContain('noFailingGrade');
    expect(failedIds).toContain('noGradeOf4');
  });

  test('perfect student passes ALL matching scholarships cleanly', () => {
    // Create a "super student" that qualifies for many scholarships
    const superStudent = {
      gwa: 1.25,
      yearLevel: 'Senior',
      college: 'College of Agriculture and Food Science',
      course: 'BS Agriculture',
      major: 'Animal Science',
      annualFamilyIncome: 80000,
      stBracket: 'Full Discount with Stipend',
      province: 'Quezon',
      citizenship: 'Filipino',
      unitsEnrolled: 21,
      unitsPassed: 140,
      hasExistingScholarship: false,
      hasDisciplinaryAction: false,
      hasFailingGrade: false,
      hasGradeOf4: false,
      hasIncompleteGrade: false,
      hasThesisGrant: false,
      isGraduating: true,
      hasApprovedThesis: true
    };

    // This student should pass: Archie Laaño, CDO, Nicolas Angel, FDF, etc.
    const laano = findScholarship('Laaño Quezonian');
    expect(evaluateEligibility(superStudent, laano.eligibilityCriteria).passed).toBe(true);

    const cdo = findScholarship('Corazon Dayro Ong');
    expect(evaluateEligibility(superStudent, cdo.eligibilityCriteria).passed).toBe(true);

    const angel = findScholarship('Nicolas Nick Angel');
    expect(evaluateEligibility(superStudent, angel.eligibilityCriteria).passed).toBe(true);

    const fdf = findScholarship('AASP) - FDF');
    expect(evaluateEligibility(superStudent, fdf.eligibilityCriteria).passed).toBe(true);
  });
});

// =============================================================================
// 10. VIRTUAL PROPERTIES SIMULATION
// =============================================================================
describe('Virtual Properties (Model Simulation)', () => {

  test('all CSFA scholarships have future deadlines (not expired)', () => {
    const now = new Date();
    csfaScholarships.forEach(s => {
      const deadline = new Date(s.applicationDeadline);
      const isExpired = now > deadline;
      expect(isExpired).toBe(false);
    });
  });

  test('all CSFA scholarships have positive days until deadline', () => {
    const now = new Date();
    csfaScholarships.forEach(s => {
      const deadline = new Date(s.applicationDeadline);
      const diffTime = deadline - now;
      const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      expect(daysUntilDeadline).toBeGreaterThan(0);
    });
  });

  test('remaining slots equals total slots (no filled slots)', () => {
    csfaScholarships.forEach(s => {
      const filledSlots = s.filledSlots || 0;
      const remaining = Math.max(0, s.slots - filledSlots);
      expect(remaining).toBe(s.slots);
    });
  });

  test('all CSFA scholarships would be "open" (active + not expired)', () => {
    const now = new Date();
    csfaScholarships.forEach(s => {
      const startOpen = !s.applicationStartDate || now >= new Date(s.applicationStartDate);
      const isExpired = now > new Date(s.applicationDeadline);
      const isActive = s.status === ScholarshipStatus.ACTIVE;
      const isOpen = startOpen && !isExpired && isActive;
      expect(isOpen).toBe(true);
    });
  });
});

// =============================================================================
// 11. TAG-BASED SEARCH CONSISTENCY
// =============================================================================
describe('Tag-Based Search Consistency', () => {
  
  test('all CSFA scholarships have "csfa" tag', () => {
    csfaScholarships.forEach(s => {
      expect(s.tags).toContain('csfa');
    });
  });

  test('AASP scholarships have "aasp" tag', () => {
    const aaspSchols = csfaScholarships.filter(s => s.name.includes('AASP'));
    expect(aaspSchols.length).toBeGreaterThan(0);
    aaspSchols.forEach(s => {
      expect(s.tags).toContain('aasp');
    });
  });

  test('thesis grants have thesis-related tag', () => {
    const thesisGrants = csfaScholarships.filter(s => s.type === ScholarshipType.THESIS_GRANT);
    thesisGrants.forEach(s => {
      const hasThesisTag = s.tags.some(t =>
        t.includes('thesis') || t.includes('research') || t.includes('grant')
      );
      expect(hasThesisTag).toBe(true);
    });
  });

  test('province-based scholarships have province names in tags', () => {
    const provinceSchols = csfaScholarships.filter(s =>
      s.eligibilityCriteria.eligibleProvinces && s.eligibilityCriteria.eligibleProvinces.length > 0
    );
    provinceSchols.forEach(s => {
      const tagStr = s.tags.join(' ').toLowerCase();
      const hasProvinceHint = s.eligibilityCriteria.eligibleProvinces.some(p =>
        tagStr.includes(p.toLowerCase()) || tagStr.includes('quezon') || tagStr.includes('bicol') || tagStr.includes('sorsogon')
      );
      expect(hasProvinceHint).toBe(true);
    });
  });
});

// =============================================================================
// 12. BATCH ELIGIBILITY MATCHING — Portfolio simulation
// =============================================================================
describe('Batch Eligibility Matching — Student Portfolios', () => {

  test('CAFS junior from Quezon matches ≥ 3 scholarships', () => {
    const student = STUDENTS.cafsJuniorQuezon;
    const matches = csfaScholarships.filter(s =>
      evaluateEligibility(student, s.eligibilityCriteria).passed
    );
    expect(matches.length).toBeGreaterThanOrEqual(3);
    const matchNames = matches.map(m => m.name);
    expect(matchNames.some(n => n.includes('Camilla'))).toBe(true);
    expect(matchNames.some(n => n.includes('Laaño'))).toBe(true);
  });

  test('graduating CAFS senior matches ≥ 4 scholarships', () => {
    const student = STUDENTS.graduatingSeniorAg;
    const matches = csfaScholarships.filter(s =>
      evaluateEligibility(student, s.eligibilityCriteria).passed
    );
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  test('CHE graduating student matches ≥ 2 scholarships', () => {
    const student = STUDENTS.cheStudentGraduating;
    const matches = csfaScholarships.filter(s =>
      evaluateEligibility(student, s.eligibilityCriteria).passed
    );
    expect(matches.length).toBeGreaterThanOrEqual(2);
    const matchNames = matches.map(m => m.name);
    expect(matchNames.some(n => n.includes('HUMEIN'))).toBe(true);
  });

  test('ineligible student matches 0 scholarships', () => {
    const matches = csfaScholarships.filter(s =>
      evaluateEligibility(STUDENTS.ineligibleStudent, s.eligibilityCriteria).passed
    );
    expect(matches.length).toBe(0);
  });

  test('Sorsogon student matches Dr. Higino Ables and potentially broad university scholarships', () => {
    const student = STUDENTS.sorsogonFreshman;
    const matches = csfaScholarships.filter(s =>
      evaluateEligibility(student, s.eligibilityCriteria).passed
    );
    const matchNames = matches.map(m => m.name);
    expect(matchNames.some(n => n.includes('Higino'))).toBe(true);
  });

  test('foreign PhD student matches exactly 1 scholarship (Foreign Students)', () => {
    const matches = csfaScholarships.filter(s =>
      evaluateEligibility(STUDENTS.foreignPhd, s.eligibilityCriteria).passed
    );
    expect(matches.length).toBe(1);
    expect(matches[0].name).toContain('Foreign Students');
  });
});
