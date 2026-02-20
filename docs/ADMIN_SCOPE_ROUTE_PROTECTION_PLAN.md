# ISKOlarship — Admin Scope & Route Protection Plan

> **Version:** 1.0  
> **Date:** 2025-01-XX  
> **Status:** Ready for Implementation  
> **Scope:** Backend route-level authorization, frontend scope-aware UI  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema Reference](#3-database-schema-reference)
4. [Existing Middleware Inventory](#4-existing-middleware-inventory)
5. [Current State — Route-by-Route Audit](#5-current-state--route-by-route-audit)
6. [Vulnerability Summary](#6-vulnerability-summary)
7. [Design Decisions](#7-design-decisions)
8. [Implementation Plan](#8-implementation-plan)
   - Phase 1: Backend — Protect Existing Routes
   - Phase 2: Backend — New Scope Utilities
   - Phase 3: Frontend — Scope-Aware UI
   - Phase 4: Testing & Verification
9. [Detailed Route Fix Specifications](#9-detailed-route-fix-specifications)
10. [Frontend Implementation Details](#10-frontend-implementation-details)
11. [Testing Strategy](#11-testing-strategy)
12. [Migration & Rollback Plan](#12-migration--rollback-plan)
13. [Implementation Checklist](#13-implementation-checklist)

---

## 1. Executive Summary

The ISKOlarship platform has a three-tier admin hierarchy:

| Level | Field Value | Sees |
|-------|------------|------|
| **University** | `accessLevel: 'university'` | All scholarships at all levels |
| **College** | `accessLevel: 'college'` | Only `scholarshipLevel: 'college'` with matching `managingCollegeCode` |
| **Academic Unit** | `accessLevel: 'academic_unit'` | Only `scholarshipLevel: 'academic_unit'` with matching `managingCollegeCode` AND `managingAcademicUnitCode` |

The `adminScope.middleware.js` already implements robust scope-filtering functions. However, **many route handlers do not use them**. This plan closes every gap with specific, actionable changes per file.

### Critical Findings

- **training.routes.js** — ZERO scope enforcement on all 7 endpoints
- **statistics.routes.js** — No authentication on `/overview`; no scope filters anywhere
- **prediction.routes.js** — Admin endpoints (train, reset, stats, analytics) unprotected
- **user.routes.js** — Any admin can list/view all users
- **application.routes.js** — `GET /:id` and document proxy lack admin scope checks
- **scholarship.routes.js** — `GET /:id` detailed view lacks admin scope for admin-only fields
- **Frontend** — `ProtectedRoute` only checks role (student vs admin), never admin `accessLevel`

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React/Vite)                     │
│  ProtectedRoute checks role ──► needs accessLevel check added   │
│  Admin pages call /admin/* ──► need scope badge + nav filtering │
└────────────────────────────┬────────────────────────────────────┘
                             │ Axios (JWT in Authorization header)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Express)                            │
│                                                                  │
│  1. authMiddleware ──► JWT decode, attach req.user               │
│  2. requireRole(['admin']) ──► role gate                         │
│  3. requireAdminLevel('X') ──► hierarchy gate (optional)         │
│  4. attachAdminScope ──► attach scope metadata to req            │
│  5. Route handler ──► must call scope filter/check functions     │
│                                                                  │
│  Scope Functions (adminScope.middleware.js):                      │
│  • getScholarshipScopeFilter(user) → MongoDB query               │
│  • getApplicationScopeFilter(user, scholarshipIds) → query       │
│  • canManageScholarship(user, scholarship) → boolean             │
│  • canViewScholarship(user, scholarship) → boolean               │
│  • canManageApplication(user, application) → boolean             │
│  • requireScholarshipAccess() → middleware                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Reference

### 3.1 User Model (`User.model.js`)

```
adminProfile: {
  accessLevel:       'university' | 'college' | 'academic_unit'
  collegeCode:       'CAS' | 'CAFS' | 'CEM' | ... | null
  academicUnitCode:  'ICS' | 'DCHE' | 'DAE' | ... | null
  universityUnitCode: 'OSA' | 'OVCAA' | ... | null
  permissions:       ['manage_scholarships', 'review_applications', ...]
  college:           (legacy — full name string)
  academicUnit:      (legacy — full name string)
}
```

**Key indexes:** `role`, `isActive`, `studentProfile.college`, `studentProfile.collegeCode`, `studentProfile.academicUnitCode`

### 3.2 Scholarship Model (`Scholarship.model.js`)

```
scholarshipLevel:       'university' | 'college' | 'academic_unit' | 'external'
managingCollegeCode:    'CAS' | 'CAFS' | ... | null
managingAcademicUnitCode: 'ICS' | 'DCHE' | ... | null
managingCollege:        (legacy — full name string)
managingAcademicUnit:   (legacy — full name string)
```

### 3.3 Application Model (`Application.model.js`)

**No direct scope fields.** Scope is derived through the populated `scholarship` reference:

```
scholarship: { type: ObjectId, ref: 'Scholarship' }  // → populate, then check scope
```

Current approach in `application.routes.js`:
1. Query all scholarships visible to admin → get IDs
2. Filter applications where `scholarship ∈ IDs`

### 3.4 TrainedModel (`TrainedModel.model.js`)

```
scholarshipId:  ObjectId ref → Scholarship  (null for global models)
modelType:      'global' | 'scholarship_specific'
```

**Scope rule:** Admin can manage a trained model if they can manage its linked scholarship. Global models (`scholarshipId: null`) should be restricted to **university-level admins only**.

---

## 4. Existing Middleware Inventory

### 4.1 `auth.middleware.js` — Exports

| Function | Purpose | Used By |
|----------|---------|---------|
| `authMiddleware` | JWT decode → `req.user` | All protected routes |
| `optionalAuth` | JWT decode if present, no error | Public routes with optional auth |
| `requireRole([...roles])` | Gate by `req.user.role` | All admin/student routes |
| `requireAdminLevel(level)` | Hierarchy check (academic_unit < college < university) | `PUT /users/:id/status` only |
| `requireOwnerOrAdmin(getOwnerId)` | Resource owner OR any admin | `GET /applications/:id`, `PUT /applications/:id` |
| `rateLimit(max, windowMs)` | Request throttling | Auth routes |

### 4.2 `adminScope.middleware.js` — Exports

| Function | Purpose | Currently Used |
|----------|---------|----------------|
| `getScholarshipScopeFilter(user)` | Returns MongoDB `{ $or: [...] }` query | `GET /scholarships/admin`, `GET /applications/admin` |
| `getApplicationScopeFilter(user, ids)` | Returns app query scoped by scholarship IDs | `GET /applications/admin`, review-queue, stats |
| `attachAdminScope` | Middleware: attaches `req.adminScope` | ❌ Defined but NOT used in any route |
| `canManageScholarship(user, scholarship)` | Boolean: can this admin manage? | `PUT /scholarships/:id`, `DELETE /scholarships/:id` |
| `canViewScholarship(user, scholarship)` | Boolean: can this admin view? | Same as manage (clean separation) |
| `canManageApplication(user, application)` | Boolean: can manage this application? | `PUT /applications/:id/status` |
| `requireScholarshipAccess()` | Middleware: checks `:id` param | ❌ Defined but NOT used in any route |
| `getAdminScopeSummary(user)` | Returns summary object for UI | `GET /scholarships/admin/scope` |

### 4.3 Key Design: Clean Separation (NOT Hierarchical)

The existing `adminScope.middleware.js` implements **clean separation**:

```javascript
// From adminScope.middleware.js — getScholarshipScopeFilter():
case 'college':
  return {
    scholarshipLevel: 'college',                    // ← ONLY college level
    managingCollegeCode: user.adminProfile.collegeCode
  };
case 'academic_unit':
  return {
    scholarshipLevel: 'academic_unit',              // ← ONLY academic_unit level
    managingCollegeCode: user.adminProfile.collegeCode,
    managingAcademicUnitCode: user.adminProfile.academicUnitCode
  };
```

**This means:** A college admin does NOT see academic_unit-level scholarships under their college. Each admin level manages ONLY scholarships explicitly created at their level. This is an intentional design decision documented in the middleware and should be preserved.

---

## 5. Current State — Route-by-Route Audit

### Legend
- ✅ = Properly scope-protected  
- ⚠️ = Partially protected (has auth but missing scope)  
- ❌ = Missing scope enforcement  
- 🔓 = Missing authentication entirely

### 5.1 `scholarship.routes.js` (mounted at `/api/scholarships`)

| Method | Path | Auth | Scope | Status | Notes |
|--------|------|------|-------|--------|-------|
| GET | `/` | `optionalAuth` | N/A (public) | ✅ | Returns active scholarships to students/guests |
| GET | `/admin` | `authMiddleware` + `requireRole([admin])` | `getScholarshipScopeFilter` | ✅ | Properly scoped |
| GET | `/admin/scope` | `authMiddleware` + `requireRole([admin])` | `getAdminScopeSummary` | ✅ | Returns admin's scope summary |
| GET | `/:id` | `optionalAuth` | None | ⚠️ | Public view is fine, but admin gets unscoped detailed data |
| POST | `/` | `authMiddleware` + `requireRole([admin])` | Inline validation | ✅ | Validates admin can create at requested level |
| PUT | `/:id` | `authMiddleware` + `requireRole([admin])` | `canManageScholarship` | ✅ | Proper scope check |
| DELETE | `/:id` | `authMiddleware` + `requireRole([admin])` | `canManageScholarship` | ✅ | Proper scope check |

### 5.2 `application.routes.js` (mounted at `/api/applications`)

| Method | Path | Auth | Scope | Status | Notes |
|--------|------|------|-------|--------|-------|
| GET | `/my` | `authMiddleware` + student | N/A (own) | ✅ | Student's own applications |
| POST | `/` | `authMiddleware` + student | N/A (own) | ✅ | Student applying |
| GET | `/admin` | `authMiddleware` + `requireRole([admin])` | `getScholarshipScopeFilter` → filter apps | ✅ | Scoped via scholarship IDs |
| GET | `/admin/review-queue` | `authMiddleware` + `requireRole([admin])` | `getScholarshipScopeFilter` → filter | ✅ | Scoped |
| GET | `/admin/stats` | `authMiddleware` + `requireRole([admin])` | `getScholarshipScopeFilter` → filter | ✅ | Scoped |
| GET | `/:id` | `authMiddleware` + `requireOwnerOrAdmin` | None for admin path | ⚠️ | Student owner OK; any admin sees any app |
| PUT | `/:id/status` | `authMiddleware` + `requireRole([admin])` | `canManageApplication` | ✅ | Proper scope check |
| POST | `/:applicationId/submit` | `authMiddleware` + student | N/A (own) | ✅ | Student's own |
| GET | `/:applicationId/documents/:documentId` | `authMiddleware` | Owner check only | ⚠️ | Admin path has no scope check |
| GET | `/:applicationId/documents/:documentId/proxy` | `authMiddleware` | Owner check only | ⚠️ | Admin proxy has no scope check |

### 5.3 `training.routes.js` (mounted at `/api/training`)

| Method | Path | Auth | Scope | Status | Notes |
|--------|------|------|-------|--------|-------|
| POST | `/train` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin can train global model |
| POST | `/train/:scholarshipId` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin can train any scholarship's model |
| POST | `/train-all` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin can train ALL models |
| GET | `/models` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin sees all trained models |
| POST | `/models/:modelId/activate` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin can activate any model |
| DELETE | `/models/:modelId` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin can delete any model |
| GET | `/scholarships/trainable` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Returns all scholarships as trainable |

### 5.4 `prediction.routes.js` (mounted at `/api/predictions`)

| Method | Path | Auth | Scope | Status | Notes |
|--------|------|------|-------|--------|-------|
| POST | `/eligibility` | `authMiddleware` | N/A (own) | ✅ | Student self-check |
| POST | `/probability` | `authMiddleware` | N/A (own) | ✅ | Student self-check |
| POST | `/batch` | `authMiddleware` | N/A (own) | ✅ | Student batch prediction |
| POST | `/application/:applicationId` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin can predict on any application |
| POST | `/model/train` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin can train |
| POST | `/model/reset` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin can reset a model |
| GET | `/model/stats` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin sees all model stats |
| GET | `/analytics/factors` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin sees all analytics |

### 5.5 `statistics.routes.js` (mounted at `/api/statistics`)

| Method | Path | Auth | Scope | Status | Notes |
|--------|------|------|-------|--------|-------|
| GET | `/overview` | None | None | 🔓 | **PUBLICLY ACCESSIBLE** — no auth at all |
| GET | `/trends` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin, unscoped aggregation |
| GET | `/scholarships` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin sees all scholarship stats |
| GET | `/prediction-accuracy` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin sees all prediction metrics |
| GET | `/analytics` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin sees complete analytics |

### 5.6 `user.routes.js` (mounted at `/api/users`)

| Method | Path | Auth | Scope | Status | Notes |
|--------|------|------|-------|--------|-------|
| GET | `/profile` | `authMiddleware` | N/A (own) | ✅ | Own profile |
| PUT | `/profile` | `authMiddleware` | N/A (own) | ✅ | Own profile update |
| GET | `/` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin lists ALL users |
| GET | `/stats/overview` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin sees global stats |
| GET | `/:id` | `authMiddleware` + `requireRole([admin])` | None | ❌ | Any admin views any user |
| PUT | `/:id/status` | `authMiddleware` + `requireAdminLevel('university')` | `requireAdminLevel` | ✅ | University only |
| POST | `/documents/upload` | `authMiddleware` | N/A (own) | ✅ | Own documents |
| GET | `/documents/:documentId` | `authMiddleware` | Owner check | ⚠️ | Admin can access any student doc without scope |
| DELETE | `/documents/:documentId` | `authMiddleware` + student | N/A (own) | ✅ | Student's own |
| GET | `/uplb-structure/*` | `authMiddleware` | N/A (reference data) | ✅ | Org structure data |

### 5.7 `auth.routes.js` (mounted at `/api/auth`)

All auth routes (register, login, verify-email, etc.) are public or own-user operations. **No scope changes needed.**

---

## 6. Vulnerability Summary

### 6.1 Critical (Data Exposure / Unauthorized Modification)

| # | Route File | Issue | Impact |
|---|-----------|-------|--------|
| C1 | `training.routes.js` | ALL 7 endpoints lack scope | Academic unit admin can train/delete university models |
| C2 | `statistics.routes.js` | `GET /overview` has NO auth | Anyone on the internet can see platform stats |
| C3 | `prediction.routes.js` | Admin endpoints unscoped | College admin can manipulate university prediction models |
| C4 | `application.routes.js` | `GET /:id` any admin | College admin can read CAS student's application to CEAT scholarship |
| C5 | `user.routes.js` | `GET /`, `GET /:id` unscoped | Academic unit admin can browse all university users |

### 6.2 Medium (Information Disclosure)

| # | Route File | Issue | Impact |
|---|-----------|-------|--------|
| M1 | `statistics.routes.js` | All admin stats unscoped | College admin sees university-wide metrics |
| M2 | `user.routes.js` | `/stats/overview` unscoped | Academic unit admin sees total user counts |
| M3 | `application.routes.js` | Document proxy unscoped | Admin can proxy-stream documents from out-of-scope apps |
| M4 | `scholarship.routes.js` | `GET /:id` public + admin detail | Admin gets `canManage`/`canView` without scope validation |

### 6.3 Low (UX / Defense in Depth)

| # | Area | Issue |
|---|------|-------|
| L1 | Frontend | `ProtectedRoute` doesn't filter by admin level |
| L2 | Frontend | Navigation shows all admin pages regardless of scope |
| L3 | Frontend | No scope badge/indicator for admin |

---

## 7. Design Decisions

### 7.1 Clean Separation vs Hierarchical Scope

**Decision: Keep Clean Separation** (already implemented)

- University admin → sees **all** scholarships at **all** levels
- College admin → sees **only** `scholarshipLevel: 'college'` with matching `managingCollegeCode`
- Academic unit admin → sees **only** `scholarshipLevel: 'academic_unit'` with matching codes

This means a college admin does NOT automatically see academic_unit scholarships under their college. This is the intentional design already in `adminScope.middleware.js`.

### 7.2 User Visibility Rules for Non-University Admins

**Decision:** Scope user listing to applicants of in-scope scholarships.

A college admin should only see users (students) who have applied to scholarships that the admin manages. This prevents data exposure while still allowing admins to review their applicants.

**Alternative considered:** Filter users by `studentProfile.collegeCode`. Rejected because student college doesn't necessarily match scholarship scope.

### 7.3 Global ML Model Access

**Decision:** Only university-level admins can train/manage global models.

Scholarship-specific models follow the same scope rules as the scholarship itself.

### 7.4 Statistics Scoping

**Decision:** Filter all statistics aggregations by the admin's visible scholarship set.

`GET /statistics/overview` should require authentication. All aggregation pipelines should use `{ scholarship: { $in: scopedScholarshipIds } }` as a base match stage.

### 7.5 `requireScholarshipAccess()` Middleware Adoption

The existing `requireScholarshipAccess()` middleware is defined but unused. It loads a scholarship by `:id` param and checks `canManageScholarship()`. We should adopt it wherever possible to DRY up route handlers.

---

## 8. Implementation Plan

### Phase 1: Backend — Fix Existing Routes (Priority: HIGH)

**Goal:** Apply existing scope functions to all unprotected admin routes.

| Task | File | Est. Effort |
|------|------|-------------|
| 1.1 | `statistics.routes.js` — Add auth + scope to all 5 endpoints | 1-2 hrs |
| 1.2 | `training.routes.js` — Add scope to all 7 endpoints | 2-3 hrs |
| 1.3 | `prediction.routes.js` — Add scope to 5 admin endpoints | 1-2 hrs |
| 1.4 | `application.routes.js` — Scope `GET /:id` + document proxy | 1 hr |
| 1.5 | `user.routes.js` — Scope user listing + view | 1-2 hrs |
| 1.6 | `scholarship.routes.js` — Scope-aware `GET /:id` for admin detail | 30 min |

### Phase 2: Backend — New Scope Utilities (Priority: MEDIUM)

**Goal:** Add helper functions for training/statistics scoping.

| Task | File | Est. Effort |
|------|------|-------------|
| 2.1 | Add `getTrainedModelScopeFilter(user)` to `adminScope.middleware.js` | 30 min |
| 2.2 | Add `getScopedScholarshipIds(user)` helper for statistics | 30 min |
| 2.3 | Add `canManageTrainedModel(user, model)` check | 30 min |
| 2.4 | Add `getUserScopeFilter(user)` for user listing | 1 hr |

### Phase 3: Frontend — Scope-Aware UI (Priority: MEDIUM)

**Goal:** Frontend respects admin scope for UX (defense in depth — backend is the real gate).

| Task | File | Est. Effort |
|------|------|-------------|
| 3.1 | Enhance `ProtectedRoute` with optional `requiredAdminLevel` prop | 30 min |
| 3.2 | Add scope context/hook (`useAdminScope`) | 1 hr |
| 3.3 | Filter navigation items by admin scope | 1 hr |
| 3.4 | Add admin scope badge to sidebar/header | 30 min |
| 3.5 | Conditionally hide training page features by scope | 30 min |

### Phase 4: Testing & Verification (Priority: HIGH)

| Task | Est. Effort |
|------|-------------|
| 4.1 | Create scope verification scripts (one per route file) | 2-3 hrs |
| 4.2 | Update existing test files for scope assertions | 1-2 hrs |
| 4.3 | Manual E2E test matrix (3 admin levels × critical routes) | 2-3 hrs |

---

## 9. Detailed Route Fix Specifications

### 9.1 `statistics.routes.js` — All Endpoints

#### `GET /overview` — Add Authentication

**Current:** No auth middleware at all.

**Fix:**
```javascript
// BEFORE
router.get('/overview', async (req, res, next) => { ... });

// AFTER
router.get('/overview',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  async (req, res, next) => {
    const scopeFilter = getScholarshipScopeFilter(req.user);
    const scopedScholarships = await Scholarship.find(scopeFilter).select('_id');
    const scopedIds = scopedScholarships.map(s => s._id);
    
    // Use scopedIds in all aggregation queries:
    // - Total scholarships: Scholarship.countDocuments(scopeFilter)
    // - Total applications: Application.countDocuments({ scholarship: { $in: scopedIds } })
    // - Active students: derived from scoped applications
    // ...
  }
);
```

#### `GET /trends`, `/scholarships`, `/prediction-accuracy`, `/analytics`

**Fix pattern (same for all):**
```javascript
// At the start of each handler, after auth:
const scopeFilter = getScholarshipScopeFilter(req.user);
const scopedScholarships = await Scholarship.find(scopeFilter).select('_id');
const scopedIds = scopedScholarships.map(s => s._id);

// Insert into every aggregation pipeline as $match stage:
{ $match: { scholarship: { $in: scopedIds } } }  // for Application aggregations
// OR
{ $match: scopeFilter }  // for Scholarship aggregations
```

### 9.2 `training.routes.js` — All Endpoints

#### `POST /train` (Global Training)

**Fix:** Restrict to university-level admin only.
```javascript
// BEFORE
router.post('/train',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  async (req, res, next) => { ... }
);

// AFTER
router.post('/train',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  requireAdminLevel('university'),     // ← ADD: only university admin
  async (req, res, next) => { ... }
);
```

#### `POST /train/:scholarshipId` (Scholarship-Specific Training)

**Fix:** Check admin can manage the target scholarship.
```javascript
// At the start of the handler:
const scholarship = await Scholarship.findById(req.params.scholarshipId);
if (!scholarship) {
  return res.status(404).json({ success: false, message: 'Scholarship not found' });
}
if (!canManageScholarship(req.user, scholarship)) {
  return res.status(403).json({ success: false, message: 'No permission to train model for this scholarship' });
}
```

#### `POST /train-all` (Train All Models)

**Fix:** Restrict to university-level admin only.
```javascript
router.post('/train-all',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  requireAdminLevel('university'),     // ← ADD
  async (req, res, next) => { ... }
);
```

#### `GET /models` (List Trained Models)

**Fix:** Filter models by scoped scholarships.
```javascript
// At handler start:
const scopeFilter = getScholarshipScopeFilter(req.user);
const scopedScholarships = await Scholarship.find(scopeFilter).select('_id');
const scopedIds = scopedScholarships.map(s => s._id);

// Query:
const isUniversity = req.user.adminProfile.accessLevel === 'university';
const modelFilter = isUniversity
  ? {}  // university sees all
  : {
      $or: [
        { scholarshipId: { $in: scopedIds } },
        // Optionally show global models as read-only:
        // { modelType: 'global', scholarshipId: null }
      ]
    };

const models = await TrainedModel.find(modelFilter).populate('scholarshipId', 'name scholarshipLevel');
```

#### `POST /models/:modelId/activate` and `DELETE /models/:modelId`

**Fix:** Load model → load linked scholarship → check `canManageScholarship`.
```javascript
const model = await TrainedModel.findById(req.params.modelId).populate('scholarshipId');
if (!model) return res.status(404).json({ success: false, message: 'Model not found' });

// Global model: university only
if (!model.scholarshipId || model.modelType === 'global') {
  if (req.user.adminProfile.accessLevel !== 'university') {
    return res.status(403).json({ success: false, message: 'Only university admins can manage global models' });
  }
} else {
  // Scholarship-specific model: check scholarship scope
  if (!canManageScholarship(req.user, model.scholarshipId)) {
    return res.status(403).json({ success: false, message: 'No permission to manage this model' });
  }
}
```

#### `GET /scholarships/trainable`

**Fix:** Apply scope filter to the scholarship query.
```javascript
const scopeFilter = getScholarshipScopeFilter(req.user);
const trainableScholarships = await Scholarship.find({
  ...scopeFilter,
  isActive: true
}).select('name scholarshipLevel managingCollegeCode');
```

### 9.3 `prediction.routes.js` — Admin Endpoints

#### `POST /application/:applicationId` (Predict for Application)

**Fix:** Load application → populate scholarship → check `canManageApplication`.
```javascript
const application = await Application.findById(req.params.applicationId)
  .populate('scholarship');
if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
if (!canManageApplication(req.user, application)) {
  return res.status(403).json({ success: false, message: 'No permission for this application' });
}
```

#### `POST /model/train`, `POST /model/reset`

**Fix:** Restrict to university-level admin (these operate on global model).
```javascript
router.post('/model/train',
  authMiddleware,
  requireRole([UserRole.ADMIN]),
  requireAdminLevel('university'),    // ← ADD
  async (req, res, next) => { ... }
);
```

#### `GET /model/stats`, `GET /analytics/factors`

**Fix:** Filter by scoped scholarships in the aggregation.
```javascript
const scopeFilter = getScholarshipScopeFilter(req.user);
const scopedScholarships = await Scholarship.find(scopeFilter).select('_id');
const scopedIds = scopedScholarships.map(s => s._id);

// Use scopedIds in all queries that touch Application or TrainedModel
```

### 9.4 `application.routes.js` — Gap Fixes

#### `GET /:id` (Single Application Detail)

**Current:** Uses `requireOwnerOrAdmin(...)` which passes any admin. Need to add scope check for admin path.

**Fix:** After loading application, if user is admin, check scope:
```javascript
// After existing requireOwnerOrAdmin succeeds:
if (req.user.role === UserRole.ADMIN) {
  const populatedApp = await Application.findById(req.params.id).populate('scholarship');
  if (!canManageApplication(req.user, populatedApp)) {
    return res.status(403).json({ success: false, message: 'This application is outside your scope' });
  }
}
```

#### `GET /:applicationId/documents/:documentId` and `/proxy`

**Fix:** Same pattern — if admin, verify scope before streaming:
```javascript
if (req.user.role === UserRole.ADMIN) {
  const application = await Application.findById(req.params.applicationId).populate('scholarship');
  if (application && !canManageApplication(req.user, application)) {
    return res.status(403).json({ success: false, message: 'No permission to access this document' });
  }
}
```

### 9.5 `user.routes.js` — Gap Fixes

#### `GET /` (List Users)

**Fix:** Scope the user query based on admin level:

```javascript
// For university admin: no filter change (sees all)
// For college/academic_unit admin: only show students who applied to in-scope scholarships

if (req.user.adminProfile.accessLevel === 'university') {
  // existing query — all users
} else {
  const scopeFilter = getScholarshipScopeFilter(req.user);
  const scopedScholarships = await Scholarship.find(scopeFilter).select('_id');
  const scopedIds = scopedScholarships.map(s => s._id);
  
  // Find students who have applied to scoped scholarships
  const applicantIds = await Application.distinct('applicant', {
    scholarship: { $in: scopedIds }
  });
  
  // Add to query filter
  query._id = { $in: applicantIds };
  query.role = 'student';  // Non-university admins should only see students
}
```

#### `GET /:id` (View User)

**Fix:** Same approach — if not university admin, verify the user has an application to an in-scope scholarship:
```javascript
if (req.user.adminProfile.accessLevel !== 'university') {
  const scopeFilter = getScholarshipScopeFilter(req.user);
  const scopedScholarships = await Scholarship.find(scopeFilter).select('_id');
  const hasRelation = await Application.exists({
    applicant: req.params.id,
    scholarship: { $in: scopedScholarships.map(s => s._id) }
  });
  if (!hasRelation) {
    return res.status(403).json({ success: false, message: 'User is outside your administrative scope' });
  }
}
```

#### `GET /stats/overview`

**Fix:** Scope counts by in-scope scholarships (same pattern as statistics).

### 9.6 `scholarship.routes.js` — Minor Fix

#### `GET /:id` (Single Scholarship Detail)

**Current:** Public view is fine for students/guests. When admin accesses, the response includes `canManage` / `canView` flags but doesn't actually validate admin scope to block access.

**Fix:** If admin, run scope check:
```javascript
if (req.user && req.user.role === UserRole.ADMIN) {
  if (!canViewScholarship(req.user, scholarship)) {
    return res.status(403).json({
      success: false,
      message: 'This scholarship is outside your administrative scope'
    });
  }
  // Add management flags to response
  scholarship._doc.canManage = canManageScholarship(req.user, scholarship);
  scholarship._doc.canView = true;
}
```

---

## 10. Frontend Implementation Details

### 10.1 Admin Scope Context (`useAdminScope` Hook)

Create `frontend/src/utils/useAdminScope.ts`:

```typescript
import { useAuth } from '../App';  // or wherever AuthContext is
import { AdminAccessLevel } from '../types';

export interface AdminScope {
  accessLevel: AdminAccessLevel;
  collegeCode: string | null;
  academicUnitCode: string | null;
  isUniversity: boolean;
  isCollege: boolean;
  isAcademicUnit: boolean;
  canAccessRoute: (requiredLevel?: AdminAccessLevel) => boolean;
}

export function useAdminScope(): AdminScope | null {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') return null;
  
  const admin = user as AdminProfile;
  const level = admin.accessLevel;
  
  const hierarchy: Record<AdminAccessLevel, number> = {
    [AdminAccessLevel.ACADEMIC_UNIT]: 0,
    [AdminAccessLevel.COLLEGE]: 1,
    [AdminAccessLevel.UNIVERSITY]: 2,
  };
  
  return {
    accessLevel: level,
    collegeCode: admin.collegeCode ?? null,
    academicUnitCode: admin.academicUnitCode ?? null,
    isUniversity: level === AdminAccessLevel.UNIVERSITY,
    isCollege: level === AdminAccessLevel.COLLEGE,
    isAcademicUnit: level === AdminAccessLevel.ACADEMIC_UNIT,
    canAccessRoute: (requiredLevel?: AdminAccessLevel) => {
      if (!requiredLevel) return true;
      return hierarchy[level] >= hierarchy[requiredLevel];
    },
  };
}
```

### 10.2 Enhanced ProtectedRoute

Extend `ProtectedRoute.tsx` to accept optional `requiredAdminLevel`:

```tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredAdminLevel?: AdminAccessLevel;  // ← NEW
}

// Inside component:
if (requiredAdminLevel && user.role === UserRole.ADMIN) {
  const scope = useAdminScope();
  if (scope && !scope.canAccessRoute(requiredAdminLevel)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
}
```

### 10.3 Route Definitions Update (App.tsx)

```tsx
// Example: Training page requires at least college level
<Route path="/admin/training" element={
  <ProtectedRoute requiredRole={UserRole.ADMIN} requiredAdminLevel={AdminAccessLevel.COLLEGE}>
    <ModelTraining />
  </ProtectedRoute>
} />

// Example: User management requires university level
<Route path="/admin/users" element={
  <ProtectedRoute requiredRole={UserRole.ADMIN} requiredAdminLevel={AdminAccessLevel.UNIVERSITY}>
    <UserManagement />
  </ProtectedRoute>
} />
```

### 10.4 Navigation Filtering

In the admin sidebar/nav component, conditionally render items:

```tsx
const scope = useAdminScope();

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', minLevel: undefined },          // all admins
  { path: '/admin/scholarships', label: 'Scholarships', minLevel: undefined },     // all admins (scoped by backend)  
  { path: '/admin/applications', label: 'Applications', minLevel: undefined },     // all admins (scoped by backend)
  { path: '/admin/training', label: 'ML Training', minLevel: AdminAccessLevel.COLLEGE },  // college+
  { path: '/admin/analytics', label: 'Analytics', minLevel: undefined },           // all (scoped by backend)
  { path: '/admin/users', label: 'User Management', minLevel: AdminAccessLevel.UNIVERSITY }, // university only
];

const visibleItems = navItems.filter(item => 
  !item.minLevel || scope?.canAccessRoute(item.minLevel)
);
```

### 10.5 Admin Scope Badge

Add a scope indicator in the admin header/sidebar:

```tsx
function AdminScopeBadge() {
  const scope = useAdminScope();
  if (!scope) return null;
  
  const labels = {
    university: { text: 'University Admin', color: 'bg-purple-100 text-purple-800' },
    college: { text: `College Admin · ${scope.collegeCode}`, color: 'bg-blue-100 text-blue-800' },
    academic_unit: { text: `Dept Admin · ${scope.academicUnitCode}`, color: 'bg-green-100 text-green-800' },
  };
  
  const config = labels[scope.accessLevel];
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.text}</span>;
}
```

---

## 11. Testing Strategy

### 11.1 Backend Scope Verification Script

Create `backend/scripts/verification/test-route-scope.js`:

Test matrix — for each of the 3 admin levels, call every protected endpoint and verify:
- University admin: 200 OK on all
- College admin: 200 only on scoped data, 403 on out-of-scope
- Academic unit admin: 200 only on own unit's data, 403 on everything else

### 11.2 Test Accounts Required

| Admin Level | collegeCode | academicUnitCode | Used To Test |
|-------------|-------------|-------------------|-------------|
| University | null | null | Full access |
| College (CAS) | CAS | null | CAS college-level only |
| College (CEAT) | CEAT | null | Cross-college denial |
| Academic Unit (ICS) | CAS | ICS | ICS unit-level only |
| Academic Unit (DCHE) | CEAT | DCHE | Cross-unit denial |

### 11.3 Critical Test Cases

| # | Test | Admin Level | Action | Expected |
|---|------|------------|--------|----------|
| T01 | Training scope | Academic Unit (ICS) | `POST /train/:universityScholarshipId` | 403 |
| T02 | Training scope | College (CAS) | `POST /train/:casCollegeScholarshipId` | 200 |
| T03 | Training scope | College (CAS) | `POST /train` (global) | 403 |
| T04 | Training scope | University | `POST /train` | 200 |
| T05 | Statistics scope | College (CAS) | `GET /statistics/overview` | 200, only CAS data |
| T06 | Statistics scope | Academic Unit (ICS) | `GET /statistics/analytics` | 200, only ICS data |
| T07 | Application scope | College (CEAT) | `GET /applications/:casAppId` | 403 |
| T08 | Application scope | College (CAS) | `GET /applications/:casAppId` | 200 |
| T09 | Model management | Academic Unit (ICS) | `DELETE /models/:globalModelId` | 403 |
| T10 | Model management | University | `DELETE /models/:globalModelId` | 200 |
| T11 | User listing | College (CAS) | `GET /users` | Only CAS applicants |
| T12 | User listing | University | `GET /users` | All users |
| T13 | Document proxy | College (CEAT) | `GET /applications/:casAppId/documents/:docId/proxy` | 403 |
| T14 | Trainable scholarships | Academic Unit (ICS) | `GET /training/scholarships/trainable` | Only ICS scholarships |
| T15 | Statistics no auth | Unauthenticated | `GET /statistics/overview` | 401 (currently 200!) |

### 11.4 Automated Verification Approach

```javascript
// Pseudocode for test runner
const ADMINS = {
  university: { token: '...', expected: { scholarships: 'all', users: 'all' } },
  college_cas: { token: '...', expected: { scholarships: 'cas-college-only', users: 'cas-applicants' } },
  academic_ics: { token: '...', expected: { scholarships: 'ics-only', users: 'ics-applicants' } },
};

for (const [level, config] of Object.entries(ADMINS)) {
  // Test each endpoint group
  await testScholarshipRoutes(config);
  await testApplicationRoutes(config);
  await testTrainingRoutes(config);
  await testStatisticsRoutes(config);
  await testUserRoutes(config);
  await testPredictionRoutes(config);
}
```

---

## 12. Migration & Rollback Plan

### 12.1 Pre-Implementation Checklist

- [ ] Verify all seeded admin accounts have correct `accessLevel`, `collegeCode`, `academicUnitCode`
- [ ] Verify all existing scholarships have `scholarshipLevel`, `managingCollegeCode`, `managingAcademicUnitCode`
- [ ] Create database backup before applying changes
- [ ] Test with existing admin JWT tokens to ensure no breaking changes

### 12.2 Backward Compatibility

All changes are **additive** — we're adding scope checks to routes that currently have none. No API contracts change:
- Same request/response schemas
- Same URL paths
- Admins with proper scope get identical responses
- Only out-of-scope admins receive new 403 errors

### 12.3 Rollback Plan

If issues arise:
1. **Git revert** the scope-enforcement commits (each phase should be a separate commit)
2. Routes revert to current behavior (no scope checks)
3. No database changes to revert (we're not modifying stored data)

### 12.4 Deployment Order

1. Deploy backend Phase 1 + 2 first (Railway)
2. Verify via test scripts
3. Deploy frontend Phase 3 (Vercel)
4. Run full E2E test matrix

---

## 13. Implementation Checklist

### Phase 1: Backend Route Protection

- [ ] **1.1** `statistics.routes.js` — Add `authMiddleware` + `requireRole` to `GET /overview`
- [ ] **1.2** `statistics.routes.js` — Add scope filter to `GET /trends`
- [ ] **1.3** `statistics.routes.js` — Add scope filter to `GET /scholarships`
- [ ] **1.4** `statistics.routes.js` — Add scope filter to `GET /prediction-accuracy`
- [ ] **1.5** `statistics.routes.js` — Add scope filter to `GET /analytics`
- [ ] **1.6** `training.routes.js` — `POST /train` restrict to university
- [ ] **1.7** `training.routes.js` — `POST /train/:scholarshipId` add `canManageScholarship`
- [ ] **1.8** `training.routes.js` — `POST /train-all` restrict to university
- [ ] **1.9** `training.routes.js` — `GET /models` filter by scoped scholarships
- [ ] **1.10** `training.routes.js` — `POST /models/:modelId/activate` add scope check
- [ ] **1.11** `training.routes.js` — `DELETE /models/:modelId` add scope check
- [ ] **1.12** `training.routes.js` — `GET /scholarships/trainable` add scope filter
- [ ] **1.13** `prediction.routes.js` — `POST /application/:applicationId` add `canManageApplication`
- [ ] **1.14** `prediction.routes.js` — `POST /model/train` restrict to university
- [ ] **1.15** `prediction.routes.js` — `POST /model/reset` restrict to university
- [ ] **1.16** `prediction.routes.js` — `GET /model/stats` add scope filter
- [ ] **1.17** `prediction.routes.js` — `GET /analytics/factors` add scope filter
- [ ] **1.18** `application.routes.js` — `GET /:id` add admin scope check
- [ ] **1.19** `application.routes.js` — `GET /:appId/documents/:docId` add admin scope check
- [ ] **1.20** `application.routes.js` — `GET /:appId/documents/:docId/proxy` add admin scope check
- [ ] **1.21** `user.routes.js` — `GET /` scope by in-scope applicants
- [ ] **1.22** `user.routes.js` — `GET /:id` scope check
- [ ] **1.23** `user.routes.js` — `GET /stats/overview` scope or restrict to university
- [ ] **1.24** `user.routes.js` — `GET /documents/:documentId` admin scope check
- [ ] **1.25** `scholarship.routes.js` — `GET /:id` admin scope check

### Phase 2: Backend New Utilities

- [ ] **2.1** Add `getScopedScholarshipIds(user)` helper to `adminScope.middleware.js`
- [ ] **2.2** Add `canManageTrainedModel(user, model)` to `adminScope.middleware.js`
- [ ] **2.3** Add `getTrainedModelScopeFilter(user)` to `adminScope.middleware.js`
- [ ] **2.4** Add `getUserScopeFilter(user)` to `adminScope.middleware.js`

### Phase 3: Frontend Scope-Aware UI

- [ ] **3.1** Create `useAdminScope` hook
- [ ] **3.2** Enhance `ProtectedRoute` with `requiredAdminLevel` prop
- [ ] **3.3** Update `App.tsx` route definitions with admin level requirements
- [ ] **3.4** Filter admin navigation by scope
- [ ] **3.5** Add `AdminScopeBadge` component
- [ ] **3.6** Hide inaccessible actions in `ModelTraining.tsx` (e.g., "Train All" button)
- [ ] **3.7** Hide inaccessible actions in `AdminDashboard.tsx`

### Phase 4: Testing & Verification

- [ ] **4.1** Create test accounts for all 3 admin levels (+ cross-college/unit)
- [ ] **4.2** Write `test-route-scope.js` verification script
- [ ] **4.3** Run T01-T15 test matrix
- [ ] **4.4** Verify frontend navigation filtering
- [ ] **4.5** Verify scope badge displays correctly
- [ ] **4.6** Cross-browser test admin scope UI
- [ ] **4.7** Load test — verify scope filter queries use indexes

---

## Appendix A: File Reference

| File | Path | Lines |
|------|------|-------|
| User Model | `backend/src/models/User.model.js` | 896 |
| Scholarship Model | `backend/src/models/Scholarship.model.js` | 699 |
| Application Model | `backend/src/models/Application.model.js` | 604 |
| TrainedModel | `backend/src/models/TrainedModel.model.js` | 317 |
| UPLB Structure | `backend/src/models/UPLBStructure.js` | 297 |
| Auth Middleware | `backend/src/middleware/auth.middleware.js` | 261 |
| Admin Scope Middleware | `backend/src/middleware/adminScope.middleware.js` | 427 |
| Scholarship Routes | `backend/src/routes/scholarship.routes.js` | 813 |
| Application Routes | `backend/src/routes/application.routes.js` | 1305 |
| Training Routes | `backend/src/routes/training.routes.js` | 391 |
| Prediction Routes | `backend/src/routes/prediction.routes.js` | 380 |
| Statistics Routes | `backend/src/routes/statistics.routes.js` | 443 |
| User Routes | `backend/src/routes/user.routes.js` | 1057 |
| Auth Routes | `backend/src/routes/auth.routes.js` | — |
| Route Index | `backend/src/routes/index.js` | ~50 |
| Frontend Types | `frontend/src/types/index.ts` | 779 |
| Frontend App | `frontend/src/App.tsx` | 812 |
| ProtectedRoute | `frontend/src/components/ProtectedRoute.tsx` | 58 |

## Appendix B: Admin Access Level Hierarchy

```
university (level 2)
  ├── Sees ALL scholarships, applications, users, models, statistics
  ├── Can train global models
  ├── Can manage user status (activate/deactivate)
  └── Full system access

college (level 1)
  ├── Sees ONLY scholarshipLevel: 'college' with matching managingCollegeCode
  ├── Can train models for their college scholarships
  ├── Can review applications to their college scholarships
  ├── Can view applicants of their college scholarships
  └── CANNOT see academic_unit scholarships (clean separation)

academic_unit (level 0)
  ├── Sees ONLY scholarshipLevel: 'academic_unit' with matching codes
  ├── Can train models for their unit's scholarships
  ├── Can review applications to their unit's scholarships
  ├── Can view applicants of their unit's scholarships
  └── Most restricted scope
```

## Appendix C: MongoDB Query Patterns by Scope

```javascript
// University admin — no filter
const universityFilter = {};

// College admin (e.g., CAS)
const collegeFilter = {
  scholarshipLevel: 'college',
  managingCollegeCode: 'CAS'
};

// Academic unit admin (e.g., ICS under CAS)
const academicUnitFilter = {
  scholarshipLevel: 'academic_unit',
  managingCollegeCode: 'CAS',
  managingAcademicUnitCode: 'ICS'
};

// Application filter (derived from scholarship scope)
const applicationFilter = {
  scholarship: { $in: scopedScholarshipIds }
};

// Trained model filter
const modelFilter = {
  $or: [
    { scholarshipId: { $in: scopedScholarshipIds } },
    // Global models: only if university admin
  ]
};

// User filter (applicants of scoped scholarships)
const userFilter = {
  _id: { $in: applicantIdsFromScopedApplications },
  role: 'student'
};
```
