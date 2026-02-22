// =============================================================================
// ISKOlarship - Activity Log Model
// Tracks all user and admin actions for audit trail
// =============================================================================

const mongoose = require('mongoose');

// All possible activity actions
const ActivityAction = {
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_RESET: 'password_reset',

  // Profile
  PROFILE_UPDATE: 'profile_update',
  DOCUMENT_UPLOAD: 'document_upload',
  DOCUMENT_DELETE: 'document_delete',

  // Application (student)
  APPLICATION_CREATE: 'application_create',
  APPLICATION_SUBMIT: 'application_submit',
  APPLICATION_WITHDRAW: 'application_withdraw',

  // Application (admin)
  APPLICATION_APPROVE: 'application_approve',
  APPLICATION_REJECT: 'application_reject',
  APPLICATION_REVIEW: 'application_review',

  // Document verification (admin)
  DOCUMENT_VERIFY: 'document_verify',
  DOCUMENT_REJECT: 'document_reject',
  DOCUMENT_RESUBMIT: 'document_resubmit',
  DOCUMENT_VERIFY_ALL: 'document_verify_all',

  // Scholarship (admin)
  SCHOLARSHIP_CREATE: 'scholarship_create',
  SCHOLARSHIP_UPDATE: 'scholarship_update',
  SCHOLARSHIP_DELETE: 'scholarship_delete',

  // Model training (admin)
  MODEL_TRAIN: 'model_train',
  MODEL_TRAIN_ALL: 'model_train_all',

  // Notification preferences
  NOTIFICATION_PREFERENCES_UPDATE: 'notification_preferences_update',
};

const activityLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: ['student', 'admin'],
      required: true,
    },
    userName: {
      type: String,
      default: '',
    },
    userEmail: {
      type: String,
      default: '',
    },

    // What action was performed
    action: {
      type: String,
      required: true,
      enum: Object.values(ActivityAction),
      index: true,
    },

    // Human-readable description
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // What entity was affected
    targetType: {
      type: String,
      enum: ['application', 'scholarship', 'document', 'user', 'model', 'system', null],
      default: null,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetName: {
      type: String,
      default: '',
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // IP address for security auditing
    ipAddress: {
      type: String,
      default: '',
    },

    // Status of the action
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
  },
  {
    timestamps: true,
    collection: 'activitylogs',
  }
);

// Compound indexes for efficient queries
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ userRole: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

// TTL index — auto-delete logs older than 1 year
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = { ActivityLog, ActivityAction };
