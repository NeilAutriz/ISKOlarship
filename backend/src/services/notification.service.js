// =============================================================================
// ISKOlarship - Notification Service
// Fire-and-forget email notifications for application & document events
// =============================================================================

const { User } = require('../models');
const emailService = require('./email.service');
const templates = require('./emailTemplates');

// Helper: get transport type from email service (reuse detection logic)
const getTransportType = () => {
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) return 'smtp';
  return 'console';
};

/**
 * Send a notification email (fire-and-forget).
 * Resolves user preferences, builds template, sends via email service.
 * Never throws — errors are logged and swallowed.
 */
const sendNotification = async (userId, category, templateFn, templateData) => {
  try {
    // 1. Resolve user
    const user = await User.findById(userId).select('email role studentProfile.firstName adminProfile.firstName notificationPreferences');
    if (!user) {
      console.log(`📧 Notification skipped: user ${userId} not found`);
      return;
    }

    // 2. Check preferences
    const prefs = user.notificationPreferences || {};
    if (prefs.emailEnabled === false) {
      console.log(`📧 Notification skipped: user ${userId} has email notifications disabled`);
      return;
    }
    if (category === 'application' && prefs.applicationUpdates === false) {
      console.log(`📧 Notification skipped: user ${userId} has application updates disabled`);
      return;
    }
    if (category === 'document' && prefs.documentUpdates === false) {
      console.log(`📧 Notification skipped: user ${userId} has document updates disabled`);
      return;
    }

    // 3. Resolve first name
    const firstName =
      user.studentProfile?.firstName ||
      user.adminProfile?.firstName ||
      'there';

    // 4. Build email from template
    const { subject, html } = templateFn({ firstName, ...templateData });

    // 5. Send
    const type = getTransportType();
    if (type === 'console') {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║  📧 NOTIFICATION (console fallback — no transport)    ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(`║  To:      ${user.email}`);
      console.log(`║  Subject: ${subject}`);
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log('');
      return;
    }

    const mailOptions = {
      from: `"ISKOlarship" <${process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'noreply@iskolarship.ph'}>`,
      to: user.email,
      subject,
      html,
    };

    await emailService.sendEmail(mailOptions);
    console.log(`📧 Notification sent → ${user.email} | ${subject}`);
  } catch (err) {
    // Fire-and-forget: never let notification failure bubble up
    console.error(`📧 Notification error (user ${userId}): ${err.message}`);
  }
};

// =============================================================================
// Public API — Application Status Notifications
// =============================================================================

/**
 * Notify student when their application status changes.
 * @param {string} applicantId - User ID of the student
 * @param {string} status - New status (approved, rejected, under_review, waitlisted, etc.)
 * @param {string} scholarshipName - Name of the scholarship
 * @param {string} [reason] - Rejection reason (if applicable)
 */
const notifyApplicationStatusChange = (applicantId, status, scholarshipName, reason) => {
  const templateMap = {
    approved: templates.applicationApproved,
    rejected: templates.applicationRejected,
    under_review: templates.applicationUnderReview,
    waitlisted: templates.applicationWaitlisted,
  };

  const templateFn = templateMap[status];
  if (!templateFn) {
    // Status not in the notification list (e.g., draft, submitted, withdrawn)
    return;
  }

  // Fire and forget
  sendNotification(applicantId, 'application', templateFn, {
    scholarshipName: scholarshipName || 'a scholarship',
    reason: reason || '',
  }).catch(() => {}); // extra safety
};

// =============================================================================
// Public API — Document Verification Notifications
// =============================================================================

/**
 * Notify user when a single document verification status changes.
 * @param {string} userId - User ID of the student/admin
 * @param {string} status - New status (verified, rejected, resubmit)
 * @param {string} documentName - Name/type of the document
 * @param {string} [remarks] - Admin remarks
 */
const notifyDocumentStatusChange = (userId, status, documentName, remarks) => {
  const templateMap = {
    verified: templates.documentVerified,
    rejected: templates.documentRejected,
    resubmit: templates.documentResubmit,
  };

  const templateFn = templateMap[status];
  if (!templateFn) return;

  sendNotification(userId, 'document', templateFn, {
    documentName: documentName || 'a document',
    remarks: remarks || '',
  }).catch(() => {});
};

/**
 * Notify user when ALL their documents have been verified.
 * Call after each verification to check if all docs are now verified.
 * @param {string} userId - User ID
 * @param {Array} documents - The user's documents array
 */
const notifyAllDocumentsVerified = (userId, documents) => {
  if (!documents || documents.length === 0) return;

  const allVerified = documents.every(d => d.verificationStatus === 'verified');
  if (!allVerified) return;

  sendNotification(userId, 'document', templates.allDocumentsVerified, {}).catch(() => {});
};

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  notifyApplicationStatusChange,
  notifyDocumentStatusChange,
  notifyAllDocumentsVerified,
};
