#!/usr/bin/env node
// =============================================================================
// ISKOlarship - Comprehensive Route Protection Test
// Tests admin scope enforcement on ALL protected routes
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const BASE = `http://localhost:${process.env.PORT || 5001}/api`;
const JWT_SECRET = process.env.JWT_SECRET;

// Counters
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

// ─── HTTP helper ─────────────────────────────────────────────────────────────
async function api(method, path, token, body) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// ─── Test runner ─────────────────────────────────────────────────────────────
function assert(testName, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    const msg = `  ❌ ${testName}${detail ? ' — ' + detail : ''}`;
    console.log(msg);
    failures.push(msg);
  }
}

// =============================================================================
// MAIN
// =============================================================================
(async () => {
  // ── Connect to MongoDB ─────────────────────────────────────────────────────
  console.log('\n🔌  Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected\n');

  const { User, Scholarship, Application, TrainedModel } = require('../src/models');

  // ── Find admin users at each level ─────────────────────────────────────────
  const univAdmin = await User.findOne({ role: 'admin', 'adminProfile.accessLevel': 'university', isActive: true });
  const collegeAdmin = await User.findOne({ role: 'admin', 'adminProfile.accessLevel': 'college', isActive: true });
  const unitAdmin = await User.findOne({ role: 'admin', 'adminProfile.accessLevel': 'academic_unit', isActive: true });
  const student = await User.findOne({ role: 'student', isActive: true });

  if (!univAdmin) { console.error('❌ No university admin found'); process.exit(1); }
  if (!collegeAdmin) { console.error('❌ No college admin found'); process.exit(1); }
  if (!unitAdmin) { console.error('❌ No academic_unit admin found'); process.exit(1); }

  console.log(`University admin : ${univAdmin.adminProfile.firstName} (${univAdmin.email})`);
  console.log(`College admin    : ${collegeAdmin.adminProfile.firstName} — ${collegeAdmin.adminProfile.collegeCode} (${collegeAdmin.email})`);
  console.log(`Academic Unit    : ${unitAdmin.adminProfile.firstName} — ${unitAdmin.adminProfile.academicUnitCode} (${unitAdmin.email})`);
  if (student) console.log(`Student          : ${student.email}`);

  // ── Generate JWT tokens ────────────────────────────────────────────────────
  const tokenFor = (user) => jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
  const univToken = tokenFor(univAdmin);
  const collegeToken = tokenFor(collegeAdmin);
  const unitToken = tokenFor(unitAdmin);
  const studentToken = student ? tokenFor(student) : null;

  // ── Find scholarships at each level for testing ────────────────────────────
  const univScholarship = await Scholarship.findOne({ scholarshipLevel: 'university' }).lean();
  const collegeScholarship = await Scholarship.findOne({
    scholarshipLevel: 'college',
    managingCollegeCode: collegeAdmin.adminProfile.collegeCode
  }).lean();
  const otherCollegeScholarship = await Scholarship.findOne({
    scholarshipLevel: 'college',
    managingCollegeCode: { $ne: collegeAdmin.adminProfile.collegeCode }
  }).lean();
  const unitScholarship = await Scholarship.findOne({
    scholarshipLevel: 'academic_unit',
    managingCollegeCode: unitAdmin.adminProfile.collegeCode,
    managingAcademicUnitCode: unitAdmin.adminProfile.academicUnitCode
  }).lean();
  const otherUnitScholarship = await Scholarship.findOne({
    scholarshipLevel: 'academic_unit',
    managingAcademicUnitCode: { $ne: unitAdmin.adminProfile.academicUnitCode }
  }).lean();

  console.log('\n📋  Scholarship test data:');
  console.log(`  University scholarship  : ${univScholarship ? univScholarship._id : 'NONE'}`);
  console.log(`  College scholarship (own): ${collegeScholarship ? collegeScholarship._id : 'NONE'}`);
  console.log(`  College scholarship (other): ${otherCollegeScholarship ? otherCollegeScholarship._id : 'NONE'}`);
  console.log(`  Unit scholarship (own)  : ${unitScholarship ? unitScholarship._id : 'NONE'}`);
  console.log(`  Unit scholarship (other): ${otherUnitScholarship ? otherUnitScholarship._id : 'NONE'}`);

  // ── Find some applications for testing ─────────────────────────────────────
  const anyApplication = await Application.findOne().populate('scholarship').lean();
  let inScopeApp = null;
  let outOfScopeApp = null;

  if (collegeScholarship) {
    inScopeApp = await Application.findOne({ scholarship: collegeScholarship._id }).populate('scholarship').lean();
  }
  if (otherCollegeScholarship) {
    outOfScopeApp = await Application.findOne({ scholarship: otherCollegeScholarship._id }).populate('scholarship').lean();
  }
  // If no out-of-scope app via other college, try university-level scholarship
  if (!outOfScopeApp && univScholarship) {
    outOfScopeApp = await Application.findOne({ scholarship: univScholarship._id }).populate('scholarship').lean();
  }

  console.log(`  In-scope app (college) : ${inScopeApp ? inScopeApp._id : 'NONE'}`);
  console.log(`  Out-of-scope app       : ${outOfScopeApp ? outOfScopeApp._id : 'NONE'}`);

  // ── Find trained models ────────────────────────────────────────────────────
  const globalModel = await TrainedModel.findOne({ $or: [{ modelType: 'global' }, { scholarshipId: null }] }).lean();
  let scholarshipModel = null;
  if (collegeScholarship) {
    scholarshipModel = await TrainedModel.findOne({ scholarshipId: collegeScholarship._id }).lean();
  }

  console.log(`  Global model           : ${globalModel ? globalModel._id : 'NONE'}`);
  console.log(`  Scholarship model      : ${scholarshipModel ? scholarshipModel._id : 'NONE'}`);
  console.log('');

  // =========================================================================
  // TEST SUITE 1: STATISTICS ROUTES  /api/statistics
  // =========================================================================
  console.log('═══════════════════════════════════════════');
  console.log('  STATISTICS ROUTES');
  console.log('═══════════════════════════════════════════');

  // 1a. GET /statistics/overview — must require auth
  {
    const r = await api('GET', '/statistics/overview');
    assert('GET /statistics/overview WITHOUT auth → 401', r.status === 401, `got ${r.status}`);
  }

  // 1b. GET /statistics/overview — university admin gets 200
  {
    const r = await api('GET', '/statistics/overview', univToken);
    assert('GET /statistics/overview UNIV admin → 200', r.status === 200, `got ${r.status}`);
  }

  // 1c. GET /statistics/overview — college admin gets 200 (scoped data)
  {
    const r = await api('GET', '/statistics/overview', collegeToken);
    assert('GET /statistics/overview COLLEGE admin → 200', r.status === 200, `got ${r.status}`);
  }

  // 1d. GET /statistics/overview — student gets 403
  if (studentToken) {
    const r = await api('GET', '/statistics/overview', studentToken);
    assert('GET /statistics/overview STUDENT → 403', r.status === 403, `got ${r.status}`);
  }

  // 1e. GET /statistics/trends
  {
    const r = await api('GET', '/statistics/trends', univToken);
    assert('GET /statistics/trends UNIV → 200', r.status === 200, `got ${r.status}`);
  }
  {
    const r = await api('GET', '/statistics/trends', collegeToken);
    assert('GET /statistics/trends COLLEGE → 200', r.status === 200, `got ${r.status}`);
  }

  // 1f. GET /statistics/scholarships
  {
    const r = await api('GET', '/statistics/scholarships', univToken);
    assert('GET /statistics/scholarships UNIV → 200', r.status === 200, `got ${r.status}`);
  }
  {
    const r = await api('GET', '/statistics/scholarships', collegeToken);
    assert('GET /statistics/scholarships COLLEGE → 200', r.status === 200, `got ${r.status}`);
  }

  // 1g. GET /statistics/prediction-accuracy
  {
    const r = await api('GET', '/statistics/prediction-accuracy', univToken);
    assert('GET /statistics/prediction-accuracy UNIV → 200', r.status === 200, `got ${r.status}`);
  }
  {
    const r = await api('GET', '/statistics/prediction-accuracy', collegeToken);
    assert('GET /statistics/prediction-accuracy COLLEGE → 200', r.status === 200, `got ${r.status}`);
  }

  // 1h. GET /statistics/analytics
  {
    const r = await api('GET', '/statistics/analytics', univToken);
    assert('GET /statistics/analytics UNIV → 200', r.status === 200, `got ${r.status}`);
  }
  {
    const r = await api('GET', '/statistics/analytics', collegeToken);
    assert('GET /statistics/analytics COLLEGE → 200', r.status === 200, `got ${r.status}`);
  }

  // =========================================================================
  // TEST SUITE 2: TRAINING ROUTES  /api/training
  // =========================================================================
  console.log('\n═══════════════════════════════════════════');
  console.log('  TRAINING ROUTES');
  console.log('═══════════════════════════════════════════');

  // 2a. POST /training/train (global) — university only
  {
    const r = await api('POST', '/training/train', collegeToken, {});
    assert('POST /training/train COLLEGE → 403 (university only)', r.status === 403, `got ${r.status}`);
  }
  {
    const r = await api('POST', '/training/train', unitToken, {});
    assert('POST /training/train UNIT → 403 (university only)', r.status === 403, `got ${r.status}`);
  }

  // 2b. POST /training/train-all — university only
  {
    const r = await api('POST', '/training/train-all', collegeToken, {});
    assert('POST /training/train-all COLLEGE → 403', r.status === 403, `got ${r.status}`);
  }

  // 2c. POST /training/train/:scholarshipId — scope check
  if (collegeScholarship) {
    // College admin can train their own scholarship
    // (We don't actually POST to avoid triggering training — we just check access is allowed)
    // Actually, let's test the route and check what happens
    const r = await api('POST', `/training/train/${collegeScholarship._id}`, collegeToken, {});
    // Should NOT be 403 (might be 400/500 from training itself, but access allowed)
    assert(
      'POST /training/train/:id OWN college scholarship → not 403',
      r.status !== 403,
      `got ${r.status}`
    );
  }
  if (otherCollegeScholarship) {
    const r = await api('POST', `/training/train/${otherCollegeScholarship._id}`, collegeToken, {});
    assert(
      'POST /training/train/:id OTHER college scholarship → 403',
      r.status === 403,
      `got ${r.status}`
    );
  }
  if (univScholarship) {
    // College admin cannot train a university-level scholarship
    const r = await api('POST', `/training/train/${univScholarship._id}`, collegeToken, {});
    assert(
      'POST /training/train/:id UNIV scholarship by COLLEGE admin → 403',
      r.status === 403,
      `got ${r.status}`
    );
  }

  // 2d. GET /training/models — all admins get 200 but scoped data
  {
    const r = await api('GET', '/training/models', univToken);
    assert('GET /training/models UNIV → 200', r.status === 200, `got ${r.status}`);
    if (r.data?.data) {
      console.log(`    📊 Univ sees ${Array.isArray(r.data.data) ? r.data.data.length : '?'} models`);
    }
  }
  {
    const r = await api('GET', '/training/models', collegeToken);
    assert('GET /training/models COLLEGE → 200', r.status === 200, `got ${r.status}`);
    if (r.data?.data) {
      console.log(`    📊 College sees ${Array.isArray(r.data.data) ? r.data.data.length : '?'} models`);
    }
  }

  // 2e. GET /training/scholarships/trainable — all admins 200 but scoped
  {
    const r = await api('GET', '/training/scholarships/trainable', univToken);
    assert('GET /training/scholarships/trainable UNIV → 200', r.status === 200, `got ${r.status}`);
  }
  {
    const r = await api('GET', '/training/scholarships/trainable', collegeToken);
    assert('GET /training/scholarships/trainable COLLEGE → 200', r.status === 200, `got ${r.status}`);
  }

  // 2f. Activate / Delete model scoping
  if (globalModel) {
    const r = await api('POST', `/training/models/${globalModel._id}/activate`, collegeToken);
    assert('POST /training/models/:id/activate GLOBAL model by COLLEGE → 403', r.status === 403, `got ${r.status}`);
  }
  if (globalModel) {
    const r = await api('DELETE', `/training/models/${globalModel._id}`, collegeToken);
    assert('DELETE /training/models/:id GLOBAL model by COLLEGE → 403', r.status === 403, `got ${r.status}`);
  }

  // =========================================================================
  // TEST SUITE 3: PREDICTION ROUTES  /api/predictions
  // =========================================================================
  console.log('\n═══════════════════════════════════════════');
  console.log('  PREDICTION ROUTES');
  console.log('═══════════════════════════════════════════');

  // 3a. POST /predictions/model/train — university only
  {
    const r = await api('POST', '/predictions/model/train', collegeToken, {});
    assert('POST /predictions/model/train COLLEGE → 403', r.status === 403, `got ${r.status}`);
  }
  {
    const r = await api('POST', '/predictions/model/train', unitToken, {});
    assert('POST /predictions/model/train UNIT → 403', r.status === 403, `got ${r.status}`);
  }

  // 3b. POST /predictions/model/reset — university only
  {
    const r = await api('POST', '/predictions/model/reset', collegeToken, {});
    assert('POST /predictions/model/reset COLLEGE → 403', r.status === 403, `got ${r.status}`);
  }

  // 3c. GET /predictions/model/stats — all admins see (global model stats)
  {
    const r = await api('GET', '/predictions/model/stats', univToken);
    assert('GET /predictions/model/stats UNIV → 200', r.status === 200, `got ${r.status}`);
  }
  {
    const r = await api('GET', '/predictions/model/stats', collegeToken);
    assert('GET /predictions/model/stats COLLEGE → 200', r.status === 200, `got ${r.status}`);
  }

  // 3d. POST /predictions/application/:appId — scope check
  if (inScopeApp) {
    const r = await api('POST', `/predictions/application/${inScopeApp._id}`, collegeToken, {});
    assert(
      'POST /predictions/application/:id IN-SCOPE → not 403',
      r.status !== 403,
      `got ${r.status}`
    );
  }
  if (outOfScopeApp) {
    const r = await api('POST', `/predictions/application/${outOfScopeApp._id}`, collegeToken, {});
    assert(
      'POST /predictions/application/:id OUT-OF-SCOPE → 403',
      r.status === 403,
      `got ${r.status}`
    );
  }

  // =========================================================================
  // TEST SUITE 4: APPLICATION ROUTES  /api/applications
  // =========================================================================
  console.log('\n═══════════════════════════════════════════');
  console.log('  APPLICATION ROUTES');
  console.log('═══════════════════════════════════════════');

  // 4a. GET /applications/:id — scope check for admin
  if (inScopeApp) {
    const r = await api('GET', `/applications/${inScopeApp._id}`, collegeToken);
    assert(
      'GET /applications/:id IN-SCOPE by COLLEGE → not 403',
      r.status !== 403,
      `got ${r.status}`
    );
  }
  if (outOfScopeApp) {
    const r = await api('GET', `/applications/${outOfScopeApp._id}`, collegeToken);
    assert(
      'GET /applications/:id OUT-OF-SCOPE by COLLEGE → 403',
      r.status === 403,
      `got ${r.status}`
    );
  }

  // 4b. University admin can get any application
  if (anyApplication) {
    const r = await api('GET', `/applications/${anyApplication._id}`, univToken);
    assert(
      'GET /applications/:id by UNIV → 200',
      r.status === 200,
      `got ${r.status}`
    );
  }

  // =========================================================================
  // TEST SUITE 5: USER ROUTES  /api/users
  // =========================================================================
  console.log('\n═══════════════════════════════════════════');
  console.log('  USER ROUTES');
  console.log('═══════════════════════════════════════════');

  // 5a. GET /users — university sees all, college sees only scoped students
  {
    const r = await api('GET', '/users', univToken);
    assert('GET /users UNIV → 200', r.status === 200, `got ${r.status}`);
    if (r.data?.pagination) {
      console.log(`    📊 Univ sees ${r.data.pagination.total || '?'} total users`);
    }
  }
  {
    const r = await api('GET', '/users', collegeToken);
    assert('GET /users COLLEGE → 200', r.status === 200, `got ${r.status}`);
    if (r.data?.pagination) {
      console.log(`    📊 College sees ${r.data.pagination.total || '?'} total users`);
    }
  }
  {
    const r = await api('GET', '/users', unitToken);
    assert('GET /users UNIT → 200', r.status === 200, `got ${r.status}`);
    if (r.data?.pagination) {
      console.log(`    📊 Unit sees ${r.data.pagination.total || '?'} total users`);
    }
  }

  // 5b. GET /users/stats/overview
  {
    const r = await api('GET', '/users/stats/overview', univToken);
    assert('GET /users/stats/overview UNIV → 200', r.status === 200, `got ${r.status}`);
  }
  {
    const r = await api('GET', '/users/stats/overview', collegeToken);
    assert('GET /users/stats/overview COLLEGE → 200', r.status === 200, `got ${r.status}`);
  }

  // 5c. GET /users/:id — scope check — find a REAL student that exists and is out of scope
  // First, try our in-scope app's applicant
  if (inScopeApp) {
    // The applicant of an in-scope application should be viewable
    const applicantExists = await User.findById(inScopeApp.applicant).lean();
    if (applicantExists) {
      const r = await api('GET', `/users/${inScopeApp.applicant}`, collegeToken);
      assert(
        'GET /users/:id IN-SCOPE student by COLLEGE → not 403',
        r.status !== 403,
        `got ${r.status}`
      );
    } else {
      console.log('  ⏭️  Skipped in-scope user/:id test — applicant user deleted');
      skipped++;
    }
  }
  if (outOfScopeApp && outOfScopeApp.applicant) {
    // Verify the applicant user actually exists in DB first
    const outOfScopeUser = await User.findById(outOfScopeApp.applicant).lean();
    if (!outOfScopeUser) {
      console.log('  ⏭️  Skipped out-of-scope user/:id test — applicant user no longer exists in DB (404 expected, not a scope issue)');
      skipped++;
    } else {
      // Check if the out-of-scope applicant is also an applicant in the college admin's scope
      // (a student could apply to multiple scholarships)
      const { Scholarship: ScholarshipModel } = require('../src/models');
      const collegeScholarships = await ScholarshipModel.find({
        scholarshipLevel: 'college',
        managingCollegeCode: collegeAdmin.adminProfile.collegeCode
      }).select('_id').lean();
      const collegeSIds = collegeScholarships.map(s => s._id);
      const hasOverlap = await Application.exists({
        applicant: outOfScopeApp.applicant,
        scholarship: { $in: collegeSIds }
      });
      if (!hasOverlap) {
        const r = await api('GET', `/users/${outOfScopeApp.applicant}`, collegeToken);
        assert(
          'GET /users/:id OUT-OF-SCOPE student by COLLEGE → 403',
          r.status === 403,
          `got ${r.status}`
        );
      } else {
        console.log('  ⏭️  Skipped out-of-scope user test — student has overlap in both scopes');
        skipped++;
      }
    }
  }

  // =========================================================================
  // TEST SUITE 6: SCHOLARSHIP ROUTES  /api/scholarships
  // =========================================================================
  console.log('\n═══════════════════════════════════════════');
  console.log('  SCHOLARSHIP ROUTES');
  console.log('═══════════════════════════════════════════');

  // 6a. GET /scholarships/:id — admin scope check
  if (univScholarship) {
    // University admin can view any
    const r = await api('GET', `/scholarships/${univScholarship._id}`, univToken);
    assert('GET /scholarships/:id UNIV scholarship by UNIV admin → 200', r.status === 200, `got ${r.status}`);

    // College admin cannot view a university-level scholarship
    const r2 = await api('GET', `/scholarships/${univScholarship._id}`, collegeToken);
    assert('GET /scholarships/:id UNIV scholarship by COLLEGE admin → 403', r2.status === 403, `got ${r2.status}`);
  }

  if (collegeScholarship) {
    // College admin can view own college scholarship
    const r = await api('GET', `/scholarships/${collegeScholarship._id}`, collegeToken);
    assert('GET /scholarships/:id OWN college scholarship by COLLEGE admin → 200', r.status === 200, `got ${r.status}`);
    
    // Check management flags
    if (r.data?.data?.canManage !== undefined) {
      assert('GET /scholarships/:id returns canManage=true for own', r.data.data.canManage === true, `got ${r.data.data.canManage}`);
    }
  }

  if (otherCollegeScholarship) {
    // College admin cannot view OTHER college's scholarship
    const r = await api('GET', `/scholarships/${otherCollegeScholarship._id}`, collegeToken);
    assert('GET /scholarships/:id OTHER college scholarship by COLLEGE admin → 403', r.status === 403, `got ${r.status}`);
  }

  if (unitScholarship) {
    // Unit admin can view own unit scholarship
    const r = await api('GET', `/scholarships/${unitScholarship._id}`, unitToken);
    assert('GET /scholarships/:id OWN unit scholarship by UNIT admin → 200', r.status === 200, `got ${r.status}`);
  }

  if (univScholarship) {
    // Unit admin cannot view university-level scholarship
    const r = await api('GET', `/scholarships/${univScholarship._id}`, unitToken);
    assert('GET /scholarships/:id UNIV scholarship by UNIT admin → 403', r.status === 403, `got ${r.status}`);
  }

  // 6b. Public access (no auth) should still work
  if (collegeScholarship) {
    const r = await api('GET', `/scholarships/${collegeScholarship._id}`);
    assert('GET /scholarships/:id PUBLIC (no auth) → 200', r.status === 200, `got ${r.status}`);
  }
  if (univScholarship) {
    const r = await api('GET', `/scholarships/${univScholarship._id}`);
    assert('GET /scholarships/:id PUBLIC (no auth, univ scholarship) → 200', r.status === 200, `got ${r.status}`);
  }

  // 6c. Student can also browse scholarships (public access)
  if (studentToken && univScholarship) {
    const r = await api('GET', `/scholarships/${univScholarship._id}`, studentToken);
    assert('GET /scholarships/:id STUDENT → 200 (public browsing)', r.status === 200, `got ${r.status}`);
  }

  // =========================================================================
  // CROSS-CUTTING: Student cannot access admin-only routes
  // =========================================================================
  console.log('\n═══════════════════════════════════════════');
  console.log('  CROSS-CUTTING: STUDENT ACCESS DENIED');
  console.log('═══════════════════════════════════════════');

  if (studentToken) {
    const r1 = await api('POST', '/training/train', studentToken, {});
    assert('POST /training/train as STUDENT → 403', r1.status === 403, `got ${r1.status}`);

    const r2 = await api('POST', '/predictions/model/train', studentToken, {});
    assert('POST /predictions/model/train as STUDENT → 403', r2.status === 403, `got ${r2.status}`);

    const r3 = await api('GET', '/statistics/overview', studentToken);
    assert('GET /statistics/overview as STUDENT → 403', r3.status === 403, `got ${r3.status}`);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n═══════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('═══════════════════════════════════════════');

  if (failures.length > 0) {
    console.log('\n🔴 FAILURES:');
    failures.forEach(f => console.log(f));
  } else {
    console.log('\n🟢 ALL TESTS PASSED');
  }

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
