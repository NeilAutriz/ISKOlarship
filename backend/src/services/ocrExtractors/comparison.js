// =============================================================================
// ISKOlarship - OCR Comparison Engine
// Compares OCR-extracted fields against applicant snapshot data
// =============================================================================

const { UPLBColleges, UPLBDepartments, UniversityUnits } = require('../../models/UPLBStructure');

// Build bidirectional abbreviation → full name lookup tables at module load
// Covers colleges, departments/institutes, and university units
const UPLB_ABBREVIATIONS = {};  // code (lowercase) → full name (lowercase)
const UPLB_FULLNAMES = {};      // full name (lowercase) → code (lowercase)

// Colleges
for (const [code, info] of Object.entries(UPLBColleges)) {
  const lc = code.toLowerCase();
  const fn = info.name.toLowerCase();
  UPLB_ABBREVIATIONS[lc] = fn;
  UPLB_FULLNAMES[fn] = lc;
}

// Departments / Institutes
for (const depts of Object.values(UPLBDepartments)) {
  for (const dept of depts) {
    const lc = dept.code.toLowerCase();
    const fn = dept.name.toLowerCase();
    UPLB_ABBREVIATIONS[lc] = fn;
    UPLB_FULLNAMES[fn] = lc;
  }
}

// University units
for (const unit of UniversityUnits) {
  const lc = unit.code.toLowerCase();
  const fn = unit.name.toLowerCase();
  UPLB_ABBREVIATIONS[lc] = fn;
  UPLB_FULLNAMES[fn] = lc;
}

/**
 * Fuzzy string match using Levenshtein distance + normalization.
 * Returns similarity score 0-1 (1 = exact match).
 */
function fuzzyMatch(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return 0;
  const sa = normalize(a);
  const sb = normalize(b);
  if (sa === sb) return 1;
  // Substring containment counts as strong match
  if (sa.includes(sb) || sb.includes(sa)) return 0.9;
  const dist = levenshtein(sa, sb);
  const maxLen = Math.max(sa.length, sb.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

/**
 * Normalize a string for comparison (lowercase, remove extra spaces/punctuation).
 */
function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[.,;:!\-()'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein edit distance.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Compare a name extracted from a document against profile name.
 * Handles "LAST, FIRST MIDDLE" vs "FIRST MIDDLE LAST" formats.
 */
function compareName(extracted, snapshot) {
  if (!extracted) return null;
  const expectedFull = `${snapshot.firstName || ''} ${snapshot.lastName || ''}`.trim();
  const expectedReversed = `${snapshot.lastName || ''} ${snapshot.firstName || ''}`.trim();
  const expectedLastCommaFirst = `${snapshot.lastName || ''}, ${snapshot.firstName || ''}`.trim();

  const similarities = [
    fuzzyMatch(extracted, expectedFull),
    fuzzyMatch(extracted, expectedReversed),
    fuzzyMatch(extracted, expectedLastCommaFirst),
  ];
  const bestSimilarity = Math.max(...similarities);

  let severity = 'critical';
  if (bestSimilarity >= 0.85) severity = 'verified';
  else if (bestSimilarity >= 0.6) severity = 'warning';

  return {
    field: 'name',
    extracted,
    expected: expectedFull,
    match: bestSimilarity >= 0.85,
    similarity: Math.round(bestSimilarity * 100) / 100,
    severity,
  };
}

/**
 * Compare GWA with tolerance.
 */
function compareGwa(extracted, snapshot) {
  if (extracted === null || extracted === undefined) return null;
  const expected = snapshot.gwa;
  if (!expected) return null;

  const diff = Math.round(Math.abs(extracted - expected) * 10000) / 10000;
  let severity = 'critical';
  if (diff <= 0.05) severity = 'verified';
  else if (diff <= 0.25) severity = 'warning';

  return {
    field: 'gwa',
    extracted,
    expected,
    match: diff <= 0.05,
    difference: Math.round(diff * 100) / 100,
    severity,
  };
}

/**
 * Compare student number (exact, ignoring spaces, hyphens, and dashes).
 * Handles format differences like "202203446" vs "2022-03446".
 */
function compareStudentNumber(extracted, snapshot) {
  if (!extracted) return null;
  const expected = snapshot.studentNumber;
  if (!expected) return null;

  // Strip spaces, hyphens, en-dashes, em-dashes to normalize format
  const strip = (s) => String(s).replace(/[\s\-\u2013\u2014]/g, '');
  const a = strip(extracted);
  const b = strip(expected);
  const match = a === b;

  return {
    field: 'studentNumber',
    extracted,
    expected,
    match,
    severity: match ? 'verified' : 'critical',
  };
}

/**
 * Resolve a UPLB value (code or full name) to both its code and full name.
 * Returns { code, fullName } or null if not found.
 */
function resolveUPLBValue(value) {
  if (!value) return null;
  const lower = normalize(value);
  // Check if it's a known abbreviation/code
  if (UPLB_ABBREVIATIONS[lower]) {
    return { code: lower, fullName: UPLB_ABBREVIATIONS[lower] };
  }
  // Check if it's a known full name
  if (UPLB_FULLNAMES[lower]) {
    return { code: UPLB_FULLNAMES[lower], fullName: lower };
  }
  // Fuzzy match against all full names (handles minor OCR typos)
  for (const [fn, code] of Object.entries(UPLB_FULLNAMES)) {
    if (fuzzyMatch(lower, fn) >= 0.85) {
      return { code, fullName: fn };
    }
  }
  return null;
}

/**
 * Compare college name / code with bidirectional UPLB abbreviation awareness.
 * Handles: OCR "CAS" vs profile "College of Arts and Sciences" (and vice versa),
 * as well as department codes like ICS → Institute of Computer Science.
 */
function compareCollege(extracted, snapshot) {
  if (!extracted) return null;
  const expected = snapshot.college || '';
  if (!expected) return null;

  const extractedLower = normalize(extracted);
  const expectedLower = normalize(expected);

  // 1. Direct fuzzy match (both are the same form)
  if (fuzzyMatch(extractedLower, expectedLower) >= 0.8) {
    return {
      field: 'college',
      extracted,
      expected,
      match: true,
      severity: 'verified',
    };
  }

  // 2. Resolve both values through UPLB lookup tables
  const resolvedExtracted = resolveUPLBValue(extracted);
  const resolvedExpected = resolveUPLBValue(expected);

  let match = false;

  if (resolvedExtracted && resolvedExpected) {
    // Both resolved — compare their canonical codes
    match = resolvedExtracted.code === resolvedExpected.code;
  } else if (resolvedExtracted) {
    // Only extracted resolved — compare its full name against expected
    match = fuzzyMatch(resolvedExtracted.fullName, expectedLower) >= 0.8
         || fuzzyMatch(resolvedExtracted.code, expectedLower) >= 0.8;
  } else if (resolvedExpected) {
    // Only expected resolved — compare extracted against its full name and code
    match = fuzzyMatch(extractedLower, resolvedExpected.fullName) >= 0.8
         || fuzzyMatch(extractedLower, resolvedExpected.code) >= 0.8;
  }

  // 3. Fallback: substring containment (e.g. "arts and sciences" in longer OCR text)
  if (!match) {
    if (resolvedExpected && extractedLower.includes(resolvedExpected.fullName)) match = true;
    if (resolvedExtracted && expectedLower.includes(resolvedExtracted.fullName)) match = true;
  }

  return {
    field: 'college',
    extracted,
    expected,
    match,
    severity: match ? 'verified' : 'warning',
  };
}

/**
 * Compare course/degree program.
 * Also handles UPLB abbreviations (e.g. "BSCS" vs "BS Computer Science").
 */
function compareCourse(extracted, snapshot) {
  if (!extracted) return null;
  const expected = snapshot.course;
  if (!expected) return null;

  const sim = fuzzyMatch(extracted, expected);
  if (sim >= 0.7) {
    return {
      field: 'course',
      extracted,
      expected,
      match: true,
      similarity: Math.round(sim * 100) / 100,
      severity: 'verified',
    };
  }

  // Try UPLB-aware resolution (abbreviation vs full name through the lookup)
  const resolvedExtracted = resolveUPLBValue(extracted);
  const resolvedExpected = resolveUPLBValue(expected);
  let match = false;

  if (resolvedExtracted && resolvedExpected) {
    match = resolvedExtracted.code === resolvedExpected.code;
  } else if (resolvedExtracted) {
    match = fuzzyMatch(resolvedExtracted.fullName, normalize(expected)) >= 0.7;
  } else if (resolvedExpected) {
    match = fuzzyMatch(normalize(extracted), resolvedExpected.fullName) >= 0.7;
  }

  return {
    field: 'course',
    extracted,
    expected,
    match,
    similarity: Math.round(sim * 100) / 100,
    severity: match ? 'verified' : 'warning',
  };
}

/**
 * Compare annual income with 10% tolerance.
 */
function compareIncome(extracted, snapshot) {
  if (extracted === null || extracted === undefined) return null;
  const expected = snapshot.annualFamilyIncome;
  if (!expected) return null;

  const ratio = Math.abs(extracted - expected) / expected;
  let severity = 'critical';
  if (ratio <= 0.10) severity = 'verified';
  else if (ratio <= 0.25) severity = 'warning';

  return {
    field: 'annualFamilyIncome',
    extracted,
    expected,
    match: ratio <= 0.10,
    percentDifference: (ratio * 100).toFixed(1),
    severity,
  };
}

/**
 * Compare address/barangay.
 */
function compareAddress(extracted, snapshot) {
  if (!extracted) return null;
  const addr = snapshot.homeAddress;
  if (!addr) return null;

  const fullExpected = addr.fullAddress || 
    [addr.street, addr.barangay, addr.city, addr.province].filter(Boolean).join(', ');
  const sim = fuzzyMatch(extracted, fullExpected);

  // Also check individual parts
  let partialMatch = false;
  if (addr.barangay && normalize(extracted).includes(normalize(addr.barangay))) partialMatch = true;
  if (addr.city && normalize(extracted).includes(normalize(addr.city))) partialMatch = true;

  const match = sim >= 0.6 || partialMatch;

  return {
    field: 'address',
    extracted,
    expected: fullExpected,
    match,
    similarity: Math.round(sim * 100) / 100,
    severity: match ? 'verified' : 'warning',
  };
}

/**
 * Main comparison function.
 * Routes to appropriate comparators based on extracted fields.
 */
function compareFields(extracted, applicantSnapshot) {
  const results = [];

  if (extracted.name) {
    const r = compareName(extracted.name, applicantSnapshot);
    if (r) results.push(r);
  }
  if (extracted.studentNumber) {
    const r = compareStudentNumber(extracted.studentNumber, applicantSnapshot);
    if (r) results.push(r);
  }
  if (extracted.gwa !== undefined && extracted.gwa !== null) {
    const r = compareGwa(extracted.gwa, applicantSnapshot);
    if (r) results.push(r);
  }
  if (extracted.college) {
    const r = compareCollege(extracted.college, applicantSnapshot);
    if (r) results.push(r);
  }
  if (extracted.course) {
    const r = compareCourse(extracted.course, applicantSnapshot);
    if (r) results.push(r);
  }
  if (extracted.income !== undefined && extracted.income !== null) {
    const r = compareIncome(extracted.income, applicantSnapshot);
    if (r) results.push(r);
  }
  if (extracted.address) {
    const r = compareAddress(extracted.address, applicantSnapshot);
    if (r) results.push(r);
  }

  return results;
}

/**
 * Determine overall match status from individual field results.
 */
function determineOverallMatch(results) {
  if (results.length === 0) return 'unreadable';

  const hasCritical = results.some(r => r.severity === 'critical');
  const hasWarning = results.some(r => r.severity === 'warning');
  const allVerified = results.every(r => r.severity === 'verified');

  if (allVerified) return 'verified';
  if (hasCritical) return 'mismatch';
  if (hasWarning) return 'partial';
  return 'partial';
}

/**
 * Calculate overall confidence from field results.
 */
function calculateConfidence(results) {
  if (results.length === 0) return 0;
  const matchCount = results.filter(r => r.match).length;
  return Math.round((matchCount / results.length) * 100) / 100;
}

module.exports = {
  compareFields,
  determineOverallMatch,
  calculateConfidence,
  compareName,
  compareGwa,
  compareStudentNumber,
  compareCollege,
  compareCourse,
  compareIncome,
  compareAddress,
  fuzzyMatch,
  normalize,
  resolveUPLBValue,
};
