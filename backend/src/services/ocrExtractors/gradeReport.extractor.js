// =============================================================================
// ISKOlarship - Grade Report Extractor
// Parses OCR text from grade slips/reports
// =============================================================================

/**
 * Extract structured fields from a grade report.
 * @param {string} rawText - Full OCR-extracted text
 * @returns {Object} Extracted fields
 */
function extract(rawText) {
  const result = {};
  const text = rawText || '';

  // ── GWA ───────────────────────────────────────────────────────────────────
  const gwaPatterns = [
    /general\s*weighted\s*average[:\s]*(\d+\.\d+)/i,
    /GWA[:\s]*(\d+\.\d+)/i,
    /semester\s*(?:grade|average|GWA)[:\s]*(\d+\.\d+)/i,
    /weighted\s*average[:\s]*(\d+\.\d+)/i,
    /average[:\s]*(\d\.\d{1,4})/i,
  ];
  for (const pat of gwaPatterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseFloat(m[1]);
      if (val >= 1.0 && val <= 5.0) {
        result.gwa = val;
        break;
      }
    }
  }

  // ── Student Number ────────────────────────────────────────────────────────
  const studentNumPatterns = [
    /student\s*(?:no|number|#|id)[.:\s]*(\d{4}[-\s]?\d{5,6})/i,
    /(\d{4}-\d{5,6})/,
  ];
  for (const pat of studentNumPatterns) {
    const m = text.match(pat);
    if (m) {
      result.studentNumber = m[1].replace(/\s/g, '');
      break;
    }
  }

  // ── Name ──────────────────────────────────────────────────────────────────
  const namePatterns = [
    /name[:\s]+([A-Z][A-Za-z]+(?:[,\s]+[A-Z][A-Za-z]+){1,3})/i,
    /student[:\s]+([A-Z][A-Za-z]+(?:[,\s]+[A-Z][A-Za-z]+){1,3})/i,
    /([A-Z]{2,}(?:\s[A-Z]{2,})*,\s*[A-Z][a-z]+(?:\s[A-Z]\.?\s*)?)/,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 5) {
      result.name = m[1].trim();
      break;
    }
  }

  return result;
}

module.exports = { extract };
