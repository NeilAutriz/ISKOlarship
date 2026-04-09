// =============================================================================
// ISKOlarship - Employee ID Card Extractor
// Parses OCR text from UPLB employee ID cards / proof of employment
// =============================================================================

/**
 * Extract structured fields from an employee ID card or proof of employment.
 * @param {string} rawText - Full OCR-extracted text
 * @returns {Object} Extracted fields
 */
function extract(rawText) {
  const result = {};
  const text = rawText || '';

  // ── Name ──────────────────────────────────────────────────────────────────
  const namePatterns = [
    // "Name: ..." on employee documents
    /name[:\s]+([A-Za-z][A-Za-z\s.,'-]+)/i,
    // "This is to certify that MR./MS./MRS. NAME"
    /(?:certify|certifies)\s+that\s+(?:mr|ms|mrs|mx|prof|dr)[.\s]+([A-Z][A-Za-z\s.,'-]+?)(?:\s+is|\s+has|\s*,)/i,
    // ALL CAPS name with comma: "DELA CRUZ, JUAN PEDRO"
    /([A-Z][A-Z\s]*(?:DE(?:\sLA)?|DEL|DELOS|DELA|SAN|SANTA|STO|STA)?[A-Z\s]*,\s*[A-Z][A-Za-z\s.]+)/,
    // ALL CAPS line (2-4 words)
    /^([A-Z]{2,}(?:\s+[A-Z]{2,}){1,4})$/m,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 4) {
      const name = m[1].trim();
      if (!/^(UNIVERSITY|EMPLOYEE|COLLEGE|REPUBLIC|PHILIPPINES|LOS\s*BANOS|OFFICE|DEPARTMENT)/i.test(name)) {
        result.name = name;
        break;
      }
    }
  }

  // ── Employee Number / ID ──────────────────────────────────────────────────
  const empIdPatterns = [
    /employee\s*(?:no|number|#|id)[.:\s]*([\w\d-]+)/i,
    /(?:emp|staff)\s*(?:no|id)[.:\s]*([\w\d-]+)/i,
  ];
  for (const pat of empIdPatterns) {
    const m = text.match(pat);
    if (m) {
      result.employeeId = m[1].trim();
      break;
    }
  }

  // ── Position / Designation ────────────────────────────────────────────────
  const positionPatterns = [
    /(?:position|designation|rank)[:\s]+([A-Za-z\s]+?)(?:\n|$)/i,
    /(?:as|is\s+a|is\s+an|is\s+the)\s+([A-Za-z\s]+?)(?:\s+(?:of|at|in)\s)/i,
  ];
  for (const pat of positionPatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 3) {
      result.position = m[1].trim();
      break;
    }
  }

  // ── College / Department / Office ────────────────────────────────────────
  const collegePatterns = [
    // Direct college/department code
    /(CAS|CAFS|CEM|CEAT|CDC|CFNR|CHE|CVM|CPAF|SESAM|Graduate\s*School)/i,
    // "College of ..."
    /college\s+of\s+([A-Za-z\s&]+?)(?:\n|$|,)/i,
    // "Department of ..."
    /(?:department|dept|institute|office)\s+(?:of\s+)?([A-Za-z\s&]+?)(?:\n|$|,)/i,
    // Department/Institute codes: ICS, IMSP, etc.
    /\b(ICS|IMSP|INSTAT|IC|IH|DHUM|DBT|DCS|DAEcon|DPSM)\b/i,
  ];
  for (const pat of collegePatterns) {
    const m = text.match(pat);
    if (m) {
      result.college = (m[1] || m[0]).trim();
      break;
    }
  }

  return result;
}

module.exports = { extract };
