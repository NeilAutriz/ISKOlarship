# OCR Document Verification — Implementation Plan

> **Status**: Proposed  
> **Author**: GitHub Copilot  
> **Date**: February 21, 2026  
> **Related**: [EVENT_DRIVEN_AUTO_TRAINING.md](EVENT_DRIVEN_AUTO_TRAINING.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [Architecture](#4-architecture)
5. [OCR Provider Selection](#5-ocr-provider-selection)
6. [Document Type → Field Mapping](#6-document-type--field-mapping)
7. [Backend Implementation](#7-backend-implementation)
8. [Frontend Implementation](#8-frontend-implementation)
9. [Database Changes](#9-database-changes)
10. [API Endpoints](#10-api-endpoints)
11. [Flow Diagrams](#11-flow-diagrams)
12. [Safety & Edge Cases](#12-safety--edge-cases)
13. [Railway Deployment](#13-railway-deployment)
14. [Cost Analysis](#14-cost-analysis)
15. [Files Changed](#15-files-changed)
16. [Testing Strategy](#16-testing-strategy)

---

## 1. Overview

Add OCR (Optical Character Recognition) as an **admin assistance tool** that automatically extracts text from uploaded documents and compares key fields (GWA, name, student number, income, etc.) against the student's declared profile data. Mismatches are flagged for the admin during application review — the admin always makes the final decision.

### Key Principle

> **OCR assists. The admin decides.**  
> OCR results are advisory. They speed up review by highlighting discrepancies, but never auto-approve or auto-reject an application.

---

## 2. Problem Statement

### Current Workflow (Manual)

```
Admin opens application
    → Downloads each document (PDF/image)
    → Manually reads through pages
    → Mentally compares values to student's declared profile
    → Decides approve/reject
    
⏱ ~5-10 minutes per application
```

### Pain Points

| Problem | Impact |
|---------|--------|
| Admin must manually read every document | Slow, tedious for high-volume periods |
| No automated cross-checking | Easy to miss discrepancies (GWA off by 0.1, wrong student number) |
| No audit trail of what was verified | Hard to prove due diligence |
| Document quality varies | Phone photos, scans, digital PDFs — admin must handle all |
| Scaling issue | During enrollment/application season, hundreds of apps pile up |

### After OCR Assistance

```
Admin opens application
    → Sees pre-extracted values with ✅/⚠️/❌ indicators
    → Only manually checks flagged mismatches
    → Decides approve/reject
    
⏱ ~1-2 minutes per application (3-5x faster)
```

---

## 3. Proposed Solution

### Architecture: Cloud OCR API + Smart Comparison Engine

```
┌─────────────────────────────────────────────────────┐
│                    TRIGGER POINTS                     │
│                                                       │
│  Option A: On-demand (admin clicks "Verify")          │
│  Option B: Background (after application submission)  │
│  Option C: Both (background + manual re-verify)       │
│                                                       │
│  → Recommended: Option C                              │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              BACKEND OCR SERVICE                      │
│                                                       │
│  1. Fetch document from Cloudinary (buffer/stream)    │
│  2. Send to Google Cloud Vision API                   │
│  3. Receive raw extracted text                        │
│  4. Parse text with document-type-specific extractors │
│  5. Compare extracted values vs applicantSnapshot      │
│  6. Generate verification result with confidence       │
│  7. Save to database (on Application document)        │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              ADMIN REVIEW UI                          │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │  📄 Transcript of Records                     │    │
│  │                                                │    │
│  │  ✅ Name: "Maria Santos" — matches profile    │    │
│  │  ✅ Student No: "2023-12345" — matches        │    │
│  │  ⚠️ GWA: Doc says 1.82, Profile says 1.75    │    │
│  │  ✅ College: "CAS" — matches                  │    │
│  │                                                │    │
│  │  Confidence: 87%  │  [Re-verify] [Preview]    │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 4. Architecture

### Component Diagram

```
┌────────────┐     ┌────────────────┐     ┌──────────────────┐
│  Frontend   │────▶│  Backend API    │────▶│  Google Cloud     │
│  (React)    │◀────│  (Express)      │◀────│  Vision API       │
│             │     │                 │     │                   │
│ • Verify UI │     │ • ocr.routes.js │     │ • Text detection  │
│ • Results   │     │ • ocrService.js │     │ • Document AI     │
│ • Badges    │     │ • extractors/   │     └──────────────────┘
└────────────┘     │ • comparators/  │
                    │                 │     ┌──────────────────┐
                    │                 │────▶│  Cloudinary       │
                    │                 │◀────│  (File storage)   │
                    └────────────────┘     └──────────────────┘
                            │
                            ▼
                    ┌────────────────┐
                    │  MongoDB        │
                    │                 │
                    │ • Application   │
                    │   .documents[]  │
                    │   .ocrResult    │
                    │   .ocrStatus    │
                    └────────────────┘
```

### Processing Pipeline

```
Document Buffer
    │
    ├─ PDF? ──────▶ Convert pages to images (pdf-to-img or send PDF directly)
    ├─ Image? ────▶ Send directly to Vision API
    └─ DOC/DOCX? ─▶ Skip OCR (extract text via docx parser or skip)
    │
    ▼
Google Cloud Vision API
    │
    ▼
Raw Extracted Text (full text annotation)
    │
    ▼
Document-Type-Specific Extractor
    │
    ├─ transcript_extractor    → { name, studentNumber, gwa, college, course }
    ├─ cor_extractor           → { name, studentNumber, college, units, semester }
    ├─ income_cert_extractor   → { name, address, income }
    ├─ grade_report_extractor  → { name, studentNumber, gwa }
    ├─ barangay_cert_extractor → { name, barangay, city }
    ├─ tax_return_extractor    → { name, income }
    └─ generic_extractor       → { rawText, detectedNames, detectedNumbers }
    │
    ▼
Comparison Engine
    │
    compares extracted fields vs applicantSnapshot
    │
    ▼
Verification Result
    {
      status: 'verified' | 'mismatch' | 'partial' | 'unreadable',
      confidence: 0.87,
      fields: [
        { field: 'name', extracted: 'Maria Santos', expected: 'Maria Santos', match: true },
        { field: 'gwa', extracted: '1.82', expected: '1.75', match: false, severity: 'warning' },
        ...
      ],
      rawText: '...',
      processedAt: Date
    }
```

---

## 5. OCR Provider Selection

### Recommendation: Google Cloud Vision API

| Criteria | Google Cloud Vision | Tesseract.js | AWS Textract |
|----------|-------------------|-------------|-------------|
| **Accuracy** | 95-99% printed, 85-90% handwritten | 80-95% printed, poor handwritten | 95-99% printed |
| **Filipino text** | ✅ Excellent | ⚠️ Needs training data | ✅ Good |
| **PDF support** | ✅ Native (up to 5 pages sync) | ❌ Needs PDF→image conversion | ✅ Native |
| **Setup complexity** | Low (REST API) | Medium (WASM, language packs) | Low (REST API) |
| **Railway-safe** | ✅ HTTP API calls only | ⚠️ 200-500MB RAM, CPU-intensive | ✅ HTTP API calls only |
| **Cost** | Free: 1,000 pages/mo | Free | $1.50/1,000 pages |
| **Latency** | 1-3 seconds | 5-30 seconds | 1-3 seconds |
| **Dependencies** | `@google-cloud/vision` | `tesseract.js` + language data (~15MB) | `@aws-sdk/client-textract` |

### Why Google Cloud Vision

1. **Railway-safe** — Just HTTP API calls, no heavy local processing
2. **1,000 free pages/month** — More than enough for ISKOlarship's scale
3. **Best accuracy on Filipino documents** — Handles mixed English/Filipino text
4. **Native PDF support** — No need for PDF-to-image conversion
5. **Fast** — 1-3 seconds per page
6. **Simple setup** — Single npm package, service account JSON key

### Setup Requirements

1. Create Google Cloud project (free tier)
2. Enable Cloud Vision API
3. Create service account → download JSON key
4. Add to Railway environment variables: `GOOGLE_CLOUD_VISION_KEY` (base64-encoded JSON key)
5. Install: `npm install @google-cloud/vision`

---

## 6. Document Type → Field Mapping

### What OCR Extracts Per Document Type

| Document Type | Extractable Fields | Profile Comparison Fields |
|---|---|---|
| `transcript` | Name, student number, GWA, college, course, major | `firstName`, `lastName`, `studentNumber`, `gwa`, `college`, `course` |
| `grade_report` | Name, student number, GWA, semester grades | `firstName`, `lastName`, `studentNumber`, `gwa` |
| `certificate_of_registration` | Name, student number, college, course, units, semester | `studentNumber`, `college`, `course`, `unitsEnrolled`, `classification` |
| `income_certificate` | Name, address, annual income | `firstName`, `lastName`, `homeAddress`, `annualFamilyIncome` |
| `barangay_certificate` | Name, barangay, city/municipality | `firstName`, `lastName`, `homeAddress.barangay`, `homeAddress.city` |
| `tax_return` | Name, TIN, gross income | `firstName`, `lastName`, `annualFamilyIncome` |
| `photo_id` | Name, birthdate, ID number | `firstName`, `lastName`, `birthDate` |
| `proof_of_enrollment` | Name, student number, college, semester | `studentNumber`, `college`, `course` |
| `recommendation_letter` | Signatory name, institution | (no direct comparison — flag for manual review) |
| `personal_statement` | N/A (subjective content) | Skip OCR |
| `thesis_outline` | Title, student name, adviser | `firstName`, `lastName` |

### Comparison Rules

| Match Type | Logic | Severity |
|---|---|---|
| **Exact match** | `extracted === expected` | ✅ Verified |
| **Fuzzy name match** | Levenshtein distance ≤ 2, or substring match | ✅ Verified (with note) |
| **GWA close match** | `|extracted - expected| ≤ 0.05` | ✅ Verified (rounding tolerance) |
| **GWA mismatch** | `|extracted - expected| > 0.05` | ⚠️ Warning |
| **Income within 10%** | `|extracted - expected| / expected ≤ 0.10` | ✅ Verified (tolerance) |
| **Income mismatch** | `|extracted - expected| / expected > 0.10` | ⚠️ Warning |
| **Field not found** | OCR couldn't extract the value | ❌ Unreadable — manual check needed |
| **Name mismatch** | Different person's name detected | 🔴 Critical — possible wrong document |

---

## 7. Backend Implementation

### New Files

#### `backend/src/services/ocrVerification.service.js`

Main orchestrator service.

```javascript
// Key exports:
module.exports = {
  verifyDocument,        // Verify a single document (on-demand)
  verifyAllDocuments,    // Verify all docs in an application (background)
  getVerificationStatus, // Get OCR results for an application
};
```

**`verifyDocument(applicationId, documentId, adminId)`**:
1. Load application + specific document
2. Fetch document buffer from Cloudinary
3. Call Google Cloud Vision API
4. Route to document-type-specific extractor
5. Compare extracted values vs `applicantSnapshot`
6. Save result to `document.ocrResult`
7. Return verification result

#### `backend/src/services/ocrExtractors/`

Document-type-specific text parsing modules.

```
ocrExtractors/
├── index.js                    // Router — picks extractor by documentType
├── transcript.extractor.js     // Parses transcripts for GWA, name, student#
├── cor.extractor.js            // Parses Certificate of Registration
├── income.extractor.js         // Parses income certificates & tax returns
├── gradeReport.extractor.js    // Parses grade reports/slips
├── barangay.extractor.js       // Parses barangay certificates
├── generic.extractor.js        // Fallback — extracts names, numbers, amounts
└── comparison.js               // Comparison engine (fuzzy match, tolerance)
```

Each extractor follows the same interface:

```javascript
/**
 * @param {string} rawText - Full text extracted by OCR
 * @returns {Object} Extracted fields specific to this document type
 */
function extract(rawText) {
  return {
    name: 'Maria A. Santos',
    studentNumber: '2023-12345',
    gwa: 1.82,
    college: 'College of Arts and Sciences',
    // ...
  };
}
```

#### Extractor Examples

**Transcript Extractor** — Key regex patterns:

```javascript
// GWA patterns (UPLB transcripts)
const gwaPatterns = [
  /general\s*weighted\s*average[:\s]*(\d+\.\d+)/i,
  /GWA[:\s]*(\d+\.\d+)/i,
  /cumulative\s*GWA[:\s]*(\d+\.\d+)/i,
  /weighted\s*average[:\s]*(\d+\.\d+)/i,
];

// Student number patterns
const studentNumberPatterns = [
  /student\s*(?:no|number|#)[.:\s]*(\d{4}-\d{5})/i,
  /(\d{4}-\d{5})/,  // UPLB format: YYYY-NNNNN
];

// Name patterns (usually near top of transcript)
const namePatterns = [
  /name[:\s]*([A-Z][a-z]+(?:\s+[A-Z]\.?\s+)?[A-Z][a-z]+)/i,
  /student[:\s]*([A-Z][a-z]+(?:\s+[A-Z]\.?\s+)?[A-Z][a-z]+)/i,
];

// College patterns
const collegePatterns = [
  /college\s*of\s*([A-Za-z\s]+?)(?:\n|$)/i,
  /(CAS|CAFS|CEM|CEAT|CDC|CFNR|CHE|CVM|SESAM|Graduate School)/i,
];
```

**Income Certificate Extractor**:

```javascript
// Income amount patterns (Philippine format)
const incomePatterns = [
  /annual\s*(?:family\s*)?income[:\s]*(?:PHP?|₱)?\s*([\d,]+(?:\.\d{2})?)/i,
  /(?:PHP?|₱)\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s*(?:year|annum))/i,
  /total\s*(?:family\s*)?income[:\s]*(?:PHP?|₱)?\s*([\d,]+(?:\.\d{2})?)/i,
];

// Address patterns
const addressPatterns = [
  /(?:residing|address|resident)[:\s]*(.+?)(?:\n|$)/i,
  /barangay\s*([A-Za-z\s]+)/i,
];
```

#### `backend/src/services/ocrVerification.service.js` — Comparison Engine

```javascript
// comparison.js
function compareFields(extracted, applicantSnapshot, documentType) {
  const results = [];

  // Name comparison (fuzzy)
  if (extracted.name) {
    const expectedName = `${applicantSnapshot.firstName} ${applicantSnapshot.lastName}`;
    const similarity = fuzzyMatch(extracted.name, expectedName);
    results.push({
      field: 'name',
      extracted: extracted.name,
      expected: expectedName,
      match: similarity >= 0.85,
      similarity,
      severity: similarity >= 0.85 ? 'verified' : similarity >= 0.6 ? 'warning' : 'critical',
    });
  }

  // GWA comparison (with tolerance)
  if (extracted.gwa !== undefined && applicantSnapshot.gwa) {
    const diff = Math.abs(extracted.gwa - applicantSnapshot.gwa);
    results.push({
      field: 'gwa',
      extracted: extracted.gwa,
      expected: applicantSnapshot.gwa,
      match: diff <= 0.05,
      difference: diff,
      severity: diff <= 0.05 ? 'verified' : diff <= 0.25 ? 'warning' : 'critical',
    });
  }

  // Student number comparison (exact)
  if (extracted.studentNumber && applicantSnapshot.studentNumber) {
    const match = extracted.studentNumber.replace(/\s/g, '') === 
                  applicantSnapshot.studentNumber.replace(/\s/g, '');
    results.push({
      field: 'studentNumber',
      extracted: extracted.studentNumber,
      expected: applicantSnapshot.studentNumber,
      match,
      severity: match ? 'verified' : 'critical',
    });
  }

  // Income comparison (10% tolerance)
  if (extracted.income !== undefined && applicantSnapshot.annualFamilyIncome) {
    const ratio = Math.abs(extracted.income - applicantSnapshot.annualFamilyIncome) 
                  / applicantSnapshot.annualFamilyIncome;
    results.push({
      field: 'annualFamilyIncome',
      extracted: extracted.income,
      expected: applicantSnapshot.annualFamilyIncome,
      match: ratio <= 0.10,
      percentDifference: (ratio * 100).toFixed(1),
      severity: ratio <= 0.10 ? 'verified' : ratio <= 0.25 ? 'warning' : 'critical',
    });
  }

  // ... more field comparisons

  return results;
}
```

---

## 8. Frontend Implementation

### Modified Files

#### `frontend/src/pages/admin/ApplicationReview.tsx`

Add OCR verification panel to the document section.

```
EXISTING DOCUMENT CARD:
┌──────────────────────────────────────────────────────┐
│  📄 Transcript of Records          [Preview] [Download] │
│  Uploaded: Feb 15, 2026  |  2.3 MB  |  PDF              │
└──────────────────────────────────────────────────────┘

ENHANCED WITH OCR:
┌──────────────────────────────────────────────────────┐
│  📄 Transcript of Records          [Preview] [Download] │
│  Uploaded: Feb 15, 2026  |  2.3 MB  |  PDF              │
│                                                          │
│  ┌──── OCR Verification ─────────────────────────────┐  │
│  │  Overall: ⚠️ 3/4 fields matched (87% confidence)  │  │
│  │                                                     │  │
│  │  ✅ Name: "Maria Santos" — matches profile          │  │
│  │  ✅ Student No: "2023-12345" — matches              │  │
│  │  ⚠️ GWA: Doc says 1.82, Profile says 1.75          │  │
│  │     └─ Difference: 0.07 (exceeds 0.05 tolerance)   │  │
│  │  ✅ College: "CAS" — matches                        │  │
│  │                                                     │  │
│  │  [View Raw Text]  [Re-verify]                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  OCR Status: Verified at Feb 15, 2026 3:45 PM           │
└──────────────────────────────────────────────────────┘
```

#### New UI Elements

| Element | Location | Description |
|---------|----------|-------------|
| **OCR Verification Panel** | Inside each document card | Shows field-by-field comparison results |
| **Status Badge** | Document card header | `✅ Verified` / `⚠️ Mismatch` / `❌ Unreadable` / `⏳ Processing` / `—` Not scanned |
| **Verify Button** | Document card | Triggers on-demand OCR for a specific document |
| **Verify All Button** | Application header area | Batch-verify all documents in the application |
| **Raw Text Modal** | Modal overlay | Shows the full OCR-extracted text for debugging |
| **Application Summary** | Top of review page | Aggregate: "4/6 documents verified, 1 mismatch, 1 unreadable" |

#### Color Coding

| Status | Color | Icon |
|--------|-------|------|
| Verified (all match) | Green (`text-green-600`, `bg-green-50`) | `CheckCircle` |
| Warning (minor mismatch) | Amber (`text-amber-600`, `bg-amber-50`) | `AlertTriangle` |
| Critical (major mismatch) | Red (`text-red-600`, `bg-red-50`) | `XCircle` |
| Unreadable | Gray (`text-gray-500`, `bg-gray-50`) | `HelpCircle` |
| Processing | Blue (`text-blue-600`, `bg-blue-50`) | `Loader` (spinning) |
| Not scanned | Gray (`text-gray-400`) | `FileSearch` |

#### New API Client Methods

```typescript
// frontend/src/services/apiClient.ts
ocrApi: {
  verifyDocument(applicationId: string, documentId: string): Promise<OcrResult>,
  verifyAllDocuments(applicationId: string): Promise<OcrResult[]>,
  getVerificationStatus(applicationId: string): Promise<OcrStatus>,
}
```

#### New TypeScript Types

```typescript
// frontend/src/types/ocr.types.ts
interface OcrFieldResult {
  field: string;
  extracted: string | number | null;
  expected: string | number | null;
  match: boolean;
  similarity?: number;
  difference?: number;
  percentDifference?: string;
  severity: 'verified' | 'warning' | 'critical' | 'unreadable';
}

interface OcrDocumentResult {
  documentId: string;
  documentType: string;
  documentName: string;
  status: 'verified' | 'mismatch' | 'partial' | 'unreadable' | 'processing' | 'pending';
  confidence: number;
  fields: OcrFieldResult[];
  rawText?: string;
  processedAt: Date | null;
  error?: string;
}

interface OcrApplicationSummary {
  totalDocuments: number;
  verified: number;
  mismatches: number;
  unreadable: number;
  pending: number;
  overallStatus: 'all_verified' | 'has_mismatches' | 'incomplete' | 'not_started';
}
```

---

## 9. Database Changes

### Application.model.js — Document Sub-Schema Additions

Add OCR result fields to the existing document sub-schema:

```javascript
// New fields on each document in the documents[] array
ocrResult: {
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
    default: 'pending',
  },
  rawText: { type: String },           // Full OCR-extracted text
  extractedFields: { type: Object },    // { name, gwa, studentNumber, ... }
  comparisonResults: [{
    field: { type: String },
    extracted: { type: mongoose.Schema.Types.Mixed },
    expected: { type: mongoose.Schema.Types.Mixed },
    match: { type: Boolean },
    similarity: { type: Number },
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
```

### No New Collections Needed

The OCR results are stored **inline** on each document in the `Application.documents[]` array. This avoids a separate collection and keeps all document data together.

### Existing Fields Already Available

The document sub-schema already has these verification fields that we'll integrate with:

| Field | Type | Current Use | OCR Use |
|-------|------|-------------|---------|
| `verified` | Boolean | Manual verification flag | Set to `true` when OCR + admin confirms |
| `verifiedBy` | ObjectId | Who verified | The admin who triggered/confirmed OCR |
| `verifiedAt` | Date | When verified | When admin confirmed OCR result |
| `verificationNotes` | String | Manual notes | Auto-generated OCR summary + admin notes |

---

## 10. API Endpoints

### New Routes: `backend/src/routes/ocr.routes.js`

| Method | Route | Purpose | Access |
|--------|-------|---------|--------|
| `POST` | `/api/ocr/applications/:appId/documents/:docId/verify` | OCR-verify a single document | Admin (scope-checked) |
| `POST` | `/api/ocr/applications/:appId/verify-all` | OCR-verify all documents in application | Admin (scope-checked) |
| `GET` | `/api/ocr/applications/:appId/status` | Get OCR verification status for all docs | Admin (scope-checked) |
| `GET` | `/api/ocr/applications/:appId/documents/:docId/raw-text` | Get raw OCR text for a document | Admin (scope-checked) |

### Route Details

#### `POST /api/ocr/applications/:appId/documents/:docId/verify`

```
Request:  (no body needed)
Response: {
  success: true,
  data: {
    documentId: "...",
    documentType: "transcript",
    status: "mismatch",
    confidence: 0.87,
    fields: [
      { field: "name", extracted: "Maria Santos", expected: "Maria Santos", match: true, severity: "verified" },
      { field: "gwa", extracted: 1.82, expected: 1.75, match: false, severity: "warning", difference: 0.07 },
      { field: "studentNumber", extracted: "2023-12345", expected: "2023-12345", match: true, severity: "verified" },
      { field: "college", extracted: "College of Arts and Sciences", expected: "CAS", match: true, severity: "verified" }
    ],
    rawTextPreview: "UNIVERSITY OF THE PHILIPPINES LOS BAÑOS...",
    processedAt: "2026-02-21T15:45:00.000Z"
  }
}
```

#### `POST /api/ocr/applications/:appId/verify-all`

```
Response: {
  success: true,
  data: {
    applicationId: "...",
    summary: { totalDocuments: 6, verified: 4, mismatches: 1, unreadable: 1, pending: 0 },
    documents: [ ...per-document results... ]
  }
}
```

#### `GET /api/ocr/applications/:appId/status`

```
Response: {
  success: true,
  data: {
    applicationId: "...",
    summary: { totalDocuments: 6, verified: 4, mismatches: 1, unreadable: 1, pending: 0 },
    overallStatus: "has_mismatches",
    documents: [
      { documentId: "...", name: "Transcript", type: "transcript", ocrStatus: "completed", overallMatch: "mismatch", confidence: 0.87 },
      { documentId: "...", name: "Income Certificate", type: "income_certificate", ocrStatus: "completed", overallMatch: "verified", confidence: 0.92 },
      ...
    ]
  }
}
```

---

## 11. Flow Diagrams

### Flow A: On-Demand Verification (Admin Clicks "Verify")

```
Admin clicks [Verify] on a document
    │
    ▼
POST /api/ocr/applications/:appId/documents/:docId/verify
    │
    ▼
Backend: Load application, check admin scope
    │
    ▼
Fetch document from Cloudinary (getSignedUrl → fetch buffer)
    │
    ▼
Send buffer to Google Cloud Vision API
    │
    ▼
Receive raw text (1-3 seconds)
    │
    ▼
Route to document-type-specific extractor
    │
    ▼
Compare extracted values vs applicantSnapshot
    │
    ▼
Save ocrResult on application.documents[].ocrResult
    │
    ▼
Return verification result to frontend
    │
    ▼
Frontend displays ✅/⚠️/❌ indicators on document card
```

### Flow B: Background Verification (After Application Submission)

```
Student submits application (POST /api/applications/:id/submit)
    │
    ▼
After response sent, fire-and-forget (setImmediate):
    │
    ▼
For each non-text document in application.documents[]:
    │
    ├─ Set ocrResult.status = 'processing'
    ├─ Fetch from Cloudinary
    ├─ Send to Vision API
    ├─ Extract + compare
    ├─ Save ocrResult
    └─ Set ocrResult.status = 'completed' or 'failed'
    │
    ▼
When admin later opens the application, results are already available
```

### Flow C: Admin Review with OCR Results

```
Admin opens ApplicationReview page
    │
    ▼
GET /api/ocr/applications/:appId/status
    │
    ▼
Frontend shows aggregate banner:
    "4/6 documents verified, 1 mismatch, 1 unreadable"
    │
    ▼
Each document card shows OCR badge:
    ✅ Verified  |  ⚠️ Mismatch  |  ❌ Unreadable  |  ⏳ Processing  |  — Not scanned
    │
    ▼
Admin expands document → sees field-by-field comparison
    │
    ▼
Admin can [Re-verify] or [View Raw Text] for any document
    │
    ▼
Admin makes final decision (Approve / Reject / Request Resubmission)
```

---

## 12. Safety & Edge Cases

### Error Handling

| Scenario | Handling |
|----------|----------|
| Google Cloud Vision API down | Mark document as `failed`, show "OCR unavailable — verify manually" |
| Document is password-protected PDF | Mark as `unreadable`, admin verifies manually |
| Document is a DOC/DOCX | Skip OCR (text extraction without Vision API, or mark as `skipped`) |
| Blurry/low-quality image | Low confidence score, mark as `partial` or `unreadable` |
| OCR returns gibberish | Confidence < 30% → mark as `unreadable` |
| Document in language other than English/Filipino | Attempt extraction, lower confidence threshold |
| Handwritten document | Attempt extraction, expect lower accuracy |
| Student uploads wrong document type | Name/student number mismatch → `critical` severity |
| `text_response` or `personal_statement` type | Skip OCR entirely (no image to scan) |
| Very large PDF (>5 pages) | Process first 3 pages only (most info is on first pages) |

### Security

| Concern | Mitigation |
|---------|------------|
| Admin scope enforcement | OCR routes check `canManageApplication()` — admins only see their scoped applications |
| Document content exposure | Raw text stored in DB, accessible only to authorized admins |
| Google Cloud data privacy | Vision API processes images but doesn't store them (per Google's data processing terms) |
| API key protection | Service account JSON stored as Railway env var, never in code |
| Rate limiting | Max 5 OCR requests per minute per admin (prevent abuse) |

### Graceful Degradation

- If Google Cloud Vision is unavailable → OCR panel shows "Service unavailable" + admin proceeds with manual review
- If OCR extraction finds nothing → Shows "Could not extract data — please verify manually"
- If application has no file documents (only text responses) → OCR section hidden entirely
- OCR errors **never** block the admin from approving/rejecting

---

## 13. Railway Deployment

### Compatibility: ✅ Fully Compatible

| Requirement | Status |
|-------------|--------|
| No local file storage | ✅ Documents on Cloudinary, buffer processed in memory |
| No heavy CPU/RAM usage | ✅ Vision API does the heavy lifting remotely |
| No long-running processes | ✅ 1-3 seconds per document, well within Railway timeout |
| No additional services | ✅ Just HTTP API calls to Google Cloud |
| Environment variables | ✅ `GOOGLE_CLOUD_VISION_KEY` added to Railway dashboard |
| Memory usage | ✅ ~5-10MB per document buffer (within Railway's RAM limits) |

### New Environment Variables

| Variable | Value | Where |
|----------|-------|-------|
| `GOOGLE_CLOUD_VISION_KEY` | Base64-encoded service account JSON | Railway & local `.env` |
| `OCR_ENABLED` | `true` / `false` | Feature flag for easy disable |
| `OCR_MAX_PAGES` | `3` | Max PDF pages to process |
| `OCR_MIN_CONFIDENCE` | `0.3` | Below this → mark as `unreadable` |

---

## 14. Cost Analysis

### Google Cloud Vision API Pricing (as of 2026)

| Tier | Pages/Month | Cost |
|------|-------------|------|
| Free | First 1,000 | $0 |
| Standard | 1,001 - 5,000,000 | $1.50 per 1,000 pages |

### ISKOlarship Usage Estimate

| Metric | Estimate |
|--------|----------|
| Applications per semester | ~200-500 |
| Documents per application | ~4-6 (avg 5) |
| Pages per document | ~1-3 (avg 2) |
| **Total pages/semester** | **~2,000-5,000** |
| **Monthly pages** | **~400-1,000** |

**Conclusion**: ISKOlarship will likely stay within the **free tier** (1,000 pages/month). Even at peak, the cost would be ~$1.50-$6/month.

---

## 15. Files Changed

### New Files

| File | Purpose |
|------|---------|
| `backend/src/services/ocrVerification.service.js` | Main OCR orchestrator (verify, compare, save) |
| `backend/src/services/ocrExtractors/index.js` | Extractor router |
| `backend/src/services/ocrExtractors/transcript.extractor.js` | Transcript parser |
| `backend/src/services/ocrExtractors/cor.extractor.js` | COR parser |
| `backend/src/services/ocrExtractors/income.extractor.js` | Income cert/tax return parser |
| `backend/src/services/ocrExtractors/gradeReport.extractor.js` | Grade report parser |
| `backend/src/services/ocrExtractors/barangay.extractor.js` | Barangay cert parser |
| `backend/src/services/ocrExtractors/generic.extractor.js` | Fallback extractor |
| `backend/src/services/ocrExtractors/comparison.js` | Comparison engine (fuzzy matching, tolerance) |
| `backend/src/routes/ocr.routes.js` | OCR API routes |
| `frontend/src/types/ocr.types.ts` | TypeScript types for OCR results |

### Modified Files

| File | Changes |
|------|---------|
| `backend/src/models/Application.model.js` | Add `ocrResult` sub-schema to document schema |
| `backend/src/routes/index.js` | Register OCR routes |
| `backend/src/routes/application.routes.js` | Add background OCR trigger after submit (optional) |
| `backend/package.json` | Add `@google-cloud/vision` dependency |
| `frontend/src/services/apiClient.ts` | Add `ocrApi` methods |
| `frontend/src/pages/admin/ApplicationReview.tsx` | Add OCR verification panel, status badges, verify buttons |
| `frontend/.env.production` | No changes needed (backend handles API calls) |

---

## 16. Testing Strategy

### Backend Unit Tests

| Test | Description |
|------|-------------|
| Extractor tests | Feed sample OCR text → verify extracted fields are correct |
| Comparison tests | Feed extracted vs expected values → verify match/mismatch logic |
| Tolerance tests | GWA within 0.05, income within 10% → should be "verified" |
| Fuzzy name tests | "Maria A. Santos" vs "Maria Santos" → should match |
| Edge cases | Empty text, gibberish, mixed languages, handwritten artifacts |

### Backend Integration Tests

| Test | Description |
|------|-------------|
| OCR endpoint auth | Unauthenticated → 401, student → 403, admin → 200 |
| Scope enforcement | Admin can only OCR-verify applications in their scope |
| Document type routing | Transcript → transcript extractor, COR → COR extractor |
| Error handling | Invalid applicationId, invalid documentId, text-type document |
| Result persistence | OCR result saved to MongoDB, retrievable via status endpoint |

### Frontend Tests

| Test | Description |
|------|-------------|
| OCR panel renders | When ocrResult exists, panel shows field comparisons |
| Status badges | Green/amber/red/gray badges based on OCR status |
| Verify button | Calls API, shows loading spinner, updates UI on response |
| Error state | API failure → fallback message, admin can still review manually |

### Manual Testing Checklist

- [ ] Upload clear printed transcript → high confidence, all fields match
- [ ] Upload blurry phone photo → low confidence or unreadable
- [ ] Upload document with wrong student name → critical mismatch flagged
- [ ] Upload document with slightly different GWA → warning flagged
- [ ] Upload text-type document → OCR skipped gracefully
- [ ] Verify all documents in batch → all results populated
- [ ] Admin with limited scope → cannot OCR-verify out-of-scope applications
- [ ] Google Cloud Vision API key missing → graceful error message

---

## Appendix: Sample UPLB Document Formats

### Transcript of Records (typical structure)

```
UNIVERSITY OF THE PHILIPPINES LOS BAÑOS
Office of the University Registrar

TRANSCRIPT OF RECORDS

Name: SANTOS, Maria Angelica
Student Number: 2023-12345
College: College of Arts and Sciences
Degree: BS Applied Mathematics
Major: N/A

Semester    Course     Units    Grade    Remarks
1st 2023    MATH 27    3.0      1.75     Passed
1st 2023    CMSC 12    3.0      2.00     Passed
...

General Weighted Average: 1.82
Total Units Earned: 45
```

### Certificate of Registration

```
UNIVERSITY OF THE PHILIPPINES LOS BAÑOS
CERTIFICATE OF REGISTRATION

Student Name: SANTOS, Maria Angelica
Student No.: 2023-12345
College: CAS
Degree Program: BS Applied Mathematics
Classification: Junior
Semester: 1st Semester 2025-2026

Enrolled Units: 18
```

### Barangay Certificate

```
BARANGAY CERTIFICATION

This is to certify that MARIA ANGELICA SANTOS, of legal age,
Filipino citizen, is a bonafide resident of Barangay Batong Malake,
City of Los Baños, Province of Laguna.

Issued this 15th day of February, 2026.
```
