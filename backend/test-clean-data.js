// Test new user registration with cleaned up fields
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

const testNewUser = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    // Create a test user with only essential fields
    const testUser = new User({
      email: 'cleantest@example.com',
      password: 'TestPass123',
      role: 'student',
      studentProfile: {
        firstName: 'Clean',
        lastName: 'Test',
        studentNumber: '2026-00001',
        college: 'College of Arts and Sciences',
        course: 'BS Computer Science',
        classification: 'Freshman',
        gwa: 2.5,
        unitsEnrolled: 18,
        unitsPassed: 0,
        annualFamilyIncome: 300000,
        householdSize: 5,
        stBracket: 'PD60',
        contactNumber: '+639171234567',
        provinceOfOrigin: 'Laguna',
        citizenship: 'Filipino',
        homeAddress: {
          street: '123 Test Street',
          barangay: 'Test Barangay',
          city: 'Los Baños',
          province: 'Laguna',
          zipCode: '4031',
          fullAddress: '123 Test Street, Test Barangay, Los Baños, Laguna 4031'
        },
        // Only essential boolean fields
        hasExistingScholarship: false,
        hasThesisGrant: false,
        hasDisciplinaryAction: false,
        profileCompleted: true
      }
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('\n📋 Student Profile Fields:');
    console.log(JSON.stringify(testUser.studentProfile, null, 2));

    // Clean up
    await User.deleteOne({ email: 'cleantest@example.com' });
    console.log('\n🗑️ Test user deleted');

    await mongoose.connection.close();
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testNewUser();
