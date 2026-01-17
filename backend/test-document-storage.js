// =============================================================================
// ISKOlarship - Document Upload Test (Optimized)
// Tests the new file-based upload system
// =============================================================================

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { User } = require('./src/models');

// =============================================================================
// Test Configuration
// =============================================================================

const TEST_USER_EMAIL = 'test-documents@up.edu.ph';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/isklarship';

// =============================================================================
// Helper Functions
// =============================================================================

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, 'uploads', filePath);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    const stats = fs.statSync(fullPath);
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }
  return { exists: false };
}

// =============================================================================
// Test Functions
// =============================================================================

async function testDocumentStorage() {
  console.log('\n=============================================================================');
  console.log('📋 DOCUMENT STORAGE TEST - Optimized Approach');
  console.log('=============================================================================\n');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find test user
    console.log(`🔍 Looking for user: ${TEST_USER_EMAIL}`);
    const user = await User.findOne({ email: TEST_USER_EMAIL });

    if (!user) {
      console.log('❌ Test user not found!');
      console.log('💡 Please create a student account with this email first.');
      return;
    }

    console.log(`✅ Found user: ${user.email} (${user.role})`);
    console.log(`   User ID: ${user._id}\n`);

    // Check if user has studentProfile
    if (!user.studentProfile) {
      console.log('❌ User has no studentProfile!');
      return;
    }

    console.log('📊 Student Profile Information:');
    console.log(`   Name: ${user.studentProfile.firstName} ${user.studentProfile.lastName}`);
    console.log(`   Student Number: ${user.studentProfile.studentNumber || 'N/A'}`);
    console.log(`   College: ${user.studentProfile.college || 'N/A'}`);
    console.log(`   Profile Completed: ${user.studentProfile.profileCompleted ? 'Yes' : 'No'}\n`);

    // Check documents
    const documents = user.studentProfile.documents || [];
    console.log('=============================================================================');
    console.log(`📄 DOCUMENTS: ${documents.length} found`);
    console.log('=============================================================================\n');

    if (documents.length === 0) {
      console.log('⚠️  No documents found in database!');
      console.log('💡 Upload documents through profile completion or profile page.');
      return;
    }

    // Analyze each document
    let totalSize = 0;
    let filesFoundOnDisk = 0;
    let base64Count = 0;
    let filePathCount = 0;

    documents.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`);
      console.log(`   Name: ${doc.name || 'Unnamed'}`);
      console.log(`   Type: ${doc.documentType || 'unknown'}`);
      console.log(`   Filename: ${doc.fileName || 'N/A'}`);
      console.log(`   Size: ${doc.fileSize ? formatFileSize(doc.fileSize) : 'Unknown'}`);
      console.log(`   MIME Type: ${doc.mimeType || 'N/A'}`);
      console.log(`   Uploaded: ${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'N/A'}`);
      
      // Check storage method
      if (doc.filePath) {
        filePathCount++;
        console.log(`   ✅ Storage: FILE SYSTEM (Optimized)`);
        console.log(`   📁 Path: ${doc.filePath}`);
        
        // Verify file exists on disk
        const fileInfo = checkFileExists(doc.filePath);
        if (fileInfo.exists) {
          filesFoundOnDisk++;
          console.log(`   ✅ File EXISTS on disk`);
          console.log(`   📊 Actual Size: ${formatFileSize(fileInfo.size)}`);
          console.log(`   📅 Created: ${fileInfo.created.toLocaleString()}`);
          totalSize += fileInfo.size;
        } else {
          console.log(`   ❌ File NOT FOUND on disk!`);
          console.log(`   💡 Expected location: uploads/${doc.filePath}`);
        }
      } else if (doc.url && doc.url.startsWith('data:')) {
        base64Count++;
        console.log(`   ⚠️  Storage: BASE64 (Legacy - Slow)`);
        console.log(`   📊 Base64 Size: ${formatFileSize(doc.url.length)} (in database)`);
        totalSize += doc.url.length;
      } else if (doc.url) {
        console.log(`   📁 Storage: URL/Path`);
        console.log(`   🔗 URL: ${doc.url}`);
      } else {
        console.log(`   ❌ Storage: UNKNOWN - No filePath or url`);
      }
      
      console.log('');
    });

    // Summary
    console.log('=============================================================================');
    console.log('📈 SUMMARY');
    console.log('=============================================================================\n');
    console.log(`Total Documents: ${documents.length}`);
    console.log(`   - File System (Optimized): ${filePathCount}`);
    console.log(`   - Base64 (Legacy): ${base64Count}`);
    console.log(`   - Other: ${documents.length - filePathCount - base64Count}`);
    console.log('');
    console.log(`Files on Disk: ${filesFoundOnDisk}/${filePathCount}`);
    console.log(`Total Size: ${formatFileSize(totalSize)}`);
    console.log('');

    // Database size estimation
    const userDocSize = JSON.stringify(user.toObject()).length;
    console.log(`Database Document Size: ~${formatFileSize(userDocSize)}`);
    console.log('');

    // Performance analysis
    if (filePathCount > 0 && base64Count > 0) {
      console.log('⚠️  WARNING: Mixed storage methods detected!');
      console.log('💡 Consider migrating old base64 documents to file system.');
    } else if (filePathCount > 0) {
      console.log('✅ All documents using OPTIMIZED file system storage!');
      console.log('🚀 Fast uploads, small database documents, efficient retrieval.');
    } else if (base64Count > 0) {
      console.log('⚠️  All documents using LEGACY base64 storage!');
      console.log('🐌 Slow uploads, large database documents.');
      console.log('💡 Recommendation: Use the new upload endpoint for future documents.');
    }

    console.log('');
    console.log('=============================================================================');
    console.log('✅ TEST COMPLETED');
    console.log('=============================================================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database\n');
  }
}

// =============================================================================
// Run Test
// =============================================================================

testDocumentStorage()
  .then(() => {
    console.log('Test execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
