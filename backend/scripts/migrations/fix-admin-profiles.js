#!/usr/bin/env node
// =============================================================================
// ISKOlarship - Fix ICS Admin Profile Script
// Updates ICS admin profile with correct scope configuration
// Run with: node scripts/migrations/fix-admin-profiles.js
// =============================================================================

const mongoose = require('mongoose');
require('dotenv').config();

async function fixAdminProfiles() {
  try {
    console.log('🔧 ========== FIX ADMIN PROFILES ==========\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models after connection
    const { User } = require('../../src/models/User.model');

    // =================================================================
    // Find and fix ICS admins
    // =================================================================
    console.log('🖥️  Looking for ICS admins to fix...\n');
    
    // Find admins that might be ICS admins but not properly configured
    const potentialICSAdmins = await User.find({
      role: 'admin',
      $or: [
        { email: { $regex: /ics/i } },
        { 'adminProfile.academicUnitCode': 'ICS' },
        { 'adminProfile.academicUnit': { $regex: /ICS|Computer Science/i } },
        { 'adminProfile.department': { $regex: /ICS|Computer Science/i } }
      ]
    });

    console.log(`Found ${potentialICSAdmins.length} potential ICS admin(s)\n`);

    for (const admin of potentialICSAdmins) {
      const ap = admin.adminProfile || {};
      console.log('----------------------------------------');
      console.log(`📧 Email: ${admin.email}`);
      console.log(`Current profile:`, JSON.stringify(ap, null, 2));
      
      // Check if fix is needed
      const needsFix = 
        ap.accessLevel !== 'academic_unit' ||
        ap.collegeCode !== 'CAS' ||
        ap.academicUnitCode !== 'ICS';
      
      if (needsFix) {
        console.log('\n⚠️  Profile needs fixing...');
        
        // Apply fix
        admin.adminProfile = {
          ...ap,
          accessLevel: 'academic_unit',
          collegeCode: 'CAS',
          academicUnitCode: 'ICS',
          college: 'College of Arts and Sciences',
          academicUnit: 'Institute of Computer Science'
        };
        
        await admin.save();
        
        console.log('✅ Fixed! New profile:', JSON.stringify(admin.adminProfile, null, 2));
      } else {
        console.log('✅ Profile is already correctly configured');
      }
      console.log('');
    }

    // =================================================================
    // Show all admins after fixes
    // =================================================================
    console.log('\n📋 ========== ALL ADMINS AFTER FIXES ==========\n');
    
    const allAdmins = await User.find({ role: 'admin' }).lean();
    
    for (const admin of allAdmins) {
      const ap = admin.adminProfile || {};
      console.log(`${admin.email}:`);
      console.log(`  Level: ${ap.accessLevel || 'NOT SET'}`);
      console.log(`  College: ${ap.collegeCode || 'NOT SET'}`);
      console.log(`  Unit: ${ap.academicUnitCode || 'NOT SET'}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
fixAdminProfiles();
