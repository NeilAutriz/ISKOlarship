// =============================================================================
// ISKOlarship - Excel Import Service
// Reads historical application data from Excel and converts to training format
// Excel-First, DB-Override merge strategy:
//   1. Load Excel data first (baseline historical dataset)
//   2. Load DB data second (authoritative, live records)
//   3. DB records replace matching Excel records (dedup by studentNumber + scholarshipName)
// =============================================================================

const ExcelJS = require('exceljs');
const path = require('path');

// Default Excel file path — CSFA historical data
const DEFAULT_EXCEL_PATH = path.join(__dirname, '..', '..', '..', 'ISKOlarship_CSFA_Historical_Data.xlsx');

/**
 * Parse the Historical Applications sheet from the Excel file
 * Returns application-like objects matching the shape used by featureExtraction
 * @param {string} filePath - Path to the Excel file (uses default if not provided)
 * @returns {Promise<Array>} Array of application objects compatible with training pipeline
 */
async function parseExcelHistoricalData(filePath = DEFAULT_EXCEL_PATH) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('Historical Applications');
  if (!sheet) {
    throw new Error('Excel file missing "Historical Applications" sheet');
  }

  // Read header row to build column index map
  const headerRow = sheet.getRow(1);
  const colMap = {};
  headerRow.eachCell((cell, colNumber) => {
    colMap[cell.value] = colNumber;
  });

  // Validate required columns exist
  const requiredColumns = [
    'Scholarship Name', 'Scholarship Type', 'Status',
    'Student Number', 'First Name', 'Last Name', 'GWA',
    'Classification', 'College', 'College Code', 'Course',
    'Annual Family Income (PHP)', 'ST Bracket', 'Units Enrolled',
    'Units Passed', 'Province of Origin', 'Citizenship',
    'Household Size', 'Eligibility %'
  ];

  const missing = requiredColumns.filter(col => !colMap[col]);
  if (missing.length > 0) {
    throw new Error(`Excel file missing required columns: ${missing.join(', ')}`);
  }

  const applications = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const status = getCellValue(row, colMap['Status']);
    if (!status || !['approved', 'rejected'].includes(status.toLowerCase())) return;

    const scholarshipName = getCellValue(row, colMap['Scholarship Name']);
    const studentNumber = getCellValue(row, colMap['Student Number']);
    if (!scholarshipName || !studentNumber) return;

    const app = {
      // Source marker — used for deduplication and tracing
      _source: 'excel',
      _dedupeKey: `${studentNumber}::${scholarshipName}`.toLowerCase(),

      // Fields matching Application.model.js shape for feature extraction
      status: status.toLowerCase(),
      scholarship: null, // Will be resolved during merge
      _scholarshipName: scholarshipName,
      _scholarshipType: getCellValue(row, colMap['Scholarship Type']),

      applicantSnapshot: {
        studentNumber,
        firstName: getCellValue(row, colMap['First Name']) || '',
        lastName: getCellValue(row, colMap['Last Name']) || '',
        gwa: parseNumber(getCellValue(row, colMap['GWA'])),
        classification: getCellValue(row, colMap['Classification']) || '',
        college: getCellValue(row, colMap['College']) || '',
        collegeCode: getCellValue(row, colMap['College Code']) || '',
        course: getCellValue(row, colMap['Course']) || '',
        annualFamilyIncome: parseNumber(getCellValue(row, colMap['Annual Family Income (PHP)'])),
        stBracket: getCellValue(row, colMap['ST Bracket']) || '',
        unitsEnrolled: parseNumber(getCellValue(row, colMap['Units Enrolled'])),
        unitsPassed: parseNumber(getCellValue(row, colMap['Units Passed'])),
        provinceOfOrigin: getCellValue(row, colMap['Province of Origin']) || '',
        citizenship: getCellValue(row, colMap['Citizenship']) || 'Filipino',
        householdSize: parseNumber(getCellValue(row, colMap['Household Size'])),
        hasExistingScholarship: yesNoToBool(getCellValue(row, colMap['Has Existing Scholarship'])),
        hasThesisGrant: yesNoToBool(getCellValue(row, colMap['Has Thesis Grant'])),
        hasApprovedThesisOutline: yesNoToBool(getCellValue(row, colMap['Has Approved Thesis Outline'])),
        hasDisciplinaryAction: yesNoToBool(getCellValue(row, colMap['Has Disciplinary Action'])),
        hasFailingGrade: yesNoToBool(getCellValue(row, colMap['Has Failing Grade']))
      },

      eligibilityPercentage: parseNumber(getCellValue(row, colMap['Eligibility %'])) || 50,

      // Provide a createdAt so applicationTiming can be computed
      createdAt: getCellValue(row, colMap['Submitted Date'])
        ? new Date(getCellValue(row, colMap['Submitted Date']))
        : new Date()
    };

    applications.push(app);
  });

  console.log(`📄 Parsed ${applications.length} historical applications from Excel`);
  return applications;
}

/**
 * Parse the Scholarships sheet to build a name→scholarship map
 * Used to resolve Excel applications to their scholarship criteria
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Map<string, Object>>} Map of lowercase scholarship name → scholarship data
 */
async function parseExcelScholarships(filePath = DEFAULT_EXCEL_PATH) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('Scholarships');
  if (!sheet) {
    throw new Error('Excel file missing "Scholarships" sheet');
  }

  const headerRow = sheet.getRow(1);
  const colMap = {};
  headerRow.eachCell((cell, colNumber) => {
    colMap[cell.value] = colNumber;
  });

  const scholarships = new Map();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const name = getCellValue(row, colMap['Scholarship Name']);
    if (!name) return;

    const eligibleCollegesRaw = getCellValue(row, colMap['Eligible Colleges']) || '';
    const eligibleClassificationsRaw = getCellValue(row, colMap['Eligible Classifications']) || '';

    scholarships.set(name.toLowerCase(), {
      name,
      scholarshipType: getCellValue(row, colMap['Type']) || 'Private Scholarship',
      eligibilityCriteria: {
        maxGWA: parseNumber(getCellValue(row, colMap['Max GWA'])) || undefined,
        maxAnnualFamilyIncome: parseNumber(getCellValue(row, colMap['Max Annual Family Income (PHP)'])) || undefined,
        eligibleColleges: eligibleCollegesRaw === 'All' ? [] : eligibleCollegesRaw.split(',').map(s => s.trim()).filter(Boolean),
        eligibleClassifications: eligibleClassificationsRaw === 'All' ? [] : eligibleClassificationsRaw.split(',').map(s => s.trim()).filter(Boolean)
      },
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      applicationStartDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    });
  });

  console.log(`📄 Parsed ${scholarships.size} scholarships from Excel`);
  return scholarships;
}

/**
 * Merge Excel and DB applications using Excel-First, DB-Override strategy.
 * 1. Excel records loaded first as the baseline historical dataset
 * 2. DB records loaded second — they override matching Excel records (authoritative)
 * 3. Deduplication by composite key: studentNumber::scholarshipName (case-insensitive)
 *
 * Nothing is deleted — Excel-only records stay, DB-only records are added,
 * overlapping records use the DB version.
 *
 * @param {Array} dbApplications - Applications from the database (.populate('scholarship') already called)
 * @param {Array} excelApplications - Applications parsed from Excel
 * @param {Map} excelScholarships - Scholarship data from Excel (for criteria)
 * @param {Map} dbScholarshipsByName - Map of lowercase scholarship name → DB scholarship doc
 * @returns {Object} { merged, stats }
 */
function mergeApplications(dbApplications, excelApplications, excelScholarships, dbScholarshipsByName) {
  // Map of dedupeKey → index in merged array, for O(1) override lookups
  const keyIndex = new Map();
  const merged = [];

  const stats = {
    dbTotal: dbApplications.length,
    excelTotal: excelApplications.length,
    dbUsed: 0,
    excelUsed: 0,
    excelOverriddenByDb: 0,
    excelNoScholarshipMatch: 0
  };

  // Step 1: Load Excel applications first (baseline historical data)
  for (const app of excelApplications) {
    // Resolve scholarship — try DB first (for real criteria), fall back to Excel
    const nameKey = app._scholarshipName.toLowerCase();
    const dbScholarship = dbScholarshipsByName.get(nameKey);
    const excelScholarship = excelScholarships.get(nameKey);

    const scholarship = dbScholarship || excelScholarship;

    if (!scholarship) {
      stats.excelNoScholarshipMatch++;
      continue;
    }

    // Attach the resolved scholarship so featureExtraction can access eligibilityCriteria
    app.scholarship = scholarship;

    const idx = merged.length;
    keyIndex.set(app._dedupeKey, idx);
    merged.push(app);
    stats.excelUsed++;
  }

  // Step 2: Load DB applications — override any matching Excel records, add new ones
  for (const app of dbApplications) {
    const scholarshipName = app.scholarship?.name || '';
    const studentNumber = app.applicantSnapshot?.studentNumber || '';
    const key = `${studentNumber}::${scholarshipName}`.toLowerCase();

    const dbRecord = { ...app, _source: 'database' };

    if (keyIndex.has(key)) {
      // DB overrides the Excel record at the same position
      const existingIdx = keyIndex.get(key);
      merged[existingIdx] = dbRecord;
      stats.excelOverriddenByDb++;
      stats.excelUsed--; // Was counted in step 1, now replaced
    } else {
      // New DB record not in Excel — add it
      keyIndex.set(key, merged.length);
      merged.push(dbRecord);
    }
    stats.dbUsed++;
  }

  console.log(`🔀 Merge complete (Excel-first, DB-override): ${merged.length} total applications`);
  console.log(`   Excel baseline: ${stats.excelUsed} | DB used: ${stats.dbUsed} | DB overrode Excel: ${stats.excelOverriddenByDb}`);
  if (stats.excelNoScholarshipMatch > 0) {
    console.log(`   ⚠️  ${stats.excelNoScholarshipMatch} Excel rows skipped (no matching scholarship)`);
  }

  return { merged, stats };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCellValue(row, colNumber) {
  if (!colNumber) return null;
  const cell = row.getCell(colNumber);
  if (cell.value === null || cell.value === undefined) return null;
  // Handle ExcelJS rich text, formula results, etc.
  if (typeof cell.value === 'object' && cell.value.result !== undefined) return cell.value.result;
  if (typeof cell.value === 'object' && cell.value.richText) {
    return cell.value.richText.map(r => r.text).join('');
  }
  return cell.value;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '' || val === 'N/A') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function yesNoToBool(val) {
  if (val === null || val === undefined) return false;
  return String(val).toLowerCase() === 'yes';
}

module.exports = {
  parseExcelHistoricalData,
  parseExcelScholarships,
  mergeApplications,
  DEFAULT_EXCEL_PATH
};
