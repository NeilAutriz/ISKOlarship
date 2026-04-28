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
        contribution: data.contribution,
        description: generateFactorDescription(featureName, studentProfile, criteria, matchData)
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
        parts.push(`GWA of ${studentProfile.gwa.toFixed(2)}${criteria.maxGWA && criteria.maxGWA < 5.0 ? ` (requires ${criteria.maxGWA} or better)` : ''}`);
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
        parts.push(`\u20B1${(studentProfile.annualFamilyIncome || 0).toLocaleString()} income / \u20B1${criteria.maxAnnualFamilyIncome.toLocaleString()} max`);
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
        parts.push(collegeMatch >= SCORING.MATCH ? `${studentProfile.college} is eligible` : 'College not in eligible list');
      } else {
        parts.push('Open to all colleges');
      }
      if (criteria.eligibleCourses?.length > 0) {
        parts.push(courseMatch >= SCORING.MATCH ? `${studentProfile.course} matches` : 'Course not in eligible list');
      } else {
        parts.push('Open to all courses');
      }
      return parts.join(' \u00B7 ');
    }

    case 'Application Timing': {
      return 'How early the application is submitted relative to the deadline';
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
    case 'gwaScore': {
      if (!studentProfile.gwa) {
        return 'GWA not provided in your profile. Tip: Add your General Weighted Average in Profile → Academic Info so the system can score this scholarship accurately for you.';
      }
      const gwa = studentProfile.gwa;
      if (criteria.maxGWA && criteria.maxGWA < 5.0) {
        const gap = +(gwa - criteria.maxGWA).toFixed(2);
        if (gap <= 0) {
          const margin = Math.abs(gap);
          return `Your GWA of ${gwa.toFixed(2)} meets the ≤ ${criteria.maxGWA.toFixed(2)} requirement${margin >= 0.25 ? ` with a ${margin.toFixed(2)} margin` : ''}.\nTip: Maintain this performance next semester — most scholarships re-check GWA at every renewal period.`;
        }
        return `Your GWA of ${gwa.toFixed(2)} is ${gap.toFixed(2)} above the ≤ ${criteria.maxGWA.toFixed(2)} cutoff.\nTip: You’d need to bring your GWA down by ~${gap.toFixed(2)} next semester to qualify. Focus on subjects where you can realistically raise your grade and consider OSG’s academic counseling.`;
      }
      // No GWA restriction — still give helpful framing
      if (gwa <= 1.75) return `Your GWA of ${gwa.toFixed(2)} is excellent and strengthens any merit-based application.`;
      if (gwa <= 2.5) return `Your GWA of ${gwa.toFixed(2)} is competitive. No GWA cap applies here.\nTip: Improving toward 1.75 or better will raise your predicted match on most merit-based scholarships.`;
      return `Your GWA of ${gwa.toFixed(2)} — no GWA cap for this scholarship.\nTip: Most other scholarships do enforce a GWA cutoff (often ≤ 2.00 or ≤ 2.50). Improving your GWA will broaden the scholarships you can qualify for.`;
    }

    case 'yearLevelMatch': {
      if (yearLevels.length === 0) {
        if (!studentProfile.classification) {
          return 'Year level not set on your profile.\nTip: Update Profile → Academic Info so year-level–restricted scholarships can be scored correctly for you.';
        }
        return `${studentProfile.classification} — this scholarship is open to all year levels.`;
      }
      if (yearLevels.includes(studentProfile.classification)) {
        return `You are a ${studentProfile.classification}, which matches the required level(s): ${yearLevels.join(', ')}.`;
      }
      return `You are ${studentProfile.classification || 'a year level not on your profile'}; this scholarship requires: ${yearLevels.join(', ')}.\nTip: Year level is a fixed rule set by the sponsor. Save this scholarship and reapply when you reach an eligible year.`;
    }

    case 'incomeMatch': {
      const income = studentProfile.annualFamilyIncome || 0;
      if (criteria.maxAnnualFamilyIncome) {
        const max = criteria.maxAnnualFamilyIncome;
        if (income === 0) {
          return `Income not specified on your profile (cap for this scholarship: \u20B1${max.toLocaleString()}).\nTip: Add your accurate annual family income in Profile → Family Background. Leaving it blank treats you as ineligible for need-based scholarships.`;
        }
        if (income <= max) {
          const ratio = income / max;
          if (ratio < 0.5) return `\u20B1${income.toLocaleString()} of \u20B1${max.toLocaleString()} cap — well within the limit and a strong financial-need signal.`;
          return `\u20B1${income.toLocaleString()} of \u20B1${max.toLocaleString()} cap — eligible.\nTip: Make sure your latest ITR or non-filing certificate is attached so this passes verification during admin review.`;
        }
        const over = income - max;
        return `\u20B1${income.toLocaleString()} exceeds the \u20B1${max.toLocaleString()} cap by \u20B1${over.toLocaleString()}.\nTip: This is a hard cap. If your family’s income has actually decreased, update Profile → Family Background and attach supporting documents (latest ITR, certificate of unemployment, etc.) before applying.`;
      }
      return `\u20B1${income.toLocaleString()} annual income — no income cap for this scholarship.`;
    }

    case 'stBracketMatch': {
      if (stBrackets.length === 0) {
        if (studentProfile.stBracket) {
          return `Your Socialized Tuition bracket is ${studentProfile.stBracket}. No specific bracket required for this scholarship.`;
        }
        return 'Socialized Tuition bracket not set on your profile.\nTip: Update Profile → Family Background so need-based scholarships that filter by ST bracket can score you accurately.';
      }
      if (stBrackets.includes(studentProfile.stBracket)) {
        return `Your bracket (${studentProfile.stBracket}) is one of the required brackets: ${stBrackets.join(', ')}.`;
      }
      return `Required bracket(s): ${stBrackets.join(', ')}. Yours: ${studentProfile.stBracket || 'not set'}.\nTip: If your family’s financial situation has changed, file for ST recomputation at OSG. A successful recomputation can move you into a qualifying bracket before the deadline.`;
    }

    case 'collegeMatch':
      if (!criteria.eligibleColleges?.length) return 'Open to all colleges — no restriction here.';
      if (collegeMatch >= SCORING.MATCH) return `${studentProfile.college} is one of the eligible colleges for this scholarship.`;
      return `${studentProfile.college || 'Your college'} is not in the eligible list (${criteria.eligibleColleges.join(', ')}).\nTip: College is a hard rule set by the sponsor and can’t be changed by the applicant. Filter the scholarship list by your college to find ones you do qualify for.`;

    case 'courseMatch':
      if (!criteria.eligibleCourses?.length) return 'Open to all courses — no restriction here.';
      if (courseMatch >= SCORING.MATCH) return `${studentProfile.course} matches one of the eligible courses for this scholarship.`;
      return `${studentProfile.course || 'Your course'} is not in the eligible list (${criteria.eligibleCourses.join(', ')}).\nTip: Course is a fixed eligibility rule. Use the Course filter on the scholarship list to find grants open to your program.`;

    case 'citizenshipMatch': {
      const c = studentProfile.citizenship;
      if (!c) {
        return 'Citizenship not set on your profile.\nTip: Update Profile → Personal Info. Most UPLB scholarships require Filipino citizenship and an empty value will flag your application during review.';
      }
      if (c === 'Filipino') return `${c} — meets the standard citizenship requirement for UPLB scholarships.`;
      return `${c} — most UPLB scholarships are Filipino-only.\nTip: Look specifically for international-student grants or those that explicitly accept your citizenship.`;
    }

    case 'applicationTiming':
      return 'How early you submit relative to the deadline.\nTip: Aim to submit at least 1–2 weeks before the deadline. This gives you time to fix document issues if the admin requests revisions, and avoids last-minute system load.';

    case 'eligibilityScore': {
      const pct = Math.round(eligibilityScore * 100);
      const missed = Math.max(0, (totalCriteria || 0) - (matchedCriteria || 0));
      const base = `${matchedCriteria}/${totalCriteria || '0'} hard eligibility criteria met (${pct}% match).`;
      if (missed === 0) {
        return `${base} You meet every hard requirement for this scholarship.`;
      }
      return `${base}\nTip: Open the Eligibility Requirements panel above to see which ${missed} requirement${missed === 1 ? '' : 's'} you don’t meet yet. Profile-driven items (GWA, income, year level, units) can usually be fixed by updating your profile or improving next semester.`;
    }

    case 'academicStrength': {
      if (!studentProfile.gwa) {
        return 'Combines your GWA with your year level standing.\nTip: Add your GWA in Profile → Academic Info so this factor can be computed for you.';
      }
      const base = `Combines your GWA (${studentProfile.gwa.toFixed(2)}) with your year level (${studentProfile.classification || 'N/A'}).`;
      if (studentProfile.gwa <= 2.0) {
        return `${base} Strong academic standing — this factor is working in your favor.`;
      }
      return `${base}\nTip: This factor rewards consistent academic performance. Improving your GWA toward 2.00 or better next semester is the most reliable way to raise this score.`;
    }

    case 'financialNeed': {
      const income = studentProfile.annualFamilyIncome || 0;
      const base = `Combines your annual family income (\u20B1${income.toLocaleString()})${studentProfile.stBracket ? ` and ST bracket (${studentProfile.stBracket})` : ''} into a single financial-need signal.`;
      if (!income || !studentProfile.stBracket) {
        return `${base}\nTip: Complete your income and Socialized Tuition bracket in Profile so this factor reflects your real situation — missing data is treated as low need.`;
      }
      return `${base}\nTip: Keep your latest ITR (or non-filing certificate) and ST recomputation on file with OSG so reviewers can verify the numbers shown here.`;
    }

    case 'programFit': {
      const collegeRestricted = criteria.eligibleColleges?.length > 0;
      const courseRestricted = criteria.eligibleCourses?.length > 0;
      const collegeOk = !collegeRestricted || collegeMatch >= SCORING.MATCH;
      const courseOk = !courseRestricted || courseMatch >= SCORING.MATCH;
      const base = `How well your college${studentProfile.course ? ` and course (${studentProfile.course})` : ''} align with this scholarship’s target programs.`;
      if (!collegeRestricted && !courseRestricted) {
        return `${base} This scholarship is open to all colleges and courses, so program fit is neutral.`;
      }
      if (collegeOk && courseOk) {
        return `${base} Your program is a direct match for the sponsor’s target programs.`;
      }
      return `${base}\nTip: This scholarship is restricted to specific programs your profile doesn’t fully match. Use the scholarship list filters (College / Course) to find grants that explicitly accept your program.`;
    }

    case 'overallFit':
      return `Combined measure of your eligibility score and academic performance — reflects overall profile strength.\nTip: The two highest-impact levers are (1) keeping your GWA strong and (2) making sure every required profile field (income, ST bracket, units, classification) is filled and current.`;

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
