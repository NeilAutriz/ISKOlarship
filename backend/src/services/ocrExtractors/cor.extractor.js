// =============================================================================
// ISKOlarship - Certificate of Registration Extractor
// Parses OCR text from UPLB COR documents
// =============================================================================

/**
 * Extract structured fields from a Certificate of Registration.
 * @param {string} rawText - Full OCR-extracted text
 * @returns {Object} Extracted fields
 */
function extract(rawText) {
  const result = {};
  const text = rawText || '';

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
    /student\s*name[:\s]+(.+?)(?:\n|$)/i,
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

  // ── College ───────────────────────────────────────────────────────────────
  // Known form labels that should NOT be captured as college values
  const FORM_LABELS = /^(program|term|course|degree|year|level|semester|sy|units?|section|schedule|status|name|student|date|classification|enrolled|total)$/i;

  const collegePatterns = [
    // Direct college code match (most reliable for UPLB forms)
    /(CAS|CAFS|CEM|CEAT|CDC|CFNR|CHE|CVM|CPAF|SESAM|Graduate\s*School)/i,
    // "College: <value>" on the same line only (use [^\n] instead of . to not cross lines)
    /college[:\s]+([^\n]+)/i,
    // "College of ..." full name
    /college\s+of\s+[A-Za-z\s&]+/i,
  ];
  for (const pat of collegePatterns) {
    const m = text.match(pat);
    if (m) {
      const val = m[1] ? m[1].trim() : m[0].trim();
      // Skip if the captured value is just a known form label
      if (!FORM_LABELS.test(val)) {
        result.college = val;
        break;
      }
    }
  }

  // ── Course / Degree ───────────────────────────────────────────────────────
  const coursePatterns = [
    /degree\s*program[:\s]+([A-Za-z\s.]+?)(?:\n|$)/i,
    /(?:BS|BA|AB|MS|MA|PhD)\s+([A-Za-z\s]+?)(?:\n|$)/i,
    /course[:\s]+([A-Za-z\s.]+?)(?:\n|$)/i,
  ];
  for (const pat of coursePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 3) {
      result.course = m[1].trim();
      break;
    }
  }

  // ── Units Enrolled ────────────────────────────────────────────────────────
  const unitsPatterns = [
    /(?:total\s*)?(?:enrolled\s*)?units[:\s]*(\d+(?:\.\d)?)/i,
    /units\s*enrolled[:\s]*(\d+(?:\.\d)?)/i,
    /(\d+(?:\.\d)?)\s*units?\s*enrolled/i,
  ];
  for (const pat of unitsPatterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseFloat(m[1]);
      if (val >= 1 && val <= 30) {
        result.unitsEnrolled = val;
        break;
      }
    }
  }

  // ── Classification ────────────────────────────────────────────────────────
  const classPatterns = [
    /classification[:\s]*(freshman|sophomore|junior|senior)/i,
    /year\s*(?:level)?[:\s]*(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth)/i,
  ];
  for (const pat of classPatterns) {
    const m = text.match(pat);
    if (m) {
      result.classification = m[1].trim();
      break;
    }
  }

  return result;
}

module.exports = { extract };
