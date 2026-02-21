// =============================================================================
// ISKOlarship - Notification Service
// Fire-and-forget email notifications for application & document events
// =============================================================================

const { User } = require('../models');
const { Notification } = require('../models/Notification.model');
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
// In-App Notification Helper
// =============================================================================

/**
 * Create an in-app notification record (fire-and-forget).
 * Never throws — errors are logged and swallowed.
 */
const createInAppNotification = async (userId, type, title, message, metadata = {}) => {
  try {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      metadata,
    });
    console.log(`🔔 In-app notification created → user ${userId} | ${type}`);
  } catch (err) {
    console.error(`🔔 In-app notification error (user ${userId}): ${err.message}`);
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

  const name = scholarshipName || 'a scholarship';

  // In-app notification titles & messages
  const inAppMap = {
    approved: {
      type: 'application_approved',
      title: 'Application Approved',
      message: `Your application for ${name} has been approved! Check your email for details.`,
    },
    rejected: {
      type: 'application_rejected',
      title: 'Application Not Approved',
      message: `Your application for ${name} was not approved.${reason ? ' Reason: ' + reason : ''}`,
    },
    under_review: {
      type: 'application_under_review',
      title: 'Application Under Review',
      message: `Your application for ${name} is now being reviewed by the scholarship committee.`,
    },
    waitlisted: {
      type: 'application_waitlisted',
      title: 'Application Waitlisted',
      message: `Your application for ${name} has been waitlisted. You'll be notified if a slot becomes available.`,
    },
  };

  // Fire and forget — email
  sendNotification(applicantId, 'application', templateFn, {
    scholarshipName: name,
    reason: reason || '',
  }).catch(() => {}); // extra safety

  // Fire and forget — in-app
  const inApp = inAppMap[status];
  if (inApp) {
    createInAppNotification(applicantId, inApp.type, inApp.title, inApp.message, {
      scholarshipName: name,
      reason: reason || '',
    }).catch(() => {});
  }
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

  const docName = documentName || 'a document';

  // Email
  sendNotification(userId, 'document', templateFn, {
    documentName: docName,
    remarks: remarks || '',
  }).catch(() => {});

  // In-app
  const inAppDocMap = {
    verified: {
      type: 'document_verified',
      title: 'Document Verified',
      message: `Your document "${docName}" has been verified successfully.`,
    },
    rejected: {
      type: 'document_rejected',
      title: 'Document Rejected',
      message: `Your document "${docName}" was rejected.${remarks ? ' Remarks: ' + remarks : ''}`,
    },
    resubmit: {
      type: 'document_resubmit',
      title: 'Document Needs Resubmission',
      message: `Your document "${docName}" needs to be resubmitted.${remarks ? ' Remarks: ' + remarks : ''}`,
    },
  };

  const inApp = inAppDocMap[status];
  if (inApp) {
    createInAppNotification(userId, inApp.type, inApp.title, inApp.message, {
      documentName: docName,
      remarks: remarks || '',
    }).catch(() => {});
  }
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

  // Email
  sendNotification(userId, 'document', templates.allDocumentsVerified, {}).catch(() => {});

  // In-app
  createInAppNotification(
    userId,
    'all_documents_verified',
    'All Documents Verified',
    'All your documents have been verified! You are now eligible to apply for scholarships.',
    {}
  ).catch(() => {});
};

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  notifyApplicationStatusChange,
  notifyDocumentStatusChange,
  notifyAllDocumentsVerified,
};
