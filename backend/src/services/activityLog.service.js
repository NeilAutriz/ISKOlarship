// =============================================================================
// ISKOlarship - Activity Log Service
// Fire-and-forget activity logging for all user actions
// Never throws — failures are logged to console but don't affect the caller.
// =============================================================================

const { ActivityLog, ActivityAction } = require('../models/ActivityLog.model');

/**
 * Helper: extract display name from user object
 */
const getName = (user) => {
  if (!user) return 'Unknown';
  return (
    user.studentProfile?.firstName ||
    user.adminProfile?.firstName ||
    user.email ||
    'Unknown'
  );
};

/**
 * Core logging function (fire-and-forget).
 * Always resolves — never rejects or throws.
 */
const logActivity = async (params) => {
  try {
    if (!params || typeof params !== 'object') return;
    const {
      userId,
      userRole,
      userName = '',
      userEmail = '',
      action,
      description,
      targetType = null,
      targetId = null,
      targetName = '',
      metadata = {},
      ipAddress = '',
      status = 'success',
    } = params;
    await ActivityLog.create({
      user: userId,
      userRole,
      userName,
      userEmail,
      action,
      description,
      targetType,
      targetId,
      targetName,
      metadata,
      ipAddress,
      status,
    });
  } catch (err) {
    console.error('[ActivityLog] Failed to log activity:', err.message);
  }
};

// =============================================================================
// Convenience Methods — Auth
// =============================================================================

const logLogin = (user, ip = '') => {
  const name = getName(user);
  logActivity({
    userId: user._id,
    userRole: user.role,
    userName: name,
    userEmail: user.email,
    action: ActivityAction.LOGIN,
    description: `${name} logged in`,
    targetType: 'user',
    targetId: user._id,
    ipAddress: ip,
  });
};

const logRegister = (user, ip = '') => {
  const name = user.email;
  logActivity({
    userId: user._id,
    userRole: user.role,
    userName: name,
    userEmail: user.email,
    action: ActivityAction.REGISTER,
    description: `New ${user.role} account registered: ${name}`,
    targetType: 'user',
    targetId: user._id,
    ipAddress: ip,
  });
};

// =============================================================================
// Convenience Methods — Profile
// =============================================================================

const logProfileUpdate = (user, ip = '') => {
  const name = getName(user);
  logActivity({
    userId: user._id,
    userRole: user.role,
    userName: name,
    userEmail: user.email,
    action: ActivityAction.PROFILE_UPDATE,
    description: `${name} updated their profile`,
    targetType: 'user',
    targetId: user._id,
    ipAddress: ip,
  });
};

const logDocumentUpload = (user, docCount, ip = '') => {
  const name = getName(user);
  logActivity({
    userId: user._id,
    userRole: user.role,
    userName: name,
    userEmail: user.email,
    action: ActivityAction.DOCUMENT_UPLOAD,
    description: `${name} uploaded ${docCount} document(s)`,
    targetType: 'document',
    metadata: { documentCount: docCount },
    ipAddress: ip,
  });
};

const logDocumentDelete = (user, docName, ip = '') => {
  const name = getName(user);
  logActivity({
    userId: user._id,
    userRole: user.role,
    userName: name,
    userEmail: user.email,
    action: ActivityAction.DOCUMENT_DELETE,
    description: `${name} deleted document: ${docName || 'unknown'}`,
    targetType: 'document',
    targetName: docName || '',
    ipAddress: ip,
  });
};

// =============================================================================
// Convenience Methods — Applications (student)
// =============================================================================

const logApplicationCreate = (user, application, scholarshipTitle, ip = '') => {
  const name = getName(user);
  logActivity({
    userId: user._id,
    userRole: 'student',
    userName: name,
    userEmail: user.email,
    action: ActivityAction.APPLICATION_CREATE,
    description: `${name} created application for "${scholarshipTitle}"`,
    targetType: 'application',
    targetId: application._id,
    targetName: scholarshipTitle,
    ipAddress: ip,
  });
};

const logApplicationSubmit = (user, application, scholarshipTitle, ip = '') => {
  const name = getName(user);
  logActivity({
    userId: user._id,
    userRole: 'student',
    userName: name,
    userEmail: user.email,
    action: ActivityAction.APPLICATION_SUBMIT,
    description: `${name} submitted application for "${scholarshipTitle}"`,
    targetType: 'application',
    targetId: application._id,
    targetName: scholarshipTitle,
    ipAddress: ip,
  });
};

const logApplicationWithdraw = (user, application, scholarshipTitle, ip = '') => {
  const name = getName(user);
  logActivity({
    userId: user._id,
    userRole: 'student',
    userName: name,
    userEmail: user.email,
    action: ActivityAction.APPLICATION_WITHDRAW,
    description: `${name} withdrew application for "${scholarshipTitle}"`,
    targetType: 'application',
    targetId: application._id,
    targetName: scholarshipTitle,
    ipAddress: ip,
  });
};

// =============================================================================
// Convenience Methods — Applications (admin)
// =============================================================================

const logApplicationStatusChange = (admin, application, scholarshipTitle, newStatus, ip = '') => {
  const adminName = getName(admin);
  const actionMap = {
    approved: ActivityAction.APPLICATION_APPROVE,
    rejected: ActivityAction.APPLICATION_REJECT,
    under_review: ActivityAction.APPLICATION_REVIEW,
  };
  const action = actionMap[newStatus] || ActivityAction.APPLICATION_REVIEW;

  logActivity({
    userId: admin._id,
    userRole: 'admin',
    userName: adminName,
    userEmail: admin.email,
    action,
    description: `${adminName} ${newStatus} application for "${scholarshipTitle}"`,
    targetType: 'application',
    targetId: application._id,
    targetName: scholarshipTitle,
    metadata: { newStatus, applicantId: application.applicant?.toString() },
    ipAddress: ip,
  });
};

// =============================================================================
// Convenience Methods — Document Verification (admin)
// =============================================================================

const logDocumentVerification = (admin, studentId, docName, newStatus, ip = '') => {
  const adminName = getName(admin);
  const actionMap = {
    verified: ActivityAction.DOCUMENT_VERIFY,
    rejected: ActivityAction.DOCUMENT_REJECT,
    resubmit: ActivityAction.DOCUMENT_RESUBMIT,
  };

  logActivity({
    userId: admin._id,
    userRole: 'admin',
    userName: adminName,
    userEmail: admin.email,
    action: actionMap[newStatus] || ActivityAction.DOCUMENT_VERIFY,
    description: `${adminName} ${newStatus} document "${docName}" for student`,
    targetType: 'document',
    targetId: studentId,
    targetName: docName,
    metadata: { newStatus, targetUserId: studentId?.toString() },
    ipAddress: ip,
  });
};

const logDocumentVerifyAll = (admin, studentId, count, status, ip = '') => {
  const adminName = getName(admin);
  logActivity({
    userId: admin._id,
    userRole: 'admin',
    userName: adminName,
    userEmail: admin.email,
    action: ActivityAction.DOCUMENT_VERIFY_ALL,
    description: `${adminName} batch-${status} ${count} document(s) for student`,
    targetType: 'user',
    targetId: studentId,
    metadata: { count, status },
    ipAddress: ip,
  });
};

// =============================================================================
// Convenience Methods — Scholarships (admin)
// =============================================================================

const logScholarshipCreate = (admin, scholarship, ip = '') => {
  const adminName = getName(admin);
  logActivity({
    userId: admin._id,
    userRole: 'admin',
    userName: adminName,
    userEmail: admin.email,
    action: ActivityAction.SCHOLARSHIP_CREATE,
    description: `${adminName} created scholarship "${scholarship.title || scholarship.name}"`,
    targetType: 'scholarship',
    targetId: scholarship._id,
    targetName: scholarship.title || scholarship.name || '',
    ipAddress: ip,
  });
};

const logScholarshipUpdate = (admin, scholarship, ip = '') => {
  const adminName = getName(admin);
  logActivity({
    userId: admin._id,
    userRole: 'admin',
    userName: adminName,
    userEmail: admin.email,
    action: ActivityAction.SCHOLARSHIP_UPDATE,
    description: `${adminName} updated scholarship "${scholarship.title || scholarship.name}"`,
    targetType: 'scholarship',
    targetId: scholarship._id,
    targetName: scholarship.title || scholarship.name || '',
    ipAddress: ip,
  });
};

const logScholarshipDelete = (admin, scholarshipId, title, archived, ip = '') => {
  const adminName = getName(admin);
  logActivity({
    userId: admin._id,
    userRole: 'admin',
    userName: adminName,
    userEmail: admin.email,
    action: ActivityAction.SCHOLARSHIP_DELETE,
    description: `${adminName} ${archived ? 'archived' : 'deleted'} scholarship "${title}"`,
    targetType: 'scholarship',
    targetId: scholarshipId,
    targetName: title,
    metadata: { archived },
    ipAddress: ip,
  });
};

// =============================================================================
// Convenience Methods — Model Training (admin)
// =============================================================================

const logModelTrain = (admin, scholarshipName, metrics, ip = '') => {
  const adminName = getName(admin);
  logActivity({
    userId: admin._id,
    userRole: 'admin',
    userName: adminName,
    userEmail: admin.email,
    action: ActivityAction.MODEL_TRAIN,
    description: `${adminName} trained model for "${scholarshipName}"`,
    targetType: 'model',
    targetName: scholarshipName,
    metadata: { accuracy: metrics?.accuracy, samples: metrics?.trainingExamples },
    ipAddress: ip,
  });
};

const logModelTrainAll = (admin, successful, failed, ip = '') => {
  const adminName = getName(admin);
  logActivity({
    userId: admin._id,
    userRole: 'admin',
    userName: adminName,
    userEmail: admin.email,
    action: ActivityAction.MODEL_TRAIN_ALL,
    description: `${adminName} batch-trained ${successful} models (${failed} failed)`,
    targetType: 'model',
    metadata: { successful, failed },
    ipAddress: ip,
  });
};

module.exports = {
  logActivity,
  logLogin,
  logRegister,
  logProfileUpdate,
  logDocumentUpload,
  logDocumentDelete,
  logApplicationCreate,
  logApplicationSubmit,
  logApplicationWithdraw,
  logApplicationStatusChange,
  logDocumentVerification,
  logDocumentVerifyAll,
  logScholarshipCreate,
  logScholarshipUpdate,
  logScholarshipDelete,
  logModelTrain,
  logModelTrainAll,
  ActivityAction,
};
