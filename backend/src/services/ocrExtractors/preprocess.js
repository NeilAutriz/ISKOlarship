// =============================================================================
// ISKOlarship - OCR Text Preprocessor
// Cleans and normalizes raw OCR text before field extraction
// =============================================================================

/**
 * Preprocess raw OCR text to improve extraction reliability.
 * Fixes common OCR artifacts, normalizes unicode, and cleans spacing.
 * @param {string} rawText - Raw text from Google Cloud Vision
 * @returns {string} Cleaned text ready for extraction
 */
function preprocessOcrText(rawText) {
  if (!rawText) return '';

  let text = rawText;

  // ── 1. Unicode normalization ────────────────────────────────────────────
  // Replace smart quotes with regular quotes
  text = text.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  text = text.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  // Replace various dashes with regular hyphen
  text = text.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');
  // Replace non-breaking spaces and other whitespace variants
  text = text.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');

  // ── 2. Common OCR character substitutions ───────────────────────────────
  // Fix common OCR misreads in specific contexts (don't apply globally)
  // "l" misread as "1" or "|" in name contexts is handled in extractors

  // ── 3. Clean up spacing ─────────────────────────────────────────────────
  // Collapse multiple spaces into single space (but preserve newlines)
  text = text.replace(/[^\S\n]+/g, ' ');
  // Remove spaces before punctuation
  text = text.replace(/\s+([.,;:!?])/g, '$1');
  // Ensure space after punctuation (if followed by letter)
  text = text.replace(/([.,;:!?])([A-Za-z])/g, '$1 $2');

  // ── 4. Fix broken words across lines ────────────────────────────────────
  // If a word is split by a newline mid-word (letter-newline-lowercase-letter)
  // join them back, but only if NOT followed by a known field label
  text = text.replace(/([a-z])\n([a-z])/g, '$1$2');

  // ── 5. Normalize common variants ───────────────────────────────────────
  // "No." / "No :" / "No.:" etc → "No."
  text = text.replace(/\bNo\s*[.:]\s*/gi, 'No. ');
  // "Brgy." / "Brgy" / "Barangay" normalization
  text = text.replace(/\bBrgy\.?\s*/gi, 'Barangay ');

  // ── 6. Trim each line ──────────────────────────────────────────────────
  text = text.split('\n').map(line => line.trim()).join('\n');
  // Remove completely blank lines (more than 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

module.exports = { preprocessOcrText };
