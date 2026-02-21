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

  // ── Student Number (UPLB format: YYYY-NNNNN) ─────────────────────────────
  const studentNumMatch = text.match(/(\d{4}-\d{5,6})/);
  if (studentNumMatch) {
    result.studentNumber = studentNumMatch[1];
  }

  // ── Name (look for typical patterns) ──────────────────────────────────────
  const namePatterns = [
    /name[:\s]+([A-Z][A-Za-z]+(?:[,\s]+[A-Z][A-Za-z]+){1,3})/i,
    /([A-Z]{2,}(?:\s[A-Z]{2,})*,\s*[A-Z][a-z]+(?:\s[A-Z]\.?\s*)?(?:\s[A-Z][a-z]+)?)/,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 5) {
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
