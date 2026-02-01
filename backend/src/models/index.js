// =============================================================================
// ISKOlarship - Models Index
// Central export for all MongoDB models
// Based on ERD from research paper
// =============================================================================

const { 
  User, 
  UserRole, 
  YearLevel, 
  Classification, 
  Citizenship,
  UPLBCollege,
  UPLBCourse, 
  STBracket, 
  AdminAccessLevel,
  PhilippineProvinces 
} = require('./User.model');

const { 
  Scholarship, 
  ScholarshipType, 
  ScholarshipLevel,
  ScholarshipStatus 
} = require('./Scholarship.model');

const { 
  Application, 
  ApplicationStatus,
  ApplicationType 
} = require('./Application.model');

const { PlatformStats } = require('./PlatformStats.model');

const { TrainedModel } = require('./TrainedModel.model');

module.exports = {
  // Models
  User,
  Scholarship,
  Application,
  PlatformStats,
  TrainedModel,
  
  // User Enums
  UserRole,
  YearLevel,        // Alias for backward compatibility
  Classification,   // ERD-aligned classification
  Citizenship,      // ERD field
  UPLBCollege,
  UPLBCourse,
  STBracket,
  AdminAccessLevel,
  PhilippineProvinces,
  
  // Scholarship Enums
  ScholarshipType,
  ScholarshipLevel,
  ScholarshipStatus,
  
  // Application Enums
  ApplicationStatus,
  ApplicationType
};
