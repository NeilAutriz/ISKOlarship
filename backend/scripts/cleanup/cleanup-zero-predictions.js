/**
 * Cleanup script: Remove applications that display as 0% ML prediction
 * 
 * These are applications where prediction data is missing (null/undefined)
 * OR probability is exactly 0. The frontend displays these as "0%".
 * Applications with actual prediction scores (> 0%) are left untouched.
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

    // Find applications that show as 0% in the UI:
    // 1. No prediction field at all
    // 2. prediction is null
    // 3. prediction.probability is 0, null, or missing
    const zeroApps = await Application.find({
      $or: [
        { prediction: { $exists: false } },
        { prediction: null },
        { 'prediction.probability': 0 },
        { 'prediction.probability': null },
        { 'prediction.probability': { $exists: false } }
      ]
    }).lean();

    // Also count apps with actual predictions for safety
    const withPrediction = await Application.countDocuments({
      'prediction.probability': { $gt: 0 }
    });

    console.log(`Applications with actual ML prediction (> 0%): ${withPrediction}`);
    console.log(`Applications showing as 0% (no/null prediction): ${zeroApps.length}\n`);

    if (zeroApps.length === 0) {
      console.log('No applications with 0% ML prediction found. Nothing to clean up.');
      await mongoose.disconnect();
      return;
    }

    // Show a sample of what will be deleted
    const sample = zeroApps.slice(0, 5);
    console.log(`Sample of applications to be deleted (showing up to 5):`);
    console.log('-'.repeat(60));
    for (const app of sample) {
      console.log(`  ID: ${app._id} | Status: ${app.status} | Prediction: ${JSON.stringify(app.prediction?.probability ?? 'none')}`);
    }
    console.log('-'.repeat(60));

    // Delete them
    const ids = zeroApps.map(a => a._id);
    const result = await Application.deleteMany({ _id: { $in: ids } });

    console.log(`\nDeleted ${result.deletedCount} application(s) that displayed as 0% ML prediction.`);
    console.log(`Remaining applications with actual predictions: ${withPrediction}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  } catch (err) {
    console.error('Error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
