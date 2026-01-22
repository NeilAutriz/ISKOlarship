// Verify database state using raw MongoDB driver
require('dotenv').config();
const mongoose = require('mongoose');

async function verifyDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Use raw MongoDB driver to check actual database content
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('🔍 Checking raw database for admin users with studentProfile:\n');
    
    const admins = await usersCollection.find({ role: 'admin' }).toArray();
    
    console.log(`Found ${admins.length} admin user(s)\n`);
    
    let hasIssue = false;
    
    for (const admin of admins) {
      console.log(`📧 ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Has studentProfile in raw DB: ${!!admin.studentProfile}`);
      console.log(`   Has adminProfile in raw DB: ${!!admin.adminProfile}`);
      
      if (admin.studentProfile) {
        console.log(`   ❌ studentProfile EXISTS in database!`);
        hasIssue = true;
      } else {
        console.log(`   ✅ No studentProfile in database`);
      }
      console.log('');
    }
    
    if (hasIssue) {
      console.log('\n⚠️  Some admin users still have studentProfile in the database');
      console.log('Running cleanup now...\n');
      
      const result = await usersCollection.updateMany(
        { role: 'admin' },
        { $unset: { studentProfile: "" } }
      );
      
      console.log(`✅ Cleaned ${result.modifiedCount} admin user(s)\n`);
      
      // Verify cleanup
      console.log('🔍 Verifying cleanup:\n');
      const verifyAdmins = await usersCollection.find({ role: 'admin' }).toArray();
      
      for (const admin of verifyAdmins) {
        console.log(`📧 ${admin.email}`);
        console.log(`   Has studentProfile: ${!!admin.studentProfile}`);
        console.log(`   Has adminProfile: ${!!admin.adminProfile}`);
        console.log('');
      }
    } else {
      console.log('✅ All admin users are clean!');
    }
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

console.log('🔬 Raw Database Verification\n');
console.log('================================\n');
verifyDatabase();
