// =============================================================================
// ISKOlarship - Notification Model
// In-app notifications for application & document status updates
// =============================================================================

const mongoose = require('mongoose');

const NotificationType = {
  APPLICATION_APPROVED: 'application_approved',
  APPLICATION_REJECTED: 'application_rejected',
  APPLICATION_UNDER_REVIEW: 'application_under_review',
  DOCUMENT_VERIFIED: 'document_verified',
  DOCUMENT_REJECTED: 'document_rejected',
  DOCUMENT_RESUBMIT: 'document_resubmit',
  ALL_DOCUMENTS_VERIFIED: 'all_documents_verified',
};

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(NotificationType),
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    metadata: {
      scholarshipName: String,
      documentName: String,
      applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
      reason: String,
      remarks: String,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries: user's unread notifications, newest first
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// Auto-delete notifications older than 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification, NotificationType };
