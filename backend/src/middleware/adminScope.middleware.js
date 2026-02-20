// =============================================================================
// ISKOlarship - Admin Scope Middleware
// Filters data visibility based on admin level (University, College, Academic Unit)
// Uses UPLB organizational codes (collegeCode, academicUnitCode)
// =============================================================================

const { isDepartmentInCollege } = require('../models/UPLBStructure');

/**
 * Admin Visibility Rules (CLEAN SEPARATION):
 * 
 * | Admin Level    | Can See & Manage                                          |
 * |----------------|-----------------------------------------------------------|
 * | University     | ALL scholarships (university, college, academic_unit, external) |
 * | College        | ONLY scholarshipLevel: 'college' for their college        |
 * | Academic Unit  | ONLY scholarshipLevel: 'academic_unit' for their unit     |
 * 
 * This is a CLEAN SEPARATION where:
 * - College admins handle college-wide scholarships ONLY (NOT academic unit ones)
 * - Academic Unit admins handle their specific unit scholarships ONLY
 * - University admins have full oversight of everything
 */

/**
 * Build scholarship query filter based on admin's scope
 * Uses CLEAN SEPARATION - each level ONLY sees their own level
 * @param {Object} user - The authenticated admin user
 * @returns {Object} MongoDB query filter for scholarships
 */
function getScholarshipScopeFilter(user) {
  if (!user || user.role !== 'admin') {
    return { _id: { $exists: false } }; // Return nothing for non-admins
  }

  const adminLevel = user.adminProfile?.accessLevel;
  // Use new code-based fields
  const adminCollegeCode = user.adminProfile?.collegeCode || null;
  const adminAcademicUnitCode = user.adminProfile?.academicUnitCode || null;
  // Legacy fields for backward compatibility
  const adminCollege = user.adminProfile?.college || null;
  const adminAcademicUnit = user.adminProfile?.academicUnit || null;

  // STRICT CHECK: If admin level is not explicitly 'university', require proper assignment
  if (!adminLevel) {
    return { _id: { $exists: false } };
  }

  switch (adminLevel) {
    case 'university':
      // University admins can see ALL scholarships
      return {};

    case 'college':
      // College admins see ONLY college-level scholarships for their college
      if (!adminCollegeCode && !adminCollege) {
        return { _id: { $exists: false } };
      }
      
      const collegeFilter = {
        scholarshipLevel: 'college',
        managingCollegeCode: adminCollegeCode
      };
      return collegeFilter;

    case 'academic_unit':
      // Academic Unit admins see ONLY their specific unit's scholarships
      if (!adminCollegeCode || !adminAcademicUnitCode) {
        return { _id: { $exists: false } };
      }
      
      const unitFilter = {
        scholarshipLevel: 'academic_unit',
        managingCollegeCode: adminCollegeCode,
        managingAcademicUnitCode: adminAcademicUnitCode
      };
      return unitFilter;

    default:
      // Unknown admin level - deny access
      return { _id: { $exists: false } };
  }
}

/**
 * Build application query filter based on admin's scholarship scope
 * @param {Object} user - The authenticated admin user
 * @param {Array} scholarshipIds - Optional: pre-filtered scholarship IDs
 * @returns {Object} MongoDB query filter for applications
 */
function getApplicationScopeFilter(user, scholarshipIds = null) {
  if (!user || user.role !== 'admin') {
    return { _id: { $exists: false } };
  }

  const adminLevel = user.adminProfile?.accessLevel;

  // If no admin level set, deny access
  if (!adminLevel) {
    return { _id: { $exists: false } };
  }

  // University admins see all applications
  if (adminLevel === 'university') {
    return scholarshipIds ? { scholarship: { $in: scholarshipIds } } : {};
  }

  // For college/academic_unit admins, MUST filter by scholarship IDs
  if (scholarshipIds && scholarshipIds.length > 0) {
    return { scholarship: { $in: scholarshipIds } };
  }

  // If no scholarship IDs provided, return empty result
  return { _id: { $exists: false } };
}

/**
 * Middleware to attach scope filters to request
 * Use this before routes that need admin scoping
 */
function attachAdminScope(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    const adminProfile = req.user.adminProfile || {};
    const accessLevel = adminProfile.accessLevel;
    
    req.adminScope = {
      level: accessLevel || null,
      // New code-based fields
      collegeCode: adminProfile.collegeCode || null,
      academicUnitCode: adminProfile.academicUnitCode || null,
      // Legacy fields
      college: adminProfile.college || null,
      academicUnit: adminProfile.academicUnit || null,
      scholarshipFilter: getScholarshipScopeFilter(req.user),
      isUniversityLevel: accessLevel === 'university',
      isCollegeLevel: accessLevel === 'college',
      isAcademicUnitLevel: accessLevel === 'academic_unit'
    };
    
  }
  next();
}

/**
 * Check if admin can manage a specific scholarship
 * CLEAN SEPARATION: Admins can only manage scholarships at their own level
 * @param {Object} user - The authenticated admin user
 * @param {Object} scholarship - The scholarship document
 * @returns {boolean} Whether admin can manage this scholarship
 */
function canManageScholarship(user, scholarship) {
  if (!user || user.role !== 'admin' || !scholarship) {
    return false;
  }

  const adminLevel = user.adminProfile?.accessLevel;
  
  // STRICT: No access level means no access
  if (!adminLevel) {
    return false;
  }
  const adminCollegeCode = user.adminProfile?.collegeCode;
  const adminAcademicUnitCode = user.adminProfile?.academicUnitCode;
  // Legacy fields for backward compatibility
  const adminCollege = user.adminProfile?.college;
  const adminAcademicUnit = user.adminProfile?.academicUnit;

  // Scholarship's scope
  const scholarshipLevel = scholarship.scholarshipLevel;
  const scholarshipCollegeCode = scholarship.managingCollegeCode;
  const scholarshipAcademicUnitCode = scholarship.managingAcademicUnitCode;
  const scholarshipCollege = scholarship.managingCollege;
  const scholarshipAcademicUnit = scholarship.managingAcademicUnit;

  switch (adminLevel) {
    case 'university':
      // University admins can manage all scholarships
      return true;

    case 'college':
      // College admins can ONLY manage college-level scholarships for their college
      // They CANNOT manage academic_unit level scholarships
      if (scholarshipLevel !== 'college') {
        return false;
      }
      // Check using codes first, then legacy fields
      if (scholarshipCollegeCode && adminCollegeCode) {
        return scholarshipCollegeCode === adminCollegeCode;
      }
      return scholarshipCollege === adminCollege;

    case 'academic_unit':
      // Academic unit admins can ONLY manage their unit's scholarships
      if (scholarshipLevel !== 'academic_unit') {
        return false;
      }
      // Check using codes first
      if (scholarshipCollegeCode && scholarshipAcademicUnitCode && adminCollegeCode && adminAcademicUnitCode) {
        return scholarshipCollegeCode === adminCollegeCode && 
               scholarshipAcademicUnitCode === adminAcademicUnitCode;
      }
      // Fall back to legacy fields
      return scholarshipCollege === adminCollege && 
             scholarshipAcademicUnit === adminAcademicUnit;

    default:
      return false;
  }
}

/**
 * Check if admin can manage a specific application
 * @param {Object} user - The authenticated admin user  
 * @param {Object} application - The application document (with populated scholarship)
 * @returns {boolean} Whether admin can manage this application
 */
function canManageApplication(user, application) {
  if (!user || user.role !== 'admin' || !application) {
    return false;
  }

  // Need scholarship info to determine scope
  const scholarship = application.scholarship;
  if (!scholarship) {
    return user.adminProfile?.accessLevel === 'university'; // Only university admin if no scholarship info
  }

  return canManageScholarship(user, scholarship);
}

/**
 * Middleware to verify admin can access the requested scholarship
 */
function requireScholarshipAccess() {
  return async (req, res, next) => {
    try {
      const { Scholarship } = require('../models');
      const scholarshipId = req.params.id || req.params.scholarshipId || req.body.scholarshipId;
      
      if (!scholarshipId) {
        return next(); // No scholarship to check
      }

      const scholarship = await Scholarship.findById(scholarshipId).lean();
      
      if (!scholarship) {
        return res.status(404).json({
          success: false,
          message: 'Scholarship not found'
        });
      }

      // Check if admin can view (not necessarily manage) this scholarship
      const canView = canViewScholarship(req.user, scholarship);
      
      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this scholarship',
          details: {
            yourLevel: req.user.adminProfile?.accessLevel,
            scholarshipLevel: scholarship.scholarshipLevel,
            requiredCollege: scholarship.managingCollege,
            requiredAcademicUnit: scholarship.managingAcademicUnit
          }
        });
      }

      req.scholarship = scholarship;
      req.canManage = canManageScholarship(req.user, scholarship);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if admin can view (same as manage in CLEAN SEPARATION)
 * In clean separation, view = manage for each level
 */
function canViewScholarship(user, scholarship) {
  if (!user || user.role !== 'admin' || !scholarship) {
    return false;
  }

  const adminLevel = user.adminProfile?.accessLevel;
  
  // STRICT: No access level means no access
  if (!adminLevel) {
    return false;
  }
  const adminCollegeCode = user.adminProfile?.collegeCode;
  const adminAcademicUnitCode = user.adminProfile?.academicUnitCode;
  const adminCollege = user.adminProfile?.college;
  const adminAcademicUnit = user.adminProfile?.academicUnit;

  const scholarshipLevel = scholarship.scholarshipLevel;
  const scholarshipCollegeCode = scholarship.managingCollegeCode;
  const scholarshipAcademicUnitCode = scholarship.managingAcademicUnitCode;
  const scholarshipCollege = scholarship.managingCollege;
  const scholarshipAcademicUnit = scholarship.managingAcademicUnit;

  switch (adminLevel) {
    case 'university':
      return true; // Can view all

    case 'college':
      // College admins can ONLY view college-level scholarships for their college
      if (scholarshipLevel !== 'college') {
        return false;
      }
      // Check codes first
      if (scholarshipCollegeCode && adminCollegeCode) {
        return scholarshipCollegeCode === adminCollegeCode;
      }
      return scholarshipCollege === adminCollege;

    case 'academic_unit':
      // Academic unit admins can ONLY view their unit's scholarships
      if (scholarshipLevel !== 'academic_unit') {
        return false;
      }
      // Check codes first
      if (scholarshipCollegeCode && scholarshipAcademicUnitCode && adminCollegeCode && adminAcademicUnitCode) {
        return scholarshipCollegeCode === adminCollegeCode && 
               scholarshipAcademicUnitCode === adminAcademicUnitCode;
      }
      return scholarshipCollege === adminCollege && 
             scholarshipAcademicUnit === adminAcademicUnit;

    default:
      return false;
  }
}

/**
 * Get admin scope summary for debugging/display
 * Updated for CLEAN SEPARATION design
 */
function getAdminScopeSummary(user) {
  if (!user || user.role !== 'admin') {
    return null;
  }

  const adminLevel = user.adminProfile?.accessLevel;
  
  // STRICT: Return minimal info if no access level set
  if (!adminLevel) {
    return {
      level: null,
      levelDisplay: 'Unconfigured Admin',
      collegeCode: null,
      academicUnitCode: null,
      college: null,
      academicUnit: null,
      canManage: { university: false, college: false, academic_unit: false, external: false },
      canView: { university: false, college: false, academic_unit: false, external: false },
      description: 'Your admin profile is not fully configured. Please contact system administrator.'
    };
  }
  const adminCollegeCode = user.adminProfile?.collegeCode;
  const adminAcademicUnitCode = user.adminProfile?.academicUnitCode;
  const adminCollege = user.adminProfile?.college;
  const adminAcademicUnit = user.adminProfile?.academicUnit;

  const levelLabels = {
    'university': 'University',
    'college': 'College',
    'academic_unit': 'Academic Unit'
  };

  // CLEAN SEPARATION: each level can only manage their specific level
  const canManageByLevel = {
    university: adminLevel === 'university',
    college: adminLevel === 'university' || adminLevel === 'college',
    academic_unit: adminLevel === 'university' || adminLevel === 'academic_unit',
    external: adminLevel === 'university'
  };

  // CLEAN SEPARATION: view = manage for each level
  const canViewByLevel = {
    university: adminLevel === 'university',
    college: adminLevel === 'university' || adminLevel === 'college',
    academic_unit: adminLevel === 'university' || adminLevel === 'academic_unit',
    external: adminLevel === 'university'
  };

  return {
    level: adminLevel,
    levelDisplay: `${levelLabels[adminLevel] || 'Unknown'} Admin`,
    collegeCode: adminCollegeCode || null,
    academicUnitCode: adminAcademicUnitCode || null,
    college: adminCollege || null,
    academicUnit: adminAcademicUnit || null,
    canManage: canManageByLevel,
    canView: canViewByLevel,
    description: getAdminScopeDescription(adminLevel, adminCollegeCode, adminAcademicUnitCode, adminCollege, adminAcademicUnit)
  };
}

function getAdminScopeDescription(adminLevel, collegeCode, academicUnitCode, college, academicUnit) {
  switch (adminLevel) {
    case 'university':
      return 'You can view and manage all scholarships across the university.';
    case 'college':
      const collegeName = college || collegeCode || 'your college';
      return `You manage college-level scholarships for ${collegeName} only.`;
    case 'academic_unit':
      const unitName = academicUnit || academicUnitCode || 'your academic unit';
      const colName = college || collegeCode || 'your college';
      return `You manage scholarships for ${unitName} (${colName}) only.`;
    default:
      return 'Limited access.';
  }
}

/**
 * Get IDs of all scholarships within admin's scope.
 * Utility for routes that need to scope other resources (statistics, users, models).
 * @param {Object} user - The authenticated admin user
 * @returns {Promise<Array>} Array of scholarship ObjectIds
 */
async function getScopedScholarshipIds(user) {
  const { Scholarship } = require('../models');
  const scopeFilter = getScholarshipScopeFilter(user);
  // If filter denies all access, return empty
  if (scopeFilter._id && scopeFilter._id.$exists === false) {
    return [];
  }
  const scholarships = await Scholarship.find(scopeFilter).select('_id').lean();
  return scholarships.map(s => s._id);
}

/**
 * Check if admin can manage a trained model.
 * Global models → university only. Scholarship-specific → check scholarship scope.
 * @param {Object} user - The authenticated admin user
 * @param {Object} model - The TrainedModel document (with populated scholarshipId or plain)
 * @returns {boolean}
 */
function canManageTrainedModel(user, model) {
  if (!user || user.role !== 'admin' || !model) return false;
  const adminLevel = user.adminProfile?.accessLevel;
  if (!adminLevel) return false;

  // Global model — university admin only
  if (!model.scholarshipId || model.modelType === 'global') {
    return adminLevel === 'university';
  }

  // Scholarship-specific model — check via linked scholarship
  const scholarship = typeof model.scholarshipId === 'object' ? model.scholarshipId : null;
  if (!scholarship) {
    // scholarshipId not populated — only university admin can proceed without scholarship data
    return adminLevel === 'university';
  }
  return canManageScholarship(user, scholarship);
}

module.exports = {
  getScholarshipScopeFilter,
  getApplicationScopeFilter,
  attachAdminScope,
  canManageScholarship,
  canViewScholarship,
  canManageApplication,
  requireScholarshipAccess,
  getAdminScopeSummary,
  getScopedScholarshipIds,
  canManageTrainedModel
};
