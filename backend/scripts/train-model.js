#!/usr/bin/env node
// =============================================================================
// ISKOlarship - Model Training Script
// Trains logistic regression models on historical application data
// =============================================================================

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { trainGlobalModel, trainScholarshipModel, trainAllScholarshipModels, getTrainingStats } = require('../src/services/trainingService/training.service');
const { TrainedModel } = require('../src/models/TrainedModel.model');

// Parse command line arguments
const args = process.argv.slice(2);
const scholarshipId = args.find(a => a.startsWith('--scholarship='))?.split('=')[1];
const trainAll = args.includes('--all');
const showStats = args.includes('--stats');

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ISKOlarship Model Training Script                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolarship';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Show training stats
    if (showStats || !scholarshipId && !trainAll) {
      console.log('📊 Training Statistics:');
      console.log('────────────────────────────────────────────────────────────────');
      
      const stats = await getTrainingStats();
      
      console.log(`   Total Applications with Outcomes: ${stats.totalApplications}`);
      console.log(`   ✅ Approved: ${stats.approvedCount}`);
      console.log(`   ❌ Rejected: ${stats.rejectedCount}`);
      console.log(`   📚 Scholarships with Data: ${stats.scholarshipsWithData}`);
      console.log(`   🎯 Scholarships Trainable (30+ samples): ${stats.scholarshipsWithEnoughData}`);
      console.log(`   🤖 Total Models: ${stats.totalModels}`);
      console.log(`   ✨ Active Models: ${stats.activeModels}`);
      console.log('');
      
      if (showStats) {
        await mongoose.disconnect();
        return;
      }
    }
    
    if (scholarshipId) {
      // Train specific scholarship
      console.log(`🎯 Training model for scholarship: ${scholarshipId}\n`);
      
      const result = await trainScholarshipModel(scholarshipId);
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📈 Training Results:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`   Scholarship: ${result.scholarship.name}`);
      console.log(`   Model ID: ${result.model._id}`);
      console.log(`   Accuracy: ${(result.metrics.accuracy * 100).toFixed(1)}%`);
      console.log(`   Precision: ${(result.metrics.precision * 100).toFixed(1)}%`);
      console.log(`   Recall: ${(result.metrics.recall * 100).toFixed(1)}%`);
      console.log(`   F1 Score: ${(result.metrics.f1Score * 100).toFixed(1)}%`);
      console.log('');
      console.log('📊 Top Feature Importance:');
      const sorted = Object.entries(result.featureImportance)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      sorted.forEach(([feature, importance]) => {
        console.log(`   ${feature}: ${(importance * 100).toFixed(1)}%`);
      });
      
    } else if (trainAll) {
      // Train all scholarships + global
      console.log('🎯 Training Global Model...\n');
      
      const globalResult = await trainGlobalModel();
      
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📈 Global Model Results:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`   Model ID: ${globalResult.model._id}`);
      console.log(`   Accuracy: ${(globalResult.metrics.accuracy * 100).toFixed(1)}%`);
      console.log(`   Precision: ${(globalResult.metrics.precision * 100).toFixed(1)}%`);
      console.log(`   Recall: ${(globalResult.metrics.recall * 100).toFixed(1)}%`);
      console.log(`   F1 Score: ${(globalResult.metrics.f1Score * 100).toFixed(1)}%`);
      console.log('');
      
      console.log('\n🎯 Training Per-Scholarship Models...\n');
      
      const results = await trainAllScholarshipModels();
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📋 Per-Scholarship Training Summary:');
      console.log('═══════════════════════════════════════════════════════════════');
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`\n   ✅ Successfully Trained: ${successful.length}`);
      successful.forEach(r => {
        console.log(`      • ${r.scholarshipName}: ${(r.accuracy * 100).toFixed(1)}% accuracy`);
      });
      
      console.log(`\n   ⚠️  Skipped/Failed: ${failed.length}`);
      failed.forEach(r => {
        console.log(`      • ${r.scholarshipName}: ${r.error}`);
      });
      
    } else {
      // Default: Train global model only
      console.log('🎯 Training Global Model (default)...\n');
      console.log('💡 Tip: Use --all to train all scholarships, or --scholarship=ID for specific one\n');
      
      const result = await trainGlobalModel();
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📈 Global Model Results:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`   Model ID: ${result.model._id}`);
      console.log(`   Accuracy: ${(result.metrics.accuracy * 100).toFixed(1)}%`);
      console.log(`   Precision: ${(result.metrics.precision * 100).toFixed(1)}%`);
      console.log(`   Recall: ${(result.metrics.recall * 100).toFixed(1)}%`);
      console.log(`   F1 Score: ${(result.metrics.f1Score * 100).toFixed(1)}%`);
      console.log('');
      console.log('📊 Learned Weights:');
      Object.entries(result.model.weights).forEach(([feature, weight]) => {
        const bar = '█'.repeat(Math.min(20, Math.abs(weight) * 5));
        const sign = weight >= 0 ? '+' : '';
        console.log(`   ${feature.padEnd(22)} ${sign}${weight.toFixed(2)} ${bar}`);
      });
    }
    
    console.log('\n✅ Training complete!\n');
    
  } catch (error) {
    console.error('\n❌ Training failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
ISKOlarship Model Training Script

Usage:
  node train-model.js [options]

Options:
  --all                    Train global model + all per-scholarship models
  --scholarship=ID         Train model for a specific scholarship
  --stats                  Show training statistics only
  --help, -h               Show this help message

Examples:
  node train-model.js                      # Train global model only
  node train-model.js --all                # Train all models
  node train-model.js --scholarship=abc123 # Train specific scholarship
  node train-model.js --stats              # Show statistics
`);
  process.exit(0);
}

main();
