// ============================================================================
// ISKOlarship - Prediction Factors
// Generate human-readable explanations for prediction scores
// ============================================================================

import { StudentProfile, Scholarship, PredictionFactor } from '../../types';
import { ModelWeights, FeatureVector } from './types';
import { SCORING } from './constants';
import { normalizeGWA, normalizeIncome, getSTBracketScore } from './features';

// ============================================================================
// PLACEHOLDER WEIGHTS FOR FACTOR GENERATION
// ============================================================================

// These are only used for generating factor descriptions, not for actual predictions
const PLACEHOLDER_WEIGHTS_FOR_FACTORS: ModelWeights = {
  intercept: SCORING.CALIBRATION_OFFSET,
  eligibilityScore: 1.0,
  gwaScore: 1.0,
  incomeMatch: 1.0,
  stBracketMatch: 1.0,
  collegeMatch: 1.0,
  courseMatch: 1.0,
  yearLevelMatch: 1.0,
  citizenshipMatch: 1.0,
  applicationTiming: 1.0
};

// ============================================================================
// FACTOR GENERATION
// ============================================================================

/**
 * Generate human-readable prediction factors with contributions
 * These factors explain why a prediction was made
 */
export const generatePredictionFactors = (
  student: StudentProfile,
  scholarship: Scholarship,
  features: FeatureVector,
  probability: number,
  providedWeights?: ModelWeights
): PredictionFactor[] => {
  const factors: PredictionFactor[] = [];
  const criteria = scholarship.eligibilityCriteria;
  // Use provided weights or placeholder for factor generation
  const weights = providedWeights || PLACEHOLDER_WEIGHTS_FOR_FACTORS;
  
  // 1. Overall Eligibility Score
  let eligibleCount = 0;
  let totalCriteria = 0;
  
  if (criteria.maxGWA) {
    totalCriteria++;
    if (student.gwa && student.gwa <= criteria.maxGWA) eligibleCount++;
  }
  if (criteria.maxAnnualFamilyIncome) {
    totalCriteria++;
    if (student.annualFamilyIncome && student.annualFamilyIncome <= criteria.maxAnnualFamilyIncome) eligibleCount++;
  }
  if (criteria.eligibleColleges?.length) {
    totalCriteria++;
    if (student.college && criteria.eligibleColleges.includes(student.college)) eligibleCount++;
  }
  if (criteria.eligibleClassifications?.length || criteria.requiredYearLevels?.length) {
    totalCriteria++;
    const yearLevels = criteria.eligibleClassifications || criteria.requiredYearLevels || [];
    if (student.yearLevel && yearLevels.includes(student.yearLevel)) eligibleCount++;
  }
  
  const eligibilityScore = totalCriteria > 0 ? eligibleCount / totalCriteria : 1;
  const eligibilityWeight = weights.eligibilityScore;
  const eligibilityContrib = eligibilityScore * eligibilityWeight;
  
  factors.push({
    factor: 'Overall Eligibility',
    value: eligibilityScore,
    weight: eligibilityWeight,
    rawContribution: eligibilityContrib,
    contribution: 0,
    description: `${eligibleCount}/${totalCriteria} criteria met (${Math.round(eligibilityScore * 100)}%)`,
    met: eligibilityScore >= 0.5
  });
  
  // 2. College Match
  const collegeMatch = criteria.eligibleColleges?.length 
    ? (criteria.eligibleColleges.includes(student.college || '') ? 1 : 0)
    : 0.5;
  const collegeWeight = weights.collegeMatch;
  const collegeContrib = collegeMatch * collegeWeight;
  
  factors.push({
    factor: 'College',
    value: collegeMatch,
    weight: collegeWeight,
    rawContribution: collegeContrib,
    contribution: 0,
    description: criteria.eligibleColleges?.length 
      ? (collegeMatch === 1 ? `${student.college} is eligible` : 'College not in eligible list')
      : 'Open to all colleges',
    met: collegeMatch >= 0.5
  });
  
  // 3. Financial Need (Income)
  const incomeValue = normalizeIncome(student.annualFamilyIncome, criteria.maxAnnualFamilyIncome || 500000);
  const incomeWeight = weights.incomeMatch;
  const incomeContrib = incomeValue * incomeWeight;
  
  factors.push({
    factor: 'Financial Need',
    value: incomeValue,
    weight: incomeWeight,
    rawContribution: incomeContrib,
    contribution: 0,
    description: criteria.maxAnnualFamilyIncome
      ? `₱${(student.annualFamilyIncome || 0).toLocaleString()} / ₱${criteria.maxAnnualFamilyIncome.toLocaleString()} max`
      : `₱${(student.annualFamilyIncome || 0).toLocaleString()} annual income`,
    met: !criteria.maxAnnualFamilyIncome || (student.annualFamilyIncome || 0) <= criteria.maxAnnualFamilyIncome
  });
  
  // 4. Citizenship
  const citizenshipMatch = student.citizenship === 'Filipino' ? 1 : 0.4;
  const citizenshipWeight = weights.citizenshipMatch;
  const citizenshipContrib = citizenshipMatch * citizenshipWeight;
  
  factors.push({
    factor: 'Citizenship',
    value: citizenshipMatch,
    weight: citizenshipWeight,
    rawContribution: citizenshipContrib,
    contribution: 0,
    description: student.citizenship || 'Not specified',
    met: citizenshipMatch >= 0.5
  });
  
  // 5. Academic Performance (GWA)
  const gwaValue = normalizeGWA(student.gwa);
  const gwaWeight = weights.gwaScore;
  const gwaContrib = gwaValue * gwaWeight;
  
  factors.push({
    factor: 'Academic Performance (GWA)',
    value: gwaValue,
    weight: gwaWeight,
    rawContribution: gwaContrib,
    contribution: 0,
    description: student.gwa 
      ? `GWA of ${student.gwa.toFixed(2)}${criteria.maxGWA ? ` (requires ≤${criteria.maxGWA})` : ''}`
      : 'GWA not provided',
    met: !criteria.maxGWA || (student.gwa || 5) <= criteria.maxGWA
  });
  
  // 6. Year Level
  const yearLevels = criteria.eligibleClassifications || criteria.requiredYearLevels || [];
  const yearLevelMatch = yearLevels.length 
    ? (yearLevels.includes(student.yearLevel || '' as any) ? 1 : 0)
    : 0.5;
  const yearLevelWeight = weights.yearLevelMatch;
  const yearLevelContrib = yearLevelMatch * yearLevelWeight;
  
  factors.push({
    factor: 'Year Level',
    value: yearLevelMatch,
    weight: yearLevelWeight,
    rawContribution: yearLevelContrib,
    contribution: 0,
    description: yearLevels.length 
      ? (yearLevelMatch === 1 ? `${student.yearLevel} is eligible` : `Requires: ${yearLevels.join(', ')}`)
      : (student.yearLevel || 'Not specified'),
    met: yearLevelMatch >= 0.5
  });
  
  // 7. Course/Major
  const courseMatch = criteria.eligibleCourses?.length
    ? (criteria.eligibleCourses.some(c => 
        (student.course || '').toLowerCase().includes(c.toLowerCase()) ||
        c.toLowerCase().includes((student.course || '').toLowerCase())
      ) ? 1 : 0)
    : 0.5;
  const courseWeight = weights.courseMatch;
  const courseContrib = courseMatch * courseWeight;
  
  factors.push({
    factor: 'Course/Major',
    value: courseMatch,
    weight: courseWeight,
    rawContribution: courseContrib,
    contribution: 0,
    description: criteria.eligibleCourses?.length 
      ? (courseMatch === 1 ? `${student.course} matches` : 'Course not in list')
      : 'Open to all courses',
    met: courseMatch >= 0.5
  });
  
  // 8. ST Bracket
  const stBrackets = criteria.requiredSTBrackets || criteria.eligibleSTBrackets || [];
  const stBracketMatch = stBrackets.length 
    ? (stBrackets.includes(student.stBracket || '') ? 1 : getSTBracketScore(student.stBracket))
    : getSTBracketScore(student.stBracket);
  const stBracketWeight = weights.stBracketMatch;
  const stBracketContrib = stBracketMatch * stBracketWeight;
  
  factors.push({
    factor: 'ST Bracket',
    value: stBracketMatch,
    weight: stBracketWeight,
    rawContribution: stBracketContrib,
    contribution: 0,
    description: stBrackets.length 
      ? (stBrackets.includes(student.stBracket || '') ? `${student.stBracket} qualifies` : `Requires: ${stBrackets.join(', ')}`)
      : (student.stBracket || 'Not specified'),
    met: !stBrackets.length || stBrackets.includes(student.stBracket || '')
  });
  
  // 9. Application Timing (replaces Profile Completeness)
  const applicationTimingValue = 0.5; // Default neutral
  const applicationTimingWeight = weights.applicationTiming;
  const applicationTimingContrib = applicationTimingValue * applicationTimingWeight;
  
  factors.push({
    factor: 'Application Timing',
    value: applicationTimingValue,
    weight: applicationTimingWeight,
    rawContribution: applicationTimingContrib,
    contribution: 0,
    description: 'Based on application submission timing',
    met: true
  });
  
  // Calculate total absolute contribution for normalization
  const totalAbsContrib = factors.reduce((sum, f) => sum + Math.abs(f.rawContribution || 0), 0);
  
  // Normalize contributions
  factors.forEach(f => {
    f.contribution = totalAbsContrib > 0 ? (f.rawContribution || 0) / totalAbsContrib : 0;
  });
  
  // Sort by absolute raw contribution (most impactful first)
  return factors.sort((a, b) => Math.abs(b.rawContribution || 0) - Math.abs(a.rawContribution || 0));
};

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

/**
 * Get recommendation text based on prediction score
 */
export const getRecommendation = (percentageScore: number): string => {
  if (percentageScore >= 75) {
    return 'Strongly recommended! Your profile is an excellent match for this scholarship.';
  } else if (percentageScore >= 60) {
    return 'Good match. You have a solid chance of approval with a complete application.';
  } else if (percentageScore >= 40) {
    return 'Moderate match. Consider strengthening your application with additional documentation.';
  } else if (percentageScore >= 25) {
    return 'Low match. Review eligibility criteria carefully before applying.';
  } else {
    return 'Not recommended. You may not meet key eligibility requirements.';
  }
};
