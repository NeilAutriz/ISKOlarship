// =============================================================================
// ISKOlarship - Scholarship Routes
// CRUD operations for scholarships with filtering and admin scope
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { Scholarship, ScholarshipType, ScholarshipLevel, ScholarshipStatus, Application, TrainedModel } = require('../models');
const { authMiddleware, optionalAuth, requireRole, requireAdminLevel } = require('../middleware/auth.middleware');
const { logScholarshipCreate, logScholarshipUpdate, logScholarshipDelete } = require('../services/activityLog.service');
const { 
  attachAdminScope, 
  canManageScholarship, 
  canViewScholarship,
  getScholarshipScopeFilter,
  getAdminScopeSummary 
} = require('../middleware/adminScope.middleware');

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
  body('scholarshipLevel')
    .optional()
    .isIn(Object.values(ScholarshipLevel))
    .withMessage('Invalid scholarship level'),
  body('managingCollege')
    .optional()
    .isString()
    .withMessage('Managing college must be a string'),
  body('managingAcademicUnit')
    .optional()
    .isString()
    .withMessage('Managing academic unit must be a string'),
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

    // Collect $and conditions for filters that need $or (to avoid overwriting)
    const andConditions = [];

    // Apply filters
    if (type) {
      query.type = type;
    }

    if (yearLevel) {
      query['eligibilityCriteria.eligibleClassifications'] = { 
        $in: [yearLevel] 
      };
    }

    if (college) {
      andConditions.push({
        $or: [
          { 'eligibilityCriteria.eligibleColleges': { $size: 0 } },
          { 'eligibilityCriteria.eligibleColleges': { $in: [college] } }
        ]
      });
    }

    if (maxIncome) {
      andConditions.push({
        $or: [
          { 'eligibilityCriteria.maxAnnualFamilyIncome': null },
          { 'eligibilityCriteria.maxAnnualFamilyIncome': { $gte: parseFloat(maxIncome) } }
        ]
      });
    }

    if (minGWA) {
      andConditions.push({
        $or: [
          { 'eligibilityCriteria.minGWA': null },
          { 'eligibilityCriteria.minGWA': { $lte: parseFloat(minGWA) } }
        ]
      });
    }

    // Combine all $or conditions using $and to prevent overwriting
    if (andConditions.length > 0) {
      query.$and = andConditions;
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
        { $match: { isActive: true, totalGrant: { $exists: true, $ne: null } } },
        { $group: { _id: null, total: { $sum: '$totalGrant' } } }
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

// =============================================================================
// Admin Routes - MUST BE BEFORE /:id route to avoid route matching issues
// Express matches routes in order, so /admin must come before /:id
// =============================================================================

/**
 * @route   GET /api/scholarships/admin/scope
 * @desc    Get admin's scope summary for UI display
 * @access  Admin
 */
router.get('/admin/scope',
  authMiddleware,
  requireRole('admin'),
  (req, res) => {
    const scopeSummary = getAdminScopeSummary(req.user);
    res.json({
      success: true,
      data: scopeSummary
    });
  }
);

/**
 * @route   GET /api/scholarships/admin
 * @desc    Get all scholarships (admin view with scope filtering)
 * @access  Admin
 */
router.get('/admin',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
  async (req, res, next) => {
    try {
      
      const {
        status,
        scholarshipLevel,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeExpired = 'false'
      } = req.query;

      // Start with scope filter based on admin level
      const scopeFilter = getScholarshipScopeFilter(req.user);
      
      // CRITICAL: Check if scopeFilter would deny all access
      if (scopeFilter._id && scopeFilter._id.$exists === false) {
        return res.json({
          success: true,
          data: {
            scholarships: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              totalPages: 0
            },
            adminScope: req.adminScope,
            message: 'Your admin profile may not be fully configured. Please contact system administrator to verify your collegeCode and academicUnitCode assignments.'
          }
        });
      }
      
      // Build additional filters
      const query = { ...scopeFilter };

      // Add status filter (admin can see inactive/archived)
      if (status && Object.values(ScholarshipStatus).includes(status)) {
        query.status = status;
      }

      // Filter by scholarship level (within admin's scope)
      if (scholarshipLevel && Object.values(ScholarshipLevel).includes(scholarshipLevel)) {
        query.scholarshipLevel = scholarshipLevel;
      }

      // Include expired scholarships based on query param
      if (includeExpired !== 'true') {
        query.applicationDeadline = { $gte: new Date() };
      }

      // Text search
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sponsor: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [scholarships, total] = await Promise.all([
        Scholarship.find(query)
          .populate('createdBy', 'firstName lastName')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Scholarship.countDocuments(query)
      ]);

      // Add computed fields and permission info
      const enrichedScholarships = scholarships.map(s => ({
        ...s,
        isExpired: new Date() > new Date(s.applicationDeadline),
        daysUntilDeadline: Math.ceil(
          (new Date(s.applicationDeadline) - new Date()) / (1000 * 60 * 60 * 24)
        ),
        remainingSlots: s.slots ? Math.max(0, s.slots - s.filledSlots) : null,
        canManage: canManageScholarship(req.user, s),
        canView: canViewScholarship(req.user, s)
      }));

      res.json({
        success: true,
        data: {
          scholarships: enrichedScholarships,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          },
          adminScope: req.adminScope
        }
      });
    } catch (error) {
      console.error('🚫 Admin scholarships error:', error);
      next(error);
    }
  }
);

// =============================================================================
// Public Routes - Parameterized routes MUST come after static routes
// =============================================================================

/**
 * @route   GET /api/scholarships/:id
 * @desc    Get scholarship by ID (public for students; scope-checked for admin detail)
 * @access  Public (with optional auth)
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

    // SCOPE CHECK: If admin, verify they can view this scholarship
    if (req.user && req.user.role === 'admin') {
      if (!canViewScholarship(req.user, scholarship)) {
        return res.status(403).json({
          success: false,
          message: 'This scholarship is outside your administrative scope'
        });
      }
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

    // Add management flags for admin
    if (req.user && req.user.role === 'admin') {
      enrichedScholarship.canManage = canManageScholarship(req.user, scholarship);
      enrichedScholarship.canView = true;
    }

    res.json({
      success: true,
      data: enrichedScholarship
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Admin Write Routes (POST, PUT, DELETE)
// =============================================================================

/**
 * @route   POST /api/scholarships
 * @desc    Create new scholarship
 * @access  Admin
 */
router.post('/', 
  authMiddleware, 
  requireRole('admin'),
  attachAdminScope,
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

      const adminLevel = req.user.adminProfile?.accessLevel;
      // Use code-based fields for scholarship management
      const adminCollegeCode = req.user.adminProfile?.collegeCode;
      const adminAcademicUnitCode = req.user.adminProfile?.academicUnitCode;

      // STRICT: Require admin level to be set
      if (!adminLevel) {
        return res.status(403).json({
          success: false,
          message: 'Your admin profile is not properly configured',
          hint: 'Please ensure your access level is set in your admin profile'
        });
      }

      // Determine scholarship level and management based on request and admin scope
      let scholarshipLevel = req.body.scholarshipLevel || 'university';
      // Use new code-based fields from request - names will be auto-populated by pre-save hook
      let managingCollegeCode = req.body.managingCollegeCode || null;
      let managingAcademicUnitCode = req.body.managingAcademicUnitCode || null;

      // Validate admin can create scholarships at the requested level
      // CLEAN SEPARATION: Each level can ONLY create at their own level
      switch (adminLevel) {
        case 'university':
          // University admin can create any level scholarship
          break;

        case 'college':
          // CLEAN SEPARATION: College admin can ONLY create college-level scholarships
          if (scholarshipLevel !== 'college') {
            return res.status(403).json({
              success: false,
              message: 'College admins can only create college-level scholarships',
              hint: 'Set scholarshipLevel to "college". Academic unit scholarships should be created by academic unit admins.'
            });
          }
          // Force managing college to admin's college
          managingCollegeCode = adminCollegeCode;
          break;

        case 'academic_unit':
          // Academic unit admin can only create academic_unit level for their unit
          if (scholarshipLevel !== 'academic_unit') {
            return res.status(403).json({
              success: false,
              message: 'Academic unit admins can only create academic unit-level scholarships',
              hint: 'Set scholarshipLevel to "academic_unit"'
            });
          }
          // Force managing college and academic unit to admin's values
          managingCollegeCode = adminCollegeCode;
          managingAcademicUnitCode = adminAcademicUnitCode;
          break;
      }

      // Normalize scholarship type if provided (handle old format -> new format)
      let scholarshipType = req.body.type;
      if (scholarshipType) {
        const typeMapping = {
          'university': 'University Scholarship',
          'college': 'College Scholarship',
          'government': 'Government Scholarship',
          'private': 'Private Scholarship',
          'thesis_grant': 'Thesis/Research Grant',
          'thesis': 'Thesis/Research Grant',
          'research': 'Thesis/Research Grant',
        };
        const normalizedType = scholarshipType.toLowerCase().trim();
        if (typeMapping[normalizedType]) {
          scholarshipType = typeMapping[normalizedType];
        }
      }

      const scholarship = new Scholarship({
        ...req.body,
        type: scholarshipType || req.body.type,
        scholarshipLevel,
        managingCollegeCode,
        managingAcademicUnitCode,
        // Explicitly remove any client-sent name fields - let pre-save hook populate them
        managingCollege: undefined,
        managingAcademicUnit: undefined,
        createdBy: req.user._id
      });

      await scholarship.save();

      // Log scholarship creation (fire-and-forget)
      logScholarshipCreate(req.user, scholarship, req.ip);
      
      res.status(201).json({
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
 * @access  Admin (with scope check)
 */
router.put('/:id',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
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

      // First, fetch the scholarship to check permissions
      const existingScholarship = await Scholarship.findById(req.params.id).lean();

      if (!existingScholarship) {
        return res.status(404).json({
          success: false,
          message: 'Scholarship not found'
        });
      }

      // Check if admin can manage this scholarship
      if (!canManageScholarship(req.user, existingScholarship)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to modify this scholarship',
          details: {
            yourLevel: req.adminScope?.level,
            yourCollege: req.adminScope?.college,
            scholarshipLevel: existingScholarship.scholarshipLevel,
            scholarshipCollege: existingScholarship.managingCollege
          }
        });
      }

      // Prevent changing management fields to values outside admin's scope
      const adminLevel = req.user.adminProfile?.accessLevel;
      
      // STRICT: Require admin level to be set
      if (!adminLevel) {
        return res.status(403).json({
          success: false,
          message: 'Your admin profile is not properly configured'
        });
      }
      
      if (adminLevel !== 'university') {
        // Non-university admins cannot change certain management fields
        delete req.body.scholarshipLevel;
        delete req.body.managingCollege;
        delete req.body.managingCollegeCode;
        delete req.body.managingAcademicUnit;
        delete req.body.managingAcademicUnitCode;
      }

      // Normalize scholarship type if provided (handle old format -> new format)
      if (req.body.type) {
        const typeMapping = {
          'university': 'University Scholarship',
          'college': 'College Scholarship',
          'government': 'Government Scholarship',
          'private': 'Private Scholarship',
          'thesis_grant': 'Thesis/Research Grant',
          'thesis': 'Thesis/Research Grant',
          'research': 'Thesis/Research Grant',
        };
        const normalizedType = req.body.type.toLowerCase().trim();
        if (typeMapping[normalizedType]) {
          req.body.type = typeMapping[normalizedType];
        }
      }

      const scholarship = await Scholarship.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          lastModifiedBy: req.user._id
        },
        { new: true, runValidators: true }
      );

      // Log scholarship update (fire-and-forget)
      logScholarshipUpdate(req.user, scholarship, req.ip);

      res.json({
        data: scholarship
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/scholarships/:id
 * @desc    Permanently delete scholarship and related data
 * @access  Admin (with scope check)
 */
router.delete('/:id',
  authMiddleware,
  requireRole('admin'),
  attachAdminScope,
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      // First, fetch the scholarship to check permissions
      const existingScholarship = await Scholarship.findById(req.params.id).lean();

      if (!existingScholarship) {
        return res.status(404).json({
          success: false,
          message: 'Scholarship not found'
        });
      }

      // Check if admin can manage this scholarship
      if (!canManageScholarship(req.user, existingScholarship)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this scholarship',
          details: {
            yourLevel: req.adminScope?.level,
            scholarshipLevel: existingScholarship.scholarshipLevel
          }
        });
      }

      // Check if scholarship has associated applications
      const applicationCount = await Application.countDocuments({ scholarship: req.params.id });
      
      if (applicationCount > 0) {
        // Soft-delete: archive the scholarship instead of destroying history
        await Scholarship.findByIdAndUpdate(req.params.id, {
          isActive: false,
          status: 'archived',
          $set: { archivedAt: new Date(), archivedBy: req.user._id }
        });

        // Log archive (fire-and-forget)
        logScholarshipDelete(req.user, req.params.id, existingScholarship?.title || existingScholarship?.name || 'Unknown', true, req.ip);
        
        return res.json({
          success: true,
          message: `Scholarship archived (${applicationCount} applications preserved). It will no longer appear in active listings.`
        });
      }

      // No applications — safe to permanently delete
      // Unlink related trained models (set scholarshipId to null)
      await TrainedModel.updateMany(
        { scholarshipId: req.params.id },
        { $set: { scholarshipId: null } }
      );

      // Permanently delete the scholarship
      await Scholarship.findByIdAndDelete(req.params.id);

      // Log permanent delete (fire-and-forget)
      logScholarshipDelete(req.user, req.params.id, existingScholarship?.title || existingScholarship?.name || 'Unknown', false, req.ip);

      res.json({
        success: true,
        message: 'Scholarship deleted successfully'
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
  
  if (criteria.minGWA && criteria.minGWA > 1.0) {
    summary.push(`GWA Range: ${criteria.minGWA.toFixed(2)} to ${(criteria.maxGWA || 5.0).toFixed(2)}`);
  } else if (criteria.maxGWA && criteria.maxGWA < 5.0) {
    summary.push(`Required GWA: ${criteria.maxGWA.toFixed(2)} or better`);
  }
  if (criteria.eligibleClassifications?.length) {
    summary.push(`Year Level: ${criteria.eligibleClassifications.join(', ')}`);
  }
  if (criteria.eligibleColleges?.length) {
    summary.push(`Colleges: ${criteria.eligibleColleges.length} eligible`);
  }
  if (criteria.maxAnnualFamilyIncome) {
    summary.push(`Max Family Income: ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`);
  }
  if (criteria.eligibleSTBrackets?.length) {
    summary.push(`ST Brackets: ${criteria.eligibleSTBrackets.join(', ')}`);
  }
  
  return summary;
}

module.exports = router;
