// =============================================================================
// ISKOlarship - Factor Analysis
// Detailed factor analysis and recommendation generation
// =============================================================================

const { normalizeSTBracket, stBracketsMatch } = require('../eligibility/utils');
const { FIELD_NAME_MAP, REQUIRED_PROFILE_FIELDS } = require('./constants');

/**
 * Format factor name for display
 * 
 * @param {string} name - Internal field name
 * @returns {string} Human-readable name
 */
function formatFactorName(name) {
  return FIELD_NAME_MAP[name] || name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

/**
 * Analyze detailed factors for comprehensive UI display
 * 
 * Uses canonical field names from User.model.js:
 * - profile.gwa, profile.classification, profile.college, profile.course
 * - profile.annualFamilyIncome, profile.stBracket, profile.householdSize
 * 
 * @param {Object} user - User object with studentProfile
 * @param {Object} scholarship - Scholarship object with eligibilityCriteria
 * @param {Object} eligibility - Eligibility check result
 * @param {Object} prediction - Prediction result
 * @returns {Object} Detailed factors with workingInFavor and areasToConsider
 */
function analyzeDetailedFactors(user, scholarship, eligibility, prediction) {
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  const workingInFavor = [];
  const areasToConsider = [];

  // Analyze Family Income (using canonical field: annualFamilyIncome)
  if (profile.annualFamilyIncome != null && criteria.maxAnnualFamilyIncome) {
    const isEligible = profile.annualFamilyIncome <= criteria.maxAnnualFamilyIncome;
    const percentOfMax = (profile.annualFamilyIncome / criteria.maxAnnualFamilyIncome) * 100;
    
    const factor = {
      title: 'Family Income Level',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible 
        ? 'Your family income is within the scholarship\'s eligibility range.'
        : `Your family income of ₱${profile.annualFamilyIncome.toLocaleString()} exceeds the required ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}.`,
      details: {
        typicalRange: `₱0 - ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`,
        yourValue: profile.annualFamilyIncome ? `₱${profile.annualFamilyIncome.toLocaleString()}` : 'N/A',
        percentOfMax: Math.round(percentOfMax)
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Analyze Year Level (using canonical field: classification)
  if (criteria.requiredYearLevels?.length > 0 || criteria.eligibleClassifications?.length > 0) {
    const eligibleLevels = criteria.requiredYearLevels || criteria.eligibleClassifications || [];
    const isEligible = eligibleLevels.includes(profile.classification);
    
    const factor = {
      title: 'Year Level',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible
        ? 'Your year level is eligible for this scholarship.'
        : `This scholarship is only for ${eligibleLevels.join(', ')} students.`,
      details: {
        required: eligibleLevels.join(', '),
        yourValue: profile.classification || 'Not provided'
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Analyze College (using canonical field: college)
  if (criteria.eligibleColleges?.length > 0) {
    const isEligible = criteria.eligibleColleges.includes(profile.college);
    
    const factor = {
      title: 'College',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible
        ? 'Your college is eligible for this scholarship.'
        : 'Your college is not among the eligible colleges.',
      details: {
        required: criteria.eligibleColleges.length <= 3 
          ? criteria.eligibleColleges.join(', ')
          : `${criteria.eligibleColleges.length} eligible colleges`,
        yourValue: profile.college || 'Not provided'
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Analyze Course Alignment (using canonical field: course)
  if (criteria.eligibleCourses?.length > 0) {
    const isEligible = criteria.eligibleCourses.includes(profile.course);
    
    const factor = {
      title: 'Course Alignment',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible
        ? 'Your course is one of the preferred programs for this scholarship.'
        : 'Your course is not among the preferred programs.',
      details: {
        typicalRange: criteria.eligibleCourses.length <= 3
          ? criteria.eligibleCourses.join(', ')
          : `${criteria.eligibleCourses.length} eligible courses`,
        yourValue: profile.course || 'Not provided'
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Analyze Academic Performance (using canonical field: gwa)
  if (criteria.maxGWA || criteria.minGWA) {
    const requiredGWA = criteria.maxGWA || criteria.minGWA;
    const isEligible = profile.gwa && profile.gwa <= requiredGWA;
    const gap = profile.gwa ? (profile.gwa - requiredGWA).toFixed(2) : 'N/A';
    
    const factor = {
      title: 'Academic Performance (GWA)',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible
        ? 'Your GWA meets the scholarship requirement.'
        : `Your GWA of ${profile.gwa?.toFixed(2) || 'N/A'} is ${gap > 0 ? 'above' : 'below'} the required ${requiredGWA.toFixed(2)}.`,
      details: {
        typicalRange: `1.00 - ${requiredGWA.toFixed(2)}`,
        yourValue: profile.gwa ? profile.gwa.toFixed(2) : 'N/A',
        gap: gap
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Analyze ST Bracket (using canonical field: stBracket)
  if (criteria.eligibleSTBrackets?.length > 0 || criteria.requiredSTBrackets?.length > 0) {
    const eligibleBrackets = criteria.eligibleSTBrackets || criteria.requiredSTBrackets || [];
    const normalizedStudentBracket = normalizeSTBracket(profile.stBracket);
    const isEligible = stBracketsMatch(profile.stBracket, eligibleBrackets);
    
    const factor = {
      title: 'Socialized Tuition Bracket',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible
        ? 'Your ST bracket qualifies for this scholarship.'
        : 'Your ST bracket does not meet the requirement.',
      details: {
        required: eligibleBrackets.map(b => normalizeSTBracket(b)).join(', '),
        yourValue: normalizedStudentBracket || 'Not provided'
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Analyze Units Enrolled (using canonical field: unitsEnrolled)
  if (criteria.minUnitsEnrolled) {
    const isEligible = profile.unitsEnrolled && profile.unitsEnrolled >= criteria.minUnitsEnrolled;
    
    const factor = {
      title: 'Units Enrolled',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible
        ? 'You meet the minimum units enrolled requirement.'
        : `You have ${profile.unitsEnrolled || 0} units enrolled, but ${criteria.minUnitsEnrolled} are required.`,
      details: {
        required: `≥ ${criteria.minUnitsEnrolled} units`,
        yourValue: profile.unitsEnrolled ? `${profile.unitsEnrolled} units` : 'Not provided'
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Analyze Units Passed (using canonical field: unitsPassed)
  if (criteria.minUnitsPassed) {
    const isEligible = profile.unitsPassed && profile.unitsPassed >= criteria.minUnitsPassed;
    
    const factor = {
      title: 'Units Passed',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible
        ? 'You meet the minimum units passed requirement.'
        : `You have ${profile.unitsPassed || 0} units passed, but ${criteria.minUnitsPassed} are required.`,
      details: {
        required: `≥ ${criteria.minUnitsPassed} units`,
        yourValue: profile.unitsPassed ? `${profile.unitsPassed} units` : 'Not provided'
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Check profile completeness using canonical field names
  const missingFields = REQUIRED_PROFILE_FIELDS.filter(field => !profile[field]);
  
  if (missingFields.length > 0) {
    areasToConsider.push({
      title: 'Profile Completeness',
      status: 'negative',
      message: 'Consider completing all profile fields to improve your match score.',
      details: {
        missingFields: missingFields.map(f => formatFactorName(f)).join(', ')
      }
    });
  }

  return {
    workingInFavor,
    areasToConsider,
    summary: {
      totalPositive: workingInFavor.length,
      totalNegative: areasToConsider.length,
      overallStrength: workingInFavor.length > areasToConsider.length ? 'strong' : 'needs_improvement'
    }
  };
}

/**
 * Generate recommendation text based on analysis
 * 
 * @param {number} probability - Prediction probability (0-1)
 * @param {Object} detailedFactors - Result from analyzeDetailedFactors
 * @returns {string} Recommendation text
 */
function generateRecommendation(probability, detailedFactors) {
  const areasToConsider = detailedFactors?.areasToConsider || [];
  
  if (probability >= 0.75) {
    return 'Strongly recommended! Your profile is an excellent match for this scholarship based on historical approval patterns.';
  } else if (probability >= 0.60) {
    return 'Good match! You have a solid chance of approval. Your profile aligns well with scholarship requirements.';
  } else if (probability >= 0.45) {
    const areas = areasToConsider.length > 0 
      ? ` Consider strengthening: ${areasToConsider.slice(0, 2).map(a => a.title || a).join(', ')}.`
      : '';
    return `Moderate match. You meet basic requirements but may face competition.${areas}`;
  } else if (probability >= 0.25) {
    return 'Low match. Review eligibility criteria carefully. Your profile may not fully align with requirements.';
  } else {
    return 'Not recommended. Your current profile may not be competitive for this scholarship.';
  }
}

module.exports = {
  formatFactorName,
  analyzeDetailedFactors,
  generateRecommendation
};
