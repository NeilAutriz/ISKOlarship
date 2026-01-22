// Test admin user after fixes
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

async function testAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const admin = await User.findOne({ email: 'edward_jap@up.edu.ph' });
    const adminJSON = admin.toJSON();
    const adminPublic = admin.getPublicProfile();
    
    console.log('Admin user after fixes (RAW):');
    console.log('  Email:', admin.email);
    console.log('  Role:', admin.role);
    console.log('  Has studentProfile (raw):', !!admin.studentProfile);
    console.log('  Has adminProfile (raw):', !!admin.adminProfile);
    
    console.log('\nAdmin user (toJSON):');
    console.log('  Has studentProfile (JSON):', !!adminJSON.studentProfile);
    console.log('  Has adminProfile (JSON):', !!adminJSON.adminProfile);
    
    console.log('\nAdmin user (getPublicProfile):');
    console.log('  Has studentProfile (public):', !!adminPublic.studentProfile);
    console.log('  Has adminProfile (public):', !!adminPublic.adminProfile);
    
    if (adminJSON.adminProfile) {
      console.log('\nAdmin Profile (JSON):');
      console.log('  Name:', adminJSON.adminProfile.firstName, adminJSON.adminProfile.lastName);
      console.log('  Department:', adminJSON.adminProfile.department);
      console.log('  Position:', adminJSON.adminProfile.position);
      console.log('  Documents:', adminJSON.adminProfile.documents?.length || 0);
    }
    
    if (adminJSON.studentProfile) {
      console.log('\n⚠️  WARNING: Admin JSON still has studentProfile!');
    } else {
      console.log('\n✅ SUCCESS: Admin JSON has no studentProfile!');
    }
    
    // Test what would be sent to client
    console.log('\n📤 Sample API Response:');
    console.log(JSON.stringify({
      success: true,
      user: adminJSON
    }, null, 2).substring(0, 500) + '...');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAdmin();
