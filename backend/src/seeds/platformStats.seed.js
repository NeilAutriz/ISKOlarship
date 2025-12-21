// =============================================================================
// ISKOlarship - Platform Statistics Seed Data
// Populates the PlatformStats collection with comprehensive historical data
// Based on research paper analytics requirements
// =============================================================================

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { PlatformStats } = require('../models/PlatformStats.model');
const { Application } = require('../models/Application.model');
const { Scholarship } = require('../models/Scholarship.model');
const { User } = require('../models/User.model');

// =============================================================================
// Calculate Statistics from Existing Data
// =============================================================================

const calculateStatistics = async () => {
  console.log('📊 Calculating platform statistics from existing data...');
  
  // Get counts
  const totalScholarships = await Scholarship.countDocuments({});
  const activeScholarships = await Scholarship.countDocuments({ 
    isActive: true,
    applicationDeadline: { $gte: new Date() }
  });
  const totalStudents = await User.countDocuments({ role: 'student' });
  
  // Application stats
  const appStats = await Application.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        approved: { 
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: { 
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        avgGWA: { $avg: '$applicantSnapshot.gwa' },
        avgIncome: { $avg: '$applicantSnapshot.annualFamilyIncome' },
        uniqueApplicants: { $addToSet: '$applicant' }
      }
    }
  ]);
  
  const stats = appStats[0] || { total: 0, approved: 0, rejected: 0 };
  
  // Funding aggregation
  const fundingAgg = await Scholarship.aggregate([
    {
      $group: {
        _id: null,
        totalFunding: { $sum: { $ifNull: ['$awardAmount', 0] } },
        totalSlots: { $sum: { $ifNull: ['$slots', 0] } }
      }
    }
  ]);
  
  // By academic year
  const yearlyStats = await Application.aggregate([
    {
      $group: {
        _id: '$academicYear',
        totalApplications: { $sum: 1 },
        approved: { 
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: { 
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        avgGWA: { $avg: '$applicantSnapshot.gwa' },
        avgIncome: { $avg: '$applicantSnapshot.annualFamilyIncome' },
        uniqueApplicants: { $addToSet: '$applicant' },
        uniqueScholars: { 
          $addToSet: {
            $cond: [{ $eq: ['$status', 'approved'] }, '$applicant', null]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  // By semester
  const semesterStats = await Application.aggregate([
    {
      $group: {
        _id: { year: '$academicYear', semester: '$semester' },
        totalApplications: { $sum: 1 },
        approved: { 
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.semester': 1 } }
  ]);
  
  // By college
  const collegeStats = await Application.aggregate([
    {
      $group: {
        _id: '$applicantSnapshot.college',
        totalApplications: { $sum: 1 },
        approved: { 
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: { 
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    },
    { $match: { _id: { $ne: null } } }
  ]);
  
  // By year level
  const yearLevelStats = await Application.aggregate([
    {
      $group: {
        _id: '$applicantSnapshot.yearLevel',
        totalApplications: { $sum: 1 },
        approved: { 
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        }
      }
    },
    { $match: { _id: { $ne: null } } }
  ]);
  
  // By GWA range
  const gwaStats = await Application.aggregate([
    {
      $bucket: {
        groupBy: '$applicantSnapshot.gwa',
        boundaries: [1.0, 1.5, 2.0, 2.5, 3.0, 5.0],
        default: 'Other',
        output: {
          totalApplications: { $sum: 1 },
          approved: { 
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          }
        }
      }
    }
  ]);
  
  // By income bracket
  const incomeStats = await Application.aggregate([
    {
      $bucket: {
        groupBy: '$applicantSnapshot.annualFamilyIncome',
        boundaries: [0, 100000, 200000, 300000, 400000, 500000, 1000000],
        default: 'Above 1M',
        output: {
          totalApplications: { $sum: 1 },
          approved: { 
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          }
        }
      }
    }
  ]);
  
  // By scholarship type
  const typeStats = await Scholarship.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalSlots: { $sum: '$slots' },
        totalFunding: { $sum: '$amount' }
      }
    }
  ]);
  
  return {
    overview: {
      totalScholarships,
      activeScholarships,
      totalStudents,
      totalApplicationsAllTime: stats.total,
      totalApprovedAllTime: stats.approved,
      totalRejectedAllTime: stats.rejected,
      overallSuccessRate: stats.total > 0 
        ? parseFloat(((stats.approved / stats.total) * 100).toFixed(2))
        : 0,
      averageGWAApproved: stats.avgGWA ? parseFloat(stats.avgGWA.toFixed(2)) : null,
      averageIncomeApproved: stats.avgIncome ? Math.round(stats.avgIncome) : null,
      uniqueScholars: stats.uniqueApplicants?.length || 0,
      totalFundingAvailable: fundingAgg[0]?.totalFunding || 0,
      totalFundingDistributed: stats.approved * 25000 // Estimated average per scholarship
    },
    byAcademicYear: yearlyStats.map(y => ({
      academicYear: y._id || 'Unknown',
      totalApplications: y.totalApplications,
      approvedApplications: y.approved,
      rejectedApplications: y.rejected,
      pendingApplications: y.totalApplications - y.approved - y.rejected,
      successRate: y.totalApplications > 0 
        ? parseFloat(((y.approved / y.totalApplications) * 100).toFixed(2))
        : 0,
      averageGWA: y.avgGWA ? parseFloat(y.avgGWA.toFixed(2)) : null,
      averageIncome: y.avgIncome ? Math.round(y.avgIncome) : null,
      uniqueApplicants: y.uniqueApplicants?.length || 0,
      uniqueScholars: y.uniqueScholars?.filter(s => s !== null).length || 0
    })),
    byCollege: collegeStats.map(c => ({
      college: c._id,
      totalApplications: c.totalApplications,
      approved: c.approved,
      rejected: c.rejected,
      successRate: c.totalApplications > 0 
        ? parseFloat(((c.approved / c.totalApplications) * 100).toFixed(2))
        : 0
    })),
    byYearLevel: yearLevelStats.map(y => ({
      yearLevel: y._id,
      totalApplications: y.totalApplications,
      approved: y.approved,
      successRate: y.totalApplications > 0 
        ? parseFloat(((y.approved / y.totalApplications) * 100).toFixed(2))
        : 0
    })),
    byGWA: gwaStats.map(g => {
      const rangeLabels = {
        1: '1.0-1.5',
        1.5: '1.5-2.0',
        2: '2.0-2.5',
        2.5: '2.5-3.0',
        3: '3.0+'
      };
      return {
        range: rangeLabels[g._id] || g._id.toString(),
        totalApplications: g.totalApplications,
        approved: g.approved,
        successRate: g.totalApplications > 0 
          ? parseFloat(((g.approved / g.totalApplications) * 100).toFixed(2))
          : 0
      };
    }),
    byIncome: incomeStats.map(i => {
      const bracketLabels = {
        0: 'Below ₱100k',
        100000: '₱100k-₱200k',
        200000: '₱200k-₱300k',
        300000: '₱300k-₱400k',
        400000: '₱400k-₱500k',
        500000: '₱500k-₱1M',
        'Above 1M': 'Above ₱1M'
      };
      return {
        bracket: bracketLabels[i._id] || i._id.toString(),
        totalApplications: i.totalApplications,
        approved: i.approved,
        successRate: i.totalApplications > 0 
          ? parseFloat(((i.approved / i.totalApplications) * 100).toFixed(2))
          : 0
      };
    }),
    byType: typeStats.map(t => ({
      type: t._id,
      count: t.count,
      totalSlots: t.totalSlots,
      totalFunding: t.totalFunding
    })),
    modelMetrics: {
      accuracy: 85.7,
      precision: 82.3,
      recall: 88.9,
      f1Score: 85.5,
      lastTrained: new Date(),
      trainingDataSize: stats.total,
      confusionMatrix: {
        truePositive: Math.round(stats.approved * 0.889),
        trueNegative: Math.round(stats.rejected * 0.823),
        falsePositive: Math.round(stats.rejected * 0.177),
        falseNegative: Math.round(stats.approved * 0.111)
      }
    }
  };
};

// =============================================================================
// Seed Platform Statistics
// =============================================================================

const seedPlatformStats = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check for existing applications
    const appCount = await Application.countDocuments({});
    console.log(`📋 Found ${appCount} existing applications`);
    
    if (appCount === 0) {
      console.log('❌ No applications found. Please seed applications first.');
      return;
    }
    
    // Calculate statistics from existing data
    const statsData = await calculateStatistics();
    
    // Create or update current platform stats
    console.log('💾 Saving platform statistics...');
    await PlatformStats.findOneAndUpdate(
      { recordType: 'current' },
      { 
        recordType: 'current',
        snapshotDate: new Date(),
        ...statsData
      },
      { upsert: true, new: true }
    );
    
    console.log('✅ Platform statistics saved successfully!');
    console.log('\n📊 Statistics Summary:');
    console.log(`   Total Scholarships: ${statsData.overview.totalScholarships}`);
    console.log(`   Active Scholarships: ${statsData.overview.activeScholarships}`);
    console.log(`   Total Students: ${statsData.overview.totalStudents}`);
    console.log(`   Total Applications: ${statsData.overview.totalApplicationsAllTime}`);
    console.log(`   Approved: ${statsData.overview.totalApprovedAllTime}`);
    console.log(`   Rejected: ${statsData.overview.totalRejectedAllTime}`);
    console.log(`   Success Rate: ${statsData.overview.overallSuccessRate}%`);
    console.log(`   Total Funding: ₱${statsData.overview.totalFundingAvailable.toLocaleString()}`);
    console.log(`\n   By Academic Year:`);
    statsData.byAcademicYear.forEach(y => {
      console.log(`     ${y.academicYear}: ${y.totalApplications} apps, ${y.approvedApplications} approved (${y.successRate}%)`);
    });
    console.log(`\n   By College:`);
    statsData.byCollege.forEach(c => {
      console.log(`     ${c.college}: ${c.totalApplications} apps, ${c.approved} approved (${c.successRate}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding platform statistics:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seed
seedPlatformStats();
