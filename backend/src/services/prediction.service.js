// =============================================================================
// ISKOlarship - Prediction Service
// Implements Hybrid Matching: Rule-Based Filtering + Logistic Regression
// Based on Research Paper: "ISKOlarship: Web-Based Scholarship Platform"
// 
// Two-Stage Approach:
// 1. RULE-BASED FILTERING: Binary eligibility checks (pass/fail)
//    - Range-based: GWA, Income, Units (min/max comparisons)
//    - List-based: Year Level, College, Course, ST Bracket (must be in list)
//    - Boolean: Has Thesis, No Other Scholarship, etc. (true/false)
//
// 2. LOGISTIC REGRESSION: Success probability prediction (0-100%)
//    - Uses 7 continuous features from eligible applications
//    - Trained on historical UPLB scholarship data
//    - Accuracy: 91% (Philippine education context)
//
// =============================================================================
// CANONICAL FIELD NAMES (from User.model.js - studentProfile)
// =============================================================================
// All services in this codebase MUST use these field names consistently:
//
// ACADEMIC FIELDS:
// - studentProfile.gwa                  (General Weighted Average, 1.0-5.0)
// - studentProfile.classification       (Year level: Freshman, Sophomore, Junior, Senior, Graduate)
// - studentProfile.college              (Full college name from UPLBCollege enum)
// - studentProfile.course               (Course/program name)
// - studentProfile.major                (Major/specialization)
// - studentProfile.unitsEnrolled        (Current units enrolled this semester)
// - studentProfile.unitsPassed          (Total units passed)
//
// FINANCIAL FIELDS:
// - studentProfile.annualFamilyIncome   (Annual family income in PHP)
// - studentProfile.householdSize        (Number of household members)
// - studentProfile.stBracket            (ST bracket: Full Discount with Stipend, Full Discount, PD80, etc.)
//
// PERSONAL FIELDS:
// - studentProfile.firstName            (First name)
// - studentProfile.lastName             (Last name)
// - studentProfile.citizenship          (Filipino, Dual Citizen, Foreign National)
// - studentProfile.provinceOfOrigin     (Province for location-based scholarships)
//
// STATUS FLAGS:
// - studentProfile.hasExistingScholarship  (Boolean)
// - studentProfile.hasThesisGrant          (Boolean)
// - studentProfile.hasDisciplinaryAction   (Boolean)
// =============================================================================

const { Application, Scholarship } = require('../models');
const logisticRegression = require('./logisticRegression.service');

// Import modular eligibility checking system
const eligibilityModule = require('./eligibility');

// Re-export normalizers for backward compatibility
const { normalizeSTBracket, stBracketsMatch } = require('./eligibility/normalizers');

// =============================================================================
// Model Version and State
// =============================================================================

const MODEL_VERSION = '3.0.0';

// =============================================================================
// Eligibility Checking (Rule-Based Filtering)
// Uses the modular eligibility system from ./eligibility/
// =============================================================================

/**
 * Complete Eligibility Check - Uses new modular system
 * Combines range-based, list-based, and boolean checks
 */
async function checkEligibility(user, scholarship) {
  // Use the new modular eligibility system
  const result = await eligibilityModule.checkEligibility(user, scholarship);
  
  // Transform to legacy format for backward compatibility
  return {
    passed: result.passed,
    score: result.score,
    checks: result.checks,
    summary: result.summary,
    stages: {
      academic: {
        checks: result.checks.filter(c => c.category === 'academic'),
        passed: result.checks.filter(c => c.category === 'academic').every(c => c.passed)
      },
      financial: {
        checks: result.checks.filter(c => c.category === 'financial'),
        passed: result.checks.filter(c => c.category === 'financial').every(c => c.passed)
      },
      additional: {
        checks: result.checks.filter(c => c.category === 'status' || c.category === 'location' || c.category === 'personal'),
        passed: result.checks.filter(c => c.category === 'status' || c.category === 'location' || c.category === 'personal').every(c => c.passed)
      }
    },
    // New: detailed breakdown by check type
    breakdown: result.breakdown
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
 * 
 * CANONICAL FIELD NAMES (from User.model.js):
 * - user.studentProfile.gwa (General Weighted Average)
 * - user.studentProfile.classification (Year level: Freshman, Sophomore, Junior, Senior, Graduate)
 * - user.studentProfile.college (Full college name)
 * - user.studentProfile.course (Course/program name)
 * - user.studentProfile.annualFamilyIncome (Annual family income in PHP)
 * - user.studentProfile.stBracket (ST bracket: Full Discount with Stipend, Full Discount, PD80, etc.)
 * - user.studentProfile.unitsEnrolled (Current units enrolled)
 * - user.studentProfile.unitsPassed (Total units passed)
 * - user.studentProfile.householdSize (Number of household members)
 */
function extractFeatures(user, scholarship) {
  const profile = user.studentProfile || {};
  const criteria = scholarship.eligibilityCriteria || {};

  // Normalize GWA (1.0 is best, 5.0 is worst, so invert)
  const gwaNormalized = profile.gwa 
    ? (5 - profile.gwa) / 4 
    : 0.5;

  // Year level encoding using canonical classification field
  const yearLevelMap = {
    'Incoming Freshman': 0.1,
    'Freshman': 0.2,
    'Sophomore': 0.4,
    'Junior': 0.6,
    'Senior': 0.8,
    'Graduate': 1.0
  };
  const yearLevelNormalized = yearLevelMap[profile.classification] || 0.5;

  // Financial need score (inverse of income)
  const maxIncome = 1000000; // Reference max income
  const financialNeed = profile.annualFamilyIncome 
    ? 1 - (profile.annualFamilyIncome / maxIncome)
    : 0.5;

  // ST Bracket encoding (higher need = higher score)
  // Uses canonical ST bracket names from User.model.js
  const stBracketMap = {
    'Full Discount with Stipend': 1.0,
    'Full Discount': 0.85,
    'PD80': 0.7,
    'PD60': 0.55,
    'PD40': 0.4,
    'PD20': 0.25,
    'No Discount': 0.1
  };
  const stBracketNormalized = stBracketMap[profile.stBracket] || 0.5;

  // College match
  const collegeMatch = !criteria.eligibleColleges?.length ||
    criteria.eligibleColleges.includes(profile.college) ? 1 : 0;

  // Course match
  const courseMatch = !criteria.eligibleCourses?.length ||
    criteria.eligibleCourses.includes(profile.course) ? 1 : 0;

  // Profile completeness - using canonical field names
  const profileFields = [
    profile.gwa,
    profile.classification,
    profile.college,
    profile.course,
    profile.annualFamilyIncome,
    profile.firstName,
    profile.lastName,
    user.email
  ];
  const profileCompleteness = profileFields.filter(f => f != null).length / profileFields.length;

  // Units normalized (assuming 21 is full load)
  const unitsNormalized = profile.unitsEnrolled 
    ? Math.min(profile.unitsEnrolled / 21, 1)
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
 * Now uses trained models from TrainedModel database
 */
async function predictApprovalProbability(user, scholarship) {
  // Use the async prediction that loads from TrainedModel database
  let prediction;
  try {
    prediction = await logisticRegression.predictAsync(user, scholarship);
  } catch (error) {
    console.error('Async prediction failed, using sync fallback:', error.message);
    prediction = logisticRegression.predict(user, scholarship);
  }
  
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

  // Ensure factors array contains only flat objects with string/number values
  const sanitizedFactors = (prediction.factors || []).map(f => ({
    factor: String(f.factor || ''),
    contribution: Number(f.contribution) || 0,
    rawContribution: Number(f.rawContribution) || 0,
    description: String(f.description || ''),
    met: Boolean(f.met),
    value: Number(f.value) || 0,
    weight: Number(f.weight) || 0
  }));

  return {
    probability: Math.round(adjustedProbability * 100) / 100,
    probabilityPercentage: Math.round(adjustedProbability * 100),
    predictedOutcome: adjustedProbability >= 0.5 ? 'approved' : 'rejected',
    confidence: prediction.confidence,
    matchLevel: getMatchLevel(adjustedProbability),
    factors: sanitizedFactors,
    zScore: prediction.zScore, // Include z-score for transparency
    intercept: prediction.intercept, // Include intercept/bias term for calculation breakdown
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
 * 
 * Uses canonical field names from User.model.js:
 * - profile.gwa, profile.classification, profile.college, profile.course
 * - profile.annualFamilyIncome, profile.stBracket, profile.householdSize
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
  // Use normalizer for proper comparison
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

  // Analyze Units Passed (using canonical field: unitsPassed) - for thesis grants
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
 * Returns a simple string for display
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

// =============================================================================
// Recommendation System
// =============================================================================

/**
 * Get scholarship recommendations for a user
 * Returns both fully eligible and partial matches (>= 50% eligibility score)
 * 
 * @param {Object} user - User object with studentProfile
 * @param {number} limit - Maximum number of recommendations to return
 * @param {boolean} includePartial - Include partial matches (default: true)
 * @param {number} minEligibilityScore - Minimum eligibility score for partial matches (default: 50)
 */
async function getRecommendations(user, limit = 10, includePartial = true, minEligibilityScore = 50) {
  // Get active scholarships
  const scholarships = await Scholarship.findActive();

  // Score each scholarship
  const scored = await Promise.all(
    scholarships.map(async (scholarship) => {
      const eligibility = await checkEligibility(user, scholarship);
      
      // Calculate overall eligibility score percentage
      const eligibilityScore = eligibility.score || 0;
      
      // For fully eligible scholarships, get ML prediction
      if (eligibility.passed) {
        const prediction = await predictApprovalProbability(user, scholarship);
        
        return {
          scholarship: {
            _id: scholarship._id,
            name: scholarship.name,
            type: scholarship.type,
            sponsor: scholarship.sponsor,
            awardAmount: scholarship.awardAmount,
            applicationDeadline: scholarship.applicationDeadline,
            daysUntilDeadline: scholarship.daysUntilDeadline,
            description: scholarship.description
          },
          score: prediction.probability,
          eligibilityScore: 100,
          eligible: true,
          matchType: 'full',
          eligibility,
          prediction
        };
      }
      
      // For partial matches, use eligibility score
      if (includePartial && eligibilityScore >= minEligibilityScore) {
        // Get the failed checks for display
        const failedChecks = eligibility.checks.filter(c => !c.passed);
        
        return {
          scholarship: {
            _id: scholarship._id,
            name: scholarship.name,
            type: scholarship.type,
            sponsor: scholarship.sponsor,
            awardAmount: scholarship.awardAmount,
            applicationDeadline: scholarship.applicationDeadline,
            daysUntilDeadline: scholarship.daysUntilDeadline,
            description: scholarship.description
          },
          score: eligibilityScore, // Use eligibility score for ranking
          eligibilityScore: eligibilityScore,
          eligible: false,
          matchType: 'partial',
          eligibility,
          failedChecks: failedChecks.map(c => ({
            criterion: c.criterion,
            applicantValue: c.applicantValue,
            requiredValue: c.requiredValue,
            notes: c.notes
          }))
        };
      }
      
      // Not eligible and doesn't meet partial match threshold
      return null;
    })
  );

  // Filter out nulls, sort by score, and return top recommendations
  // Prioritize full matches over partial matches
  return scored
    .filter(s => s !== null)
    .sort((a, b) => {
      // Full matches come first
      if (a.matchType === 'full' && b.matchType !== 'full') return -1;
      if (a.matchType !== 'full' && b.matchType === 'full') return 1;
      // Then sort by score
      return b.score - a.score;
    })
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
 * NOTE: For full training with database persistence, use:
 *   node scripts/train-all-scholarships.js
 */
async function trainModel() {
  console.log('Starting model training...');
  
  // Use the dedicated training service for database-backed training
  const trainingService = require('./training.service');
  const result = await trainingService.trainGlobalModel();
  
  // Clear prediction cache to use new weights
  logisticRegression.clearModelWeightsCache();
  
  if (!result.success) {
    return {
      status: 'failed',
      message: result.message,
      samplesAvailable: result.samplesUsed || 0
    };
  }
  
  return {
    status: 'completed',
    message: 'Model training completed and saved to database',
    samplesUsed: result.samplesUsed,
    accuracy: result.accuracy,
    f1Score: result.f1Score,
    modelVersion: MODEL_VERSION,
    trainingDate: new Date()
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
  MODEL_VERSION,
  // Re-export logistic regression utilities for backward compatibility
  logisticRegression: {
    getModelState: logisticRegression.getModelState,
    resetModel: logisticRegression.resetModel,
    clearModelWeightsCache: logisticRegression.clearModelWeightsCache
  }
};
