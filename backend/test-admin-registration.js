// Test admin registration to verify no studentProfile is saved
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');
const bcrypt = require('bcryptjs');

async function testAdminRegistration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Create a test admin user
    const testEmail = `test-admin-${Date.now()}@up.edu.ph`;
    
    console.log('📝 Creating new admin user:', testEmail);
    
    const userData = {
      email: testEmail,
      password: 'TestPassword123',
      role: 'admin'
    };
    
    // Explicitly only set adminProfile
    userData.adminProfile = {
      firstName: 'Test',
      middleName: 'Admin',
      lastName: 'User',
      department: 'Test Department',
      position: 'Test Position'
    };
    
    // DO NOT set studentProfile
    console.log('userData before save:', JSON.stringify(userData, null, 2));
    
    const user = new User(userData);
    
    console.log('\n🔍 User object before save:');
    console.log('  Has studentProfile:', !!user.studentProfile);
    console.log('  Has adminProfile:', !!user.adminProfile);
    
    await user.save();
    console.log('\n✅ User saved\n');
    
    // Fetch directly from database to verify
    const savedUser = await User.findById(user._id).lean();
    
    console.log('🔍 Checking what was actually saved to MongoDB:');
    console.log('  Email:', savedUser.email);
    console.log('  Role:', savedUser.role);
    console.log('  Has studentProfile in DB:', !!savedUser.studentProfile);
    console.log('  Has adminProfile in DB:', !!savedUser.adminProfile);
    
    if (savedUser.studentProfile) {
      console.log('\n❌ FAILURE: studentProfile exists in database!');
      console.log('StudentProfile keys:', Object.keys(savedUser.studentProfile));
      console.log('StudentProfile content:', JSON.stringify(savedUser.studentProfile, null, 2));
    } else {
      console.log('\n✅ SUCCESS: No studentProfile in database!');
    }
    
    if (savedUser.adminProfile) {
      console.log('\n✅ AdminProfile exists:');
      console.log('  Name:', savedUser.adminProfile.firstName, savedUser.adminProfile.lastName);
      console.log('  Department:', savedUser.adminProfile.department);
    }
    
    // Cleanup - delete test user
    await User.deleteOne({ _id: user._id });
    console.log('\n🧹 Test user deleted\n');
    
    await mongoose.connection.close();
    process.exit(savedUser.studentProfile ? 1 : 0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

console.log('🧪 Testing Admin Registration\n');
console.log('================================\n');
testAdminRegistration();
