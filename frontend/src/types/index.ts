// ============================================================================
// ISKOlarship Type Definitions
// Based on Entity Relationship Diagram from the Research Paper
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  GUEST = 'guest',
  STUDENT = 'student',
  ADMIN = 'admin'
}

export enum AdminAccessLevel {
  UNIVERSITY = 'university',      // Manages all scholarships institution-wide
  COLLEGE = 'college',            // Oversees programs within their college
  ACADEMIC_UNIT = 'academic_unit' // Handles department/institute-specific offerings
}

export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum YearLevel {
  INCOMING_FRESHMAN = 'Incoming Freshman',
  FRESHMAN = 'Freshman',
  SOPHOMORE = 'Sophomore',
  JUNIOR = 'Junior',
  SENIOR = 'Senior',
  GRADUATE = 'Graduate'
}

export enum ScholarshipType {
  UNIVERSITY = 'University Scholarship',
  COLLEGE = 'College Scholarship',
  GOVERNMENT = 'Government Scholarship',
  PRIVATE = 'Private Scholarship',
  THESIS_GRANT = 'Thesis/Research Grant'
}

// New: Scholarship Level for admin scope management
export enum ScholarshipLevel {
  UNIVERSITY = 'university',     // Managed by university admins, visible to all
  COLLEGE = 'college',           // Managed by college admins
  ACADEMIC_UNIT = 'academic_unit', // Managed by department/institute admins
  EXTERNAL = 'external'          // External scholarships (DOST, CHED, private foundations)
}

export enum STBracket {
  FULL_DISCOUNT_WITH_STIPEND = 'FDS',
  FULL_DISCOUNT = 'FD',
  PD80 = 'PD80',
  PD60 = 'PD60',
  PD40 = 'PD40',
  PD20 = 'PD20',
  NO_DISCOUNT = 'ND'
}

// ============================================================================
// CUSTOM CONDITION TYPES
// ============================================================================

export enum ConditionType {
  RANGE = 'range',
  BOOLEAN = 'boolean',
  LIST = 'list'
}

export enum RangeOperator {
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  EQUAL = 'eq',
  NOT_EQUAL = 'neq',
  BETWEEN = 'between',
  BETWEEN_EXCLUSIVE = 'between_exclusive',
  OUTSIDE = 'outside'
}

export enum BooleanOperator {
  IS = 'is',
  IS_NOT = 'is_not',
  IS_TRUE = 'is_true',
  IS_FALSE = 'is_false',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists'
}

export enum ListOperator {
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  CONTAINS_ALL = 'contains_all',
  CONTAINS_ANY = 'contains_any',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  MATCHES_ANY = 'matches_any',
  MATCHES_ALL = 'matches_all'
}

export enum ConditionCategory {
  ACADEMIC = 'academic',
  FINANCIAL = 'financial',
  DEMOGRAPHIC = 'demographic',
  ENROLLMENT = 'enrollment',
  CUSTOM = 'custom'
}

export enum ConditionImportance {
  REQUIRED = 'required',
  PREFERRED = 'preferred',
  OPTIONAL = 'optional'
}

/**
 * Available student profile fields that can be used in custom conditions
 * The last entry '__custom__' allows admins to type their own field names
 */
export const STUDENT_PROFILE_FIELDS = [
  { value: 'gwa', label: 'GWA', type: 'range' as ConditionType, category: 'academic' },
  { value: 'annualFamilyIncome', label: 'Annual Family Income', type: 'range' as ConditionType, category: 'financial' },
  { value: 'unitsEnrolled', label: 'Units Enrolled', type: 'range' as ConditionType, category: 'academic' },
  { value: 'householdSize', label: 'Household Size', type: 'range' as ConditionType, category: 'financial' },
  { value: 'yearLevel', label: 'Year Level', type: 'list' as ConditionType, category: 'enrollment' },
  { value: 'college', label: 'College', type: 'list' as ConditionType, category: 'enrollment' },
  { value: 'course', label: 'Course/Program', type: 'list' as ConditionType, category: 'enrollment' },
  { value: 'stBracket', label: 'ST Bracket', type: 'list' as ConditionType, category: 'financial' },
  { value: 'citizenship', label: 'Citizenship', type: 'list' as ConditionType, category: 'demographic' },
  { value: 'hometown', label: 'Province of Origin', type: 'list' as ConditionType, category: 'demographic' },
  { value: 'isFilipino', label: 'Is Filipino Citizen', type: 'boolean' as ConditionType, category: 'demographic' },
  { value: 'hasExistingScholarship', label: 'Has Existing Scholarship', type: 'boolean' as ConditionType, category: 'financial' },
  { value: 'hasThesisGrant', label: 'Has Thesis Grant', type: 'boolean' as ConditionType, category: 'academic' },
  { value: 'hasDisciplinaryRecord', label: 'Has Disciplinary Record', type: 'boolean' as ConditionType, category: 'demographic' },
  { value: 'hasFailingGrade', label: 'Has Failing Grade', type: 'boolean' as ConditionType, category: 'academic' },
  { value: 'hasGradeOf4', label: 'Has Grade of 4.0', type: 'boolean' as ConditionType, category: 'academic' },
  { value: 'hasIncompleteGrade', label: 'Has Incomplete Grade', type: 'boolean' as ConditionType, category: 'academic' },
  { value: 'isGraduating', label: 'Is Graduating', type: 'boolean' as ConditionType, category: 'academic' },
  { value: 'hasThesisApproval', label: 'Has Thesis Approval', type: 'boolean' as ConditionType, category: 'academic' },
  // Special option for admin-defined custom fields
  { value: '__custom__', label: '✏️ Custom Field (type your own)', type: 'range' as ConditionType, category: 'custom', isCustomEntry: true }
] as const;

/**
 * Custom condition for dynamic eligibility criteria
 */
export interface CustomCondition {
  id: string;
  name: string;
  description?: string;
  conditionType: ConditionType;
  studentField: string;
  operator: RangeOperator | BooleanOperator | ListOperator;
  value: number | boolean | string | string[] | { min?: number; max?: number };
  category: ConditionCategory;
  importance: ConditionImportance;
  isActive: boolean;
}

// ============================================================================
// UPLB COLLEGES
// ============================================================================

export enum UPLBCollege {
  CAS = 'College of Arts and Sciences',
  CAFS = 'College of Agriculture and Food Science',
  CEM = 'College of Economics and Management',
  CEAT = 'College of Engineering and Agro-Industrial Technology',
  CFNR = 'College of Forestry and Natural Resources',
  CHE = 'College of Human Ecology',
  CVM = 'College of Veterinary Medicine',
  CDC = 'College of Development Communication',
  CPAF = 'College of Public Affairs and Development',
  GS = 'Graduate School'
}

// ============================================================================
// UPLB COURSES BY COLLEGE
// ============================================================================

export const UPLBCourses: Record<UPLBCollege, string[]> = {
  [UPLBCollege.CAS]: [
    'BS Biology',
    'BS Chemistry',
    'BS Mathematics',
    'BS Applied Mathematics',
    'BS Statistics',
    'BS Computer Science',
    'BS Applied Physics',
    'BA Philosophy',
    'BA Sociology',
    'BA Communication Arts',
    'BS Mathematics and Science Teaching'
  ],
  [UPLBCollege.CAFS]: [
    'BS Agriculture',
    'BS Agricultural Chemistry',
    'BS Agricultural Biotechnology',
    'BS Food Technology'
  ],
  [UPLBCollege.CEM]: [
    'BS Economics',
    'BS Agribusiness Economics',
    'BS Accountancy',
    'BS Agricultural Economics'
  ],
  [UPLBCollege.CEAT]: [
    'BS Agricultural and Biosystems Engineering',
    'BS Chemical Engineering',
    'BS Civil Engineering',
    'BS Electrical Engineering',
    'BS Industrial Engineering'
  ],
  [UPLBCollege.CFNR]: [
    'BS Forestry'
  ],
  [UPLBCollege.CHE]: [
    'BS Human Ecology',
    'BS Nutrition',
    'BS Food Science and Technology'
  ],
  [UPLBCollege.CVM]: [
    'Doctor of Veterinary Medicine'
  ],
  [UPLBCollege.CDC]: [
    'BS Development Communication'
  ],
  [UPLBCollege.CPAF]: [
    'BS Community Development'
  ],
  [UPLBCollege.GS]: []
};

// ============================================================================
// BS AGRICULTURE MAJORS
// ============================================================================

export enum AgricultureMajor {
  ANIMAL_SCIENCE = 'Animal Science',
  CROP_PROTECTION = 'Crop Protection',
  CROP_SCIENCE = 'Crop Science',
  SOIL_SCIENCE = 'Soil Science',
  HORTICULTURE = 'Horticulture',
  ENTOMOLOGY = 'Entomology',
  PLANT_PATHOLOGY = 'Plant Pathology',
  WEED_SCIENCE = 'Weed Science'
}

// ============================================================================
// USER INTERFACES
// ============================================================================

export interface BaseUser {
  id: string;
  email: string;
  password?: string; // Hashed, not exposed to frontend
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile extends BaseUser {
  role: UserRole.STUDENT;
  
  // Personal Information
  firstName: string;
  lastName: string;
  middleName?: string;
  contactNumber: string;
  address: {
    province: string;
    city: string;
    barangay: string;
    street?: string;
    zipCode: string;
  };
  homeAddress?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    zipCode?: string;
    fullAddress?: string;
  };
  hometown: string; // Province of origin (important for location-based scholarships)
  citizenship?: string;
  
  // Academic Information
  studentNumber: string;
  college: UPLBCollege;
  course: string;
  major?: AgricultureMajor | string;
  yearLevel: YearLevel;
  classification?: string; // Backend uses 'classification', frontend uses 'yearLevel'
  gwa: number; // General Weighted Average (1.0 - 5.0, 1.0 being highest)
  unitsEnrolled: number;
  expectedGraduationDate: Date;
  hasApprovedThesis?: boolean;
  
  // Financial Information
  annualFamilyIncome: number;
  householdSize: number;
  stBracket?: STBracket;
  
  // Scholarship Status
  isScholarshipRecipient: boolean;
  currentScholarships: string[];
  hasThesisGrant: boolean;
  
  // Disciplinary Record
  hasDisciplinaryAction: boolean;
  disciplinaryDetails?: string;
  
  // Custom Fields (for scholarship-specific requirements)
  // Admin-defined fields that students can fill during application
  customFields?: Record<string, string | number | boolean | string[]>;
  
  // Profile Completion
  profileCompleted: boolean;
  lastUpdated: Date;
}

export interface AdminProfile extends BaseUser {
  role: UserRole.ADMIN;
  firstName: string;
  lastName: string;
  department: string;
  college?: UPLBCollege;
  accessLevel: AdminAccessLevel;
  permissions: string[];
}

// Admin Scope Summary - returned by scope endpoints
export interface AdminScopeSummary {
  level: AdminAccessLevel;
  levelDisplay: string;
  college: string | null;
  department: string | null;
  canManage: {
    university: boolean;
    college: boolean;
    department: boolean;
    external: boolean;
  };
  canView: {
    university: boolean;
    college: boolean;
    department: boolean;
    external: boolean;
  };
  description: string;
}

export type User = StudentProfile | AdminProfile;

// Type guard to check if user is a student
export const isStudentProfile = (user: User | null | undefined): user is StudentProfile => {
  return user?.role === UserRole.STUDENT;
};

// ============================================================================
// SCHOLARSHIP INTERFACES
// ============================================================================

export interface EligibilityCriteria {
  // Academic Requirements
  minGWA?: number;
  maxGWA?: number;
  requiredYearLevels?: YearLevel[];
  eligibleClassifications?: string[]; // API field name for year levels
  minUnitsEnrolled?: number;
  minUnitsPassed?: number;
  eligibleColleges?: UPLBCollege[] | string[];
  eligibleCourses?: string[];
  eligibleMajors?: (AgricultureMajor | string)[];
  requiresApprovedThesis?: boolean;
  requiresApprovedThesisOutline?: boolean; // API field name
  requireThesisApproval?: boolean; // Alternative API field name
  
  // Financial Requirements
  maxAnnualFamilyIncome?: number;
  minAnnualFamilyIncome?: number;
  requiredSTBrackets?: STBracket[];
  eligibleSTBrackets?: string[]; // API field name
  requireFinancialNeed?: boolean;
  
  // Location-based Requirements
  eligibleProvinces?: string[];
  
  // Citizenship Requirements
  eligibleCitizenship?: string[];
  isFilipinoOnly?: boolean;
  filipinoOnly?: boolean; // API field name
  
  // Status Requirements (Boolean checks)
  mustNotHaveOtherScholarship?: boolean;
  noExistingScholarship?: boolean; // API field name
  mustNotHaveThesisGrant?: boolean;
  noExistingThesisGrant?: boolean; // API field name
  mustNotHaveDisciplinaryAction?: boolean;
  noDisciplinaryRecord?: boolean; // API field name
  
  // Academic Status Requirements
  mustNotHaveFailingGrade?: boolean;
  mustNotHaveGradeOf4?: boolean;
  mustNotHaveIncompleteGrade?: boolean;
  mustBeGraduating?: boolean;
  
  // Custom requirements (free text, manual verification)
  additionalRequirements?: string[];
  
  // Custom conditions (auto-evaluated)
  customConditions?: CustomCondition[];
}

export interface Scholarship {
  id: string;
  _id?: string; // MongoDB ID (API returns this)
  name: string;
  description: string;
  sponsor: string;
  type: ScholarshipType;
  
  // Admin Scope Management
  scholarshipLevel?: ScholarshipLevel;
  managingCollege?: string;
  managingAcademicUnit?: string;
  
  // Permission flags (populated by admin routes)
  canManage?: boolean;
  canView?: boolean;
  
  // Financial Details (API returns totalGrant, frontend uses awardAmount)
  awardAmount?: number;
  totalGrant?: number; // API field name
  awardDescription?: string;
  
  // Eligibility (API uses different field names)
  eligibilityCriteria: EligibilityCriteria & {
    // API field names
    eligibleClassifications?: string[];
    eligibleMajors?: string[];
    requireThesisApproval?: boolean;
    requireFinancialNeed?: boolean;
    noExistingScholarship?: boolean;
    noExistingThesisGrant?: boolean;
    noDisciplinaryRecord?: boolean;
    filipinoOnly?: boolean;
  };
  
  // Custom Conditions (for dynamic eligibility criteria)
  customConditions?: CustomCondition[];
  
  requirements: string[]; // Documents/requirements to submit (legacy)
  requiredDocuments?: Array<{
    name: string;
    description?: string;
    isRequired?: boolean;
  }>;
  
  // Timeline
  applicationDeadline: Date;
  academicYear: string;
  semester: 'First' | 'Second' | 'Midyear';
  
  // Metadata
  slots?: number;
  filledSlots?: number;
  remainingSlots?: number;
  daysUntilDeadline?: number;
  isActive: boolean;
  status?: 'open' | 'closed' | 'upcoming';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // For display
  tags?: string[];
}

// ============================================================================
// APPLICATION INTERFACES
// ============================================================================

export interface ScholarshipApplication {
  id: string;
  scholarshipId: string;
  studentId: string;
  
  // Application Details
  status: ApplicationStatus;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  
  // Documents
  uploadedDocuments: UploadedDocument[];
  
  // Review
  reviewNotes?: string;
  rejectionReason?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
}

// ============================================================================
// MATCHING & PREDICTION INTERFACES
// ============================================================================

export interface MatchResult {
  scholarship: Scholarship;
  isEligible: boolean;
  compatibilityScore: number; // 0-100
  eligibilityDetails: EligibilityCheckResult[];
  predictionScore?: number; // 0-100, from logistic regression
  predictionFactors?: PredictionFactor[];
  predictionModelType?: 'scholarship_specific' | 'global' | 'none' | 'unknown'; // Type of ML model used
}

export interface EligibilityCheckResult {
  criterion: string;
  passed: boolean;
  studentValue: string | number | boolean;
  requiredValue: string | number | boolean;
  importance: 'required' | 'preferred';
}

export interface PredictionFactor {
  factor: string;
  contribution: number; // Normalized contribution (0-1 representing % of total impact)
  description: string;
  rawContribution?: number; // Actual weighted contribution value
  value?: number; // Feature value (0-1)
  weight?: number; // Model weight for this feature
  met?: boolean; // Whether the criterion is met (for positive/negative display)
}

// ============================================================================
// HISTORICAL DATA FOR LOGISTIC REGRESSION
// ============================================================================

export interface HistoricalApplication {
  id: string;
  scholarshipId: string;
  academicYear: string;
  
  // Student Features (anonymized)
  gwa: number;
  yearLevel: YearLevel;
  college: UPLBCollege;
  course: string;
  annualFamilyIncome: number;
  stBracket?: STBracket;
  
  // Application Outcome
  wasApproved: boolean;
  
  // Metadata
  applicationDate: Date;
}

export interface ScholarshipStats {
  scholarshipId: string;
  scholarshipName: string;
  academicYear: string;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  successRate: number;
  averageGWAApproved: number;
  averageIncomeApproved: number;
}

// ============================================================================
// FILTER & SEARCH INTERFACES
// ============================================================================

export interface FilterCriteria {
  searchQuery?: string;
  scholarshipTypes?: ScholarshipType[];
  colleges?: UPLBCollege[];
  minAmount?: number;
  maxAmount?: number;
  deadlineAfter?: Date;
  deadlineBefore?: Date;
  yearLevels?: YearLevel[];
  showEligibleOnly?: boolean;
  sortBy?: 'deadline' | 'amount' | 'compatibility' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// UI STATE INTERFACES
// ============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// APPLICATION INTERFACE (for API compatibility)
// ============================================================================

export interface Application {
  _id: string;
  id?: string; // Alias for _id
  applicant: string | StudentProfile;
  scholarship: string | Scholarship;
  scholarshipId?: string; // For convenience
  status: ApplicationStatus;
  statusHistory: Array<{
    status: ApplicationStatus;
    changedBy: string;
    changedAt: Date;
    notes?: string;
    reason?: string;
  }>;
  documents: Array<{
    _id: string;
    name: string;
    type: string;
    url?: string;
    uploadedAt: Date;
    verified: boolean;
  }>;
  eligibilityChecks: Array<{
    criterion: string;
    passed: boolean;
    applicantValue: any;
    requiredValue: any;
    notes?: string;
  }>;
  passedAllEligibilityCriteria: boolean;
  eligibilityScore: number;
  eligibilityPercentage?: number; // Alias for eligibilityScore
  criteriaPassed?: number;
  criteriaTotal?: number;
  appliedDate?: Date;
  prediction?: PredictionResult;
  applicantSnapshot?: {
    gwa: number;
    yearLevel: string;
    college: string;
    course: string;
    annualFamilyIncome: number;
    unitsEnrolled: number;
  };
  personalStatement?: string;
  additionalInfo?: string;
  submittedAt?: Date;
  decisionMadeAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  academicYear: string;
  semester: 'First' | 'Second' | 'Midyear';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PREDICTION RESULT INTERFACE
// ============================================================================

export interface PredictionResult {
  probability: number;
  probabilityPercentage: number;
  predictedOutcome?: 'approved' | 'rejected' | 'likely_approved' | 'needs_improvement';
  confidence: 'low' | 'medium' | 'high';
  matchLevel?: string;
  factors?: PredictionFactor[];
  zScore?: number; // The raw z-score before sigmoid transformation
  intercept?: number; // The model intercept/bias term
  detailedFactors?: {
    workingInFavor?: Array<any>;
    areasToConsider?: Array<any>;
  };
  featureContributions?: {
    gwa?: number;
    financialNeed?: number;
    yearLevel?: number;
    collegeMatch?: number;
    courseMatch?: number;
    profileCompleteness?: number;
    documentsComplete?: number;
    previousApprovals?: number;
    previousRejections?: number;
  };
  features?: Record<string, number>;
  modelVersion?: string;
  trainedModel?: boolean;
  modelType?: 'scholarship_specific' | 'global' | 'none' | 'unknown'; // Type of model used
  modelDescription?: string; // Human-readable description of model used
  recommendation?: string;
  previousApprovals?: number;
  previousRejections?: number;
  generatedAt?: Date;
  disclaimer?: string;
}