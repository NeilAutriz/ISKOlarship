// =============================================================================
// ISKOlarship - Application Model
// Based on ERD: Application entity linking User and Scholarship
// =============================================================================

const mongoose = require('mongoose');

// =============================================================================
// Application Status Workflow
// =============================================================================

const ApplicationStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  DOCUMENTS_REQUIRED: 'documents_required',
  SHORTLISTED: 'shortlisted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WAITLISTED: 'waitlisted',
  WITHDRAWN: 'withdrawn'
};

// =============================================================================
// Document Sub-Schema
// =============================================================================

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  url: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  notes: String
}, { _id: true });

// =============================================================================
// Status History Sub-Schema
// =============================================================================

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: Object.values(ApplicationStatus),
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  notes: String,
  reason: String
}, { _id: true });

// =============================================================================
// Eligibility Check Sub-Schema
// =============================================================================

const eligibilityCheckSchema = new mongoose.Schema({
  criterion: {
    type: String,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  applicantValue: mongoose.Schema.Types.Mixed,
  requiredValue: mongoose.Schema.Types.Mixed,
  notes: String
}, { _id: false });

// =============================================================================
// Prediction Sub-Schema (from Logistic Regression)
// =============================================================================

const predictionSchema = new mongoose.Schema({
  probability: {
    type: Number,
    min: 0,
    max: 1
  },
  predictedOutcome: {
    type: String,
    enum: ['approved', 'rejected']
  },
  confidence: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  featureContributions: {
    gwa: Number,
    financialNeed: Number,
    yearLevel: Number,
    collegeMatch: Number,
    completenessScore: Number
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  modelVersion: String
}, { _id: false });

// =============================================================================
// Application Schema
// =============================================================================

const applicationSchema = new mongoose.Schema({
  // Core References
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Applicant is required']
  },
  scholarship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship',
    required: [true, 'Scholarship is required']
  },
  
  // Application Status
  status: {
    type: String,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.DRAFT
  },
  statusHistory: [statusHistorySchema],
  
  // Documents
  documents: [documentSchema],
  
  // Eligibility Verification
  eligibilityChecks: [eligibilityCheckSchema],
  passedAllEligibilityCriteria: {
    type: Boolean,
    default: false
  },
  eligibilityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // ML Prediction
  prediction: predictionSchema,
  
  // Applicant Snapshot (at time of application)
  applicantSnapshot: {
    gwa: Number,
    yearLevel: String,
    college: String,
    course: String,
    annualFamilyIncome: Number,
    unitsEnrolled: Number
  },
  
  // Application Content
  personalStatement: {
    type: String,
    maxlength: [5000, 'Personal statement cannot exceed 5000 characters']
  },
  additionalInfo: {
    type: String,
    maxlength: [2000, 'Additional info cannot exceed 2000 characters']
  },
  
  // Timeline
  submittedAt: Date,
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  reviewStartedAt: Date,
  decisionMadeAt: Date,
  
  // Review Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String,
  rejectionReason: String,
  
  // Academic Year Context
  academicYear: {
    type: String,
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY']
  },
  semester: {
    type: String,
    enum: ['First', 'Second', 'Midyear']
  },
  
  // Flags
  isComplete: {
    type: Boolean,
    default: false
  },
  hasAllRequiredDocuments: {
    type: Boolean,
    default: false
  },
  flaggedForReview: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  
  // Priority/Ranking (for review queue)
  priorityScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// =============================================================================
// Indexes
// =============================================================================

applicationSchema.index({ applicant: 1, scholarship: 1 }, { unique: true });
applicationSchema.index({ status: 1 });
applicationSchema.index({ scholarship: 1, status: 1 });
applicationSchema.index({ applicant: 1, status: 1 });
applicationSchema.index({ submittedAt: -1 });
applicationSchema.index({ 'prediction.probability': -1 });
applicationSchema.index({ academicYear: 1, semester: 1 });

// =============================================================================
// Pre-save Middleware
// =============================================================================

applicationSchema.pre('save', function(next) {
  // Update lastUpdatedAt
  this.lastUpdatedAt = new Date();
  
  // Check if all required documents are present
  // (This would need to cross-reference with scholarship requirements)
  
  next();
});

// =============================================================================
// Instance Methods
// =============================================================================

// Add status change to history
applicationSchema.methods.updateStatus = function(newStatus, userId, notes, reason) {
  const historyEntry = {
    status: newStatus,
    changedBy: userId,
    changedAt: new Date(),
    notes,
    reason
  };
  
  this.statusHistory.push(historyEntry);
  this.status = newStatus;
  
  // Update relevant timestamps
  if (newStatus === ApplicationStatus.SUBMITTED) {
    this.submittedAt = new Date();
  } else if (newStatus === ApplicationStatus.UNDER_REVIEW) {
    this.reviewStartedAt = new Date();
  } else if ([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED].includes(newStatus)) {
    this.decisionMadeAt = new Date();
  }
  
  return this;
};

// Add document
applicationSchema.methods.addDocument = function(document) {
  this.documents.push(document);
  return this;
};

// Verify document
applicationSchema.methods.verifyDocument = function(documentId, userId, notes) {
  const doc = this.documents.id(documentId);
  if (doc) {
    doc.verified = true;
    doc.verifiedBy = userId;
    doc.verifiedAt = new Date();
    doc.notes = notes;
  }
  return this;
};

// Calculate completion status
applicationSchema.methods.calculateCompleteness = function() {
  let completedFields = 0;
  let totalFields = 0;
  
  // Check basic info
  totalFields += 2;
  if (this.personalStatement) completedFields++;
  if (this.documents.length > 0) completedFields++;
  
  // Check documents (this would ideally check against scholarship requirements)
  // For now, we'll assume all documents need to be verified
  totalFields += this.documents.length;
  completedFields += this.documents.filter(d => d.verified).length;
  
  return {
    percentage: totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
    completedFields,
    totalFields
  };
};

// Get current status duration
applicationSchema.methods.getCurrentStatusDuration = function() {
  const lastChange = this.statusHistory[this.statusHistory.length - 1];
  if (!lastChange) return 0;
  
  return Math.ceil((new Date() - lastChange.changedAt) / (1000 * 60 * 60 * 24)); // days
};

// =============================================================================
// Static Methods
// =============================================================================

// Find by applicant
applicationSchema.statics.findByApplicant = function(applicantId) {
  return this.find({ applicant: applicantId })
    .populate('scholarship', 'name type sponsor applicationDeadline')
    .sort({ createdAt: -1 });
};

// Find by scholarship
applicationSchema.statics.findByScholarship = function(scholarshipId, status = null) {
  const query = { scholarship: scholarshipId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('applicant', 'firstName lastName email studentProfile')
    .sort({ submittedAt: -1 });
};

// Get pending review queue
applicationSchema.statics.getPendingReviewQueue = function(limit = 50) {
  return this.find({
    status: { $in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] }
  })
    .populate('applicant', 'firstName lastName email studentProfile')
    .populate('scholarship', 'name type applicationDeadline')
    .sort({ priorityScore: -1, submittedAt: 1 })
    .limit(limit);
};

// Get statistics for a scholarship
applicationSchema.statics.getScholarshipStats = async function(scholarshipId) {
  const stats = await this.aggregate([
    { $match: { scholarship: new mongoose.Types.ObjectId(scholarshipId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

// Get user application statistics
applicationSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { applicant: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

// =============================================================================
// Export
// =============================================================================

const Application = mongoose.model('Application', applicationSchema);

module.exports = {
  Application,
  ApplicationStatus
};
