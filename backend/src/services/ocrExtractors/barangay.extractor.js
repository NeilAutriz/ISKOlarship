// =============================================================================
// ISKOlarship - Barangay Certificate Extractor
// Parses OCR text from barangay certificates
// =============================================================================

/**
 * Extract structured fields from a barangay certificate.
 * @param {string} rawText - Full OCR-extracted text
 * @returns {Object} Extracted fields
 */
function extract(rawText) {
  const result = {};
  const text = rawText || '';

  // ── Name ──────────────────────────────────────────────────────────────────
  // Common header/label words that should NOT be captured as names
  const HEADER_WORDS = /^(BARANGAY|REPUBLIC|PHILIPPINES|OFFICE|PUNONG|CAPTAIN|CHAIRMAN|KAGAWAD|SECRETARY|TREASURER|LUPONG|TANOD|CERTIFICATE|CERTIFICATION|RESIDENCY)/i;
  const namePatterns = [
    // "certify that MR./MS. FIRSTNAME LASTNAME" — Filipino IDs often use this
    /certify\s*that\s+(?:(?:MR|MS|MRS|MX)[.\s]+)?([A-Z][A-Za-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][A-Za-z]+){1,3})/i,
    /(?:mr|ms|mrs|mx)[.\s]+([A-Z][A-Za-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][A-Za-z]+){1,3})/i,
    // ALL-CAPS with Filipino compound names
    /([A-Z]{2,}(?:\s(?:DE\s?LA|DELA|DEL|DE\sLOS|DELOS|SAN|STA))?(?:\s[A-Z]{2,})*,\s*[A-Z][a-z]+(?:\s[A-Z]\.?\s*)?(?:\s[A-Z][a-z]+)*)/,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 5 && !HEADER_WORDS.test(m[1].trim())) {
      result.name = m[1].trim();
      break;
    }
  }

  // ── Address / Barangay ────────────────────────────────────────────────────
  const addressPatterns = [
    /(?:resident|residing)\s*(?:of|at|in)\s*(?:barangay|brgy\.?)\s*([A-Za-z\s]+?)(?:,|\n|$)/i,
    /(?:resident|residing)\s*(?:of|at|in)\s*(.+?)(?:,\s*(?:city|municipality)|\.|\n|$)/i,
    /barangay\s+([A-Za-z\s]+?)(?:,|\n|$)/i,
    /brgy\.?\s*([A-Za-z\s]+?)(?:,|\n|$)/i,
  ];
  for (const pat of addressPatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) {
      result.address = m[1].trim();
      break;
    }
  }

  // ── City / Municipality ───────────────────────────────────────────────────
  const cityPatterns = [
    /(?:city|municipality)\s*(?:of)\s*([A-Za-z\s]+?)(?:,|\n|$)/i,
    /(?:,\s*)((?:city|municipality)\s*(?:of)\s*[A-Za-z\s]+?)(?:,|\n|$)/i,
  ];
  for (const pat of cityPatterns) {
    const m = text.match(pat);
    if (m) {
      result.city = m[1].trim();
      break;
    }
  }

  // ── Province ──────────────────────────────────────────────────────────────
  const provincePatterns = [
    /province\s*(?:of)\s*([A-Za-z\s]+?)(?:,|\n|$)/i,
  ];
  for (const pat of provincePatterns) {
    const m = text.match(pat);
    if (m) {
      result.province = m[1].trim();
      break;
    }
  }

  // Build full address from parts
  const parts = [result.address, result.city, result.province].filter(Boolean);
  if (parts.length > 0) {
    result.address = parts.join(', ');
  }

  return result;
}

module.exports = { extract };
