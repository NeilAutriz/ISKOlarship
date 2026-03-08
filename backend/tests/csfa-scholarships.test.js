/**
 * =============================================================================
 * ISKOlarship - CSFA Scholarships Seed & Eligibility Tests
 * =============================================================================
 * 
 * Comprehensive tests for all UPLB Committee on Scholarships and Financial
 * Assistance (CSFA) scholarships added to the realistic seed data.
 * 
 * Tests cover:
 * 1. Seed data integrity (all required fields, correct types, no duplicates)
 * 2. Eligibility criteria correctness per scholarship specs
 * 3. Required documents completeness
 * 4. Scholarship level and scope configuration
 * 5. Filter engine compatibility (eligibility evaluation)
 * 6. Edge cases and boundary conditions
 * 
 * Run with: npx jest tests/csfa-scholarships.test.js --verbose
 * 
 * =============================================================================
 */

const path = require('path');

// Load seed data
const {
  realisticScholarshipsData,
  csfaScholarships,
  csfaDocuments
} = require('../src/seeds/scholarships-realistic.seed');

// Load model enums
const { ScholarshipType, ScholarshipStatus, ScholarshipLevel } = require('../src/models/Scholarship.model');
const { UPLBCollege, Classification, Citizenship, STBracket } = require('../src/models/User.model');

// =============================================================================
// HELPER: Get scholarship by name (substring match)
// =============================================================================
const getScholarship = (nameSubstr) => {
  const match = csfaScholarships.find(s => s.name.includes(nameSubstr));
  if (!match) throw new Error(`Scholarship not found: ${nameSubstr}`);
  return match;
};

// =============================================================================
// 1. SEED DATA INTEGRITY
// =============================================================================
describe('CSFA Scholarships - Seed Data Integrity', () => {
  
  test('csfaScholarships array is exported and non-empty', () => {
    expect(csfaScholarships).toBeDefined();
    expect(Array.isArray(csfaScholarships)).toBe(true);
    expect(csfaScholarships.length).toBeGreaterThanOrEqual(20);
  });

  test('csfaScholarships are included in realisticScholarshipsData', () => {
    csfaScholarships.forEach(csfa => {
      const found = realisticScholarshipsData.find(r => r.name === csfa.name);
      expect(found).toBeDefined();
    });
  });

  test('no duplicate names across all realistic scholarships', () => {
    const names = realisticScholarshipsData.map(s => s.name);
    const uniqueNames = [...new Set(names)];
    expect(names.length).toBe(uniqueNames.length);
  });

  test('no duplicate names within CSFA scholarships', () => {
    const names = csfaScholarships.map(s => s.name);
    const uniqueNames = [...new Set(names)];
    expect(names.length).toBe(uniqueNames.length);
  });

  describe('all CSFA scholarships have required fields', () => {
    csfaScholarships.forEach(scholarship => {
      describe(`"${scholarship.name.substring(0, 60)}..."`, () => {
        test('has name (string, non-empty)', () => {
          expect(typeof scholarship.name).toBe('string');
          expect(scholarship.name.length).toBeGreaterThan(0);
          expect(scholarship.name.length).toBeLessThanOrEqual(200);
        });

        test('has description (string, non-empty)', () => {
          expect(typeof scholarship.description).toBe('string');
          expect(scholarship.description.length).toBeGreaterThan(0);
          expect(scholarship.description.length).toBeLessThanOrEqual(3000);
        });

        test('has sponsor (string, non-empty)', () => {
          expect(typeof scholarship.sponsor).toBe('string');
          expect(scholarship.sponsor.length).toBeGreaterThan(0);
        });

        test('has valid type', () => {
          const validTypes = Object.values(ScholarshipType);
          expect(validTypes).toContain(scholarship.type);
        });

        test('has valid scholarshipLevel', () => {
          const validLevels = Object.values(ScholarshipLevel);
          expect(validLevels).toContain(scholarship.scholarshipLevel);
        });

        test('has totalGrant (positive number)', () => {
          expect(typeof scholarship.totalGrant).toBe('number');
          expect(scholarship.totalGrant).toBeGreaterThan(0);
        });

        test('has awardDescription', () => {
          expect(typeof scholarship.awardDescription).toBe('string');
          expect(scholarship.awardDescription.length).toBeGreaterThan(0);
        });

        test('has eligibilityCriteria object', () => {
          expect(scholarship.eligibilityCriteria).toBeDefined();
          expect(typeof scholarship.eligibilityCriteria).toBe('object');
        });

        test('has requiredDocuments array', () => {
          expect(Array.isArray(scholarship.requiredDocuments)).toBe(true);
          expect(scholarship.requiredDocuments.length).toBeGreaterThan(0);
        });

        test('has applicationDeadline (future date)', () => {
          expect(scholarship.applicationDeadline).toBeInstanceOf(Date);
          expect(scholarship.applicationDeadline.getTime()).toBeGreaterThan(Date.now());
        });

        test('has valid academicYear format (YYYY-YYYY)', () => {
          expect(scholarship.academicYear).toMatch(/^\d{4}-\d{4}$/);
        });

        test('has valid semester', () => {
          expect(['First', 'Second', 'Midyear']).toContain(scholarship.semester);
        });

        test('has positive slots', () => {
          expect(scholarship.slots).toBeGreaterThan(0);
        });

        test('has ACTIVE status', () => {
          expect(scholarship.status).toBe(ScholarshipStatus.ACTIVE);
        });

        test('has tags array', () => {
          expect(Array.isArray(scholarship.tags)).toBe(true);
          expect(scholarship.tags.length).toBeGreaterThan(0);
        });
      });
    });
  });
});

// =============================================================================
// 2. SCHOLARSHIP LEVEL & SCOPE CONFIGURATION
// =============================================================================
describe('CSFA Scholarships - Level & Scope Configuration', () => {

  describe('University-level scholarships have no managing codes', () => {
    const universityLevel = csfaScholarships.filter(
      s => s.scholarshipLevel === ScholarshipLevel.UNIVERSITY
    );

    test('at least some are university level', () => {
      expect(universityLevel.length).toBeGreaterThan(0);
    });

    universityLevel.forEach(s => {
      test(`"${s.name.substring(0, 50)}" has null managingCollegeCode`, () => {
        expect(s.managingCollegeCode).toBeNull();
      });
      test(`"${s.name.substring(0, 50)}" has null managingAcademicUnitCode`, () => {
        expect(s.managingAcademicUnitCode).toBeNull();
      });
    });
  });

  describe('College-level scholarships have correct managing codes', () => {
    const collegeLevel = csfaScholarships.filter(
      s => s.scholarshipLevel === ScholarshipLevel.COLLEGE
    );

    collegeLevel.forEach(s => {
      test(`"${s.name.substring(0, 50)}" has a managingCollegeCode`, () => {
        expect(s.managingCollegeCode).toBeTruthy();
        expect(['CAS', 'CAFS', 'CEM', 'CEAT', 'CFNR', 'CHE', 'CVM', 'CDC', 'CPAF', 'GS'])
          .toContain(s.managingCollegeCode);
      });
    });
  });

  describe('Academic unit-level scholarships have both codes', () => {
    const acUnitLevel = csfaScholarships.filter(
      s => s.scholarshipLevel === ScholarshipLevel.ACADEMIC_UNIT
    );

    acUnitLevel.forEach(s => {
      test(`"${s.name.substring(0, 50)}" has managingCollegeCode`, () => {
        expect(s.managingCollegeCode).toBeTruthy();
      });
      test(`"${s.name.substring(0, 50)}" has managingAcademicUnitCode`, () => {
        expect(s.managingAcademicUnitCode).toBeTruthy();
      });
    });
  });
});

// =============================================================================
// 3. REQUIRED DOCUMENTS VALIDATION
// =============================================================================
describe('CSFA Scholarships - Required Documents', () => {

  test('csfaDocuments template has standard CSFA documents', () => {
    expect(csfaDocuments).toBeDefined();
    expect(Array.isArray(csfaDocuments)).toBe(true);
    
    const docNames = csfaDocuments.map(d => d.name);
    expect(docNames).toContain('Application Form with Photo');
    expect(docNames).toContain('Proof of Income');
    expect(docNames).toContain('Birth Certificate');
    expect(docNames).toContain('Recommendation Letter');
    expect(docNames).toContain('True Copy of Grades (All Semesters)');
    expect(docNames).toContain('Certificate of Good Moral Character');
  });

  csfaScholarships.forEach(scholarship => {
    describe(`Docs for "${scholarship.name.substring(0, 50)}..."`, () => {
      test('each document has a name', () => {
        scholarship.requiredDocuments.forEach(doc => {
          expect(typeof doc.name).toBe('string');
          expect(doc.name.length).toBeGreaterThan(0);
        });
      });

      test('each document has isRequired boolean', () => {
        scholarship.requiredDocuments.forEach(doc => {
          expect(typeof doc.isRequired).toBe('boolean');
        });
      });

      test('has at least one required document', () => {
        const required = scholarship.requiredDocuments.filter(d => d.isRequired);
        expect(required.length).toBeGreaterThan(0);
      });
    });
  });
});

// =============================================================================
// 4. INDIVIDUAL SCHOLARSHIP ELIGIBILITY CRITERIA TESTS
// =============================================================================

describe('AASP - Institute of Mathematical Sciences', () => {
  const s = getScholarship('Institute of Mathematical Sciences');

  test('is academic_unit level under IMSP/CAS', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.ACADEMIC_UNIT);
    expect(s.managingCollegeCode).toBe('CAS');
    expect(s.managingAcademicUnitCode).toBe('IMSP');
  });

  test('requires senior standing only', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toEqual([Classification.SENIOR]);
  });

  test('allows BS Applied Mathematics and BS Mathematics', () => {
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Applied Mathematics');
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Mathematics');
    expect(s.eligibilityCriteria.eligibleCourses.length).toBe(2);
  });

  test('requires minimum 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });

  test('requires SLAS bracket PD80 to FDS', () => {
    expect(s.eligibilityCriteria.eligibleSTBrackets).toContain(STBracket.PD80);
    expect(s.eligibilityCriteria.eligibleSTBrackets).toContain(STBracket.FULL_DISCOUNT);
    expect(s.eligibilityCriteria.eligibleSTBrackets).toContain(STBracket.FULL_DISCOUNT_WITH_STIPEND);
  });

  test('must not have other scholarship', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });

  test('GWA requirement allows up to 3.0', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(3.0);
  });

  test('is under CAS college', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CAS);
  });
});

describe('AASP - Camilla Yandoc Ables', () => {
  const s = getScholarship('Camilla Yandoc Ables');

  test('is college level under CAFS', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.COLLEGE);
    expect(s.managingCollegeCode).toBe('CAFS');
  });

  test('requires Junior or Senior standing', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.JUNIOR);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SENIOR);
    expect(s.eligibilityCriteria.eligibleClassifications.length).toBe(2);
  });

  test('requires BS Agriculture major Plant Pathology', () => {
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Agriculture');
    expect(s.eligibilityCriteria.eligibleMajors).toContain('Plant Pathology');
  });

  test('GWA must be 2.50 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.5);
  });

  test('income cap is ₱150,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(150000);
  });

  test('must not have other scholarship', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });

  test('requires at least 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });
});

describe('AASP - Norma P. Ables', () => {
  const s = getScholarship('Norma P. Ables');

  test('is college level under CAFS', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.COLLEGE);
    expect(s.managingCollegeCode).toBe('CAFS');
  });

  test('requires Junior or Senior standing', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.JUNIOR);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SENIOR);
  });

  test('allows BS Agriculture (Animal Science) and BS Nutrition', () => {
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Agriculture');
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Nutrition');
    expect(s.eligibilityCriteria.eligibleMajors).toContain('Animal Science');
  });

  test('covers CAFS and CHE colleges', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CAFS);
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CHE);
  });

  test('GWA must be 2.50 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.5);
  });

  test('income cap is ₱150,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(150000);
  });
});

describe('Archie B.M. Laaño Quezonian Scholarships', () => {
  const s = getScholarship('Laaño Quezonian');

  test('is university level', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.UNIVERSITY);
    expect(s.managingCollegeCode).toBeNull();
  });

  test('all year levels are eligible', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.FRESHMAN);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SOPHOMORE);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.JUNIOR);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SENIOR);
  });

  test('requires Quezon province', () => {
    expect(s.eligibilityCriteria.eligibleProvinces).toContain('Quezon');
    expect(s.eligibilityCriteria.eligibleProvinces.length).toBe(1);
  });

  test('GWA must be 2.5 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.5);
  });

  test('no failing grade, grade of 4, or incomplete allowed', () => {
    expect(s.eligibilityCriteria.mustNotHaveFailingGrade).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveGradeOf4).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveIncompleteGrade).toBe(true);
  });

  test('no disciplinary action allowed', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
  });
});

describe('Adolfo S. Suzara Foundation Scholarship', () => {
  const s = getScholarship('Suzara');

  test('is university level (systemwide)', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.UNIVERSITY);
  });

  test('GWA must be 2.0 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.0);
  });

  test('income cap is ₱200,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(200000);
  });

  test('requires at least 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });

  test('Filipino citizens only', () => {
    expect(s.eligibilityCriteria.eligibleCitizenship).toContain(Citizenship.FILIPINO);
  });

  test('no disciplinary action, failing grades, 4s, or incompletes', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveFailingGrade).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveGradeOf4).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveIncompleteGrade).toBe(true);
  });
});

describe('Scholarship Program for Foreign Students (PhD)', () => {
  const s = getScholarship('Foreign Students');

  test('is university level', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.UNIVERSITY);
  });

  test('is University Scholarship type', () => {
    expect(s.type).toBe(ScholarshipType.UNIVERSITY);
  });

  test('requires Foreign National citizenship', () => {
    expect(s.eligibilityCriteria.eligibleCitizenship).toContain(Citizenship.FOREIGN);
    expect(s.eligibilityCriteria.eligibleCitizenship).not.toContain(Citizenship.FILIPINO);
  });

  test('GWA must be 1.75 or better (cumulative)', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(1.75);
  });

  test('requires minimum 9 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(9);
  });

  test('eligible college is Graduate School', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.GS);
  });

  test('no failing grade, 4, or incomplete', () => {
    expect(s.eligibilityCriteria.mustNotHaveFailingGrade).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveGradeOf4).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveIncompleteGrade).toBe(true);
  });

  test('requires government nomination letter in docs', () => {
    const docNames = s.requiredDocuments.map(d => d.name);
    expect(docNames.some(n => n.includes('Nomination'))).toBe(true);
  });

  test('requires financial support letter in docs', () => {
    const docNames = s.requiredDocuments.map(d => d.name);
    expect(docNames.some(n => n.includes('Financial Support'))).toBe(true);
  });
});

describe('SMPFC Future Leaders Scholarship', () => {
  const s = getScholarship('SMPFC');

  test('requires Sophomore only', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toEqual([Classification.SOPHOMORE]);
  });

  test('GWA must be 2.0 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.0);
  });

  test('requires at least 18 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(18);
  });

  test('income cap is ₱500,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(500000);
  });

  test('no other scholarship allowed (including educational plans)', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });

  test('no disciplinary action allowed', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
  });

  test('no failing grade, 4, or incomplete', () => {
    expect(s.eligibilityCriteria.mustNotHaveFailingGrade).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveGradeOf4).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveIncompleteGrade).toBe(true);
  });

  test('Filipino citizens residing in Philippines', () => {
    expect(s.eligibilityCriteria.eligibleCitizenship).toContain(Citizenship.FILIPINO);
  });
});

describe('UPAA Hongkong Scholarship Grant', () => {
  const s = getScholarship('UPAA Hongkong');

  test('is university level', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.UNIVERSITY);
  });

  test('requires Senior standing (graduating)', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SENIOR);
  });

  test('must be graduating', () => {
    expect(s.eligibilityCriteria.mustBeGraduating).toBe(true);
  });

  test('requires at least 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });

  test('no other scholarship or financial grant', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });

  test('no disciplinary action', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
  });

  test('has OFW certification as optional document', () => {
    const ofwDoc = s.requiredDocuments.find(d => d.name.includes('OFW'));
    expect(ofwDoc).toBeDefined();
    expect(ofwDoc.isRequired).toBe(false);
  });
});

describe('UT Foundation, Inc. Scholarship', () => {
  const s = getScholarship('UT Foundation');

  test('requires Freshman or Sophomore', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.FRESHMAN);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SOPHOMORE);
    expect(s.eligibilityCriteria.eligibleClassifications.length).toBe(2);
  });

  test('GWA must be 2.50 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.5);
  });

  test('requires at least 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });

  test('requires Full Discount under STS', () => {
    expect(s.eligibilityCriteria.eligibleSTBrackets).toContain(STBracket.FULL_DISCOUNT);
    expect(s.eligibilityCriteria.eligibleSTBrackets).toContain(STBracket.FULL_DISCOUNT_WITH_STIPEND);
    // Should NOT include PD80, PD60, etc.
    expect(s.eligibilityCriteria.eligibleSTBrackets).not.toContain(STBracket.PD80);
    expect(s.eligibilityCriteria.eligibleSTBrackets).not.toContain(STBracket.NO_DISCOUNT);
  });

  test('no other scholarship', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });

  test('no disciplinary action, failing grades, 4s, or incompletes', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveFailingGrade).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveGradeOf4).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveIncompleteGrade).toBe(true);
  });
});

describe("Upsilon Sigma Phi - Sigma Delta Phi '69 Scholarship", () => {
  const s = getScholarship('Sigma Delta Phi');

  test('requires Sophomore, Junior, or Senior', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SOPHOMORE);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.JUNIOR);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SENIOR);
    expect(s.eligibilityCriteria.eligibleClassifications).not.toContain(Classification.FRESHMAN);
  });

  test('GWA must be 1.75 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(1.75);
  });

  test('requires at least 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });

  test('no other scholarship', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });

  test('no disciplinary action', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
  });

  test('no failing grade, 4, or incomplete', () => {
    expect(s.eligibilityCriteria.mustNotHaveFailingGrade).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveGradeOf4).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveIncompleteGrade).toBe(true);
  });
});

describe('USPNA Scholarship Program', () => {
  const s = getScholarship('USPNA');

  test('requires Sophomore only', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toEqual([Classification.SOPHOMORE]);
  });

  test('for Science and Engineering (CAS, CEAT, CAFS)', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CAS);
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CEAT);
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CAFS);
  });

  test('GWA must be 2.5 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.5);
  });

  test('requires at least 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });

  test('income cap is ₱500,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(500000);
  });

  test('no disciplinary action, failing grades, 4s, or incompletes', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveFailingGrade).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveGradeOf4).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveIncompleteGrade).toBe(true);
  });
});

// =============================================================================
// NEW BATCH: Sterix, LBMFI, SM Sustainability, CHE Alumni, etc.
// =============================================================================

describe('AASP - Sterix Gift of HOPE Thesis Grant', () => {
  const s = getScholarship('Sterix Incorporated Gift of HOPE Thesis Grant');

  test('is Thesis Grant type', () => {
    expect(s.type).toBe(ScholarshipType.THESIS_GRANT);
  });

  test('is university level', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.UNIVERSITY);
  });

  test('requires BS Biology or BS Agriculture (Entomology)', () => {
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Biology');
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Agriculture');
    expect(s.eligibilityCriteria.eligibleMajors).toContain('Entomology');
  });

  test('requires Senior standing', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toEqual([Classification.SENIOR]);
  });

  test('requires Filipino citizenship', () => {
    expect(s.eligibilityCriteria.eligibleCitizenship).toContain(Citizenship.FILIPINO);
  });

  test('requires approved thesis outline', () => {
    expect(s.eligibilityCriteria.requiresApprovedThesisOutline).toBe(true);
  });

  test('GWA must be 2.5 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.5);
  });

  test('income cap is ₱250,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(250000);
  });

  test('must not have other thesis grants', () => {
    expect(s.eligibilityCriteria.mustNotHaveThesisGrant).toBe(true);
  });

  test('eligible colleges include CAS and CAFS', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CAS);
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CAFS);
  });

  test('requires Approved Thesis Outline document', () => {
    const docNames = s.requiredDocuments.map(d => d.name);
    expect(docNames.some(n => n.includes('Thesis Outline'))).toBe(true);
  });
});

describe('LBMFI Undergraduate Thesis Grant', () => {
  const s = getScholarship('LBMFI');

  test('is Thesis Grant type', () => {
    expect(s.type).toBe(ScholarshipType.THESIS_GRANT);
  });

  test('is university level (any BS course)', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.UNIVERSITY);
  });

  test('requires Junior or Senior (passed 38 units means upper year)', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.JUNIOR);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SENIOR);
  });

  test('requires at least 38 units passed', () => {
    expect(s.eligibilityCriteria.minUnitsPassed).toBe(38);
  });

  test('no grade of 5, 4, or INC in preceding semester', () => {
    expect(s.eligibilityCriteria.mustNotHaveFailingGrade).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveGradeOf4).toBe(true);
    expect(s.eligibilityCriteria.mustNotHaveIncompleteGrade).toBe(true);
  });

  test('no disciplinary action', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
  });

  test('additional requirements mention organic agriculture', () => {
    const addlReqs = s.eligibilityCriteria.additionalRequirements;
    const organicReq = addlReqs.find(r => r.description.includes('organic agriculture'));
    expect(organicReq).toBeDefined();
  });
});

describe('Sterix Gift of HOPE Scholarship Program', () => {
  const s = getScholarship('Sterix Incorporated Gift of HOPE Scholarship Program');

  test('is Private Scholarship type (not thesis grant)', () => {
    expect(s.type).toBe(ScholarshipType.PRIVATE);
  });

  test('requires Junior standing', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toEqual([Classification.JUNIOR]);
  });

  test('requires BS Biology or BS Agriculture (Entomology)', () => {
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Biology');
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Agriculture');
    expect(s.eligibilityCriteria.eligibleMajors).toContain('Entomology');
  });

  test('requires Filipino citizenship', () => {
    expect(s.eligibilityCriteria.eligibleCitizenship).toContain(Citizenship.FILIPINO);
  });

  test('GWA must be 2.5 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.5);
  });

  test('requires at least 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });

  test('income cap is ₱250,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(250000);
  });

  test('must not have other scholarship', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });
});

describe('SM Sustainability Scholarship', () => {
  const s = getScholarship('SM Sustainability');

  test('is Private Scholarship', () => {
    expect(s.type).toBe(ScholarshipType.PRIVATE);
  });

  test('is college level under CFNR', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.COLLEGE);
    expect(s.managingCollegeCode).toBe('CFNR');
  });

  test('requires Junior standing', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toEqual([Classification.JUNIOR]);
  });

  test('requires BS Forestry', () => {
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Forestry');
  });

  test('eligible college is CFNR', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CFNR);
  });

  test('income cap is ₱150,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(150000);
  });

  test('requires Filipino citizenship', () => {
    expect(s.eligibilityCriteria.eligibleCitizenship).toContain(Citizenship.FILIPINO);
  });

  test('no other scholarship or educational grant', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });
});

describe('AASP - CHE Alumni Association Thesis Grant', () => {
  const s = getScholarship('College of Human Ecology Alumni Association Thesis Grant');

  test('is Thesis Grant type', () => {
    expect(s.type).toBe(ScholarshipType.THESIS_GRANT);
  });

  test('is college level under CHE', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.COLLEGE);
    expect(s.managingCollegeCode).toBe('CHE');
  });

  test('requires Senior standing (graduating)', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SENIOR);
    expect(s.eligibilityCriteria.mustBeGraduating).toBe(true);
  });

  test('eligible college is CHE', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CHE);
  });

  test('requires ST Bracket PD80, FD, or FDS', () => {
    expect(s.eligibilityCriteria.eligibleSTBrackets).toContain(STBracket.PD80);
    expect(s.eligibilityCriteria.eligibleSTBrackets).toContain(STBracket.FULL_DISCOUNT);
    expect(s.eligibilityCriteria.eligibleSTBrackets).toContain(STBracket.FULL_DISCOUNT_WITH_STIPEND);
  });

  test('no disciplinary action', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
  });

  test('requires approved thesis outline', () => {
    expect(s.eligibilityCriteria.requiresApprovedThesisOutline).toBe(true);
  });

  test('must not have other thesis grants', () => {
    expect(s.eligibilityCriteria.mustNotHaveThesisGrant).toBe(true);
  });

  test('requires Approved Thesis Proposal document', () => {
    const docNames = s.requiredDocuments.map(d => d.name);
    expect(docNames.some(n => n.includes('Thesis Proposal'))).toBe(true);
  });
});

describe('AASP - Dr. Higino A. Ables', () => {
  const s = getScholarship('Higino A. Ables');

  test('is university level', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.UNIVERSITY);
  });

  test('all year levels (Freshman through Senior)', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.FRESHMAN);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SOPHOMORE);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.JUNIOR);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SENIOR);
  });

  test('requires Sorsogon or Camarines Sur province', () => {
    expect(s.eligibilityCriteria.eligibleProvinces).toContain('Sorsogon');
    expect(s.eligibilityCriteria.eligibleProvinces).toContain('Camarines Sur');
    expect(s.eligibilityCriteria.eligibleProvinces.length).toBe(2);
  });

  test('GWA must be 2.5 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.5);
  });

  test('requires at least 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });

  test('income cap is ₱150,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(150000);
  });

  test('no other scholarship', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });
});

describe('AASP - Corazon Dayro Ong (CDO Odyssey Foundation)', () => {
  const s = getScholarship('Corazon Dayro Ong');

  test('requires Senior standing, graduating', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toEqual([Classification.SENIOR]);
    expect(s.eligibilityCriteria.mustBeGraduating).toBe(true);
  });

  test('allows BS Agriculture (Animal Science) and BS Forestry', () => {
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Agriculture');
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Forestry');
    expect(s.eligibilityCriteria.eligibleMajors).toContain('Animal Science');
  });

  test('covers CAFS and CFNR colleges', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CAFS);
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CFNR);
  });

  test('income cap is ₱250,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(250000);
  });

  test('no other scholarship or educational grant', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });

  test('no disciplinary action', () => {
    expect(s.eligibilityCriteria.mustNotHaveDisciplinaryAction).toBe(true);
  });
});

describe('AASP - FDF', () => {
  const s = getScholarship('AASP) - FDF');

  test('requires Senior standing', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toEqual([Classification.SENIOR]);
  });

  test('must be graduating', () => {
    expect(s.eligibilityCriteria.mustBeGraduating).toBe(true);
  });

  test('is university level (any degree)', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.UNIVERSITY);
  });

  test('no specific college restriction', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toBeUndefined();
  });

  test('no specific course restriction', () => {
    expect(s.eligibilityCriteria.eligibleCourses).toBeUndefined();
  });
});

describe('AASP - Nicolas Nick Angel II', () => {
  const s = getScholarship('Nicolas Nick Angel');

  test('requires Senior standing, graduating', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toEqual([Classification.SENIOR]);
    expect(s.eligibilityCriteria.mustBeGraduating).toBe(true);
  });

  test('requires BS Agriculture or BS Forestry', () => {
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Agriculture');
    expect(s.eligibilityCriteria.eligibleCourses).toContain('BS Forestry');
  });

  test('covers CAFS and CFNR colleges', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CAFS);
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CFNR);
  });

  test('GWA must be 2.50 or better', () => {
    expect(s.eligibilityCriteria.maxGWA).toBe(2.5);
  });

  test('requires at least 15 units', () => {
    expect(s.eligibilityCriteria.minUnitsEnrolled).toBe(15);
  });

  test('income cap is ₱250,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(250000);
  });

  test('no other scholarship', () => {
    expect(s.eligibilityCriteria.mustNotHaveOtherScholarship).toBe(true);
  });
});

describe('AASP - HUMEIN-Phils', () => {
  const s = getScholarship('HUMEIN-Phils');

  test('is college level under CHE', () => {
    expect(s.scholarshipLevel).toBe(ScholarshipLevel.COLLEGE);
    expect(s.managingCollegeCode).toBe('CHE');
  });

  test('eligible college is CHE', () => {
    expect(s.eligibilityCriteria.eligibleColleges).toContain(UPLBCollege.CHE);
  });

  test('all year levels eligible', () => {
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.FRESHMAN);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SOPHOMORE);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.JUNIOR);
    expect(s.eligibilityCriteria.eligibleClassifications).toContain(Classification.SENIOR);
  });

  test('income cap is ₱250,000', () => {
    expect(s.eligibilityCriteria.maxAnnualFamilyIncome).toBe(250000);
  });

  test('requires Form 13 document', () => {
    const docNames = s.requiredDocuments.map(d => d.name);
    expect(docNames).toContain('Form 13');
  });
});

// =============================================================================
// 5. GWA SCALE VALIDATION (UPLB: 1.0 best, 5.0 worst)
// =============================================================================
describe('GWA Range Validation', () => {
  csfaScholarships.forEach(scholarship => {
    const ec = scholarship.eligibilityCriteria;
    if (ec.minGWA !== undefined || ec.maxGWA !== undefined) {
      describe(`GWA for "${scholarship.name.substring(0, 50)}..."`, () => {
        if (ec.minGWA !== undefined) {
          test('minGWA is between 1.0 and 5.0', () => {
            expect(ec.minGWA).toBeGreaterThanOrEqual(1.0);
            expect(ec.minGWA).toBeLessThanOrEqual(5.0);
          });
        }
        if (ec.maxGWA !== undefined) {
          test('maxGWA is between 1.0 and 5.0', () => {
            expect(ec.maxGWA).toBeGreaterThanOrEqual(1.0);
            expect(ec.maxGWA).toBeLessThanOrEqual(5.0);
          });
        }
        if (ec.minGWA !== undefined && ec.maxGWA !== undefined) {
          test('minGWA <= maxGWA (1.0 is best)', () => {
            expect(ec.minGWA).toBeLessThanOrEqual(ec.maxGWA);
          });
        }
      });
    }
  });
});

// =============================================================================
// 6. SCHOLARSHIP TYPE CONSISTENCY
// =============================================================================
describe('Scholarship Type Consistency', () => {
  const thesisGrants = csfaScholarships.filter(s => s.type === ScholarshipType.THESIS_GRANT);
  const privateScholarships = csfaScholarships.filter(s => s.type === ScholarshipType.PRIVATE);

  test('thesis grants require thesis outline or proposal', () => {
    thesisGrants.forEach(s => {
      const ec = s.eligibilityCriteria;
      const hasThesisReq = ec.requiresApprovedThesisOutline === true ||
        s.requiredDocuments.some(d => 
          d.name.includes('Thesis') || d.name.includes('Research Proposal')
        );
      expect(hasThesisReq).toBe(true);
    });
  });

  test('private scholarships generally require no other scholarship', () => {
    const noOtherCount = privateScholarships.filter(
      s => s.eligibilityCriteria.mustNotHaveOtherScholarship === true
    ).length;
    // Most private scholarships should restrict other scholarships
    expect(noOtherCount).toBeGreaterThan(privateScholarships.length * 0.5);
  });
});

// =============================================================================
// 7. FINANCIAL REQUIREMENT VALIDATION
// =============================================================================
describe('Financial Requirements Validation', () => {
  csfaScholarships.forEach(scholarship => {
    const ec = scholarship.eligibilityCriteria;
    if (ec.maxAnnualFamilyIncome !== undefined) {
      test(`"${scholarship.name.substring(0, 50)}" income cap is positive`, () => {
        expect(ec.maxAnnualFamilyIncome).toBeGreaterThan(0);
      });
    }
  });

  test('income caps are reasonable Philippine values (50k-1M)', () => {
    csfaScholarships.forEach(s => {
      const income = s.eligibilityCriteria.maxAnnualFamilyIncome;
      if (income !== undefined) {
        expect(income).toBeGreaterThanOrEqual(50000);
        expect(income).toBeLessThanOrEqual(1000000);
      }
    });
  });
});

// =============================================================================
// 8. CLASSIFICATION ENUM VALIDATION
// =============================================================================
describe('Classification Value Validation', () => {
  const validClassifications = Object.values(Classification);

  csfaScholarships.forEach(scholarship => {
    const classes = scholarship.eligibilityCriteria.eligibleClassifications;
    if (classes && classes.length > 0) {
      test(`"${scholarship.name.substring(0, 50)}" has valid classifications`, () => {
        classes.forEach(c => {
          expect(validClassifications).toContain(c);
        });
      });
    }
  });
});

// =============================================================================
// 9. CITIZENSHIP VALIDATION
// =============================================================================
describe('Citizenship Validation', () => {
  const validCitizenship = Object.values(Citizenship);

  csfaScholarships.forEach(scholarship => {
    const citizenships = scholarship.eligibilityCriteria.eligibleCitizenship;
    if (citizenships && citizenships.length > 0) {
      test(`"${scholarship.name.substring(0, 50)}" has valid citizenship values`, () => {
        citizenships.forEach(c => {
          expect(validCitizenship).toContain(c);
        });
      });
    }
  });
});

// =============================================================================
// 10. CROSS-SCHOLARSHIP CONSISTENCY
// =============================================================================
describe('Cross-Scholarship Consistency', () => {

  test('Sterix HOPE Thesis Grant vs Scholarship Program have different year levels', () => {
    const thesisGrant = getScholarship('Sterix Incorporated Gift of HOPE Thesis Grant');
    const scholarship = getScholarship('Sterix Incorporated Gift of HOPE Scholarship Program');
    
    // Thesis grant = Senior, Scholarship = Junior
    expect(thesisGrant.eligibilityCriteria.eligibleClassifications).toEqual([Classification.SENIOR]);
    expect(scholarship.eligibilityCriteria.eligibleClassifications).toEqual([Classification.JUNIOR]);
  });

  test('Sterix HOPE Thesis Grant vs Scholarship Program have same courses', () => {
    const thesisGrant = getScholarship('Sterix Incorporated Gift of HOPE Thesis Grant');
    const scholarship = getScholarship('Sterix Incorporated Gift of HOPE Scholarship Program');
    
    expect(thesisGrant.eligibilityCriteria.eligibleCourses).toEqual(
      scholarship.eligibilityCriteria.eligibleCourses
    );
  });

  test('Sterix Thesis Grant requires thesis outline but Scholarship does not', () => {
    const thesisGrant = getScholarship('Sterix Incorporated Gift of HOPE Thesis Grant');
    const scholarship = getScholarship('Sterix Incorporated Gift of HOPE Scholarship Program');
    
    expect(thesisGrant.eligibilityCriteria.requiresApprovedThesisOutline).toBe(true);
    expect(scholarship.eligibilityCriteria.requiresApprovedThesisOutline).toBeUndefined();
  });

  test('Camilla Ables and Norma Ables have same income cap but different courses', () => {
    const camilla = getScholarship('Camilla Yandoc Ables');
    const norma = getScholarship('Norma P. Ables');
    
    expect(camilla.eligibilityCriteria.maxAnnualFamilyIncome)
      .toBe(norma.eligibilityCriteria.maxAnnualFamilyIncome);
    
    // Camilla: Plant Pathology, Norma: Animal Science + Nutrition
    expect(camilla.eligibilityCriteria.eligibleMajors).toContain('Plant Pathology');
    expect(norma.eligibilityCriteria.eligibleMajors).toContain('Animal Science');
    expect(norma.eligibilityCriteria.eligibleCourses).toContain('BS Nutrition');
  });

  test('CDO and Nicolas Angel both target Agriculture/Forestry graduates', () => {
    const cdo = getScholarship('Corazon Dayro Ong');
    const angel = getScholarship('Nicolas Nick Angel');
    
    expect(cdo.eligibilityCriteria.eligibleCourses).toContain('BS Agriculture');
    expect(cdo.eligibilityCriteria.eligibleCourses).toContain('BS Forestry');
    expect(angel.eligibilityCriteria.eligibleCourses).toContain('BS Agriculture');
    expect(angel.eligibilityCriteria.eligibleCourses).toContain('BS Forestry');
    
    // Both require graduating
    expect(cdo.eligibilityCriteria.mustBeGraduating).toBe(true);
    expect(angel.eligibilityCriteria.mustBeGraduating).toBe(true);
  });
});

// =============================================================================
// 11. PROVINCE-BASED SCHOLARSHIPS
// =============================================================================
describe('Province-Based Scholarships', () => {
  test('Archie Laaño targets Quezon province', () => {
    const s = getScholarship('Laaño Quezonian');
    expect(s.eligibilityCriteria.eligibleProvinces).toEqual(['Quezon']);
  });

  test('Dr. Higino Ables targets Sorsogon and Camarines Sur (Bicol)', () => {
    const s = getScholarship('Higino A. Ables');
    expect(s.eligibilityCriteria.eligibleProvinces).toContain('Sorsogon');
    expect(s.eligibilityCriteria.eligibleProvinces).toContain('Camarines Sur');
  });

  test('Province-based scholarships have valid Philippine provinces', () => {
    const validProvinces = [
      'Quezon', 'Laguna', 'Batangas', 'Cavite', 'Rizal',
      'Sorsogon', 'Camarines Sur', 'Camarines Norte', 'Albay',
      'Ilocos Sur', 'Ilocos Norte', 'Metro Manila'
    ];
    
    csfaScholarships.forEach(s => {
      const provinces = s.eligibilityCriteria.eligibleProvinces;
      if (provinces && provinces.length > 0) {
        provinces.forEach(p => {
          expect(validProvinces).toContain(p);
        });
      }
    });
  });
});

// =============================================================================
// 12. ST BRACKET SCHOLARSHIPS
// =============================================================================
describe('ST Bracket Scholarships', () => {
  const validBrackets = Object.values(STBracket);

  test('IMS scholarship requires PD80-FDS range', () => {
    const s = getScholarship('Institute of Mathematical Sciences');
    const brackets = s.eligibilityCriteria.eligibleSTBrackets;
    expect(brackets).toContain(STBracket.PD80);
    expect(brackets).toContain(STBracket.FULL_DISCOUNT);
    expect(brackets).toContain(STBracket.FULL_DISCOUNT_WITH_STIPEND);
    // Should NOT include PD60, PD40, PD20, No Discount
    expect(brackets).not.toContain(STBracket.PD60);
    expect(brackets).not.toContain(STBracket.PD40);
    expect(brackets).not.toContain(STBracket.NO_DISCOUNT);
  });

  test('CHE Alumni thesis grant requires PD80-FDS range', () => {
    const s = getScholarship('College of Human Ecology Alumni Association Thesis Grant');
    const brackets = s.eligibilityCriteria.eligibleSTBrackets;
    expect(brackets).toContain(STBracket.PD80);
    expect(brackets).toContain(STBracket.FULL_DISCOUNT);
    expect(brackets).toContain(STBracket.FULL_DISCOUNT_WITH_STIPEND);
  });

  test('UT Foundation requires Full Discount only', () => {
    const s = getScholarship('UT Foundation');
    const brackets = s.eligibilityCriteria.eligibleSTBrackets;
    expect(brackets).toContain(STBracket.FULL_DISCOUNT);
    expect(brackets).toContain(STBracket.FULL_DISCOUNT_WITH_STIPEND);
    expect(brackets).not.toContain(STBracket.PD80);
  });

  test('all ST bracket values are valid enums', () => {
    csfaScholarships.forEach(s => {
      const brackets = s.eligibilityCriteria.eligibleSTBrackets;
      if (brackets && brackets.length > 0) {
        brackets.forEach(b => {
          expect(validBrackets).toContain(b);
        });
      }
    });
  });
});

// =============================================================================
// 13. TOTAL GRANT AMOUNTS SANITY
// =============================================================================
describe('Total Grant Amount Sanity Checks', () => {
  test('thesis grants are typically ₱25k-₱35k', () => {
    const thesisGrants = csfaScholarships.filter(s => s.type === ScholarshipType.THESIS_GRANT);
    thesisGrants.forEach(s => {
      expect(s.totalGrant).toBeGreaterThanOrEqual(15000);
      expect(s.totalGrant).toBeLessThanOrEqual(80000);
    });
  });

  test('private scholarships are typically ₱30k-₱60k', () => {
    const privateSchols = csfaScholarships.filter(s => s.type === ScholarshipType.PRIVATE);
    privateSchols.forEach(s => {
      expect(s.totalGrant).toBeGreaterThanOrEqual(20000);
      expect(s.totalGrant).toBeLessThanOrEqual(150000);
    });
  });
});
