// =============================================================================
// ISKOlarship - Prediction Service
// Implements Hybrid Matching: Rule-Based Filtering + Logistic Regression
// Based on Research Paper: "ISKOlarship: Web-Based Scholarship Platform"
// 
// Two-Stage Approach:
// 1. RULE-BASED FILTERING: Binary eligibility checks (pass/fail)
//    - Academic: GWA, year level, college, course (BOOLEAN)
//    - Financial: Income threshold, ST bracket (RANGE-BASED for income, BOOLEAN for bracket)
//    - Special: Thesis requirement, no other scholarship (BOOLEAN)
//
// 2. LOGISTIC REGRESSION: Success probability prediction (0-100%)
//    - Uses 7 continuous features from eligible applications
//    - Trained on historical UPLB scholarship data
//    - Accuracy: 91% (Philippine education context)
//
// Field Naming Convention:
// - User.studentProfile.annualFamilyIncome (canonical)
// - User.studentProfile.classification (year level)
// - User.studentProfile.stBracket (ST bracket: FDS, FD, PD80, etc.)
// =============================================================================

const { Application, Scholarship } = require('../models');
const logisticRegression = require('./logisticRegression.service');

// =============================================================================
// Model Version and State
// =============================================================================

const MODEL_VERSION = '2.0.0';

// Re-export logistic regression weights for backward compatibility
const MODEL_WEIGHTS = logisticRegression.DEFAULT_WEIGHTS;

// =============================================================================
// Eligibility Checking (Rule-Based Filtering)
// Implements 3-stage filtering from research paper
// =============================================================================

/**
 * Stage 1: Academic Eligibility Check (BINARY CHECKS)
 * Research: "For eligibility requirements, most of it is boolean value like if you are 
 * included in the course, if you are in this level like senior, freshman, junior, etc. 
 * That should always be binary or boolean values and if you are not included there then 
 * you are not eligible."
 */
function checkAcademicEligibility(user, scholarship) {
  const checks = [];
  // Student profile stores data directly (NOT nested in academicInfo)
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};

  // GWA Check (RANGE-BASED: scholarship uses maxGWA, lower is better in UP system)
  if (criteria.minGWA || criteria.maxGWA) {
    const requiredGWA = criteria.maxGWA || criteria.minGWA;
    const passed = profile.gwa && profile.gwa <= requiredGWA;
    checks.push({
      criterion: 'Minimum GWA',
      passed,
      applicantValue: profile.gwa ? profile.gwa.toFixed(2) : 'Not provided',
      requiredValue: `≤ ${requiredGWA.toFixed(2)}`,
      notes: passed ? 'Meets GWA requirement' : 'Does not meet GWA requirement',
      type: 'range' // For distinction
    });
  }

  // Year Level/Classification Check (BINARY: in list or not)
  if (criteria.requiredYearLevels?.length > 0 || criteria.eligibleClassifications?.length > 0) {
    const eligibleLevels = criteria.requiredYearLevels || criteria.eligibleClassifications || [];
    const passed = eligibleLevels.includes(profile.classification);
    checks.push({
      criterion: 'Year Level',
      passed,
      applicantValue: profile.classification || 'Not provided',
      requiredValue: eligibleLevels.join(', '),
      notes: passed ? 'Year level matches' : 'Year level does not match',
      type: 'binary' // Must be in the list
    });
  }

  // College Check (BINARY: in list or not)
  if (criteria.eligibleColleges?.length > 0) {
    const passed = criteria.eligibleColleges.includes(profile.college);
    checks.push({
      criterion: 'College',
      passed,
      applicantValue: profile.college || 'Not provided',
      requiredValue: criteria.eligibleColleges.join(', '),
      notes: passed ? 'College is eligible' : 'College is not eligible',
      type: 'binary'
    });
  }

  // Course Check (BINARY: in list or not)
  if (criteria.eligibleCourses?.length > 0) {
    const passed = criteria.eligibleCourses.includes(profile.course);
    checks.push({
      criterion: 'Course',
      passed,
      applicantValue: profile.course || 'Not provided',
      requiredValue: `${criteria.eligibleCourses.length} eligible courses`,
      notes: passed ? 'Course is eligible' : 'Course is not eligible',
      type: 'binary'
    });
  }

  // Major Check (BINARY: in list or not)
  if (criteria.eligibleMajors?.length > 0) {
    const passed = profile.major && criteria.eligibleMajors.includes(profile.major);
    checks.push({
      criterion: 'Major',
      passed,
      applicantValue: profile.major || 'Not provided',
      requiredValue: criteria.eligibleMajors.join(', '),
      notes: passed ? 'Major is eligible' : 'Major is not eligible',
      type: 'binary'
    });
  }

  // Units Check (RANGE-BASED: >= threshold)
  if (criteria.minUnitsEnrolled) {
    const passed = profile.unitsEnrolled && profile.unitsEnrolled >= criteria.minUnitsEnrolled;
    checks.push({
      criterion: 'Enrolled Units',
      passed,
      applicantValue: profile.unitsEnrolled || 'Not provided',
      requiredValue: `≥ ${criteria.minUnitsEnrolled}`,
      notes: passed ? 'Meets minimum units' : 'Does not meet minimum units',
      type: 'range'
    });
  }

  // Units Passed Check (RANGE-BASED: for thesis grants)
  if (criteria.minUnitsPassed) {
    const passed = profile.unitsPassed && profile.unitsPassed >= criteria.minUnitsPassed;
    checks.push({
      criterion: 'Units Passed',
      passed,
      applicantValue: profile.unitsPassed || 'Not provided',
      requiredValue: `≥ ${criteria.minUnitsPassed}`,
      notes: passed ? 'Meets minimum units passed' : 'Does not meet minimum units passed',
      type: 'range'
    });
  }

  return checks;
}

/**
 * Stage 2: Financial Eligibility Check (RANGE + BINARY)
 * Research: "While for the GWA, Family Income, ST Bracket as long as it is within 
 * the range, you can use the previous data in creating your projections."
 */
function checkFinancialEligibility(user, scholarship) {
  const checks = [];
  // Student profile stores financial data directly (NOT nested)
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};

  // Income Check (RANGE-BASED: <= threshold)
  // CANONICAL FIELD: annualFamilyIncome (not familyAnnualIncome)
  if (criteria.maxAnnualFamilyIncome) {
    const income = profile.annualFamilyIncome; // Use canonical field name
    const passed = income && income <= criteria.maxAnnualFamilyIncome;
    checks.push({
      criterion: 'Maximum Family Income',
      passed,
      applicantValue: income 
        ? `₱${income.toLocaleString()}` 
        : 'Not provided',
      requiredValue: `≤ ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`,
      notes: passed ? 'Within income limit' : 'Exceeds income limit',
      type: 'range' // Income is range-based, not binary
    });
  }

  // ST Bracket Check (BINARY: in list or not)
  if (criteria.requiredSTBrackets?.length > 0 || criteria.eligibleSTBrackets?.length > 0) {
    const eligibleBrackets = criteria.requiredSTBrackets || criteria.eligibleSTBrackets || [];
    const passed = profile.stBracket && eligibleBrackets.includes(profile.stBracket);
    checks.push({
      criterion: 'ST Bracket',
      passed,
      applicantValue: profile.stBracket || 'Not provided',
      requiredValue: eligibleBrackets.join(', '),
      notes: passed ? 'ST bracket matches' : 'ST bracket does not match',
      type: 'binary' // Must be in the eligible list
    });
  }

  return checks;
}

/**
 * Stage 3: Additional Requirements Check (ALL BINARY)
 * Research: These are hard boolean requirements - either you meet them or you don't
 */
function checkAdditionalRequirements(user, scholarship) {
  const checks = [];
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};

  // Thesis Approval Check (BINARY)
  if (criteria.requiresApprovedThesis || criteria.requiresApprovedThesisOutline) {
    const passed = profile.hasApprovedThesisOutline === true;
    checks.push({
      criterion: 'Approved Thesis Outline',
      passed,
      applicantValue: passed ? 'Yes' : 'No',
      requiredValue: 'Required',
      notes: passed ? 'Has approved thesis outline' : 'No approved thesis outline',
      type: 'binary'
    });
  }

  // No Other Scholarship Check (BINARY)
  if (criteria.mustNotHaveOtherScholarship) {
    const passed = !profile.hasExistingScholarship;
    checks.push({
      criterion: 'No Other Scholarship',
      passed,
      applicantValue: passed ? 'No current scholarship' : 'Has scholarship',
      requiredValue: 'Must not have other scholarship',
      notes: passed ? 'No conflicting scholarship' : 'Already has scholarship',
      type: 'binary'
    });
  }

  // No Disciplinary Action Check (BINARY)
  if (criteria.mustNotHaveDisciplinaryAction) {
    const passed = !profile.hasDisciplinaryAction;
    checks.push({
      criterion: 'No Disciplinary Action',
      passed,
      applicantValue: passed ? 'None' : 'Has record',
      requiredValue: 'Must not have disciplinary action',
      notes: passed ? 'Clean record' : 'Has disciplinary record',
      type: 'binary'
    });
  }

  // No Failing Grade Check (BINARY)
  if (criteria.mustNotHaveFailingGrade) {
    const passed = !profile.hasFailingGrade;
    checks.push({
      criterion: 'No Failing Grade',
      passed,
      applicantValue: passed ? 'None' : 'Has failing grade',
      requiredValue: 'Must not have failing grade',
      notes: passed ? 'No failing grades' : 'Has failing grades',
      type: 'binary'
    });
  }

  // No Grade of 4 Check (BINARY)
  if (criteria.mustNotHaveGradeOf4) {
    const passed = !profile.hasGradeOf4;
    checks.push({
      criterion: 'No Grade of 4',
      passed,
      applicantValue: passed ? 'None' : 'Has grade of 4',
      requiredValue: 'Must not have grade of 4',
      notes: passed ? 'No conditional grades' : 'Has conditional grades',
      type: 'binary'
    });
  }

  // No Incomplete Grade Check (BINARY)
  if (criteria.mustNotHaveIncompleteGrade) {
    const passed = !profile.hasIncompleteGrade;
    checks.push({
      criterion: 'No Incomplete Grade',
      passed,
      applicantValue: passed ? 'None' : 'Has incomplete',
      requiredValue: 'Must not have incomplete grades',
      notes: passed ? 'No incomplete grades' : 'Has incomplete grades',
      type: 'binary'
    });
  }

  // Must Be Graduating Check (BINARY)
  if (criteria.mustBeGraduating) {
    const passed = profile.isGraduating === true;
    checks.push({
      criterion: 'Graduating Student',
      passed,
      applicantValue: passed ? 'Yes' : 'No',
      requiredValue: 'Must be graduating',
      notes: passed ? 'Is a graduating student' : 'Not a graduating student',
      type: 'binary'
    });
  }

  // Province Check (BINARY: in list or not)
  if (criteria.eligibleProvinces?.length > 0) {
    const passed = profile.provinceOfOrigin && criteria.eligibleProvinces.includes(profile.provinceOfOrigin);
    checks.push({
      criterion: 'Province of Origin',
      passed,
      applicantValue: profile.provinceOfOrigin || 'Not provided',
      requiredValue: criteria.eligibleProvinces.join(', '),
      notes: passed ? 'Province matches requirement' : 'Province does not match',
      type: 'binary'
    });
  }

  return checks;
}

/**
 * Complete Eligibility Check
 */
async function checkEligibility(user, scholarship) {
  const academicChecks = checkAcademicEligibility(user, scholarship);
  const financialChecks = checkFinancialEligibility(user, scholarship);
  const additionalChecks = checkAdditionalRequirements(user, scholarship);

  const allChecks = [...academicChecks, ...financialChecks, ...additionalChecks];
  const passedChecks = allChecks.filter(c => c.passed).length;
  const totalChecks = allChecks.length;

  return {
    passed: allChecks.every(c => c.passed),
    score: totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100,
    checks: allChecks,
    summary: {
      total: totalChecks,
      passed: passedChecks,
      failed: totalChecks - passedChecks
    },
    stages: {
      academic: {
        checks: academicChecks,
        passed: academicChecks.every(c => c.passed)
      },
      financial: {
        checks: financialChecks,
        passed: financialChecks.every(c => c.passed)
      },
      additional: {
        checks: additionalChecks,
        passed: additionalChecks.every(c => c.passed)
      }
    }
  };
}

// =============================================================================
// Logistic Regression Prediction
// =============================================================================

/**
 * Sigmoid function for logistic regression
 */
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Extract features from user and scholarship
 */
function extractFeatures(user, scholarship) {
  const academic = user.studentProfile?.academicInfo || {};
  const financial = user.studentProfile?.financialInfo || {};
  const criteria = scholarship.eligibilityCriteria || {};

  // Normalize GWA (1.0 is best, 5.0 is worst, so invert)
  const gwaNormalized = academic.currentGWA 
    ? (5 - academic.currentGWA) / 4 
    : 0.5;

  // Year level encoding
  const yearLevelMap = {
    '1st Year': 0.2,
    '2nd Year': 0.4,
    '3rd Year': 0.6,
    '4th Year': 0.8,
    '5th Year': 1.0
  };
  const yearLevelNormalized = yearLevelMap[academic.yearLevel] || 0.5;

  // Financial need score (inverse of income)
  const maxIncome = 1000000; // Reference max income
  const financialNeed = financial.annualFamilyIncome 
    ? 1 - (financial.annualFamilyIncome / maxIncome)
    : 0.5;

  // ST Bracket encoding (Bracket A = highest need)
  const stBracketMap = {
    'Bracket A': 1.0,
    'Bracket B': 0.8,
    'Bracket C': 0.6,
    'Bracket D': 0.4,
    'Bracket E': 0.2
  };
  const stBracketNormalized = stBracketMap[financial.stBracket] || 0.5;

  // College match
  const collegeMatch = criteria.eligibleColleges?.length === 0 ||
    criteria.eligibleColleges?.includes(academic.college) ? 1 : 0;

  // Course match
  const courseMatch = criteria.eligibleCourses?.length === 0 ||
    criteria.eligibleCourses?.includes(academic.course) ? 1 : 0;

  // Profile completeness
  const profileFields = [
    academic.currentGWA,
    academic.yearLevel,
    academic.college,
    academic.course,
    financial.annualFamilyIncome,
    user.firstName,
    user.lastName,
    user.email
  ];
  const profileCompleteness = profileFields.filter(f => f != null).length / profileFields.length;

  // Units normalized (assuming 21 is full load)
  const unitsNormalized = academic.unitsEnrolled 
    ? Math.min(academic.unitsEnrolled / 21, 1)
    : 0.7;

  return {
    gwa: gwaNormalized,
    yearLevel: yearLevelNormalized,
    unitsEnrolled: unitsNormalized,
    financialNeed,
    stBracket: stBracketNormalized,
    collegeMatch,
    courseMatch,
    profileCompleteness,
    documentsComplete: 0.5, // Placeholder - would check actual documents
    previousApprovals: 0,   // Placeholder - would check history
    previousRejections: 0   // Placeholder - would check history
  };
}

/**
 * Predict approval probability using logistic regression
 */
async function predictApprovalProbability(user, scholarship) {
  // Use the trained logistic regression model
  const prediction = logisticRegression.predict(user, scholarship);
  const factors = logisticRegression.getPredictionFactors(user, scholarship);
  
  // Check for previous applications to adjust confidence
  const previousApps = await Application.find({
    applicant: user._id,
    status: { $in: ['approved', 'rejected'] }
  });

  const previousApprovals = previousApps.filter(a => a.status === 'approved').length;
  const previousRejections = previousApps.filter(a => a.status === 'rejected').length;

  // Adjust probability slightly based on history (but keep within bounds)
  let adjustedProbability = prediction.probability;
  if (previousApprovals > 0) {
    adjustedProbability = Math.min(0.90, adjustedProbability + 0.02 * previousApprovals);
  }
  if (previousRejections > 0) {
    adjustedProbability = Math.max(0.10, adjustedProbability - 0.01 * previousRejections);
  }

  // Get eligibility check results for detailed factor analysis
  const eligibility = await checkEligibility(user, scholarship);
  
  // Analyze factors in favor and areas to consider
  const detailedFactors = analyzeDetailedFactors(user, scholarship, eligibility, prediction);

  return {
    probability: Math.round(adjustedProbability * 100) / 100,
    probabilityPercentage: Math.round(adjustedProbability * 100),
    predictedOutcome: adjustedProbability >= 0.5 ? 'approved' : 'rejected',
    confidence: prediction.confidence,
    matchLevel: getMatchLevel(adjustedProbability),
    factors,
    detailedFactors, // New: comprehensive factor breakdown for UI
    features: prediction.features,
    modelVersion: MODEL_VERSION,
    trainedModel: prediction.trainedModel,
    previousApprovals,
    previousRejections,
    recommendation: generateRecommendation(adjustedProbability, detailedFactors),
    generatedAt: new Date()
  };
}

/**
 * Determine match level based on probability
 */
function getMatchLevel(probability) {
  if (probability >= 0.75) return 'Strong Match';
  if (probability >= 0.60) return 'Good Match';
  if (probability >= 0.45) return 'Moderate Match';
  return 'Weak Match';
}

/**
 * Analyze detailed factors for comprehensive UI display
 */
function analyzeDetailedFactors(user, scholarship, eligibility, prediction) {
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};
  const workingInFavor = [];
  const areasToConsider = [];

  // Analyze Family Income
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

  // Analyze Year Level
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

  // Analyze Course Alignment
  if (criteria.eligibleCourses?.length > 0) {
    const isEligible = criteria.eligibleCourses.includes(profile.course);
    
    const factor = {
      title: 'Course Alignment',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible
        ? 'Your course is one of the preferred programs for this scholarship.'
        : 'Your course is not among the preferred programs.',
      details: {
        typicalRange: criteria.eligibleCourses.join(', '),
        yourValue: profile.course || 'Not provided'
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Analyze Academic Performance (GWA)
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

  // Analyze ST Bracket
  if (criteria.eligibleSTBrackets?.length > 0) {
    const isEligible = criteria.eligibleSTBrackets.includes(profile.stBracket);
    
    const factor = {
      title: 'Socialized Tuition Bracket',
      status: isEligible ? 'positive' : 'negative',
      message: isEligible
        ? 'Your ST bracket qualifies for this scholarship.'
        : 'Your ST bracket does not meet the requirement.',
      details: {
        required: criteria.eligibleSTBrackets.join(', '),
        yourValue: profile.stBracket || 'Not provided'
      }
    };
    
    if (isEligible) {
      workingInFavor.push(factor);
    } else {
      areasToConsider.push(factor);
    }
  }

  // Check profile completeness
  const requiredFields = ['gwa', 'classification', 'college', 'course', 'annualFamilyIncome', 'stBracket', 'householdSize'];
  const missingFields = requiredFields.filter(field => !profile[field]);
  
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
 * Format factor name for display
 */
function formatFactorName(name) {
  const nameMap = {
    'gwa': 'GWA',
    'classification': 'Year Level',
    'college': 'College',
    'course': 'Course',
    'annualFamilyIncome': 'Annual Family Income',
    'stBracket': 'ST Bracket',
    'householdSize': 'Household Size',
    'unitsPassed': 'Units Passed',
    'unitsEnrolled': 'Units Enrolled'
  };
  return nameMap[name] || name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

/**
 * Generate recommendation text based on analysis
 */
function generateRecommendation(probability, detailedFactors) {
  const { workingInFavor, areasToConsider } = detailedFactors;
  
  if (probability >= 0.75) {
    return {
      shouldApply: true,
      level: 'highly_recommended',
      message: '✅ Yes! You have a strong chance based on historical patterns.',
      details: 'We highly recommend applying for this scholarship. Your profile strongly matches past awardees of this scholarship. Remember: this prediction helps you make informed decisions, but your unique qualities, essay, and recommendations also matter.',
      actionText: 'When in doubt, apply! Every application is a learning opportunity.'
    };
  } else if (probability >= 0.60) {
    return {
      shouldApply: true,
      level: 'recommended',
      message: '✅ Yes! You have a good chance based on your profile.',
      details: 'We recommend applying for this scholarship. Your profile aligns well with requirements, though there may be some areas to strengthen. Remember: this prediction helps you make informed decisions, but your unique qualities, essay, and recommendations also matter.',
      actionText: 'When in doubt, apply! Every application is a learning opportunity.'
    };
  } else if (probability >= 0.45) {
    return {
      shouldApply: true,
      level: 'consider',
      message: '⚠️ Consider applying, but strengthen weak areas if possible.',
      details: `You meet the basic requirements and have a moderate chance. Consider addressing the following areas: ${areasToConsider.map(a => a.title).join(', ')}. Your essays, recommendations, and personal circumstances also play important roles.`,
      actionText: 'When in doubt, apply! Every application is a learning opportunity.'
    };
  } else {
    return {
      shouldApply: false,
      level: 'not_recommended',
      message: '⚠️ Your current profile may not be competitive for this scholarship.',
      details: `Based on historical patterns, this may not be the best match. Focus on improving: ${areasToConsider.slice(0, 3).map(a => a.title).join(', ')}. Consider other scholarships that better match your profile.`,
      actionText: 'Look for scholarships that align better with your current profile, or work on strengthening your weak areas first.'
    };
  }
}

// =============================================================================
// Recommendation System
// =============================================================================

/**
 * Get scholarship recommendations for a user
 */
async function getRecommendations(user, limit = 10) {
  // Get active scholarships
  const scholarships = await Scholarship.findActive();

  // Score each scholarship
  const scored = await Promise.all(
    scholarships.map(async (scholarship) => {
      const eligibility = await checkEligibility(user, scholarship);
      
      if (!eligibility.passed) {
        return {
          scholarship,
          score: 0,
          eligible: false,
          eligibility
        };
      }

      const prediction = await predictApprovalProbability(user, scholarship);

      return {
        scholarship: {
          _id: scholarship._id,
          name: scholarship.name,
          type: scholarship.type,
          sponsor: scholarship.sponsor,
          awardAmount: scholarship.awardAmount,
          applicationDeadline: scholarship.applicationDeadline,
          daysUntilDeadline: scholarship.daysUntilDeadline
        },
        score: prediction.probability,
        eligible: true,
        eligibility,
        prediction
      };
    })
  );

  // Sort by score and return top recommendations
  return scored
    .filter(s => s.eligible)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// =============================================================================
// Model Statistics and Analytics
// =============================================================================

/**
 * Get model performance statistics
 */
async function getModelStats() {
  // Get the trained model state
  const modelState = logisticRegression.getModelState();
  
  // Get applications with predictions that have been decided
  const decidedApps = await Application.find({
    status: { $in: ['approved', 'rejected'] },
    'prediction.probability': { $exists: true }
  }).lean();

  if (decidedApps.length === 0) {
    return {
      totalPredictions: 0,
      accuracy: modelState.metrics?.accuracy || null,
      precision: modelState.metrics?.precision || null,
      recall: modelState.metrics?.recall || null,
      f1Score: modelState.metrics?.f1Score || null,
      message: 'Not enough data for statistics',
      modelVersion: MODEL_VERSION,
      trained: modelState.trained,
      trainingDate: modelState.trainingDate,
      trainingSize: modelState.trainingSize
    };
  }

  // Calculate metrics from actual predictions
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const app of decidedApps) {
    const predictedProb = app.prediction?.probability || 0.5;
    const predicted = predictedProb >= 0.5 ? 'approved' : 'rejected';
    const actual = app.status;

    if (predicted === 'approved' && actual === 'approved') {
      truePositives++;
    } else if (predicted === 'rejected' && actual === 'rejected') {
      trueNegatives++;
    } else if (predicted === 'approved' && actual === 'rejected') {
      falsePositives++;
    } else if (predicted === 'rejected' && actual === 'approved') {
      falseNegatives++;
    }
  }

  const total = decidedApps.length;
  const accuracy = (truePositives + trueNegatives) / total;
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

  return {
    modelVersion: MODEL_VERSION,
    totalPredictions: total,
    accuracy: Math.round(accuracy * 100) / 100,
    precision: Math.round(precision * 100) / 100,
    recall: Math.round(recall * 100) / 100,
    f1Score: Math.round(f1Score * 100) / 100,
    confusionMatrix: {
      truePositives,
      trueNegatives,
      falsePositives,
      falseNegatives
    },
    trained: modelState.trained,
    trainingDate: modelState.trainingDate,
    trainingSize: modelState.trainingSize,
    lastUpdated: new Date()
  };
}

/**
 * Get feature importance analysis
 */
async function getFeatureImportance() {
  const importance = logisticRegression.getFeatureImportance();
  const modelState = logisticRegression.getModelState();

  return {
    factors: importance,
    modelVersion: MODEL_VERSION,
    trained: modelState.trained,
    trainingSize: modelState.trainingSize,
    description: 'Feature importance based on logistic regression weights trained on historical data'
  };
}

/**
 * Train model with historical application data
 */
async function trainModel() {
  console.log('Starting model training...');
  
  // Train the logistic regression model on historical data
  const result = await logisticRegression.trainModel();
  
  if (!result.success) {
    return {
      status: 'failed',
      message: result.message,
      samplesAvailable: result.samplesAvailable
    };
  }
  
  return {
    status: 'completed',
    message: 'Model training completed successfully',
    samplesUsed: result.model.trainingSize,
    accuracy: result.model.metrics?.accuracy,
    f1Score: result.model.metrics?.f1Score,
    modelVersion: MODEL_VERSION,
    trainingDate: result.model.trainingDate
  };
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  checkEligibility,
  predictApprovalProbability,
  getRecommendations,
  getModelStats,
  getFeatureImportance,
  trainModel,
  MODEL_WEIGHTS,
  MODEL_VERSION,
  // Re-export logistic regression utilities
  logisticRegression: {
    getModelState: logisticRegression.getModelState,
    resetModel: logisticRegression.resetModel,
    predict: logisticRegression.predict
  }
};
