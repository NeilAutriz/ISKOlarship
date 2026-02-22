/**
 * Activity Log System Tests
 * 
 * Comprehensive tests for the ActivityLog model, service, and routes.
 * Tests model schema validation, service convenience methods, and route logic.
 * 
 * Run: cd backend && node tests/activity-log.test.js
 */

const assert = require('assert');

// ============================================================================
// Test Harness
// ============================================================================

let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧪 Running Activity Log System Tests\n');
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

// ============================================================================
// 1. Model Loading & Schema Tests
// ============================================================================

test('ActivityLog model loads without errors', () => {
  const { ActivityLog } = require('../src/models/ActivityLog.model');
  assert.ok(ActivityLog, 'ActivityLog model should exist');
  assert.strictEqual(typeof ActivityLog, 'function', 'Should be a Mongoose model constructor');
});

test('ActivityAction enum loads with all 23 actions', () => {
  const { ActivityAction } = require('../src/models/ActivityLog.model');
  assert.ok(ActivityAction, 'ActivityAction should exist');
  assert.strictEqual(typeof ActivityAction, 'object', 'Should be an object');

  const expectedActions = [
    'LOGIN', 'LOGOUT', 'REGISTER', 'PASSWORD_RESET',
    'PROFILE_UPDATE', 'DOCUMENT_UPLOAD', 'DOCUMENT_DELETE',
    'APPLICATION_CREATE', 'APPLICATION_SUBMIT', 'APPLICATION_WITHDRAW',
    'APPLICATION_APPROVE', 'APPLICATION_REJECT', 'APPLICATION_REVIEW',
    'DOCUMENT_VERIFY', 'DOCUMENT_REJECT', 'DOCUMENT_RESUBMIT', 'DOCUMENT_VERIFY_ALL',
    'SCHOLARSHIP_CREATE', 'SCHOLARSHIP_UPDATE', 'SCHOLARSHIP_DELETE',
    'MODEL_TRAIN', 'MODEL_TRAIN_ALL',
    'NOTIFICATION_PREFERENCES_UPDATE',
  ];

  for (const key of expectedActions) {
    assert.ok(ActivityAction[key] !== undefined, `ActivityAction should have ${key}`);
    assert.strictEqual(typeof ActivityAction[key], 'string', `${key} should be a string value`);
  }

  assert.strictEqual(Object.keys(ActivityAction).length, expectedActions.length,
    `Should have exactly ${expectedActions.length} actions`);
});

test('ActivityAction values are lowercase snake_case', () => {
  const { ActivityAction } = require('../src/models/ActivityLog.model');
  for (const [key, value] of Object.entries(ActivityAction)) {
    assert.ok(/^[a-z_]+$/.test(value), `${key} value "${value}" should be lowercase snake_case`);
  }
});

test('ActivityLog model exported from models/index.js', () => {
  const models = require('../src/models');
  assert.ok(models.ActivityLog, 'ActivityLog should be in models index');
  assert.ok(models.ActivityAction, 'ActivityAction should be in models index');
});

test('ActivityLog schema has required fields', () => {
  const { ActivityLog } = require('../src/models/ActivityLog.model');
  const schema = ActivityLog.schema;
  assert.ok(schema, 'Schema should exist');

  const paths = schema.paths;
  const requiredPaths = ['user', 'userRole', 'action', 'description'];
  for (const p of requiredPaths) {
    assert.ok(paths[p], `Schema should have path: ${p}`);
    assert.ok(paths[p].isRequired, `Field ${p} should be required`);
  }
});

test('ActivityLog schema has optional tracking fields', () => {
  const { ActivityLog } = require('../src/models/ActivityLog.model');
  const paths = ActivityLog.schema.paths;
  const optionalPaths = ['userName', 'userEmail', 'targetType', 'targetId', 'targetName', 'metadata', 'ipAddress', 'status'];
  for (const p of optionalPaths) {
    assert.ok(paths[p], `Schema should have optional path: ${p}`);
  }
});

test('ActivityLog schema has userRole enum (student, admin)', () => {
  const { ActivityLog } = require('../src/models/ActivityLog.model');
  const userRolePath = ActivityLog.schema.paths.userRole;
  assert.ok(userRolePath, 'userRole path should exist');
  const enums = userRolePath.enumValues;
  assert.ok(enums.includes('student'), 'userRole should allow student');
  assert.ok(enums.includes('admin'), 'userRole should allow admin');
});

test('ActivityLog schema has status enum (success, failure) defaulting to success', () => {
  const { ActivityLog } = require('../src/models/ActivityLog.model');
  const statusPath = ActivityLog.schema.paths.status;
  assert.ok(statusPath, 'status path should exist');
  const enums = statusPath.enumValues;
  assert.ok(enums.includes('success'), 'status should allow success');
  assert.ok(enums.includes('failure'), 'status should allow failure');
  assert.strictEqual(statusPath.defaultValue, 'success', 'Default should be success');
});

test('ActivityLog schema has targetType enum with null allowed', () => {
  const { ActivityLog } = require('../src/models/ActivityLog.model');
  const targetTypePath = ActivityLog.schema.paths.targetType;
  assert.ok(targetTypePath, 'targetType path should exist');
  const enums = targetTypePath.enumValues;
  const expected = ['application', 'scholarship', 'document', 'user', 'model', 'system', null];
  for (const e of expected) {
    assert.ok(enums.includes(e), `targetType should allow: ${e}`);
  }
});

test('ActivityLog schema has indexes', () => {
  const { ActivityLog } = require('../src/models/ActivityLog.model');
  const indexes = ActivityLog.schema.indexes();
  assert.ok(indexes.length >= 4, `Should have at least 4 compound indexes, got ${indexes.length}`);
});

test('ActivityLog schema has timestamps', () => {
  const { ActivityLog } = require('../src/models/ActivityLog.model');
  const paths = ActivityLog.schema.paths;
  assert.ok(paths.createdAt, 'Should have createdAt timestamp');
  assert.ok(paths.updatedAt, 'Should have updatedAt timestamp');
});

// ============================================================================
// 2. Service Loading & Method Tests
// ============================================================================

test('activityLog.service loads without errors', () => {
  const service = require('../src/services/activityLog.service');
  assert.ok(service, 'Service should load');
});

test('activityLog.service exports logActivity core function', () => {
  const { logActivity } = require('../src/services/activityLog.service');
  assert.strictEqual(typeof logActivity, 'function', 'logActivity should be a function');
});

test('activityLog.service exports all 16 convenience methods', () => {
  const service = require('../src/services/activityLog.service');
  const expectedMethods = [
    'logLogin', 'logRegister',
    'logProfileUpdate', 'logDocumentUpload', 'logDocumentDelete',
    'logApplicationCreate', 'logApplicationSubmit', 'logApplicationWithdraw',
    'logApplicationStatusChange',
    'logDocumentVerification', 'logDocumentVerifyAll',
    'logScholarshipCreate', 'logScholarshipUpdate', 'logScholarshipDelete',
    'logModelTrain', 'logModelTrainAll',
  ];

  for (const method of expectedMethods) {
    assert.strictEqual(typeof service[method], 'function', `${method} should be a function`);
  }
});

test('logActivity never throws even with invalid input', async () => {
  const { logActivity } = require('../src/services/activityLog.service');
  // None of these should throw — fire-and-forget
  await logActivity(null);
  await logActivity(undefined);
  await logActivity({});
  await logActivity({ userId: 'invalid' });
  // If we get here without exception, the test passes
  assert.ok(true, 'logActivity should silently handle errors');
});

test('logLogin accepts user object and ip', async () => {
  const { logLogin } = require('../src/services/activityLog.service');
  // Should not throw
  await logLogin({ _id: 'test', role: 'student', email: 'test@up.edu.ph' }, '127.0.0.1');
  assert.ok(true, 'logLogin should accept user + ip');
});

test('logRegister accepts user object and ip', async () => {
  const { logRegister } = require('../src/services/activityLog.service');
  await logRegister({ _id: 'test', role: 'student', email: 'test@up.edu.ph' }, '127.0.0.1');
  assert.ok(true, 'logRegister should accept user + ip');
});

test('logApplicationCreate accepts user, application, and ip', async () => {
  const { logApplicationCreate } = require('../src/services/activityLog.service');
  const mockUser = { _id: 'u1', role: 'student', email: 'test@up.edu.ph' };
  const mockApp = { _id: 'a1', scholarship: 's1' };
  await logApplicationCreate(mockUser, mockApp, 'Test Scholarship', '127.0.0.1');
  assert.ok(true);
});

test('logApplicationStatusChange accepts admin, application, status, and ip', async () => {
  const { logApplicationStatusChange } = require('../src/services/activityLog.service');
  const mockAdmin = { _id: 'admin1', role: 'admin', email: 'admin@up.edu.ph' };
  const mockApp = { _id: 'a1', scholarship: 's1' };
  await logApplicationStatusChange(mockAdmin, mockApp, 'approved', 'Test Scholar', '127.0.0.1');
  assert.ok(true);
});

test('logScholarshipCreate accepts admin, scholarship, and ip', async () => {
  const { logScholarshipCreate } = require('../src/services/activityLog.service');
  const mockAdmin = { _id: 'admin1', role: 'admin', email: 'admin@up.edu.ph' };
  const mockScholar = { _id: 's1', title: 'DOST Scholarship' };
  await logScholarshipCreate(mockAdmin, mockScholar, '127.0.0.1');
  assert.ok(true);
});

test('logDocumentVerification accepts admin, student, docType, verifyAction, and ip', async () => {
  const { logDocumentVerification } = require('../src/services/activityLog.service');
  const mockAdmin = { _id: 'admin1', role: 'admin', email: 'admin@up.edu.ph' };
  const mockStudent = { _id: 'student1', email: 'student@up.edu.ph' };
  await logDocumentVerification(mockAdmin, mockStudent, 'grades', 'verify', '127.0.0.1');
  assert.ok(true);
});

test('logModelTrain accepts admin, scholarship name, result, and ip', async () => {
  const { logModelTrain } = require('../src/services/activityLog.service');
  const mockAdmin = { _id: 'admin1', role: 'admin', email: 'admin@up.edu.ph' };
  await logModelTrain(mockAdmin, 'DOST Scholarship', { accuracy: 0.85 }, '127.0.0.1');
  assert.ok(true);
});

test('logModelTrainAll accepts admin, success/failed counts, and ip', async () => {
  const { logModelTrainAll } = require('../src/services/activityLog.service');
  const mockAdmin = { _id: 'admin1', role: 'admin', email: 'admin@up.edu.ph' };
  await logModelTrainAll(mockAdmin, 5, 1, '127.0.0.1');
  assert.ok(true);
});

test('logProfileUpdate accepts user and updated fields', async () => {
  const { logProfileUpdate } = require('../src/services/activityLog.service');
  const mockUser = { _id: 'u1', role: 'student', email: 'test@up.edu.ph' };
  await logProfileUpdate(mockUser, ['firstName', 'lastName'], '127.0.0.1');
  assert.ok(true);
});

test('logDocumentUpload accepts user, doc type, and ip', async () => {
  const { logDocumentUpload } = require('../src/services/activityLog.service');
  const mockUser = { _id: 'u1', role: 'student', email: 'test@up.edu.ph' };
  await logDocumentUpload(mockUser, 'grades', '127.0.0.1');
  assert.ok(true);
});

test('logDocumentDelete accepts user, doc type, and ip', async () => {
  const { logDocumentDelete } = require('../src/services/activityLog.service');
  const mockUser = { _id: 'u1', role: 'student', email: 'test@up.edu.ph' };
  await logDocumentDelete(mockUser, 'grades', '127.0.0.1');
  assert.ok(true);
});

// ============================================================================
// 3. Route File Loading Tests
// ============================================================================

test('activityLog.routes.js loads without errors', () => {
  const router = require('../src/routes/activityLog.routes');
  assert.ok(router, 'Router should load');
});

test('activityLog.routes.js exports an Express router', () => {
  const router = require('../src/routes/activityLog.routes');
  assert.ok(router.stack || router.route || typeof router === 'function',
    'Should be an Express router');
});

test('activityLog.routes.js has 3 route handlers', () => {
  const router = require('../src/routes/activityLog.routes');
  // Express routers have a stack of route layers
  const routeLayers = router.stack.filter(l => l.route);
  assert.strictEqual(routeLayers.length, 3, `Should have 3 routes, got ${routeLayers.length}`);
});

test('Routes include GET /my endpoint', () => {
  const router = require('../src/routes/activityLog.routes');
  const paths = router.stack.filter(l => l.route).map(l => l.route.path);
  assert.ok(paths.includes('/my'), 'Should have /my route');
});

test('Routes include GET /all endpoint', () => {
  const router = require('../src/routes/activityLog.routes');
  const paths = router.stack.filter(l => l.route).map(l => l.route.path);
  assert.ok(paths.includes('/all'), 'Should have /all route');
});

test('Routes include GET /stats endpoint', () => {
  const router = require('../src/routes/activityLog.routes');
  const paths = router.stack.filter(l => l.route).map(l => l.route.path);
  assert.ok(paths.includes('/stats'), 'Should have /stats route');
});

test('All routes use GET method', () => {
  const router = require('../src/routes/activityLog.routes');
  const routeLayers = router.stack.filter(l => l.route);
  for (const layer of routeLayers) {
    assert.ok(layer.route.methods.get, `Route ${layer.route.path} should use GET method`);
  }
});

// ============================================================================
// 4. Server Registration Tests
// ============================================================================

test('server.js imports activityLog routes', () => {
  const fs = require('fs');
  const path = require('path');
  const serverSource = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf-8');
  assert.ok(
    serverSource.includes("require('./routes/activityLog.routes')"),
    'server.js should import activityLog.routes'
  );
});

test('server.js registers /api/activity-logs route', () => {
  const fs = require('fs');
  const path = require('path');
  const serverSource = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf-8');
  assert.ok(
    serverSource.includes("'/api/activity-logs'"),
    'server.js should register /api/activity-logs path'
  );
});

// ============================================================================
// 5. Integration Point Tests — verify logging calls exist in route files
// ============================================================================

test('auth.routes.js has logLogin integration', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/auth.routes.js'), 'utf-8');
  assert.ok(src.includes('logLogin'), 'auth.routes should call logLogin');
  assert.ok(src.includes('logRegister'), 'auth.routes should call logRegister');
  assert.ok(src.includes("require('../services/activityLog.service')"), 'Should import service');
});

test('application.routes.js has activity logging integration', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/application.routes.js'), 'utf-8');
  assert.ok(src.includes('logApplicationCreate'), 'Should call logApplicationCreate');
  assert.ok(src.includes('logApplicationSubmit'), 'Should call logApplicationSubmit');
  assert.ok(src.includes('logApplicationWithdraw'), 'Should call logApplicationWithdraw');
  assert.ok(src.includes('logApplicationStatusChange'), 'Should call logApplicationStatusChange');
});

test('scholarship.routes.js has activity logging integration', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/scholarship.routes.js'), 'utf-8');
  assert.ok(src.includes('logScholarshipCreate'), 'Should call logScholarshipCreate');
  assert.ok(src.includes('logScholarshipUpdate'), 'Should call logScholarshipUpdate');
  assert.ok(src.includes('logScholarshipDelete'), 'Should call logScholarshipDelete');
});

test('training.routes.js has activity logging integration', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/training.routes.js'), 'utf-8');
  assert.ok(src.includes('logModelTrain'), 'Should call logModelTrain');
  assert.ok(src.includes('logModelTrainAll'), 'Should call logModelTrainAll');
});

test('user.routes.js has activity logging integration', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/user.routes.js'), 'utf-8');
  assert.ok(src.includes('logProfileUpdate'), 'Should call logProfileUpdate');
  assert.ok(src.includes('logDocumentUpload'), 'Should call logDocumentUpload');
  assert.ok(src.includes('logDocumentDelete'), 'Should call logDocumentDelete');
});

test('verification.routes.js has activity logging integration', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/verification.routes.js'), 'utf-8');
  assert.ok(src.includes('logDocumentVerification'), 'Should call logDocumentVerification');
  assert.ok(src.includes('logDocumentVerifyAll'), 'Should call logDocumentVerifyAll');
});

// ============================================================================
// 6. Model Index Registration Tests
// ============================================================================

test('models/index.js exports ActivityLog', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../src/models/index.js'), 'utf-8');
  assert.ok(src.includes('ActivityLog'), 'Should export ActivityLog');
  assert.ok(src.includes('ActivityAction'), 'Should export ActivityAction');
});

// ============================================================================
// 7. Action Mapping Completeness Tests
// ============================================================================

test('All ActivityAction values match action enum in schema', () => {
  const { ActivityLog, ActivityAction } = require('../src/models/ActivityLog.model');
  const schemaEnum = ActivityLog.schema.paths.action.enumValues;
  const actionValues = Object.values(ActivityAction);

  for (const val of actionValues) {
    assert.ok(schemaEnum.includes(val), `Schema enum should include action value: ${val}`);
  }

  assert.strictEqual(schemaEnum.length, actionValues.length,
    'Schema enum and ActivityAction should have same count');
});

test('Convenience methods cover auth actions', () => {
  const service = require('../src/services/activityLog.service');
  assert.ok(service.logLogin, 'Should have logLogin for LOGIN');
  assert.ok(service.logRegister, 'Should have logRegister for REGISTER');
});

test('Convenience methods cover application lifecycle', () => {
  const service = require('../src/services/activityLog.service');
  assert.ok(service.logApplicationCreate, 'logApplicationCreate');
  assert.ok(service.logApplicationSubmit, 'logApplicationSubmit');
  assert.ok(service.logApplicationWithdraw, 'logApplicationWithdraw');
  assert.ok(service.logApplicationStatusChange, 'logApplicationStatusChange');
});

test('Convenience methods cover document management', () => {
  const service = require('../src/services/activityLog.service');
  assert.ok(service.logDocumentUpload, 'logDocumentUpload');
  assert.ok(service.logDocumentDelete, 'logDocumentDelete');
  assert.ok(service.logDocumentVerification, 'logDocumentVerification');
  assert.ok(service.logDocumentVerifyAll, 'logDocumentVerifyAll');
});

test('Convenience methods cover scholarship CRUD', () => {
  const service = require('../src/services/activityLog.service');
  assert.ok(service.logScholarshipCreate, 'logScholarshipCreate');
  assert.ok(service.logScholarshipUpdate, 'logScholarshipUpdate');
  assert.ok(service.logScholarshipDelete, 'logScholarshipDelete');
});

test('Convenience methods cover ML training', () => {
  const service = require('../src/services/activityLog.service');
  assert.ok(service.logModelTrain, 'logModelTrain');
  assert.ok(service.logModelTrainAll, 'logModelTrainAll');
});

// ============================================================================
// 8. Frontend Integration Verification Tests
// ============================================================================

test('Frontend apiClient.ts has activityLogApi', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/services/apiClient.ts'), 'utf-8'
  );
  assert.ok(src.includes('activityLogApi'), 'apiClient should export activityLogApi');
  assert.ok(src.includes('ActivityLogEntry'), 'Should have ActivityLogEntry interface');
  assert.ok(src.includes('ActivityLogPagination'), 'Should have ActivityLogPagination interface');
  assert.ok(src.includes('ActivityLogStats'), 'Should have ActivityLogStats interface');
});

test('Frontend apiClient has getMy method', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/services/apiClient.ts'), 'utf-8'
  );
  assert.ok(src.includes('getMy'), 'Should have getMy method');
  assert.ok(src.includes('/activity-logs/my'), 'Should call /activity-logs/my');
});

test('Frontend apiClient has getAll method', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/services/apiClient.ts'), 'utf-8'
  );
  assert.ok(src.includes('getAll'), 'Should have getAll method');
  assert.ok(src.includes('/activity-logs/all'), 'Should call /activity-logs/all');
});

test('Frontend apiClient has getStats method', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/services/apiClient.ts'), 'utf-8'
  );
  assert.ok(src.includes('getStats'), 'Should have getStats method');
  assert.ok(src.includes('/activity-logs/stats'), 'Should call /activity-logs/stats');
});

// ============================================================================
// 9. Frontend Component File Existence Tests
// ============================================================================

test('Student ActivityLog page exists', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../../frontend/src/pages/student/ActivityLog.tsx');
  assert.ok(fs.existsSync(filePath), 'Student ActivityLog.tsx should exist');
});

test('Admin ActivityLog page exists', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../../frontend/src/pages/admin/ActivityLog.tsx');
  assert.ok(fs.existsSync(filePath), 'Admin ActivityLog.tsx should exist');
});

test('Student ActivityLog page imports activityLogApi', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/pages/student/ActivityLog.tsx'), 'utf-8'
  );
  assert.ok(src.includes('activityLogApi'), 'Should import activityLogApi');
  assert.ok(src.includes('ActivityLogEntry'), 'Should use ActivityLogEntry type');
});

test('Admin ActivityLog page imports activityLogApi and stats', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/pages/admin/ActivityLog.tsx'), 'utf-8'
  );
  assert.ok(src.includes('activityLogApi'), 'Should import activityLogApi');
  assert.ok(src.includes('ActivityLogStats'), 'Should use ActivityLogStats type');
  assert.ok(src.includes('getStats'), 'Should call getStats');
});

test('Student barrel export includes StudentActivityLog', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/pages/student/index.ts'), 'utf-8'
  );
  assert.ok(src.includes('StudentActivityLog'), 'Should export StudentActivityLog');
  assert.ok(src.includes("'./ActivityLog'"), 'Should import from ActivityLog');
});

test('Admin barrel export includes AdminActivityLog', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/pages/admin/index.ts'), 'utf-8'
  );
  assert.ok(src.includes('AdminActivityLog'), 'Should export AdminActivityLog');
  assert.ok(src.includes("'./ActivityLog'"), 'Should import from ActivityLog');
});

// ============================================================================
// 10. App.tsx Route Registration Tests
// ============================================================================

test('App.tsx imports StudentActivityLog', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/App.tsx'), 'utf-8'
  );
  assert.ok(src.includes('StudentActivityLog'), 'Should import StudentActivityLog');
});

test('App.tsx imports AdminActivityLog', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/App.tsx'), 'utf-8'
  );
  assert.ok(src.includes('AdminActivityLog'), 'Should import AdminActivityLog');
});

test('App.tsx has /activity-log student route', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/App.tsx'), 'utf-8'
  );
  assert.ok(src.includes('"/activity-log"'), 'Should have /activity-log route');
  assert.ok(src.includes('<StudentActivityLog'), 'Should render StudentActivityLog');
});

test('App.tsx has /admin/activity-logs admin route', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/App.tsx'), 'utf-8'
  );
  assert.ok(src.includes('"/admin/activity-logs"'), 'Should have /admin/activity-logs route');
  assert.ok(src.includes('<AdminActivityLog'), 'Should render AdminActivityLog');
});

// ============================================================================
// 11. Header Navigation Tests
// ============================================================================

test('StudentHeader has Activity Log nav link', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/components/StudentHeader.tsx'), 'utf-8'
  );
  assert.ok(src.includes("'/activity-log'"), 'Should have /activity-log path');
  assert.ok(src.includes("'Activity Log'"), 'Should have Activity Log label');
  assert.ok(src.includes('Activity'), 'Should import Activity icon');
});

test('AdminHeader has Activity Logs nav link', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/components/AdminHeader.tsx'), 'utf-8'
  );
  assert.ok(src.includes("'/admin/activity-logs'"), 'Should have /admin/activity-logs path');
  assert.ok(src.includes("'Activity Logs'"), 'Should have Activity Logs label');
});

test('AdminHeader has NotificationBell component', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/components/AdminHeader.tsx'), 'utf-8'
  );
  assert.ok(src.includes('NotificationBell'), 'Should import NotificationBell');
  assert.ok(src.includes('<NotificationBell'), 'Should render NotificationBell');
});

// ============================================================================
// Run
// ============================================================================

runTests();
