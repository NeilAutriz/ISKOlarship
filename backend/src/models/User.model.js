// =============================================================================
// ISKOlarship - User Model
// Based on ERD: User entity with Student and Admin profiles
// =============================================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// =============================================================================
// Enums (matching frontend types)
// =============================================================================

const UserRole = {
  STUDENT: 'student',
  ADMIN: 'admin'
};

const YearLevel = {
  FRESHMAN: 'Freshman',
  SOPHOMORE: 'Sophomore',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
  GRADUATE: 'Graduate'
};

const UPLBCollege = {
  CAS: 'College of Arts and Sciences',
  CAFS: 'College of Agriculture and Food Science',
  CEM: 'College of Economics and Management',
  CEAT: 'College of Engineering and Agro-Industrial Technology',
  CFNR: 'College of Forestry and Natural Resources',
  CHE: 'College of Human Ecology',
  CVM: 'College of Veterinary Medicine',
  CDC: 'College of Development Communication',
  CPAF: 'College of Public Affairs and Development',
  GS: 'Graduate School'
};

const STBracket = {
  FULL_DISCOUNT: 'Full Discount',
  PD80: 'PD80',
  PD60: 'PD60',
  PD40: 'PD40',
  PD20: 'PD20',
  NO_DISCOUNT: 'No Discount'
};

const AdminAccessLevel = {
  UNIVERSITY: 'university',
  COLLEGE: 'college',
  DEPARTMENT: 'department'
};

// =============================================================================
// User Schema
// =============================================================================

const userSchema = new mongoose.Schema({
  // Authentication Fields
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: true,
    default: UserRole.STUDENT
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // ==========================================================================
  // Student Profile Fields (populated when role === 'student')
  // ==========================================================================
  studentProfile: {
    // Personal Information
    studentNumber: {
      type: String,
      sparse: true, // Allow null but unique when present
      unique: true
    },
    firstName: String,
    middleName: String,
    lastName: String,
    suffix: String,
    birthDate: Date,
    contactNumber: String,
    
    // Address Information
    permanentAddress: {
      street: String,
      barangay: String,
      city: String,
      province: String,
      zipCode: String
    },
    currentAddress: {
      street: String,
      barangay: String,
      city: String,
      province: String,
      zipCode: String
    },
    
    // Academic Information
    college: {
      type: String,
      enum: Object.values(UPLBCollege)
    },
    course: String,
    major: String,
    yearLevel: {
      type: String,
      enum: Object.values(YearLevel)
    },
    gwa: {
      type: Number,
      min: 1.0,
      max: 5.0
    },
    unitsEnrolled: Number,
    expectedGraduationYear: Number,
    
    // Financial Information
    annualFamilyIncome: Number,
    householdSize: Number,
    stBracket: {
      type: String,
      enum: Object.values(STBracket)
    },
    
    // Scholarship Status
    hasExistingScholarship: {
      type: Boolean,
      default: false
    },
    existingScholarshipName: String,
    hasThesisGrant: {
      type: Boolean,
      default: false
    },
    
    // Academic Status
    hasDisciplinaryAction: {
      type: Boolean,
      default: false
    },
    hasFailingGrade: {
      type: Boolean,
      default: false
    },
    hasIncompleteGrade: {
      type: Boolean,
      default: false
    },
    
    // Profile Completion
    profileCompleted: {
      type: Boolean,
      default: false
    }
  },
  
  // ==========================================================================
  // Admin Profile Fields (populated when role === 'admin')
  // ==========================================================================
  adminProfile: {
    firstName: String,
    lastName: String,
    department: String,
    college: {
      type: String,
      enum: Object.values(UPLBCollege)
    },
    accessLevel: {
      type: String,
      enum: Object.values(AdminAccessLevel),
      default: AdminAccessLevel.DEPARTMENT
    },
    permissions: [String]
  }
}, {
  timestamps: true
});

// =============================================================================
// Indexes (only for non-unique fields, unique fields auto-create indexes)
// =============================================================================

userSchema.index({ 'studentProfile.college': 1 });
userSchema.index({ 'studentProfile.yearLevel': 1 });
userSchema.index({ role: 1 });

// =============================================================================
// Pre-save Middleware - Hash Password
// =============================================================================

userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  // Hash password with bcrypt
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// =============================================================================
// Instance Methods
// =============================================================================

// Compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Check if student profile is complete
userSchema.methods.isProfileComplete = function() {
  if (this.role !== UserRole.STUDENT) return true;
  
  const profile = this.studentProfile;
  return !!(
    profile?.firstName &&
    profile?.lastName &&
    profile?.college &&
    profile?.course &&
    profile?.yearLevel &&
    profile?.gwa !== undefined &&
    profile?.annualFamilyIncome !== undefined
  );
};

// =============================================================================
// Static Methods
// =============================================================================

// Find student by student number
userSchema.statics.findByStudentNumber = function(studentNumber) {
  return this.findOne({ 'studentProfile.studentNumber': studentNumber });
};

// Find all students in a college
userSchema.statics.findByCollege = function(college) {
  return this.find({ 
    role: UserRole.STUDENT,
    'studentProfile.college': college 
  });
};

// =============================================================================
// Export
// =============================================================================

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  UserRole,
  YearLevel,
  UPLBCollege,
  STBracket,
  AdminAccessLevel
};
