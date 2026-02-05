/**
 * Model Selection Principle Audit & Cleanup
 * 
 * PRINCIPLE:
 * - If scholarship has ≥30 approved/rejected applications → Use scholarship-specific model
 * - If scholarship has <30 applications → Use global model as fallback
 * 
 * This script:
 * 1. Audits all scholarships against this principle
 * 2. Identifies any misconfigurations
 * 3. Fixes issues by removing invalid scholarship-specific models
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function auditAndCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const { Scholarship, Application, TrainedModel } = require('../../src/models');
    const { TRAINING_CONFIG } = require('../../src/services/trainingService/constants');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           MODEL SELECTION PRINCIPLE AUDIT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\nMinimum samples required for scholarship-specific model: ${TRAINING_CONFIG.minSamplesPerScholarship}`);
    console.log('');
    
    // Get all scholarships
    const scholarships = await Scholarship.find({}).lean();
    
    // Get application counts per scholarship (only approved/rejected)
    const appCounts = await Application.aggregate([
      { $match: { status: { $in: ['approved', 'rejected'] } } },
      { $group: { _id: '$scholarship', count: { $sum: 1 } } }
    ]);
    
    const countMap = {};
    appCounts.forEach(a => { countMap[a._id.toString()] = a.count; });
    
    // Get active scholarship-specific models
    const activeModels = await TrainedModel.find({
      modelType: 'scholarship_specific',
      isActive: true
    }).lean();
    
    const modelMap = {};
    activeModels.forEach(m => { 
      if (m.scholarshipId) modelMap[m.scholarshipId.toString()] = m;
    });
    
    // Check global model exists
    const globalModel = await TrainedModel.findOne({ 
      modelType: 'global', 
      isActive: true 
    }).lean();
    
    console.log('───────────────────────────────────────────────────────────────');
    console.log('                    ANALYSIS RESULTS');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    const issues = [];
    const usingSpecific = [];
    const usingGlobal = [];
    
    for (const s of scholarships) {
      const id = s._id.toString();
      const count = countMap[id] || 0;
      const hasModel = !!modelMap[id];
      const shouldHaveModel = count >= TRAINING_CONFIG.minSamplesPerScholarship;
      
      if (hasModel && !shouldHaveModel) {
        issues.push({ 
          name: s.name, 
          id, 
          count, 
          model: modelMap[id],
          issue: 'HAS_MODEL_BUT_INSUFFICIENT_DATA',
          description: `Has ${count} samples but requires ${TRAINING_CONFIG.minSamplesPerScholarship}. Should use GLOBAL fallback.`
        });
      } else if (!hasModel && shouldHaveModel) {
        issues.push({ 
          name: s.name, 
          id, 
          count, 
          issue: 'MISSING_MODEL_BUT_HAS_DATA',
          description: `Has ${count} samples. Should have a scholarship-specific model trained.`
        });
      } else if (hasModel && shouldHaveModel) {
        usingSpecific.push({ name: s.name, id, count });
      } else {
        usingGlobal.push({ name: s.name, id, count });
      }
    }
    
    // Display issues
    if (issues.length > 0) {
      console.log('❌ ISSUES FOUND:\n');
      issues.forEach((i, idx) => {
        console.log(`   ${idx + 1}. ${i.name}`);
        console.log(`      ID: ${i.id}`);
        console.log(`      Applications: ${i.count}/${TRAINING_CONFIG.minSamplesPerScholarship}`);
        console.log(`      Issue: ${i.issue}`);
        console.log(`      ${i.description}`);
        if (i.model) {
          console.log(`      Model: ${i.model.name}`);
        }
        console.log('');
      });
    } else {
      console.log('✅ NO ISSUES FOUND! All scholarships correctly configured.\n');
    }
    
    // Display correct configurations
    console.log('───────────────────────────────────────────────────────────────');
    console.log('                 CORRECTLY CONFIGURED');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    console.log(`📊 Using Scholarship-Specific Models (${usingSpecific.length}):`);
    usingSpecific.forEach(s => {
      console.log(`   ✅ ${s.name} (${s.count} samples)`);
    });
    
    console.log('');
    console.log(`🌐 Using Global Fallback (${usingGlobal.length}):`);
    usingGlobal.forEach(s => {
      console.log(`   🌐 ${s.name} (${s.count} samples)`);
    });
    
    // Summary
    console.log('\n───────────────────────────────────────────────────────────────');
    console.log('                       SUMMARY');
    console.log('───────────────────────────────────────────────────────────────\n');
    console.log(`Total scholarships:                ${scholarships.length}`);
    console.log(`With sufficient data (≥${TRAINING_CONFIG.minSamplesPerScholarship}):       ${usingSpecific.length}`);
    console.log(`Using global fallback (<${TRAINING_CONFIG.minSamplesPerScholarship}):      ${usingGlobal.length}`);
    console.log(`Issues to fix:                     ${issues.length}`);
    console.log(`Global model available:            ${globalModel ? '✅ Yes' : '❌ No'}`);
    
    // Fix issues if any
    if (issues.length > 0) {
      console.log('\n───────────────────────────────────────────────────────────────');
      console.log('                    FIXING ISSUES');
      console.log('───────────────────────────────────────────────────────────────\n');
      
      for (const issue of issues) {
        if (issue.issue === 'HAS_MODEL_BUT_INSUFFICIENT_DATA' && issue.model) {
          console.log(`🔧 Removing invalid model for: ${issue.name}`);
          await TrainedModel.deleteOne({ _id: issue.model._id });
          console.log(`   ✅ Deleted: ${issue.model.name}`);
          console.log(`   → Will now use GLOBAL model as fallback\n`);
        } else if (issue.issue === 'MISSING_MODEL_BUT_HAS_DATA') {
          console.log(`⚠️  ${issue.name} needs training`);
          console.log(`   Run: npm run train:scholarship ${issue.id}\n`);
        }
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    AUDIT COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    await mongoose.disconnect();
    
    return { issues, usingSpecific, usingGlobal };
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

auditAndCleanup();
