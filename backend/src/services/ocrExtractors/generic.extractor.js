// =============================================================================
// ISKOlarship - Generic Extractor (Fallback)
// Attempts to extract common fields from any document type
// =============================================================================

/**
 * Generic fallback extractor for document types without a specialized extractor.
 * Attempts to find common fields like names, student numbers, amounts.
 * @param {string} rawText - Full OCR-extracted text
 * @returns {Object} Extracted fields
 */
function extract(rawText) {
  const result = {};
  const text = rawText || '';

  // ── Student Number (UPLB format: YYYY-NNNNN or YYYYNNNNN) ──────────────
  const studentNumPatterns = [
    /student\s*(?:no|number|#|id)[.:\s]*(\d{4}[-\s]?\d{5,6})/i,
    /(\d{4}-\d{5,6})/,
    /(20\d{2}\d{5,6})/,  // Hyphenless
  ];
  for (const pat of studentNumPatterns) {
    const m = text.match(pat);
    if (m) {
      result.studentNumber = m[1].replace(/\s/g, '');
      break;
    }
  }

  // ── Name (look for typical patterns) ──────────────────────────────────────
  const HEADER_WORDS = /^(UNIVERSITY|PHILIPPINES|LOS\sBAN|UPLB|COLLEGE|INSTITUTE|DEPARTMENT|OFFICE|REGISTRAR|CERTIFICATE|REPUBLIC|BARANGAY)/i;
  const namePatterns = [
    /name[:\s]+([A-Z][A-Za-z]+(?:[,\s]+[A-Z][A-Za-z]+){1,4})/i,
    /(?:certify\s*that|certifies\s*that)\s+(?:(?:MR|MS|MRS|MX)[.\s]+)?([A-Z][A-Za-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][A-Za-z]+){1,3})/i,
    // ALL-CAPS with Filipino compound names
    /([A-Z]{2,}(?:\s(?:DE\s?LA|DELA|DEL|DE\sLOS|DELOS|SAN|STA))?(?:\s[A-Z]{2,})*,\s*[A-Z][a-z]+(?:\s[A-Z]\.?\s*)?(?:\s[A-Z][a-z]+)*)/,
    // Standalone ALL CAPS name line (2-5 words)
    /^([A-Z]{2,}(?:\s[A-Z]{2,}){1,4})$/m,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 5 && !HEADER_WORDS.test(m[1].trim())) {
      result.name = m[1].trim();
      break;
    }
  }

  // ── GWA (if present) ──────────────────────────────────────────────────────
  const gwaMatch = text.match(/(?:GWA|general\s*weighted\s*average)[:\s]*(\d+\.\d+)/i);
  if (gwaMatch) {
    const val = parseFloat(gwaMatch[1]);
    if (val >= 1.0 && val <= 5.0) {
      result.gwa = val;
    }
  }

  // ── Money amount (PHP) ────────────────────────────────────────────────────
  const moneyMatch = text.match(/(?:PHP?|₱|Php)\s*([\d,]+(?:\.\d{2})?)/i);
  if (moneyMatch) {
    const val = parseFloat(moneyMatch[1].replace(/,/g, ''));
    if (val >= 1000 && val <= 50000000) {
      result.income = val;
    }
  }

  // ── College ───────────────────────────────────────────────────────────────
  const collegeMatch = text.match(/(CAS|CAFS|CEM|CEAT|CDC|CFNR|CHE|CVM|CPAF|SESAM|Graduate\s*School)/i);
  if (collegeMatch) {
    result.college = collegeMatch[1].trim();
  }

  return result;
}

module.exports = { extract };
