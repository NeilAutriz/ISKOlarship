// =============================================================================
// ISKOlarship - Student ID Card Extractor
// Parses OCR text from UPLB student ID cards
// =============================================================================

/**
 * Extract structured fields from a student ID card.
 * UPLB student IDs typically contain: student number, name, college/course,
 * and sometimes a photo (which OCR won't capture).
 * @param {string} rawText - Full OCR-extracted text
 * @returns {Object} Extracted fields
 */
function extract(rawText) {
  const result = {};
  const text = rawText || '';

  // ── Student Number ────────────────────────────────────────────────────────
  // UPLB format: YYYY-NNNNN or YYYYNNNNN (on ID cards, usually hyphenated)
  const studentNumPatterns = [
    /student\s*(?:no|number|#|id)[.:\s]*(\d{4}[-\s]?\d{5,6})/i,
    /(?:id|no)[.:\s]*(\d{4}[-\s]?\d{5,6})/i,
    /(\d{4}-\d{5,6})/,
    // Hyphenless: exactly 9-10 digits starting with 20XX
    /\b(20\d{2}\d{5,6})\b/,
  ];
  for (const pat of studentNumPatterns) {
    const m = text.match(pat);
    if (m) {
      result.studentNumber = m[1].replace(/\s/g, '');
      break;
    }
  }

  // ── Name ──────────────────────────────────────────────────────────────────
  // ID cards often show name in ALL CAPS, sometimes "LAST, FIRST MIDDLE"
  const namePatterns = [
    // "Name: LAST, FIRST MIDDLE" or "Name: FIRST MIDDLE LAST" (single line only)
    /name[:\s]+([A-Za-z][A-Za-z\s.,'-]+?)(?:\n|$)/i,
    // ALL CAPS: "DELA CRUZ, JUAN PEDRO" (multi-word last name with comma separator, single line)
    /([A-Z][A-Z ]{1,}(?:DE(?: LA)?|DEL|DELOS|DELA|SAN|SANTA|STO|STA)?[A-Z ]*,[ ]*[A-Z][A-Za-z .]+?)(?:\n|$)/,
    // ALL CAPS line that looks like a name (2-5 capitalized words, on one line)
    /^([A-Z]{2,}(?: [A-Z]{2,}){1,4})$/m,
    // "LAST, FIRST M." or "LAST, FIRST MIDDLE"
    /([A-Z]{2,}(?:\s[A-Z]{2,})*,\s*[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+)?)/,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 4) {
      const name = m[1].trim();
      // Reject if it's a common header/label
      if (!/^(UNIVERSITY|STUDENT|COLLEGE|REPUBLIC|PHILIPPINES|LOS\s*BANOS)/i.test(name)) {
        result.name = name;
        break;
      }
    }
  }

  // ── College ───────────────────────────────────────────────────────────────
  const collegePatterns = [
    // Direct college code
    /(CAS|CAFS|CEM|CEAT|CDC|CFNR|CHE|CVM|CPAF|SESAM|Graduate\s*School)/i,
    // "College of ..."
    /college\s+of\s+([A-Za-z\s&]+?)(?:\n|$|,)/i,
    /college[:\s]+([^\n]+)/i,
  ];
  for (const pat of collegePatterns) {
    const m = text.match(pat);
    if (m) {
      result.college = (m[1] || m[0]).trim();
      break;
    }
  }

  // ── Course / Degree ───────────────────────────────────────────────────────
  const coursePatterns = [
    /(?:course|program|degree)[:\s]+([A-Za-z\s.]+?)(?:\n|$)/i,
    /(?:BS|BA|AB|MS|MA|PhD)\s+(?:in\s+)?([A-Za-z\s]+?)(?:\n|$)/i,
    // Common UPLB degree abbreviations
    /\b(BS[A-Z]{1,4}|BA[A-Z]{1,4}|AB[A-Z]{1,4})\b/,
  ];
  for (const pat of coursePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) {
      result.course = m[1].trim();
      break;
    }
  }

  return result;
}

module.exports = { extract };
