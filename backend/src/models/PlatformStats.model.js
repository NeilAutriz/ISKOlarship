// =============================================================================
// ISKOlarship - Platform Statistics Model
// Stores aggregated statistics and historical trends for analytics
// =============================================================================

const mongoose = require('mongoose');

// =============================================================================
// Academic Year Statistics Schema
// =============================================================================

const yearlyStatsSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    enum: ['First', 'Second', 'Both'],
    default: 'Both'
  },
  totalApplications: {
    type: Number,
    default: 0
  },
  approvedApplications: {
    type: Number,
    default: 0
  },
  rejectedApplications: {
    type: Number,
    default: 0
  },
  pendingApplications: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 0
  },
  averageGWA: {
    type: Number
  },
  averageIncome: {
    type: Number
  },
  totalFundingDistributed: {
    type: Number,
    default: 0
  },
  uniqueApplicants: {
    type: Number,
    default: 0
  },
  uniqueScholars: {
    type: Number,
    default: 0
  }
}, { _id: false });

// =============================================================================
// College Statistics Schema
// =============================================================================

const collegeStatsSchema = new mongoose.Schema({
  college: {
    type: String,
    required: true
  },
  totalApplications: {
    type: Number,
    default: 0
  },
  approved: {
    type: Number,
    default: 0
  },
  rejected: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 0
  }
}, { _id: false });

// =============================================================================
// Year Level Statistics Schema
// =============================================================================

const yearLevelStatsSchema = new mongoose.Schema({
  yearLevel: {
    type: String,
    enum: ['freshman', 'sophomore', 'junior', 'senior', 'graduate'],
    required: true
  },
  totalApplications: {
    type: Number,
    default: 0
  },
  approved: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 0
  }
}, { _id: false });

// =============================================================================
// GWA Distribution Schema
// =============================================================================

const gwaDistributionSchema = new mongoose.Schema({
  range: {
    type: String, // e.g., "1.0-1.5", "1.5-2.0", etc.
    required: true
  },
  totalApplications: {
    type: Number,
    default: 0
  },
  approved: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 0
  }
}, { _id: false });

// =============================================================================
// Income Distribution Schema
// =============================================================================

const incomeDistributionSchema = new mongoose.Schema({
  bracket: {
    type: String, // e.g., "Below 100k", "100k-200k", etc.
    required: true
  },
  totalApplications: {
    type: Number,
    default: 0
  },
  approved: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 0
  }
}, { _id: false });

// =============================================================================
// Scholarship Type Statistics Schema
// =============================================================================

const typeStatsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['university', 'college', 'government', 'private', 'thesis_grant'],
    required: true
  },
  count: {
    type: Number,
    default: 0
  },
  totalSlots: {
    type: Number,
    default: 0
  },
  totalFunding: {
    type: Number,
    default: 0
  }
}, { _id: false });

// =============================================================================
// Platform Statistics Main Schema
// =============================================================================

const platformStatsSchema = new mongoose.Schema({
  // Unique identifier for this statistics record
  recordType: {
    type: String,
    enum: ['current', 'snapshot'],
    default: 'current'
  },
  
  snapshotDate: {
    type: Date,
    default: Date.now
  },
  
  // Overall Platform Statistics
  overview: {
    totalScholarships: {
      type: Number,
      default: 0
    },
    activeScholarships: {
      type: Number,
      default: 0
    },
    totalApplicationsAllTime: {
      type: Number,
      default: 0
    },
    totalApprovedAllTime: {
      type: Number,
      default: 0
    },
    totalRejectedAllTime: {
      type: Number,
      default: 0
    },
    overallSuccessRate: {
      type: Number,
      default: 0
    },
    averageGWAApproved: {
      type: Number
    },
    averageIncomeApproved: {
      type: Number
    },
    totalStudents: {
      type: Number,
      default: 0
    },
    uniqueScholars: {
      type: Number,
      default: 0
    },
    totalFundingAvailable: {
      type: Number,
      default: 0
    },
    totalFundingDistributed: {
      type: Number,
      default: 0
    }
  },
  
  // Yearly Statistics
  byAcademicYear: [yearlyStatsSchema],
  
  // College Distribution
  byCollege: [collegeStatsSchema],
  
  // Year Level Distribution  
  byYearLevel: [yearLevelStatsSchema],
  
  // GWA Distribution
  byGWA: [gwaDistributionSchema],
  
  // Income Distribution
  byIncome: [incomeDistributionSchema],
  
  // Scholarship Type Distribution
  byType: [typeStatsSchema],
  
  // Model Performance Metrics (Logistic Regression)
  modelMetrics: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number,
    lastTrained: Date,
    trainingDataSize: Number,
    confusionMatrix: {
      truePositive: Number,
      trueNegative: Number,
      falsePositive: Number,
      falseNegative: Number
    }
  }
}, {
  timestamps: true
});

// =============================================================================
// Static Methods
// =============================================================================

// Get or create current statistics record
platformStatsSchema.statics.getCurrent = async function() {
  let current = await this.findOne({ recordType: 'current' });
  if (!current) {
    current = await this.create({ recordType: 'current' });
  }
  return current;
};

// Create a snapshot of current statistics
platformStatsSchema.statics.createSnapshot = async function() {
  const current = await this.getCurrent();
  const snapshot = current.toObject();
  delete snapshot._id;
  snapshot.recordType = 'snapshot';
  snapshot.snapshotDate = new Date();
  return await this.create(snapshot);
};

// =============================================================================
// Instance Methods
// =============================================================================

// Recalculate all statistics from raw data
platformStatsSchema.methods.recalculate = async function(Application, Scholarship, User) {
  // Get all counts
  const totalScholarships = await Scholarship.countDocuments({});
  const activeScholarships = await Scholarship.countDocuments({ 
    isActive: true,
    'applicationPeriod.endDate': { $gte: new Date() }
  });
  
  const totalStudents = await User.countDocuments({ role: 'student' });
  
  // Application aggregations
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
        uniqueApplicants: { $addToSet: '$applicant' }
      }
    }
  ]);
  
  const stats = appStats[0] || { total: 0, approved: 0, rejected: 0, uniqueApplicants: [] };
  
  // Update overview
  this.overview.totalScholarships = totalScholarships;
  this.overview.activeScholarships = activeScholarships;
  this.overview.totalStudents = totalStudents;
  this.overview.totalApplicationsAllTime = stats.total;
  this.overview.totalApprovedAllTime = stats.approved;
  this.overview.totalRejectedAllTime = stats.rejected;
  this.overview.overallSuccessRate = stats.total > 0 
    ? ((stats.approved / stats.total) * 100).toFixed(2) 
    : 0;
  this.overview.uniqueScholars = stats.uniqueApplicants?.length || 0;
  
  // Calculate funding
  const fundingAgg = await Scholarship.aggregate([
    {
      $group: {
        _id: null,
        totalFunding: { $sum: '$amount' },
        totalSlots: { $sum: '$slots' }
      }
    }
  ]);
  
  this.overview.totalFundingAvailable = fundingAgg[0]?.totalFunding || 0;
  
  return await this.save();
};

const PlatformStats = mongoose.model('PlatformStats', platformStatsSchema);

module.exports = { PlatformStats };
