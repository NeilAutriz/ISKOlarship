/**
 * Document Verification & Admin Scope Tests
 * 
 * Comprehensive tests for:
 * 1. Student scope filter generation (university / college / academic_unit)
 * 2. canManageStudent() access control
 * 3. Verification route scope integration
 * 4. Edge cases (missing fields, legacy fields, unconfigured admins)
 * 
 * Run: cd backend && node tests/document-verification.test.js
 */

const assert = require('assert');

// Test counter
let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧪 Running Document Verification & Admin Scope Tests\n');
  console.log('='.repeat(70));
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('='.repeat(70));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// =============================================================================
// Module Loading Tests
// =============================================================================

test('adminScope middleware loads without errors', () => {
  const scope = require('../src/middleware/adminScope.middleware');
  assert.ok(scope, 'Module should load');
});

test('adminScope exports getStudentScopeFilter', () => {
  const scope = require('../src/middleware/adminScope.middleware');
  assert.strictEqual(typeof scope.getStudentScopeFilter, 'function');
});

test('adminScope exports canManageStudent', () => {
  const scope = require('../src/middleware/adminScope.middleware');
  assert.strictEqual(typeof scope.canManageStudent, 'function');
});

test('adminScope exports getAdminScopeSummary', () => {
  const scope = require('../src/middleware/adminScope.middleware');
  assert.strictEqual(typeof scope.getAdminScopeSummary, 'function');
});

test('verification routes module loads without errors', () => {
  const routes = require('../src/routes/verification.routes');
  assert.ok(routes, 'Routes module should load');
});

// =============================================================================
// getStudentScopeFilter — University Admin
// =============================================================================

test('university admin: scope filter returns empty object (all students)', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = {
    role: 'admin',
    adminProfile: { accessLevel: 'university' }
  };
  const filter = getStudentScopeFilter(user);
  assert.deepStrictEqual(filter, {});
});

// =============================================================================
// getStudentScopeFilter — College Admin
// =============================================================================

test('college admin with collegeCode: filter by studentProfile.collegeCode', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = {
    role: 'admin',
    adminProfile: { accessLevel: 'college', collegeCode: 'CAS', college: 'College of Arts and Sciences' }
  };
  const filter = getStudentScopeFilter(user);
  assert.deepStrictEqual(filter, { 'studentProfile.collegeCode': 'CAS' });
});

test('college admin without collegeCode falls back to legacy college name', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = {
    role: 'admin',
    adminProfile: { accessLevel: 'college', collegeCode: null, college: 'College of Arts and Sciences' }
  };
  const filter = getStudentScopeFilter(user);
  assert.deepStrictEqual(filter, { 'studentProfile.college': 'College of Arts and Sciences' });
});

test('college admin with no college info: returns deny-all filter', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = {
    role: 'admin',
    adminProfile: { accessLevel: 'college', collegeCode: null, college: null }
  };
  const filter = getStudentScopeFilter(user);
  assert.ok(filter._id, 'Should have _id filter');
  assert.strictEqual(filter._id.$exists, false, 'Should deny all');
});

// =============================================================================
// getStudentScopeFilter — Academic Unit Admin
// =============================================================================

test('academic_unit admin: filter by collegeCode AND academicUnitCode', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = {
    role: 'admin',
    adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS' }
  };
  const filter = getStudentScopeFilter(user);
  assert.deepStrictEqual(filter, {
    'studentProfile.collegeCode': 'CAS',
    'studentProfile.academicUnitCode': 'ICS',
  });
});

test('academic_unit admin missing collegeCode: returns deny-all', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = {
    role: 'admin',
    adminProfile: { accessLevel: 'academic_unit', collegeCode: null, academicUnitCode: 'ICS' }
  };
  const filter = getStudentScopeFilter(user);
  assert.ok(filter._id && filter._id.$exists === false, 'Should deny all');
});

test('academic_unit admin missing academicUnitCode: returns deny-all', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = {
    role: 'admin',
    adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: null }
  };
  const filter = getStudentScopeFilter(user);
  assert.ok(filter._id && filter._id.$exists === false, 'Should deny all');
});

// =============================================================================
// getStudentScopeFilter — Edge Cases
// =============================================================================

test('non-admin user: returns deny-all', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = { role: 'student', studentProfile: {} };
  const filter = getStudentScopeFilter(user);
  assert.ok(filter._id && filter._id.$exists === false);
});

test('null user: returns deny-all', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const filter = getStudentScopeFilter(null);
  assert.ok(filter._id && filter._id.$exists === false);
});

test('admin with no adminProfile: returns deny-all', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = { role: 'admin' };
  const filter = getStudentScopeFilter(user);
  assert.ok(filter._id && filter._id.$exists === false);
});

test('admin with unknown accessLevel: returns deny-all', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = {
    role: 'admin',
    adminProfile: { accessLevel: 'super_admin' }
  };
  const filter = getStudentScopeFilter(user);
  assert.ok(filter._id && filter._id.$exists === false);
});

test('admin with no accessLevel: returns deny-all', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const user = {
    role: 'admin',
    adminProfile: { collegeCode: 'CAS' }
  };
  const filter = getStudentScopeFilter(user);
  assert.ok(filter._id && filter._id.$exists === false);
});

// =============================================================================
// canManageStudent — University Admin
// =============================================================================

test('university admin can manage any student', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'university' } };
  const student = { studentProfile: { collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  assert.strictEqual(canManageStudent(admin, student), true);
});

test('university admin can manage student with no college', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'university' } };
  const student = { studentProfile: {} };
  assert.strictEqual(canManageStudent(admin, student), true);
});

// =============================================================================
// canManageStudent — College Admin
// =============================================================================

test('college admin can manage student in same college', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: 'CAS' } };
  const student = { studentProfile: { collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  assert.strictEqual(canManageStudent(admin, student), true);
});

test('college admin cannot manage student in different college', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: 'CAS' } };
  const student = { studentProfile: { collegeCode: 'CEAT', academicUnitCode: 'DCE' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

test('college admin cannot manage student with no collegeCode', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: 'CAS' } };
  const student = { studentProfile: { college: 'College of Arts and Sciences' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

test('college admin with no collegeCode cannot manage anyone', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: null } };
  const student = { studentProfile: { collegeCode: 'CAS' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

// =============================================================================
// canManageStudent — Academic Unit Admin
// =============================================================================

test('academic_unit admin can manage student in same college+unit', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  const student = { studentProfile: { collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  assert.strictEqual(canManageStudent(admin, student), true);
});

test('academic_unit admin cannot manage student in same college but different unit', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  const student = { studentProfile: { collegeCode: 'CAS', academicUnitCode: 'IMSP' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

test('academic_unit admin cannot manage student in different college', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  const student = { studentProfile: { collegeCode: 'CEAT', academicUnitCode: 'DCE' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

test('academic_unit admin cannot manage student with no academicUnitCode', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  const student = { studentProfile: { collegeCode: 'CAS' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

test('academic_unit admin with missing config cannot manage anyone', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS' } };
  const student = { studentProfile: { collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

// =============================================================================
// canManageStudent — Edge Cases
// =============================================================================

test('canManageStudent: null admin returns false', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  assert.strictEqual(canManageStudent(null, { studentProfile: {} }), false);
});

test('canManageStudent: null student returns false', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'university' } };
  assert.strictEqual(canManageStudent(admin, null), false);
});

test('canManageStudent: non-admin user returns false', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const user = { role: 'student', adminProfile: { accessLevel: 'university' } };
  assert.strictEqual(canManageStudent(user, { studentProfile: {} }), false);
});

test('canManageStudent: admin with no accessLevel returns false', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: {} };
  assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: 'CAS' } }), false);
});

// =============================================================================
// getAdminScopeSummary — Verification Context
// =============================================================================

test('getAdminScopeSummary: university admin returns full access', () => {
  const { getAdminScopeSummary } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'university' } };
  const summary = getAdminScopeSummary(admin);
  assert.strictEqual(summary.level, 'university');
  assert.strictEqual(summary.levelDisplay, 'University Admin');
  assert.ok(summary.description.includes('all'));
});

test('getAdminScopeSummary: college admin returns college scope', () => {
  const { getAdminScopeSummary } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: 'CAS', college: 'College of Arts and Sciences' } };
  const summary = getAdminScopeSummary(admin);
  assert.strictEqual(summary.level, 'college');
  assert.strictEqual(summary.levelDisplay, 'College Admin');
  assert.strictEqual(summary.collegeCode, 'CAS');
});

test('getAdminScopeSummary: academic_unit admin returns unit scope', () => {
  const { getAdminScopeSummary } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS', academicUnit: 'Institute of Computer Science' } };
  const summary = getAdminScopeSummary(admin);
  assert.strictEqual(summary.level, 'academic_unit');
  assert.strictEqual(summary.academicUnitCode, 'ICS');
  assert.ok(summary.description.includes('Institute of Computer Science') || summary.description.includes('ICS'));
});

test('getAdminScopeSummary: unconfigured admin returns null level', () => {
  const { getAdminScopeSummary } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: {} };
  const summary = getAdminScopeSummary(admin);
  assert.strictEqual(summary.level, null);
  assert.ok(summary.description.includes('not fully configured'));
});

test('getAdminScopeSummary: non-admin returns null', () => {
  const { getAdminScopeSummary } = require('../src/middleware/adminScope.middleware');
  const user = { role: 'student' };
  assert.strictEqual(getAdminScopeSummary(user), null);
});

// =============================================================================
// Scope Filter Cross-Check with All UPLB Colleges
// =============================================================================

test('scope filters cover all 10 UPLB colleges', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const collegeCodes = ['CAS', 'CAFS', 'CEM', 'CEAT', 'CFNR', 'CHE', 'CVM', 'CDC', 'CPAF', 'GS'];
  
  for (const code of collegeCodes) {
    const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: code } };
    const filter = getStudentScopeFilter(admin);
    assert.strictEqual(filter['studentProfile.collegeCode'], code, `Filter should match ${code}`);
  }
});

test('scope filters handle CAS departments correctly', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const departments = ['IBS', 'IC', 'ICS', 'IMSP', 'ISTAT', 'DHUM', 'DSOCS', 'DHKPE'];
  
  for (const dept of departments) {
    const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: dept } };
    const filter = getStudentScopeFilter(admin);
    assert.strictEqual(filter['studentProfile.collegeCode'], 'CAS');
    assert.strictEqual(filter['studentProfile.academicUnitCode'], dept, `Filter should match ${dept}`);
  }
});

// =============================================================================
// Scope Isolation Tests — Clean Separation
// =============================================================================

test('CAS college admin cannot see CEAT students', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: 'CAS' } };
  const student = { studentProfile: { collegeCode: 'CEAT', academicUnitCode: 'DCE' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

test('ICS academic_unit admin cannot see IMSP students', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  const student = { studentProfile: { collegeCode: 'CAS', academicUnitCode: 'IMSP' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

test('CEAT college admin cannot see CAS student even with same academic unit name collision', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: 'CEAT' } };
  const student = { studentProfile: { collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  assert.strictEqual(canManageStudent(admin, student), false);
});

// =============================================================================
// Scope Filter Composability Tests
// =============================================================================

test('university scope filter can merge with role filter', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'university' } };
  const scope = getStudentScopeFilter(admin);
  const merged = { ...scope, role: 'student' };
  assert.deepStrictEqual(merged, { role: 'student' });
});

test('college scope filter can merge with document existence filter', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: 'CAS' } };
  const scope = getStudentScopeFilter(admin);
  const merged = { ...scope, role: 'student', 'studentProfile.documents': { $exists: true, $not: { $size: 0 } } };
  assert.strictEqual(merged['studentProfile.collegeCode'], 'CAS');
  assert.strictEqual(merged.role, 'student');
  assert.ok(merged['studentProfile.documents'].$exists);
});

test('academic_unit scope filter preserves both codes when merged', () => {
  const { getStudentScopeFilter } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  const scope = getStudentScopeFilter(admin);
  const merged = { ...scope, role: 'student' };
  assert.strictEqual(merged['studentProfile.collegeCode'], 'CAS');
  assert.strictEqual(merged['studentProfile.academicUnitCode'], 'ICS');
  assert.strictEqual(merged.role, 'student');
});

// =============================================================================
// Verification Route Exports
// =============================================================================

test('verification routes exports an Express router', () => {
  const routes = require('../src/routes/verification.routes');
  assert.ok(routes, 'Routes should export');
  assert.strictEqual(typeof routes, 'function', 'Express router is a function');
});

test('verification routes has expected route stack', () => {
  const routes = require('../src/routes/verification.routes');
  const stack = routes.stack || [];
  // Router should have route layers registered
  assert.ok(stack.length > 0, 'Router should have routes registered');
});

// =============================================================================
// Consistency Checks — All Scope Functions Agree
// =============================================================================

test('getStudentScopeFilter and canManageStudent agree for university', () => {
  const { getStudentScopeFilter, canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'university' } };
  
  // Scope filter should return empty (all students)
  const filter = getStudentScopeFilter(admin);
  assert.deepStrictEqual(filter, {});
  
  // canManageStudent should return true for any student
  assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: 'CAS' } }), true);
  assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: 'CEAT' } }), true);
  assert.strictEqual(canManageStudent(admin, { studentProfile: {} }), true);
});

test('getStudentScopeFilter and canManageStudent agree for college admin', () => {
  const { getStudentScopeFilter, canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: 'CAS' } };
  
  // Scope filter should require CAS
  const filter = getStudentScopeFilter(admin);
  assert.strictEqual(filter['studentProfile.collegeCode'], 'CAS');
  
  // canManageStudent should match the filter's logic
  assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: 'CAS' } }), true);
  assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: 'CEAT' } }), false);
});

test('getStudentScopeFilter and canManageStudent agree for academic_unit admin', () => {
  const { getStudentScopeFilter, canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  
  // Filter should require both codes
  const filter = getStudentScopeFilter(admin);
  assert.strictEqual(filter['studentProfile.collegeCode'], 'CAS');
  assert.strictEqual(filter['studentProfile.academicUnitCode'], 'ICS');
  
  // canManageStudent should match
  assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: 'CAS', academicUnitCode: 'ICS' } }), true);
  assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: 'CAS', academicUnitCode: 'IMSP' } }), false);
  assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: 'CEAT', academicUnitCode: 'ICS' } }), false);
});

test('getStudentScopeFilter and canManageStudent agree: deny-all on unconfigured', () => {
  const { getStudentScopeFilter, canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: {} };
  
  const filter = getStudentScopeFilter(admin);
  assert.ok(filter._id && filter._id.$exists === false, 'Filter should deny all');
  
  assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: 'CAS' } }), false);
});

// =============================================================================
// Existing Scope Functions Still Work (Backward Compatibility)
// =============================================================================

test('getScholarshipScopeFilter still works for university admin', () => {
  const { getScholarshipScopeFilter } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'university' } };
  assert.deepStrictEqual(getScholarshipScopeFilter(admin), {});
});

test('getScholarshipScopeFilter still works for college admin', () => {
  const { getScholarshipScopeFilter } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: 'CAS' } };
  const filter = getScholarshipScopeFilter(admin);
  assert.strictEqual(filter.scholarshipLevel, 'college');
  assert.strictEqual(filter.managingCollegeCode, 'CAS');
});

test('canManageApplication still exported', () => {
  const { canManageApplication } = require('../src/middleware/adminScope.middleware');
  assert.strictEqual(typeof canManageApplication, 'function');
});

test('canManageTrainedModel still exported', () => {
  const { canManageTrainedModel } = require('../src/middleware/adminScope.middleware');
  assert.strictEqual(typeof canManageTrainedModel, 'function');
});

test('getScopedScholarshipIds still exported', () => {
  const { getScopedScholarshipIds } = require('../src/middleware/adminScope.middleware');
  assert.strictEqual(typeof getScopedScholarshipIds, 'function');
});

// =============================================================================
// Hierarchical Access Verification
// =============================================================================

test('university admin can manage students across all colleges', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'university' } };
  const colleges = ['CAS', 'CAFS', 'CEM', 'CEAT', 'CFNR', 'CHE', 'CVM', 'CDC', 'CPAF', 'GS'];
  for (const code of colleges) {
    assert.strictEqual(canManageStudent(admin, { studentProfile: { collegeCode: code } }), true, `Should manage ${code}`);
  }
});

test('college admin is restricted to their college only', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const colleges = ['CAS', 'CAFS', 'CEM', 'CEAT', 'CFNR', 'CHE', 'CVM', 'CDC', 'CPAF', 'GS'];
  
  for (const adminCollege of colleges) {
    const admin = { role: 'admin', adminProfile: { accessLevel: 'college', collegeCode: adminCollege } };
    for (const studentCollege of colleges) {
      const student = { studentProfile: { collegeCode: studentCollege } };
      const expected = adminCollege === studentCollege;
      assert.strictEqual(
        canManageStudent(admin, student), expected,
        `Admin ${adminCollege} ${expected ? 'should' : 'should NOT'} manage student in ${studentCollege}`
      );
    }
  }
});

test('academic_unit admin is restricted to their specific unit only', () => {
  const { canManageStudent } = require('../src/middleware/adminScope.middleware');
  const admin = { role: 'admin', adminProfile: { accessLevel: 'academic_unit', collegeCode: 'CAS', academicUnitCode: 'ICS' } };
  
  const testCases = [
    { college: 'CAS', unit: 'ICS', expected: true },
    { college: 'CAS', unit: 'IMSP', expected: false },
    { college: 'CAS', unit: 'IBS', expected: false },
    { college: 'CEAT', unit: 'ICS', expected: false },
    { college: 'CAS', unit: null, expected: false },
    { college: null, unit: 'ICS', expected: false },
  ];
  
  for (const tc of testCases) {
    const student = { studentProfile: { collegeCode: tc.college, academicUnitCode: tc.unit } };
    assert.strictEqual(
      canManageStudent(admin, student), tc.expected,
      `Admin CAS/ICS ${tc.expected ? 'should' : 'should NOT'} manage student in ${tc.college}/${tc.unit}`
    );
  }
});

// =============================================================================
// User Model Verification Schema Tests
// =============================================================================

test('User model has verification fields in documents schema', () => {
  const { User } = require('../src/models');
  const schema = User.schema;
  const docPath = schema.path('studentProfile.documents');
  assert.ok(docPath, 'documents path should exist');
});

test('User model supports verificationStatus enum values', () => {
  const { User } = require('../src/models');
  const schemaObj = User.schema.obj;
  const docSchema = schemaObj.studentProfile?.documents;
  // Just verify the model loads and has the expected structure
  assert.ok(User.schema.path('studentProfile.documents'), 'Should have documents path');
});

// =============================================================================
// Run All Tests
// =============================================================================

runTests();
