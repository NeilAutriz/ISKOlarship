// =============================================================================
// ISKOlarship - Application Model
// Based on ERD: Application entity linking Student and Scholarship
// Aligned with Research Paper Entity Relationship Diagram
// =============================================================================

const mongoose = require('mongoose');

// =============================================================================
// Application Status Workflow (from ERD: application_status)
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
// Document Sub-Schema (from ERD: has_transcript, has_income_cert)
// =============================================================================

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    required: true,
    enum: [
      'transcript',
      'income_certificate',
      'certificate_of_registration',
      'grade_report',
      'barangay_certificate',
      'tax_return',
      'thesis_outline',
      'recommendation_letter',
      'personal_statement',
      'photo_id',
      'proof_of_enrollment',
      'text_response',
      'other'
    ]
  },
  url: String,
  cloudinaryPublicId: String, // Cloudinary public_id for deletion
  filePath: String,
  fileName: String,
  fileSize: Number,
  mimeType: String,
  // For text-type documents (no file upload, just text content)
  textContent: String,
  isTextDocument: {
    type: Boolean,
    default: false
  },
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
  verificationNotes: String,
  // OCR Verification Results
  ocrResult: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    rawText: { type: String },
    extractedFields: { type: mongoose.Schema.Types.Mixed },
    comparisonResults: [{
      field: { type: String },
      extracted: { type: mongoose.Schema.Types.Mixed },
      expected: { type: mongoose.Schema.Types.Mixed },
      match: { type: Boolean },
      similarity: { type: Number },
      difference: { type: Number },
      percentDifference: { type: String },
      severity: {
        type: String,
        enum: ['verified', 'warning', 'critical', 'unreadable'],
      },
    }],
    confidence: { type: Number, min: 0, max: 1 },
    overallMatch: {
      type: String,
      enum: ['verified', 'mismatch', 'partial', 'unreadable'],
    },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ocrProvider: { type: String, default: 'google_cloud_vision' },
    error: { type: String },
  }
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
// Eligibility Check Sub-Schema (from ERD: eligibility_percentage)
// =============================================================================

const eligibilityCheckSchema = new mongoose.Schema({
  criterion: {
    type: String,
    required: true
  },
  criterionType: {
    type: String,
    enum: ['gwa', 'income', 'classification', 'college', 'course', 'province', 'citizenship', 'scholarship_status', 'thesis', 'disciplinary', 'units', 'custom']
  },
  passed: {
    type: Boolean,
    required: true
  },
  applicantValue: mongoose.Schema.Types.Mixed,
  requiredValue: mongoose.Schema.Types.Mixed,
  weight: {
    type: Number,
    default: 1
  },
  notes: String
}, { _id: false });

// =============================================================================
// Prediction Sub-Schema (from ERD: prediction_score)
// Based on Logistic Regression from research paper
// =============================================================================

const predictionSchema = new mongoose.Schema({
  // prediction_score (from ERD) - Probability of approval
  probability: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Predicted outcome
  predictedOutcome: {
    type: String,
    enum: ['approved', 'rejected']
  },
  
  // Confidence level
  confidence: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  
  // Feature contributions (for explainability - from research paper)
  featureContributions: {
    gwa: { type: Number, default: 0 },
    financialNeed: { type: Number, default: 0 },
    yearLevel: { type: Number, default: 0 },
    collegeMatch: { type: Number, default: 0 },
    courseMatch: { type: Number, default: 0 },
    locationMatch: { type: Number, default: 0 },
    completenessScore: { type: Number, default: 0 }
  },
  
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  modelVersion: {
    type: String,
    default: '1.0.0'
  }
}, { _id: false });

// =============================================================================
// Application Schema (from ERD)
// =============================================================================

const applicationSchema = new mongoose.Schema({
  // =========================================================================
  // Core References (from ERD)
  // application_id: auto-generated (_id)
  // =========================================================================
  
  // student_id (from ERD) - Reference to applicant
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Applicant is required']
  },
  
  // scholarship_id (from ERD) - Reference to scholarship
  scholarship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship',
    required: [true, 'Scholarship is required']
  },
  
  // =========================================================================
  // Application Status (from ERD: application_status)
  // =========================================================================
  
  status: {
    type: String,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.DRAFT
  },
  
  statusHistory: [statusHistorySchema],
  
  // =========================================================================
  // Documents (from ERD: has_transcript, has_income_cert)
  // =========================================================================
  
  documents: [documentSchema],
  
  // Quick access flags from ERD
  hasTranscript: {
    type: Boolean,
    default: false
  },
  hasIncomeCertificate: {
    type: Boolean,
    default: false
  },
  hasCertificateOfRegistration: {
    type: Boolean,
    default: false
  },
  hasGradeReport: {
    type: Boolean,
    default: false
  },
  
  // =========================================================================
  // Eligibility (from ERD: eligibility_percentage)
  // =========================================================================
  
  eligibilityChecks: [eligibilityCheckSchema],
  
  passedAllEligibilityCriteria: {
    type: Boolean,
    default: false
  },
  
  // eligibility_percentage (from ERD)
  eligibilityPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Number of criteria passed vs total
  criteriaPassed: {
    type: Number,
    default: 0
  },
  criteriaTotal: {
    type: Number,
    default: 0
  },
  
  // =========================================================================
  // ML Prediction (from ERD: prediction_score)
  // =========================================================================
  
  prediction: predictionSchema,
  
  // =========================================================================
  // Applicant Snapshot (at time of application)
  // =========================================================================
  
  applicantSnapshot: {
    studentNumber: String,
    firstName: String,
    middleName: String,
    lastName: String,
    contactNumber: String,
    homeAddress: {
      street: String,
      barangay: String,
      city: String,
      province: String,
      zipCode: String,
      fullAddress: String
    },
    gwa: Number,
    classification: String,
    college: String,
    course: String,
    major: String,
    annualFamilyIncome: Number,
    unitsEnrolled: Number,
    unitsPassed: Number,
    provinceOfOrigin: String,
    citizenship: String,
    stBracket: String,
    hasExistingScholarship: Boolean,
    hasThesisGrant: Boolean,
    hasApprovedThesisOutline: Boolean,
    hasDisciplinaryAction: Boolean,
    hasFailingGrade: Boolean
  },
  
  // =========================================================================
  // Application Content
  // =========================================================================
  
  personalStatement: {
    type: String,
    maxlength: [5000, 'Personal statement cannot exceed 5000 characters']
  },
  
  additionalInfo: {
    type: String,
    maxlength: [2000, 'Additional info cannot exceed 2000 characters']
  },

  // =========================================================================
  // Custom Field Answers (scholarship-specific requirements filled by student)
  // =========================================================================
  
  customFieldAnswers: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // =========================================================================
  // Timeline (from ERD: applied_date, decision_date)
  // =========================================================================
  
  // applied_date (from ERD)
  appliedDate: Date,
  
  submittedAt: Date,
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  reviewStartedAt: Date,
  
  // decision_date (from ERD)
  decisionDate: Date,
  
  // =========================================================================
  // Review Information
  // =========================================================================
  
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String,
  rejectionReason: String,
  approvalNotes: String,
  
  // =========================================================================
  // Academic Year Context
  // =========================================================================
  
  academicYear: {
    type: String,
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY']
  },
  semester: {
    type: String,
    enum: ['First', 'Second', 'Midyear']
  },
  
  // =========================================================================
  // Completion Flags
  // =========================================================================
  
  isComplete: {
    type: Boolean,
    default: false
  },
  hasAllRequiredDocuments: {
    type: Boolean,
    default: false
  },
  
  // =========================================================================
  // Review Queue Priority
  // =========================================================================
  
  flaggedForReview: {
    type: Boolean,
    default: false
  },
  flagReason: String,
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
applicationSchema.index({ appliedDate: -1 });
applicationSchema.index({ 'prediction.probability': -1 });
applicationSchema.index({ eligibilityPercentage: -1 });
applicationSchema.index({ academicYear: 1, semester: 1 });

// =============================================================================
// Pre-save Middleware
// =============================================================================

applicationSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  
  // Update document flags
  this.hasTranscript = this.documents.some(d => d.documentType === 'transcript');
  this.hasIncomeCertificate = this.documents.some(d => d.documentType === 'income_certificate');
  this.hasCertificateOfRegistration = this.documents.some(d => d.documentType === 'certificate_of_registration');
  this.hasGradeReport = this.documents.some(d => d.documentType === 'grade_report');
  
  // Calculate eligibility percentage
  if (this.eligibilityChecks && this.eligibilityChecks.length > 0) {
    const passed = this.eligibilityChecks.filter(c => c.passed).length;
    const total = this.eligibilityChecks.length;
    this.criteriaPassed = passed;
    this.criteriaTotal = total;
    this.eligibilityPercentage = Math.round((passed / total) * 100);
    this.passedAllEligibilityCriteria = passed === total;
  }
  
  next();
});

// =============================================================================
// Instance Methods
// =============================================================================

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
    this.appliedDate = new Date();
  } else if (newStatus === ApplicationStatus.UNDER_REVIEW) {
    this.reviewStartedAt = new Date();
  } else if ([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED].includes(newStatus)) {
    this.decisionDate = new Date();
  }
  
  return this;
};

applicationSchema.methods.addDocument = function(document) {
  this.documents.push(document);
  return this;
};

applicationSchema.methods.verifyDocument = function(documentId, userId, notes) {
  const doc = this.documents.id(documentId);
  if (doc) {
    doc.verified = true;
    doc.verifiedBy = userId;
    doc.verifiedAt = new Date();
    doc.verificationNotes = notes;
  }
  return this;
};

applicationSchema.methods.calculateCompleteness = function() {
  let completedFields = 0;
  let totalFields = 0;
  
  totalFields += 2;
  if (this.personalStatement) completedFields++;
  if (this.documents.length > 0) completedFields++;
  
  totalFields += this.documents.length;
  completedFields += this.documents.filter(d => d.verified).length;
  
  return {
    percentage: totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
    completedFields,
    totalFields
  };
};

applicationSchema.methods.getCurrentStatusDuration = function() {
  const lastChange = this.statusHistory[this.statusHistory.length - 1];
  if (!lastChange) return 0;
  return Math.ceil((new Date() - lastChange.changedAt) / (1000 * 60 * 60 * 24));
};

// =============================================================================
// Static Methods
// =============================================================================

applicationSchema.statics.findByApplicant = function(applicantId) {
  return this.find({ applicant: applicantId })
    .populate('scholarship', 'name type sponsor applicationDeadline totalGrant')
    .sort({ createdAt: -1 });
};

applicationSchema.statics.findByScholarship = function(scholarshipId, status = null) {
  const query = { scholarship: scholarshipId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('applicant', 'email studentProfile')
    .sort({ submittedAt: -1 });
};

applicationSchema.statics.getPendingReviewQueue = function(limit = 50) {
  return this.find({
    status: { $in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] }
  })
    .populate('applicant', 'email studentProfile')
    .populate('scholarship', 'name type applicationDeadline')
    .sort({ priorityScore: -1, submittedAt: 1 })
    .limit(limit);
};

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

// Get historical data for logistic regression training
applicationSchema.statics.getHistoricalData = async function(filters = {}) {
  const query = {
    status: { $in: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED] },
    decisionDate: { $exists: true }
  };
  
  if (filters.scholarshipId) {
    query.scholarship = new mongoose.Types.ObjectId(filters.scholarshipId);
  }
  if (filters.academicYear) {
    query.academicYear = filters.academicYear;
  }
  
  return this.find(query)
    .select('applicantSnapshot status prediction eligibilityPercentage')
    .lean();
};

// =============================================================================
// Export
// =============================================================================

const Application = mongoose.model('Application', applicationSchema);

module.exports = {
  Application,
  ApplicationStatus
};
