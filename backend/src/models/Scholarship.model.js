// =============================================================================
// ISKOlarship - Scholarship Model
// Based on ERD: Scholarship entity with eligibility criteria
// Aligned with Research Paper Entity Relationship Diagram
// =============================================================================

const mongoose = require('mongoose');
const { UPLBCollege, Classification, STBracket, Citizenship } = require('./User.model');
const { 
  getCollegeCodes, 
  getDepartmentCodes, 
  getCollegeByCode,
  getDepartmentByCode,
  isDepartmentInCollege 
} = require('./UPLBStructure');

// Get valid college codes for enum
const ValidCollegeCodes = getCollegeCodes();

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

// Scholarship Levels (for admin scope management)
const ScholarshipLevel = {
  UNIVERSITY: 'university',
  COLLEGE: 'college',
  ACADEMIC_UNIT: 'academic_unit',  // Department or Institute
  EXTERNAL: 'external'
};

// scholarship_status (from ERD)
const ScholarshipStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived'
};

// =============================================================================
// Eligibility Criteria Sub-Schema (from ERD)
// Maps to: eligible_gwa, eligible_classification, eligible_income, 
// eligible_college, eligible_courses, eligible_citizenship
// =============================================================================

const eligibilityCriteriaSchema = new mongoose.Schema({
  // =========================================================================
  // Academic Requirements (from ERD)
  // UPLB GWA Scale: 1.0 (highest/best) to 5.0 (lowest/worst)
  // =========================================================================
  
  // Best GWA bound (e.g., 1.0 = no restriction on how good the GWA can be)
  // Used only for elite scholarships like Dean's List
  minGWA: {
    type: Number,
    min: 1.0,
    max: 5.0
  },
  // Required GWA threshold — student's GWA must be ≤ this value to qualify
  // e.g., maxGWA: 2.0 means "must have GWA of 2.0 or better (lower)"
  maxGWA: {
    type: Number,
    min: 1.0,
    max: 5.0,
    default: 5.0
  },
  
  // eligible_classification (from ERD) - Required year levels
  eligibleClassifications: [{
    type: String,
    enum: Object.values(Classification)
  }],
  
  // Minimum units enrolled requirement
  minUnitsEnrolled: {
    type: Number,
    min: 0
  },
  
  // Minimum units passed (for thesis grants)
  minUnitsPassed: {
    type: Number,
    min: 0
  },
  
  // eligible_college (from ERD) - Eligible colleges
  eligibleColleges: [{
    type: String,
    enum: Object.values(UPLBCollege)
  }],
  
  // eligible_courses (from ERD) - Specific courses
  eligibleCourses: [String],
  
  // Specific majors within courses
  eligibleMajors: [String],
  
  // =========================================================================
  // Financial Requirements (from ERD)
  // =========================================================================
  
  // eligible_income (from ERD) - Maximum family income
  maxAnnualFamilyIncome: {
    type: Number,
    min: 0
  },
  minAnnualFamilyIncome: {
    type: Number,
    min: 0
  },
  
  // Required ST Brackets
  eligibleSTBrackets: [{
    type: String,
    enum: Object.values(STBracket)
  }],
  
  // =========================================================================
  // Location Requirements (from ERD - via province_of_origin)
  // =========================================================================
  
  // Eligible provinces (for location-based scholarships)
  eligibleProvinces: [String],
  
  // =========================================================================
  // Citizenship Requirements (from ERD)
  // =========================================================================
  
  // eligible_citizenship (from ERD)
  eligibleCitizenship: [{
    type: String,
    enum: Object.values(Citizenship)
  }],
  
  // =========================================================================
  // Academic Status Requirements
  // =========================================================================
  
  // Requires approved thesis outline
  requiresApprovedThesisOutline: {
    type: Boolean,
    default: false
  },
  
  // Must not have other scholarship
  mustNotHaveOtherScholarship: {
    type: Boolean,
    default: false
  },
  
  // Must not have thesis grant (for non-thesis scholarships)
  mustNotHaveThesisGrant: {
    type: Boolean,
    default: false
  },
  
  // Must not have disciplinary action
  mustNotHaveDisciplinaryAction: {
    type: Boolean,
    default: false
  },
  
  // Must not have failing grades (grade of 5)
  mustNotHaveFailingGrade: {
    type: Boolean,
    default: false
  },
  
  // Must not have grade of 4
  mustNotHaveGradeOf4: {
    type: Boolean,
    default: false
  },
  
  // Must not have incomplete grade
  mustNotHaveIncompleteGrade: {
    type: Boolean,
    default: false
  },
  
  // Must be graduating this semester
  mustBeGraduating: {
    type: Boolean,
    default: false
  },
  
  // =========================================================================
  // Custom Conditions (Dynamic, admin-configurable)
  // =========================================================================
  
  // Custom conditions that can be automatically evaluated
  // Each condition specifies: type, field, operator, value
  customConditions: [{
    // Unique identifier for this condition
    id: {
      type: String,
      required: true
    },
    // Display name
    name: {
      type: String,
      required: true
    },
    // Description for students
    description: String,
    // Condition type: 'range', 'boolean', 'list'
    conditionType: {
      type: String,
      enum: ['range', 'boolean', 'list'],
      required: true
    },
    // Field to check from student profile
    studentField: {
      type: String,
      required: true
    },
    // Operator for comparison
    operator: {
      type: String,
      required: true
      // For range: 'lt', 'lte', 'gt', 'gte', 'eq', 'between'
      // For boolean: 'is', 'isNot', 'isTruthy', 'isFalsy'
      // For list: 'in', 'notIn', 'includes'
    },
    // Value(s) to compare against
    value: {
      type: mongoose.Schema.Types.Mixed
      // For range: number or { min, max }
      // For boolean: true/false
      // For list: array of values
    },
    // Category for grouping
    category: {
      type: String,
      enum: ['academic', 'financial', 'status', 'location', 'demographic', 'custom'],
      default: 'custom'
    },
    // Importance level
    importance: {
      type: String,
      enum: ['required', 'preferred', 'optional'],
      default: 'required'
    },
    // Whether this condition is active
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // =========================================================================
  // Additional Custom Requirements (Text-based, manual verification)
  // =========================================================================
  
  additionalRequirements: [{
    description: String,
    isRequired: {
      type: Boolean,
      default: true
    }
  }]
}, { _id: false });

// =============================================================================
// Scholarship Schema (from ERD)
// =============================================================================

const scholarshipSchema = new mongoose.Schema({
  // =========================================================================
  // Basic Information (from ERD)
  // scholarship_id: auto-generated (_id)
  // =========================================================================
  
  // name (from ERD)
  name: {
    type: String,
    required: [true, 'Scholarship name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  
  // description (from ERD)
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [3000, 'Description cannot exceed 3000 characters']
  },
  
  // Sponsor organization
  sponsor: {
    type: String,
    required: [true, 'Sponsor is required'],
    trim: true
  },
  
  // Scholarship type
  type: {
    type: String,
    enum: Object.values(ScholarshipType),
    required: [true, 'Scholarship type is required']
  },
  
  // =========================================================================
  // Scholarship Level & Management Scope (for admin visibility)
  // =========================================================================
  
  // Scholarship level determines which admins can see/manage it
  scholarshipLevel: {
    type: String,
    enum: Object.values(ScholarshipLevel),
    default: ScholarshipLevel.UNIVERSITY,
    index: true
  },

  // =========================================================================
  // Management Scope - Uses UPLB Structure Codes
  // =========================================================================

  // College code that manages this scholarship (for college/department level)
  // Uses codes like 'CAS', 'CEAT', 'CEM' etc.
  managingCollegeCode: {
    type: String,
    enum: [...ValidCollegeCodes, null],
    default: null,
    index: true
  },

  // Academic Unit code (Department/Institute) that manages this scholarship
  // Uses codes like 'ICS', 'DCHE', 'DAE', 'IMSP' etc.
  managingAcademicUnitCode: {
    type: String,
    default: null,
    trim: true,
    index: true
  },

  // Legacy fields - kept for backward compatibility
  // Will be auto-populated from codes
  managingCollege: {
    type: String,
    enum: [...Object.values(UPLBCollege), null],
    default: null,
    index: true
  },

  managingAcademicUnit: {
    type: String,
    default: null,
    trim: true,
    index: true
  },
  
  // =========================================================================
  // Financial Details (from ERD)
  // =========================================================================
  
  // total_grant (from ERD) - Award amount
  totalGrant: {
    type: Number,
    min: 0
  },
  
  // Award description (e.g., "₱100,000/year", "Full tuition")
  awardDescription: {
    type: String,
    trim: true
  },
  
  // =========================================================================
  // Eligibility Criteria (from ERD)
  // =========================================================================
  
  eligibilityCriteria: {
    type: eligibilityCriteriaSchema,
    required: true
  },
  
  // =========================================================================
  // Required Documents
  // =========================================================================
  
  requiredDocuments: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    isRequired: {
      type: Boolean,
      default: true
    },
    fileType: {
      type: String,
      enum: ['any', 'pdf', 'image', 'text'],
      default: 'any'
    }
  }],
  
  // =========================================================================
  // Timeline (from ERD)
  // =========================================================================
  
  // deadline (from ERD)
  applicationDeadline: {
    type: Date,
    required: [true, 'Application deadline is required']
  },
  
  // Application start date
  applicationStartDate: {
    type: Date
  },
  
  // Academic year context
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
  
  // =========================================================================
  // Capacity
  // =========================================================================
  
  // Number of available slots
  slots: {
    type: Number,
    min: 0
  },
  
  // Filled slots count
  filledSlots: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // =========================================================================
  // Status (from ERD)
  // =========================================================================
  
  // scholarship_status (from ERD)
  status: {
    type: String,
    enum: Object.values(ScholarshipStatus),
    default: ScholarshipStatus.DRAFT
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // =========================================================================
  // Metadata (from ERD - admin_id relationship)
  // =========================================================================
  
  // admin_id (from ERD) - Created by admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // =========================================================================
  // Contact Information
  // =========================================================================
  
  contactEmail: String,
  contactPhone: String,
  websiteUrl: String,
  applicationUrl: String,
  
  // =========================================================================
  // Tags for search/filtering
  // =========================================================================
  
  tags: [String]
  
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
scholarshipSchema.index({ 'eligibilityCriteria.eligibleClassifications': 1 });
scholarshipSchema.index({ 'eligibilityCriteria.eligibleProvinces': 1 });
scholarshipSchema.index({ isActive: 1, status: 1 });
// Index for admin scope filtering
scholarshipSchema.index({ scholarshipLevel: 1, managingCollegeCode: 1, managingAcademicUnitCode: 1 });

// =============================================================================
// Pre-save Middleware - Auto-populate legacy fields and validate scope
// =============================================================================

scholarshipSchema.pre('save', function(next) {
  
  // Auto-populate legacy managingCollege from managingCollegeCode
  if (this.managingCollegeCode) {
    const collegeInfo = getCollegeByCode(this.managingCollegeCode);
    if (collegeInfo) {
      this.managingCollege = collegeInfo.name;
    }
  } else {
    this.managingCollege = null;
  }

  // Validate academic unit belongs to college and auto-populate name
  if (this.managingAcademicUnitCode && this.managingCollegeCode) {
    if (!isDepartmentInCollege(this.managingAcademicUnitCode, this.managingCollegeCode)) {
      return next(new Error(`Academic unit ${this.managingAcademicUnitCode} does not belong to college ${this.managingCollegeCode}`));
    }
    // Look up the full name from UPLBStructure
    const deptInfo = getDepartmentByCode(this.managingAcademicUnitCode);
    this.managingAcademicUnit = deptInfo ? deptInfo.name : this.managingAcademicUnitCode;
  } else {
    this.managingAcademicUnit = null;
  }

  // Validate scope consistency
  if (this.scholarshipLevel === 'academic_unit' && !this.managingAcademicUnitCode) {
    return next(new Error('Academic unit level scholarship must have a managingAcademicUnitCode'));
  }
  if (this.scholarshipLevel === 'college' && !this.managingCollegeCode) {
    return next(new Error('College-level scholarship must have a managingCollegeCode'));
  }
  if (this.scholarshipLevel === 'academic_unit' && !this.managingCollegeCode) {
    return next(new Error('Academic unit level scholarship must have a managingCollegeCode'));
  }
  
  // Clear codes for university/external level
  if (this.scholarshipLevel === 'university' || this.scholarshipLevel === 'external') {
    this.managingCollegeCode = null;
    this.managingAcademicUnitCode = null;
    this.managingCollege = null;
    this.managingAcademicUnit = null;
  }

  next();
});

// =============================================================================
// Virtual Properties
// =============================================================================

scholarshipSchema.virtual('isExpired').get(function() {
  return new Date() > this.applicationDeadline;
});

scholarshipSchema.virtual('remainingSlots').get(function() {
  if (!this.slots) return null;
  return Math.max(0, this.slots - this.filledSlots);
});

scholarshipSchema.virtual('daysUntilDeadline').get(function() {
  const now = new Date();
  const deadline = new Date(this.applicationDeadline);
  const diffTime = deadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

scholarshipSchema.virtual('isOpen').get(function() {
  const now = new Date();
  const startOpen = !this.applicationStartDate || now >= this.applicationStartDate;
  return startOpen && !this.isExpired && this.status === ScholarshipStatus.ACTIVE;
});

// =============================================================================
// Instance Methods
// =============================================================================

scholarshipSchema.methods.isAcceptingApplications = function() {
  return (
    this.isActive &&
    this.status === ScholarshipStatus.ACTIVE &&
    !this.isExpired &&
    (this.remainingSlots === null || this.remainingSlots > 0)
  );
};

scholarshipSchema.methods.getEligibilitySummary = function() {
  const criteria = this.eligibilityCriteria;
  const summary = [];
  
  if (criteria.minGWA && criteria.minGWA > 1.0) {
    summary.push(`GWA Range: ${criteria.minGWA.toFixed(2)} to ${(criteria.maxGWA || 5.0).toFixed(2)}`);
  } else if (criteria.maxGWA && criteria.maxGWA < 5.0) {
    summary.push(`Required GWA: ${criteria.maxGWA.toFixed(2)} or better`);
  }
  if (criteria.eligibleClassifications?.length) {
    summary.push(`Year Level: ${criteria.eligibleClassifications.join(', ')}`);
  }
  if (criteria.eligibleColleges?.length) {
    summary.push(`Colleges: ${criteria.eligibleColleges.length} eligible`);
  }
  if (criteria.eligibleCourses?.length) {
    summary.push(`Courses: ${criteria.eligibleCourses.join(', ')}`);
  }
  if (criteria.maxAnnualFamilyIncome) {
    summary.push(`Max Family Income: ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`);
  }
  if (criteria.eligibleProvinces?.length) {
    summary.push(`Provinces: ${criteria.eligibleProvinces.join(', ')}`);
  }
  if (criteria.mustNotHaveOtherScholarship) {
    summary.push('Must not be a recipient of other scholarship');
  }
  if (criteria.requiresApprovedThesisOutline) {
    summary.push('Must have approved thesis outline');
  }
  
  return summary;
};

// =============================================================================
// Static Methods
// =============================================================================

scholarshipSchema.statics.findActive = function() {
  return this.find({
    isActive: true,
    status: ScholarshipStatus.ACTIVE,
    applicationDeadline: { $gte: new Date() }
  }).sort({ applicationDeadline: 1 });
};

scholarshipSchema.statics.findByType = function(type) {
  return this.find({
    type,
    isActive: true,
    status: ScholarshipStatus.ACTIVE
  });
};

scholarshipSchema.statics.search = function(query) {
  return this.find({
    $text: { $search: query },
    isActive: true
  }).sort({ score: { $meta: 'textScore' } });
};

scholarshipSchema.statics.findForStudent = async function(studentProfile) {
  // Find scholarships matching student's basic profile
  const query = {
    isActive: true,
    status: ScholarshipStatus.ACTIVE,
    applicationDeadline: { $gte: new Date() }
  };
  
  // Filter by college if specified in criteria
  if (studentProfile.college) {
    query.$or = [
      { 'eligibilityCriteria.eligibleColleges': { $size: 0 } },
      { 'eligibilityCriteria.eligibleColleges': studentProfile.college }
    ];
  }
  
  return this.find(query).sort({ applicationDeadline: 1 });
};

// =============================================================================
// Export
// =============================================================================

const Scholarship = mongoose.model('Scholarship', scholarshipSchema);

module.exports = {
  Scholarship,
  ScholarshipType,
  ScholarshipLevel,
  ScholarshipStatus
};
