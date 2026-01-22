// Test to verify admin profile documents are properly returned by API
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

async function testAdminDocuments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find an admin with documents
    const admin = await User.findOne({ 
      role: 'admin',
      'adminProfile.documents': { $exists: true, $ne: [] }
    });

    if (!admin) {
      console.log('⚠️  No admin users found with documents');
      await mongoose.connection.close();
      return;
    }

    console.log('📧 Admin:', admin.email);
    console.log('📄 Documents count:', admin.adminProfile.documents?.length || 0);
    console.log('\n📋 Document details:');
    
    admin.adminProfile.documents?.forEach((doc, idx) => {
      console.log(`\n  ${idx + 1}. ${doc.name || doc.documentType}`);
      console.log(`     Type: ${doc.documentType}`);
      console.log(`     File: ${doc.fileName}`);
      console.log(`     Path: ${doc.filePath}`);
      console.log(`     Size: ${(doc.fileSize / 1024).toFixed(2)} KB`);
      console.log(`     Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}`);
    });

    // Test toJSON transform
    console.log('\n\n🔍 Testing API Response (toJSON):');
    const publicProfile = admin.toJSON();
    console.log('Has studentProfile:', !!publicProfile.studentProfile);
    console.log('Has adminProfile:', !!publicProfile.adminProfile);
    console.log('Admin documents in JSON:', publicProfile.adminProfile?.documents?.length || 0);

    // Test getPublicProfile method
    console.log('\n🔍 Testing getPublicProfile method:');
    const profileMethod = admin.getPublicProfile();
    console.log('Has studentProfile:', !!profileMethod.studentProfile);
    console.log('Has adminProfile:', !!profileMethod.adminProfile);
    console.log('Admin documents in public:', profileMethod.adminProfile?.documents?.length || 0);

    await mongoose.connection.close();
    console.log('\n✅ Test complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

console.log('🧪 Testing Admin Profile Documents API\n');
console.log('======================================\n');
testAdminDocuments();
