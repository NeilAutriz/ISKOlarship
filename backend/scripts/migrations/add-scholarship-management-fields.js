// =============================================================================
// ISKOlarship - Migration: Add Scholarship Management Fields
// Adds scholarshipLevel, managingCollege, managingDepartment to existing scholarships
// =============================================================================

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolarship';

// Define the Scholarship schema locally for migration
const scholarshipSchema = new mongoose.Schema({
  name: String,
  sponsor: String,
  type: String,
  scholarshipLevel: {
    type: String,
    enum: ['university', 'college', 'department', 'external'],
    default: 'university'
  },
  managingCollege: String,
  managingDepartment: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  eligibilityCriteria: {
    eligibleColleges: [String]
  }
}, { strict: false });

const Scholarship = mongoose.model('Scholarship', scholarshipSchema);

// Sponsor keywords that indicate external scholarships
const EXTERNAL_SPONSORS = [
  'DOST', 'CHED', 'SM Foundation', 'Ayala Foundation', 'PHINMA',
  'Metrobank', 'BPI', 'Globe', 'PLDT', 'San Miguel', 'Jollibee',
  'external', 'private', 'foundation'
];

// Sponsor keywords that indicate university-level
const UNIVERSITY_SPONSORS = [
  'UPLB', 'UP', 'University', 'Chancellor', 'OSA', 'Office of Student Affairs',
  'Office of the Vice Chancellor'
];

/**
 * Determine scholarship level based on existing data
 */
function inferScholarshipLevel(scholarship) {
  const sponsor = (scholarship.sponsor || '').toLowerCase();
  const name = (scholarship.name || '').toLowerCase();
  const type = scholarship.type;

  // Check for external indicators
  if (EXTERNAL_SPONSORS.some(ext => sponsor.includes(ext.toLowerCase()))) {
    return 'external';
  }

  // DOST scholarships are always external
  if (sponsor.includes('dost') || name.includes('dost')) {
    return 'external';
  }

  // Merit-based scholarships from university are typically university-level
  if (type === 'merit' && UNIVERSITY_SPONSORS.some(uni => sponsor.includes(uni.toLowerCase()))) {
    return 'university';
  }

  // If eligibleColleges has only one college, might be college-level
  const eligibleColleges = scholarship.eligibilityCriteria?.eligibleColleges || [];
  if (eligibleColleges.length === 1) {
    return 'college';
  }

  // If no colleges specified or multiple colleges, default to university
  if (eligibleColleges.length === 0 || eligibleColleges.length > 3) {
    return 'university';
  }

  // Default to university for existing scholarships
  return 'university';
}

/**
 * Determine managing college based on existing data
 */
function inferManagingCollege(scholarship, scholarshipLevel) {
  if (scholarshipLevel === 'university' || scholarshipLevel === 'external') {
    return null;
  }

  // Check if sponsor contains a college name
  const sponsor = (scholarship.sponsor || '').toUpperCase();
  const collegeAbbreviations = [
    'CAS', 'CDC', 'CEAT', 'CEM', 'CFNR', 'CHE', 'CAFS',
    'SESAM', 'GCOE', 'UPRHS'
  ];

  for (const abbr of collegeAbbreviations) {
    if (sponsor.includes(abbr)) {
      return abbr;
    }
  }

  // If eligibleColleges has exactly one college, use it
  const eligibleColleges = scholarship.eligibilityCriteria?.eligibleColleges || [];
  if (eligibleColleges.length === 1) {
    return eligibleColleges[0];
  }

  return null;
}

async function runMigration() {
  console.log('='.repeat(60));
  console.log('ISKOlarship - Scholarship Management Fields Migration');
  console.log('='.repeat(60));
  console.log();

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    console.log();

    // Get all scholarships
    const scholarships = await Scholarship.find({}).lean();
    console.log(`📊 Found ${scholarships.length} scholarships to migrate`);
    console.log();

    // Track migration stats
    const stats = {
      university: 0,
      college: 0,
      department: 0,
      external: 0,
      errors: 0,
      skipped: 0
    };

    // Process each scholarship
    for (const scholarship of scholarships) {
      try {
        // Skip if already has scholarshipLevel set (non-default)
        if (scholarship.scholarshipLevel && scholarship.scholarshipLevel !== 'university') {
          console.log(`⏭️  Skipping "${scholarship.name}" - already has level: ${scholarship.scholarshipLevel}`);
          stats.skipped++;
          continue;
        }

        // Infer the scholarship level
        const scholarshipLevel = inferScholarshipLevel(scholarship);
        const managingCollege = inferManagingCollege(scholarship, scholarshipLevel);

        // Update the scholarship
        await Scholarship.updateOne(
          { _id: scholarship._id },
          {
            $set: {
              scholarshipLevel,
              managingCollege,
              managingDepartment: null // Set explicitly to null for now
            }
          }
        );

        stats[scholarshipLevel]++;
        console.log(`✅ Updated "${scholarship.name}"`);
        console.log(`   Level: ${scholarshipLevel}${managingCollege ? `, College: ${managingCollege}` : ''}`);
      } catch (err) {
        console.error(`❌ Error updating "${scholarship.name}":`, err.message);
        stats.errors++;
      }
    }

    // Print summary
    console.log();
    console.log('='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`University Level: ${stats.university}`);
    console.log(`College Level:    ${stats.college}`);
    console.log(`Department Level: ${stats.department}`);
    console.log(`External:         ${stats.external}`);
    console.log(`Skipped:          ${stats.skipped}`);
    console.log(`Errors:           ${stats.errors}`);
    console.log('='.repeat(60));

    console.log();
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the migration
runMigration();
