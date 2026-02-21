// =============================================================================
// ISKOlarship - OCR Verification Service
// Orchestrates OCR processing, field extraction, and comparison
//
// Uses Google Cloud Vision API for text extraction from documents.
// Falls back gracefully when Vision API credentials are not configured.
// =============================================================================

const { Application } = require('../models');
const { getSignedUrl } = require('../middleware/upload.middleware');
const { extractFields, SKIP_TYPES } = require('./ocrExtractors');
const { compareFields, determineOverallMatch, calculateConfidence } = require('./ocrExtractors/comparison');

// ─── Google Cloud Vision Client ─────────────────────────────────────────────

let visionClient = null;
let visionAvailable = false;

function initVisionClient() {
  try {
    const vision = require('@google-cloud/vision');

    // Support base64-encoded JSON credentials (for Railway env vars)
    if (process.env.GOOGLE_CLOUD_VISION_KEY) {
      const credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_CLOUD_VISION_KEY, 'base64').toString('utf8')
      );
      visionClient = new vision.ImageAnnotatorClient({ credentials });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Standard file-based credentials
      visionClient = new vision.ImageAnnotatorClient();
    } else {
      console.log('ℹ️  OCR: No Google Cloud Vision credentials configured. OCR will be unavailable.');
      return;
    }

    visionAvailable = true;
    console.log('✅ OCR: Google Cloud Vision initialized');
  } catch (err) {
    console.log(`ℹ️  OCR: Google Cloud Vision not available (${err.message}). OCR will be disabled.`);
  }
}

// Initialize on module load
initVisionClient();

// ─── Configuration ──────────────────────────────────────────────────────────

const OCR_CONFIG = {
  enabled: process.env.OCR_ENABLED !== 'false',
  maxPages: parseInt(process.env.OCR_MAX_PAGES || '3', 10),
  minConfidence: parseFloat(process.env.OCR_MIN_CONFIDENCE || '0.3'),
};

// =============================================================================
// Core: Verify a Single Document
// =============================================================================

/**
 * Run OCR verification on a single document within an application.
 *
 * @param {string} applicationId - Application ObjectId
 * @param {string} documentId   - Document sub-document _id
 * @param {string} adminId      - Admin who triggered verification
 * @returns {Object} Verification result
 */
async function verifyDocument(applicationId, documentId, adminId) {
  const application = await Application.findById(applicationId).populate('applicant');
  if (!application) throw new Error('Application not found');

  const doc = application.documents.id(documentId);
  if (!doc) throw new Error('Document not found');

  // Skip text-only documents
  if (doc.isTextDocument || SKIP_TYPES.includes(doc.documentType)) {
    return {
      documentId,
      documentType: doc.documentType,
      documentName: doc.name,
      status: 'skipped',
      message: 'Text-type documents do not require OCR',
    };
  }

  // Check if OCR is available
  if (!visionAvailable || !OCR_CONFIG.enabled) {
    return {
      documentId,
      documentType: doc.documentType,
      documentName: doc.name,
      status: 'unavailable',
      message: 'OCR service is not configured. Please set up Google Cloud Vision API credentials.',
    };
  }

  // Mark as processing
  doc.ocrResult = {
    status: 'processing',
    processedBy: adminId,
  };
  await application.save();

  try {
    // ── 1. Fetch document from Cloudinary ─────────────────────────────────
    const buffer = await fetchDocumentBuffer(doc);
    if (!buffer || buffer.length === 0) {
      throw new Error('Could not fetch document content');
    }

    // ── 2. Run Google Cloud Vision OCR ────────────────────────────────────
    const rawText = await runOcr(buffer, doc.mimeType);

    if (!rawText || rawText.trim().length === 0) {
      doc.ocrResult = {
        status: 'completed',
        rawText: '',
        extractedFields: {},
        comparisonResults: [],
        confidence: 0,
        overallMatch: 'unreadable',
        processedAt: new Date(),
        processedBy: adminId,
        ocrProvider: 'google_cloud_vision',
      };
      await application.save();

      return {
        documentId,
        documentType: doc.documentType,
        documentName: doc.name,
        status: 'completed',
        overallMatch: 'unreadable',
        confidence: 0,
        fields: [],
        rawTextPreview: '',
        processedAt: doc.ocrResult.processedAt,
      };
    }

    // ── 3. Extract fields using document-type-specific extractor ──────────
    const extractedFields = extractFields(rawText, doc.documentType);

    // ── 4. Compare against applicant snapshot (with raw-text fallback) ─────
    const snapshot = application.applicantSnapshot || {};
    const comparisonResults = compareFields(extractedFields, snapshot, rawText);
    const overallMatch = determineOverallMatch(comparisonResults);
    const confidence = calculateConfidence(comparisonResults);

    // ── 5. Save to database ───────────────────────────────────────────────
    doc.ocrResult = {
      status: 'completed',
      rawText,
      extractedFields,
      comparisonResults,
      confidence,
      overallMatch,
      processedAt: new Date(),
      processedBy: adminId,
      ocrProvider: 'google_cloud_vision',
    };
    await application.save();

    // ── 6. Return result ──────────────────────────────────────────────────
    return {
      documentId,
      documentType: doc.documentType,
      documentName: doc.name,
      status: 'completed',
      overallMatch,
      confidence,
      fields: comparisonResults,
      extractedFields,
      rawTextPreview: rawText.substring(0, 1000),
      processedAt: doc.ocrResult.processedAt,
    };
  } catch (err) {
    // Save error state
    doc.ocrResult = {
      status: 'failed',
      error: err.message,
      processedAt: new Date(),
      processedBy: adminId,
      ocrProvider: 'google_cloud_vision',
    };
    await application.save();

    // Return failure result instead of throwing (avoids 500 responses)
    return {
      documentId,
      documentType: doc.documentType,
      documentName: doc.name,
      status: 'failed',
      error: err.message,
      processedAt: doc.ocrResult.processedAt,
    };
  }
}

// =============================================================================
// Core: Verify All Documents in an Application
// =============================================================================

/**
 * Run OCR verification on all file-type documents in an application.
 *
 * @param {string} applicationId - Application ObjectId
 * @param {string} adminId      - Admin who triggered verification
 * @returns {Object} Summary + per-document results
 */
async function verifyAllDocuments(applicationId, adminId) {
  const application = await Application.findById(applicationId).populate('applicant');
  if (!application) throw new Error('Application not found');

  const results = [];

  for (const doc of application.documents) {
    try {
      const result = await verifyDocument(applicationId, doc._id.toString(), adminId);
      results.push(result);
    } catch (err) {
      results.push({
        documentId: doc._id.toString(),
        documentType: doc.documentType,
        documentName: doc.name,
        status: 'failed',
        error: err.message,
      });
    }
  }

  const summary = buildSummary(results);

  return {
    applicationId,
    summary,
    documents: results,
  };
}

// =============================================================================
// Core: Get Verification Status
// =============================================================================

/**
 * Get OCR verification status for all documents in an application.
 *
 * @param {string} applicationId - Application ObjectId
 * @returns {Object} Status summary + per-document status
 */
async function getVerificationStatus(applicationId) {
  const application = await Application.findById(applicationId);
  if (!application) throw new Error('Application not found');

  const documents = application.documents.map(doc => ({
    documentId: doc._id.toString(),
    name: doc.name,
    type: doc.documentType,
    isTextDocument: doc.isTextDocument || false,
    ocrStatus: doc.ocrResult?.status || 'pending',
    overallMatch: doc.ocrResult?.overallMatch || null,
    confidence: doc.ocrResult?.confidence || null,
    comparisonResults: doc.ocrResult?.comparisonResults || [],
    extractedFields: doc.ocrResult?.extractedFields || null,
    processedAt: doc.ocrResult?.processedAt || null,
    error: doc.ocrResult?.error || null,
  }));

  const fileDocuments = documents.filter(d => !d.isTextDocument && !SKIP_TYPES.includes(d.type));
  const summary = {
    totalDocuments: application.documents.length,
    fileDocuments: fileDocuments.length,
    verified: fileDocuments.filter(d => d.overallMatch === 'verified').length,
    mismatches: fileDocuments.filter(d => d.overallMatch === 'mismatch').length,
    partial: fileDocuments.filter(d => d.overallMatch === 'partial').length,
    unreadable: fileDocuments.filter(d => d.overallMatch === 'unreadable').length,
    pending: fileDocuments.filter(d => d.ocrStatus === 'pending').length,
    failed: fileDocuments.filter(d => d.ocrStatus === 'failed').length,
    overallStatus: 'not_started',
  };

  if (summary.pending === fileDocuments.length) summary.overallStatus = 'not_started';
  else if (summary.pending === 0 && summary.failed === 0) {
    summary.overallStatus = summary.mismatches > 0 ? 'has_mismatches' : 'all_verified';
  } else {
    summary.overallStatus = 'incomplete';
  }

  return {
    applicationId,
    ocrAvailable: visionAvailable && OCR_CONFIG.enabled,
    summary,
    documents,
  };
}

// =============================================================================
// Core: Get Raw Text for a Document
// =============================================================================

/**
 * Get the full OCR-extracted raw text for a specific document.
 *
 * @param {string} applicationId - Application ObjectId
 * @param {string} documentId   - Document sub-document _id
 * @returns {Object} Raw text result
 */
async function getRawText(applicationId, documentId) {
  const application = await Application.findById(applicationId);
  if (!application) throw new Error('Application not found');

  const doc = application.documents.id(documentId);
  if (!doc) throw new Error('Document not found');

  return {
    documentId,
    documentName: doc.name,
    documentType: doc.documentType,
    rawText: doc.ocrResult?.rawText || null,
    status: doc.ocrResult?.status || 'pending',
    processedAt: doc.ocrResult?.processedAt || null,
  };
}

// =============================================================================
// Internal: Fetch Document Buffer from Cloudinary
// =============================================================================

async function fetchDocumentBuffer(doc) {
  let downloadUrl = null;

  if (doc.cloudinaryPublicId) {
    downloadUrl = getSignedUrl(doc.cloudinaryPublicId, doc.mimeType);
  } else if (doc.url) {
    downloadUrl = doc.url;
  }

  if (!downloadUrl) {
    throw new Error(
      `No document URL available (cloudinaryPublicId: ${doc.cloudinaryPublicId || 'none'}, url: ${doc.url || 'none'}, name: ${doc.name})`
    );
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// =============================================================================
// Internal: Run Google Cloud Vision OCR
// =============================================================================

async function runOcr(buffer, mimeType) {
  if (!visionClient) throw new Error('Vision client not initialized');

  const isPdf = mimeType && mimeType.includes('pdf');

  if (isPdf) {
    // Use document text detection for PDFs
    const request = {
      requests: [
        {
          inputConfig: {
            content: buffer.toString('base64'),
            mimeType: 'application/pdf',
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          // Process first N pages only
          pages: Array.from({ length: OCR_CONFIG.maxPages }, (_, i) => i + 1),
        },
      ],
    };

    const [result] = await visionClient.batchAnnotateFiles(request);
    const pages = result.responses?.[0]?.responses || [];
    const texts = pages.map(p => p.fullTextAnnotation?.text || '').filter(Boolean);
    return texts.join('\n\n');
  } else {
    // Use text detection for images
    const [result] = await visionClient.textDetection({
      image: { content: buffer.toString('base64') },
    });

    return result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '';
  }
}

// =============================================================================
// Internal: Build Summary
// =============================================================================

function buildSummary(results) {
  const completed = results.filter(r => r.status === 'completed');
  const skipped = results.filter(r => r.status === 'skipped');
  
  return {
    total: results.length,
    completed: completed.length,
    skipped: skipped.length,
    failed: results.filter(r => r.status === 'failed').length,
    unavailable: results.filter(r => r.status === 'unavailable').length,
    verified: completed.filter(r => r.overallMatch === 'verified').length,
    mismatches: completed.filter(r => r.overallMatch === 'mismatch').length,
    partial: completed.filter(r => r.overallMatch === 'partial').length,
    unreadable: completed.filter(r => r.overallMatch === 'unreadable').length,
  };
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  verifyDocument,
  verifyAllDocuments,
  getVerificationStatus,
  getRawText,
  OCR_CONFIG,
  isOcrAvailable: () => visionAvailable && OCR_CONFIG.enabled,
  getVisionClient: () => visionClient,
};
