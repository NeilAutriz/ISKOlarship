/**
 * =============================================================================
 * ISKOlarship - Profile Update Tests
 * =============================================================================
 * 
 * Detailed tests to verify that the "Save Changes" functionality works
 * properly for both Student and Admin accounts.
 * 
 * Run with: node backend/tests/profile-update.test.js
 * 
 * Prerequisites:
 * - Backend server must be running on http://localhost:5000
 * - MongoDB must be running
 * - At least one student and one admin account must exist
 * 
 * =============================================================================
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';

// Test credentials - Created test users
const TEST_STUDENT = {
  email: 'testprofile@up.edu.ph',
  password: 'Test123!'
};

const TEST_ADMIN = {
  email: 'testadmin@up.edu.ph', 
  password: 'Test123!'
};

// Utility functions
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
  subheader: (msg) => console.log(`${colors.bright}--- ${msg} ---${colors.reset}`)
};

// Test result tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    log.success(`${name}`);
  } else {
    testResults.failed++;
    log.error(`${name}${details ? `: ${details}` : ''}`);
  }
}

// API Client with authentication
class ApiClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(email, password) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, { email, password });
      if (response.data.success) {
        this.accessToken = response.data.data.accessToken;
        this.refreshToken = response.data.data.refreshToken;
        return response.data;
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getProfile() {
    try {
      const response = await axios.get(`${BASE_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Get profile failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async updateProfile(updates) {
    try {
      const response = await axios.put(`${BASE_URL}/users/profile`, updates, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Update profile failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getProfileCompleteness() {
    try {
      const response = await axios.get(`${BASE_URL}/users/profile/completeness`, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Get completeness failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// =============================================================================
// STUDENT PROFILE TESTS
// =============================================================================

async function testStudentProfileUpdate() {
  log.header('STUDENT PROFILE UPDATE TESTS');
  
  const client = new ApiClient();
  let originalProfile = null;
  
  // Test 1: Login as student
  log.subheader('Test 1: Student Login');
  try {
    const loginResult = await client.login(TEST_STUDENT.email, TEST_STUDENT.password);
    recordTest('Student login successful', loginResult.success);
  } catch (error) {
    recordTest('Student login successful', false, error.message);
    log.warning('Skipping remaining student tests due to login failure');
    testResults.skipped += 8;
    return;
  }

  // Test 2: Get current profile
  log.subheader('Test 2: Fetch Current Profile');
  try {
    const profileResult = await client.getProfile();
    originalProfile = profileResult.data;
    recordTest('Fetch student profile', profileResult.success);
    log.info(`Current profile: ${originalProfile.studentProfile?.firstName || 'N/A'} ${originalProfile.studentProfile?.lastName || 'N/A'}`);
    log.info(`Student Number: ${originalProfile.studentProfile?.studentNumber || 'Not set'}`);
    log.info(`College: ${originalProfile.studentProfile?.college || 'Not set'}`);
    log.info(`GWA: ${originalProfile.studentProfile?.gwa || 'Not set'}`);
  } catch (error) {
    recordTest('Fetch student profile', false, error.message);
    return;
  }

  // Test 3: Update basic info (firstName, lastName)
  log.subheader('Test 3: Update Basic Info');
  const testFirstName = `Test_${Date.now()}`;
  const testLastName = `Student_${Date.now()}`;
  try {
    const updateResult = await client.updateProfile({
      studentProfile: {
        firstName: testFirstName,
        lastName: testLastName
      }
    });
    recordTest('Update basic info (firstName, lastName)', updateResult.success);
    
    // Verify the update
    const verifyResult = await client.getProfile();
    const nameMatches = verifyResult.data.studentProfile?.firstName === testFirstName &&
                        verifyResult.data.studentProfile?.lastName === testLastName;
    recordTest('Verify basic info persisted', nameMatches, 
      nameMatches ? '' : `Expected: ${testFirstName} ${testLastName}, Got: ${verifyResult.data.studentProfile?.firstName} ${verifyResult.data.studentProfile?.lastName}`);
  } catch (error) {
    recordTest('Update basic info (firstName, lastName)', false, error.message);
  }

  // Test 4: Update academic info (GWA, classification)
  log.subheader('Test 4: Update Academic Info');
  const testGWA = 1.75;
  const testClassification = 'Junior';
  try {
    const updateResult = await client.updateProfile({
      studentProfile: {
        gwa: testGWA,
        classification: testClassification
      }
    });
    recordTest('Update academic info (GWA, classification)', updateResult.success);
    
    // Verify the update
    const verifyResult = await client.getProfile();
    const gwaMatches = Math.abs(verifyResult.data.studentProfile?.gwa - testGWA) < 0.01;
    const classMatches = verifyResult.data.studentProfile?.classification === testClassification;
    recordTest('Verify GWA persisted', gwaMatches,
      gwaMatches ? '' : `Expected: ${testGWA}, Got: ${verifyResult.data.studentProfile?.gwa}`);
    recordTest('Verify classification persisted', classMatches,
      classMatches ? '' : `Expected: ${testClassification}, Got: ${verifyResult.data.studentProfile?.classification}`);
  } catch (error) {
    recordTest('Update academic info (GWA, classification)', false, error.message);
  }

  // Test 5: Update financial info (annualFamilyIncome, householdSize, stBracket)
  log.subheader('Test 5: Update Financial Info');
  const testIncome = 250000;
  const testHouseholdSize = 5;
  const testSTBracket = 'PD60';
  try {
    const updateResult = await client.updateProfile({
      studentProfile: {
        annualFamilyIncome: testIncome,
        householdSize: testHouseholdSize,
        stBracket: testSTBracket
      }
    });
    recordTest('Update financial info', updateResult.success);
    
    // Verify the update
    const verifyResult = await client.getProfile();
    const incomeMatches = verifyResult.data.studentProfile?.annualFamilyIncome === testIncome;
    const householdMatches = verifyResult.data.studentProfile?.householdSize === testHouseholdSize;
    const bracketMatches = verifyResult.data.studentProfile?.stBracket === testSTBracket;
    
    recordTest('Verify income persisted', incomeMatches,
      incomeMatches ? '' : `Expected: ${testIncome}, Got: ${verifyResult.data.studentProfile?.annualFamilyIncome}`);
    recordTest('Verify household size persisted', householdMatches,
      householdMatches ? '' : `Expected: ${testHouseholdSize}, Got: ${verifyResult.data.studentProfile?.householdSize}`);
    recordTest('Verify ST bracket persisted', bracketMatches,
      bracketMatches ? '' : `Expected: ${testSTBracket}, Got: ${verifyResult.data.studentProfile?.stBracket}`);
  } catch (error) {
    recordTest('Update financial info', false, error.message);
  }

  // Test 6: Update address info
  log.subheader('Test 6: Update Address Info');
  const testAddress = {
    street: '123 Test Street',
    barangay: 'Test Barangay',
    city: 'Test City',
    province: 'Laguna',
    zipCode: '4031'
  };
  try {
    const updateResult = await client.updateProfile({
      studentProfile: {
        homeAddress: testAddress,
        provinceOfOrigin: 'Laguna'
      }
    });
    recordTest('Update address info', updateResult.success);
    
    // Verify the update
    const verifyResult = await client.getProfile();
    const addressMatches = verifyResult.data.studentProfile?.homeAddress?.province === testAddress.province &&
                           verifyResult.data.studentProfile?.homeAddress?.city === testAddress.city;
    recordTest('Verify address persisted', addressMatches,
      addressMatches ? '' : `Expected province: ${testAddress.province}, Got: ${verifyResult.data.studentProfile?.homeAddress?.province}`);
  } catch (error) {
    recordTest('Update address info', false, error.message);
  }

  // Test 7: Update boolean fields
  log.subheader('Test 7: Update Boolean Fields');
  try {
    const updateResult = await client.updateProfile({
      studentProfile: {
        hasExistingScholarship: true,
        hasThesisGrant: false,
        hasDisciplinaryAction: false
      }
    });
    recordTest('Update boolean fields', updateResult.success);
    
    // Verify the update
    const verifyResult = await client.getProfile();
    const scholarshipMatches = verifyResult.data.studentProfile?.hasExistingScholarship === true;
    recordTest('Verify hasExistingScholarship persisted', scholarshipMatches,
      scholarshipMatches ? '' : `Expected: true, Got: ${verifyResult.data.studentProfile?.hasExistingScholarship}`);
  } catch (error) {
    recordTest('Update boolean fields', false, error.message);
  }

  // Test 8: Full profile update (all fields at once)
  log.subheader('Test 8: Full Profile Update');
  const fullUpdate = {
    studentProfile: {
      firstName: 'Complete',
      lastName: 'Test',
      studentNumber: '2024-00001',
      college: 'College of Arts and Sciences',
      course: 'BS Computer Science',
      major: 'Computer Science',
      classification: 'Senior',
      gwa: 1.50,
      unitsEnrolled: 18,
      unitsPassed: 120,
      annualFamilyIncome: 300000,
      householdSize: 4,
      stBracket: 'PD40',
      provinceOfOrigin: 'Laguna',
      contactNumber: '09123456789',
      citizenship: 'Filipino',
      hasExistingScholarship: false,
      hasThesisGrant: false,
      hasDisciplinaryAction: false,
      homeAddress: {
        street: '456 Complete St',
        barangay: 'Complete Brgy',
        city: 'Los Baños',
        province: 'Laguna',
        zipCode: '4030'
      }
    }
  };
  try {
    const updateResult = await client.updateProfile(fullUpdate);
    recordTest('Full profile update', updateResult.success);
    
    // Verify completeness
    const completenessResult = await client.getProfileCompleteness();
    recordTest('Profile completeness check', completenessResult.success);
    log.info(`Profile completeness: ${completenessResult.data?.percentage || 0}%`);
  } catch (error) {
    recordTest('Full profile update', false, error.message);
  }

  // Restore original profile if needed
  if (originalProfile?.studentProfile) {
    log.subheader('Cleanup: Restore Original Profile');
    try {
      await client.updateProfile({
        studentProfile: {
          firstName: originalProfile.studentProfile.firstName,
          lastName: originalProfile.studentProfile.lastName,
          studentNumber: originalProfile.studentProfile.studentNumber,
          college: originalProfile.studentProfile.college,
          course: originalProfile.studentProfile.course,
          gwa: originalProfile.studentProfile.gwa,
          classification: originalProfile.studentProfile.classification
        }
      });
      log.success('Original profile restored');
    } catch (error) {
      log.warning(`Could not restore original profile: ${error.message}`);
    }
  }
}

// =============================================================================
// ADMIN PROFILE TESTS
// =============================================================================

async function testAdminProfileUpdate() {
  log.header('ADMIN PROFILE UPDATE TESTS');
  
  const client = new ApiClient();
  let originalProfile = null;
  
  // Test 1: Login as admin
  log.subheader('Test 1: Admin Login');
  try {
    const loginResult = await client.login(TEST_ADMIN.email, TEST_ADMIN.password);
    recordTest('Admin login successful', loginResult.success);
  } catch (error) {
    recordTest('Admin login successful', false, error.message);
    log.warning('Skipping remaining admin tests due to login failure');
    testResults.skipped += 6;
    return;
  }

  // Test 2: Get current profile
  log.subheader('Test 2: Fetch Current Profile');
  try {
    const profileResult = await client.getProfile();
    originalProfile = profileResult.data;
    recordTest('Fetch admin profile', profileResult.success);
    log.info(`Current profile: ${originalProfile.adminProfile?.firstName || 'N/A'} ${originalProfile.adminProfile?.lastName || 'N/A'}`);
    log.info(`Department: ${originalProfile.adminProfile?.department || 'Not set'}`);
    log.info(`Position: ${originalProfile.adminProfile?.position || 'Not set'}`);
  } catch (error) {
    recordTest('Fetch admin profile', false, error.message);
    return;
  }

  // Test 3: Update basic info (firstName, lastName)
  log.subheader('Test 3: Update Basic Info');
  const testFirstName = `Admin_${Date.now()}`;
  const testLastName = `Test_${Date.now()}`;
  try {
    const updateResult = await client.updateProfile({
      adminProfile: {
        firstName: testFirstName,
        lastName: testLastName
      }
    });
    recordTest('Update basic info (firstName, lastName)', updateResult.success);
    
    // Verify the update
    const verifyResult = await client.getProfile();
    const nameMatches = verifyResult.data.adminProfile?.firstName === testFirstName &&
                        verifyResult.data.adminProfile?.lastName === testLastName;
    recordTest('Verify basic info persisted', nameMatches, 
      nameMatches ? '' : `Expected: ${testFirstName} ${testLastName}, Got: ${verifyResult.data.adminProfile?.firstName} ${verifyResult.data.adminProfile?.lastName}`);
  } catch (error) {
    recordTest('Update basic info (firstName, lastName)', false, error.message);
  }

  // Test 4: Update department info
  log.subheader('Test 4: Update Department Info');
  const testDepartment = 'Office of Student Affairs';
  const testPosition = 'Scholarship Coordinator';
  const testCollege = 'College of Arts and Sciences'; // Valid UPLBCollege enum value
  try {
    const updateResult = await client.updateProfile({
      adminProfile: {
        department: testDepartment,
        position: testPosition,
        college: testCollege
      }
    });
    recordTest('Update department info', updateResult.success);
    
    // Verify the update
    const verifyResult = await client.getProfile();
    const deptMatches = verifyResult.data.adminProfile?.department === testDepartment;
    const posMatches = verifyResult.data.adminProfile?.position === testPosition;
    
    recordTest('Verify department persisted', deptMatches,
      deptMatches ? '' : `Expected: ${testDepartment}, Got: ${verifyResult.data.adminProfile?.department}`);
    recordTest('Verify position persisted', posMatches,
      posMatches ? '' : `Expected: ${testPosition}, Got: ${verifyResult.data.adminProfile?.position}`);
  } catch (error) {
    recordTest('Update department info', false, error.message);
  }

  // Test 5: Update office info
  log.subheader('Test 5: Update Office Info');
  const testOffice = 'Room 301, Admin Building';
  const testResponsibilities = 'Manage scholarship applications and coordinate with colleges';
  try {
    const updateResult = await client.updateProfile({
      adminProfile: {
        officeLocation: testOffice,
        responsibilities: testResponsibilities
      }
    });
    recordTest('Update office info', updateResult.success);
    
    // Verify the update
    const verifyResult = await client.getProfile();
    const officeMatches = verifyResult.data.adminProfile?.officeLocation === testOffice;
    recordTest('Verify office location persisted', officeMatches,
      officeMatches ? '' : `Expected: ${testOffice}, Got: ${verifyResult.data.adminProfile?.officeLocation}`);
  } catch (error) {
    recordTest('Update office info', false, error.message);
  }

  // Test 6: Update address info
  log.subheader('Test 6: Update Address Info');
  const testAddress = {
    street: '789 Admin Street',
    barangay: 'Anos',
    city: 'Los Baños, Laguna',
    zipCode: '4030',
    fullAddress: '789 Admin Street, Anos, Los Baños, Laguna 4030'
  };
  try {
    const updateResult = await client.updateProfile({
      adminProfile: {
        address: testAddress
      }
    });
    recordTest('Update address info', updateResult.success);
    
    // Verify the update
    const verifyResult = await client.getProfile();
    const addressMatches = verifyResult.data.adminProfile?.address?.city === testAddress.city;
    recordTest('Verify address persisted', addressMatches,
      addressMatches ? '' : `Expected city: ${testAddress.city}, Got: ${verifyResult.data.adminProfile?.address?.city}`);
  } catch (error) {
    recordTest('Update address info', false, error.message);
  }

  // Test 7: Full admin profile update
  log.subheader('Test 7: Full Admin Profile Update');
  const fullUpdate = {
    adminProfile: {
      firstName: 'Complete',
      middleName: 'Admin',
      lastName: 'Test',
      department: 'University Administration',
      college: 'College of Economics and Management', // Valid UPLBCollege enum value
      position: 'Senior Administrator',
      officeLocation: 'Admin Building, Room 101',
      responsibilities: 'Oversee all scholarship programs',
      address: {
        street: '123 Admin Lane',
        barangay: 'Batong Malake',
        city: 'Los Baños, Laguna',
        zipCode: '4030',
        fullAddress: '123 Admin Lane, Batong Malake, Los Baños, Laguna 4030'
      }
    }
  };
  try {
    const updateResult = await client.updateProfile(fullUpdate);
    recordTest('Full admin profile update', updateResult.success);
  } catch (error) {
    recordTest('Full admin profile update', false, error.message);
  }

  // Restore original profile if needed
  if (originalProfile?.adminProfile) {
    log.subheader('Cleanup: Restore Original Profile');
    try {
      await client.updateProfile({
        adminProfile: {
          firstName: originalProfile.adminProfile.firstName,
          lastName: originalProfile.adminProfile.lastName,
          department: originalProfile.adminProfile.department,
          position: originalProfile.adminProfile.position
        }
      });
      log.success('Original admin profile restored');
    } catch (error) {
      log.warning(`Could not restore original admin profile: ${error.message}`);
    }
  }
}

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

async function testErrorHandling() {
  log.header('ERROR HANDLING TESTS');
  
  const client = new ApiClient();
  
  // Test 1: Update without authentication
  log.subheader('Test 1: Update Without Auth');
  try {
    await axios.put(`${BASE_URL}/users/profile`, { firstName: 'Test' });
    recordTest('Reject unauthenticated update', false, 'Should have returned 401');
  } catch (error) {
    const is401 = error.response?.status === 401;
    recordTest('Reject unauthenticated update', is401,
      is401 ? '' : `Expected 401, got ${error.response?.status}`);
  }

  // Test 2: Invalid GWA value
  log.subheader('Test 2: Invalid GWA Value');
  try {
    await client.login(TEST_STUDENT.email, TEST_STUDENT.password);
    const result = await client.updateProfile({
      studentProfile: {
        gwa: 10.0 // Invalid - should be 1.0-5.0
      }
    });
    // If it succeeds, check if validation caught it
    recordTest('Reject invalid GWA (10.0)', !result.success, 
      result.success ? 'Should have rejected invalid GWA' : '');
  } catch (error) {
    // Validation error is expected
    recordTest('Reject invalid GWA (10.0)', true);
  }

  // Test 3: Invalid household size
  log.subheader('Test 3: Invalid Household Size');
  try {
    const result = await client.updateProfile({
      studentProfile: {
        householdSize: -5 // Invalid
      }
    });
    recordTest('Reject invalid household size', !result.success,
      result.success ? 'Should have rejected invalid household size' : '');
  } catch (error) {
    recordTest('Reject invalid household size', true);
  }
}

// =============================================================================
// CONCURRENT UPDATE TESTS
// =============================================================================

async function testConcurrentUpdates() {
  log.header('CONCURRENT UPDATE TESTS');
  
  const client = new ApiClient();
  
  try {
    await client.login(TEST_STUDENT.email, TEST_STUDENT.password);
  } catch (error) {
    log.warning('Skipping concurrent tests due to login failure');
    testResults.skipped += 1;
    return;
  }

  log.subheader('Test: Multiple rapid updates');
  try {
    // Send multiple updates rapidly
    const updates = [
      client.updateProfile({ studentProfile: { firstName: 'Concurrent1' } }),
      client.updateProfile({ studentProfile: { firstName: 'Concurrent2' } }),
      client.updateProfile({ studentProfile: { firstName: 'Concurrent3' } })
    ];
    
    const results = await Promise.allSettled(updates);
    const allSucceeded = results.every(r => r.status === 'fulfilled' && r.value?.success);
    recordTest('Handle concurrent updates', allSucceeded,
      allSucceeded ? '' : 'Some concurrent updates failed');
    
    // Verify final state is consistent
    const finalProfile = await client.getProfile();
    recordTest('Profile consistent after concurrent updates', 
      !!finalProfile.data?.studentProfile?.firstName);
  } catch (error) {
    recordTest('Handle concurrent updates', false, error.message);
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         ISKOlarship - Profile Update Test Suite                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  const startTime = Date.now();
  
  // Run all test suites
  await testStudentProfileUpdate();
  await testAdminProfileUpdate();
  await testErrorHandling();
  await testConcurrentUpdates();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  log.header('TEST SUMMARY');
  console.log(`Total tests: ${testResults.passed + testResults.failed + testResults.skipped}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${testResults.skipped}${colors.reset}`);
  console.log(`Duration: ${duration}s`);
  console.log('');
  
  if (testResults.failed > 0) {
    log.header('FAILED TESTS');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`${colors.red}✗${colors.reset} ${t.name}`);
        if (t.details) console.log(`  ${colors.yellow}→ ${t.details}${colors.reset}`);
      });
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
