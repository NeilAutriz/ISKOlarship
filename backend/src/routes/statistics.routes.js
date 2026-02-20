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
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const {
  getScholarshipScopeFilter,
  getScopedScholarshipIds
} = require('../middleware/adminScope.middleware');

// =============================================================================
// Platform Statistics
// =============================================================================

/**
 * @route   GET /api/statistics/overview
 * @desc    Get platform-wide statistics (scoped to admin's scholarships)
 * @access  Admin (was previously public — now requires auth)
 */
router.get('/overview', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // Scope all queries to admin's visible scholarships
    const scopeFilter = getScholarshipScopeFilter(req.user);
    const scopedIds = await getScopedScholarshipIds(req.user);

    // Basic counts — scoped
    const [
      totalScholarships,
      totalStudents,
      totalApplications,
      activeScholarships
    ] = await Promise.all([
      Scholarship.countDocuments(scopeFilter),
      User.countDocuments({ role: 'student' }),
      Application.countDocuments({ scholarship: { $in: scopedIds } }),
      Scholarship.countDocuments({ ...scopeFilter, isActive: true, status: 'active' })
    ]);

    // Application status breakdown — scoped
    const applicationStats = await Application.aggregate([
      { $match: { scholarship: { $in: scopedIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const approved = applicationStats.find(s => s._id === 'approved')?.count || 0;
    const rejected = applicationStats.find(s => s._id === 'rejected')?.count || 0;
    const pending = applicationStats.find(s => s._id === 'submitted')?.count || 0;
    const underReview = applicationStats.find(s => s._id === 'under_review')?.count || 0;

    // Calculate success rate
    const totalDecided = approved + rejected;
    const successRate = totalDecided > 0 ? approved / totalDecided : 0;

    // Total funding available — scoped
    const fundingStats = await Scholarship.aggregate([
      { $match: { ...scopeFilter, isActive: true } },
      { 
        $group: { 
          _id: null, 
          totalAmount: { $sum: '$totalGrant' },
          totalSlots: { $sum: '$slots' }
        } 
      }
    ]);

    // Scholarship type distribution — scoped
    const typeDistribution = await Scholarship.aggregate([
      { $match: scopeFilter },
      { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$totalGrant' } } },
      { $sort: { count: -1 } }
    ]);

    // College distribution of applicants — scoped
    const collegeDistribution = await Application.aggregate([
      { $match: { scholarship: { $in: scopedIds } } },
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
 * @access  Admin
 */
router.get('/trends', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // Scope to admin's scholarships
    const scopedIds = await getScopedScholarshipIds(req.user);
    const scopeMatch = { scholarship: { $in: scopedIds } };

    // Applications by academic year — scoped
    const yearlyTrends = await Application.aggregate([
      { $match: scopeMatch },
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

    // Applications by semester — scoped
    const semesterTrends = await Application.aggregate([
      { $match: scopeMatch },
      { 
        $group: { 
          _id: { year: '$academicYear', semester: '$semester' }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { '_id.year': 1, '_id.semester': 1 } }
    ]);

    // GWA distribution of approved applications — scoped
    const gwaDistribution = await Application.aggregate([
      { $match: { ...scopeMatch, status: 'approved' } },
      {
        $bucket: {
          groupBy: '$applicantSnapshot.gwa',
          boundaries: [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0],
          default: 'Other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    // Income distribution of approved applications — scoped
    const incomeDistribution = await Application.aggregate([
      { $match: { ...scopeMatch, status: 'approved' } },
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
 * @access  Admin
 */
router.get('/scholarships', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // Scope to admin's scholarships
    const scopeFilter = getScholarshipScopeFilter(req.user);
    const scopedIds = await getScopedScholarshipIds(req.user);

    // Top scholarships by application count — scoped
    const topByApplications = await Application.aggregate([
      { $match: { scholarship: { $in: scopedIds } } },
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

    // Scholarships by funding amount — scoped
    const byFunding = await Scholarship.aggregate([
      { $match: { ...scopeFilter, isActive: true } },
      { $sort: { totalGrant: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: 1,
          type: 1,
          totalGrant: 1,
          sponsor: 1,
          slots: 1
        }
      }
    ]);

    // Scholarships with upcoming deadlines — scoped
    const upcomingDeadlines = await Scholarship.find({
      ...scopeFilter,
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
 * @access  Admin
 */
router.get('/prediction-accuracy', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // Scope to admin's scholarships
    const scopedIds = await getScopedScholarshipIds(req.user);

    // Get applications with predictions that have final outcomes — scoped
    const applicationsWithPredictions = await Application.find({
      scholarship: { $in: scopedIds },
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
 * @access  Admin
 */
router.get('/analytics', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // Scope to admin's scholarships
    const scopeFilter = getScholarshipScopeFilter(req.user);
    const scopedIds = await getScopedScholarshipIds(req.user);
    const isUniversity = req.user.adminProfile?.accessLevel === 'university';

    // Get cached platform stats (only used for university admins — it's global data)
    const platformStats = isUniversity ? await PlatformStats.findOne({ recordType: 'current' }) : null;
    
    // If no cached stats or non-university admin, calculate scoped stats
    if (!platformStats) {
      // Fallback to calculating scoped stats
      const scopeAppFilter = { scholarship: { $in: scopedIds } };
      const totalApplications = await Application.countDocuments(scopeAppFilter);
      const approved = await Application.countDocuments({ ...scopeAppFilter, status: 'approved' });
      const rejected = await Application.countDocuments({ ...scopeAppFilter, status: 'rejected' });
      const uniqueScholars = await Application.distinct('applicant', { ...scopeAppFilter, status: 'approved' });
      
      const fundingStats = await Scholarship.aggregate([
        { $match: scopeFilter },
        { $group: { _id: null, total: { $sum: '$totalGrant' } } }
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
