# ISKOlarship Database Schema

> Complete documentation of MongoDB collections and Mongoose schemas used in ISKOlarship.

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [User Collection](#user-collection)
4. [Scholarship Collection](#scholarship-collection)
5. [Application Collection](#application-collection)
6. [TrainedModel Collection](#trainedmodel-collection)
7. [Notification Collection](#notification-collection)
8. [ActivityLog Collection](#activitylog-collection)
9. [Indexes](#indexes)
10. [Enumerations](#enumerations)

---

## Overview

ISKOlarship uses MongoDB as its primary database, with Mongoose as the ODM (Object Document Mapper). The database follows a document-oriented design optimized for the scholarship application workflow.

### Database Connection

```javascript
// Connection string format
mongodb+srv://<username>:<password>@cluster.mongodb.net/iskolaship

// Local development
mongodb://localhost:27017/iskolaship
```

### Collections Summary

| Collection | Purpose | Estimated Size |
|------------|---------|---------------|
| `users` | Student and admin accounts | ~10,000 documents |
| `scholarships` | Scholarship offerings | ~500 documents |
| `applications` | Student applications | ~50,000 documents |
| `trainedmodels` | ML model weights | ~1,000 documents |
| `notifications` | User notifications | ~100,000 documents |
| `activitylogs` | Audit trail | ~500,000 documents |

---

## Entity Relationship Diagram

```
                                    ┌─────────────────────┐
                                    │     SCHOLARSHIP     │
                                    ├─────────────────────┤
                                    │ _id                 │
                          ┌────────▶│ name                │
                          │         │ type                │
                          │         │ requirements        │◀───────┐
                          │         │ createdBy ──────────│────┐   │
                          │         │ status              │    │   │
                          │         └─────────────────────┘    │   │
                          │                                    │   │
┌─────────────────────┐   │                                    │   │
│        USER         │   │                                    │   │
├─────────────────────┤   │                                    │   │
│ _id ◀───────────────┼───┼────────────────────────────────────┘   │
│ email               │   │                                        │
│ password            │   │         ┌─────────────────────┐        │
│ role                │   │         │    APPLICATION      │        │
│ studentProfile      │───┼────────▶├─────────────────────┤        │
│ adminProfile        │   │         │ _id                 │        │
└─────────────────────┘   │         │ applicant ──────────│────────┤
         │                │         │ scholarship ────────│────────┘
         │                │         │ status              │
         │                └────────▶│ documents[]         │
         │                          │ eligibilityResult   │
         │                          │ predictionResult    │
         │                          └─────────────────────┘
         │
         │                          ┌─────────────────────┐
         │                          │    TRAINEDMODEL     │
         │                          ├─────────────────────┤
         │                          │ _id                 │
         │                          │ scholarshipId ──────│───────▶
         └─────────────────────────▶│ trainedBy           │
                                    │ weights             │
                                    │ metrics             │
                                    └─────────────────────┘

         │                          ┌─────────────────────┐
         │                          │    NOTIFICATION     │
         │                          ├─────────────────────┤
         └─────────────────────────▶│ user                │
                                    │ type                │
                                    │ title               │
                                    │ message             │
                                    └─────────────────────┘

         │                          ┌─────────────────────┐
         │                          │    ACTIVITYLOG      │
         │                          ├─────────────────────┤
         └─────────────────────────▶│ user                │
                                    │ type                │
                                    │ description         │
                                    │ metadata            │
                                    └─────────────────────┘
```

---

## User Collection

### Schema Definition

```javascript
const userSchema = new mongoose.Schema({
  // Core Identity
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false  // Excluded from queries by default
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    required: true,
    default: 'student'
  },
  
  // Personal Information
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, required: true, trim: true },
  suffix: { type: String, trim: true },
  
  // Account Status
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  profileCompleted: { type: Boolean, default: false },
  
  // Refresh Tokens
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date
  }],
  
  // Student Profile (role: 'student')
  studentProfile: {
    studentNumber: String,
    college: {
      type: String,
      enum: ['CAS', 'CAFS', 'CEM', 'CEAT', 'CFNR', 'CHE', 'CVM', 'CDC', 'CPAF', 'GS']
    },
    course: String,
    major: String,
    yearLevel: {
      type: Number,
      min: 1,
      max: 6
    },
    classification: {
      type: String,
      enum: ['Freshman', 'Sophomore', 'Junior', 'Senior']
    },
    gwa: {
      type: Number,
      min: 1.0,
      max: 5.0
    },
    unitsEnrolled: Number,
    unitsPassed: Number,
    familyIncome: Number,
    stBracket: {
      type: String,
      enum: ['Full Discount with Stipend', 'Full Discount', 'PD80', 'PD60', 'PD40', 'PD20', 'No Discount']
    },
    citizenship: {
      type: String,
      enum: ['Filipino', 'Dual Citizen', 'Foreign National']
    },
    province: String,
    contactNumber: String,
    address: String
  },
  
  // Admin Profile (role: 'admin')
  adminProfile: {
    accessLevel: {
      type: String,
      enum: ['university', 'college', 'academic_unit'],
      required: function() { return this.role === 'admin'; }
    },
    collegeCode: String,      // e.g., 'CAS', 'CAFS'
    academicUnitCode: String, // e.g., 'ICS', 'DCHE'
    universityUnitCode: String, // e.g., 'OSA', 'OVCAA'
    permissions: [{
      type: String,
      enum: ['manage_scholarships', 'review_applications', 'train_models', 'view_analytics', 'manage_users']
    }],
    // Legacy fields (for backward compatibility)
    college: String,
    academicUnit: String
  }
}, {
  timestamps: true // createdAt, updatedAt
});
```

### Sample Document

```json
{
  "_id": "65abc123def456789012345",
  "email": "student@up.edu.ph",
  "password": "$2a$10$...", // bcrypt hash
  "role": "student",
  "firstName": "Juan",
  "middleName": "Santos",
  "lastName": "Dela Cruz",
  "isEmailVerified": true,
  "profileCompleted": true,
  "studentProfile": {
    "studentNumber": "2020-12345",
    "college": "CAS",
    "course": "BS Computer Science",
    "yearLevel": 3,
    "classification": "Junior",
    "gwa": 1.75,
    "familyIncome": 150000,
    "stBracket": "PD60",
    "citizenship": "Filipino",
    "province": "Laguna"
  },
  "createdAt": "2025-01-15T00:00:00.000Z",
  "updatedAt": "2026-02-20T00:00:00.000Z"
}
```

---

## Scholarship Collection

### Schema Definition

```javascript
const scholarshipSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  sponsor: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['University Scholarship', 'College Scholarship', 'Government Scholarship', 'Private Scholarship', 'Thesis/Research Grant'],
    required: true
  },
  
  // Administrative Scope
  scholarshipLevel: {
    type: String,
    enum: ['university', 'college', 'academic_unit', 'external'],
    default: 'university'
  },
  managingCollegeCode: String,
  managingAcademicUnitCode: String,
  
  // Award Details
  awardAmount: Number,
  awardType: {
    type: String,
    enum: ['full_tuition', 'partial_tuition', 'stipend', 'allowance', 'combined']
  },
  numberOfSlots: Number,
  
  // Timeline
  applicationDeadline: {
    type: Date,
    required: true
  },
  academicYear: {
    type: String,
    match: /^\d{4}-\d{4}$/  // e.g., "2025-2026"
  },
  semester: {
    type: String,
    enum: ['First', 'Second', 'Midyear']
  },
  
  // Eligibility Criteria (embedded document)
  requirements: {
    // Academic
    minGWA: { type: Number, min: 1.0, max: 5.0 },
    maxGWA: { type: Number, min: 1.0, max: 5.0, default: 5.0 },
    eligibleClassifications: [String],
    minUnitsEnrolled: Number,
    minUnitsPassed: Number,
    
    // Program
    eligibleColleges: [String],
    eligibleCourses: [String],
    eligibleMajors: [String],
    
    // Financial
    maxAnnualFamilyIncome: Number,
    minAnnualFamilyIncome: Number,
    eligibleSTBrackets: [String],
    
    // Location & Citizenship
    eligibleProvinces: [String],
    eligibleCitizenship: [String],
    
    // Special Requirements
    requiresApprovedThesisOutline: Boolean,
    requiresNoFailingGrade: Boolean,
    requiresNoDisciplinaryRecord: Boolean
  },
  
  // Required Documents
  requiredDocuments: [{
    name: { type: String, required: true },
    description: String,
    required: { type: Boolean, default: true },
    documentType: {
      type: String,
      enum: ['transcript', 'income_certificate', 'certificate_of_registration', 
             'grade_report', 'recommendation_letter', 'personal_statement', 
             'photo_id', 'other']
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'archived'],
    default: 'draft'
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
  }
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "65sch123def456789012345",
  "name": "DOST-SEI Undergraduate Scholarship",
  "description": "Full scholarship for science and technology students...",
  "sponsor": "Department of Science and Technology",
  "type": "Government Scholarship",
  "scholarshipLevel": "university",
  "awardAmount": 10000,
  "awardType": "combined",
  "numberOfSlots": 50,
  "applicationDeadline": "2026-03-15T00:00:00.000Z",
  "academicYear": "2025-2026",
  "semester": "Second",
  "requirements": {
    "minGWA": 1.0,
    "maxGWA": 1.75,
    "eligibleClassifications": ["Sophomore", "Junior", "Senior"],
    "eligibleColleges": ["CAS", "CEAT", "CHE"],
    "maxAnnualFamilyIncome": 300000,
    "eligibleCitizenship": ["Filipino"]
  },
  "requiredDocuments": [
    {
      "name": "Transcript of Records",
      "description": "Latest copy with GWA computation",
      "required": true,
      "documentType": "transcript"
    },
    {
      "name": "Certificate of Income",
      "description": "ITR or Certificate of No Filing",
      "required": true,
      "documentType": "income_certificate"
    }
  ],
  "status": "active",
  "createdBy": "65admin123def456789012345",
  "createdAt": "2025-12-01T00:00:00.000Z",
  "updatedAt": "2026-01-15T00:00:00.000Z"
}
```

---

## Application Collection

### Schema Definition

```javascript
const applicationSchema = new mongoose.Schema({
  // References
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scholarship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship',
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'documents_required', 
           'shortlisted', 'interview_scheduled', 'approved', 'rejected', 'withdrawn'],
    default: 'draft'
  },
  
  // Snapshot of student data at submission time
  studentSnapshot: {
    studentNumber: String,
    fullName: String,
    college: String,
    course: String,
    yearLevel: Number,
    gwa: Number,
    familyIncome: Number,
    stBracket: String,
    citizenship: String
  },
  
  // Uploaded Documents
  documents: [{
    name: { type: String, required: true },
    documentType: {
      type: String,
      enum: ['transcript', 'income_certificate', 'certificate_of_registration',
             'grade_report', 'barangay_certificate', 'tax_return', 'thesis_outline',
             'recommendation_letter', 'personal_statement', 'photo_id', 
             'proof_of_enrollment', 'text_response', 'other']
    },
    url: String,              // Cloudinary URL
    cloudinaryPublicId: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    textContent: String,      // For text-type documents
    isTextDocument: Boolean,
    uploadedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    verificationNotes: String,
    
    // OCR Results
    ocrResult: {
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'] },
      rawText: String,
      extractedFields: mongoose.Schema.Types.Mixed,
      comparisonResults: [{
        field: String,
        extracted: mongoose.Schema.Types.Mixed,
        expected: mongoose.Schema.Types.Mixed,
        match: Boolean,
        similarity: Number,
        severity: { type: String, enum: ['verified', 'warning', 'critical', 'info', 'unreadable'] }
      }],
      confidence: Number,
      overallMatch: { type: String, enum: ['verified', 'mismatch', 'partial', 'unreadable'] },
      processedAt: Date,
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  }],
  
  // Application Content
  personalStatement: {
    type: String,
    maxlength: 5000
  },
  
  // Eligibility Assessment
  eligibilityResult: {
    eligible: Boolean,
    score: Number,
    checks: [{
      criterion: String,
      criterionType: String,
      passed: Boolean,
      studentValue: mongoose.Schema.Types.Mixed,
      requiredValue: mongoose.Schema.Types.Mixed,
      message: String
    }],
    disqualifyingFactors: [String],
    checkedAt: Date
  },
  
  // ML Prediction
  predictionResult: {
    probability: Number,
    confidence: { type: String, enum: ['high', 'medium', 'low'] },
    modelType: { type: String, enum: ['scholarship_specific', 'global'] },
    modelVersion: String,
    featureVector: mongoose.Schema.Types.Mixed,
    featureContributions: mongoose.Schema.Types.Mixed,
    predictedAt: Date
  },
  
  // Status History
  statusHistory: [{
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    notes: String,
    reason: String
  }],
  
  // Review Notes (Admin)
  adminNotes: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Timestamps
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: Date,
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "65app123def456789012345",
  "applicant": "65user123def456789012345",
  "scholarship": "65sch123def456789012345",
  "status": "approved",
  "studentSnapshot": {
    "studentNumber": "2020-12345",
    "fullName": "Juan Santos Dela Cruz",
    "college": "CAS",
    "course": "BS Computer Science",
    "yearLevel": 3,
    "gwa": 1.75,
    "familyIncome": 150000,
    "stBracket": "PD60",
    "citizenship": "Filipino"
  },
  "documents": [
    {
      "name": "Transcript of Records",
      "documentType": "transcript",
      "url": "https://res.cloudinary.com/.../transcript.pdf",
      "cloudinaryPublicId": "iskolaship/docs/abc123",
      "verified": true,
      "ocrResult": {
        "status": "completed",
        "overallMatch": "verified",
        "confidence": 0.95
      }
    }
  ],
  "eligibilityResult": {
    "eligible": true,
    "score": 92.5,
    "checks": [
      {
        "criterion": "GWA",
        "passed": true,
        "studentValue": 1.75,
        "requiredValue": 1.75,
        "message": "GWA 1.75 meets requirement"
      }
    ]
  },
  "predictionResult": {
    "probability": 78.5,
    "confidence": "high",
    "modelType": "scholarship_specific",
    "predictedAt": "2026-02-01T00:00:00.000Z"
  },
  "statusHistory": [
    { "status": "draft", "changedAt": "2026-01-30T00:00:00.000Z" },
    { "status": "submitted", "changedAt": "2026-02-01T00:00:00.000Z" },
    { "status": "under_review", "changedAt": "2026-02-15T00:00:00.000Z" },
    { "status": "approved", "changedAt": "2026-02-20T00:00:00.000Z" }
  ],
  "submittedAt": "2026-02-01T00:00:00.000Z",
  "decidedAt": "2026-02-20T00:00:00.000Z"
}
```

---

## TrainedModel Collection

### Schema Definition

```javascript
const trainedModelSchema = new mongoose.Schema({
  // Model Identity
  scholarshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship',
    default: null  // null = global model
  },
  modelType: {
    type: String,
    enum: ['scholarship_specific', 'global'],
    required: true
  },
  
  // Model Weights (Logistic Regression)
  weights: {
    gwaScore: { type: Number, default: 0.1 },
    yearLevelMatch: { type: Number, default: 0.1 },
    incomeMatch: { type: Number, default: 0.1 },
    stBracketMatch: { type: Number, default: 0.1 },
    collegeMatch: { type: Number, default: 0.1 },
    courseMatch: { type: Number, default: 0.1 },
    citizenshipMatch: { type: Number, default: 0.1 },
    applicationTiming: { type: Number, default: 0.1 },
    eligibilityScore: { type: Number, default: 0.1 },
    // Interaction features
    academicStrength: { type: Number, default: 0.1 },
    financialNeed: { type: Number, default: 0.1 },
    programFit: { type: Number, default: 0.1 },
    overallFit: { type: Number, default: 0.1 },
    // Bias term
    bias: { type: Number, default: 0 }
  },
  
  // Performance Metrics
  metrics: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number,
    auc: Number,
    confusionMatrix: {
      truePositives: Number,
      trueNegatives: Number,
      falsePositives: Number,
      falseNegatives: Number
    }
  },
  
  // Training Information
  trainingDataSize: { type: Number, required: true },
  positiveExamples: Number,   // Approved applications
  negativeExamples: Number,   // Rejected applications
  trainedAt: { type: Date, default: Date.now },
  trainedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Auto-Training Metadata
  triggerType: {
    type: String,
    enum: ['manual', 'auto_status_change', 'auto_global_refresh'],
    default: 'manual'
  },
  triggerApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  
  // Model Status
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  
  // Training Configuration
  hyperparameters: {
    learningRate: { type: Number, default: 0.1 },
    iterations: { type: Number, default: 100 },
    regularization: { type: Number, default: 0.01 }
  }
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "65model123def456789012345",
  "scholarshipId": "65sch123def456789012345",
  "modelType": "scholarship_specific",
  "weights": {
    "gwaScore": 0.35,
    "yearLevelMatch": 0.12,
    "incomeMatch": 0.28,
    "stBracketMatch": 0.08,
    "collegeMatch": 0.15,
    "courseMatch": 0.05,
    "citizenshipMatch": 0.02,
    "applicationTiming": 0.10,
    "eligibilityScore": 0.18,
    "academicStrength": 0.22,
    "financialNeed": 0.25,
    "programFit": 0.10,
    "overallFit": 0.15,
    "bias": -0.45
  },
  "metrics": {
    "accuracy": 0.85,
    "precision": 0.82,
    "recall": 0.88,
    "f1Score": 0.85,
    "confusionMatrix": {
      "truePositives": 88,
      "trueNegatives": 42,
      "falsePositives": 12,
      "falseNegatives": 8
    }
  },
  "trainingDataSize": 150,
  "positiveExamples": 96,
  "negativeExamples": 54,
  "trainedAt": "2026-02-20T00:00:00.000Z",
  "trainedBy": "65admin123def456789012345",
  "triggerType": "auto_status_change",
  "isActive": true,
  "version": 5
}
```

---

## Notification Collection

### Schema Definition

```javascript
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'application_submitted',
      'application_status_change',
      'application_approved',
      'application_rejected',
      'document_verified',
      'document_rejected',
      'scholarship_deadline_reminder',
      'new_scholarship_available',
      'profile_incomplete',
      'system_announcement'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Related entities
  metadata: {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    scholarshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship' },
    documentName: String,
    previousStatus: String,
    newStatus: String
  },
  
  // Email delivery
  emailSent: { type: Boolean, default: false },
  emailSentAt: Date,
  emailError: String
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "65notif123def456789012345",
  "user": "65user123def456789012345",
  "type": "application_approved",
  "title": "Application Approved!",
  "message": "Congratulations! Your application for DOST-SEI Scholarship has been approved.",
  "read": false,
  "metadata": {
    "applicationId": "65app123def456789012345",
    "scholarshipId": "65sch123def456789012345",
    "previousStatus": "under_review",
    "newStatus": "approved"
  },
  "emailSent": true,
  "emailSentAt": "2026-02-20T00:00:00.000Z",
  "createdAt": "2026-02-20T00:00:00.000Z"
}
```

---

## ActivityLog Collection

### Schema Definition

```javascript
const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      // Authentication
      'login', 'logout', 'register', 'password_reset',
      // Profile
      'profile_update', 'profile_complete',
      // Applications
      'application_create', 'application_submit', 'application_withdraw',
      'application_status_change',
      // Documents
      'document_upload', 'document_delete', 'document_verify',
      // Scholarships (Admin)
      'scholarship_create', 'scholarship_update', 'scholarship_delete',
      // Training (Admin)
      'model_train', 'model_reset',
      // System
      'system_error'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Contextual metadata
  metadata: {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    scholarshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship' },
    documentName: String,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
  },
  
  // For admin actions affecting other users
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});
```

### Sample Document

```json
{
  "_id": "65log123def456789012345",
  "user": "65user123def456789012345",
  "type": "application_submit",
  "description": "Submitted application for DOST-SEI Scholarship",
  "metadata": {
    "applicationId": "65app123def456789012345",
    "scholarshipId": "65sch123def456789012345",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  },
  "createdAt": "2026-02-01T00:00:00.000Z"
}
```

---

## Indexes

### User Collection

```javascript
// Primary indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

// Student lookups
userSchema.index({ 'studentProfile.studentNumber': 1 });
userSchema.index({ 'studentProfile.college': 1 });

// Admin scope queries
userSchema.index({ 'adminProfile.accessLevel': 1 });
userSchema.index({ 'adminProfile.collegeCode': 1 });
```

### Scholarship Collection

```javascript
scholarshipSchema.index({ status: 1, applicationDeadline: 1 });
scholarshipSchema.index({ type: 1 });
scholarshipSchema.index({ scholarshipLevel: 1 });
scholarshipSchema.index({ managingCollegeCode: 1 });
scholarshipSchema.index({ createdBy: 1 });

// Text search
scholarshipSchema.index({ name: 'text', description: 'text' });
```

### Application Collection

```javascript
// Common queries
applicationSchema.index({ applicant: 1, scholarship: 1 }, { unique: true });
applicationSchema.index({ scholarship: 1, status: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ submittedAt: -1 });

// Admin review queries
applicationSchema.index({ 'eligibilityResult.eligible': 1 });
```

### TrainedModel Collection

```javascript
trainedModelSchema.index({ scholarshipId: 1, isActive: 1 });
trainedModelSchema.index({ modelType: 1, isActive: 1 });
```

### Notification Collection

```javascript
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
```

### ActivityLog Collection

```javascript
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });
activityLogSchema.index({ 'metadata.applicationId': 1 });
```

---

## Enumerations

### User Roles

```javascript
const UserRole = {
  STUDENT: 'student',
  ADMIN: 'admin'
};
```

### Admin Access Levels

```javascript
const AdminAccessLevel = {
  UNIVERSITY: 'university',      // Access to all scholarships
  COLLEGE: 'college',            // Access to college-level scholarships
  ACADEMIC_UNIT: 'academic_unit' // Access to department/institute scholarships
};
```

### Application Status

```javascript
const ApplicationStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  DOCUMENTS_REQUIRED: 'documents_required',
  SHORTLISTED: 'shortlisted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};
```

### Scholarship Types

```javascript
const ScholarshipType = {
  UNIVERSITY: 'University Scholarship',
  COLLEGE: 'College Scholarship',
  GOVERNMENT: 'Government Scholarship',
  PRIVATE: 'Private Scholarship',
  THESIS_GRANT: 'Thesis/Research Grant'
};
```

### UPLB Colleges

```javascript
const UPLBColleges = {
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
```

### ST Brackets

```javascript
const STBracket = {
  FULL_DISCOUNT_WITH_STIPEND: 'Full Discount with Stipend',
  FULL_DISCOUNT: 'Full Discount',
  PD80: 'PD80',    // 80% discount
  PD60: 'PD60',    // 60% discount
  PD40: 'PD40',    // 40% discount
  PD20: 'PD20',    // 20% discount
  NO_DISCOUNT: 'No Discount'
};
```

---

## Data Migration Notes

### Adding New Fields

When adding fields to existing documents:

```javascript
// Migration script example
async function migrateUsers() {
  await User.updateMany(
    { newField: { $exists: false } },
    { $set: { newField: defaultValue } }
  );
}
```

### Backward Compatibility

The schema includes legacy fields for backward compatibility:
- `adminProfile.college` (string) → Use `adminProfile.collegeCode`
- `adminProfile.academicUnit` (string) → Use `adminProfile.academicUnitCode`

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Endpoint documentation
- [Architecture](./ARCHITECTURE.md) - System design overview
- [ML Prediction System](./ML_PREDICTION_FACTORS.md) - Feature weights and calculations
