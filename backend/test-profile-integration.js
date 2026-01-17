#!/usr/bin/env node

// =============================================================================
// ISKOlarship - Profile Creation Integration Test
// Tests the complete flow: Registration → Profile Update → Document Upload
// =============================================================================

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = `test-${Date.now()}@up.edu.ph`;
const TEST_PASSWORD = 'TestPassword123!';

let authToken = null;
let userId = null;

// =============================================================================
// Helper Functions
// =============================================================================

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function createTestFile(filename, size = 1024) {
  const buffer = Buffer.alloc(size, 'Test data\n');
  const filePath = path.join(__dirname, 'test-uploads', filename);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Test Steps
// =============================================================================

async function step1_Register() {
  log('📝', 'STEP 1: Register new user');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      role: 'student'
    });

    if (response.data.success) {
      authToken = response.data.data.token;
      userId = response.data.data.user._id;
      log('✅', `User registered: ${TEST_EMAIL}`);
      log('🔑', `Auth token received`);
      log('🆔', `User ID: ${userId}`);
      return true;
    } else {
      log('❌', `Registration failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log('❌', `Registration error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function step2_UpdateProfile() {
  log('\n📝', 'STEP 2: Update student profile');
  
  const profileData = {
    firstName: 'Test',
    lastName: 'Student',
    phone: '09171234567',
    studentProfile: {
      studentNumber: `2024-${Math.floor(Math.random() * 100000)}`,
      firstName: 'Test',
      middleName: 'Integration',
      lastName: 'Student',
      contactNumber: '09171234567',
      birthDate: new Date('2000-01-15'),
      gender: 'Male',
      homeAddress: {
        street: '123 Test Street',
        barangay: 'Test Barangay',
        city: 'Los Baños',
        province: 'Laguna',
        zipCode: '4030',
        fullAddress: '123 Test Street, Test Barangay, Los Baños, Laguna 4030'
      },
      provinceOfOrigin: 'Laguna',
      college: 'College of Arts and Sciences',
      course: 'BS Computer Science',
      classification: 'Junior',
      gwa: 1.75,
      unitsEnrolled: 18,
      unitsPassed: 90,
      annualFamilyIncome: 250000,
      householdSize: 5,
      stBracket: 'PD40',
      citizenship: 'Filipino',
      hasExistingScholarship: false,
      hasThesisGrant: false,
      hasDisciplinaryAction: false,
      profileCompleted: true
    }
  };

  try {
    const response = await axios.put(`${API_BASE_URL}/users/profile`, profileData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      log('✅', 'Profile updated successfully');
      log('📊', `Student Number: ${profileData.studentProfile.studentNumber}`);
      log('🎓', `College: ${profileData.studentProfile.college}`);
      log('📚', `Course: ${profileData.studentProfile.course}`);
      return true;
    } else {
      log('❌', `Profile update failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log('❌', `Profile update error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function step3_UploadDocuments() {
  log('\n📤', 'STEP 3: Upload documents (Optimized method)');
  
  try {
    // Create test files
    log('📄', 'Creating test files...');
    const file1Path = createTestFile('test-student-id.pdf', 2048);
    const file2Path = createTestFile('test-grades.pdf', 3072);
    const file3Path = createTestFile('test-registration.pdf', 1536);
    
    log('✅', `Created 3 test files`);

    // Create FormData
    const formData = new FormData();
    
    formData.append('documents', fs.createReadStream(file1Path));
    formData.append('documents', fs.createReadStream(file2Path));
    formData.append('documents', fs.createReadStream(file3Path));
    
    formData.append('documentNames', 'Student ID');
    formData.append('documentNames', 'Latest Grades');
    formData.append('documentNames', 'Certificate of Registration');
    
    formData.append('documentTypes', 'student_id');
    formData.append('documentTypes', 'latest_grades');
    formData.append('documentTypes', 'certificate_of_registration');

    log('📤', 'Uploading to server...');

    const response = await axios.post(
      `${API_BASE_URL}/users/documents/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (response.data.success) {
      log('✅', `Documents uploaded successfully!`);
      log('📊', `Total documents: ${response.data.data.totalDocuments}`);
      
      response.data.data.documents.forEach((doc, i) => {
        log('📄', `  ${i + 1}. ${doc.name} (${(doc.fileSize / 1024).toFixed(2)} KB)`);
      });
      
      // Cleanup test files
      [file1Path, file2Path, file3Path].forEach(file => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
      
      return true;
    } else {
      log('❌', `Upload failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log('❌', `Upload error: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    return false;
  }
}

async function step4_VerifyStorage() {
  log('\n🔍', 'STEP 4: Verify documents in database');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      const user = response.data.data;
      const documents = user.studentProfile?.documents || [];
      
      log('✅', `Profile fetched successfully`);
      log('📊', `Documents in database: ${documents.length}`);
      
      if (documents.length > 0) {
        log('📄', 'Document details:');
        documents.forEach((doc, i) => {
          log('  ', `${i + 1}. ${doc.name}`);
          log('  ', `     Type: ${doc.documentType}`);
          log('  ', `     File: ${doc.fileName}`);
          log('  ', `     Size: ${(doc.fileSize / 1024).toFixed(2)} KB`);
          
          if (doc.filePath) {
            log('  ', `     ✅ Storage: FILE SYSTEM (Optimized)`);
            log('  ', `     Path: ${doc.filePath}`);
          } else if (doc.url && doc.url.startsWith('data:')) {
            log('  ', `     ⚠️  Storage: BASE64 (Legacy)`);
          } else {
            log('  ', `     ❓ Storage: Unknown`);
          }
        });
        
        // Calculate database size
        const dbSize = JSON.stringify(user.studentProfile.documents).length;
        log('📊', `Database document size: ${(dbSize / 1024).toFixed(2)} KB`);
        
        return true;
      } else {
        log('⚠️', 'No documents found in profile');
        return false;
      }
    } else {
      log('❌', `Profile fetch failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log('❌', `Verification error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function step5_Cleanup() {
  log('\n🧹', 'STEP 5: Cleanup (Optional)');
  
  // Note: In production, you might want to delete test users
  // For now, we'll just log the user info
  log('ℹ️', `Test user created: ${TEST_EMAIL}`);
  log('ℹ️', `User ID: ${userId}`);
  log('💡', 'You can delete this user manually if needed');
  
  // Cleanup test-uploads directory
  const testUploadsDir = path.join(__dirname, 'test-uploads');
  if (fs.existsSync(testUploadsDir)) {
    fs.rmSync(testUploadsDir, { recursive: true, force: true });
    log('✅', 'Cleaned up test files');
  }
}

// =============================================================================
// Run Tests
// =============================================================================

async function runIntegrationTest() {
  console.log('\n=============================================================================');
  console.log('🧪 PROFILE CREATION INTEGRATION TEST');
  console.log('=============================================================================\n');
  
  console.log(`📝 Test Configuration:`);
  console.log(`   API URL: ${API_BASE_URL}`);
  console.log(`   Test Email: ${TEST_EMAIL}`);
  console.log(`   Test Password: ${'*'.repeat(TEST_PASSWORD.length)}\n`);
  
  try {
    // Step 1: Register
    const step1Success = await step1_Register();
    if (!step1Success) {
      throw new Error('Registration failed');
    }
    
    await sleep(1000);
    
    // Step 2: Update Profile
    const step2Success = await step2_UpdateProfile();
    if (!step2Success) {
      throw new Error('Profile update failed');
    }
    
    await sleep(1000);
    
    // Step 3: Upload Documents
    const step3Success = await step3_UploadDocuments();
    if (!step3Success) {
      throw new Error('Document upload failed');
    }
    
    await sleep(1000);
    
    // Step 4: Verify Storage
    const step4Success = await step4_VerifyStorage();
    if (!step4Success) {
      throw new Error('Storage verification failed');
    }
    
    // Step 5: Cleanup
    await step5_Cleanup();
    
    console.log('\n=============================================================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('=============================================================================\n');
    
    console.log('📊 Summary:');
    console.log('   ✅ User registration');
    console.log('   ✅ Profile creation');
    console.log('   ✅ Document upload (optimized)');
    console.log('   ✅ Data verification');
    console.log('\n🎉 Integration test completed successfully!\n');
    
  } catch (error) {
    console.log('\n=============================================================================');
    console.log('❌ TEST FAILED');
    console.log('=============================================================================\n');
    console.error(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  console.log('🔍 Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running!');
    console.log('💡 Please start the backend server first:');
    console.log('   cd backend && npm run dev\n');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  await runIntegrationTest();
})();
