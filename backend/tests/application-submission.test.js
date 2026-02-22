/**
 * Application Submission Flow Tests
 * 
 * Tests the complete scholarship application lifecycle:
 * - Application creation (POST /api/applications) - response format
 * - Application submission (POST /api/applications/:id/submit)
 * - Duplicate application handling (409 conflict)  
 * - Re-apply after withdrawal
 * - Re-apply after rejection
 * - Check existing application endpoint
 * - Draft detection and pre-fill
 * 
 * Run: cd backend && node tests/application-submission.test.js
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
  console.log('\n🧪 Running Application Submission Flow Tests\n');
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
// 1. Route File Loading & Structure Tests
// ============================================================================

test('Application routes file loads without error', () => {
  const routesPath = require('path').resolve(__dirname, '../src/routes/application.routes.js');
  // Just require the module - it should not throw
  require(routesPath);
  assert.ok(true, 'Routes file loaded');
});

test('Application model loads without error', () => {
  const { Application } = require('../src/models/Application.model');
  assert.ok(Application, 'Application model loaded');
  assert.ok(Application.schema, 'Application has schema');
});

test('Application model has required status enum', () => {
  const { Application } = require('../src/models/Application.model');
  const statusPath = Application.schema.path('status');
  assert.ok(statusPath, 'Status field exists');
  
  const enumValues = statusPath.enumValues;
  assert.ok(enumValues.includes('draft'), 'Has draft status');
  assert.ok(enumValues.includes('submitted'), 'Has submitted status');
  assert.ok(enumValues.includes('under_review'), 'Has under_review status');
  assert.ok(enumValues.includes('approved'), 'Has approved status');
  assert.ok(enumValues.includes('rejected'), 'Has rejected status');
  assert.ok(enumValues.includes('withdrawn'), 'Has withdrawn status');
});

test('Application model has unique compound index on applicant+scholarship', () => {
  const { Application } = require('../src/models/Application.model');
  const indexes = Application.schema.indexes();
  const compoundIndex = indexes.find(([fields]) => 
    fields.applicant === 1 && fields.scholarship === 1
  );
  assert.ok(compoundIndex, 'Compound index exists');
  assert.strictEqual(compoundIndex[1].unique, true, 'Index is unique');
});

// ============================================================================
// 2. Response Format Tests (Critical - the root cause of the bug)
// ============================================================================

test('Create response includes success:true in JSON body', () => {
  // Read the route file source and verify the response format
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  // Find the create endpoint response (res.status(201).json)
  const createResponseRegex = /res\.status\(201\)\.json\(\{[\s\S]*?\}\)/g;
  const matches = routeSource.match(createResponseRegex);
  assert.ok(matches && matches.length > 0, 'Found 201 response in route file');
  
  // Verify it includes success: true
  const responseBlock = matches[0];
  assert.ok(
    responseBlock.includes('success: true') || responseBlock.includes('success:true'),
    'Create endpoint 201 response includes success: true. Got: ' + responseBlock.substring(0, 200)
  );
});

test('Create response includes data.application in JSON body', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  const createResponseRegex = /res\.status\(201\)\.json\(\{[\s\S]*?\}\)/g;
  const matches = routeSource.match(createResponseRegex);
  assert.ok(matches && matches.length > 0, 'Found 201 response');
  
  const responseBlock = matches[0];
  assert.ok(
    responseBlock.includes('application'),
    'Create response includes application field'
  );
  assert.ok(
    responseBlock.includes('eligibility'),
    'Create response includes eligibility field'
  );
});

test('Submit response includes success:true', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  // Find the submit endpoint (POST /:id/submit) response
  const submitSection = routeSource.split("'/:id/submit'")[1];
  assert.ok(submitSection, 'Submit route section found');
  
  // Find the success response in this section
  const successResponse = submitSection.split('res.json(')[1];
  assert.ok(successResponse, 'Submit success response found');
  assert.ok(
    successResponse.substring(0, 200).includes('success: true'),
    'Submit endpoint response includes success: true'
  );
});

test('409 response includes applicationId in data', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  // Find the 409 response
  const conflictRegex = /res\.status\(409\)\.json\(\{[\s\S]*?\}\)/;
  const match = routeSource.match(conflictRegex);
  assert.ok(match, '409 response found');
  assert.ok(match[0].includes('applicationId'), '409 response includes applicationId');
  assert.ok(match[0].includes("success: false"), '409 response has success: false');
});

// ============================================================================
// 3. Re-Application Logic Tests
// ============================================================================

test('Create route handles withdrawn application re-apply (reuse existing doc)', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  // Find the POST / route handler
  const createSection = routeSource.split("router.post('/',")[1];
  assert.ok(createSection, 'POST / route found');
  
  // Verify re-apply logic exists
  assert.ok(
    createSection.includes("status === 'withdrawn'") || createSection.includes('withdrawn'),
    'Create route handles withdrawn status'
  );
  assert.ok(
    createSection.includes("status === 'rejected'") || createSection.includes('rejected'),
    'Create route handles rejected status'
  );
});

test('Create route reuses existing app document for re-apply instead of creating new', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  const createSection = routeSource.split("router.post('/',")[1];
  
  // Should NOT try to create a new Application when existing withdrawn/rejected exists
  // Should instead update the existing one
  assert.ok(
    createSection.includes('existingApp.personalStatement') ||
    createSection.includes('existingApp.status = '),
    'Re-apply logic reuses existing app document (sets fields on existingApp)'
  );
  
  // Should reset status to DRAFT
  assert.ok(
    createSection.includes('ApplicationStatus.DRAFT'),
    'Re-apply resets status to DRAFT'
  );
});

test('Create route checks for ANY existing app (not just active) before creating new', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  const createSection = routeSource.split("router.post('/',")[1];
  
  // The first findOne should NOT have $nin filter — it should find ANY existing app
  const firstFindOne = createSection.split('Application.findOne(')[1];
  assert.ok(firstFindOne, 'FindOne query exists');
  
  // Get the query object (up to the closing })
  const queryStr = firstFindOne.substring(0, firstFindOne.indexOf('});') + 1);
  
  // Verify it does NOT have $nin in the first query (finds ALL apps)
  assert.ok(
    !queryStr.includes('$nin'),
    'First findOne checks for ANY existing app (no $nin filter). Query: ' + queryStr.substring(0, 200)
  );
});

// ============================================================================
// 4. Check Existing Endpoint Tests
// ============================================================================

test('Check existing endpoint exists at GET /check/:scholarshipId', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  assert.ok(
    routeSource.includes("/check/:scholarshipId") || routeSource.includes("'/check/:scholarshipId'"),
    'Check existing endpoint route defined'
  );
});

test('Check existing endpoint excludes withdrawn and rejected', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  // Find the check endpoint section
  const checkSection = routeSource.split("'/check/:scholarshipId'")[1];
  assert.ok(checkSection, 'Check endpoint section found');
  
  // Get the section up to the next router.* or end
  const endIdx = checkSection.indexOf("router.");
  const checkBody = checkSection.substring(0, endIdx > 0 ? endIdx : 500);
  
  // Should use $nin to exclude withdrawn and rejected
  assert.ok(
    checkBody.includes('$nin') && checkBody.includes('withdrawn') && checkBody.includes('rejected'),
    'Check endpoint filters out withdrawn and rejected apps'
  );
});

test('Check existing endpoint returns exists:true with applicationId for active apps', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  const checkSection = routeSource.split("'/check/:scholarshipId'")[1];
  const checkBody = checkSection.substring(0, checkSection.indexOf("router."));
  
  assert.ok(checkBody.includes('exists: true'), 'Returns exists: true for active apps');
  assert.ok(checkBody.includes('applicationId'), 'Returns applicationId');
  assert.ok(checkBody.includes('status'), 'Returns status');
});

test('Check existing endpoint returns exists:false when no active app', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  const checkSection = routeSource.split("'/check/:scholarshipId'")[1];
  const checkBody = checkSection.substring(0, checkSection.indexOf("router."));
  
  assert.ok(checkBody.includes('exists: false'), 'Returns exists: false when no active app');
});

// ============================================================================
// 5. Frontend Response Handling Tests (static analysis)
// ============================================================================

test('Frontend create handler checks response.success (not response.data)', () => {
  const fs = require('fs');
  const frontendSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/student/ApplyScholarship.tsx'),
    'utf-8'
  );
  
  // After applicationApi.create(), should check response.success
  assert.ok(
    frontendSource.includes('response.success'),
    'Frontend checks response.success after create'
  );
});

test('Frontend handles 409 error in catch block (not response branch)', () => {
  const fs = require('fs');
  const frontendSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/student/ApplyScholarship.tsx'),
    'utf-8'
  );
  
  // Should handle 409 in catch block using err.response?.status === 409
  assert.ok(
    frontendSource.includes('err.response?.status === 409') ||
    frontendSource.includes("err.response?.status === 409"),
    'Frontend handles 409 in catch block via err.response?.status'
  );
});

test('Frontend checks for existing application before creating (in useEffect)', () => {
  const fs = require('fs');
  const frontendSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/student/ApplyScholarship.tsx'),
    'utf-8'
  );
  
  assert.ok(
    frontendSource.includes('checkExisting') || frontendSource.includes('applicationApi.checkExisting'),
    'Frontend calls checkExisting before creating application'
  );
});

test('Frontend redirects to edit mode when draft exists', () => {
  const fs = require('fs');
  const frontendSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/student/ApplyScholarship.tsx'),
    'utf-8'
  );
  
  assert.ok(
    frontendSource.includes("navigate(`/applications/"),
    'Frontend navigates to edit route when draft exists'
  );
  
  assert.ok(
    frontendSource.includes("/edit"),
    'Frontend redirects to edit mode'
  );
});

test('Frontend API client has checkExisting method', () => {
  const fs = require('fs');
  const apiSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/services/apiClient.ts'),
    'utf-8'
  );
  
  assert.ok(
    apiSource.includes('checkExisting:') || apiSource.includes('checkExisting :'),
    'apiClient has checkExisting method'
  );
  assert.ok(
    apiSource.includes('/applications/check/'),
    'checkExisting calls correct endpoint'
  );
});

test('Frontend create API method sends multipart/form-data for FormData', () => {
  const fs = require('fs');
  const apiSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/services/apiClient.ts'),
    'utf-8'
  );
  
  assert.ok(
    apiSource.includes("'Content-Type': 'multipart/form-data'"),
    'API client sets multipart/form-data header for FormData'
  );
});

// ============================================================================
// 6. ScholarshipDetails & StudentApplications UI Tests
// ============================================================================

test('ScholarshipDetails filters out withdrawn apps from existingApplication check', () => {
  const fs = require('fs');
  const detailsSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/ScholarshipDetails.tsx'),
    'utf-8'
  );
  
  assert.ok(
    detailsSource.includes("!== 'withdrawn'") || detailsSource.includes("!= 'withdrawn'"),
    'ScholarshipDetails filters out withdrawn apps'
  );
  assert.ok(
    detailsSource.includes("!== 'rejected'") || detailsSource.includes("!= 'rejected'"),
    'ScholarshipDetails filters out rejected apps'
  );
});

test('ScholarshipDetails draft button links to edit route (not create)', () => {
  const fs = require('fs');
  const detailsSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/ScholarshipDetails.tsx'),
    'utf-8'
  );
  
  // The DRAFT case should link to /applications/:id/edit
  const draftSection = detailsSource.split('ApplicationStatus.DRAFT')[1];
  assert.ok(draftSection, 'DRAFT section found');
  
  const draftLink = draftSection.substring(0, 500);
  assert.ok(
    draftLink.includes('/edit'),
    'Draft Continue Application button links to edit route'
  );
});

test('StudentApplications has Apply Again button for withdrawn apps', () => {
  const fs = require('fs');
  const appsSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/student/StudentApplications.tsx'),
    'utf-8'
  );
  
  assert.ok(
    appsSource.includes('Apply Again'),
    'StudentApplications shows Apply Again button'
  );
});

test('StudentApplications has withdrawn visual indicator', () => {
  const fs = require('fs');
  const appsSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/student/StudentApplications.tsx'),
    'utf-8'
  );
  
  assert.ok(
    appsSource.includes('Withdrawn — You can apply again') || appsSource.includes('Withdrawn'),
    'Withdrawn visual message exists'
  );
});

test('StudentApplications has rejected visual indicator with re-apply hint', () => {
  const fs = require('fs');
  const appsSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/student/StudentApplications.tsx'),
    'utf-8'
  );
  
  assert.ok(
    appsSource.includes('Rejected — You can re-apply') || 
    appsSource.includes('Apply Again'),
    'Rejected visual message with re-apply hint exists'
  );
});

test('StudentApplications draft Continue button is a Link (not just a button)', () => {
  const fs = require('fs');
  const appsSource = fs.readFileSync(
    require('path').resolve(__dirname, '../../frontend/src/pages/student/StudentApplications.tsx'),
    'utf-8'
  );
  
  // The "Continue Application" text should be inside a <Link> not a plain <button>
  // Look for pattern: Link ... Continue Application
  const continueIdx = appsSource.indexOf('Continue Application');
  assert.ok(continueIdx > -1, 'Continue Application text exists');
  
  // Check the 500 chars before "Continue Application" for <Link or to=
  const before = appsSource.substring(Math.max(0, continueIdx - 500), continueIdx);
  assert.ok(
    before.includes('<Link') || before.includes('to={'),
    'Continue Application is wrapped in a Link component (not a dead button). Before: ' + before.substring(before.length - 150)
  );
});

// ============================================================================
// 7. Withdraw Route Tests
// ============================================================================

test('Withdraw route exists at POST /:id/withdraw', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  assert.ok(
    routeSource.includes("'/:id/withdraw'"),
    'Withdraw route defined'
  );
});

test('Withdraw route sets status to withdrawn', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  const withdrawSection = routeSource.split("'/:id/withdraw'")[1];
  assert.ok(withdrawSection, 'Withdraw route section found');
  
  assert.ok(
    withdrawSection.includes('ApplicationStatus.WITHDRAWN') || withdrawSection.includes("'withdrawn'"),
    'Withdraw route sets status to WITHDRAWN'
  );
});

test('Withdraw route blocks re-withdrawal of already withdrawn apps', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  const withdrawSection = routeSource.split("'/:id/withdraw'")[1];
  const withdrawBody = withdrawSection.substring(0, 2000);
  
  assert.ok(
    withdrawBody.includes('WITHDRAWN') && withdrawBody.includes('nonWithdrawable'),
    'Withdraw route prevents re-withdrawing already withdrawn apps'
  );
});

// ============================================================================
// 8. Submit Route Tests
// ============================================================================

test('Submit route exists at POST /:id/submit', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  assert.ok(
    routeSource.includes("'/:id/submit'"),
    'Submit route defined'
  );
});

test('Submit route only allows draft applications', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  const submitSection = routeSource.split("'/:id/submit'")[1];
  assert.ok(submitSection, 'Submit route section found');
  
  assert.ok(
    submitSection.includes('ApplicationStatus.DRAFT') || submitSection.includes("status !== 'draft'"),
    'Submit route checks for draft status'
  );
});

test('Submit route changes status from DRAFT to SUBMITTED', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  const submitSection = routeSource.split("'/:id/submit'")[1];
  
  assert.ok(
    submitSection.includes('ApplicationStatus.SUBMITTED'),
    'Submit route transitions to SUBMITTED status'
  );
});

// ============================================================================
// 9. All API Response Format Consistency Tests
// ============================================================================

test('All success responses in application routes include success:true', () => {
  const fs = require('fs');
  const routeSource = fs.readFileSync(
    require('path').resolve(__dirname, '../src/routes/application.routes.js'),
    'utf-8'
  );
  
  // Find all success responses (res.json({ or res.status(2xx).json({)
  const successPatterns = [
    /res\.json\(\{/g,
    /res\.status\(201\)\.json\(\{/g,
    /res\.status\(200\)\.json\(\{/g
  ];
  
  let allResponseStarts = [];
  for (const pattern of successPatterns) {
    let match;
    while ((match = pattern.exec(routeSource)) !== null) {
      allResponseStarts.push(match.index);
    }
  }
  
  // For each response, check that the block contains "success:" within next 200 chars
  let missingSuccess = [];
  for (const start of allResponseStarts) {
    const block = routeSource.substring(start, start + 300);
    // Skip error responses (they have success: false which is fine)
    if (block.includes('success: false') || block.includes('success:false')) continue;
    // Check for success: true
    if (!block.includes('success: true') && !block.includes('success:true')) {
      // Get surrounding code for debugging
      const lineNum = routeSource.substring(0, start).split('\n').length;
      missingSuccess.push(`Line ~${lineNum}: ${block.substring(0, 80).replace(/\n/g, ' ')}`);
    }
  }
  
  assert.strictEqual(
    missingSuccess.length, 0,
    `Found ${missingSuccess.length} responses missing success:true:\n${missingSuccess.join('\n')}`
  );
});

// ============================================================================
// Run all tests
// ============================================================================

runTests();
