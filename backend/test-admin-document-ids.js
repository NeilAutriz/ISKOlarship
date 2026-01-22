// Test script to check if admin documents have _id fields
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

async function testAdminDocumentIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all admins
    const admins = await User.find({ role: 'admin' });
    console.log(`Found ${admins.length} admin users\n`);

    for (const admin of admins) {
      console.log(`\n📧 Admin: ${admin.email}`);
      console.log(`Name: ${admin.adminProfile?.firstName} ${admin.adminProfile?.lastName}`);
      
      if (admin.adminProfile?.documents && admin.adminProfile.documents.length > 0) {
        console.log(`Documents (${admin.adminProfile.documents.length}):`);
        admin.adminProfile.documents.forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.fileName}`);
          console.log(`     _id: ${doc._id || 'MISSING!'}`);
          console.log(`     Has _id: ${!!doc._id}`);
          console.log(`     filePath: ${doc.filePath}`);
          console.log(`     documentType: ${doc.documentType}`);
        });
      } else {
        console.log('No documents found');
      }
    }

    console.log('\n✅ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAdminDocumentIds();
