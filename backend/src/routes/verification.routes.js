// =============================================================================
// ISKOlarship - Document Verification Routes
// Admin endpoints for reviewing and verifying student AND admin profile documents
// Scope-aware: university sees all, college/academic_unit sees their students
// =============================================================================

const express = require('express');
const router = express.Router();
const { User, UserRole } = require('../models');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const { getSignedUrl } = require('../middleware/upload.middleware');
const { getStudentScopeFilter, canManageStudent, getAdminScopeSummary } = require('../middleware/adminScope.middleware');
const { isOcrAvailable, getVisionClient } = require('../services/ocrVerification.service');
const { extractFields, SKIP_TYPES } = require('../services/ocrExtractors');
const { compareFields, determineOverallMatch, calculateConfidence } = require('../services/ocrExtractors/comparison');
const { notifyDocumentStatusChange, notifyAllDocumentsVerified } = require('../services/notification.service');
const { logDocumentVerification, logDocumentVerifyAll } = require('../services/activityLog.service');

// All verification routes require admin authentication
router.use(authMiddleware);
router.use(requireRole('admin'));

// =============================================================================
// GET /verification/scope
// Get the admin's verification scope information
// =============================================================================

router.get('/scope', async (req, res) => {
  try {
    const scopeSummary = getAdminScopeSummary(req.user);
    if (!scopeSummary || !scopeSummary.level) {
      return res.status(403).json({
        success: false,
        message: 'Your admin profile is not fully configured. Contact a university-level admin.',
      });
    }

    // Build a verification-specific description
    let verificationDescription;
    switch (scopeSummary.level) {
      case 'university':
        verificationDescription = 'You can verify documents for all students across the university.';
        break;
      case 'college':
        verificationDescription = `You can verify documents for students in ${scopeSummary.college || scopeSummary.collegeCode || 'your college'}.`;
        break;
      case 'academic_unit':
        verificationDescription = `You can verify documents for students in ${scopeSummary.academicUnit || scopeSummary.academicUnitCode || 'your unit'} (${scopeSummary.college || scopeSummary.collegeCode || 'your college'}).`;
        break;
      default:
        verificationDescription = 'Limited access.';
    }

    res.json({
      success: true,
      data: {
        level: scopeSummary.level,
        levelDisplay: scopeSummary.levelDisplay,
        collegeCode: scopeSummary.collegeCode,
        academicUnitCode: scopeSummary.academicUnitCode,
        college: scopeSummary.college,
        academicUnit: scopeSummary.academicUnit,
        description: verificationDescription,
      },
    });
  } catch (err) {
    console.error('Verification scope error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get verification scope' });
  }
});

// =============================================================================
// GET /verification/pending
// List students with documents pending verification (scope-filtered)
// =============================================================================

router.get('/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get scope filter for this admin
    const scopeFilter = getStudentScopeFilter(req.user);

    // If scope denies all access, return empty
    if (scopeFilter._id && scopeFilter._id.$exists === false) {
      return res.status(403).json({
        success: false,
        message: 'Your admin profile does not have access to verify student documents. Contact a university-level admin.',
      });
    }

    // Build match filter for students with at least one document
    const matchFilter = {
      ...scopeFilter,
      role: UserRole.STUDENT,
      'studentProfile.documents': { $exists: true, $not: { $size: 0 } },
    };

    // Optional text search by name or email
    if (search) {
      matchFilter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'studentProfile.studentNumber': { $regex: search, $options: 'i' } },
      ];
    }

    const students = await User.find(matchFilter)
      .select('firstName lastName email studentProfile.studentNumber studentProfile.college studentProfile.collegeCode studentProfile.academicUnit studentProfile.academicUnitCode studentProfile.course studentProfile.documents studentProfile.profilePicture')
      .sort({ 'studentProfile.documents.uploadedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await User.countDocuments(matchFilter);

    // Transform — compute per-student document verification summary
    const result = students.map(student => {
      const docs = student.studentProfile?.documents || [];
      const pending = docs.filter(d => !d.verificationStatus || d.verificationStatus === 'pending').length;
      const verified = docs.filter(d => d.verificationStatus === 'verified').length;
      const rejected = docs.filter(d => d.verificationStatus === 'rejected').length;
      const resubmit = docs.filter(d => d.verificationStatus === 'resubmit').length;

      return {
        studentId: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        studentNumber: student.studentProfile?.studentNumber || 'N/A',
        college: student.studentProfile?.college || 'N/A',
        collegeCode: student.studentProfile?.collegeCode || null,
        academicUnit: student.studentProfile?.academicUnit || null,
        academicUnitCode: student.studentProfile?.academicUnitCode || null,
        course: student.studentProfile?.course || 'N/A',
        profilePicture: student.studentProfile?.profilePicture || null,
        totalDocuments: docs.length,
        pending,
        verified,
        rejected,
        resubmit,
        documents: docs.map(d => ({
          _id: d._id,
          name: d.name,
          documentType: d.documentType,
          fileName: d.fileName,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
          uploadedAt: d.uploadedAt,
          verificationStatus: d.verificationStatus || 'pending',
          verifiedAt: d.verifiedAt || null,
          verificationRemarks: d.verificationRemarks || '',
          hasFile: !!(d.cloudinaryPublicId || d.url),
        })),
      };
    });

    res.json({
      success: true,
      data: {
        students: result,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    console.error('Verification pending error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch pending verifications' });
  }
});

// =============================================================================
// GET /verification/stats
// Get overall verification statistics (scope-filtered)
// =============================================================================

router.get('/stats', async (req, res) => {
  try {
    // Get scope filter for this admin
    const scopeFilter = getStudentScopeFilter(req.user);

    // If scope denies all access, return zeros
    if (scopeFilter._id && scopeFilter._id.$exists === false) {
      return res.json({
        success: true,
        data: { totalDocuments: 0, pending: 0, verified: 0, rejected: 0, resubmit: 0, totalStudents: 0 },
      });
    }

    // Build the base match with scope + student role + has documents
    const baseMatch = {
      ...scopeFilter,
      role: UserRole.STUDENT,
      'studentProfile.documents.0': { $exists: true },
    };

    const stats = await User.aggregate([
      { $match: baseMatch },
      { $unwind: '$studentProfile.documents' },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$studentProfile.documents.verificationStatus', 'pending'] },
                  { $eq: ['$studentProfile.documents.verificationStatus', null] },
                  { $not: { $ifNull: ['$studentProfile.documents.verificationStatus', false] } },
                ]},
                1, 0
              ]
            }
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$studentProfile.documents.verificationStatus', 'verified'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$studentProfile.documents.verificationStatus', 'rejected'] }, 1, 0] }
          },
          resubmit: {
            $sum: { $cond: [{ $eq: ['$studentProfile.documents.verificationStatus', 'resubmit'] }, 1, 0] }
          },
          totalStudents: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          totalDocuments: 1,
          pending: 1,
          verified: 1,
          rejected: 1,
          resubmit: 1,
          totalStudents: { $size: '$totalStudents' },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || { totalDocuments: 0, pending: 0, verified: 0, rejected: 0, resubmit: 0, totalStudents: 0 },
    });
  } catch (err) {
    console.error('Verification stats error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch verification stats' });
  }
});

// =============================================================================
// GET /verification/students/:studentId/documents/:docId/preview
// Get a signed preview URL for a document (scope-checked)
// =============================================================================

router.get('/students/:studentId/documents/:docId/preview', async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Scope check: can this admin manage this student?
    if (!canManageStudent(req.user, student)) {
      return res.status(403).json({
        success: false,
        message: 'This student is outside your administrative scope.',
      });
    }

    const doc = student.studentProfile?.documents?.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    let previewUrl = null;
    if (doc.cloudinaryPublicId) {
      previewUrl = getSignedUrl(doc.cloudinaryPublicId, doc.mimeType);
    } else if (doc.url) {
      previewUrl = doc.url;
    }

    if (!previewUrl) {
      return res.status(404).json({ success: false, message: 'No file available for this document' });
    }

    res.json({
      success: true,
      data: {
        url: previewUrl,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
      },
    });
  } catch (err) {
    console.error('Document preview error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get document preview' });
  }
});

// =============================================================================
// PUT /verification/students/:studentId/documents/:docId
// Verify or reject a student document (scope-checked)
// =============================================================================

router.put('/students/:studentId/documents/:docId', async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!['verified', 'rejected', 'resubmit', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Use: verified, rejected, resubmit, or pending' });
    }

    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Scope check: can this admin manage this student?
    if (!canManageStudent(req.user, student)) {
      return res.status(403).json({
        success: false,
        message: 'This student is outside your administrative scope.',
      });
    }

    const doc = student.studentProfile?.documents?.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    doc.verificationStatus = status;
    doc.verifiedBy = req.userId;
    doc.verifiedAt = new Date();
    doc.verificationRemarks = remarks || '';

    await student.save();

    // ── Email notification (fire-and-forget) ──────────────────────────
    notifyDocumentStatusChange(student._id.toString(), status, doc.name || doc.documentType, remarks);
    if (status === 'verified') {
      notifyAllDocumentsVerified(student._id.toString(), student.studentProfile?.documents);
    }

    // Log document verification action (fire-and-forget)
    logDocumentVerification(req.user, student._id, doc.name || doc.documentType, status, req.ip);

    res.json({
      success: true,
      message: `Document ${status}`,
      data: {
        _id: doc._id,
        name: doc.name,
        documentType: doc.documentType,
        verificationStatus: doc.verificationStatus,
        verifiedAt: doc.verifiedAt,
        verificationRemarks: doc.verificationRemarks,
      },
    });
  } catch (err) {
    console.error('Document verification error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update document verification' });
  }
});

// =============================================================================
// PUT /verification/students/:studentId/verify-all
// Verify all documents for a student at once (scope-checked)
// =============================================================================

router.put('/students/:studentId/verify-all', async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Batch status must be verified or rejected' });
    }

    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Scope check: can this admin manage this student?
    if (!canManageStudent(req.user, student)) {
      return res.status(403).json({
        success: false,
        message: 'This student is outside your administrative scope.',
      });
    }

    const docs = student.studentProfile?.documents || [];
    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'No documents to verify' });
    }

    let updated = 0;
    for (const doc of docs) {
      // Only update pending and resubmit documents (don't touch already verified/rejected unless explicitly batch)
      if (!doc.verificationStatus || doc.verificationStatus === 'pending' || doc.verificationStatus === 'resubmit') {
        doc.verificationStatus = status;
        doc.verifiedBy = req.userId;
        doc.verifiedAt = new Date();
        doc.verificationRemarks = remarks || '';
        updated++;
      }
    }

    await student.save();

    // ── Email notification for batch verification (fire-and-forget) ───
    if (updated > 0) {
      // Notify per-document only for small batches; for large just send allDocsVerified
      if (status === 'verified') {
        notifyAllDocumentsVerified(student._id.toString(), student.studentProfile?.documents);
      }
      // For rejection batch, send one notification
      if (status === 'rejected') {
        notifyDocumentStatusChange(student._id.toString(), status, `${updated} document(s)`, remarks);
      }
    }

    // Log batch verification (fire-and-forget)
    logDocumentVerifyAll(req.user, student._id, updated, status, req.ip);

    res.json({
      success: true,
      message: `${updated} document(s) marked as ${status}`,
      data: { updated, total: docs.length },
    });
  } catch (err) {
    console.error('Batch verification error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to batch verify documents' });
  }
});

// =============================================================================
// GET /verification/ocr/status
// Check if OCR service is available for document verification
// =============================================================================

router.get('/ocr/status', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        available: isOcrAvailable(),
        provider: 'google_cloud_vision',
      },
    });
  } catch (err) {
    console.error('OCR status check error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to check OCR status' });
  }
});

// =============================================================================
// POST /verification/students/:studentId/documents/:docId/ocr-scan
// Run OCR scan on a student profile document and compare against profile data
// =============================================================================

router.post('/students/:studentId/documents/:docId/ocr-scan', async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Scope check
    if (!canManageStudent(req.user, student)) {
      return res.status(403).json({
        success: false,
        message: 'This student is outside your administrative scope.',
      });
    }

    const doc = student.studentProfile?.documents?.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Check OCR availability
    if (!isOcrAvailable()) {
      return res.json({
        success: true,
        data: {
          documentId: doc._id,
          status: 'unavailable',
          message: 'OCR service is not configured. Set up Google Cloud Vision API credentials.',
        },
      });
    }

    // Skip types that don't need OCR
    if (SKIP_TYPES.includes(doc.documentType)) {
      return res.json({
        success: true,
        data: {
          documentId: doc._id,
          status: 'skipped',
          message: 'This document type does not require OCR scanning.',
        },
      });
    }

    // Check if document has a file
    if (!doc.cloudinaryPublicId && !doc.url) {
      return res.status(400).json({
        success: false,
        message: 'No file available for this document.',
      });
    }

    // Fetch document from Cloudinary
    let downloadUrl = null;
    if (doc.cloudinaryPublicId) {
      downloadUrl = getSignedUrl(doc.cloudinaryPublicId, doc.mimeType);
    } else if (doc.url) {
      downloadUrl = doc.url;
    }

    const fetchRes = await fetch(downloadUrl);
    if (!fetchRes.ok) {
      return res.status(500).json({
        success: false,
        message: `Failed to fetch document from storage: ${fetchRes.status}`,
      });
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer || buffer.length === 0) {
      return res.status(500).json({ success: false, message: 'Document file is empty' });
    }

    // Run Google Cloud Vision OCR — use shared visionClient from service
    const visionClient = getVisionClient();

    let rawText = '';
    const isPdf = doc.mimeType && doc.mimeType.includes('pdf');

    if (isPdf) {
      const request = {
        requests: [{
          inputConfig: {
            content: buffer.toString('base64'),
            mimeType: 'application/pdf',
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          pages: [1, 2, 3],
        }],
      };
      const [result] = await visionClient.batchAnnotateFiles(request);
      const pages = result.responses?.[0]?.responses || [];
      rawText = pages.map(p => p.fullTextAnnotation?.text || '').filter(Boolean).join('\n\n');
    } else {
      const [result] = await visionClient.textDetection({
        image: { content: buffer.toString('base64') },
      });
      rawText = result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '';
    }

    if (!rawText || rawText.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          documentId: doc._id,
          documentName: doc.name,
          documentType: doc.documentType,
          status: 'completed',
          overallMatch: 'unreadable',
          confidence: 0,
          fields: [],
          extractedFields: {},
          rawTextPreview: '',
          message: 'Could not extract any text from this document. The file may be blank, corrupted, or a non-text image.',
        },
      });
    }

    // Extract fields using document-type extractor
    // Map profile document types to extractor types
    const typeMapping = {
      student_id: 'student_id',
      latest_grades: 'transcript',
      certificate_of_registration: 'certificate_of_registration',
      proof_of_enrollment: 'proof_of_enrollment',
      photo_id: 'photo_id',
      other: 'other',
    };
    const extractorType = typeMapping[doc.documentType] || doc.documentType;
    const extractedFields = extractFields(rawText, extractorType);

    // Build student profile snapshot for comparison (ALL fields)
    const sp = student.studentProfile || {};
    const profileSnapshot = {
      firstName: sp.firstName || student.firstName || '',
      lastName: sp.lastName || student.lastName || '',
      middleName: sp.middleName || '',
      studentNumber: sp.studentNumber || '',
      gwa: sp.gwa || null,
      college: sp.college || '',
      collegeCode: sp.collegeCode || '',
      course: sp.course || '',
      annualFamilyIncome: sp.annualFamilyIncome || null,
      homeAddress: sp.homeAddress || null,
    };

    // Compare extracted fields vs profile — pass rawText for fallback scanning
    const comparisonResults = compareFields(extractedFields, profileSnapshot, rawText);
    const overallMatch = determineOverallMatch(comparisonResults);
    const confidence = calculateConfidence(comparisonResults);

    res.json({
      success: true,
      data: {
        documentId: doc._id,
        documentName: doc.name,
        documentType: doc.documentType,
        status: 'completed',
        overallMatch,
        confidence,
        fields: comparisonResults,
        extractedFields,
        rawTextPreview: rawText.substring(0, 1000),
        processedAt: new Date(),
        profileSnapshot: {
          name: `${profileSnapshot.firstName}${profileSnapshot.middleName ? ' ' + profileSnapshot.middleName : ''} ${profileSnapshot.lastName}`.trim(),
          studentNumber: profileSnapshot.studentNumber,
          college: profileSnapshot.college,
          collegeCode: profileSnapshot.collegeCode,
          course: profileSnapshot.course,
          gwa: profileSnapshot.gwa,
          annualFamilyIncome: profileSnapshot.annualFamilyIncome,
          homeAddress: profileSnapshot.homeAddress?.fullAddress || [profileSnapshot.homeAddress?.barangay, profileSnapshot.homeAddress?.city, profileSnapshot.homeAddress?.province].filter(Boolean).join(', ') || null,
        },
      },
    });
  } catch (err) {
    console.error('OCR scan error:', err.message);
    res.status(500).json({
      success: false,
      message: 'OCR scan failed: ' + err.message,
    });
  }
});

// =============================================================================
// POST /verification/students/:studentId/ocr-scan-all
// Run OCR scan on all pending profile documents for a student
// =============================================================================

router.post('/students/:studentId/ocr-scan-all', async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Scope check
    if (!canManageStudent(req.user, student)) {
      return res.status(403).json({
        success: false,
        message: 'This student is outside your administrative scope.',
      });
    }

    if (!isOcrAvailable()) {
      return res.json({
        success: true,
        data: {
          status: 'unavailable',
          message: 'OCR service is not configured.',
          documents: [],
        },
      });
    }

    const docs = student.studentProfile?.documents || [];
    const pendingDocs = docs.filter(d =>
      (!d.verificationStatus || d.verificationStatus === 'pending') &&
      (d.cloudinaryPublicId || d.url) &&
      !SKIP_TYPES.includes(d.documentType)
    );

    if (pendingDocs.length === 0) {
      return res.json({
        success: true,
        data: {
          status: 'completed',
          message: 'No pending documents to scan.',
          documents: [],
        },
      });
    }

    // Process each document by calling the single scan internally
    // For simplicity, redirect to individual scan results
    const results = [];
    for (const doc of pendingDocs) {
      try {
        // Fetch document
        let downloadUrl = null;
        if (doc.cloudinaryPublicId) {
          downloadUrl = getSignedUrl(doc.cloudinaryPublicId, doc.mimeType);
        } else if (doc.url) {
          downloadUrl = doc.url;
        }

        const fetchRes = await fetch(downloadUrl);
        if (!fetchRes.ok) {
          results.push({ documentId: doc._id, documentName: doc.name, status: 'failed', error: 'Failed to fetch file' });
          continue;
        }

        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Run OCR — use shared visionClient from service
        const visionClient = getVisionClient();

        let rawText = '';
        const isPdf = doc.mimeType && doc.mimeType.includes('pdf');

        if (isPdf) {
          const [result] = await visionClient.batchAnnotateFiles({
            requests: [{
              inputConfig: { content: buffer.toString('base64'), mimeType: 'application/pdf' },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
              pages: [1, 2, 3],
            }],
          });
          const pages = result.responses?.[0]?.responses || [];
          rawText = pages.map(p => p.fullTextAnnotation?.text || '').filter(Boolean).join('\n\n');
        } else {
          const [result] = await visionClient.textDetection({ image: { content: buffer.toString('base64') } });
          rawText = result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '';
        }

        if (!rawText || rawText.trim().length === 0) {
          results.push({
            documentId: doc._id, documentName: doc.name, documentType: doc.documentType,
            status: 'completed', overallMatch: 'unreadable', confidence: 0, fields: [],
          });
          continue;
        }

        const typeMapping = {
          student_id: 'student_id', latest_grades: 'transcript',
          certificate_of_registration: 'certificate_of_registration',
          proof_of_enrollment: 'proof_of_enrollment', photo_id: 'photo_id', other: 'other',
        };
        const extractorType = typeMapping[doc.documentType] || doc.documentType;
        const extractedFields = extractFields(rawText, extractorType);

        const sp = student.studentProfile || {};
        const profileSnapshot = {
          firstName: sp.firstName || student.firstName || '',
          lastName: sp.lastName || student.lastName || '',
          middleName: sp.middleName || '',
          studentNumber: sp.studentNumber || '',
          gwa: sp.gwa || null,
          college: sp.college || '',
          course: sp.course || '',
          annualFamilyIncome: sp.annualFamilyIncome || null,
          homeAddress: sp.homeAddress || null,
        };

        const comparisonResults = compareFields(extractedFields, profileSnapshot, rawText);
        const overallMatch = determineOverallMatch(comparisonResults);
        const confidence = calculateConfidence(comparisonResults);

        results.push({
          documentId: doc._id, documentName: doc.name, documentType: doc.documentType,
          status: 'completed', overallMatch, confidence,
          fields: comparisonResults, extractedFields,
          rawTextPreview: rawText.substring(0, 1000),
        });
      } catch (docErr) {
        results.push({
          documentId: doc._id, documentName: doc.name,
          status: 'failed', error: docErr.message,
        });
      }
    }

    const completed = results.filter(r => r.status === 'completed');
    res.json({
      success: true,
      data: {
        status: 'completed',
        summary: {
          total: results.length,
          completed: completed.length,
          failed: results.filter(r => r.status === 'failed').length,
          verified: completed.filter(r => r.overallMatch === 'verified').length,
          mismatches: completed.filter(r => r.overallMatch === 'mismatch').length,
          partial: completed.filter(r => r.overallMatch === 'partial').length,
          unreadable: completed.filter(r => r.overallMatch === 'unreadable').length,
        },
        documents: results,
      },
    });
  } catch (err) {
    console.error('OCR scan-all error:', err.message);
    res.status(500).json({ success: false, message: 'OCR scan failed: ' + err.message });
  }
});

// =============================================================================
// ADMIN DOCUMENT VERIFICATION
// Higher-level admins verify lower-level admin documents (employee_id etc.)
// University → verifies college & academic_unit admins
// College → verifies academic_unit admins in same college
// Academic_unit → cannot verify other admins
// =============================================================================

/**
 * Get a MongoDB filter for admins whose documents this verifier can review.
 */
function getAdminVerificationFilter(verifier) {
  const vp = verifier.adminProfile;
  if (!vp || !vp.accessLevel) return { _id: { $exists: false } };

  if (vp.accessLevel === 'university') {
    // University admin verifies all non-university admins
    return {
      role: UserRole.ADMIN,
      _id: { $ne: verifier._id },
      'adminProfile.accessLevel': { $in: ['college', 'academic_unit'] },
    };
  }

  if (vp.accessLevel === 'college') {
    // College admin verifies academic_unit admins in same college
    return {
      role: UserRole.ADMIN,
      _id: { $ne: verifier._id },
      'adminProfile.accessLevel': 'academic_unit',
      'adminProfile.collegeCode': vp.collegeCode,
    };
  }

  // academic_unit admins cannot verify other admins
  return { _id: { $exists: false } };
}

/**
 * Check whether a verifier admin can verify a specific target admin's documents.
 */
function canVerifyAdmin(verifier, target) {
  const vp = verifier.adminProfile;
  const tp = target.adminProfile;
  if (!vp || !tp) return false;
  if (verifier._id.toString() === target._id.toString()) return false;

  if (vp.accessLevel === 'university') {
    return ['college', 'academic_unit'].includes(tp.accessLevel);
  }
  if (vp.accessLevel === 'college') {
    return tp.accessLevel === 'academic_unit' && tp.collegeCode === vp.collegeCode;
  }
  return false;
}

// =============================================================================
// GET /verification/admin/pending
// List admins with documents pending verification (scope-filtered)
// =============================================================================

router.get('/admin/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const scopeFilter = getAdminVerificationFilter(req.user);

    // If scope denies all access
    if (scopeFilter._id && scopeFilter._id.$exists === false) {
      return res.json({
        success: true,
        data: {
          admins: [],
          pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 },
        },
      });
    }

    const matchFilter = {
      ...scopeFilter,
      'adminProfile.documents.0': { $exists: true },
    };

    if (search) {
      matchFilter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const admins = await User.find(matchFilter)
      .select('firstName lastName email adminProfile.accessLevel adminProfile.college adminProfile.collegeCode adminProfile.academicUnit adminProfile.academicUnitCode adminProfile.position adminProfile.documents adminProfile.profilePicture')
      .sort({ 'adminProfile.documents.uploadedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await User.countDocuments(matchFilter);

    const result = admins.map(admin => {
      const docs = admin.adminProfile?.documents || [];
      const pending = docs.filter(d => !d.verificationStatus || d.verificationStatus === 'pending').length;
      const verified = docs.filter(d => d.verificationStatus === 'verified').length;
      const rejected = docs.filter(d => d.verificationStatus === 'rejected').length;
      const resubmit = docs.filter(d => d.verificationStatus === 'resubmit').length;

      return {
        adminId: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        accessLevel: admin.adminProfile?.accessLevel || 'N/A',
        college: admin.adminProfile?.college || 'N/A',
        collegeCode: admin.adminProfile?.collegeCode || null,
        academicUnit: admin.adminProfile?.academicUnit || null,
        academicUnitCode: admin.adminProfile?.academicUnitCode || null,
        position: admin.adminProfile?.position || 'N/A',
        profilePicture: admin.adminProfile?.profilePicture || null,
        totalDocuments: docs.length,
        pending,
        verified,
        rejected,
        resubmit,
        documents: docs.map(d => ({
          _id: d._id,
          name: d.name,
          documentType: d.documentType,
          fileName: d.fileName,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
          uploadedAt: d.uploadedAt,
          verificationStatus: d.verificationStatus || 'pending',
          verifiedAt: d.verifiedAt || null,
          verificationRemarks: d.verificationRemarks || '',
          hasFile: !!(d.cloudinaryPublicId || d.url),
        })),
      };
    });

    res.json({
      success: true,
      data: {
        admins: result,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    console.error('Admin verification pending error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch pending admin verifications' });
  }
});

// =============================================================================
// GET /verification/admin/stats
// Get overall admin document verification statistics
// =============================================================================

router.get('/admin/stats', async (req, res) => {
  try {
    const scopeFilter = getAdminVerificationFilter(req.user);

    if (scopeFilter._id && scopeFilter._id.$exists === false) {
      return res.json({
        success: true,
        data: { totalDocuments: 0, pending: 0, verified: 0, rejected: 0, resubmit: 0, totalAdmins: 0 },
      });
    }

    const baseMatch = {
      ...scopeFilter,
      'adminProfile.documents.0': { $exists: true },
    };

    const stats = await User.aggregate([
      { $match: baseMatch },
      { $unwind: '$adminProfile.documents' },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$adminProfile.documents.verificationStatus', 'pending'] },
                  { $eq: ['$adminProfile.documents.verificationStatus', null] },
                  { $not: { $ifNull: ['$adminProfile.documents.verificationStatus', false] } },
                ]},
                1, 0
              ]
            }
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$adminProfile.documents.verificationStatus', 'verified'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$adminProfile.documents.verificationStatus', 'rejected'] }, 1, 0] }
          },
          resubmit: {
            $sum: { $cond: [{ $eq: ['$adminProfile.documents.verificationStatus', 'resubmit'] }, 1, 0] }
          },
          totalAdmins: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          totalDocuments: 1,
          pending: 1,
          verified: 1,
          rejected: 1,
          resubmit: 1,
          totalAdmins: { $size: '$totalAdmins' },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || { totalDocuments: 0, pending: 0, verified: 0, rejected: 0, resubmit: 0, totalAdmins: 0 },
    });
  } catch (err) {
    console.error('Admin verification stats error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch admin verification stats' });
  }
});

// =============================================================================
// GET /verification/admin/admins/:adminId/documents/:docId/preview
// Get a signed preview URL for an admin document
// =============================================================================

router.get('/admin/admins/:adminId/documents/:docId/preview', async (req, res) => {
  try {
    const target = await User.findById(req.params.adminId);
    if (!target || target.role !== UserRole.ADMIN) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (!canVerifyAdmin(req.user, target)) {
      return res.status(403).json({
        success: false,
        message: 'This admin is outside your verification scope.',
      });
    }

    const doc = target.adminProfile?.documents?.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    let previewUrl = null;
    if (doc.cloudinaryPublicId) {
      previewUrl = getSignedUrl(doc.cloudinaryPublicId, doc.mimeType);
    } else if (doc.url) {
      previewUrl = doc.url;
    }

    if (!previewUrl) {
      return res.status(404).json({ success: false, message: 'No file available for this document' });
    }

    res.json({
      success: true,
      data: {
        url: previewUrl,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
      },
    });
  } catch (err) {
    console.error('Admin document preview error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get admin document preview' });
  }
});

// =============================================================================
// PUT /verification/admin/admins/:adminId/documents/:docId
// Verify or reject an admin document
// =============================================================================

router.put('/admin/admins/:adminId/documents/:docId', async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!['verified', 'rejected', 'resubmit', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Use: verified, rejected, resubmit, or pending' });
    }

    const target = await User.findById(req.params.adminId);
    if (!target || target.role !== UserRole.ADMIN) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (!canVerifyAdmin(req.user, target)) {
      return res.status(403).json({
        success: false,
        message: 'This admin is outside your verification scope.',
      });
    }

    const doc = target.adminProfile?.documents?.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    doc.verificationStatus = status;
    doc.verifiedBy = req.userId;
    doc.verifiedAt = new Date();
    doc.verificationRemarks = remarks || '';

    await target.save();

    // ── Email notification (fire-and-forget) ──────────────────────────
    notifyDocumentStatusChange(target._id.toString(), status, doc.name || doc.documentType, remarks);
    if (status === 'verified') {
      notifyAllDocumentsVerified(target._id.toString(), target.adminProfile?.documents);
    }

    // Log admin document verification (fire-and-forget)
    logDocumentVerification(req.user, target._id, doc.name || doc.documentType, status, req.ip);

    res.json({
      success: true,
      message: `Admin document ${status}`,
      data: {
        _id: doc._id,
        name: doc.name,
        documentType: doc.documentType,
        verificationStatus: doc.verificationStatus,
        verifiedAt: doc.verifiedAt,
        verificationRemarks: doc.verificationRemarks,
      },
    });
  } catch (err) {
    console.error('Admin document verification error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update admin document verification' });
  }
});

// =============================================================================
// PUT /verification/admin/admins/:adminId/verify-all
// Verify all documents for an admin at once
// =============================================================================

router.put('/admin/admins/:adminId/verify-all', async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Batch status must be verified or rejected' });
    }

    const target = await User.findById(req.params.adminId);
    if (!target || target.role !== UserRole.ADMIN) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (!canVerifyAdmin(req.user, target)) {
      return res.status(403).json({
        success: false,
        message: 'This admin is outside your verification scope.',
      });
    }

    const docs = target.adminProfile?.documents || [];
    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'No documents to verify' });
    }

    let updated = 0;
    for (const doc of docs) {
      if (!doc.verificationStatus || doc.verificationStatus === 'pending' || doc.verificationStatus === 'resubmit') {
        doc.verificationStatus = status;
        doc.verifiedBy = req.userId;
        doc.verifiedAt = new Date();
        doc.verificationRemarks = remarks || '';
        updated++;
      }
    }

    await target.save();

    // ── Email notification for admin batch verification (fire-and-forget)
    if (updated > 0) {
      if (status === 'verified') {
        notifyAllDocumentsVerified(target._id.toString(), target.adminProfile?.documents);
      }
      if (status === 'rejected') {
        notifyDocumentStatusChange(target._id.toString(), status, `${updated} document(s)`, remarks);
      }
    }

    // Log admin batch verification (fire-and-forget)
    logDocumentVerifyAll(req.user, target._id, updated, status, req.ip);

    res.json({
      success: true,
      message: `${updated} admin document(s) marked as ${status}`,
      data: { updated, total: docs.length },
    });
  } catch (err) {
    console.error('Admin batch verification error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to batch verify admin documents' });
  }
});

// =============================================================================
// POST /verification/admin/admins/:adminId/documents/:docId/ocr-scan
// Run OCR scan on an admin profile document and compare against admin profile
// =============================================================================

router.post('/admin/admins/:adminId/documents/:docId/ocr-scan', async (req, res) => {
  try {
    const target = await User.findById(req.params.adminId);
    if (!target || target.role !== UserRole.ADMIN) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (!canVerifyAdmin(req.user, target)) {
      return res.status(403).json({
        success: false,
        message: 'This admin is outside your verification scope.',
      });
    }

    const doc = target.adminProfile?.documents?.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!isOcrAvailable()) {
      return res.json({
        success: true,
        data: {
          documentId: doc._id,
          status: 'unavailable',
          message: 'OCR service is not configured. Set up Google Cloud Vision API credentials.',
        },
      });
    }

    if (!doc.cloudinaryPublicId && !doc.url) {
      return res.status(400).json({
        success: false,
        message: 'No file available for this document.',
      });
    }

    // Fetch document from storage
    let downloadUrl = null;
    if (doc.cloudinaryPublicId) {
      downloadUrl = getSignedUrl(doc.cloudinaryPublicId, doc.mimeType);
    } else if (doc.url) {
      downloadUrl = doc.url;
    }

    const fetchRes = await fetch(downloadUrl);
    if (!fetchRes.ok) {
      return res.status(500).json({
        success: false,
        message: `Failed to fetch document from storage: ${fetchRes.status}`,
      });
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer || buffer.length === 0) {
      return res.status(500).json({ success: false, message: 'Document file is empty' });
    }

    // Run Google Cloud Vision OCR — use shared visionClient from service
    const visionClient = getVisionClient();

    let rawText = '';
    const isPdf = doc.mimeType && doc.mimeType.includes('pdf');

    if (isPdf) {
      const request = {
        requests: [{
          inputConfig: {
            content: buffer.toString('base64'),
            mimeType: 'application/pdf',
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          pages: [1, 2, 3],
        }],
      };
      const [result] = await visionClient.batchAnnotateFiles(request);
      const pages = result.responses?.[0]?.responses || [];
      rawText = pages.map(p => p.fullTextAnnotation?.text || '').filter(Boolean).join('\n\n');
    } else {
      const [result] = await visionClient.textDetection({
        image: { content: buffer.toString('base64') },
      });
      rawText = result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '';
    }

    if (!rawText || rawText.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          documentId: doc._id,
          documentName: doc.name,
          documentType: doc.documentType,
          status: 'completed',
          overallMatch: 'unreadable',
          confidence: 0,
          fields: [],
          extractedFields: {},
          rawTextPreview: '',
          message: 'Could not extract any text from this document.',
        },
      });
    }

    // Map admin document types to extractor types
    const typeMapping = {
      employee_id: 'employee_id',
      authorization_letter: 'other',
      proof_of_employment: 'proof_of_employment',
      other: 'other',
    };
    const extractorType = typeMapping[doc.documentType] || 'other';
    const extractedFields = extractFields(rawText, extractorType);

    // Build admin profile snapshot for comparison
    const ap = target.adminProfile || {};
    const profileSnapshot = {
      firstName: target.firstName || '',
      lastName: target.lastName || '',
      middleName: ap.middleName || '',
      college: ap.college || '',
      collegeCode: ap.collegeCode || '',
      position: ap.position || '',
      department: ap.academicUnit || ap.college || '',
      academicUnit: ap.academicUnit || '',
    };

    const comparisonResults = compareFields(extractedFields, profileSnapshot, rawText);
    const overallMatch = determineOverallMatch(comparisonResults);
    const confidence = calculateConfidence(comparisonResults);

    res.json({
      success: true,
      data: {
        documentId: doc._id,
        documentName: doc.name,
        documentType: doc.documentType,
        status: 'completed',
        overallMatch,
        confidence,
        fields: comparisonResults,
        extractedFields,
        rawTextPreview: rawText.substring(0, 1000),
        processedAt: new Date(),
        profileSnapshot: {
          name: `${profileSnapshot.firstName}${profileSnapshot.middleName ? ' ' + profileSnapshot.middleName : ''} ${profileSnapshot.lastName}`.trim(),
          college: profileSnapshot.college,
          collegeCode: profileSnapshot.collegeCode,
          position: profileSnapshot.position,
          department: profileSnapshot.department,
          academicUnit: profileSnapshot.academicUnit,
        },
      },
    });
  } catch (err) {
    console.error('Admin OCR scan error:', err.message);
    res.status(500).json({
      success: false,
      message: 'OCR scan failed: ' + err.message,
    });
  }
});

// =============================================================================
// POST /verification/admin/admins/:adminId/ocr-scan-all
// Run OCR scan on all pending admin documents
// =============================================================================

router.post('/admin/admins/:adminId/ocr-scan-all', async (req, res) => {
  try {
    const target = await User.findById(req.params.adminId);
    if (!target || target.role !== UserRole.ADMIN) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (!canVerifyAdmin(req.user, target)) {
      return res.status(403).json({
        success: false,
        message: 'This admin is outside your verification scope.',
      });
    }

    if (!isOcrAvailable()) {
      return res.json({
        success: true,
        data: {
          status: 'unavailable',
          message: 'OCR service is not configured.',
          documents: [],
        },
      });
    }

    const docs = target.adminProfile?.documents || [];
    const pendingDocs = docs.filter(d =>
      (!d.verificationStatus || d.verificationStatus === 'pending') &&
      (d.cloudinaryPublicId || d.url)
    );

    if (pendingDocs.length === 0) {
      return res.json({
        success: true,
        data: {
          status: 'completed',
          message: 'No pending documents to scan.',
          documents: [],
        },
      });
    }

    const results = [];
    for (const doc of pendingDocs) {
      try {
        let downloadUrl = null;
        if (doc.cloudinaryPublicId) {
          downloadUrl = getSignedUrl(doc.cloudinaryPublicId, doc.mimeType);
        } else if (doc.url) {
          downloadUrl = doc.url;
        }

        const fetchRes = await fetch(downloadUrl);
        if (!fetchRes.ok) {
          results.push({ documentId: doc._id, documentName: doc.name, status: 'failed', error: 'Failed to fetch file' });
          continue;
        }

        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Run OCR — use shared visionClient from service
        const visionClient = getVisionClient();

        let rawText = '';
        const isPdf = doc.mimeType && doc.mimeType.includes('pdf');

        if (isPdf) {
          const [result] = await visionClient.batchAnnotateFiles({
            requests: [{
              inputConfig: { content: buffer.toString('base64'), mimeType: 'application/pdf' },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
              pages: [1, 2, 3],
            }],
          });
          const pages = result.responses?.[0]?.responses || [];
          rawText = pages.map(p => p.fullTextAnnotation?.text || '').filter(Boolean).join('\n\n');
        } else {
          const [result] = await visionClient.textDetection({ image: { content: buffer.toString('base64') } });
          rawText = result.fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '';
        }

        if (!rawText || rawText.trim().length === 0) {
          results.push({
            documentId: doc._id, documentName: doc.name, documentType: doc.documentType,
            status: 'completed', overallMatch: 'unreadable', confidence: 0, fields: [],
          });
          continue;
        }

        const typeMapping = {
          employee_id: 'employee_id', authorization_letter: 'other',
          proof_of_employment: 'proof_of_employment', other: 'other',
        };
        const extractorType = typeMapping[doc.documentType] || 'other';
        const extractedFields = extractFields(rawText, extractorType);

        const ap = target.adminProfile || {};
        const profileSnapshot = {
          firstName: target.firstName || '',
          lastName: target.lastName || '',
          middleName: ap.middleName || '',
          college: ap.college || '',
          position: ap.position || '',
          department: ap.academicUnit || ap.college || '',
          academicUnit: ap.academicUnit || '',
        };

        const comparisonResults = compareFields(extractedFields, profileSnapshot, rawText);
        const overallMatch = determineOverallMatch(comparisonResults);
        const confidence = calculateConfidence(comparisonResults);

        results.push({
          documentId: doc._id, documentName: doc.name, documentType: doc.documentType,
          status: 'completed', overallMatch, confidence,
          fields: comparisonResults, extractedFields,
          rawTextPreview: rawText.substring(0, 1000),
        });
      } catch (docErr) {
        results.push({
          documentId: doc._id, documentName: doc.name,
          status: 'failed', error: docErr.message,
        });
      }
    }

    const completed = results.filter(r => r.status === 'completed');
    res.json({
      success: true,
      data: {
        status: 'completed',
        summary: {
          total: results.length,
          completed: completed.length,
          failed: results.filter(r => r.status === 'failed').length,
          verified: completed.filter(r => r.overallMatch === 'verified').length,
          mismatches: completed.filter(r => r.overallMatch === 'mismatch').length,
          partial: completed.filter(r => r.overallMatch === 'partial').length,
          unreadable: completed.filter(r => r.overallMatch === 'unreadable').length,
        },
        documents: results,
      },
    });
  } catch (err) {
    console.error('Admin OCR scan-all error:', err.message);
    res.status(500).json({ success: false, message: 'OCR scan failed: ' + err.message });
  }
});

module.exports = router;
