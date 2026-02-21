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
 * Split a full name into individual tokens, lowercased, stripped of punctuation.
 * Handles commas, extra spaces, etc.
 */
function nameTokens(name) {
  if (!name) return [];
  return String(name)
    .toLowerCase()
    .replace(/[.,;:!'"\-()]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean);
}

/**
 * Filipino title/suffix tokens to ignore during comparison.
 */
const NAME_NOISE = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v', 'mr', 'ms', 'mrs', 'dr', 'engr', 'atty']);

/**
 * Multi-word Filipino last-name prefixes.
 * When OCR extracts "DE LA CRUZ", we should treat it as one last-name unit.
 */
const COMPOUND_PREFIXES = ['de la', 'dela', 'del', 'de los', 'delos', 'san', 'sta', 'santa', 'santo', 'van', 'von'];

/**
 * Remove noise tokens (suffixes, titles) from a token list.
 */
function stripNoise(tokens) {
  return tokens.filter(t => !NAME_NOISE.has(t));
}

/**
 * Calculate the percentage of expected name tokens found in the extracted tokens.
 * Uses fuzzyMatch per-token so minor OCR typos are tolerated.
 */
function tokenOverlap(extractedTokens, expectedTokens) {
  if (expectedTokens.length === 0) return 0;
  let matched = 0;
  const used = new Set();
  for (const et of expectedTokens) {
    for (let i = 0; i < extractedTokens.length; i++) {
      if (used.has(i)) continue;
      // Compare token lengths — only fuzzy-match tokens of similar length
      const sim = fuzzyMatch(extractedTokens[i], et);
      if (sim >= 0.8) {
        matched++;
        used.add(i);
        break;
      }
    }
  }
  return matched / expectedTokens.length;
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
 * Handles:
 *  - "LAST, FIRST MIDDLE" vs "FIRST MIDDLE LAST" formats
 *  - Middle names / initials (profile may or may not have one)
 *  - Filipino compound last names (de la Cruz, del Rosario, San Juan, etc.)
 *  - Suffixes (Jr., Sr., III, IV) – ignored during comparison
 *  - Partial matches where OCR only picks up first+last but not middle
 *  - Token-based overlap so word order doesn't matter as much
 */
function compareName(extracted, snapshot) {
  if (!extracted) return null;

  const first = (snapshot.firstName || '').trim();
  const last = (snapshot.lastName || '').trim();
  const middle = (snapshot.middleName || '').trim();

  // Build multiple expected formats to try
  const candidates = [];
  candidates.push(`${first} ${last}`);
  candidates.push(`${last} ${first}`);
  candidates.push(`${last}, ${first}`);
  if (middle) {
    candidates.push(`${first} ${middle} ${last}`);
    candidates.push(`${last}, ${first} ${middle}`);
    candidates.push(`${last} ${first} ${middle}`);
    // Middle initial only
    const mi = middle.charAt(0);
    candidates.push(`${first} ${mi} ${last}`);
    candidates.push(`${first} ${mi}. ${last}`);
    candidates.push(`${last}, ${first} ${mi}.`);
  }

  // 1. Fuzzy match against all candidate strings
  let bestSimilarity = 0;
  for (const c of candidates) {
    const sim = fuzzyMatch(extracted, c);
    if (sim > bestSimilarity) bestSimilarity = sim;
  }

  // 2. Token-based overlap — handles OCR word-order scrambles
  const extTokens = stripNoise(nameTokens(extracted));
  const expTokensFull = stripNoise(nameTokens(
    middle ? `${first} ${middle} ${last}` : `${first} ${last}`
  ));
  const expTokensShort = stripNoise(nameTokens(`${first} ${last}`));

  const overlapFull = tokenOverlap(extTokens, expTokensFull);
  const overlapShort = tokenOverlap(extTokens, expTokensShort);
  const bestOverlap = Math.max(overlapFull, overlapShort);

  // Use the better of fuzzy-string and token-overlap approaches
  // Token overlap of 1.0 (all expected tokens found) → treat as 0.95 similarity
  const tokenSim = bestOverlap * 0.95;
  bestSimilarity = Math.max(bestSimilarity, tokenSim);

  let severity = 'critical';
  if (bestSimilarity >= 0.80) severity = 'verified';
  else if (bestSimilarity >= 0.55) severity = 'warning';

  return {
    field: 'name',
    extracted,
    expected: middle ? `${first} ${middle} ${last}` : `${first} ${last}`,
    match: bestSimilarity >= 0.80,
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
 * Compare employee number (exact after stripping spaces/hyphens).
 */
function compareEmployeeNumber(extracted, snapshot) {
  if (!extracted) return null;
  const expected = snapshot.employeeNumber;
  if (!expected) return null;
  const strip = (s) => String(s).replace(/[\s\-\u2013\u2014]/g, '');
  const a = strip(extracted);
  const b = strip(expected);
  const match = a === b;
  return {
    field: 'employeeNumber',
    extracted,
    expected,
    match,
    severity: match ? 'verified' : 'critical',
  };
}

/**
 * Compare position/designation.
 */
function comparePosition(extracted, snapshot) {
  if (!extracted) return null;
  const expected = snapshot.position || snapshot.designation;
  if (!expected) return null;
  const sim = fuzzyMatch(extracted, expected);
  const match = sim >= 0.7;
  return {
    field: 'position',
    extracted,
    expected,
    match,
    similarity: Math.round(sim * 100) / 100,
    severity: match ? 'verified' : 'warning',
  };
}

/**
 * Compare department.
 */
function compareDepartment(extracted, snapshot) {
  if (!extracted) return null;
  const expected = snapshot.department || snapshot.college;
  if (!expected) return null;

  // Try direct fuzzy match first
  const sim = fuzzyMatch(extracted, expected);
  if (sim >= 0.8) {
    return { field: 'department', extracted, expected, match: true, severity: 'verified' };
  }

  // Try UPLB abbreviation resolution
  const resolvedExtracted = resolveUPLBValue(extracted);
  const resolvedExpected = resolveUPLBValue(expected);
  let match = false;

  if (resolvedExtracted && resolvedExpected) {
    match = resolvedExtracted.code === resolvedExpected.code;
  } else if (resolvedExtracted) {
    match = fuzzyMatch(resolvedExtracted.fullName, normalize(expected)) >= 0.8;
  } else if (resolvedExpected) {
    match = fuzzyMatch(normalize(extracted), resolvedExpected.fullName) >= 0.8;
  }

  return {
    field: 'department',
    extracted,
    expected,
    match,
    severity: match ? 'verified' : 'warning',
  };
}

/**
 * Main comparison function.
 * Routes to appropriate comparators based on extracted fields.
 * Also does a raw-text scan for any profile fields that extractors missed.
 * @param {Object} extracted - Fields extracted by the type-specific extractor
 * @param {Object} applicantSnapshot - Profile data to compare against
 * @param {string} [rawText] - Optional raw OCR text for fallback scanning
 */
function compareFields(extracted, applicantSnapshot, rawText) {
  const results = [];
  const coveredFields = new Set();

  if (extracted.name) {
    const r = compareName(extracted.name, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('name'); }
  }
  if (extracted.studentNumber) {
    const r = compareStudentNumber(extracted.studentNumber, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('studentNumber'); }
  }
  if (extracted.gwa !== undefined && extracted.gwa !== null) {
    const r = compareGwa(extracted.gwa, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('gwa'); }
  }
  if (extracted.college) {
    const r = compareCollege(extracted.college, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('college'); }
  }
  if (extracted.course) {
    const r = compareCourse(extracted.course, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('course'); }
  }
  if (extracted.income !== undefined && extracted.income !== null) {
    const r = compareIncome(extracted.income, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('annualFamilyIncome'); }
  }
  if (extracted.address) {
    const r = compareAddress(extracted.address, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('address'); }
  }
  if (extracted.employeeNumber) {
    const r = compareEmployeeNumber(extracted.employeeNumber, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('employeeNumber'); }
  }
  if (extracted.position) {
    const r = comparePosition(extracted.position, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('position'); }
  }
  if (extracted.department) {
    const r = compareDepartment(extracted.department, applicantSnapshot);
    if (r) { results.push(r); coveredFields.add('department'); }
  }

  // ── Raw-text fallback scanning ──────────────────────────────────────────
  // For any profile field not yet covered, scan the raw OCR text directly
  if (rawText) {
    const normalizedRaw = normalize(rawText);
    const rawLower = rawText.toLowerCase();

    // Name: scan raw text for profile name tokens
    if (!coveredFields.has('name') && (applicantSnapshot.firstName || applicantSnapshot.lastName)) {
      const fullName = `${applicantSnapshot.firstName || ''} ${applicantSnapshot.lastName || ''}`.trim();
      if (fullName.length > 2) {
        const firstLower = (applicantSnapshot.firstName || '').toLowerCase();
        const lastLower = (applicantSnapshot.lastName || '').toLowerCase();
        const foundFirst = firstLower && rawLower.includes(firstLower);
        const foundLast = lastLower && rawLower.includes(lastLower);
        if (foundFirst && foundLast) {
          results.push({ field: 'name', extracted: '(found in text)', expected: fullName, match: true, similarity: 0.85, severity: 'verified' });
        } else if (foundFirst || foundLast) {
          results.push({ field: 'name', extracted: `(partial: ${foundFirst ? 'first' : 'last'} name found)`, expected: fullName, match: false, similarity: 0.5, severity: 'warning' });
        } else {
          results.push({ field: 'name', extracted: '(not found)', expected: fullName, match: false, similarity: 0, severity: 'info' });
        }
        coveredFields.add('name');
      }
    }

    // Student Number
    if (!coveredFields.has('studentNumber') && applicantSnapshot.studentNumber) {
      const stripped = applicantSnapshot.studentNumber.replace(/[\s\-]/g, '');
      const found = normalizedRaw.includes(stripped) || normalizedRaw.includes(applicantSnapshot.studentNumber.toLowerCase());
      results.push({
        field: 'studentNumber',
        extracted: found ? '(found in text)' : '(not found)',
        expected: applicantSnapshot.studentNumber,
        match: found,
        severity: found ? 'verified' : 'info',
      });
      coveredFields.add('studentNumber');
    }

    // College
    if (!coveredFields.has('college') && applicantSnapshot.college) {
      const resolved = resolveUPLBValue(applicantSnapshot.college);
      const collegeLower = normalize(applicantSnapshot.college);
      let found = normalizedRaw.includes(collegeLower);
      if (!found && resolved) {
        found = normalizedRaw.includes(resolved.code) || normalizedRaw.includes(resolved.fullName);
      }
      if (!found && applicantSnapshot.collegeCode) {
        found = rawLower.includes(applicantSnapshot.collegeCode.toLowerCase());
      }
      results.push({
        field: 'college',
        extracted: found ? '(found in text)' : '(not found)',
        expected: applicantSnapshot.college,
        match: found,
        severity: found ? 'verified' : 'info',
      });
      coveredFields.add('college');
    }

    // Course
    if (!coveredFields.has('course') && applicantSnapshot.course) {
      const courseLower = normalize(applicantSnapshot.course);
      const found = normalizedRaw.includes(courseLower) || 
        courseLower.split(' ').filter(w => w.length > 2).every(w => normalizedRaw.includes(w));
      results.push({
        field: 'course',
        extracted: found ? '(found in text)' : '(not found)',
        expected: applicantSnapshot.course,
        match: found,
        severity: found ? 'verified' : 'info',
      });
      coveredFields.add('course');
    }

    // GWA
    if (!coveredFields.has('gwa') && applicantSnapshot.gwa) {
      const gwaStr = String(applicantSnapshot.gwa);
      const found = normalizedRaw.includes(gwaStr);
      results.push({
        field: 'gwa',
        extracted: found ? '(found in text)' : '(not found)',
        expected: applicantSnapshot.gwa,
        match: found,
        severity: found ? 'verified' : 'info',
      });
      coveredFields.add('gwa');
    }

    // Address
    if (!coveredFields.has('address') && applicantSnapshot.homeAddress) {
      const addr = applicantSnapshot.homeAddress;
      const fullAddr = addr.fullAddress || [addr.street, addr.barangay, addr.city, addr.province].filter(Boolean).join(', ');
      if (fullAddr) {
        let found = false;
        if (addr.barangay && normalizedRaw.includes(normalize(addr.barangay))) found = true;
        if (addr.city && normalizedRaw.includes(normalize(addr.city))) found = true;
        if (addr.province && normalizedRaw.includes(normalize(addr.province))) found = true;
        results.push({
          field: 'address',
          extracted: found ? '(partial match in text)' : '(not found)',
          expected: fullAddr,
          match: found,
          severity: found ? 'verified' : 'info',
        });
        coveredFields.add('address');
      }
    }

    // Position (admin)
    if (!coveredFields.has('position') && applicantSnapshot.position) {
      const found = normalizedRaw.includes(normalize(applicantSnapshot.position));
      results.push({
        field: 'position',
        extracted: found ? '(found in text)' : '(not found)',
        expected: applicantSnapshot.position,
        match: found,
        severity: found ? 'verified' : 'info',
      });
      coveredFields.add('position');
    }

    // Department / Academic Unit
    if (!coveredFields.has('department') && (applicantSnapshot.department || applicantSnapshot.academicUnit)) {
      const dept = applicantSnapshot.department || applicantSnapshot.academicUnit;
      const resolved = resolveUPLBValue(dept);
      let found = normalizedRaw.includes(normalize(dept));
      if (!found && resolved) {
        found = normalizedRaw.includes(resolved.code) || normalizedRaw.includes(resolved.fullName);
      }
      results.push({
        field: 'department',
        extracted: found ? '(found in text)' : '(not found)',
        expected: dept,
        match: found,
        severity: found ? 'verified' : 'info',
      });
      coveredFields.add('department');
    }
  }

  return results;
}

/**
 * Determine overall match status from individual field results.
 * 'info' severity fields (not found in document) are excluded from pass/fail.
 */
function determineOverallMatch(results) {
  if (results.length === 0) return 'unreadable';

  // Filter out 'info' fields (not found) — they're informational, not pass/fail
  const actionable = results.filter(r => r.severity !== 'info');
  if (actionable.length === 0) return 'unreadable';

  const hasCritical = actionable.some(r => r.severity === 'critical');
  const hasWarning = actionable.some(r => r.severity === 'warning');
  const allVerified = actionable.every(r => r.severity === 'verified');

  if (allVerified) return 'verified';
  if (hasCritical) return 'mismatch';
  if (hasWarning) return 'partial';
  return 'partial';
}

/**
 * Calculate overall confidence from field results.
 * 'info' severity fields are excluded from the calculation.
 */
function calculateConfidence(results) {
  if (results.length === 0) return 0;
  const actionable = results.filter(r => r.severity !== 'info');
  if (actionable.length === 0) return 0;
  const matchCount = actionable.filter(r => r.match).length;
  return Math.round((matchCount / actionable.length) * 100) / 100;
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
  compareEmployeeNumber,
  comparePosition,
  compareDepartment,
  fuzzyMatch,
  normalize,
  resolveUPLBValue,
  tokenOverlap,
  nameTokens,
  stripNoise,
};
