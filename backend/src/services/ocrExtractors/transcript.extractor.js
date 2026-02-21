// =============================================================================
// ISKOlarship - Transcript Extractor
// Parses OCR text from UPLB transcripts to extract key fields
// =============================================================================

/**
 * Extract structured fields from a transcript of records.
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
    /cumulative\s*GWA[:\s]*(\d+\.\d+)/i,
    /weighted\s*average[:\s]*(\d+\.\d+)/i,
    /overall\s*average[:\s]*(\d+\.\d+)/i,
    /ave(?:rage)?[:\s]*(\d\.\d{1,4})/i,
  ];
  for (const pat of gwaPatterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseFloat(m[1]);
      // UPLB GWA range is 1.0 (best) to 5.0 (fail)
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
    // UPLB format: "LASTNAME, FIRSTNAME MIDDLENAME"
    /([A-Z]{2,}(?:\s[A-Z]{2,})*,\s*[A-Z][a-z]+(?:\s[A-Z]\.?\s*)?(?:\s[A-Z][a-z]+)?)/,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1].length > 5) {
      result.name = m[1].trim();
      break;
    }
  }

  // ── College ───────────────────────────────────────────────────────────────
  const collegePatterns = [
    /college\s+of\s+([A-Za-z\s&]+?)(?:\n|$|degree)/i,
    /(CAS|CAFS|CEM|CEAT|CDC|CFNR|CHE|CVM|SESAM|Graduate\s*School)/i,
    /college[:\s]+([A-Za-z\s&]+?)(?:\n|$)/i,
  ];
  for (const pat of collegePatterns) {
    const m = text.match(pat);
    if (m) {
      result.college = m[1].trim();
      break;
    }
  }

  // ── Course / Degree ───────────────────────────────────────────────────────
  const coursePatterns = [
    /degree\s*(?:program)?[:\s]+([A-Za-z\s.]+?)(?:\n|$)/i,
    /(?:BS|BA|AB|MS|MA|PhD)\s+([A-Za-z\s]+?)(?:\n|$|major)/i,
    /course[:\s]+([A-Za-z\s.]+?)(?:\n|$)/i,
    /program[:\s]+([A-Za-z\s.]+?)(?:\n|$)/i,
  ];
  for (const pat of coursePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 3) {
      result.course = m[1].trim();
      break;
    }
  }

  return result;
}

module.exports = { extract };
