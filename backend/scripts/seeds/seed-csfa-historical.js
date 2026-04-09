#!/usr/bin/env node
// =============================================================================
// Seed Historical Applications for 21 CSFA Scholarships
// Generates 50 applications per scholarship with realistic approval/rejection
// patterns, then trains per-scholarship (local) ML models for each.
// =============================================================================

const mongoose = require('mongoose');
const path = require('path');

// Load models
const { Application } = require('../../src/models');
const { Scholarship } = require('../../src/models/Scholarship.model');
const { TrainedModel } = require('../../src/models/TrainedModel.model');
const { User } = require('../../src/models/User.model');

// Load seed helpers
const {
  generateApplicationsForScholarship
} = require('../../src/seeds/applications-historical.seed');

// Load training service
const trainingService = require('../../src/services/trainingService');
const { clearModelWeightsCache } = require('../../src/services/logisticRegressionCore/logisticRegression.service');

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb+srv://mgautriz_db_user:lrqPwYlyjyxZcfgy@iskolarship-cluster.nnsosid.mongodb.net/iskolaship?retryWrites=true&w=majority&appName=ISKOlarship-Cluster';

const MIN_APPS = 30;
const MAX_APPS = 40;

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  CSFA Historical Applications Seeder + Model Trainer');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas\n');

  // ── Step 1: Find all 21 CSFA scholarships ──────────────────────────────
  const csfaScholarships = await Scholarship.find({ tags: 'csfa' }).lean();
  console.log(`📚 Found ${csfaScholarships.length} CSFA scholarships\n`);

  if (csfaScholarships.length === 0) {
    console.log('❌ No CSFA scholarships found. Exiting.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Get an admin user for statusHistory.changedBy
  const admin = await User.findOne({ role: 'admin' }).lean();
  const adminId = admin?._id || new mongoose.Types.ObjectId();

  // ── Step 2: Remove any existing historical apps for CSFA scholarships ──
  const csfaIds = csfaScholarships.map(s => s._id);

  const existingCount = await Application.countDocuments({
    scholarship: { $in: csfaIds }
  });

  if (existingCount > 0) {
    console.log(`🗑️  Removing ${existingCount} existing applications for CSFA scholarships...`);
    await Application.deleteMany({ scholarship: { $in: csfaIds } });
    console.log('   Done.\n');
  }

  // ── Step 3: Generate & insert historical applications ──────────────────
  let totalInserted = 0;
  const scholarshipSummaries = [];

  for (const scholarship of csfaScholarships) {
    const numApps = MIN_APPS + Math.floor(Math.random() * (MAX_APPS - MIN_APPS + 1));
    const apps = generateApplicationsForScholarship(scholarship, numApps);

    // Set proper admin references in statusHistory
    apps.forEach(app => {
      app.statusHistory.forEach(sh => {
        sh.changedBy = adminId;
      });
    });

    const inserted = await Application.insertMany(apps, { ordered: false });

    const approved = apps.filter(a => a.status === 'approved').length;
    const rejected = apps.filter(a => a.status === 'rejected').length;

    console.log(`   🎯 ${scholarship.name}`);
    console.log(`      Type: ${scholarship.scholarshipType || scholarship.type}`);
    console.log(`      ✅ Approved: ${approved} | ❌ Rejected: ${rejected}`);

    scholarshipSummaries.push({
      id: scholarship._id,
      name: scholarship.name,
      type: scholarship.scholarshipType || scholarship.type,
      approved,
      rejected,
      total: inserted.length
    });

    totalInserted += inserted.length;
  }

  console.log(`\n✅ Inserted ${totalInserted} historical applications across ${csfaScholarships.length} scholarships\n`);

  // ── Step 4: Train per-scholarship (local) models ───────────────────────
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  Training Per-Scholarship ML Models');
  console.log('════════════════════════════════════════════════════════════════\n');

  let trainedCount = 0;
  let failedCount = 0;

  for (const summary of scholarshipSummaries) {
    try {
      const result = await trainingService.trainScholarshipModel(
        summary.id.toString(),
        adminId?.toString() || null
      );

      const metrics = result.metrics || {};
      console.log(`   ✅ ${summary.name}`);
      console.log(`      Accuracy: ${((metrics.accuracy || 0) * 100).toFixed(1)}%`);
      console.log(`      Precision: ${((metrics.precision || 0) * 100).toFixed(1)}%`);
      console.log(`      Recall: ${((metrics.recall || 0) * 100).toFixed(1)}%`);
      console.log(`      F1: ${((metrics.f1Score || 0) * 100).toFixed(1)}%`);
      trainedCount++;
    } catch (err) {
      console.log(`   ❌ ${summary.name}: ${err.message}`);
      failedCount++;
    }
  }

  // Clear model cache to ensure fresh predictions
  clearModelWeightsCache();

  // ── Step 5: Also retrain the global model with all new data ────────────
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  Retraining Global Model (with new CSFA data included)');
  console.log('════════════════════════════════════════════════════════════════\n');

  try {
    const globalResult = await trainingService.trainGlobalModel(adminId?.toString() || null);
    const gm = globalResult.metrics || {};
    console.log(`   ✅ Global Model Retrained`);
    console.log(`      Accuracy: ${((gm.accuracy || 0) * 100).toFixed(1)}%`);
    console.log(`      Precision: ${((gm.precision || 0) * 100).toFixed(1)}%`);
    console.log(`      Recall: ${((gm.recall || 0) * 100).toFixed(1)}%`);
    console.log(`      F1: ${((gm.f1Score || 0) * 100).toFixed(1)}%`);
  } catch (err) {
    console.log(`   ❌ Global model training failed: ${err.message}`);
  }

  clearModelWeightsCache();

  // ── Step 6: Verification ───────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  Verification');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Count total applications
  const totalApps = await Application.countDocuments({
    scholarship: { $in: csfaIds },
    status: { $in: ['approved', 'rejected'] }
  });
  console.log(`📊 Total CSFA historical applications: ${totalApps}`);

  // Count trained models
  const activeModels = await TrainedModel.countDocuments({
    scholarshipId: { $in: csfaIds },
    modelType: 'scholarship_specific',
    isActive: true
  });
  console.log(`🤖 Active CSFA per-scholarship models: ${activeModels}`);

  // Global model
  const globalModel = await TrainedModel.findOne({
    modelType: 'global',
    isActive: true
  });
  console.log(`🌍 Active global model: ${globalModel ? 'Yes' : 'No'}`);

  // Summary
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  CSFA Scholarships:       ${csfaScholarships.length}`);
  console.log(`  Applications seeded:     ${totalInserted}`);
  console.log(`  Models trained:          ${trainedCount}`);
  console.log(`  Models failed:           ${failedCount}`);
  console.log(`  Per-scholarship models:  ${activeModels} active`);
  console.log(`  Global model:            ${globalModel ? 'active' : 'missing'}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB. Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  mongoose.disconnect().then(() => process.exit(1));
});
