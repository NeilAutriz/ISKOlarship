/**
 * Restore script: Re-seed historical applications that were accidentally deleted
 * 
 * This script regenerates historical applications for ML training data,
 * WITHOUT deleting any existing applications. It uses the same seed logic
 * from applications-historical.seed.js.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Register all models
    require('../../src/models/index');
    const { Application } = require('../../src/models/Application.model');
    const { Scholarship } = require('../../src/models/Scholarship.model');
    const { User } = require('../../src/models/User.model');

    // Import seed function
    const { seedHistoricalApplications } = require('../../src/seeds/applications-historical.seed');

    // Count existing applications before restore
    const existingCount = await Application.countDocuments();
    console.log(`Existing applications in DB: ${existingCount}`);
    console.log('These will NOT be touched.\n');

    // Re-seed historical applications (50 per scholarship, same as original seed)
    const restoredApps = await seedHistoricalApplications(
      Application,
      Scholarship,
      User,
      50
    );

    // Count total after restore
    const totalAfter = await Application.countDocuments();

    console.log(`\nRestore complete!`);
    console.log(`  Previously existing: ${existingCount}`);
    console.log(`  Newly restored:      ${restoredApps.length}`);
    console.log(`  Total now:           ${totalAfter}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
