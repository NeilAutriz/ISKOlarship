// =============================================================================
// ISKOlarship - Master Seed Script
// Runs all seed scripts in the correct order
// Based on ERD from research paper
// =============================================================================

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import Models
const { Scholarship } = require('../models/Scholarship.model');
const { User } = require('../models/User.model');
const { Application } = require('../models/Application.model');

// Import Seed Functions
const { seedUsers } = require('./users.seed');
const { seedScholarships } = require('./scholarships.seed');
const { seedApplications, generateTrainingData } = require('./applications.seed');
const { seedComprehensiveApplications, generateTrainingData: generateComprehensiveTrainingData } = require('./applications-comprehensive.seed');

// Import Logistic Regression Service for training
const logisticRegression = require('../services/logisticRegression.service');

// =============================================================================
// Main Seed Function
// =============================================================================

const runAllSeeds = async () => {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║        ISKOlarship Database Seeding - Master Script            ║');
  console.log('║        Based on ERD from Research Paper                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolarship';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // =========================================================================
    // Step 1: Seed Users (Admin + Students)
    // =========================================================================
    console.log('════════════════════════════════════════════════════════════════');
    console.log('Step 1: Seeding Users');
    console.log('════════════════════════════════════════════════════════════════');
    
    const { adminUser, studentUsers, allUsers } = await seedUsers(User);
    console.log(`   ✅ Created ${allUsers.length} users\n`);

    // =========================================================================
    // Step 2: Seed Scholarships (Realistic with proper scoping)
    // =========================================================================
    console.log('════════════════════════════════════════════════════════════════');
    console.log('Step 2: Seeding Scholarships (Realistic with Scoping)');
    console.log('════════════════════════════════════════════════════════════════');
    
    const scholarships = await seedScholarships(Scholarship, adminUser._id, {
      useRealistic: true,      // Jollibee, Globe, PLDT, SM, Ayala, etc.
      useComprehensive: false, // Skip old comprehensive data
      includeLegacy: false,    // Skip old legacy scholarships
      includeScoped: false     // Skip old scoped scholarships (realistic already has scoping)
    });
    console.log(`   ✅ Created ${scholarships.length} scholarships\n`);

    // List created scholarships by level
    const scholarshipsByLevel = scholarships.reduce((acc, s) => {
      const level = s.scholarshipLevel || 'university';
      if (!acc[level]) acc[level] = [];
      acc[level].push(s.name);
      return acc;
    }, {});
    
    console.log('   📚 Scholarships by Level:');
    Object.entries(scholarshipsByLevel).forEach(([level, names]) => {
      console.log(`      ${level.toUpperCase()}: ${names.length} scholarships`);
    });
    console.log('');

    // =========================================================================
    // Step 3: Seed Comprehensive Applications (Proper format)
    // =========================================================================
    console.log('════════════════════════════════════════════════════════════════');
    console.log('Step 3: Seeding Comprehensive Applications');
    console.log('════════════════════════════════════════════════════════════════');
    
    const applications = await seedComprehensiveApplications(
      Application, 
      studentUsers, 
      scholarships,
      allUsers.filter(u => u.role === 'admin')
    );
    console.log(`   ✅ Created ${applications.length} applications\n`);

    // =========================================================================
    // Step 4: Generate Training Data Summary
    // =========================================================================
    console.log('════════════════════════════════════════════════════════════════');
    console.log('Step 4: Training Data Summary for Logistic Regression');
    console.log('════════════════════════════════════════════════════════════════');
    
    const trainingData = generateComprehensiveTrainingData(applications);
    const approvedCount = trainingData.filter(d => d.label === 1).length;
    const rejectedCount = trainingData.filter(d => d.label === 0).length;
    
    console.log(`   📊 Total Training Samples: ${trainingData.length}`);
    console.log(`   ✅ Approved: ${approvedCount} (${((approvedCount/trainingData.length)*100).toFixed(1)}%)`);
    console.log(`   ❌ Rejected: ${rejectedCount} (${((rejectedCount/trainingData.length)*100).toFixed(1)}%)`);
    console.log('');

    // =========================================================================
    // Step 5: Seed Historical Applications for Model Training
    // =========================================================================
    console.log('════════════════════════════════════════════════════════════════');
    console.log('Step 5: Seeding Historical Applications for Model Training');
    console.log('════════════════════════════════════════════════════════════════');
    
    const { seedHistoricalApplications } = require('./applications-historical.seed');
    const historicalApplications = await seedHistoricalApplications(
      Application, 
      Scholarship, 
      User,
      50 // 50 applications per scholarship
    );
    console.log(`   ✅ Created ${historicalApplications.length} historical applications`);
    console.log('');

    // =========================================================================
    // Step 6: Train Logistic Regression Model
    // =========================================================================
    console.log('════════════════════════════════════════════════════════════════');
    console.log('Step 6: Training Logistic Regression Model');
    console.log('════════════════════════════════════════════════════════════════');
    
    const trainingResult = await logisticRegression.trainModel();
    
    if (trainingResult.success) {
      console.log(`   ✅ Model trained successfully!`);
      console.log(`   📊 Training samples: ${trainingResult.model.trainingSize}`);
      console.log(`   🎯 Accuracy: ${(trainingResult.model.metrics.accuracy * 100).toFixed(2)}%`);
      console.log(`   📈 Precision: ${(trainingResult.model.metrics.precision * 100).toFixed(2)}%`);
      console.log(`   📉 Recall: ${(trainingResult.model.metrics.recall * 100).toFixed(2)}%`);
      console.log(`   ⚖️  F1 Score: ${trainingResult.model.metrics.f1Score.toFixed(4)}`);
    } else {
      console.log(`   ⚠️  Model training skipped: ${trainingResult.message}`);
      console.log(`   📋 Using default weights based on domain knowledge`);
    }
    console.log('');

    // =========================================================================
    // Final Summary
    // =========================================================================
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║              🎉 DATABASE SEEDING COMPLETE! 🎉                  ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Users:              ${allUsers.length.toString().padStart(4)} (${studentUsers.length} students, ${allUsers.length - studentUsers.length} admins)      ║`);
    console.log(`║  Scholarships:       ${scholarships.length.toString().padStart(4)} (Realistic with proper scoping)     ║`);
    console.log(`║  Applications:       ${applications.length.toString().padStart(4)} (Comprehensive format)              ║`);
    console.log(`║  Historical Data:    ${historicalApplications.length.toString().padStart(4)} (For ML training)               ║`);
    console.log(`║  Training Samples:   ${trainingData.length.toString().padStart(4)} samples for ML                     ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Test Credentials:');
    console.log('   Admin (University): admin@iskolarship.uplb.edu.ph / password123');
    console.log('   Admin (College):    cas.admin@iskolarship.uplb.edu.ph / password123');
    console.log('   Admin (Academic):   ics.admin@iskolarship.uplb.edu.ph / password123');
    console.log('   Student:            student1@up.edu.ph / password123');
    console.log('');
    
    console.log('🤖 To train models with the new historical data, run:');
    console.log('   node scripts/train-model.js --all');
    console.log('');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// =============================================================================
// Run Script
// =============================================================================

if (require.main === module) {
  runAllSeeds()
    .then(() => {
      console.log('\n✅ Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = { 
  runAllSeeds,
  seedUsers,
  seedScholarships,
  seedApplications,
  seedComprehensiveApplications,
  generateTrainingData,
  generateComprehensiveTrainingData
};
