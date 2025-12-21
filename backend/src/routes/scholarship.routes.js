// =============================================================================
// ISKOlarship - Scholarship Routes
// CRUD operations for scholarships with filtering
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { Scholarship, ScholarshipType, ScholarshipStatus } = require('../models');
const { authMiddleware, optionalAuth, requireRole, requireAdminLevel } = require('../middleware/auth.middleware');

// =============================================================================
// Validation Rules
// =============================================================================

const scholarshipValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 200 }),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 }),
  body('sponsor')
    .trim()
    .notEmpty()
    .withMessage('Sponsor is required'),
  body('type')
    .isIn(Object.values(ScholarshipType))
    .withMessage('Invalid scholarship type'),
  body('applicationDeadline')
    .isISO8601()
    .withMessage('Valid deadline date is required'),
  body('academicYear')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY'),
  body('semester')
    .isIn(['First', 'Second', 'Midyear'])
    .withMessage('Invalid semester')
];

const filterValidation = [
  query('type').optional().isIn(Object.values(ScholarshipType)),
  query('minGWA').optional().isFloat({ min: 1, max: 5 }),
  query('maxGWA').optional().isFloat({ min: 1, max: 5 }),
  query('yearLevel').optional().isString(),
  query('college').optional().isString(),
  query('maxIncome').optional().isNumeric(),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

// =============================================================================
// Public Routes
// =============================================================================

/**
 * @route   GET /api/scholarships
 * @desc    Get all scholarships with filtering
 * @access  Public
 */
router.get('/', filterValidation, optionalAuth, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      type,
      minGWA,
      maxGWA,
      yearLevel,
      college,
      maxIncome,
      search,
      page = 1,
      limit = 20,
      sortBy = 'applicationDeadline',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {
      isActive: true,
      status: ScholarshipStatus.ACTIVE,
      applicationDeadline: { $gte: new Date() }
    };

    // Apply filters
    if (type) {
      query.type = type;
    }

    if (yearLevel) {
      query['eligibilityCriteria.requiredYearLevels'] = { 
        $in: [yearLevel] 
      };
    }

    if (college) {
      query.$or = [
        { 'eligibilityCriteria.eligibleColleges': { $size: 0 } },
        { 'eligibilityCriteria.eligibleColleges': { $in: [college] } }
      ];
    }

    if (maxIncome) {
      query.$or = [
        { 'eligibilityCriteria.maxAnnualFamilyIncome': null },
        { 'eligibilityCriteria.maxAnnualFamilyIncome': { $gte: parseFloat(maxIncome) } }
      ];
    }

    if (minGWA) {
      query.$or = [
        { 'eligibilityCriteria.minGWA': null },
        { 'eligibilityCriteria.minGWA': { $lte: parseFloat(minGWA) } }
      ];
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [scholarships, total] = await Promise.all([
      Scholarship.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Scholarship.countDocuments(query)
    ]);

    // Add computed fields
    const enrichedScholarships = scholarships.map(s => ({
      ...s,
      isExpired: new Date() > new Date(s.applicationDeadline),
      daysUntilDeadline: Math.ceil(
        (new Date(s.applicationDeadline) - new Date()) / (1000 * 60 * 60 * 24)
      ),
      remainingSlots: s.slots ? Math.max(0, s.slots - s.filledSlots) : null
    }));

    res.json({
      success: true,
      data: {
        scholarships: enrichedScholarships,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/scholarships/types
 * @desc    Get scholarship types with counts
 * @access  Public
 */
router.get('/types', async (req, res, next) => {
  try {
    const typeStats = await Scholarship.aggregate([
      {
        $match: {
          isActive: true,
          status: ScholarshipStatus.ACTIVE
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const types = Object.values(ScholarshipType).map(type => ({
      type,
      count: typeStats.find(t => t._id === type)?.count || 0
    }));

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/scholarships/stats
 * @desc    Get scholarship statistics for dashboard
 * @access  Public
 */
router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();

    const [
      totalActive,
      byType,
      upcomingDeadlines,
      totalAmount
    ] = await Promise.all([
      Scholarship.countDocuments({
        isActive: true,
        status: ScholarshipStatus.ACTIVE,
        applicationDeadline: { $gte: now }
      }),
      Scholarship.aggregate([
        { $match: { isActive: true, status: ScholarshipStatus.ACTIVE } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Scholarship.find({
        isActive: true,
        status: ScholarshipStatus.ACTIVE,
        applicationDeadline: { $gte: now }
      })
        .sort({ applicationDeadline: 1 })
        .limit(5)
        .select('name type applicationDeadline sponsor'),
      Scholarship.aggregate([
        { $match: { isActive: true, awardAmount: { $exists: true, $ne: null } } },
        { $group: { _id: null, total: { $sum: '$awardAmount' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalActive,
        byType: byType.reduce((acc, t) => ({ ...acc, [t._id]: t.count }), {}),
        upcomingDeadlines,
        totalFunding: totalAmount[0]?.total || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/scholarships/:id
 * @desc    Get scholarship by ID
 * @access  Public
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid scholarship ID')
], optionalAuth, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const scholarship = await Scholarship.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found'
      });
    }

    // Add computed fields
    const enrichedScholarship = {
      ...scholarship,
      isExpired: new Date() > new Date(scholarship.applicationDeadline),
      daysUntilDeadline: Math.ceil(
        (new Date(scholarship.applicationDeadline) - new Date()) / (1000 * 60 * 60 * 24)
      ),
      remainingSlots: scholarship.slots 
        ? Math.max(0, scholarship.slots - scholarship.filledSlots) 
        : null,
      eligibilitySummary: getEligibilitySummary(scholarship.eligibilityCriteria)
    };

    res.json({
      success: true,
      data: enrichedScholarship
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Admin Routes
// =============================================================================

/**
 * @route   POST /api/scholarships
 * @desc    Create new scholarship
 * @access  Admin
 */
router.post('/', 
  authMiddleware, 
  requireRole('admin'),
  scholarshipValidation,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const scholarship = new Scholarship({
        ...req.body,
        createdBy: req.user._id
      });

      await scholarship.save();

      res.status(201).json({
        success: true,
        message: 'Scholarship created successfully',
        data: scholarship
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/scholarships/:id
 * @desc    Update scholarship
 * @access  Admin
 */
router.put('/:id',
  authMiddleware,
  requireRole('admin'),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const scholarship = await Scholarship.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          lastModifiedBy: req.user._id
        },
        { new: true, runValidators: true }
      );

      if (!scholarship) {
        return res.status(404).json({
          success: false,
          message: 'Scholarship not found'
        });
      }

      res.json({
        success: true,
        message: 'Scholarship updated successfully',
        data: scholarship
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/scholarships/:id
 * @desc    Delete scholarship (soft delete)
 * @access  Admin
 */
router.delete('/:id',
  authMiddleware,
  requireRole('admin'),
  requireAdminLevel('manager'),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const scholarship = await Scholarship.findByIdAndUpdate(
        req.params.id,
        { 
          isActive: false,
          status: ScholarshipStatus.ARCHIVED,
          lastModifiedBy: req.user._id
        },
        { new: true }
      );

      if (!scholarship) {
        return res.status(404).json({
          success: false,
          message: 'Scholarship not found'
        });
      }

      res.json({
        success: true,
        message: 'Scholarship archived successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// Helper Functions
// =============================================================================

function getEligibilitySummary(criteria) {
  if (!criteria) return [];
  
  const summary = [];
  
  if (criteria.minGWA) {
    summary.push(`Minimum GWA: ${criteria.minGWA.toFixed(2)}`);
  }
  if (criteria.requiredYearLevels?.length) {
    summary.push(`Year Level: ${criteria.requiredYearLevels.join(', ')}`);
  }
  if (criteria.eligibleColleges?.length) {
    summary.push(`Colleges: ${criteria.eligibleColleges.length} eligible`);
  }
  if (criteria.maxAnnualFamilyIncome) {
    summary.push(`Max Family Income: ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`);
  }
  if (criteria.requiredSTBrackets?.length) {
    summary.push(`ST Brackets: ${criteria.requiredSTBrackets.join(', ')}`);
  }
  
  return summary;
}

module.exports = router;
