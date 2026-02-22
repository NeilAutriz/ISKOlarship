// =============================================================================
// ISKOlarship - Activity Log Routes
// GET endpoints for viewing activity logs (student + admin)
// =============================================================================

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const { ActivityLog } = require('../models/ActivityLog.model');

// All activity log routes require authentication
router.use(authMiddleware);

// =============================================================================
// GET /api/activity-logs/my
// Get the current user's own activity logs (student or admin)
// =============================================================================
router.get('/my', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };

    // Optional action type filter
    if (req.query.action) {
      filter.action = req.query.action;
    }

    // Optional date range
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('[ActivityLog] GET /my error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
});

// =============================================================================
// GET /api/activity-logs/all
// Get all activity logs across the platform (admin only)
// =============================================================================
router.get('/all', requireRole('admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by role
    if (req.query.role && ['student', 'admin'].includes(req.query.role)) {
      filter.userRole = req.query.role;
    }

    // Filter by action type
    if (req.query.action) {
      filter.action = req.query.action;
    }

    // Filter by specific user
    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    // Search by name, email, or description
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { userName: searchRegex },
        { userEmail: searchRegex },
        { description: searchRegex },
        { targetName: searchRegex },
      ];
    }

    // Date range
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('[ActivityLog] GET /all error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
});

// =============================================================================
// GET /api/activity-logs/stats
// Get activity statistics (admin only)
// =============================================================================
router.get('/stats', requireRole('admin'), async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, totalCount, recentByAction, recentByRole] = await Promise.all([
      ActivityLog.countDocuments({ createdAt: { $gte: today } }),
      ActivityLog.countDocuments({ createdAt: { $gte: weekAgo } }),
      ActivityLog.countDocuments(),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: '$userRole', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        today: todayCount,
        thisWeek: weekCount,
        total: totalCount,
        topActions: recentByAction.reduce((acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        }, {}),
        byRole: recentByRole.reduce((acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    console.error('[ActivityLog] GET /stats error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch activity stats' });
  }
});

module.exports = router;
