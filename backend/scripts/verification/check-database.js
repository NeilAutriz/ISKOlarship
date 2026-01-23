// =============================================================================
// Check Database - View actual stored data
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

const checkDatabase = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check the problematic user
    const email1 = 'potangina@up.edu.ph';
    const user1 = await User.findOne({ email: email1 });
    console.log('========================================');
    console.log(`User: ${email1}`);
    console.log('========================================');
    if (user1) {
      console.log('Student Profile:');
      console.log(JSON.stringify(user1.studentProfile, null, 2));
    } else {
      console.log('Not found');
    }

    // Check a working example
    console.log('\n========================================');
    const email2 = 'student4@up.edu.ph';
    const user2 = await User.findOne({ email: email2 });
    console.log(`User: ${email2}`);
    console.log('========================================');
    if (user2) {
      console.log('Student Profile:');
      console.log(JSON.stringify(user2.studentProfile, null, 2));
    } else {
      console.log('Not found');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkDatabase();
