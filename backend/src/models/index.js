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
  ApplicationStatus
} = require('./Application.model');

const { PlatformStats } = require('./PlatformStats.model');

const { TrainedModel } = require('./TrainedModel.model');

const { Notification, NotificationType } = require('./Notification.model');

const { ActivityLog, ActivityAction } = require('./ActivityLog.model');

module.exports = {
  // Models
  User,
  Scholarship,
  Application,
  PlatformStats,
  TrainedModel,
  Notification,
  ActivityLog,
  
  // User Enums
  UserRole,
  YearLevel,        // Alias for backward compatibility
  Classification,   // ERD-aligned classification
  Citizenship,      // ERD field
  UPLBCollege,
  STBracket,
  AdminAccessLevel,
  PhilippineProvinces,
  
  // Scholarship Enums
  ScholarshipType,
  ScholarshipLevel,
  ScholarshipStatus,
  
  // Application Enums
  ApplicationStatus,
  
  // Notification Enums
  NotificationType,

  // Activity Log Enums
  ActivityAction
};
