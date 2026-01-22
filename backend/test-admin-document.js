// Test script to verify admin employee ID document upload
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User.model');

async function testAdminDocument() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the most recent admin user
    const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: -1 });

    if (!admin) {
      console.log('❌ No admin users found in database');
      return;
    }

    console.log('👤 Admin User:', admin.email);
    console.log('📋 Admin Profile:', JSON.stringify(admin.adminProfile, null, 2));
    
    if (admin.adminProfile?.employeeIdDocument) {
      console.log('\n✅ Employee ID Document Found:');
      console.log('  - File Name:', admin.adminProfile.employeeIdDocument.fileName);
      console.log('  - File Path:', admin.adminProfile.employeeIdDocument.filePath);
      console.log('  - File Size:', (admin.adminProfile.employeeIdDocument.fileSize / 1024).toFixed(2), 'KB');
      console.log('  - MIME Type:', admin.adminProfile.employeeIdDocument.mimeType);
      console.log('  - Uploaded At:', admin.adminProfile.employeeIdDocument.uploadedAt);
    } else {
      console.log('\n❌ No employee ID document found in adminProfile');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testAdminDocument();
