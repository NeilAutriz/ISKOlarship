# ISKOlarship API Reference

> **Version:** 1.0  
> **Base URL:** `https://your-api-domain.com/api`  
> **Authentication:** JWT Bearer Token

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Scholarships](#scholarships)
4. [Applications](#applications)
5. [Predictions](#predictions)
6. [Training](#training)
7. [Statistics](#statistics)
8. [OCR Verification](#ocr-verification)
9. [Notifications](#notifications)
10. [Activity Logs](#activity-logs)
11. [Error Handling](#error-handling)

---

## Authentication

All protected endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Types

| Type | Expiry | Usage |
|------|--------|-------|
| Access Token | 30 minutes | API requests |
| Refresh Token | 30 days | Token renewal |

---

## Auth Endpoints

### Register User

```http
POST /api/auth/register
```

Creates a new user account.

**Request Body:**

```json
{
  "email": "student@up.edu.ph",
  "password": "SecurePass123",
  "firstName": "Juan",
  "middleName": "Santos",
  "lastName": "Dela Cruz",
  "role": "student"
}
```

**Validation Rules:**
- `email` - Valid email format, required
- `password` - Min 8 characters, must contain uppercase, lowercase, and number
- `firstName` - Required
- `middleName` - Optional
- `lastName` - Required
- `role` - Optional (`student` or `admin`), defaults to `student`

**Response (201):**

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "65abc123...",
    "email": "student@up.edu.ph",
    "verificationRequired": true
  }
}
```

---

### Login

```http
POST /api/auth/login
```

Authenticates user and returns tokens.

**Request Body:**

```json
{
  "email": "student@up.edu.ph",
  "password": "SecurePass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "user": {
      "id": "65abc123...",
      "email": "student@up.edu.ph",
      "firstName": "Juan",
      "lastName": "Dela Cruz",
      "role": "student",
      "profileCompleted": true
    }
  }
}
```

---

### Refresh Token

```http
POST /api/auth/refresh
```

Exchanges a refresh token for a new access token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

### Logout

```http
POST /api/auth/logout
```

Invalidates the current refresh token.

**Headers:**
- `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Verify Email

```http
POST /api/auth/verify-email
```

Verifies user's email address.

**Request Body:**

```json
{
  "token": "verification_token_from_email"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### Request Password Reset

```http
POST /api/auth/forgot-password
```

Sends password reset email.

**Request Body:**

```json
{
  "email": "student@up.edu.ph"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### Reset Password

```http
POST /api/auth/reset-password
```

Resets user password using reset token.

**Request Body:**

```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

### Get Current User

```http
GET /api/auth/me
```

Returns the authenticated user's profile.

**Headers:**
- `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "65abc123...",
    "email": "student@up.edu.ph",
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "role": "student",
    "studentProfile": {
      "studentNumber": "2020-12345",
      "college": "CAS",
      "course": "BS Computer Science",
      "yearLevel": 3,
      "gwa": 1.75,
      "familyIncome": 150000,
      "stBracket": "D",
      "citizenship": "Filipino"
    },
    "profileCompleted": true
  }
}
```

---

## Users

### Update Student Profile

```http
PUT /api/users/profile
```

Updates the authenticated user's profile.

**Headers:**
- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "studentProfile": {
    "studentNumber": "2020-12345",
    "college": "CAS",
    "course": "BS Computer Science",
    "yearLevel": 3,
    "gwa": 1.75,
    "familyIncome": 150000,
    "stBracket": "D",
    "citizenship": "Filipino"
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profileCompleted": true
  }
}
```

---

### Update Admin Profile

```http
PUT /api/users/admin-profile
```

Updates admin's profile with scope information.

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Request Body:**

```json
{
  "adminProfile": {
    "accessLevel": "college",
    "collegeCode": "CAS",
    "academicUnitCode": null,
    "permissions": ["manage_scholarships", "review_applications"]
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Admin profile updated successfully"
}
```

---

### List Users (Admin)

```http
GET /api/users
```

Returns a list of users (admin only).

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role (`student`, `admin`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `search` | string | Search by name or email |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "pages": 8
    }
  }
}
```

---

## Scholarships

### List Scholarships

```http
GET /api/scholarships
```

Returns available scholarships with optional filtering.

**Headers:**
- `Authorization: Bearer <access_token>` (optional)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by type (`academic`, `financial_need`, `athletic`, etc.) |
| `minGWA` | number | Minimum GWA requirement |
| `maxGWA` | number | Maximum GWA requirement |
| `yearLevel` | string | Target year level |
| `college` | string | Target college code |
| `maxIncome` | number | Maximum income requirement |
| `search` | string | Search by name or description |
| `status` | string | Scholarship status (`published`, `draft`, `closed`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "scholarships": [
      {
        "_id": "65abc123...",
        "name": "DOST Scholarship",
        "description": "Full scholarship for science students",
        "sponsor": "DOST",
        "type": "academic",
        "awardAmount": 10000,
        "applicationDeadline": "2026-03-15T00:00:00.000Z",
        "requirements": {
          "minGWA": 1.75,
          "maxFamilyIncome": 300000,
          "eligibleColleges": ["CAS", "CAFS", "CHE"],
          "eligibleYearLevels": ["2", "3", "4"]
        },
        "status": "published"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 20,
      "pages": 2
    }
  }
}
```

---

### Get Scholarship Details

```http
GET /api/scholarships/:id
```

Returns detailed information about a scholarship.

**Path Parameters:**
- `id` - Scholarship MongoDB ObjectId

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "65abc123...",
    "name": "DOST Scholarship",
    "description": "Full scholarship for STEM students",
    "sponsor": "DOST",
    "type": "academic",
    "scholarshipLevel": "university",
    "awardAmount": 10000,
    "applicationDeadline": "2026-03-15T00:00:00.000Z",
    "academicYear": "2025-2026",
    "semester": "Second",
    "requirements": {
      "minGWA": 1.75,
      "maxFamilyIncome": 300000,
      "stBrackets": ["A", "B", "C", "D"],
      "eligibleColleges": ["CAS", "CHE", "CAFS"],
      "eligibleCourses": [],
      "eligibleYearLevels": ["2", "3", "4"],
      "citizenshipRequired": "Filipino"
    },
    "requiredDocuments": [
      {
        "name": "Certificate of Registration",
        "description": "Current semester COR",
        "required": true
      },
      {
        "name": "Income Tax Return",
        "description": "Parents' ITR or Certificate of No Filing",
        "required": true
      }
    ],
    "status": "published",
    "createdBy": "65xyz789...",
    "createdAt": "2026-01-15T00:00:00.000Z"
  }
}
```

---

### Create Scholarship (Admin)

```http
POST /api/scholarships
```

Creates a new scholarship.

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Request Body:**

```json
{
  "name": "New Scholarship",
  "description": "Description of the scholarship",
  "sponsor": "Sponsor Organization",
  "type": "academic",
  "scholarshipLevel": "college",
  "managingCollegeCode": "CAS",
  "awardAmount": 15000,
  "applicationDeadline": "2026-04-01",
  "academicYear": "2025-2026",
  "semester": "Second",
  "requirements": {
    "minGWA": 2.0,
    "maxFamilyIncome": 250000,
    "eligibleColleges": ["CAS"]
  },
  "requiredDocuments": [
    {
      "name": "Transcript of Records",
      "description": "Latest copy",
      "required": true
    }
  ]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Scholarship created successfully",
  "data": {
    "_id": "65newid..."
  }
}
```

---

### Update Scholarship (Admin)

```http
PUT /api/scholarships/:id
```

Updates an existing scholarship.

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin (with appropriate scope)

**Request Body:** Same as create, all fields optional.

**Response (200):**

```json
{
  "success": true,
  "message": "Scholarship updated successfully"
}
```

---

### Delete Scholarship (Admin)

```http
DELETE /api/scholarships/:id
```

Deletes a scholarship (soft delete - changes status to `archived`).

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin (with appropriate scope)

**Response (200):**

```json
{
  "success": true,
  "message": "Scholarship archived successfully"
}
```

---

## Applications

### Get My Applications

```http
GET /api/applications/my
```

Returns the authenticated student's applications.

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "_id": "65app123...",
        "scholarship": {
          "_id": "65sch123...",
          "name": "DOST Scholarship",
          "type": "academic"
        },
        "status": "pending",
        "submittedAt": "2026-02-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

---

### Create Application

```http
POST /api/applications
```

Creates a new scholarship application.

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Form Data:**

| Field | Type | Description |
|-------|------|-------------|
| `scholarshipId` | string | Target scholarship ID |
| `personalStatement` | string | Optional personal statement |
| `documents[0]` | file | Required document file |
| `documentTypes[0]` | string | Document type name |

**Response (201):**

```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "applicationId": "65app123...",
    "status": "pending",
    "eligibility": {
      "eligible": true,
      "score": 85.5
    },
    "prediction": {
      "probability": 72.3,
      "confidence": "high"
    }
  }
}
```

---

### Get Application Details

```http
GET /api/applications/:id
```

Returns detailed application information.

**Headers:**
- `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "65app123...",
    "applicant": {
      "firstName": "Juan",
      "lastName": "Dela Cruz",
      "studentProfile": {...}
    },
    "scholarship": {...},
    "status": "pending",
    "documents": [
      {
        "name": "Certificate of Registration",
        "url": "https://res.cloudinary.com/...",
        "uploadedAt": "2026-02-01T00:00:00.000Z"
      }
    ],
    "personalStatement": "...",
    "eligibilityResult": {...},
    "predictionResult": {...},
    "submittedAt": "2026-02-01T00:00:00.000Z"
  }
}
```

---

### Update Application Status (Admin)

```http
PUT /api/applications/:id/status
```

Updates application status (triggers auto-training).

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Request Body:**

```json
{
  "status": "approved",
  "notes": "All requirements met",
  "reason": "Optional reason for decision"
}
```

**Valid Status Values:**
- `pending` - Awaiting review
- `under_review` - Being processed
- `approved` - Application approved
- `rejected` - Application rejected
- `waitlisted` - On waitlist
- `withdrawn` - Withdrawn by student

**Response (200):**

```json
{
  "success": true,
  "message": "Application status updated",
  "data": {
    "autoTrainingTriggered": true
  }
}
```

---

### Withdraw Application

```http
PUT /api/applications/:id/withdraw
```

Withdraws an application (student only).

**Headers:**
- `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Application withdrawn successfully"
}
```

---

### List Applications (Admin)

```http
GET /api/applications/admin/all
```

Returns all applications within admin's scope.

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `scholarshipId` | string | Filter by scholarship |
| `status` | string | Filter by status |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "applications": [...],
    "pagination": {...}
  }
}
```

---

## Predictions

### Check Eligibility

```http
POST /api/predictions/eligibility
```

Checks if user is eligible for a scholarship.

**Headers:**
- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "scholarshipId": "65sch123..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "eligible": true,
    "score": 85.0,
    "checks": [
      {
        "criterion": "GWA",
        "passed": true,
        "message": "GWA 1.75 meets requirement of ≤ 2.0"
      },
      {
        "criterion": "Family Income",
        "passed": true,
        "message": "Income ₱150,000 is below ₱300,000 threshold"
      }
    ],
    "disqualifyingFactors": []
  }
}
```

---

### Get Approval Probability

```http
POST /api/predictions/probability
```

Returns ML-predicted approval probability.

**Headers:**
- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "scholarshipId": "65sch123..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "probability": 72.5,
    "confidence": "high",
    "modelType": "scholarship_specific",
    "featureContributions": {
      "gwaScore": 0.25,
      "incomeMatch": 0.20,
      "yearLevelMatch": 0.15,
      "collegeMatch": 0.10
    },
    "factors": [
      {
        "name": "Academic Performance",
        "impact": "positive",
        "description": "Your GWA of 1.75 is significantly better than the minimum requirement"
      }
    ]
  }
}
```

---

### Batch Predictions

```http
POST /api/predictions/batch
```

Returns predictions for multiple scholarships.

**Headers:**
- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "scholarshipIds": ["65sch123...", "65sch456...", "65sch789..."]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "scholarshipId": "65sch123...",
        "eligible": true,
        "probability": 72.5
      },
      {
        "scholarshipId": "65sch456...",
        "eligible": false,
        "probability": null,
        "reason": "GWA does not meet minimum requirement"
      }
    ]
  }
}
```

---

## Training

### Train Model (Admin)

```http
POST /api/training/train
```

Manually triggers model training.

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Request Body:**

```json
{
  "scholarshipId": "65sch123...",
  "modelType": "scholarship_specific"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Model training completed",
  "data": {
    "modelId": "65model123...",
    "accuracy": 0.85,
    "precision": 0.82,
    "recall": 0.88,
    "f1Score": 0.85,
    "trainingDataSize": 150
  }
}
```

---

### Get Training Status

```http
GET /api/training/status/:scholarshipId
```

Returns current model status for a scholarship.

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Response (200):**

```json
{
  "success": true,
  "data": {
    "hasModel": true,
    "modelType": "scholarship_specific",
    "lastTrained": "2026-02-20T00:00:00.000Z",
    "trainingDataSize": 150,
    "metrics": {
      "accuracy": 0.85,
      "precision": 0.82,
      "recall": 0.88,
      "f1Score": 0.85
    },
    "autoTrainingEnabled": true,
    "lastAutoTrain": "2026-02-21T00:00:00.000Z"
  }
}
```

---

### Get Training History

```http
GET /api/training/history
```

Returns model training history.

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `scholarshipId` | string | Filter by scholarship |
| `modelType` | string | Filter by model type |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "_id": "65model123...",
        "scholarshipId": "65sch123...",
        "modelType": "scholarship_specific",
        "triggerType": "auto_status_change",
        "trainedAt": "2026-02-21T00:00:00.000Z",
        "trainedBy": "65admin123...",
        "metrics": {...}
      }
    ],
    "pagination": {...}
  }
}
```

---

## Statistics

### Get Platform Overview

```http
GET /api/statistics/overview
```

Returns platform-wide statistics.

**Headers:**
- `Authorization: Bearer <access_token>` (optional for public stats)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "scholarships": {
      "total": 45,
      "active": 32,
      "byType": {
        "academic": 15,
        "financial_need": 20,
        "athletic": 5,
        "other": 5
      }
    },
    "applications": {
      "total": 1250,
      "pending": 150,
      "approved": 800,
      "rejected": 200,
      "withdrawn": 100
    },
    "users": {
      "totalStudents": 2500,
      "activeApplicants": 800
    }
  }
}
```

---

### Get Admin Dashboard Stats

```http
GET /api/statistics/admin/dashboard
```

Returns scoped statistics for admin.

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Response (200):**

```json
{
  "success": true,
  "data": {
    "scope": "college",
    "scholarships": {
      "managed": 12,
      "pendingApplications": 45
    },
    "recentActivity": [...],
    "modelStatus": {
      "trained": 8,
      "needsTraining": 4
    }
  }
}
```

---

## OCR Verification

### Verify Document

```http
POST /api/ocr/verify
```

Extracts and verifies document data using OCR.

**Headers:**
- `Authorization: Bearer <access_token>`

**Required Role:** Admin

**Request Body:**

```json
{
  "applicationId": "65app123...",
  "documentIndex": 0
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "extractedData": {
      "studentNumber": "2020-12345",
      "name": "JUAN SANTOS DELA CRUZ",
      "gwa": "1.75",
      "college": "CAS"
    },
    "verification": {
      "studentNumber": {
        "extracted": "2020-12345",
        "declared": "2020-12345",
        "match": true
      },
      "name": {
        "extracted": "JUAN SANTOS DELA CRUZ",
        "declared": "Juan Santos Dela Cruz",
        "match": true,
        "similarity": 100
      },
      "gwa": {
        "extracted": "1.75",
        "declared": "1.75",
        "match": true
      }
    },
    "overallMatch": true,
    "confidence": 0.95
  }
}
```

---

## Notifications

### Get Notifications

```http
GET /api/notifications
```

Returns user's notifications.

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `unreadOnly` | boolean | Only return unread |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "65notif123...",
        "type": "application_status",
        "title": "Application Approved",
        "message": "Your application for DOST Scholarship has been approved",
        "read": false,
        "createdAt": "2026-02-21T00:00:00.000Z"
      }
    ],
    "unreadCount": 5,
    "pagination": {...}
  }
}
```

---

### Mark Notification Read

```http
PUT /api/notifications/:id/read
```

Marks a notification as read.

**Headers:**
- `Authorization: Bearer <access_token>`

**Response (200):**

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## Activity Logs

### Get Activity Log

```http
GET /api/activity-logs
```

Returns user's activity history.

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by activity type |
| `startDate` | string | Start date (ISO 8601) |
| `endDate` | string | End date (ISO 8601) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "_id": "65act123...",
        "type": "application_submit",
        "description": "Submitted application for DOST Scholarship",
        "metadata": {
          "scholarshipId": "65sch123...",
          "applicationId": "65app123..."
        },
        "createdAt": "2026-02-21T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

### Authentication Errors

```json
{
  "success": false,
  "message": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

### Validation Errors

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Scope Errors

```json
{
  "success": false,
  "message": "Access denied. This scholarship is outside your administrative scope.",
  "code": "SCOPE_VIOLATION"
}
```

---

## Rate Limiting

API endpoints are rate limited:

| Endpoint Category | Limit |
|-------------------|-------|
| Auth endpoints | 5 requests/minute |
| General API | 100 requests/minute |
| File uploads | 10 requests/minute |

When rate limited, you'll receive:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

---

## Webhooks (Coming Soon)

Webhook support for real-time notifications is planned for future releases.

---

## SDK & Libraries

Official client libraries are planned for:
- JavaScript/TypeScript
- Python

---

## Support

For API support, please contact:
- Email: support@iskolaship.com
- GitHub Issues: [ISKOlarship Issues](https://github.com/your-username/ISKOlarship/issues)
