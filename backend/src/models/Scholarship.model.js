// =============================================================================
// ISKOlarship - Scholarship Model
// Based on ERD: Scholarship entity with eligibility criteria
// =============================================================================

const mongoose = require('mongoose');
const { UPLBCollege, YearLevel, STBracket } = require('./User.model');

// =============================================================================
// Scholarship Types (from research paper)
// =============================================================================

const ScholarshipType = {
  UNIVERSITY: 'University Scholarship',
  COLLEGE: 'College Scholarship',
  GOVERNMENT: 'Government Scholarship',
  PRIVATE: 'Private Scholarship',
  THESIS_GRANT: 'Thesis/Research Grant'
};

const ScholarshipStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived'
};

// =============================================================================
// Eligibility Criteria Sub-Schema
// =============================================================================

const eligibilityCriteriaSchema = new mongoose.Schema({
  // Academic Requirements
  minGWA: {
    type: Number,
    min: 1.0,
    max: 5.0
  },
  maxGWA: {
    type: Number,
    min: 1.0,
    max: 5.0
  },
  requiredYearLevels: [{
    type: String,
    enum: Object.values(YearLevel)
  }],
  minUnitsEnrolled: Number,
  eligibleColleges: [{
    type: String,
    enum: Object.values(UPLBCollege)
  }],
  eligibleCourses: [String],
  eligibleMajors: [String],
  
  // Financial Requirements
  maxAnnualFamilyIncome: Number,
  minAnnualFamilyIncome: Number,
  requiredSTBrackets: [{
    type: String,
    enum: Object.values(STBracket)
  }],
  
  // Location Requirements
  eligibleProvinces: [String],
  
  // Other Requirements
  requiresApprovedThesis: {
    type: Boolean,
    default: false
  },
  mustNotHaveOtherScholarship: {
    type: Boolean,
    default: false
  },
  mustNotHaveThesisGrant: {
    type: Boolean,
    default: false
  },
  mustNotHaveDisciplinaryAction: {
    type: Boolean,
    default: false
  },
  mustNotHaveFailingGrade: {
    type: Boolean,
    default: false
  },
  isFilipinoOnly: {
    type: Boolean,
    default: true
  },
  
  // Additional custom requirements (free text)
  additionalRequirements: [String]
}, { _id: false });

// =============================================================================
// Scholarship Schema
// =============================================================================

const scholarshipSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Scholarship name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  sponsor: {
    type: String,
    required: [true, 'Sponsor is required'],
    trim: true
  },
  type: {
    type: String,
    enum: Object.values(ScholarshipType),
    required: [true, 'Scholarship type is required']
  },
  
  // Financial Details
  awardAmount: {
    type: Number,
    min: 0
  },
  awardDescription: String,
  
  // Eligibility
  eligibilityCriteria: {
    type: eligibilityCriteriaSchema,
    required: true
  },
  
  // Required Documents
  requirements: [{
    type: String,
    trim: true
  }],
  
  // Timeline
  applicationDeadline: {
    type: Date,
    required: [true, 'Application deadline is required']
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY']
  },
  semester: {
    type: String,
    enum: ['First', 'Second', 'Midyear'],
    required: true
  },
  
  // Capacity
  slots: {
    type: Number,
    min: 0
  },
  filledSlots: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: Object.values(ScholarshipStatus),
    default: ScholarshipStatus.DRAFT
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Tags for search/filtering
  tags: [String],
  
  // Contact Information
  contactEmail: String,
  contactPhone: String,
  websiteUrl: String
}, {
  timestamps: true
});

// =============================================================================
// Indexes
// =============================================================================

scholarshipSchema.index({ name: 'text', description: 'text', sponsor: 'text' });
scholarshipSchema.index({ type: 1 });
scholarshipSchema.index({ status: 1 });
scholarshipSchema.index({ applicationDeadline: 1 });
scholarshipSchema.index({ 'eligibilityCriteria.eligibleColleges': 1 });
scholarshipSchema.index({ 'eligibilityCriteria.requiredYearLevels': 1 });
scholarshipSchema.index({ isActive: 1, status: 1 });

// =============================================================================
// Virtual Properties
// =============================================================================

// Check if deadline has passed
scholarshipSchema.virtual('isExpired').get(function() {
  return new Date() > this.applicationDeadline;
});

// Get remaining slots
scholarshipSchema.virtual('remainingSlots').get(function() {
  if (!this.slots) return null;
  return Math.max(0, this.slots - this.filledSlots);
});

// Days until deadline
scholarshipSchema.virtual('daysUntilDeadline').get(function() {
  const now = new Date();
  const deadline = new Date(this.applicationDeadline);
  const diffTime = deadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// =============================================================================
// Instance Methods
// =============================================================================

// Check if scholarship is currently accepting applications
scholarshipSchema.methods.isAcceptingApplications = function() {
  return (
    this.isActive &&
    this.status === ScholarshipStatus.ACTIVE &&
    !this.isExpired &&
    (this.remainingSlots === null || this.remainingSlots > 0)
  );
};

// Get eligibility summary
scholarshipSchema.methods.getEligibilitySummary = function() {
  const criteria = this.eligibilityCriteria;
  const summary = [];
  
  if (criteria.minGWA) {
    summary.push(`Minimum GWA: ${criteria.minGWA.toFixed(2)}`);
  }
  if (criteria.requiredYearLevels?.length) {
    summary.push(`Year Level: ${criteria.requiredYearLevels.join(', ')}`);
  }
  if (criteria.eligibleColleges?.length) {
    summary.push(`Colleges: ${criteria.eligibleColleges.length} eligible`);
  }
  if (criteria.maxAnnualFamilyIncome) {
    summary.push(`Max Income: ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`);
  }
  
  return summary;
};

// =============================================================================
// Static Methods
// =============================================================================

// Find active scholarships
scholarshipSchema.statics.findActive = function() {
  return this.find({
    isActive: true,
    status: ScholarshipStatus.ACTIVE,
    applicationDeadline: { $gte: new Date() }
  }).sort({ applicationDeadline: 1 });
};

// Find by type
scholarshipSchema.statics.findByType = function(type) {
  return this.find({
    type,
    isActive: true,
    status: ScholarshipStatus.ACTIVE
  });
};

// Search scholarships
scholarshipSchema.statics.search = function(query) {
  return this.find({
    $text: { $search: query },
    isActive: true
  }).sort({ score: { $meta: 'textScore' } });
};

// =============================================================================
// Export
// =============================================================================

const Scholarship = mongoose.model('Scholarship', scholarshipSchema);

module.exports = {
  Scholarship,
  ScholarshipType,
  ScholarshipStatus
};
