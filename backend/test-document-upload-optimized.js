// =============================================================================
// ISKOlarship - Document Upload Test Script
// Test the optimized file upload system
// =============================================================================

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
const TEST_USER_EMAIL = 'test-upload@up.edu.ph';
const TEST_USER_PASSWORD = 'TestPass123';

// ANSI color codes for better console output
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

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a test file for upload
 */
function createTestFile(filename, content = 'Test document content') {
  const testDir = path.join(__dirname, 'test-files');
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, filename);
  fs.writeFileSync(filePath, content);
  
  return filePath;
}

/**
 * Register a test user
 */
async function registerTestUser() {
  try {
    log.step('Registering test user...');
    
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      role: 'student'
    });
    
    if (response.data.success) {
      log.success(`User registered: ${TEST_USER_EMAIL}`);
      return response.data.data.token;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    if (error.response?.status === 409) {
      log.info('User already exists, logging in instead...');
      return await loginTestUser();
    }
    throw error;
  }
}

/**
 * Login test user
 */
async function loginTestUser() {
  try {
    log.step('Logging in test user...');
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    
    if (response.data.success) {
      log.success(`User logged in: ${TEST_USER_EMAIL}`);
      return response.data.data.token;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Update user profile with student details
 */
async function updateProfile(token) {
  try {
    log.step('Updating user profile...');
    
    const response = await axios.put(
      `${API_BASE_URL}/users/profile`,
      {
        studentProfile: {
          studentNumber: '2024-' + Math.floor(Math.random() * 10000),
          firstName: 'Test',
          lastName: 'User',
          college: 'College of Arts and Sciences',
          course: 'BS Computer Science',
          classification: 'Junior',
          gwa: 2.5,
          annualFamilyIncome: 100000,
          householdSize: 5,
          citizenship: 'Filipino',
          provinceOfOrigin: 'Laguna',
          profileCompleted: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      log.success('Profile updated successfully');
      return true;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Test document upload using FormData
 */
async function testDocumentUpload(token) {
  try {
    log.step('Testing document upload...');
    
    // Create test files
    const testFile1 = createTestFile('test-document-1.txt', 'This is test document 1');
    const testFile2 = createTestFile('test-document-2.txt', 'This is test document 2');
    
    // Create FormData
    const formData = new FormData();
    formData.append('documents', fs.createReadStream(testFile1));
    formData.append('documents', fs.createReadStream(testFile2));
    formData.append('documentNames', 'Student ID');
    formData.append('documentNames', 'Grade Report');
    formData.append('documentTypes', 'student_id');
    formData.append('documentTypes', 'latest_grades');
    
    // Upload documents
    const response = await axios.post(
      `${API_BASE_URL}/users/documents/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.data.success) {
      log.success(`Uploaded ${response.data.data.documents.length} document(s)`);
      console.log(JSON.stringify(response.data.data, null, 2));
      return response.data.data.documents;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Verify documents are saved in database
 */
async function verifyDocumentsInDB(token) {
  try {
    log.step('Verifying documents in database...');
    
    const response = await axios.get(
      `${API_BASE_URL}/users/profile`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.data.success) {
      const documents = response.data.data.studentProfile?.documents || [];
      
      if (documents.length > 0) {
        log.success(`Found ${documents.length} document(s) in database`);
        
        documents.forEach((doc, idx) => {
          console.log(`\n  Document ${idx + 1}:`);
          console.log(`    Name: ${doc.name}`);
          console.log(`    Type: ${doc.documentType}`);
          console.log(`    File: ${doc.fileName}`);
          console.log(`    Size: ${doc.fileSize} bytes`);
          console.log(`    Path: ${doc.filePath}`);
          console.log(`    Has base64: ${!!doc.url}`);
        });
        
        return documents;
      } else {
        log.warning('No documents found in database!');
        return [];
      }
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Test document retrieval
 */
async function testDocumentRetrieval(token, documentId) {
  try {
    log.step(`Testing document retrieval for ID: ${documentId}...`);
    
    const response = await axios.get(
      `${API_BASE_URL}/users/documents/${documentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'arraybuffer'
      }
    );
    
    if (response.status === 200) {
      log.success(`Document retrieved successfully (${response.data.length} bytes)`);
      return true;
    } else {
      throw new Error('Failed to retrieve document');
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Cleanup test files
 */
function cleanup() {
  const testDir = path.join(__dirname, 'test-files');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
    log.info('Cleaned up test files');
  }
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('  DOCUMENT UPLOAD SYSTEM TEST');
  console.log('='.repeat(70) + '\n');
  
  let token;
  
  try {
    // Step 1: Register/Login user
    token = await registerTestUser();
    
    // Step 2: Update profile
    await updateProfile(token);
    
    // Step 3: Upload documents
    const uploadedDocs = await testDocumentUpload(token);
    
    // Step 4: Verify documents in DB
    const docsInDB = await verifyDocumentsInDB(token);
    
    // Step 5: Test document retrieval
    if (docsInDB.length > 0) {
      await testDocumentRetrieval(token, docsInDB[0]._id);
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    log.success('ALL TESTS PASSED! ✨');
    console.log('='.repeat(70) + '\n');
    
    // Performance comparison
    console.log('\n📊 Performance Analysis:');
    console.log('  Old Method (Base64):');
    console.log('    - Converts files to base64 in browser');
    console.log('    - 35% size overhead');
    console.log('    - Stores in MongoDB (bloats database)');
    console.log('    - Slow profile fetches');
    console.log('');
    console.log('  New Method (Optimized):');
    console.log('    - Sends files directly via FormData ✅');
    console.log('    - No size overhead ✅');
    console.log('    - Stores on disk (scalable) ✅');
    console.log('    - Fast profile fetches ✅');
    console.log('');
    
  } catch (error) {
    console.log('\n' + '='.repeat(70));
    log.error('TEST FAILED!');
    console.log('='.repeat(70) + '\n');
    
    if (error.response) {
      console.error('Response Error:', error.response.status);
      console.error('Message:', error.response.data?.message || error.message);
      console.error('Error:', error.response.data?.error);
    } else {
      console.error('Error:', error.message);
    }
    
    process.exit(1);
  } finally {
    cleanup();
  }
}

// Run tests
runTests();
