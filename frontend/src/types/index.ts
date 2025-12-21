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
  UNIVERSITY = 'university',  // Manages all scholarships institution-wide
  COLLEGE = 'college',        // Oversees programs within their college
  DEPARTMENT = 'department'   // Handles program-specific offerings
}

export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum YearLevel {
  FRESHMAN = 'freshman',
  SOPHOMORE = 'sophomore',
  JUNIOR = 'junior',
  SENIOR = 'senior',
  GRADUATE = 'graduate'
}

export enum ScholarshipType {
  UNIVERSITY = 'university',
  COLLEGE = 'college',
  GOVERNMENT = 'government',
  PRIVATE = 'private',
  THESIS_GRANT = 'thesis_grant'
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
  hometown: string; // Province of origin (important for location-based scholarships)
  
  // Academic Information
  studentNumber: string;
  college: UPLBCollege;
  course: string;
  major?: AgricultureMajor | string;
  yearLevel: YearLevel;
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

export type User = StudentProfile | AdminProfile;

// Type guard to check if user is a student
export const isStudentProfile = (user: User | null | undefined): user is StudentProfile => {
  return user?.role === UserRole.STUDENT;
};

// Type guard to check if user is an admin
export const isAdminProfile = (user: User | null | undefined): user is AdminProfile => {
  return user?.role === UserRole.ADMIN;
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
  eligibleColleges?: UPLBCollege[] | string[];
  eligibleCourses?: string[];
  eligibleMajors?: (AgricultureMajor | string)[];
  requiresApprovedThesis?: boolean;
  requireThesisApproval?: boolean; // API field name
  
  // Financial Requirements
  maxAnnualFamilyIncome?: number;
  minAnnualFamilyIncome?: number;
  requiredSTBrackets?: STBracket[];
  eligibleSTBrackets?: string[]; // API field name
  requireFinancialNeed?: boolean;
  
  // Location-based Requirements
  eligibleProvinces?: string[];
  
  // Other Requirements
  mustNotHaveOtherScholarship?: boolean;
  noExistingScholarship?: boolean; // API field name
  mustNotHaveThesisGrant?: boolean;
  noExistingThesisGrant?: boolean; // API field name
  mustNotHaveDisciplinaryAction?: boolean;
  noDisciplinaryRecord?: boolean; // API field name
  isFilipinoOnly?: boolean;
  filipinoOnly?: boolean; // API field name
  
  // Custom requirements (free text)
  additionalRequirements?: string[];
}

export interface Scholarship {
  id: string;
  _id?: string; // MongoDB ID (API returns this)
  name: string;
  description: string;
  sponsor: string;
  type: ScholarshipType;
  
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
  requirements: string[]; // Documents/requirements to submit
  
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
  contribution: number; // Positive or negative contribution to probability
  description: string;
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
  applicant: string | StudentProfile;
  scholarship: string | Scholarship;
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
  predictedOutcome: 'approved' | 'rejected';
  confidence: 'low' | 'medium' | 'high';
  featureContributions: {
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
  features: Record<string, number>;
  modelVersion: string;
  generatedAt: Date;
}