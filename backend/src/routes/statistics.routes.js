// =============================================================================
// ISKOlarship - Statistics Routes
// Analytics and platform statistics endpoints
// =============================================================================

const express = require('express');
const router = express.Router();
const { Scholarship } = require('../models/Scholarship.model');
const { User } = require('../models/User.model');
const { Application } = require('../models/Application.model');
const { PlatformStats } = require('../models/PlatformStats.model');
const { optionalAuth } = require('../middleware/auth.middleware');

// =============================================================================
// Platform Statistics
// =============================================================================

/**
 * @route   GET /api/statistics/overview
 * @desc    Get platform-wide statistics
 * @access  Public
 */
router.get('/overview', async (req, res) => {
  try {
    // Basic counts
    const [
      totalScholarships,
      totalStudents,
      totalApplications,
      activeScholarships
    ] = await Promise.all([
      Scholarship.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Application.countDocuments(),
      Scholarship.countDocuments({ isActive: true, status: 'active' })
    ]);

    // Application status breakdown
    const applicationStats = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const approved = applicationStats.find(s => s._id === 'approved')?.count || 0;
    const rejected = applicationStats.find(s => s._id === 'rejected')?.count || 0;
    const pending = applicationStats.find(s => s._id === 'submitted')?.count || 0;
    const underReview = applicationStats.find(s => s._id === 'under_review')?.count || 0;

    // Calculate success rate
    const totalDecided = approved + rejected;
    const successRate = totalDecided > 0 ? approved / totalDecided : 0;

    // Total funding available
    const fundingStats = await Scholarship.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: null, 
          totalAmount: { $sum: '$awardAmount' },
          totalSlots: { $sum: '$slots' }
        } 
      }
    ]);

    // Scholarship type distribution
    const typeDistribution = await Scholarship.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$awardAmount' } } },
      { $sort: { count: -1 } }
    ]);

    // College distribution of applicants
    const collegeDistribution = await Application.aggregate([
      { $group: { _id: '$applicantSnapshot.college', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalScholarships,
          activeScholarships,
          totalStudents,
          totalApplications,
          approvedApplications: approved,
          rejectedApplications: rejected,
          pendingApplications: pending + underReview,
          successRate: Math.round(successRate * 1000) / 10, // percentage with 1 decimal
        },
        funding: {
          totalAvailable: fundingStats[0]?.totalAmount || 0,
          totalSlots: fundingStats[0]?.totalSlots || 0
        },
        distributions: {
          scholarshipTypes: typeDistribution.map(t => ({
            type: t._id,
            count: t.count,
            totalAmount: t.totalAmount
          })),
          colleges: collegeDistribution.map(c => ({
            college: c._id,
            applications: c.count
          }))
        }
      }
    });
  } catch (error) {
    console.error('Statistics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * @route   GET /api/statistics/trends
 * @desc    Get application trends over time
 * @access  Public
 */
router.get('/trends', async (req, res) => {
  try {
    // Applications by academic year
    const yearlyTrends = await Application.aggregate([
      { 
        $group: { 
          _id: '$academicYear', 
          total: { $sum: 1 },
          approved: { 
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } 
          },
          rejected: { 
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } 
          }
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Applications by semester
    const semesterTrends = await Application.aggregate([
      { 
        $group: { 
          _id: { year: '$academicYear', semester: '$semester' }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { '_id.year': 1, '_id.semester': 1 } }
    ]);

    // GWA distribution of approved applications
    const gwaDistribution = await Application.aggregate([
      { $match: { status: 'approved' } },
      {
        $bucket: {
          groupBy: '$applicantSnapshot.gwa',
          boundaries: [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0],
          default: 'Other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    // Income distribution of approved applications
    const incomeDistribution = await Application.aggregate([
      { $match: { status: 'approved' } },
      {
        $bucket: {
          groupBy: '$applicantSnapshot.annualFamilyIncome',
          boundaries: [0, 100000, 200000, 300000, 400000, 500000, 1000000],
          default: 'Above 1M',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        yearlyTrends: yearlyTrends.map(y => ({
          academicYear: y._id,
          total: y.total,
          approved: y.approved,
          rejected: y.rejected,
          successRate: y.total > 0 ? Math.round((y.approved / y.total) * 100) : 0
        })),
        semesterTrends: semesterTrends.map(s => ({
          academicYear: s._id.year,
          semester: s._id.semester,
          count: s.count
        })),
        gwaDistribution: gwaDistribution.map(g => ({
          range: g._id === 'Other' ? 'Other' : `${g._id} - ${g._id + 0.25}`,
          count: g.count
        })),
        incomeDistribution: incomeDistribution.map(i => ({
          range: i._id === 'Above 1M' ? 'Above ₱1,000,000' : 
                 `₱${i._id.toLocaleString()} - ₱${(i._id + 100000).toLocaleString()}`,
          count: i.count
        }))
      }
    });
  } catch (error) {
    console.error('Statistics trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trends'
    });
  }
});

/**
 * @route   GET /api/statistics/scholarships
 * @desc    Get scholarship-specific statistics
 * @access  Public
 */
router.get('/scholarships', async (req, res) => {
  try {
    // Top scholarships by application count
    const topByApplications = await Application.aggregate([
      { 
        $group: { 
          _id: '$scholarship', 
          applicationCount: { $sum: 1 },
          approvedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } 
          }
        } 
      },
      { $sort: { applicationCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'scholarships',
          localField: '_id',
          foreignField: '_id',
          as: 'scholarshipInfo'
        }
      },
      { $unwind: '$scholarshipInfo' },
      {
        $project: {
          name: '$scholarshipInfo.name',
          type: '$scholarshipInfo.type',
          applicationCount: 1,
          approvedCount: 1,
          successRate: {
            $cond: [
              { $gt: ['$applicationCount', 0] },
              { $multiply: [{ $divide: ['$approvedCount', '$applicationCount'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    // Scholarships by funding amount
    const byFunding = await Scholarship.aggregate([
      { $match: { isActive: true } },
      { $sort: { awardAmount: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: 1,
          type: 1,
          awardAmount: 1,
          sponsor: 1,
          slots: 1
        }
      }
    ]);

    // Scholarships with upcoming deadlines
    const upcomingDeadlines = await Scholarship.find({
      isActive: true,
      applicationDeadline: { $gte: new Date() }
    })
      .sort({ applicationDeadline: 1 })
      .limit(5)
      .select('name type applicationDeadline slots');

    res.json({
      success: true,
      data: {
        topByApplications,
        byFunding,
        upcomingDeadlines
      }
    });
  } catch (error) {
    console.error('Scholarship statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarship statistics'
    });
  }
});

/**
 * @route   GET /api/statistics/prediction-accuracy
 * @desc    Get prediction model accuracy statistics
 * @access  Public
 */
router.get('/prediction-accuracy', async (req, res) => {
  try {
    // Get applications with predictions that have final outcomes
    const applicationsWithPredictions = await Application.find({
      'prediction.probability': { $exists: true },
      status: { $in: ['approved', 'rejected'] }
    }).select('prediction status');

    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    applicationsWithPredictions.forEach(app => {
      const predicted = app.prediction.predictedOutcome === 'approved';
      const actual = app.status === 'approved';

      if (predicted && actual) truePositives++;
      else if (!predicted && !actual) trueNegatives++;
      else if (predicted && !actual) falsePositives++;
      else if (!predicted && actual) falseNegatives++;
    });

    const total = applicationsWithPredictions.length;
    const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;
    const precision = (truePositives + falsePositives) > 0 
      ? truePositives / (truePositives + falsePositives) : 0;
    const recall = (truePositives + falseNegatives) > 0 
      ? truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = (precision + recall) > 0 
      ? 2 * (precision * recall) / (precision + recall) : 0;

    res.json({
      success: true,
      data: {
        totalPredictions: total,
        confusionMatrix: {
          truePositives,
          trueNegatives,
          falsePositives,
          falseNegatives
        },
        metrics: {
          accuracy: Math.round(accuracy * 1000) / 10,
          precision: Math.round(precision * 1000) / 10,
          recall: Math.round(recall * 1000) / 10,
          f1Score: Math.round(f1Score * 1000) / 10
        }
      }
    });
  } catch (error) {
    console.error('Prediction accuracy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prediction accuracy'
    });
  }
});

/**
 * @route   GET /api/statistics/analytics
 * @desc    Get comprehensive analytics data for the Analytics page
 * @access  Public
 */
router.get('/analytics', async (req, res) => {
  try {
    // Get cached platform stats
    const platformStats = await PlatformStats.findOne({ recordType: 'current' });
    
    // If no cached stats, calculate on the fly
    if (!platformStats) {
      // Fallback to calculating stats
      const totalApplications = await Application.countDocuments();
      const approved = await Application.countDocuments({ status: 'approved' });
      const rejected = await Application.countDocuments({ status: 'rejected' });
      const uniqueScholars = await Application.distinct('applicant', { status: 'approved' });
      
      const fundingStats = await Scholarship.aggregate([
        { $group: { _id: null, total: { $sum: '$awardAmount' } } }
      ]);
      
      return res.json({
        success: true,
        data: {
          platformStatistics: {
            totalApplications,
            totalApprovedAllTime: approved,
            totalRejectedAllTime: rejected,
            overallSuccessRate: totalApplications > 0 ? approved / totalApplications : 0,
            uniqueScholars: uniqueScholars.length,
            totalFunding: fundingStats[0]?.total || 0
          },
          yearlyTrends: [],
          collegeStats: [],
          gwaStats: [],
          incomeStats: [],
          yearLevelStats: [],
          typeStats: []
        }
      });
    }
    
    // Return cached comprehensive stats
    res.json({
      success: true,
      data: {
        platformStatistics: {
          totalApplications: platformStats.overview.totalApplicationsAllTime,
          totalApprovedAllTime: platformStats.overview.totalApprovedAllTime,
          totalRejectedAllTime: platformStats.overview.totalRejectedAllTime,
          overallSuccessRate: platformStats.overview.overallSuccessRate / 100, // Convert to decimal
          averageGWAApproved: platformStats.overview.averageGWAApproved,
          averageIncomeApproved: platformStats.overview.averageIncomeApproved,
          uniqueScholars: platformStats.overview.uniqueScholars,
          totalFunding: platformStats.overview.totalFundingAvailable,
          totalStudents: platformStats.overview.totalStudents,
          totalScholarships: platformStats.overview.totalScholarships,
          activeScholarships: platformStats.overview.activeScholarships
        },
        yearlyTrends: platformStats.byAcademicYear || [],
        collegeStats: platformStats.byCollege || [],
        gwaStats: platformStats.byGWA || [],
        incomeStats: platformStats.byIncome || [],
        yearLevelStats: platformStats.byYearLevel || [],
        typeStats: platformStats.byType || [],
        modelMetrics: platformStats.modelMetrics || null,
        lastUpdated: platformStats.snapshotDate
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

module.exports = router;
