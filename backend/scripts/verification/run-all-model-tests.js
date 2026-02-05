/**
 * Run All Model Selection Tests
 * 
 * This script runs all model selection verification tests in sequence:
 * 1. Audit - Check and fix any misconfigurations
 * 2. Unit Tests - Test model loading logic
 * 3. API Tests - Test API responses
 * 4. E2E Tests - End-to-end integration test
 * 
 * Run with: node scripts/verification/run-all-model-tests.js
 */

const { spawn } = require('child_process');
const path = require('path');

const tests = [
  { name: 'Audit', script: 'audit-model-selection.js' },
  { name: 'Unit Tests', script: 'test-model-selection.js' },
  { name: 'API Tests', script: 'test-api-model-type.js' },
  { name: 'E2E Tests', script: 'test-e2e-model-selection.js' }
];

async function runTest(testInfo) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, testInfo.script);
    const child = spawn('node', [scriptPath], { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });
    
    child.on('close', (code) => {
      resolve({ ...testInfo, exitCode: code });
    });
  });
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       MODEL SELECTION PRINCIPLE - COMPLETE TEST SUITE         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n${'━'.repeat(67)}`);
    console.log(`  Running: ${test.name}`);
    console.log(`${'━'.repeat(67)}\n`);
    
    const result = await runTest(test);
    results.push(result);
    
    if (result.exitCode !== 0) {
      console.log(`\n⚠️  ${test.name} failed with exit code ${result.exitCode}`);
    }
  }
  
  // Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    COMPLETE TEST SUMMARY                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const passed = results.filter(r => r.exitCode === 0);
  const failed = results.filter(r => r.exitCode !== 0);
  
  results.forEach(r => {
    const status = r.exitCode === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`   ${status}  ${r.name}`);
  });
  
  console.log('');
  console.log(`   Total: ${results.length} | Passed: ${passed.length} | Failed: ${failed.length}`);
  console.log('');
  
  if (failed.length === 0) {
    console.log('   🎉 ALL TEST SUITES PASSED!');
    console.log('');
    console.log('   The model selection principle is fully verified:');
    console.log('   • Database layer ✅');
    console.log('   • Model cache layer ✅');
    console.log('   • Prediction service layer ✅');
    console.log('   • API responses ✅');
    console.log('   • Frontend display mapping ✅');
  } else {
    console.log('   ⚠️  Some test suites failed. Please review above.');
  }
  
  console.log('');
  
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
