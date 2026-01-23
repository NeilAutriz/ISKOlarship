// =============================================================================
// Cleanup Script: Remove studentProfile from Admin Users
// This script removes the studentProfile field from all admin users
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const { User, UserRole } = require('./src/models');

async function cleanupAdminProfiles() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n📋 Finding all admin users...');
    const adminUsers = await User.find({ role: UserRole.ADMIN });
    console.log(`Found ${adminUsers.length} admin user(s)`);

    if (adminUsers.length === 0) {
      console.log('No admin users found. Nothing to clean up.');
      await mongoose.connection.close();
      return;
    }

    console.log('\n🧹 Cleaning up admin profiles using direct MongoDB operations...');
    
    // Use updateMany to directly remove studentProfile from all admin users
    const result = await User.updateMany(
      { role: UserRole.ADMIN },
      { $unset: { studentProfile: "" } }
    );

    console.log(`✅ Updated ${result.modifiedCount} admin user(s)`);

    // Display final state
    console.log('\n📊 Final state of admin users:');
    const updatedAdmins = await User.find({ role: UserRole.ADMIN });
    for (const admin of updatedAdmins) {
      console.log(`\n${admin.email}:`);
      console.log(`  - Has studentProfile: ${!!admin.studentProfile}`);
      console.log(`  - Has adminProfile: ${!!admin.adminProfile}`);
      if (admin.adminProfile) {
        console.log(`  - Admin firstName: ${admin.adminProfile.firstName}`);
        console.log(`  - Admin lastName: ${admin.adminProfile.lastName}`);
        console.log(`  - Admin documents: ${admin.adminProfile.documents?.length || 0}`);
        console.log(`  - Admin department: ${admin.adminProfile.department}`);
        console.log(`  - Admin position: ${admin.adminProfile.position}`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

console.log('🧹 Admin Profile Cleanup Script');
console.log('================================\n');
cleanupAdminProfiles();
