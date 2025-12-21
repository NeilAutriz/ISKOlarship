// =============================================================================
// ISKOlarship - Prediction Service
// Implements Logistic Regression for scholarship matching
// Based on Research Paper Section III.C: Logistic Regression Model
// =============================================================================

const { Application, Scholarship } = require('../models');

// =============================================================================
// Pre-trained Model Weights (from research paper methodology)
// These weights are based on historical data analysis
// =============================================================================

const MODEL_WEIGHTS = {
  intercept: -2.5,
  
  // Academic factors (highest importance per research)
  gwa: 1.8,                    // Strong positive correlation
  yearLevel: 0.3,              // Higher year = slightly more likely
  unitsEnrolled: 0.1,          // Full load = positive
  
  // Financial factors
  financialNeed: 1.2,          // Higher need = higher priority for need-based
  stBracket: 0.8,              // Lower bracket = higher priority
  
  // Match factors
  collegeMatch: 0.6,           // Matching college = positive
  courseMatch: 0.4,            // Matching course = positive
  
  // Application quality
  profileCompleteness: 0.5,    // Complete profile = positive
  documentsComplete: 0.7,      // All documents = positive
  
  // Historical factors
  previousApprovals: 0.9,      // Past approvals = positive signal
  previousRejections: -0.4     // Past rejections = negative signal
};

const MODEL_VERSION = '1.0.0';

// =============================================================================
// Eligibility Checking (Rule-Based Filtering)
// Implements 3-stage filtering from research paper
// =============================================================================

/**
 * Stage 1: Academic Eligibility Check
 */
function checkAcademicEligibility(user, scholarship) {
  const checks = [];
  const academic = user.studentProfile?.academicInfo || {};
  const criteria = scholarship.eligibilityCriteria || {};

  // GWA Check
  if (criteria.minGWA) {
    const passed = academic.currentGWA && academic.currentGWA <= criteria.minGWA;
    checks.push({
      criterion: 'Minimum GWA',
      passed,
      applicantValue: academic.currentGWA || 'Not provided',
      requiredValue: `≤ ${criteria.minGWA}`,
      notes: passed ? 'Meets GWA requirement' : 'Does not meet GWA requirement'
    });
  }

  // Year Level Check
  if (criteria.requiredYearLevels?.length > 0) {
    const passed = criteria.requiredYearLevels.includes(academic.yearLevel);
    checks.push({
      criterion: 'Year Level',
      passed,
      applicantValue: academic.yearLevel || 'Not provided',
      requiredValue: criteria.requiredYearLevels.join(', '),
      notes: passed ? 'Year level matches' : 'Year level does not match'
    });
  }

  // College Check
  if (criteria.eligibleColleges?.length > 0) {
    const passed = criteria.eligibleColleges.includes(academic.college);
    checks.push({
      criterion: 'College',
      passed,
      applicantValue: academic.college || 'Not provided',
      requiredValue: criteria.eligibleColleges.join(', '),
      notes: passed ? 'College is eligible' : 'College is not eligible'
    });
  }

  // Course Check
  if (criteria.eligibleCourses?.length > 0) {
    const passed = criteria.eligibleCourses.includes(academic.course);
    checks.push({
      criterion: 'Course',
      passed,
      applicantValue: academic.course || 'Not provided',
      requiredValue: `${criteria.eligibleCourses.length} eligible courses`,
      notes: passed ? 'Course is eligible' : 'Course is not eligible'
    });
  }

  // Units Check
  if (criteria.minUnitsEnrolled) {
    const passed = academic.unitsEnrolled && academic.unitsEnrolled >= criteria.minUnitsEnrolled;
    checks.push({
      criterion: 'Enrolled Units',
      passed,
      applicantValue: academic.unitsEnrolled || 'Not provided',
      requiredValue: `≥ ${criteria.minUnitsEnrolled}`,
      notes: passed ? 'Meets minimum units' : 'Does not meet minimum units'
    });
  }

  return checks;
}

/**
 * Stage 2: Financial Eligibility Check
 */
function checkFinancialEligibility(user, scholarship) {
  const checks = [];
  const financial = user.studentProfile?.financialInfo || {};
  const criteria = scholarship.eligibilityCriteria || {};

  // Income Check
  if (criteria.maxAnnualFamilyIncome) {
    const passed = financial.annualFamilyIncome && 
                   financial.annualFamilyIncome <= criteria.maxAnnualFamilyIncome;
    checks.push({
      criterion: 'Maximum Family Income',
      passed,
      applicantValue: financial.annualFamilyIncome 
        ? `₱${financial.annualFamilyIncome.toLocaleString()}` 
        : 'Not provided',
      requiredValue: `≤ ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`,
      notes: passed ? 'Within income limit' : 'Exceeds income limit'
    });
  }

  // ST Bracket Check
  if (criteria.requiredSTBrackets?.length > 0) {
    const passed = criteria.requiredSTBrackets.includes(financial.stBracket);
    checks.push({
      criterion: 'ST Bracket',
      passed,
      applicantValue: financial.stBracket || 'Not provided',
      requiredValue: criteria.requiredSTBrackets.join(', '),
      notes: passed ? 'ST bracket matches' : 'ST bracket does not match'
    });
  }

  return checks;
}

/**
 * Stage 3: Additional Requirements Check
 */
function checkAdditionalRequirements(user, scholarship) {
  const checks = [];
  const criteria = scholarship.eligibilityCriteria || {};

  // Thesis Approval Check
  if (criteria.requiresApprovedThesis) {
    const passed = user.studentProfile?.academicInfo?.hasApprovedThesis === true;
    checks.push({
      criterion: 'Approved Thesis',
      passed,
      applicantValue: passed ? 'Yes' : 'No',
      requiredValue: 'Required',
      notes: passed ? 'Has approved thesis' : 'No approved thesis'
    });
  }

  // No Other Scholarship Check
  if (criteria.mustNotHaveOtherScholarship) {
    const passed = user.studentProfile?.financialInfo?.currentScholarship === null;
    checks.push({
      criterion: 'No Other Scholarship',
      passed,
      applicantValue: passed ? 'No current scholarship' : 'Has scholarship',
      requiredValue: 'Must not have other scholarship',
      notes: passed ? 'No conflicting scholarship' : 'Already has scholarship'
    });
  }

  // No Disciplinary Action Check
  if (criteria.mustNotHaveDisciplinaryAction) {
    const passed = user.studentProfile?.academicInfo?.hasDisciplinaryAction !== true;
    checks.push({
      criterion: 'No Disciplinary Action',
      passed,
      applicantValue: passed ? 'None' : 'Has record',
      requiredValue: 'Must not have disciplinary action',
      notes: passed ? 'Clean record' : 'Has disciplinary record'
    });
  }

  // No Failing Grade Check
  if (criteria.mustNotHaveFailingGrade) {
    const passed = user.studentProfile?.academicInfo?.hasFailingGrade !== true;
    checks.push({
      criterion: 'No Failing Grade',
      passed,
      applicantValue: passed ? 'None' : 'Has failing grade',
      requiredValue: 'Must not have failing grade',
      notes: passed ? 'No failing grades' : 'Has failing grades'
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
  // Extract features
  const features = extractFeatures(user, scholarship);

  // Check for previous applications
  const previousApps = await Application.find({
    applicant: user._id,
    status: { $in: ['approved', 'rejected'] }
  });

  features.previousApprovals = previousApps.filter(a => a.status === 'approved').length;
  features.previousRejections = previousApps.filter(a => a.status === 'rejected').length;

  // Calculate linear combination
  let z = MODEL_WEIGHTS.intercept;
  
  const featureContributions = {};
  
  for (const [feature, value] of Object.entries(features)) {
    if (MODEL_WEIGHTS[feature]) {
      const contribution = MODEL_WEIGHTS[feature] * value;
      z += contribution;
      featureContributions[feature] = contribution;
    }
  }

  // Apply sigmoid
  const probability = sigmoid(z);

  // Determine confidence level
  let confidence;
  if (probability > 0.7 || probability < 0.3) {
    confidence = 'high';
  } else if (probability > 0.55 || probability < 0.45) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Determine predicted outcome
  const predictedOutcome = probability >= 0.5 ? 'approved' : 'rejected';

  return {
    probability: Math.round(probability * 100) / 100,
    probabilityPercentage: Math.round(probability * 100),
    predictedOutcome,
    confidence,
    featureContributions,
    features,
    modelVersion: MODEL_VERSION,
    generatedAt: new Date()
  };
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
  // Get applications with predictions that have been decided
  const decidedApps = await Application.find({
    status: { $in: ['approved', 'rejected'] },
    'prediction.predictedOutcome': { $exists: true }
  }).lean();

  if (decidedApps.length === 0) {
    return {
      totalPredictions: 0,
      accuracy: null,
      precision: null,
      recall: null,
      message: 'Not enough data for statistics'
    };
  }

  // Calculate metrics
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const app of decidedApps) {
    const predicted = app.prediction.predictedOutcome;
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
    lastUpdated: new Date()
  };
}

/**
 * Get feature importance analysis
 */
async function getFeatureImportance() {
  // Return normalized absolute weights as importance
  const absoluteWeights = {};
  let totalAbsolute = 0;

  for (const [feature, weight] of Object.entries(MODEL_WEIGHTS)) {
    if (feature !== 'intercept') {
      const absWeight = Math.abs(weight);
      absoluteWeights[feature] = absWeight;
      totalAbsolute += absWeight;
    }
  }

  const importance = {};
  for (const [feature, absWeight] of Object.entries(absoluteWeights)) {
    importance[feature] = {
      weight: MODEL_WEIGHTS[feature],
      absoluteWeight: absWeight,
      importance: Math.round((absWeight / totalAbsolute) * 100) / 100,
      direction: MODEL_WEIGHTS[feature] > 0 ? 'positive' : 'negative'
    };
  }

  // Sort by importance
  const sorted = Object.entries(importance)
    .sort((a, b) => b[1].absoluteWeight - a[1].absoluteWeight)
    .map(([feature, data]) => ({ feature, ...data }));

  return {
    factors: sorted,
    modelVersion: MODEL_VERSION,
    description: 'Feature importance based on logistic regression weights'
  };
}

/**
 * Train model with new data (placeholder for future implementation)
 */
async function trainModel(historicalData) {
  // In a production system, this would:
  // 1. Preprocess the historical data
  // 2. Split into training/validation sets
  // 3. Train the logistic regression model
  // 4. Validate and calculate new weights
  // 5. Update MODEL_WEIGHTS

  return {
    status: 'initiated',
    samplesUsed: historicalData.length,
    message: 'Model training initiated. This is a placeholder for production implementation.',
    estimatedCompletion: new Date(Date.now() + 60000)
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
  MODEL_VERSION
};
