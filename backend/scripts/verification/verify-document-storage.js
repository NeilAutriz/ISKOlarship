// =============================================================================
// ISKOlarship - Database Document Verification Script
// Check if documents are properly stored in MongoDB
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}${colors.bright}▶ ${msg}${colors.reset}`),
};

async function verifyDocuments() {
  try {
    // Connect to MongoDB
    log.step('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    log.success('Connected to MongoDB');
    
    console.log('\n' + '='.repeat(70));
    console.log('  DOCUMENT STORAGE VERIFICATION');
    console.log('='.repeat(70) + '\n');
    
    // Find all students with documents
    const studentsWithDocs = await User.find({
      role: 'student',
      'studentProfile.documents.0': { $exists: true }
    }).select('email studentProfile.documents');
    
    if (studentsWithDocs.length === 0) {
      log.warning('No students with documents found in database');
      return;
    }
    
    log.success(`Found ${studentsWithDocs.length} student(s) with documents`);
    console.log('');
    
    let totalDocs = 0;
    let docsWithBase64 = 0;
    let docsWithFilePath = 0;
    
    studentsWithDocs.forEach((student, idx) => {
      const docs = student.studentProfile.documents || [];
      totalDocs += docs.length;
      
      console.log(`${idx + 1}. ${student.email} - ${docs.length} document(s)`);
      
      docs.forEach((doc, docIdx) => {
        const hasBase64 = !!doc.url && doc.url.length > 100;
        const hasFilePath = !!doc.filePath;
        
        if (hasBase64) docsWithBase64++;
        if (hasFilePath) docsWithFilePath++;
        
        console.log(`   ${docIdx + 1}. ${doc.name}`);
        console.log(`      Type: ${doc.documentType}`);
        console.log(`      File: ${doc.fileName}`);
        console.log(`      Size: ${doc.fileSize} bytes`);
        console.log(`      Storage Method: ${hasFilePath ? 'File System ✅' : hasBase64 ? 'Base64 (Legacy) ⚠️' : 'Unknown ❌'}`);
        
        if (hasFilePath) {
          console.log(`      Path: ${doc.filePath}`);
        }
        
        if (hasBase64) {
          console.log(`      Base64 Size: ${doc.url.length} characters`);
          const estimatedKB = Math.round(doc.url.length / 1024);
          console.log(`      Database Impact: ~${estimatedKB}KB`);
        }
        
        console.log('');
      });
    });
    
    // Summary statistics
    console.log('='.repeat(70));
    console.log('\n📊 SUMMARY STATISTICS:\n');
    console.log(`  Total Students with Documents: ${studentsWithDocs.length}`);
    console.log(`  Total Documents: ${totalDocs}`);
    console.log(`  Documents using File System (Optimized): ${docsWithFilePath} ✅`);
    console.log(`  Documents using Base64 (Legacy): ${docsWithBase64} ⚠️`);
    console.log('');
    
    if (docsWithBase64 > 0) {
      log.warning(`${docsWithBase64} document(s) still using old base64 storage`);
      console.log('  Consider migrating these to file system storage');
    }
    
    if (docsWithFilePath > 0) {
      log.success(`${docsWithFilePath} document(s) using optimized file system storage`);
    }
    
    // Calculate storage savings
    const avgBase64Size = 2000000; // ~2MB average
    const avgMetadataSize = 500; // ~500 bytes
    const potentialSavings = docsWithBase64 * (avgBase64Size - avgMetadataSize);
    
    if (docsWithBase64 > 0) {
      console.log('');
      console.log('💾 STORAGE ANALYSIS:');
      console.log(`  If ${docsWithBase64} base64 documents were migrated:`);
      console.log(`  Database Size Reduction: ~${Math.round(potentialSavings / 1024 / 1024)}MB`);
      console.log(`  Query Performance: Significantly faster ⚡`);
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
  } catch (error) {
    log.error('Verification failed!');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
  }
}

// Run verification
verifyDocuments();
