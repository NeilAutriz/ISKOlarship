// =============================================================================
// ISKOlarship - OCR Verification Routes
// API endpoints for document OCR verification
// =============================================================================

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const { canManageApplication } = require('../middleware/adminScope.middleware');
const { Application } = require('../models');
const {
  verifyDocument,
  verifyAllDocuments,
  getVerificationStatus,
  getRawText,
  isOcrAvailable,
} = require('../services/ocrVerification.service');

// All OCR routes require admin authentication
router.use(authMiddleware);
router.use(requireRole('admin'));

// =============================================================================
// Scope check helper — ensures admin can manage this application
// =============================================================================

async function checkApplicationScope(req, res) {
  const application = await Application.findById(req.params.appId)
    .populate('scholarship')
    .lean();

  if (!application) {
    res.status(404).json({ success: false, message: 'Application not found' });
    return null;
  }

  if (!canManageApplication(req.user, application)) {
    res.status(403).json({ success: false, message: 'Access denied: application is outside your admin scope' });
    return null;
  }

  return application;
}

// =============================================================================
// GET /ocr/status — Check if OCR service is available
// =============================================================================

router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      available: isOcrAvailable(),
      provider: 'google_cloud_vision',
    },
  });
});

// =============================================================================
// POST /ocr/applications/:appId/documents/:docId/verify
// Verify a single document via OCR
// =============================================================================

router.post('/applications/:appId/documents/:docId/verify', async (req, res) => {
  try {
    const app = await checkApplicationScope(req, res);
    if (!app) return;

    const result = await verifyDocument(req.params.appId, req.params.docId, req.userId);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('OCR verify document error:', err.message);
    res.status(500).json({
      success: false,
      message: `OCR verification failed: ${err.message}`,
    });
  }
});

// =============================================================================
// POST /ocr/applications/:appId/verify-all
// Verify all documents in an application via OCR
// =============================================================================

router.post('/applications/:appId/verify-all', async (req, res) => {
  try {
    const app = await checkApplicationScope(req, res);
    if (!app) return;

    const result = await verifyAllDocuments(req.params.appId, req.userId);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('OCR verify all error:', err.message);
    res.status(500).json({
      success: false,
      message: `OCR batch verification failed: ${err.message}`,
    });
  }
});

// =============================================================================
// GET /ocr/applications/:appId/status
// Get OCR verification status for all documents in an application
// =============================================================================

router.get('/applications/:appId/status', async (req, res) => {
  try {
    const app = await checkApplicationScope(req, res);
    if (!app) return;

    const result = await getVerificationStatus(req.params.appId);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('OCR status error:', err.message);
    res.status(500).json({
      success: false,
      message: `Failed to get OCR status: ${err.message}`,
    });
  }
});

// =============================================================================
// GET /ocr/applications/:appId/documents/:docId/raw-text
// Get the raw OCR-extracted text for a specific document
// =============================================================================

router.get('/applications/:appId/documents/:docId/raw-text', async (req, res) => {
  try {
    const app = await checkApplicationScope(req, res);
    if (!app) return;

    const result = await getRawText(req.params.appId, req.params.docId);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('OCR raw text error:', err.message);
    res.status(500).json({
      success: false,
      message: `Failed to get raw text: ${err.message}`,
    });
  }
});

module.exports = router;
