# ISKOlarship System Architecture

> Comprehensive overview of ISKOlarship's technical architecture, design patterns, and system components.

---

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Design](#database-design)
6. [Authentication & Authorization](#authentication--authorization)
7. [Machine Learning Pipeline](#machine-learning-pipeline)
8. [External Integrations](#external-integrations)
9. [Security Architecture](#security-architecture)
10. [Performance Considerations](#performance-considerations)
11. [Scalability](#scalability)

---

## Overview

ISKOlarship is a full-stack web application built on the MERN stack (MongoDB, Express.js, React, Node.js) with TypeScript on the frontend. The system combines traditional CRUD operations with machine learning-powered scholarship matching.

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Separation of Concerns** | Clear boundaries between frontend, backend, services, and data layers |
| **Single Responsibility** | Each module/component has one well-defined purpose |
| **DRY (Don't Repeat Yourself)** | Shared utilities, services, and middleware |
| **Security First** | JWT authentication, role-based access, input validation |
| **User-Centric** | Intuitive interfaces for both students and administrators |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENTS                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Desktop   │  │   Mobile    │  │   Tablet    │  │  Admin Workstations    │ │
│  │   Browser   │  │   Browser   │  │   Browser   │  │                        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
└─────────┼────────────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                │                     │
          └────────────────┴────────────────┴─────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CDN / EDGE NETWORK                                  │
│                                  (Vercel)                                        │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────────┐  ┌───────────────────────────────────────────┐
│           FRONTEND                 │  │                 BACKEND                   │
│         (React + Vite)             │  │             (Express + Node.js)           │
│                                    │  │                                           │
│  ┌────────────────────────────┐   │  │  ┌─────────────────────────────────────┐  │
│  │    React Router (v6)       │   │  │  │           MIDDLEWARE LAYER           │  │
│  │    - Public Routes         │   │  │  │  ┌─────┐ ┌──────┐ ┌──────┐ ┌─────┐  │  │
│  │    - Protected Routes      │   │  │  │  │CORS │ │ Auth │ │Upload│ │Scope│  │  │
│  │    - Admin Routes          │   │  │  │  └─────┘ └──────┘ └──────┘ └─────┘  │  │
│  └────────────────────────────┘   │  │  └─────────────────────────────────────┘  │
│  ┌────────────────────────────┐   │  │  ┌─────────────────────────────────────┐  │
│  │       COMPONENTS           │   │  │  │            ROUTE LAYER               │  │
│  │  - Auth Components         │   │  │  │  auth | user | scholarship | app    │  │
│  │  - Student Components      │   │  │  │  prediction | training | stats      │  │
│  │  - Admin Components        │   │  │  │  ocr | verification | notification  │  │
│  │  - Shared Components       │   │  │  └─────────────────────────────────────┘  │
│  └────────────────────────────┘   │  │  ┌─────────────────────────────────────┐  │
│  ┌────────────────────────────┐   │  │  │           SERVICE LAYER              │  │
│  │        SERVICES            │◄──┼──┼──│  - Eligibility Service               │  │
│  │  - API Client (Axios)      │   │  │  │  - Prediction Service                │  │
│  │  - Auth Service            │   │  │  │  - Logistic Regression Service       │  │
│  │  - Filter Engine           │   │  │  │  - Training Service                  │  │
│  │  - Prediction Service      │   │  │  │  - OCR Verification Service          │  │
│  └────────────────────────────┘   │  │  │  - Email/Notification Service        │  │
│                                    │  │  └─────────────────────────────────────┘  │
│  Hosted on: Vercel                │  │  Hosted on: Railway                       │
└───────────────────────────────────┘  └───────────────────────────────────────────┘
                                                        │
                                                        │
                    ┌───────────────────────────────────┼───────────────────────────┐
                    │                                   │                           │
                    ▼                                   ▼                           ▼
         ┌──────────────────┐             ┌─────────────────────┐        ┌─────────────────┐
         │    MongoDB       │             │     Cloudinary      │        │  Google Cloud   │
         │    Atlas         │             │   (Document Store)  │        │   Vision API    │
         │                  │             │                     │        │   (OCR)         │
         │  - Users         │             │  - PDF Documents    │        │                 │
         │  - Scholarships  │             │  - Images           │        │  - Text Extract │
         │  - Applications  │             │  - Secure URLs      │        │  - Doc Analysis │
         │  - TrainedModels │             │                     │        │                 │
         │  - ActivityLogs  │             │                     │        │                 │
         └──────────────────┘             └─────────────────────┘        └─────────────────┘
```

---

## Frontend Architecture

### Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI library with hooks |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| React Router v6 | Client-side routing |
| Tailwind CSS | Utility-first styling |
| Axios | HTTP client |
| Chart.js | Data visualization |
| Framer Motion | Animations |

### Directory Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── AuthModal.tsx    # Authentication dialog
│   ├── Header.tsx       # Navigation header
│   ├── Footer.tsx       # Page footer
│   ├── ProtectedRoute.tsx # Route guard
│   └── ...
├── pages/               # Page-level components
│   ├── admin/           # Admin-specific pages
│   │   ├── AdminDashboard.tsx
│   │   ├── Applicants.tsx
│   │   ├── ModelTraining.tsx
│   │   └── ...
│   ├── student/         # Student-specific pages
│   │   ├── StudentDashboard.tsx
│   │   ├── ApplyScholarship.tsx
│   │   └── ...
│   ├── Home.tsx         # Public landing page
│   ├── Scholarships.tsx # Scholarship listing
│   └── ...
├── services/            # API and business logic
│   ├── apiClient.ts     # Axios configuration
│   ├── filterEngine.ts  # Client-side filtering
│   ├── prediction/      # Prediction services
│   └── ...
├── types/               # TypeScript definitions
├── utils/               # Utility functions
├── styles/              # Global styles
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

### State Management

The application uses React's built-in state management:

```typescript
// AuthContext - Global authentication state
const AuthContext = createContext<AuthContextType | null>(null);

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Usage in components
const { user, isAuthenticated, login, logout } = useAuth();
```

### Route Protection

```typescript
// ProtectedRoute component handles authentication
<ProtectedRoute allowedRoles={['student']}>
  <StudentDashboard />
</ProtectedRoute>

// Role-based rendering
{user?.role === 'admin' ? <AdminHeader /> : <StudentHeader />}
```

### API Client Architecture

```typescript
// apiClient.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
});

// Request interceptor - adds JWT token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handles token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      await refreshAccessToken();
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## Backend Architecture

### Technology Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| Mongoose | MongoDB ODM |
| JWT | Authentication |
| bcryptjs | Password hashing |
| express-validator | Input validation |
| multer | File upload handling |

### Directory Structure

```
backend/src/
├── middleware/          # Express middleware
│   ├── auth.middleware.js       # JWT authentication
│   ├── adminScope.middleware.js # Admin access control
│   └── upload.middleware.js     # File upload handling
├── models/              # Mongoose schemas
│   ├── User.model.js
│   ├── Scholarship.model.js
│   ├── Application.model.js
│   ├── TrainedModel.model.js
│   └── ...
├── routes/              # API route handlers
│   ├── auth.routes.js
│   ├── scholarship.routes.js
│   ├── application.routes.js
│   ├── prediction.routes.js
│   └── ...
├── services/            # Business logic layer
│   ├── eligibility.service.js
│   ├── prediction.service.js
│   ├── logisticRegression.service.js
│   ├── training.service.js
│   ├── ocrVerification.service.js
│   └── ...
└── server.js            # Application entry point
```

### Request Flow

```
HTTP Request
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│                     Express Middleware                         │
│  ┌─────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  CORS   │─▶│  Body Parser │─▶│  Auth JWT │─▶│ Role Check│  │
│  └─────────┘  └──────────────┘  └───────────┘  └───────────┘  │
│                                                     │          │
│  ┌──────────────┐  ┌────────────────┐              │          │
│  │ Scope Filter │◀─│ Admin Scope    │◀─────────────┘          │
│  └──────────────┘  └────────────────┘                         │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│                      Route Handler                             │
│  - Validate request                                            │
│  - Call service layer                                          │
│  - Format response                                             │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│                      Service Layer                             │
│  - Business logic execution                                    │
│  - Database operations via models                              │
│  - External API calls                                          │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│                      Data Layer                                │
│  - Mongoose models                                             │
│  - MongoDB queries                                             │
│  - Data transformation                                         │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
HTTP Response
```

### Middleware Stack

```javascript
// server.js
app.use(cors(corsOptions));           // Cross-origin requests
app.use(express.json({ limit: '1mb' })); // JSON body parsing
app.use(express.urlencoded({ extended: true }));

// Route-specific middleware
router.use(authMiddleware);           // JWT verification
router.use(requireRole(['admin']));   // Role-based access
router.use(attachAdminScope);         // Scope metadata
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────────┐       ┌──────────────────┐
│      USER       │       │    SCHOLARSHIP      │       │   APPLICATION    │
├─────────────────┤       ├─────────────────────┤       ├──────────────────┤
│ _id             │       │ _id                 │◀──────│ scholarship      │
│ email           │       │ name                │       │ _id              │
│ password        │       │ description         │       │ applicant        │──┐
│ firstName       │       │ sponsor             │       │ status           │  │
│ lastName        │       │ type                │       │ documents[]      │  │
│ role            │───┐   │ scholarshipLevel    │       │ eligibilityResult│  │
│ studentProfile  │   │   │ requirements        │       │ predictionResult │  │
│ adminProfile    │   │   │ requiredDocuments[] │       │ submittedAt      │  │
│ profileCompleted│   │   │ applicationDeadline │       └──────────────────┘  │
└─────────────────┘   │   │ status              │                             │
        ▲             │   │ createdBy           │─────────────────────────────┘
        │             │   └─────────────────────┘
        │             │
        │             └───────────────────────────────────┐
        │                                                 │
┌───────┴─────────┐       ┌─────────────────────┐        │
│  ACTIVITY LOG   │       │   TRAINED MODEL     │        │
├─────────────────┤       ├─────────────────────┤        │
│ _id             │       │ _id                 │        │
│ user            │───────│ scholarshipId       │◀───────┘
│ type            │       │ modelType           │
│ description     │       │ weights             │
│ metadata        │       │ metrics             │
│ createdAt       │       │ triggerType         │
└─────────────────┘       │ trainedBy           │
                          │ trainedAt           │
┌─────────────────┐       └─────────────────────┘
│  NOTIFICATION   │
├─────────────────┤
│ _id             │
│ user            │────────────────────────────────────────
│ type            │
│ title           │
│ message         │
│ read            │
│ createdAt       │
└─────────────────┘
```

### Key Schemas

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete schema documentation.

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────┐    POST /login    ┌─────────┐    Verify      ┌──────────┐
│ Client  │─────────────────▶ │ Backend │──────────────▶ │ MongoDB  │
└─────────┘                   └─────────┘                └──────────┘
                                   │
                                   │ Generate Tokens
                                   ▼
                              ┌─────────┐
                              │ Access  │ (30 min)
                              │ Token   │
                              └─────────┘
                              ┌─────────┐
                              │ Refresh │ (30 days)
                              │ Token   │
                              └─────────┘
                                   │
                                   │ Return to Client
                                   ▼
┌─────────┐    Tokens         ┌─────────┐
│ Client  │◀──────────────────│ Backend │
│         │                   └─────────┘
│ Store:  │
│ - Access Token (memory)
│ - Refresh Token (httpOnly cookie)
└─────────┘
```

### Authorization Levels

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHORIZATION PYRAMID                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌─────────────────┐                          │
│                    │   UNIVERSITY    │  All scholarships        │
│                    │     ADMIN       │  All applications        │
│                    └────────┬────────┘                          │
│                             │                                    │
│              ┌──────────────┴──────────────┐                    │
│              │                             │                    │
│         ┌────┴────┐                   ┌────┴────┐               │
│         │ COLLEGE │ College-level     │ COLLEGE │               │
│         │  ADMIN  │ scholarships      │  ADMIN  │               │
│         └────┬────┘                   └────┬────┘               │
│              │                             │                    │
│    ┌─────────┴─────────┐         ┌─────────┴─────────┐         │
│    │   ACADEMIC UNIT   │         │   ACADEMIC UNIT   │         │
│    │      ADMIN        │         │      ADMIN        │         │
│    └───────────────────┘         └───────────────────┘         │
│                                                                  │
│  ───────────────────────────────────────────────────────────    │
│                                                                  │
│                         ┌─────────┐                             │
│                         │ STUDENT │  Own applications           │
│                         └─────────┘  Public scholarships        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Scope Filtering

```javascript
// Admin scope determines data access
const scopeFilter = getScholarshipScopeFilter(admin);

// University admin: {}  (no filter - sees everything)
// College admin: { managingCollegeCode: 'CAS' }
// Academic Unit admin: { 
//   managingCollegeCode: 'CAS', 
//   managingAcademicUnitCode: 'ICS' 
// }

const scholarships = await Scholarship.find(scopeFilter);
```

---

## Machine Learning Pipeline

### Two-Stage Prediction System

```
                    STUDENT PROFILE + SCHOLARSHIP
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STAGE 1: RULE-BASED FILTERING                │
│                        (Hard Eligibility Checks)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │  GWA ≤ X   │  │ Income ≤ Y │  │ College in │  │ Year in   │ │
│  │            │  │            │  │ eligibles  │  │ eligibles │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                                                                  │
│            ANY FAIL ──▶ INELIGIBLE (Stop here)                  │
│            ALL PASS ──▶ Proceed to Stage 2                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (If eligible)
┌─────────────────────────────────────────────────────────────────┐
│                 STAGE 2: LOGISTIC REGRESSION                     │
│                  (Probability Estimation)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│         13 FEATURES                                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Base Features (9):                                         │  │
│  │ gwaScore, yearLevelMatch, incomeMatch, stBracketMatch,    │  │
│  │ collegeMatch, courseMatch, citizenshipMatch,              │  │
│  │ applicationTiming, eligibilityScore                       │  │
│  │                                                            │  │
│  │ Interaction Features (4):                                  │  │
│  │ academicStrength, financialNeed, programFit, overallFit   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│         ┌────────────────────────────────────────┐              │
│         │           LOGISTIC FUNCTION             │              │
│         │                                         │              │
│         │   P(approve) = 1 / (1 + e^(-z))        │              │
│         │   z = Σ(weight_i × feature_i) + bias   │              │
│         └────────────────────────────────────────┘              │
│                              │                                   │
│                              ▼                                   │
│                   PROBABILITY (0-100%)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Model Types

| Model Type | Training Data | Min Samples | Usage |
|------------|--------------|-------------|-------|
| `scholarship_specific` | Single scholarship decisions | 30 | Primary (if available) |
| `global` | All scholarship decisions | 50 | Fallback |

### Auto-Training Trigger

```javascript
// When application status changes to approved/rejected
async function onApplicationDecision(applicationId, scholarshipId, status, adminId) {
  // 1. Check if scholarship has enough data (≥30 labeled applications)
  const count = await Application.countDocuments({
    scholarship: scholarshipId,
    status: { $in: ['approved', 'rejected'] }
  });

  // 2. If threshold met, retrain in background
  if (count >= 30) {
    setImmediate(() => trainScholarshipModel(scholarshipId));
  }

  // 3. Every 10th decision, also retrain global model
  if (globalDecisionCount % 10 === 0) {
    setImmediate(() => trainGlobalModel());
  }
}
```

---

## External Integrations

### Cloudinary (Document Storage)

```
┌─────────┐  Upload   ┌─────────┐  Transform  ┌────────────┐
│ Client  │──────────▶│ Backend │────────────▶│ Cloudinary │
└─────────┘           └─────────┘             └────────────┘
                           │                        │
                           │  Store URL             │
                           ▼                        ▼
                      ┌─────────┐            ┌────────────┐
                      │ MongoDB │            │ CDN-backed │
                      │  (URL)  │            │  Storage   │
                      └─────────┘            └────────────┘
```

### Google Cloud Vision (OCR)

```
┌─────────┐  Request  ┌─────────┐  Image URL  ┌─────────────┐
│  Admin  │──────────▶│ Backend │────────────▶│ Cloud Vision│
│         │           │         │             │     API     │
└─────────┘           └─────────┘             └──────┬──────┘
                           │                         │
                           │                         │ Extracted Text
                           ▼                         ▼
                      ┌──────────────────────────────────┐
                      │         OCR SERVICE              │
                      │  - Parse text by document type   │
                      │  - Extract fields (GWA, name...) │
                      │  - Compare with declared values  │
                      │  - Generate match report         │
                      └──────────────────────────────────┘
```

---

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Network Security                                       │
│  ├── HTTPS enforcement                                           │
│  ├── CORS configuration                                          │
│  └── Rate limiting                                               │
│                                                                  │
│  Layer 2: Authentication                                         │
│  ├── JWT with short expiry (30 min)                             │
│  ├── Refresh token rotation                                      │
│  ├── Password hashing (bcrypt)                                   │
│  └── Email verification                                          │
│                                                                  │
│  Layer 3: Authorization                                          │
│  ├── Role-based access control                                   │
│  ├── Admin scope enforcement                                     │
│  └── Resource ownership verification                             │
│                                                                  │
│  Layer 4: Data Validation                                        │
│  ├── Input sanitization                                          │
│  ├── express-validator rules                                     │
│  └── MongoDB injection prevention                                │
│                                                                  │
│  Layer 5: Data Protection                                        │
│  ├── Sensitive data encryption                                   │
│  ├── Secure document URLs (Cloudinary signed)                    │
│  └── Minimal data exposure in responses                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Input Validation

```javascript
// Example validation rules
const applicationValidation = [
  body('scholarshipId')
    .isMongoId()
    .withMessage('Valid scholarship ID is required'),
  body('personalStatement')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .escape()
    .withMessage('Personal statement cannot exceed 5000 characters')
];
```

---

## Performance Considerations

### Database Optimization

| Strategy | Implementation |
|----------|---------------|
| Indexes | On frequently queried fields (email, status, scholarship) |
| Pagination | All list endpoints with configurable limits |
| Projection | Only return needed fields |
| Lean queries | Use `.lean()` for read-only operations |

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                     CACHING LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser Cache                                                   │
│  └── Static assets (CSS, JS, images)                            │
│                                                                  │
│  CDN Cache (Vercel)                                             │
│  └── Frontend bundle, static files                              │
│                                                                  │
│  Application Memory                                              │
│  └── UPLB structure data (colleges, courses)                    │
│  └── Active ML model weights                                     │
│                                                                  │
│  Database                                                        │
│  └── MongoDB query cache                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scalability

### Current Architecture Supports

- **Users**: ~10,000 concurrent users
- **Scholarships**: ~1,000 active scholarships
- **Applications**: ~100,000 applications

### Horizontal Scaling Path

```
                    ┌─────────────┐
                    │   Load      │
                    │  Balancer   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ Backend │      │ Backend │      │ Backend │
    │   #1    │      │   #2    │      │   #3    │
    └────┬────┘      └────┬────┘      └────┬────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   MongoDB Atlas       │
              │   (Replica Set)       │
              └───────────────────────┘
```

### Future Considerations

- Redis for session/cache management
- Message queue for async operations
- Microservices for ML pipeline
- CDN for document delivery

---

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md)
- [API Reference](./API_REFERENCE.md)
- [ML Prediction System](./ML_PREDICTION_FACTORS.md)
- [Admin Scope Protection](./ADMIN_SCOPE_ROUTE_PROTECTION_PLAN.md)
