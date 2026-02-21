// =============================================================================
// ISKOlarship - OCR Extractor Router
// Routes OCR text to the appropriate document-type-specific extractor
// =============================================================================

const transcriptExtractor = require('./transcript.extractor');
const corExtractor = require('./cor.extractor');
const incomeExtractor = require('./income.extractor');
const gradeReportExtractor = require('./gradeReport.extractor');
const barangayExtractor = require('./barangay.extractor');
const genericExtractor = require('./generic.extractor');

/**
 * Document type → extractor mapping.
 */
const extractorMap = {
  transcript: transcriptExtractor,
  grade_report: gradeReportExtractor,
  certificate_of_registration: corExtractor,
  income_certificate: incomeExtractor,
  tax_return: incomeExtractor,           // Same patterns as income cert
  barangay_certificate: barangayExtractor,
  proof_of_enrollment: corExtractor,     // Similar to COR
  photo_id: genericExtractor,
  thesis_outline: genericExtractor,
  recommendation_letter: genericExtractor,
  other: genericExtractor,
};

/**
 * Document types where OCR makes no sense (text-only, no file).
 */
const SKIP_TYPES = ['text_response', 'personal_statement'];

/**
 * Get the appropriate extractor for a document type.
 * @param {string} documentType - The document type enum value
 * @returns {{ extract: Function } | null} Extractor module or null if should skip
 */
function getExtractor(documentType) {
  if (SKIP_TYPES.includes(documentType)) return null;
  return extractorMap[documentType] || genericExtractor;
}

/**
 * Extract fields from OCR text using the appropriate extractor.
 * @param {string} rawText - Full OCR-extracted text
 * @param {string} documentType - The document type enum value
 * @returns {Object} Extracted fields
 */
function extractFields(rawText, documentType) {
  const extractor = getExtractor(documentType);
  if (!extractor) return {};
  return extractor.extract(rawText);
}

module.exports = {
  getExtractor,
  extractFields,
  SKIP_TYPES,
};
