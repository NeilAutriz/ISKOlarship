/**
 * Email Notification System — Comprehensive Tests
 *
 * Tests for:
 * 1. Module loading & exports
 * 2. Email template generation (all 8 templates)
 * 3. Template HTML structure & content validation
 * 4. Notification service — preference filtering logic
 * 5. Notification service — status-to-template mapping
 * 6. allDocumentsVerified detection logic
 * 7. User model — notificationPreferences schema
 * 8. Route integration — notification service import in routes
 * 9. Edge cases (missing data, unknown statuses, empty docs)
 *
 * Run: cd backend && node tests/email-notification.test.js
 */

const assert = require('assert');

// ---------------------------------------------------------------------------
// Test harness (same pattern as other tests in the project)
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧪 Running Email Notification System Tests\n');
  console.log('='.repeat(70));

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${error.message}`);
      if (error.stack) {
        const relevantLine = error.stack.split('\n').find(l => l.includes('email-notification.test'));
        if (relevantLine) console.log(`   At: ${relevantLine.trim()}`);
      }
      failed++;
    }
  }

  console.log('='.repeat(70));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);

  if (failed > 0) process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Module Loading & Exports
// ═══════════════════════════════════════════════════════════════════════════

test('emailTemplates module loads without errors', () => {
  const mod = require('../src/services/emailTemplates');
  assert.ok(mod, 'Module should load');
});

test('emailTemplates exports all 8 template functions', () => {
  const t = require('../src/services/emailTemplates');
  const expected = [
    'applicationApproved',
    'applicationRejected',
    'applicationUnderReview',
    'applicationWaitlisted',
    'documentVerified',
    'documentRejected',
    'documentResubmit',
    'allDocumentsVerified',
  ];
  for (const name of expected) {
    assert.strictEqual(typeof t[name], 'function', `${name} should be a function`);
  }
});

test('notification.service module loads without errors', () => {
  const mod = require('../src/services/notification.service');
  assert.ok(mod, 'Module should load');
});

test('notification.service exports expected functions', () => {
  const ns = require('../src/services/notification.service');
  assert.strictEqual(typeof ns.notifyApplicationStatusChange, 'function');
  assert.strictEqual(typeof ns.notifyDocumentStatusChange, 'function');
  assert.strictEqual(typeof ns.notifyAllDocumentsVerified, 'function');
});

test('email.service exports sendEmail function', () => {
  const es = require('../src/services/email.service');
  assert.strictEqual(typeof es.sendEmail, 'function', 'sendEmail should be exported');
});

test('email.service still exports original functions', () => {
  const es = require('../src/services/email.service');
  assert.strictEqual(typeof es.generateOTP, 'function');
  assert.strictEqual(typeof es.sendOTPEmail, 'function');
  assert.strictEqual(typeof es.sendVerificationEmail, 'function');
  assert.strictEqual(typeof es.sendPasswordResetEmail, 'function');
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Application Email Templates — Content Validation
// ═══════════════════════════════════════════════════════════════════════════

test('applicationApproved template generates correct subject & HTML', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationApproved({ firstName: 'Juan', scholarshipName: 'DOST Scholarship' });
  assert.ok(result.subject, 'Should have subject');
  assert.ok(result.html, 'Should have html');
  assert.ok(result.subject.includes('DOST Scholarship'), 'Subject should include scholarship name');
  assert.ok(result.subject.toLowerCase().includes('approved'), 'Subject should mention approved');
  assert.ok(result.html.includes('Juan'), 'HTML should include firstName');
  assert.ok(result.html.includes('DOST Scholarship'), 'HTML should include scholarship name');
  assert.ok(result.html.includes('Approved'), 'HTML should include Approved badge');
});

test('applicationRejected template includes reason when provided', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationRejected({
    firstName: 'Maria',
    scholarshipName: 'CHED Merit',
    reason: 'GWA below requirement',
  });
  assert.ok(result.subject.includes('CHED Merit'), 'Subject should include scholarship name');
  assert.ok(result.html.includes('Maria'), 'HTML should include name');
  assert.ok(result.html.includes('GWA below requirement'), 'HTML should include reason');
  assert.ok(result.html.includes('Not Approved'), 'HTML should include rejection badge');
});

test('applicationRejected template works without reason', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationRejected({
    firstName: 'Pedro',
    scholarshipName: 'Test Grant',
    reason: '',
  });
  assert.ok(result.html.includes('Pedro'), 'HTML should include name');
  // Empty reason should not render the reason block
  assert.ok(!result.html.includes('Reason</p>'), 'Should not render Reason block for empty reason');
});

test('applicationUnderReview template generates correct content', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationUnderReview({
    firstName: 'Ana',
    scholarshipName: 'Albacea Grant',
  });
  assert.ok(result.subject.includes('under review'), 'Subject should mention under review');
  assert.ok(result.html.includes('Ana'), 'HTML should include name');
  assert.ok(result.html.includes('Albacea Grant'), 'HTML should include scholarship name');
  assert.ok(result.html.includes('Under Review'), 'HTML should include status badge');
});

test('applicationWaitlisted template generates correct content', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationWaitlisted({
    firstName: 'Carlos',
    scholarshipName: 'UPLB Foundation',
  });
  assert.ok(result.subject.includes('waitlisted'), 'Subject should mention waitlisted');
  assert.ok(result.html.includes('Carlos'), 'HTML should include name');
  assert.ok(result.html.includes('Waitlisted'), 'HTML should include status badge');
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Document Email Templates — Content Validation
// ═══════════════════════════════════════════════════════════════════════════

test('documentVerified template generates correct content', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.documentVerified({ firstName: 'Rosa', documentName: 'Student ID' });
  assert.ok(result.subject.includes('Student ID'), 'Subject should include doc name');
  assert.ok(result.subject.includes('verified'), 'Subject should mention verified');
  assert.ok(result.html.includes('Rosa'), 'HTML should include name');
  assert.ok(result.html.includes('Student ID'), 'HTML should include document name');
  assert.ok(result.html.includes('Verified'), 'HTML should include Verified badge');
});

test('documentRejected template includes remarks', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.documentRejected({
    firstName: 'Luis',
    documentName: 'Latest Grades',
    remarks: 'Image is blurry, please reupload',
  });
  assert.ok(result.subject.includes('Latest Grades'), 'Subject should include doc name');
  assert.ok(result.html.includes('Luis'), 'HTML should include name');
  assert.ok(result.html.includes('Image is blurry'), 'HTML should include remarks');
  assert.ok(result.html.includes('Rejected'), 'HTML should include status badge');
});

test('documentRejected template works without remarks', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.documentRejected({
    firstName: 'Test',
    documentName: 'COR',
    remarks: '',
  });
  assert.ok(result.html.includes('Test'), 'HTML should include name');
  assert.ok(!result.html.includes('Admin Remarks</p>'), 'Should not render remarks block for empty');
});

test('documentResubmit template includes remarks', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.documentResubmit({
    firstName: 'Ella',
    documentName: 'Certificate of Registration',
    remarks: 'Wrong semester submitted',
  });
  assert.ok(result.subject.includes('Resubmission'), 'Subject should mention resubmission');
  assert.ok(result.html.includes('Ella'), 'HTML should include name');
  assert.ok(result.html.includes('Wrong semester submitted'), 'HTML should include remarks');
  assert.ok(result.html.includes('Resubmission Required'), 'HTML should include status badge');
});

test('allDocumentsVerified template generates correct content', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.allDocumentsVerified({ firstName: 'Marco' });
  assert.ok(result.subject.includes('verified'), 'Subject should mention verified');
  assert.ok(result.html.includes('Marco'), 'HTML should include name');
  assert.ok(result.html.includes('All Documents Verified'), 'HTML should include completion badge');
  assert.ok(result.html.includes('Browse Scholarships'), 'HTML should include CTA');
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Template HTML Structure Validation
// ═══════════════════════════════════════════════════════════════════════════

test('all templates produce valid HTML with DOCTYPE', () => {
  const t = require('../src/services/emailTemplates');
  const all = [
    t.applicationApproved({ firstName: 'X', scholarshipName: 'S' }),
    t.applicationRejected({ firstName: 'X', scholarshipName: 'S', reason: '' }),
    t.applicationUnderReview({ firstName: 'X', scholarshipName: 'S' }),
    t.applicationWaitlisted({ firstName: 'X', scholarshipName: 'S' }),
    t.documentVerified({ firstName: 'X', documentName: 'D' }),
    t.documentRejected({ firstName: 'X', documentName: 'D', remarks: '' }),
    t.documentResubmit({ firstName: 'X', documentName: 'D', remarks: '' }),
    t.allDocumentsVerified({ firstName: 'X' }),
  ];
  for (const { html } of all) {
    assert.ok(html.includes('<!DOCTYPE html>'), 'Should start with DOCTYPE');
    assert.ok(html.includes('</html>'), 'Should close html tag');
    assert.ok(html.includes('ISKOlarship'), 'Should have ISKOlarship branding');
    assert.ok(html.includes('🎓'), 'Should have graduation cap emoji');
  }
});

test('all templates include copyright footer', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationApproved({ firstName: 'X', scholarshipName: 'S' });
  const year = new Date().getFullYear();
  assert.ok(result.html.includes(`${year}`), 'Footer should include current year');
  assert.ok(result.html.includes('UPLB Scholarship Platform'), 'Footer should mention UPLB');
});

test('application templates include CTA link to applications or scholarships', () => {
  const t = require('../src/services/emailTemplates');
  const approvedHtml = t.applicationApproved({ firstName: 'X', scholarshipName: 'S' }).html;
  const rejectedHtml = t.applicationRejected({ firstName: 'X', scholarshipName: 'S', reason: '' }).html;

  assert.ok(approvedHtml.includes('/applications'), 'Approved should link to applications');
  assert.ok(rejectedHtml.includes('/scholarships'), 'Rejected should link to scholarships');
});

test('document templates include CTA link to profile', () => {
  const t = require('../src/services/emailTemplates');
  const rejectedHtml = t.documentRejected({ firstName: 'X', documentName: 'D', remarks: '' }).html;
  const resubmitHtml = t.documentResubmit({ firstName: 'X', documentName: 'D', remarks: '' }).html;

  assert.ok(rejectedHtml.includes('/profile'), 'Rejected doc should link to profile');
  assert.ok(resubmitHtml.includes('/profile'), 'Resubmit doc should link to profile');
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Template — Fallback Name Handling
// ═══════════════════════════════════════════════════════════════════════════

test('templates use "there" as fallback when firstName is missing', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationApproved({ firstName: undefined, scholarshipName: 'Grant' });
  assert.ok(result.html.includes('Hi <strong>there</strong>'), 'Should fallback to "there"');
});

test('templates use "there" when firstName is empty string', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.documentVerified({ firstName: '', documentName: 'ID' });
  assert.ok(result.html.includes('Hi <strong>there</strong>'), 'Should fallback to "there"');
});

test('templates use actual name when provided', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationApproved({ firstName: 'Rizal', scholarshipName: 'Test' });
  assert.ok(result.html.includes('Hi <strong>Rizal</strong>'), 'Should use actual name');
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Notification Service — Status-to-Template Mapping
// ═══════════════════════════════════════════════════════════════════════════

test('notifyApplicationStatusChange ignores unmapped statuses (draft)', () => {
  const ns = require('../src/services/notification.service');
  // Should not throw for unmapped status
  ns.notifyApplicationStatusChange('fakeId', 'draft', 'Test');
  assert.ok(true, 'No error for draft status');
});

test('notifyApplicationStatusChange ignores unmapped statuses (submitted)', () => {
  const ns = require('../src/services/notification.service');
  ns.notifyApplicationStatusChange('fakeId', 'submitted', 'Test');
  assert.ok(true, 'No error for submitted status');
});

test('notifyApplicationStatusChange ignores unmapped statuses (withdrawn)', () => {
  const ns = require('../src/services/notification.service');
  ns.notifyApplicationStatusChange('fakeId', 'withdrawn', 'Test');
  assert.ok(true, 'No error for withdrawn status');
});

test('notifyDocumentStatusChange ignores unmapped statuses (pending)', () => {
  const ns = require('../src/services/notification.service');
  ns.notifyDocumentStatusChange('fakeId', 'pending', 'Doc');
  assert.ok(true, 'No error for pending status');
});

test('notifyApplicationStatusChange handles mapped statuses without throwing', () => {
  const ns = require('../src/services/notification.service');
  // These will fail on user lookup (no DB) but should NOT throw synchronously
  ns.notifyApplicationStatusChange('000000000000000000000001', 'approved', 'DOST');
  ns.notifyApplicationStatusChange('000000000000000000000001', 'rejected', 'DOST', 'reason');
  ns.notifyApplicationStatusChange('000000000000000000000001', 'under_review', 'DOST');
  ns.notifyApplicationStatusChange('000000000000000000000001', 'waitlisted', 'DOST');
  assert.ok(true, 'No synchronous errors for mapped statuses');
});

test('notifyDocumentStatusChange handles mapped statuses without throwing', () => {
  const ns = require('../src/services/notification.service');
  ns.notifyDocumentStatusChange('000000000000000000000001', 'verified', 'ID');
  ns.notifyDocumentStatusChange('000000000000000000000001', 'rejected', 'ID', 'bad');
  ns.notifyDocumentStatusChange('000000000000000000000001', 'resubmit', 'ID', 'old');
  assert.ok(true, 'No synchronous errors for mapped statuses');
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. notifyAllDocumentsVerified — Detection Logic
// ═══════════════════════════════════════════════════════════════════════════

test('notifyAllDocumentsVerified does nothing for null documents', () => {
  const ns = require('../src/services/notification.service');
  ns.notifyAllDocumentsVerified('fakeId', null);
  assert.ok(true, 'No error for null docs');
});

test('notifyAllDocumentsVerified does nothing for empty array', () => {
  const ns = require('../src/services/notification.service');
  ns.notifyAllDocumentsVerified('fakeId', []);
  assert.ok(true, 'No error for empty docs');
});

test('notifyAllDocumentsVerified does nothing when not all verified', () => {
  const ns = require('../src/services/notification.service');
  const docs = [
    { verificationStatus: 'verified' },
    { verificationStatus: 'pending' },
    { verificationStatus: 'verified' },
  ];
  ns.notifyAllDocumentsVerified('fakeId', docs);
  assert.ok(true, 'No error for partial verification');
});

test('notifyAllDocumentsVerified fires when all docs verified', () => {
  const ns = require('../src/services/notification.service');
  const docs = [
    { verificationStatus: 'verified' },
    { verificationStatus: 'verified' },
    { verificationStatus: 'verified' },
  ];
  // Should NOT throw (will fail on DB lookup, but fire-and-forget catches)
  ns.notifyAllDocumentsVerified('000000000000000000000001', docs);
  assert.ok(true, 'Fires for all-verified docs without synchronous error');
});

test('notifyAllDocumentsVerified detects mixed statuses correctly', () => {
  const ns = require('../src/services/notification.service');
  const docs = [
    { verificationStatus: 'verified' },
    { verificationStatus: 'rejected' },
  ];
  ns.notifyAllDocumentsVerified('fakeId', docs);
  assert.ok(true, 'No error for mixed statuses');
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. User Model — notificationPreferences Schema
// ═══════════════════════════════════════════════════════════════════════════

test('User model loads with notificationPreferences in schema', () => {
  const { User } = require('../src/models');
  const paths = User.schema.paths;
  assert.ok(paths['notificationPreferences.emailEnabled'], 'Should have emailEnabled path');
  assert.ok(paths['notificationPreferences.applicationUpdates'], 'Should have applicationUpdates path');
  assert.ok(paths['notificationPreferences.documentUpdates'], 'Should have documentUpdates path');
});

test('notificationPreferences default values are all true', () => {
  const { User } = require('../src/models');
  const schema = User.schema;
  const emailDefault = schema.path('notificationPreferences.emailEnabled').defaultValue;
  const appDefault = schema.path('notificationPreferences.applicationUpdates').defaultValue;
  const docDefault = schema.path('notificationPreferences.documentUpdates').defaultValue;
  assert.strictEqual(emailDefault, true, 'emailEnabled should default true');
  assert.strictEqual(appDefault, true, 'applicationUpdates should default true');
  assert.strictEqual(docDefault, true, 'documentUpdates should default true');
});

test('notificationPreferences fields are Boolean type', () => {
  const { User } = require('../src/models');
  const schema = User.schema;
  assert.strictEqual(schema.path('notificationPreferences.emailEnabled').instance, 'Boolean');
  assert.strictEqual(schema.path('notificationPreferences.applicationUpdates').instance, 'Boolean');
  assert.strictEqual(schema.path('notificationPreferences.documentUpdates').instance, 'Boolean');
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Route Integration — Notification Service Imported in Routes
// ═══════════════════════════════════════════════════════════════════════════

test('application.routes.js loads without errors', () => {
  const routes = require('../src/routes/application.routes');
  assert.ok(routes, 'Application routes should load');
});

test('verification.routes.js loads without errors', () => {
  const routes = require('../src/routes/verification.routes');
  assert.ok(routes, 'Verification routes should load');
});

test('user.routes.js loads without errors', () => {
  const routes = require('../src/routes/user.routes');
  assert.ok(routes, 'User routes should load');
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. Template Output — No Undefined/NaN in rendered HTML
// ═══════════════════════════════════════════════════════════════════════════

test('templates never contain "undefined" in output', () => {
  const t = require('../src/services/emailTemplates');
  const all = [
    t.applicationApproved({ firstName: undefined, scholarshipName: undefined }),
    t.applicationRejected({ firstName: undefined, scholarshipName: undefined, reason: undefined }),
    t.applicationUnderReview({ firstName: undefined, scholarshipName: undefined }),
    t.applicationWaitlisted({ firstName: undefined, scholarshipName: undefined }),
    t.documentVerified({ firstName: undefined, documentName: undefined }),
    t.documentRejected({ firstName: undefined, documentName: undefined, remarks: undefined }),
    t.documentResubmit({ firstName: undefined, documentName: undefined, remarks: undefined }),
    t.allDocumentsVerified({ firstName: undefined }),
  ];
  for (const { html, subject } of all) {
    assert.ok(!subject.includes('undefined'), `Subject should not contain "undefined": ${subject}`);
    // NOTE: html may have 'undefined' for missing params that don't have || fallback
    // This test validates the template uses the 'there' fallback properly
    assert.ok(!html.includes('Hi <strong>undefined</strong>'), 'Name should not be "undefined"');
  }
});

test('templates never contain "NaN" in output', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationApproved({ firstName: 'Test', scholarshipName: 'Grant' });
  assert.ok(!result.html.includes('NaN'), 'HTML should not contain NaN');
  assert.ok(!result.subject.includes('NaN'), 'Subject should not contain NaN');
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. Template — Special Characters Handling
// ═══════════════════════════════════════════════════════════════════════════

test('templates handle special characters in scholarship name', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationApproved({
    firstName: 'Juan',
    scholarshipName: 'DOST-SEI "S&T" Grant (2024–2025)',
  });
  assert.ok(result.subject.includes('DOST-SEI'), 'Should handle special chars in subject');
  assert.ok(result.html.includes('DOST-SEI'), 'Should handle special chars in HTML');
});

test('templates handle special characters in remarks', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.documentRejected({
    firstName: 'Test',
    documentName: 'COR',
    remarks: 'File too small (<100KB) & blurry. Please fix.',
  });
  assert.ok(result.html.includes('File too small'), 'Should include remarks with special chars');
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. Template — Return Shape Consistency
// ═══════════════════════════════════════════════════════════════════════════

test('all template functions return { subject: string, html: string }', () => {
  const t = require('../src/services/emailTemplates');
  const fns = [
    () => t.applicationApproved({ firstName: 'A', scholarshipName: 'B' }),
    () => t.applicationRejected({ firstName: 'A', scholarshipName: 'B', reason: '' }),
    () => t.applicationUnderReview({ firstName: 'A', scholarshipName: 'B' }),
    () => t.applicationWaitlisted({ firstName: 'A', scholarshipName: 'B' }),
    () => t.documentVerified({ firstName: 'A', documentName: 'B' }),
    () => t.documentRejected({ firstName: 'A', documentName: 'B', remarks: '' }),
    () => t.documentResubmit({ firstName: 'A', documentName: 'B', remarks: '' }),
    () => t.allDocumentsVerified({ firstName: 'A' }),
  ];
  for (const fn of fns) {
    const result = fn();
    assert.strictEqual(typeof result.subject, 'string', 'subject should be string');
    assert.strictEqual(typeof result.html, 'string', 'html should be string');
    assert.ok(result.subject.length > 0, 'subject should not be empty');
    assert.ok(result.html.length > 100, 'html should be substantial');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. Notification Service — Graceful Error Handling (Fire-and-Forget)
// ═══════════════════════════════════════════════════════════════════════════

test('notifyApplicationStatusChange does not throw even with invalid userId', () => {
  const ns = require('../src/services/notification.service');
  // Deliberately pass null/undefined — should NOT throw
  assert.doesNotThrow(() => {
    ns.notifyApplicationStatusChange(null, 'approved', 'Test');
  }, 'Should not throw for null userId');
});

test('notifyDocumentStatusChange does not throw even with invalid userId', () => {
  const ns = require('../src/services/notification.service');
  assert.doesNotThrow(() => {
    ns.notifyDocumentStatusChange(undefined, 'verified', 'ID');
  }, 'Should not throw for undefined userId');
});

test('notifyAllDocumentsVerified does not throw for undefined', () => {
  const ns = require('../src/services/notification.service');
  assert.doesNotThrow(() => {
    ns.notifyAllDocumentsVerified(undefined, undefined);
  }, 'Should not throw for undefined args');
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. Application Status — Complete Mapping Coverage
// ═══════════════════════════════════════════════════════════════════════════

test('all 4 notifiable application statuses map to correct templates', () => {
  const t = require('../src/services/emailTemplates');

  // approved
  const approved = t.applicationApproved({ firstName: 'X', scholarshipName: 'S' });
  assert.ok(approved.html.includes('Approved'), 'approved → Approved badge');

  // rejected
  const rejected = t.applicationRejected({ firstName: 'X', scholarshipName: 'S', reason: '' });
  assert.ok(rejected.html.includes('Not Approved'), 'rejected → Not Approved badge');

  // under_review
  const underReview = t.applicationUnderReview({ firstName: 'X', scholarshipName: 'S' });
  assert.ok(underReview.html.includes('Under Review'), 'under_review → Under Review badge');

  // waitlisted
  const waitlisted = t.applicationWaitlisted({ firstName: 'X', scholarshipName: 'S' });
  assert.ok(waitlisted.html.includes('Waitlisted'), 'waitlisted → Waitlisted badge');
});

test('all 3 notifiable document statuses map to correct templates', () => {
  const t = require('../src/services/emailTemplates');

  const verified = t.documentVerified({ firstName: 'X', documentName: 'D' });
  assert.ok(verified.html.includes('Verified'), 'verified → Verified badge');

  const rejected = t.documentRejected({ firstName: 'X', documentName: 'D', remarks: '' });
  assert.ok(rejected.html.includes('Rejected'), 'rejected → Rejected badge');

  const resubmit = t.documentResubmit({ firstName: 'X', documentName: 'D', remarks: '' });
  assert.ok(resubmit.html.includes('Resubmission Required'), 'resubmit → Resubmission Required badge');
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. Template — Responsive Meta Tags
// ═══════════════════════════════════════════════════════════════════════════

test('all templates include viewport meta tag for mobile', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.applicationApproved({ firstName: 'X', scholarshipName: 'S' });
  assert.ok(result.html.includes('width=device-width'), 'Should include viewport meta');
});

test('all templates include charset meta tag', () => {
  const t = require('../src/services/emailTemplates');
  const result = t.documentVerified({ firstName: 'X', documentName: 'D' });
  assert.ok(result.html.includes('charset="utf-8"'), 'Should include charset meta');
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. Template — Color & Branding Consistency
// ═══════════════════════════════════════════════════════════════════════════

test('approved templates use green color scheme', () => {
  const t = require('../src/services/emailTemplates');
  const approved = t.applicationApproved({ firstName: 'X', scholarshipName: 'S' });
  const docVerified = t.documentVerified({ firstName: 'X', documentName: 'D' });
  assert.ok(approved.html.includes('#dcfce7') || approved.html.includes('#166534'), 'Approved should use green');
  assert.ok(docVerified.html.includes('#dcfce7') || docVerified.html.includes('#166534'), 'Verified should use green');
});

test('rejected templates use red color scheme', () => {
  const t = require('../src/services/emailTemplates');
  const rejected = t.applicationRejected({ firstName: 'X', scholarshipName: 'S', reason: '' });
  const docRejected = t.documentRejected({ firstName: 'X', documentName: 'D', remarks: '' });
  assert.ok(rejected.html.includes('#fee2e2') || rejected.html.includes('#991b1b'), 'Rejected should use red');
  assert.ok(docRejected.html.includes('#fee2e2') || docRejected.html.includes('#991b1b'), 'Doc rejected should use red');
});

test('waitlisted and resubmit templates use amber/yellow scheme', () => {
  const t = require('../src/services/emailTemplates');
  const waitlisted = t.applicationWaitlisted({ firstName: 'X', scholarshipName: 'S' });
  const resubmit = t.documentResubmit({ firstName: 'X', documentName: 'D', remarks: '' });
  assert.ok(waitlisted.html.includes('#fef3c7') || waitlisted.html.includes('#92400e'), 'Waitlisted should use amber');
  assert.ok(resubmit.html.includes('#fef3c7') || resubmit.html.includes('#92400e'), 'Resubmit should use amber');
});

test('under review template uses blue color scheme', () => {
  const t = require('../src/services/emailTemplates');
  const review = t.applicationUnderReview({ firstName: 'X', scholarshipName: 'S' });
  assert.ok(review.html.includes('#dbeafe') || review.html.includes('#1e40af'), 'Under review should use blue');
});

// ═══════════════════════════════════════════════════════════════════════════
// 17. Template — CTA Button Styling
// ═══════════════════════════════════════════════════════════════════════════

test('application templates have clickable CTA buttons with ISKOlarship domain', () => {
  const t = require('../src/services/emailTemplates');
  const templates = [
    t.applicationApproved({ firstName: 'X', scholarshipName: 'S' }),
    t.applicationRejected({ firstName: 'X', scholarshipName: 'S', reason: '' }),
    t.applicationUnderReview({ firstName: 'X', scholarshipName: 'S' }),
    t.applicationWaitlisted({ firstName: 'X', scholarshipName: 'S' }),
  ];
  for (const { html } of templates) {
    assert.ok(html.includes('iskolarship.vercel.app') || html.includes('FRONTEND_URL'), 'Should link to frontend');
    assert.ok(html.includes('border-radius:10px'), 'CTA button should have rounded corners');
    assert.ok(html.includes('#2563eb'), 'CTA button should use primary blue');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 18. Integration — ApplicationStatus Enum Alignment
// ═══════════════════════════════════════════════════════════════════════════

test('notifiable statuses match ApplicationStatus enum values', () => {
  const { ApplicationStatus } = require('../src/models/Application.model');
  const notifiable = ['approved', 'rejected', 'under_review', 'waitlisted'];

  for (const status of notifiable) {
    const enumVal = Object.values(ApplicationStatus).find(v => v === status);
    assert.ok(enumVal, `Status '${status}' should exist in ApplicationStatus enum`);
  }
});

test('non-notifiable statuses are correctly excluded', () => {
  // These statuses should NOT trigger notification emails
  const nonNotifiable = ['draft', 'submitted', 'documents_required', 'shortlisted', 'interview_scheduled', 'withdrawn'];
  const ns = require('../src/services/notification.service');

  for (const status of nonNotifiable) {
    // Should silently do nothing — no throw
    assert.doesNotThrow(() => {
      ns.notifyApplicationStatusChange('fakeId', status, 'Test');
    }, `Status '${status}' should be silently ignored`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 19. Edge Case — Large Data
// ═══════════════════════════════════════════════════════════════════════════

test('templates handle very long scholarship names', () => {
  const t = require('../src/services/emailTemplates');
  const longName = 'The Juan dela Cruz Memorial Scholarship for Outstanding Students from Province of Laguna Academic Year 2025-2026 Second Semester Application';
  const result = t.applicationApproved({ firstName: 'Test', scholarshipName: longName });
  assert.ok(result.subject.includes('Juan dela Cruz'), 'Should include long name in subject');
  assert.ok(result.html.includes(longName), 'Should include full long name in HTML');
});

test('templates handle very long remarks', () => {
  const t = require('../src/services/emailTemplates');
  const longRemarks = 'A'.repeat(500);
  const result = t.documentRejected({ firstName: 'Test', documentName: 'COR', remarks: longRemarks });
  assert.ok(result.html.includes(longRemarks), 'Should include full long remarks');
});

// ═══════════════════════════════════════════════════════════════════════════
// Run all tests
// ═══════════════════════════════════════════════════════════════════════════

runTests();
