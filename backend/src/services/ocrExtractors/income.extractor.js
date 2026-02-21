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
    /(?:name|certify\s*that|this\s*is\s*to\s*certify\s*that)\s+([A-Z][A-Za-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][A-Za-z]+){1,2})/i,
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
  const incomePatterns = [
    /annual\s*(?:family\s*)?income[:\s]*(?:PHP?|₱|Php)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:total|gross|net)\s*(?:family\s*)?income[:\s]*(?:PHP?|₱|Php)?\s*([\d,]+(?:\.\d{2})?)/i,
    /income[:\s]*(?:PHP?|₱|Php)?\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s*(?:year|annum))?/i,
    /(?:PHP?|₱|Php)\s*([\d,]+(?:\.\d{2})?)\s*(?:annual|yearly|per\s*(?:year|annum))/i,
    /(?:PHP?|₱|Php)\s*([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pat of incomePatterns) {
    const m = text.match(pat);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      // Reasonable annual income range in PHP
      if (val >= 1000 && val <= 50000000) {
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
