// =============================================================================
// Check User Profile Script
// View a specific user's profile data to debug
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

const checkUserProfile = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check a specific user (change email as needed)
    const email = 'student1@up.edu.ph';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
    } else {
      console.log('📋 User Profile Data:\n');
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('First Name:', user.firstName);
      console.log('Last Name:', user.lastName);
      console.log('\n📊 Student Profile:');
      console.log(JSON.stringify(user.studentProfile, null, 2));
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkUserProfile();
