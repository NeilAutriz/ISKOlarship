// =============================================================================
// ISKOlarship - Master Seed Script
// Runs all seed scripts in the correct order
// =============================================================================

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Scholarship } = require('../models/Scholarship.model');
const { User } = require('../models/User.model');
const { Application } = require('../models/Application.model');

const runAllSeeds = async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     ISKOlarship Database Seeding - Master Script           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Clear all collections
    console.log('════════════════════════════════════════');
    console.log('Step 1: Clearing existing data...');
    console.log('════════════════════════════════════════');
    
    await Application.deleteMany({});
    console.log('   ✓ Applications cleared');
    
    await User.deleteMany({});
    console.log('   ✓ Users cleared');
    
    await Scholarship.deleteMany({});
    console.log('   ✓ Scholarships cleared\n');

    // Step 2: Run individual seed scripts
    console.log('════════════════════════════════════════');
    console.log('Step 2: Running seed scripts...');
    console.log('════════════════════════════════════════\n');

    // Run scholarships seed
    console.log('📚 Seeding Scholarships...');
    const { execSync } = require('child_process');
    execSync('node src/seeds/scholarships.seed.js', { 
      cwd: '/Users/neilautriz/Projects/Autriz_SP/ISKOlarship/backend',
      stdio: 'inherit' 
    });

    // Wait a moment for connection to close
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run users seed
    console.log('\n👥 Seeding Users...');
    execSync('node src/seeds/users.seed.js', { 
      cwd: '/Users/neilautriz/Projects/Autriz_SP/ISKOlarship/backend',
      stdio: 'inherit' 
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run applications seed
    console.log('\n📝 Seeding Applications...');
    execSync('node src/seeds/applications.seed.js', { 
      cwd: '/Users/neilautriz/Projects/Autriz_SP/ISKOlarship/backend',
      stdio: 'inherit' 
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           🎉 ALL SEEDS COMPLETED SUCCESSFULLY! 🎉          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Master seed failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runAllSeeds();
}

module.exports = { runAllSeeds };
