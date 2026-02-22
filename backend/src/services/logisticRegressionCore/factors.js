// =============================================================================
// ISKOlarship - Factor Generation
// Generate human-readable prediction factors for display
// Groups related base + interaction features into meaningful categories
// =============================================================================

const { MODEL_CONFIG, FACTOR_LABELS, SCORING } = require('./constants');
const { getSimplifiedFeatures } = require('./features');

// =============================================================================
// Factor Group Definitions
// Maps base features + their interaction features into meaningful groups
// =============================================================================

const FACTOR_GROUPS = [
  {
    name: 'Academic Standing',
    features: ['gwaScore', 'yearLevelMatch', 'academicStrength'],
    icon: 'academic'
  },
  {
    name: 'Financial Need',
    features: ['incomeMatch', 'stBracketMatch', 'financialNeed'],
    icon: 'financial'
  },
  {
    name: 'Program Match',
    features: ['collegeMatch', 'courseMatch', 'programFit'],
    icon: 'program'
  },
  {
    name: 'Application Timing',
    features: ['applicationTiming'],
    icon: 'quality'
  },
  {
    name: 'Overall Eligibility',
    features: ['citizenshipMatch', 'eligibilityScore', 'overallFit'],
    icon: 'eligibility'
  }
];

// =============================================================================
// Factor Generation
// =============================================================================

/**
 * Generate grouped factor descriptions based on contributions and student data
 * Merges base features with their interaction features into 5 meaningful groups
 * showing net contribution, with expandable sub-factor details
 *
 * @param {object} contributions - Object with feature contributions { featureName: { value, weight, contribution } }
 * @param {object} studentProfile - Student profile data
 * @param {object} criteria - Scholarship eligibility criteria
 * @param {object} matchData - Match data { yearLevels, stBrackets, collegeMatch, courseMatch, eligibilityScore, matchedCriteria, totalCriteria }
 * @returns {Array} Array of grouped factor objects with net contributions and subFactors
 */
function generateFactors(contributions, studentProfile, criteria, matchData) {
  // Calculate total absolute contribution across ALL features for normalization
  let totalAbsContribution = 0;
  for (const c of Object.values(contributions)) {
    totalAbsContribution += Math.abs(c.contribution);
  }

  // Build grouped factors
  const factors = FACTOR_GROUPS.map(group => {
    // Sum raw contributions for all features in this group
    let netRawContribution = 0;
    const subFactors = [];

    for (const featureName of group.features) {
      const data = contributions[featureName];
      if (!data) continue;

      netRawContribution += data.contribution;
      subFactors.push({
        name: FACTOR_LABELS[featureName] || featureName,
        value: data.value,
        weight: data.weight,
        contribution: data.contribution
      });
    }

    // Normalized contribution relative to total
    const normalizedContribution = totalAbsContribution > 0
      ? netRawContribution / totalAbsContribution
      : 0;

    // Generate combined description from the base features in this group
    const description = generateGroupDescription(
      group,
      studentProfile,
      criteria,
      matchData
    );

    return {
      factor: group.name,
      contribution: normalizedContribution,
      rawContribution: netRawContribution,
      description: description,
      met: netRawContribution >= 0,
      subFactors: subFactors
    };
  });

  // Sort by absolute contribution (most impactful first)
  factors.sort((a, b) => Math.abs(b.rawContribution) - Math.abs(a.rawContribution));

  return factors;
}

/**
 * Generate a combined description for a factor group
 *
 * @param {object} group - Factor group definition
 * @param {object} studentProfile - Student profile data
 * @param {object} criteria - Scholarship eligibility criteria
 * @param {object} matchData - Match data for contextual descriptions
 * @returns {string} Combined human-readable description
 */
function generateGroupDescription(group, studentProfile, criteria, matchData) {
  const { yearLevels, stBrackets, collegeMatch, courseMatch, eligibilityScore, matchedCriteria, totalCriteria } = matchData;

  switch (group.name) {
    case 'Academic Standing': {
      const parts = [];
      if (studentProfile.gwa) {
        parts.push(`GWA of ${studentProfile.gwa.toFixed(2)}${criteria.maxGWA ? ` (requires \u2264${criteria.maxGWA})` : ''}`);
      } else {
        parts.push('GWA not provided');
      }
      if (yearLevels.length > 0) {
        parts.push(yearLevels.includes(studentProfile.classification)
          ? `${studentProfile.classification} is eligible`
          : `Requires: ${yearLevels.join(', ')}`);
      } else if (studentProfile.classification) {
        parts.push(studentProfile.classification);
      }
      return parts.join(' \u00B7 ');
    }

    case 'Financial Need': {
      const parts = [];
      if (criteria.maxAnnualFamilyIncome) {
        parts.push(`\u20B1${(studentProfile.annualFamilyIncome || 0).toLocaleString()} / \u20B1${criteria.maxAnnualFamilyIncome.toLocaleString()} max`);
      } else {
        parts.push(`\u20B1${(studentProfile.annualFamilyIncome || 0).toLocaleString()} annual income`);
      }
      if (stBrackets.length > 0) {
        parts.push(stBrackets.includes(studentProfile.stBracket)
          ? `${studentProfile.stBracket} qualifies`
          : `Requires: ${stBrackets.join(', ')}`);
      } else if (studentProfile.stBracket) {
        parts.push(studentProfile.stBracket);
      }
      return parts.join(' \u00B7 ');
    }

    case 'Program Match': {
      const parts = [];
      if (criteria.eligibleColleges?.length > 0) {
        parts.push(collegeMatch >= SCORING.MATCH ? `${studentProfile.college} is eligible` : 'College not eligible');
      } else {
        parts.push('Open to all colleges');
      }
      if (criteria.eligibleCourses?.length > 0) {
        parts.push(courseMatch >= SCORING.MATCH ? `${studentProfile.course} matches` : 'Course not in list');
      } else {
        parts.push('Open to all courses');
      }
      return parts.join(' \u00B7 ');
    }

    case 'Application Timing': {
      return 'Based on application submission timing';
    }

    case 'Overall Eligibility': {
      return `${matchedCriteria}/${totalCriteria || '0'} criteria met (${Math.round(eligibilityScore * 100)}%)`;
    }

    default:
      return '';
  }
}

/**
 * Generate human-readable description for a specific factor
 *
 * @param {string} factorName - Name of the factor (e.g., 'gwaScore')
 * @param {object} studentProfile - Student profile data
 * @param {object} criteria - Scholarship eligibility criteria
 * @param {object} matchData - Match data for contextual descriptions
 * @returns {string} Human-readable description
 */
function generateFactorDescription(factorName, studentProfile, criteria, matchData) {
  const { yearLevels, stBrackets, collegeMatch, courseMatch, eligibilityScore, matchedCriteria, totalCriteria } = matchData;

  switch (factorName) {
    case 'gwaScore':
      return studentProfile.gwa
        ? `GWA of ${studentProfile.gwa.toFixed(2)}${criteria.maxGWA ? ` (requires \u2264${criteria.maxGWA})` : ''}`
        : 'GWA not provided';

    case 'yearLevelMatch':
      return yearLevels.length > 0
        ? (yearLevels.includes(studentProfile.classification)
            ? `${studentProfile.classification} is eligible`
            : `Requires: ${yearLevels.join(', ')}`)
        : `${studentProfile.classification || 'Year level not set'}`;

    case 'incomeMatch':
      return criteria.maxAnnualFamilyIncome
        ? `\u20B1${(studentProfile.annualFamilyIncome || 0).toLocaleString()} / \u20B1${criteria.maxAnnualFamilyIncome.toLocaleString()} max`
        : `\u20B1${(studentProfile.annualFamilyIncome || 0).toLocaleString()} annual income`;

    case 'stBracketMatch':
      return stBrackets.length > 0
        ? (stBrackets.includes(studentProfile.stBracket) ? `${studentProfile.stBracket} qualifies` : `Requires: ${stBrackets.join(', ')}`)
        : `${studentProfile.stBracket || 'ST bracket not set'}`;

    case 'collegeMatch':
      return criteria.eligibleColleges?.length > 0
        ? (collegeMatch >= SCORING.MATCH ? `${studentProfile.college} is eligible` : 'College not eligible')
        : 'Open to all colleges';

    case 'courseMatch':
      return criteria.eligibleCourses?.length > 0
        ? (courseMatch >= SCORING.MATCH ? `${studentProfile.course} matches` : 'Course not in list')
        : 'Open to all courses';

    case 'citizenshipMatch':
      return `${studentProfile.citizenship || 'Not specified'}`;

    case 'applicationTiming':
      return 'Based on application submission timing';

    case 'eligibilityScore':
      return `${matchedCriteria}/${totalCriteria || '0'} criteria met (${Math.round(eligibilityScore * 100)}%)`;

    case 'academicStrength':
      return 'GWA weighted by year level standing';

    case 'financialNeed':
      return 'Income level relative to ST bracket';

    case 'programFit':
      return 'College and course alignment';

    case 'overallFit':
      return 'Eligibility and academic performance overlap';

    default:
      return '';
  }
}

/**
 * Format feature name for display
 * @param {string} name - Feature name in camelCase
 * @returns {string} Formatted display name
 */
function formatFactorName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Get human-readable prediction factors grouped by category (sync version)
 */
function getPredictionFactors(user, scholarship) {
  const features = getSimplifiedFeatures(user, scholarship);
  const categorized = {};

  for (const [category, featureList] of Object.entries(MODEL_CONFIG.featureCategories)) {
    categorized[category] = [];
    for (const featureName of featureList) {
      const value = features[featureName];
      if (value === undefined) continue;
      const description = MODEL_CONFIG.featureDescriptions[featureName] || '';
      categorized[category].push({
        factor: formatFactorName(featureName),
        value: value,
        description: description,
        impact: value >= 0.7 ? 'high' : value >= 0.4 ? 'medium' : 'low'
      });
    }
  }
  return categorized;
}

module.exports = {
  generateFactors,
  generateGroupDescription,
  generateFactorDescription,
  formatFactorName,
  getPredictionFactors
};
