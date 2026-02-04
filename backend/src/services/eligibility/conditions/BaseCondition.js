/**
 * =============================================================================
 * ISKOlarship - Base Condition Class
 * =============================================================================
 * 
 * Abstract base class for all eligibility conditions.
 * Provides common functionality and interface for condition checking.
 * 
 * =============================================================================
 */

const { ConditionCategory, ImportanceLevel } = require('../types');
const { hasValue, getNestedValue } = require('../utils');

/**
 * Base Condition class - abstract class for all condition types
 */
class BaseCondition {
  /**
   * Create a new condition
   * @param {Object} config - Condition configuration
   */
  constructor(config) {
    this.id = config.id;
    this.name = config.name || config.id;
    this.description = config.description || '';
    this.category = config.category || ConditionCategory.CUSTOM;
    this.importance = config.importance || ImportanceLevel.REQUIRED;
    
    // Field mappings (support multiple field names for API compatibility)
    this.studentFields = this._normalizeFields(config.studentField || config.studentFields);
    this.criteriaFields = this._normalizeFields(config.criteriaField || config.criteriaFields);
    
    // Default values when field is not set
    this.defaultStudentValue = config.defaultStudentValue;
    this.defaultCriteriaValue = config.defaultCriteriaValue;
    
    // Skip check if criteria is not specified
    this.skipIfNoCriteria = config.skipIfNoCriteria !== false;
    
    // Custom normalizers
    this.normalizeStudent = config.normalizeStudent || ((v) => v);
    this.normalizeCriteria = config.normalizeCriteria || ((v) => v);
    
    // Display formatters
    this.formatStudentValue = config.formatStudentValue || this._defaultFormatValue.bind(this);
    this.formatCriteriaValue = config.formatCriteriaValue || this._defaultFormatValue.bind(this);
    
    // Custom skip logic
    this.shouldSkip = config.shouldSkip || null;
  }
  
  /**
   * Normalize field names to array
   */
  _normalizeFields(fields) {
    if (!fields) return [];
    return Array.isArray(fields) ? fields : [fields];
  }
  
  /**
   * Default value formatter
   */
  _defaultFormatValue(value) {
    if (!hasValue(value)) return 'Not specified';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }
  
  /**
   * Get value from student profile
   */
  getStudentValue(profile) {
    for (const field of this.studentFields) {
      const value = getNestedValue(profile, field);
      if (hasValue(value)) {
        return this.normalizeStudent(value);
      }
    }
    return this.defaultStudentValue;
  }
  
  /**
   * Get value from eligibility criteria
   */
  getCriteriaValue(criteria) {
    for (const field of this.criteriaFields) {
      const value = getNestedValue(criteria, field);
      if (hasValue(value)) {
        return this.normalizeCriteria(value);
      }
    }
    return this.defaultCriteriaValue;
  }
  
  /**
   * Check if this condition should be skipped
   */
  shouldSkipCheck(profile, criteria) {
    // Custom skip logic
    if (this.shouldSkip && this.shouldSkip(profile, criteria)) {
      return true;
    }
    
    // Skip if no criteria specified and skipIfNoCriteria is true
    if (this.skipIfNoCriteria) {
      const criteriaValue = this.getCriteriaValue(criteria);
      if (!hasValue(criteriaValue)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Evaluate the condition - MUST be implemented by subclasses
   * @param {any} studentValue - The student's value
   * @param {any} criteriaValue - The criteria value
   * @returns {boolean|null} - true/false for pass/fail, null for can't evaluate
   */
  evaluate(studentValue, criteriaValue) {
    throw new Error('evaluate() must be implemented by subclass');
  }
  
  /**
   * Check the condition and return a standardized result
   * @param {Object} profile - Student profile
   * @param {Object} criteria - Eligibility criteria
   * @returns {Object|null} Check result or null if skipped
   */
  check(profile, criteria) {
    // Check if should skip
    if (this.shouldSkipCheck(profile, criteria)) {
      return null;
    }
    
    const studentValue = this.getStudentValue(profile);
    const criteriaValue = this.getCriteriaValue(criteria);
    
    // Evaluate the condition
    const result = this.evaluate(studentValue, criteriaValue);
    
    // Handle null result (can't evaluate)
    let passed = result;
    let notes = '';
    
    if (result === null) {
      // Can't evaluate - depends on importance
      if (this.importance === ImportanceLevel.REQUIRED) {
        passed = false;
        notes = 'Required information not provided';
      } else {
        passed = true;
        notes = 'Unable to verify, skipping';
      }
    } else {
      notes = passed ? 'Meets requirement' : 'Does not meet requirement';
    }
    
    return {
      id: this.id,
      criterion: this.name,
      passed,
      applicantValue: this.formatStudentValue(studentValue),
      requiredValue: this.formatCriteriaValue(criteriaValue),
      notes,
      type: this.getType(),
      category: this.category,
      importance: this.importance
    };
  }
  
  /**
   * Get the condition type - MUST be implemented by subclasses
   */
  getType() {
    throw new Error('getType() must be implemented by subclass');
  }
}

module.exports = BaseCondition;
