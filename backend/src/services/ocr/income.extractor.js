// =============================================================================
// ISKOlarship - Income Certificate / Tax Return Extractor
// Parses OCR text from income documents
// =============================================================================

/**
 * Extract structured fields from income certificates or tax returns.
 * @param {string} rawText - Full OCR-extracted text
 * @returns {Object} Extracted fields
 */
function extract(rawText) {
  const result = {};
  const text = rawText || '';

  // ── Name ──────────────────────────────────────────────────────────────────
  const namePatterns = [
    // "certify that MR./MS. FIRSTNAME LASTNAME" or "certify that FIRSTNAME LASTNAME"
    /(?:certify\s*that|name|this\s*is\s*to\s*certify\s*that)\s+(?:(?:MR|MS|MRS|MX)[.\s]+)?([A-Z][A-Za-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][A-Za-z]+){1,3})/i,
    // ALL-CAPS with Filipino compound names: "DELA CRUZ, JUAN PEDRO"
    /([A-Z]{2,}(?:\s(?:DE\s?LA|DELA|DEL|DE\sLOS|DELOS|SAN|STA))?(?:\s[A-Z]{2,})*,\s*[A-Z][a-z]+(?:\s[A-Z]\.?\s*)?(?:\s[A-Z][a-z]+)*)/,
    // Simple "LAST, FIRST" pattern
    /([A-Z]{2,}(?:\s[A-Z]{2,})*,\s*[A-Z][a-z]+(?:\s[A-Z]\.?\s*)?)/,
  ];
  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 5) {
      result.name = m[1].trim();
      break;
    }
  }

  // ── Income Amount ─────────────────────────────────────────────────────────
  // Income patterns ordered from most specific (with income keyword) to least.
  // The final fallback requires the amount to be >= 10,000 to avoid matching page numbers.
  const incomePatterns = [
    /annual\s*(?:family\s*)?income[:\s]*(?:PHP?|₱|Php)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:total|gross|net)\s*(?:family\s*)?income[:\s]*(?:PHP?|₱|Php)?\s*([\d,]+(?:\.\d{2})?)/i,
    /income[:\s]*(?:PHP?|₱|Php)?\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s*(?:year|annum))?/i,
    /(?:PHP?|₱|Php)\s*([\d,]+(?:\.\d{2})?)\s*(?:annual|yearly|per\s*(?:year|annum))/i,
    // Generic PHP amount — require >= 10,000 to avoid matching arbitrary numbers
    /(?:PHP?|₱|Php)\s*([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pat of incomePatterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      // Reasonable annual income range in PHP (raise minimum for last pattern)
      const minVal = pat === incomePatterns[incomePatterns.length - 1] ? 10000 : 1000;
      if (val >= minVal && val <= 50000000) {
        result.income = val;
        break;
      }
    }
  }

  // ── Address ───────────────────────────────────────────────────────────────
  const addressPatterns = [
    /(?:residing|residence|address|resident\s*of)[:\s]*(.+?)(?:\n|$)/i,
    /barangay\s+([A-Za-z\s]+?)(?:,|\n|$)/i,
  ];
  for (const pat of addressPatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 5) {
      result.address = m[1].trim();
      break;
    }
  }

  return result;
}

module.exports = { extract };
