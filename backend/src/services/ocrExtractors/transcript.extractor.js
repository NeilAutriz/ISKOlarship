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
    /(20\d{2}\d{5,6})/,  // Hyphenless format: 202203446
  ];
  for (const pat of studentNumPatterns) {
    const m = text.match(pat);
    if (m) {
      result.studentNumber = m[1].replace(/\s/g, '');
      break;
    }
  }

  // ── Name ──────────────────────────────────────────────────────────────────
  // Common UPLB header/label words that are NOT names
  const HEADER_WORDS = /^(UNIVERSITY|PHILIPPINES|LOS\sBAN|UPLB|COLLEGE|INSTITUTE|DEPARTMENT|OFFICE|REGISTRAR|TRANSCRIPT|RECORDS|ACADEMIC|PROGRAM|DEGREE|SEMESTER|CAMPUS)/i;
  const namePatterns = [
    /name[:\s]+([A-Z][A-Za-z]+(?:[,\s]+[A-Z][A-Za-z]+){1,4})/i,
    /student[:\s]+([A-Z][A-Za-z]+(?:[,\s]+[A-Z][A-Za-z]+){1,4})/i,
    // UPLB format: "LASTNAME, FIRSTNAME MIDDLENAME" (with Filipino compounds: DE LA CRUZ, DEL ROSARIO)
    /([A-Z]{2,}(?:\s(?:DE\s?LA|DELA|DEL|DE\sLOS|DELOS|SAN|STA|SANTA|SANTO))?(?:\s[A-Z]{2,})*,\s*[A-Z][a-z]+(?:\s[A-Z]\.?\s*)?(?:\s[A-Z][a-z]+)*)/,
    // ALL CAPS names (2-5 words)
    /^([A-Z]{2,}(?:\s[A-Z]{2,}){1,4})$/m,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1].length > 5 && !HEADER_WORDS.test(m[1].trim())) {
      result.name = m[1].trim();
      break;
    }
  }

  // ── College ───────────────────────────────────────────────────────────────
  const collegePatterns = [
    /college\s+of\s+([A-Za-z\s&]+?)(?:\n|$|degree)/i,
    /(CAS|CAFS|CEM|CEAT|CDC|CFNR|CHE|CVM|CPAF|SESAM|Graduate\s*School)/i,
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
