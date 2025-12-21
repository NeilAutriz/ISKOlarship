// =============================================================================
// ISKOlarship - Applications Seed Data
// Based on ERD from research paper
// Contains historical application data for logistic regression training
// =============================================================================

const { ApplicationStatus } = require('../models/Application.model');

// Application types for seed data
const ApplicationType = {
  HISTORICAL: 'historical',
  CURRENT: 'current'
};

// =============================================================================
// Helper Functions
// =============================================================================

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// =============================================================================
// Generate Historical Applications
// This data is used to train the logistic regression model for prediction
// =============================================================================

const generateHistoricalApplications = (students, scholarships, count = 200) => {
  const applications = [];
  const startDate = daysAgo(365); // 1 year ago
  const endDate = daysAgo(30); // 1 month ago
  
  // Track unique combinations to avoid duplicates
  const uniqueCombinations = new Set();

  for (let i = 0; i < count; i++) {
    // Try to find a unique student-scholarship combination
    let attempts = 0;
    let student, scholarship, combinationKey;
    
    do {
      student = students[Math.floor(Math.random() * students.length)];
      scholarship = scholarships[Math.floor(Math.random() * scholarships.length)];
      combinationKey = `${student._id.toString()}_${scholarship._id.toString()}`;
      attempts++;
    } while (uniqueCombinations.has(combinationKey) && attempts < 100);
    
    // Skip if we couldn't find a unique combination
    if (uniqueCombinations.has(combinationKey)) continue;
    uniqueCombinations.add(combinationKey);
    
    if (!student.studentProfile) continue;

    const studentProfile = student.studentProfile;
    const eligibilityCriteria = scholarship.eligibilityCriteria || {};

    // Calculate eligibility percentage based on criteria matching
    let matchedCriteria = 0;
    let totalCriteria = 0;

    // GWA Check
    if (eligibilityCriteria.maxGWA) {
      totalCriteria++;
      if (studentProfile.gwa <= eligibilityCriteria.maxGWA) matchedCriteria++;
    }

    // Income Check
    if (eligibilityCriteria.maxAnnualFamilyIncome) {
      totalCriteria++;
      if (studentProfile.familyAnnualIncome <= eligibilityCriteria.maxAnnualFamilyIncome) matchedCriteria++;
    }

    // Classification Check
    if (eligibilityCriteria.eligibleClassifications && eligibilityCriteria.eligibleClassifications.length > 0) {
      totalCriteria++;
      if (eligibilityCriteria.eligibleClassifications.includes(studentProfile.classification)) matchedCriteria++;
    }

    // College Check
    if (eligibilityCriteria.eligibleColleges && eligibilityCriteria.eligibleColleges.length > 0) {
      totalCriteria++;
      if (eligibilityCriteria.eligibleColleges.includes(studentProfile.college)) matchedCriteria++;
    }

    // Course Check
    if (eligibilityCriteria.eligibleCourses && eligibilityCriteria.eligibleCourses.length > 0) {
      totalCriteria++;
      if (eligibilityCriteria.eligibleCourses.includes(studentProfile.course)) matchedCriteria++;
    }

    // Province Check
    if (eligibilityCriteria.eligibleProvinces && eligibilityCriteria.eligibleProvinces.length > 0) {
      totalCriteria++;
      if (eligibilityCriteria.eligibleProvinces.includes(studentProfile.provinceOfOrigin)) matchedCriteria++;
    }

    // No failing grade check
    if (eligibilityCriteria.mustNotHaveFailingGrade) {
      totalCriteria++;
      if (!studentProfile.hasFailingGrade) matchedCriteria++;
    }

    // No grade of 4 check
    if (eligibilityCriteria.mustNotHaveGradeOf4) {
      totalCriteria++;
      if (!studentProfile.hasGradeOf4) matchedCriteria++;
    }

    // No incomplete grade check
    if (eligibilityCriteria.mustNotHaveIncompleteGrade) {
      totalCriteria++;
      if (!studentProfile.hasIncompleteGrade) matchedCriteria++;
    }

    // No other scholarship check
    if (eligibilityCriteria.mustNotHaveOtherScholarship) {
      totalCriteria++;
      if (!studentProfile.hasOtherScholarship) matchedCriteria++;
    }

    // Thesis outline check
    if (eligibilityCriteria.requiresApprovedThesisOutline) {
      totalCriteria++;
      if (studentProfile.hasApprovedThesisOutline) matchedCriteria++;
    }

    // ST Bracket check
    if (eligibilityCriteria.eligibleSTBrackets && eligibilityCriteria.eligibleSTBrackets.length > 0) {
      totalCriteria++;
      if (studentProfile.stBracket && eligibilityCriteria.eligibleSTBrackets.includes(studentProfile.stBracket)) matchedCriteria++;
    }

    // Calculate eligibility percentage
    const eligibilityPercentage = totalCriteria > 0 
      ? Math.round((matchedCriteria / totalCriteria) * 100) 
      : 50; // Default to 50% if no criteria

    // Determine application status based on eligibility
    // Higher eligibility = higher chance of approval
    const approvalThreshold = randomBetween(60, 80);
    let status;
    
    if (eligibilityPercentage >= 90) {
      status = Math.random() < 0.85 ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
    } else if (eligibilityPercentage >= 75) {
      status = Math.random() < 0.65 ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
    } else if (eligibilityPercentage >= 50) {
      status = Math.random() < 0.35 ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
    } else {
      status = Math.random() < 0.1 ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
    }

    // Calculate prediction score (simulating logistic regression output)
    // This is based on multiple factors
    let predictionScore = 0.5;
    
    // GWA factor (lower is better)
    if (studentProfile.gwa <= 1.5) predictionScore += 0.15;
    else if (studentProfile.gwa <= 2.0) predictionScore += 0.1;
    else if (studentProfile.gwa <= 2.5) predictionScore += 0.05;
    else predictionScore -= 0.05;

    // Income factor (lower is better for need-based)
    if (studentProfile.familyAnnualIncome <= 150000) predictionScore += 0.1;
    else if (studentProfile.familyAnnualIncome <= 250000) predictionScore += 0.05;
    
    // Eligibility factor
    predictionScore += (eligibilityPercentage / 100) * 0.2;

    // Add some randomness
    predictionScore += randomBetween(-0.1, 0.1);
    
    // Clamp between 0 and 1
    predictionScore = Math.max(0, Math.min(1, predictionScore));
    predictionScore = Math.round(predictionScore * 100) / 100;

    // Generate dates
    const appliedDate = randomDate(startDate, endDate);
    const decisionDate = new Date(appliedDate);
    decisionDate.setDate(decisionDate.getDate() + Math.floor(randomBetween(7, 30)));

    // Document submission (random for historical data)
    const hasTranscript = Math.random() < 0.9;
    const hasIncomeCertificate = Math.random() < 0.85;
    const hasCertificateOfRegistration = Math.random() < 0.95;
    const hasGradeReport = Math.random() < 0.8;

    applications.push({
      applicant: student._id,
      scholarship: scholarship._id,
      status,
      eligibilityPercentage,
      hasTranscript,
      hasIncomeCertificate,
      hasCertificateOfRegistration,
      hasGradeReport,
      prediction: {
        probability: predictionScore,
        model: 'logistic_regression_v1',
        calculatedAt: appliedDate
      },
      appliedDate,
      submittedAt: appliedDate,
      decisionDate: status !== ApplicationStatus.PENDING ? decisionDate : null,
      applicantSnapshot: {
        studentNumber: studentProfile.studentNumber,
        firstName: studentProfile.firstName,
        lastName: studentProfile.lastName,
        college: studentProfile.college,
        course: studentProfile.course,
        major: studentProfile.major,
        classification: studentProfile.classification,
        gwa: studentProfile.gwa,
        annualFamilyIncome: studentProfile.familyAnnualIncome,
        provinceOfOrigin: studentProfile.provinceOfOrigin,
        stBracket: studentProfile.stBracket,
        citizenship: studentProfile.citizenship
      },
      reviewNotes: status === ApplicationStatus.APPROVED 
        ? 'Meets all eligibility criteria. Approved for scholarship grant.'
        : status === ApplicationStatus.REJECTED 
          ? 'Does not meet minimum eligibility requirements.'
          : '',
      academicYear: '2024-2025',
      semester: 'First',
      isComplete: true
    });
  }

  return { applications, usedCombinations: uniqueCombinations };
};

// =============================================================================
// Generate Current Applications (Pending/In-Review)
// =============================================================================

const generateCurrentApplications = (students, scholarships, existingCombinations = new Set(), count = 30) => {
  const applications = [];
  const startDate = daysAgo(14);
  const endDate = new Date();
  
  // Use existing combinations to avoid duplicates
  const uniqueCombinations = new Set(existingCombinations);

  // Filter eligible students (those without too many issues)
  const eligibleStudents = students.filter(s => 
    s.studentProfile && 
    !s.studentProfile.hasFailingGrade &&
    !s.studentProfile.hasDisciplinaryAction
  );

  for (let i = 0; i < count && i < eligibleStudents.length; i++) {
    const student = eligibleStudents[i % eligibleStudents.length];
    const scholarship = scholarships[i % scholarships.length];
    
    // Check for duplicate
    const combinationKey = `${student._id.toString()}_${scholarship._id.toString()}`;
    if (uniqueCombinations.has(combinationKey)) continue;
    uniqueCombinations.add(combinationKey);
    
    const studentProfile = student.studentProfile;
    const eligibilityCriteria = scholarship.eligibilityCriteria || {};

    // Calculate eligibility (same logic as historical)
    let matchedCriteria = 0;
    let totalCriteria = 0;

    if (eligibilityCriteria.maxGWA) {
      totalCriteria++;
      if (studentProfile.gwa <= eligibilityCriteria.maxGWA) matchedCriteria++;
    }
    if (eligibilityCriteria.maxAnnualFamilyIncome) {
      totalCriteria++;
      if (studentProfile.familyAnnualIncome <= eligibilityCriteria.maxAnnualFamilyIncome) matchedCriteria++;
    }
    if (eligibilityCriteria.eligibleClassifications?.length > 0) {
      totalCriteria++;
      if (eligibilityCriteria.eligibleClassifications.includes(studentProfile.classification)) matchedCriteria++;
    }
    if (eligibilityCriteria.eligibleColleges?.length > 0) {
      totalCriteria++;
      if (eligibilityCriteria.eligibleColleges.includes(studentProfile.college)) matchedCriteria++;
    }

    const eligibilityPercentage = totalCriteria > 0 
      ? Math.round((matchedCriteria / totalCriteria) * 100) 
      : 50;

    // Calculate prediction score
    let predictionScore = 0.5 + (eligibilityPercentage / 100) * 0.3;
    if (studentProfile.gwa <= 2.0) predictionScore += 0.1;
    if (studentProfile.familyAnnualIncome <= 250000) predictionScore += 0.05;
    predictionScore = Math.max(0, Math.min(1, predictionScore));
    predictionScore = Math.round(predictionScore * 100) / 100;

    // Vary status between pending and under_review
    const status = Math.random() < 0.6 ? ApplicationStatus.PENDING : ApplicationStatus.UNDER_REVIEW;
    const appliedDate = randomDate(startDate, endDate);

    applications.push({
      applicant: student._id,
      scholarship: scholarship._id,
      status,
      eligibilityPercentage,
      hasTranscript: true,
      hasIncomeCertificate: true,
      hasCertificateOfRegistration: true,
      hasGradeReport: Math.random() < 0.8,
      prediction: {
        probability: predictionScore,
        model: 'logistic_regression_v1',
        calculatedAt: appliedDate
      },
      appliedDate,
      submittedAt: appliedDate,
      decisionDate: null,
      applicantSnapshot: {
        studentNumber: studentProfile.studentNumber,
        firstName: studentProfile.firstName,
        lastName: studentProfile.lastName,
        college: studentProfile.college,
        course: studentProfile.course,
        major: studentProfile.major,
        classification: studentProfile.classification,
        gwa: studentProfile.gwa,
        annualFamilyIncome: studentProfile.familyAnnualIncome,
        provinceOfOrigin: studentProfile.provinceOfOrigin,
        stBracket: studentProfile.stBracket,
        citizenship: studentProfile.citizenship
      },
      reviewNotes: '',
      academicYear: '2025-2026',
      semester: 'First',
      isComplete: true
    });
  }

  return applications;
};

// =============================================================================
// Seed Function
// =============================================================================

const seedApplications = async (Application, students, scholarships) => {
  try {
    await Application.deleteMany({});
    console.log('Cleared existing applications');

    // Generate historical applications for ML training
    const { applications: historicalApplications, usedCombinations } = generateHistoricalApplications(students, scholarships, 200);
    console.log(`Generated ${historicalApplications.length} historical applications`);

    // Generate current applications (passing used combinations to avoid duplicates)
    const currentApplications = generateCurrentApplications(students, scholarships, usedCombinations, 40);
    console.log(`Generated ${currentApplications.length} current applications`);

    const allApplications = [...historicalApplications, ...currentApplications];
    const insertedApplications = await Application.insertMany(allApplications);

    console.log(`Inserted ${insertedApplications.length} total applications`);

    // Calculate and log statistics
    const approved = insertedApplications.filter(a => a.status === ApplicationStatus.APPROVED).length;
    const rejected = insertedApplications.filter(a => a.status === ApplicationStatus.REJECTED).length;
    const pending = insertedApplications.filter(a => a.status === ApplicationStatus.PENDING).length;
    const underReview = insertedApplications.filter(a => a.status === ApplicationStatus.UNDER_REVIEW).length;

    console.log('Application Statistics:');
    console.log(`  - Approved: ${approved}`);
    console.log(`  - Rejected: ${rejected}`);
    console.log(`  - Pending: ${pending}`);
    console.log(`  - Under Review: ${underReview}`);

    return insertedApplications;
  } catch (error) {
    console.error('Error seeding applications:', error);
    throw error;
  }
};

// =============================================================================
// Generate Training Data for ML
// This function extracts features for logistic regression
// =============================================================================

const generateTrainingData = (applications) => {
  return applications
    .filter(app => app.status === ApplicationStatus.APPROVED || app.status === ApplicationStatus.REJECTED)
    .map(app => ({
      // Features (X)
      features: {
        gwa: app.applicantSnapshot?.gwa || 2.5,
        familyIncome: app.applicantSnapshot?.annualFamilyIncome || 250000,
        eligibilityPercentage: app.eligibilityPercentage || 50,
        hasCompleteDocuments: 
          (app.hasTranscript ? 1 : 0) +
          (app.hasIncomeCertificate ? 1 : 0) +
          (app.hasCertificateOfRegistration ? 1 : 0) +
          (app.hasGradeReport ? 1 : 0),
        classification: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'].indexOf(
          app.applicantSnapshot?.classification || 'Junior'
        ) + 1
      },
      // Label (y) - 1 for approved, 0 for rejected
      label: app.status === ApplicationStatus.APPROVED ? 1 : 0
    }));
};

module.exports = {
  generateHistoricalApplications,
  generateCurrentApplications,
  generateTrainingData,
  seedApplications
};
