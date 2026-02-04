/**
 * Migration: Fix Scholarship Types
 * 
 * This script updates all scholarships with old lowercase type values
 * to use the new full text format expected by the schema.
 * 
 * Old format: 'university', 'college', 'government', 'private', 'thesis_grant'
 * New format: 'University Scholarship', 'College Scholarship', etc.
 * 
 * Run with: node scripts/migrations/fix-scholarship-types.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Type mapping from old to new format
const typeMapping = {
  'university': 'University Scholarship',
  'college': 'College Scholarship',
  'government': 'Government Scholarship',
  'private': 'Private Scholarship',
  'thesis_grant': 'Thesis/Research Grant',
  'thesis': 'Thesis/Research Grant',
  'research': 'Thesis/Research Grant',
};

// Valid new types
const validTypes = [
  'University Scholarship',
  'College Scholarship',
  'Government Scholarship',
  'Private Scholarship',
  'Thesis/Research Grant'
];

async function migrateScholarshipTypes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolaship';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Access the scholarships collection directly (bypassing schema validation)
    const db = mongoose.connection.db;
    const scholarshipsCollection = db.collection('scholarships');

    // Find all scholarships
    const scholarships = await scholarshipsCollection.find({}).toArray();
    console.log(`\n📊 Found ${scholarships.length} scholarships to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const scholarship of scholarships) {
      const currentType = scholarship.type;
      
      // Check if type needs updating
      if (!currentType) {
        console.log(`⚠️  ${scholarship.name}: No type set, setting to 'University Scholarship'`);
        try {
          await scholarshipsCollection.updateOne(
            { _id: scholarship._id },
            { $set: { type: 'University Scholarship' } }
          );
          updatedCount++;
        } catch (err) {
          console.error(`❌ Error updating ${scholarship.name}:`, err.message);
          errorCount++;
        }
        continue;
      }

      // Check if it's already valid
      if (validTypes.includes(currentType)) {
        console.log(`✅ ${scholarship.name}: Already has valid type '${currentType}'`);
        skippedCount++;
        continue;
      }

      // Check if it needs mapping
      const normalizedType = currentType.toLowerCase().trim();
      const newType = typeMapping[normalizedType];

      if (newType) {
        console.log(`🔄 ${scholarship.name}: Updating '${currentType}' → '${newType}'`);
        try {
          await scholarshipsCollection.updateOne(
            { _id: scholarship._id },
            { $set: { type: newType } }
          );
          updatedCount++;
        } catch (err) {
          console.error(`❌ Error updating ${scholarship.name}:`, err.message);
          errorCount++;
        }
      } else {
        console.log(`⚠️  ${scholarship.name}: Unknown type '${currentType}', setting to 'University Scholarship'`);
        try {
          await scholarshipsCollection.updateOne(
            { _id: scholarship._id },
            { $set: { type: 'University Scholarship' } }
          );
          updatedCount++;
        } catch (err) {
          console.error(`❌ Error updating ${scholarship.name}:`, err.message);
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⏭️  Skipped (already valid): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Verify the fix
    console.log('🔍 Verifying migration...');
    const invalidScholarships = await scholarshipsCollection.find({
      type: { $nin: validTypes }
    }).toArray();

    if (invalidScholarships.length === 0) {
      console.log('✅ All scholarships now have valid type values!');
    } else {
      console.log(`⚠️  ${invalidScholarships.length} scholarships still have invalid types:`);
      invalidScholarships.forEach(s => {
        console.log(`   - ${s.name}: '${s.type}'`);
      });
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateScholarshipTypes();
