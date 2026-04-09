#!/usr/bin/env node
// =============================================================================
// Test: Excel Import + Merge + Deduplication
// Validates that the Excel import service correctly:
// 1. Parses the Excel file
// 2. Converts rows to application-like objects
// 3. Deduplicates against mock DB records
// =============================================================================

const path = require('path');
const {
  parseExcelHistoricalData,
  parseExcelScholarships,
  mergeApplications
} = require('../src/services/excel/excelImport.service');

const EXCEL_PATH = path.join(__dirname, '..', 'ISKOlarship_CSFA_Historical_Data.xlsx');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log(`  ✅ ${msg}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  console.log('════════════════════════════════════════════════════════════════');
  console.log('  Excel Import + Merge + Deduplication Tests');
  console.log('════════════════════════════════════════════════════════════════\n');

  // ─── Test 1: Parse Scholarships ──────────────────────────────────────────
  console.log('1. Parse Scholarships Sheet');
  const scholarships = await parseExcelScholarships(EXCEL_PATH);
  assert(scholarships instanceof Map, 'Returns a Map');
  assert(scholarships.size > 0, `Parsed ${scholarships.size} scholarships`);

  const firstKey = [...scholarships.keys()][0];
  const firstScholarship = scholarships.get(firstKey);
  assert(firstScholarship.name, `First scholarship has name: "${firstScholarship.name}"`);
  assert(firstScholarship.eligibilityCriteria, 'Has eligibilityCriteria object');
  console.log('');

  // ─── Test 2: Parse Historical Applications ──────────────────────────────
  console.log('2. Parse Historical Applications Sheet');
  const excelApps = await parseExcelHistoricalData(EXCEL_PATH);
  assert(Array.isArray(excelApps), 'Returns an array');
  assert(excelApps.length > 0, `Parsed ${excelApps.length} applications`);

  const firstApp = excelApps[0];
  assert(firstApp._source === 'excel', 'Has _source = "excel" marker');
  assert(typeof firstApp._dedupeKey === 'string', `Has _dedupeKey: "${firstApp._dedupeKey}"`);
  assert(firstApp.applicantSnapshot, 'Has applicantSnapshot object');
  assert(firstApp.applicantSnapshot.studentNumber, `Has studentNumber: ${firstApp.applicantSnapshot.studentNumber}`);
  assert(firstApp.applicantSnapshot.gwa > 0, `Has valid GWA: ${firstApp.applicantSnapshot.gwa}`);
  assert(firstApp.applicantSnapshot.college, `Has college: ${firstApp.applicantSnapshot.college}`);
  assert(firstApp.applicantSnapshot.course, `Has course: ${firstApp.applicantSnapshot.course}`);
  assert(['approved', 'rejected'].includes(firstApp.status), `Has valid status: ${firstApp.status}`);
  assert(firstApp._scholarshipName, `Has _scholarshipName: "${firstApp._scholarshipName}"`);
  assert(typeof firstApp.eligibilityPercentage === 'number', `Has eligibilityPercentage: ${firstApp.eligibilityPercentage}`);

  const approvedCount = excelApps.filter(a => a.status === 'approved').length;
  const rejectedCount = excelApps.filter(a => a.status === 'rejected').length;
  console.log(`   Approved: ${approvedCount}, Rejected: ${rejectedCount}`);
  assert(approvedCount > 0, 'Has at least some approved applications');
  assert(rejectedCount > 0, 'Has at least some rejected applications');
  console.log('');

  // ─── Test 3: Deduplication - no overlap ─────────────────────────────────
  console.log('3. Merge with no overlap (empty DB)');
  const { merged: merged1, stats: stats1 } = mergeApplications(
    [],               // No DB data
    excelApps,        // All from Excel
    scholarships,     // Excel scholarship data
    new Map()         // No DB scholarships
  );
  assert(merged1.length === excelApps.length, `All ${excelApps.length} Excel apps added (no DB overlap)`);
  assert(stats1.dbUsed === 0, 'DB used = 0');
  assert(stats1.excelUsed === excelApps.length, `Excel used = ${excelApps.length}`);
  assert(stats1.excelOverriddenByDb === 0, 'No Excel records overridden by DB');
  console.log('');

  // ─── Test 4: Deduplication - full overlap ───────────────────────────────
  console.log('4. Merge with full overlap (DB has same records)');

  // Simulate DB records that match the first 10 Excel records
  const fakeDbApps = excelApps.slice(0, 10).map(app => ({
    ...app,
    _source: undefined, // will be set by merge
    scholarship: { name: app._scholarshipName },
    applicantSnapshot: { ...app.applicantSnapshot }
  }));

  const dbScholarshipsByName = new Map();
  for (const app of fakeDbApps) {
    const key = app.scholarship.name.toLowerCase();
    if (!dbScholarshipsByName.has(key)) {
      dbScholarshipsByName.set(key, scholarships.get(key) || { name: app.scholarship.name, eligibilityCriteria: {} });
    }
  }

  const { merged: merged2, stats: stats2 } = mergeApplications(
    fakeDbApps,
    excelApps,
    scholarships,
    dbScholarshipsByName
  );

  assert(stats2.dbUsed === 10, 'DB used = 10');
  assert(stats2.excelOverriddenByDb === 10, `${stats2.excelOverriddenByDb} Excel records overridden by DB (expected 10)`);
  // Excel-first: all Excel apps loaded, then 10 get overridden by DB - net Excel count is total minus overridden
  assert(stats2.excelUsed === excelApps.length - 10, `Excel used = ${excelApps.length - 10}`);
  assert(merged2.length === excelApps.length, `Total merged = ${excelApps.length} (no extras, no loss)`);
  console.log('');

  // ─── Test 5: Verify feature extraction compatibility ────────────────────
  console.log('5. Feature extraction compatibility');

  // Load the feature extraction function (doesn't need DB)
  const { extractFeatures } = require('../src/services/trainingService/featureExtraction');

  // Pick a sample Excel application and attach a scholarship
  const sampleApp = { ...excelApps[0] };
  const sampleScholarshipKey = sampleApp._scholarshipName.toLowerCase();
  const sampleScholarship = scholarships.get(sampleScholarshipKey) || {
    eligibilityCriteria: {},
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    applicationStartDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  };

  let features;
  try {
    features = extractFeatures(sampleApp, sampleScholarship);
    assert(features !== null && typeof features === 'object', 'Feature extraction returned an object');
  } catch (err) {
    assert(false, `Feature extraction threw: ${err.message}`);
    features = null;
  }

  if (features) {
    const expectedFeatures = [
      'gwaScore', 'yearLevelMatch', 'incomeMatch', 'stBracketMatch',
      'collegeMatch', 'courseMatch', 'citizenshipMatch', 'applicationTiming',
      'eligibilityScore', 'academicStrength', 'financialNeed', 'programFit', 'overallFit'
    ];
    for (const f of expectedFeatures) {
      assert(typeof features[f] === 'number', `Feature "${f}" is a number: ${features[f].toFixed(3)}`);
    }
  }
  console.log('');

  // ─── Test 6: Verify training sample format ──────────────────────────────
  console.log('6. Training sample format (features + label)');

  if (features) {
    const label = sampleApp.status === 'approved' ? 1 : 0;
    const trainingSample = { features, label };
    assert(typeof trainingSample.label === 'number', `Label is number: ${trainingSample.label}`);
    assert(trainingSample.label === 0 || trainingSample.label === 1, 'Label is 0 or 1');
    assert(Object.keys(trainingSample.features).length === 13, `13 features extracted (got ${Object.keys(trainingSample.features).length})`);
  }
  console.log('');

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
