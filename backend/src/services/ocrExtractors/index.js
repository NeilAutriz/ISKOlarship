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
const studentIdExtractor = require('./studentId.extractor');
const employeeIdExtractor = require('./employeeId.extractor');
const { preprocessOcrText } = require('./preprocess');

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
  photo_id: studentIdExtractor,          // ID card has specific patterns
  student_id: studentIdExtractor,        // Dedicated student ID extractor
  employee_id: employeeIdExtractor,      // Dedicated employee ID extractor
  authorization_letter: genericExtractor,
  proof_of_employment: employeeIdExtractor, // Similar to employee ID
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
 * Applies preprocessing to clean up raw OCR text before extraction.
 * Runs both the type-specific extractor AND the generic extractor,
 * then merges results (type-specific takes precedence) to maximize coverage.
 * @param {string} rawText - Full OCR-extracted text
 * @param {string} documentType - The document type enum value
 * @returns {Object} Extracted fields
 */
function extractFields(rawText, documentType) {
  const extractor = getExtractor(documentType);
  if (!extractor) return {};
  
  // Preprocess OCR text to normalize unicode, fix artifacts, join broken words
  const cleanedText = preprocessOcrText(rawText);
  
  // Run the type-specific extractor
  const primary = extractor.extract(cleanedText);
  
  // Also run generic extractor to catch any fields the primary missed
  // (unless the primary IS the generic extractor)
  if (extractor !== genericExtractor) {
    const fallback = genericExtractor.extract(cleanedText);
    // Merge: primary fields take precedence, fallback fills gaps
    for (const [key, val] of Object.entries(fallback)) {
      if (primary[key] === undefined || primary[key] === null || primary[key] === '') {
        primary[key] = val;
      }
    }
  }
  
  return primary;
}

module.exports = {
  getExtractor,
  extractFields,
  SKIP_TYPES,
};
