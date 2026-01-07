// =============================================================================
// Clear Test Users Script
// Run this to delete test accounts and start fresh
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

const clearTestUsers = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete all test users (you can modify the filter as needed)
    const result = await User.deleteMany({
      email: { 
        $regex: /@(test|example|uplb\.edu\.ph)$/i // Matches test, example, and uplb.edu.ph emails
      }
    });

    console.log(`🗑️  Deleted ${result.deletedCount} test user(s)\n`);

    // Show remaining users (without sensitive data)
    const remainingUsers = await User.find({}, 'email role firstName lastName');
    console.log('📋 Remaining users in database:');
    if (remainingUsers.length === 0) {
      console.log('   (none)');
    } else {
      remainingUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

clearTestUsers();
