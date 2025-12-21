// =============================================================================
// ISKOlarship - Models Index
// Central export for all MongoDB models
// =============================================================================

const { User, UserRole, YearLevel, UPLBCollege, STBracket, AdminAccessLevel } = require('./User.model');
const { Scholarship, ScholarshipType, ScholarshipStatus } = require('./Scholarship.model');
const { Application, ApplicationStatus } = require('./Application.model');
const { PlatformStats } = require('./PlatformStats.model');

module.exports = {
  // Models
  User,
  Scholarship,
  Application,
  PlatformStats,
  
  // Enums
  UserRole,
  YearLevel,
  UPLBCollege,
  STBracket,
  AdminAccessLevel,
  ScholarshipType,
  ScholarshipStatus,
  ApplicationStatus
};
