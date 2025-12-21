// ============================================================================
// ISKOlarship - Calculation Utilities
// Mathematical and statistical helper functions
// ============================================================================

import { StudentProfile, Scholarship, EligibilityCriteria, YearLevel, UPLBCollege } from '../types';

/**
 * Calculate eligibility score (0-1) based on how well a student matches criteria
 */
export const calculateEligibilityScore = (
  student: StudentProfile,
  criteria: EligibilityCriteria
): number => {
  let score = 0;
  let totalCriteria = 0;

  // GWA check - uses minGWA from interface
  if (criteria.minGWA !== undefined) {
    totalCriteria++;
    if (student.gwa <= criteria.minGWA) {
      // Perfect match if student GWA is significantly better
      const gwaDiff = criteria.minGWA - student.gwa;
      score += Math.min(1, 0.5 + gwaDiff * 0.5);
    }
  }

  // Year level check - uses requiredYearLevels from interface
  if (criteria.requiredYearLevels && criteria.requiredYearLevels.length > 0) {
    totalCriteria++;
    if (criteria.requiredYearLevels.includes(student.yearLevel)) {
      score += 1;
    }
  }

  // College check - uses eligibleColleges from interface
  if (criteria.eligibleColleges && criteria.eligibleColleges.length > 0) {
    totalCriteria++;
    if (criteria.eligibleColleges.includes(student.college)) {
      score += 1;
    }
  }

  // Income check - uses maxAnnualFamilyIncome from interface
  if (criteria.maxAnnualFamilyIncome !== undefined) {
    totalCriteria++;
    if (student.annualFamilyIncome <= criteria.maxAnnualFamilyIncome) {
      // Better score for lower income (more need)
      const incomeRatio = student.annualFamilyIncome / criteria.maxAnnualFamilyIncome;
      score += 1 - (incomeRatio * 0.3); // Give slight advantage to lower income
    }
  }

  return totalCriteria > 0 ? score / totalCriteria : 1;
};

/**
 * Calculate success probability using logistic regression
 * P = 1 / (1 + e^(-z)), where z = coefficients * features
 */
export const calculateSuccessProbability = (
  features: number[],
  coefficients: number[]
): number => {
  if (features.length !== coefficients.length) {
    console.error('Features and coefficients length mismatch');
    return 0.5;
  }
  
  const z = coefficients.reduce((acc, coeff, index) => acc + coeff * features[index], 0);
  return sigmoid(z);
};

/**
 * Sigmoid activation function
 */
export const sigmoid = (z: number): number => {
  // Clip to prevent overflow
  const clipped = Math.max(-500, Math.min(500, z));
  return 1 / (1 + Math.exp(-clipped));
};

/**
 * Calculate GWA percentile (lower GWA = higher percentile in UP system)
 */
export const calculateGWAPercentile = (gwa: number): number => {
  // UP grading: 1.0 is highest, 5.0 is lowest
  // Map to percentile where lower GWA = higher percentile
  if (gwa <= 1.25) return 99;
  if (gwa <= 1.50) return 95;
  if (gwa <= 1.75) return 85;
  if (gwa <= 2.00) return 75;
  if (gwa <= 2.25) return 60;
  if (gwa <= 2.50) return 45;
  if (gwa <= 2.75) return 30;
  if (gwa <= 3.00) return 15;
  return 5;
};

/**
 * Calculate income bracket percentile
 */
export const calculateIncomePercentile = (annualIncome: number): number => {
  // Philippine income brackets (approximate)
  if (annualIncome <= 100000) return 20; // Poor
  if (annualIncome <= 200000) return 40; // Low income
  if (annualIncome <= 400000) return 60; // Lower middle
  if (annualIncome <= 800000) return 80; // Middle
  if (annualIncome <= 1500000) return 95; // Upper middle
  return 99; // Rich
};

/**
 * Normalize a value to 0-1 range
 */
export const normalize = (value: number, min: number, max: number): number => {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

/**
 * Calculate confidence interval
 */
export const calculateConfidenceInterval = (
  probability: number,
  sampleSize: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } => {
  // Using normal approximation
  const z = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;
  const standardError = Math.sqrt((probability * (1 - probability)) / sampleSize);
  
  return {
    lower: Math.max(0, probability - z * standardError),
    upper: Math.min(1, probability + z * standardError)
  };
};

/**
 * Format percentage for display
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format currency in PHP
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Calculate days until a deadline
 */
export const calculateDaysUntil = (deadline: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Get year level as numeric value
 */
export const yearLevelToNumber = (level: YearLevel): number => {
  switch (level) {
    case YearLevel.FRESHMAN: return 1;
    case YearLevel.SOPHOMORE: return 2;
    case YearLevel.JUNIOR: return 3;
    case YearLevel.SENIOR: return 4;
    case YearLevel.GRADUATE: return 5;
    default: return 0;
  }
};