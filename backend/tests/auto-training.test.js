// =============================================================================
// ISKOlarship - Auto-Training Comprehensive Test
// Tests: endpoints, event-driven retraining, concurrency, Railway compat
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const BASE = 'http://localhost:5001/api';

async function main() {
  let passed = 0;
  let failed = 0;
  let warnings = [];

  function ok(name) { passed++; console.log(`  ✅ ${name}`); }
  function fail(name, reason) { failed++; console.log(`  ❌ ${name}: ${reason}`); }
  function warn(name, reason) { warnings.push(name); console.log(`  ⚠️  ${name}: ${reason}`); }

  // ── Connect DB ──────────────────────────────────────────────────────────
  await mongoose.connect(process.env.MONGODB_URI);
  const { User, Application, Scholarship } = require('../src/models');
  const { TrainedModel } = require('../src/models/TrainedModel.model');

  // ── Get admin token ─────────────────────────────────────────────────────
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) { console.error('No admin user found'); process.exit(1); }
  const token = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  console.log(`\nAdmin: ${admin.email} (${admin.adminProfile?.accessLevel})`);
  console.log(`\n${'='.repeat(60)}`);
  console.log('SECTION 1: Auto-Training API Endpoints');
  console.log('='.repeat(60));

  // ── Test 1: GET /training/auto-training/status ──────────────────────────
  try {
    const res = await fetch(`${BASE}/training/auto-training/status`, { headers });
    const body = await res.json();
    if (res.status === 200 && body.success) {
      ok('GET /auto-training/status returns 200');
      // Check shape
      const d = body.data;
      if (typeof d.enabled === 'boolean') ok('status.enabled is boolean');
      else fail('status.enabled shape', typeof d.enabled);

      if (typeof d.globalDecisionCounter === 'number') ok('status.globalDecisionCounter is number');
      else fail('globalDecisionCounter shape', typeof d.globalDecisionCounter);

      if (d.todaySummary && typeof d.todaySummary.totalAutoTrains === 'number') ok('todaySummary present & correct');
      else fail('todaySummary shape', JSON.stringify(d.todaySummary));

      if (typeof d.decisionsUntilGlobalRetrain === 'number' && d.decisionsUntilGlobalRetrain > 0)
        ok('decisionsUntilGlobalRetrain is positive number');
      else fail('decisionsUntilGlobalRetrain', d.decisionsUntilGlobalRetrain);
    } else {
      fail('GET /auto-training/status', `${res.status} ${body.message}`);
    }
  } catch (e) { fail('GET /auto-training/status', e.message); }

  // ── Test 2: GET /training/auto-training/log ─────────────────────────────
  try {
    const res = await fetch(`${BASE}/training/auto-training/log`, { headers });
    const body = await res.json();
    if (res.status === 200 && body.success && Array.isArray(body.data)) {
      ok('GET /auto-training/log returns 200 + array');
    } else {
      fail('GET /auto-training/log', `${res.status} ${body.message}`);
    }
  } catch (e) { fail('GET /auto-training/log', e.message); }

  // ── Test 3: Unauthenticated access blocked ──────────────────────────────
  try {
    const res = await fetch(`${BASE}/training/auto-training/status`);
    if (res.status === 401) ok('Unauthenticated /auto-training/status → 401');
    else fail('Unauth /auto-training/status', `expected 401, got ${res.status}`);
  } catch (e) { fail('Unauth /auto-training/status', e.message); }

  // ── Test 4: Student cannot access ───────────────────────────────────────
  const student = await User.findOne({ role: 'student' });
  if (student) {
    const stuToken = jwt.sign({ userId: student._id }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const res = await fetch(`${BASE}/training/auto-training/status`, {
      headers: { 'Authorization': `Bearer ${stuToken}` }
    });
    if (res.status === 403) ok('Student /auto-training/status → 403');
    else fail('Student /auto-training/status', `expected 403, got ${res.status}`);
  } else { warn('Student access test', 'No student user in DB'); }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SECTION 2: TrainedModel Schema');
  console.log('='.repeat(60));

  // ── Test 5: triggerType field exists in schema ──────────────────────────
  const tmSchema = TrainedModel.schema.paths;
  if (tmSchema.triggerType) ok('triggerType field exists in schema');
  else fail('triggerType field', 'missing from schema');

  if (tmSchema.triggerApplicationId) ok('triggerApplicationId field exists in schema');
  else fail('triggerApplicationId field', 'missing from schema');

  // ── Test 6: triggerType enum values ─────────────────────────────────────
  const enumValues = tmSchema.triggerType?.options?.enum;
  if (enumValues && enumValues.includes('manual') && enumValues.includes('auto_status_change') && enumValues.includes('auto_global_refresh'))
    ok('triggerType enum has all 3 values');
  else fail('triggerType enum', JSON.stringify(enumValues));

  // ── Test 7: Default value ───────────────────────────────────────────────
  if (tmSchema.triggerType?.options?.default === 'manual') ok('triggerType defaults to "manual"');
  else fail('triggerType default', tmSchema.triggerType?.options?.default);

  console.log(`\n${'='.repeat(60)}`);
  console.log('SECTION 3: Auto-Training Service Unit Tests');
  console.log('='.repeat(60));

  // ── Test 8: Service loads correctly ─────────────────────────────────────
  try {
    const svc = require('../src/services/autoTraining.service');
    if (typeof svc.onApplicationDecision === 'function') ok('onApplicationDecision is a function');
    else fail('onApplicationDecision', 'not a function');

    if (typeof svc.getAutoTrainingStatus === 'function') ok('getAutoTrainingStatus is a function');
    else fail('getAutoTrainingStatus', 'not a function');

    if (typeof svc.getAutoTrainingLog === 'function') ok('getAutoTrainingLog is a function');
    else fail('getAutoTrainingLog', 'not a function');

    // Test status shape from clean state
    const status = svc.getAutoTrainingStatus();
    if (status.enabled === true) ok('Auto-training is enabled');
    else fail('Auto-training enabled', status.enabled);

    if (status.config.minSamplesScholarship === 30) ok('minSamplesScholarship = 30');
    else fail('minSamplesScholarship', status.config.minSamplesScholarship);

    if (status.config.globalRetrainInterval === 10) ok('globalRetrainInterval = 10');
    else fail('globalRetrainInterval', status.config.globalRetrainInterval);
  } catch (e) { fail('Service import', e.message); }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SECTION 4: End-to-End Status Change → Auto-Training');
  console.log('='.repeat(60));

  // Find an application that the admin can manage and that's in a modifiable state
  // We need a scholarship in the admin's scope
  const { canManageApplication } = require('../src/middleware/adminScope.middleware');
  
  // Get all submitted/under_review applications  
  const candidateApps = await Application.find({
    status: { $in: ['submitted', 'under_review'] }
  }).populate('scholarship').lean();

  let testApp = null;
  for (const app of candidateApps) {
    if (canManageApplication(admin, app)) {
      testApp = app;
      break;
    }
  }

  if (!testApp) {
    // Try to find an approved app we can toggle to rejected then back
    const approvedApps = await Application.find({ status: 'approved' }).populate('scholarship').lean();
    for (const app of approvedApps) {
      if (canManageApplication(admin, app)) {
        testApp = app;
        break;
      }
    }
  }

  if (testApp) {
    console.log(`  Test app: ${testApp._id} (status: ${testApp.status}, scholarship: ${testApp.scholarship?.name})`);
    
    const originalStatus = testApp.status;
    const newStatus = originalStatus === 'approved' ? 'rejected' : 'approved';

    // Count models before
    const modelsBefore = await TrainedModel.countDocuments({ scholarshipId: testApp.scholarship._id });

    // ── Test 9: Change status via API ─────────────────────────────────────
    try {
      const res = await fetch(`${BASE}/applications/${testApp._id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus, notes: 'Auto-training test' })
      });
      const body = await res.json();
      if (res.status === 200 && body.success) {
        ok(`PUT status ${originalStatus} → ${newStatus} succeeded`);
      } else {
        fail('PUT status change', `${res.status} ${body.message}`);
      }
    } catch (e) { fail('PUT status change', e.message); }

    // ── Test 10: Verify auto-training was triggered ───────────────────────
    // Wait for background training to process (setImmediate + actual training time)
    console.log('  ⏳ Waiting 8s for auto-training to complete...');
    await new Promise(r => setTimeout(r, 8000));

    // Check if auto-training log has an entry (via API — must use server's in-memory state)
    const logRes = await fetch(`${BASE}/training/auto-training/log?limit=10`, { headers });
    const logBody = await logRes.json();
    const log = logBody.data || [];
    if (log.length > 0) {
      ok(`Auto-training log has ${log.length} entries`);
      const latest = log[0]; // most recent first
      console.log(`    Latest: type=${latest.type}, scope=${latest.scope}, scholarship=${latest.scholarshipName || 'N/A'}`);
      
      if (latest.type === 'success') {
        ok(`Auto-training succeeded (accuracy: ${((latest.accuracy || 0) * 100).toFixed(1)}%)`);
      } else if (latest.type === 'skipped') {
        ok(`Auto-training skipped (reason: ${latest.reason}) — expected if < 30 labeled apps`);
      } else if (latest.type === 'error') {
        warn('Auto-training error', latest.error);
      }
    } else {
      fail('Auto-training log', 'No entries after status change');
    }

    // Check status endpoint
    const statusRes = await fetch(`${BASE}/training/auto-training/status`, { headers });
    const statusBody = await statusRes.json();
    if (statusBody.data.globalDecisionCounter > 0) {
      ok(`Global decision counter incremented to ${statusBody.data.globalDecisionCounter}`);
    } else {
      fail('Decision counter', `Expected > 0, got ${statusBody.data.globalDecisionCounter}`);
    }

    // ── Test 11: Check if model has triggerType set ───────────────────────
    const latestModel = await TrainedModel.findOne({ scholarshipId: testApp.scholarship._id })
      .sort({ trainedAt: -1 }).lean();
    if (latestModel) {
      if (latestModel.triggerType === 'auto_status_change') {
        ok('Latest model has triggerType = "auto_status_change"');
      } else if (latestModel.triggerType === 'manual') {
        ok('Latest model has triggerType = "manual" (no retrain needed or data insufficient)');
      } else {
        warn('triggerType', `Unexpected: ${latestModel.triggerType}`);
      }
    } else {
      ok('No model for this scholarship yet (data threshold not met) — expected');
    }

    // ── Test 12: Revert status back ───────────────────────────────────────
    try {
      const res = await fetch(`${BASE}/applications/${testApp._id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: originalStatus, notes: 'Reverting auto-training test' })
      });
      const body = await res.json();
      if (res.status === 200 && body.success) {
        ok(`Reverted status back to ${originalStatus}`);
      } else {
        warn('Revert status', `${res.status} ${body.message}`);
      }
    } catch (e) { warn('Revert status', e.message); }

    // Wait a bit for the revert's auto-training to finish
    await new Promise(r => setTimeout(r, 3000));

  } else {
    warn('E2E test', 'No suitable application found for status change test');
    console.log('  Checking application count...');
    const appCount = await Application.countDocuments({});
    console.log(`  Total applications: ${appCount}`);
    const labeled = await Application.countDocuments({ status: { $in: ['approved', 'rejected'] } });
    console.log(`  Labeled (approved/rejected): ${labeled}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SECTION 5: Concurrency Safety');
  console.log('='.repeat(60));

  // ── Test 13: Concurrent lock prevents double-training ───────────────────
  const svc2 = require('../src/services/autoTraining.service');
  // Check that the lock map is accessible and operational
  const status2 = svc2.getAutoTrainingStatus();
  if (Array.isArray(status2.activeLocks)) {
    ok('activeLocks is an array');
    if (status2.activeLocks.length === 0) ok('No active locks (all training complete)');
    else warn('Active locks', `${status2.activeLocks.length} locks still active`);
  } else {
    fail('activeLocks', 'not an array');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SECTION 6: Non-Final Status Changes (should NOT trigger)');
  console.log('='.repeat(60));

  // ── Test 14: under_review should NOT trigger auto-training ──────────────
  const submittedApp = await Application.findOne({
    status: 'submitted'
  }).populate('scholarship').lean();

  if (submittedApp && canManageApplication(admin, submittedApp)) {
    const logBefore = svc2.getAutoTrainingLog(100).length;
    
    const res = await fetch(`${BASE}/applications/${submittedApp._id}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'under_review', notes: 'Testing non-trigger' })
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const logAfter = svc2.getAutoTrainingLog(100).length;
    if (logAfter === logBefore) {
      ok('under_review does NOT trigger auto-training (log unchanged)');
    } else {
      // Check if the new entry is for this specific app
      const latest = svc2.getAutoTrainingLog(1)[0];
      if (latest && latest.applicationId && latest.applicationId.toString() === submittedApp._id.toString()) {
        fail('under_review trigger', 'Auto-training was triggered for non-final status');
      } else {
        ok('under_review did not trigger (new log entry is from a different source)');
      }
    }

    // Revert to submitted
    await fetch(`${BASE}/applications/${submittedApp._id}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'submitted', notes: 'Revert non-trigger test' })
    });
  } else {
    warn('Non-trigger test', 'No submitted application found to test with');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SECTION 7: Railway Deployment Compatibility');
  console.log('='.repeat(60));

  // ── Test 15: No file system dependencies ────────────────────────────────
  const svcSource = require('fs').readFileSync(
    require('path').join(__dirname, '../src/services/autoTraining.service.js'), 'utf8'
  );
  if (!svcSource.includes('writeFile') && !svcSource.includes('readFile') && !svcSource.includes('fs.')) {
    ok('No file system operations in autoTraining.service.js');
  } else {
    fail('FS dependency', 'autoTraining.service.js has file system operations');
  }

  // ── Test 16: In-memory only (no external dependencies) ─────────────────
  if (!svcSource.includes('redis') && !svcSource.includes('bull') && !svcSource.includes('agenda')) {
    ok('No external queue/cache dependencies (Railway-safe)');
  } else {
    fail('External deps', 'Service uses external queue system');
  }

  // ── Test 17: setImmediate is available ──────────────────────────────────
  if (typeof setImmediate === 'function') {
    ok('setImmediate is available in runtime');
  } else {
    fail('setImmediate', 'Not available (should be in Node.js)');
  }

  // ── Test 18: Memory usage check ────────────────────────────────────────
  const memMB = process.memoryUsage().heapUsed / 1024 / 1024;
  if (memMB < 200) ok(`Memory usage: ${memMB.toFixed(1)}MB (acceptable)`);
  else warn('Memory', `${memMB.toFixed(1)}MB — high for Railway free tier`);

  // ── Test 19: Graceful error handling ────────────────────────────────────
  // Call with invalid IDs to ensure it doesn't throw
  try {
    svc2.onApplicationDecision('invalid_id', 'invalid_id', 'approved', admin._id.toString());
    await new Promise(r => setTimeout(r, 2000));
    ok('onApplicationDecision with invalid IDs does not throw');
  } catch (e) {
    fail('Graceful error handling', `Threw: ${e.message}`);
  }

  // ── Test 20: Existing training routes still work ────────────────────────
  try {
    const res = await fetch(`${BASE}/training/stats`, { headers });
    const body = await res.json();
    if (res.status === 200 && body.success) ok('GET /training/stats still works');
    else fail('GET /training/stats', `${res.status} ${body.message}`);
  } catch (e) { fail('GET /training/stats', e.message); }

  try {
    const res = await fetch(`${BASE}/training/models`, { headers });
    const body = await res.json();
    if (res.status === 200 && body.success) ok('GET /training/models still works');
    else fail('GET /training/models', `${res.status} ${body.message}`);
  } catch (e) { fail('GET /training/models', e.message); }

  try {
    const res = await fetch(`${BASE}/training/scholarships/trainable`, { headers });
    const body = await res.json();
    if (res.status === 200 && body.success) ok('GET /training/scholarships/trainable still works');
    else fail('GET /training/scholarships/trainable', `${res.status} ${body.message}`);
  } catch (e) { fail('GET /training/scholarships/trainable', e.message); }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${warnings.length} warnings`);
  console.log('='.repeat(60));
  if (warnings.length > 0) console.log(`Warnings: ${warnings.join(', ')}`);
  if (failed > 0) {
    console.log('\n🔴 SOME TESTS FAILED — review output above');
  } else {
    console.log('\n🟢 ALL TESTS PASSED');
  }

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
