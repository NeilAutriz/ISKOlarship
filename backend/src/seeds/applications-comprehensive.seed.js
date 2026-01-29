// =============================================================================
// ISKOlarship - Comprehensive Applications Seed Data
// Properly formatted applications matching real system behavior
// With statusHistory, documents, eligibilityChecks, applicantSnapshot, prediction
// =============================================================================

const mongoose = require('mongoose');
const { ApplicationStatus } = require('../models/Application.model');

// =============================================================================
// Document Types Mapping
// =============================================================================

const DocumentTypes = {
  'Transcript of Records (TOR)': 'transcript',
  'Certificate of Registration': 'certificate_of_registration',
  'Personal Statement/Essay': 'personal_statement',
  'Valid ID': 'photo_id',
  '2x2 Photo': 'other',
  'Income Tax Return (ITR)': 'income_certificate',
  'Approved Thesis Outline': 'thesis_outline',
  'Certificate of Indigency': 'other',
  'Sworn Statement of Family Income': 'income_certificate',
  'Faculty Adviser Endorsement Letter': 'recommendation_letter',
  'Research Budget Proposal': 'other',
  'Programming Portfolio': 'other',
  'Competition Certificates': 'other',
  'Math Competition Certificates': 'other',
  'Certificate of Good Moral Character': 'other',
  'Business Plan': 'other',
  'Approved Thesis/Research Proposal': 'thesis_outline'
};

// =============================================================================
// Helper Functions
// =============================================================================

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const hoursAgo = (hours) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
};

// Generate realistic file names
const generateFileName = (docType) => {
  const fileNames = {
    'transcript': ['TOR_2024.pdf', 'Transcript_Official.pdf', 'Academic_Record.pdf'],
    'certificate_of_registration': ['COR_2026.pdf', 'Registration_Cert.pdf', 'Enrollment_Form.pdf'],
    'personal_statement': ['Personal_Statement.pdf', 'Essay.docx', 'Statement_of_Purpose.pdf'],
    'photo_id': ['Valid_ID.jpg', 'School_ID.jpg', 'Government_ID.png'],
    'income_certificate': ['ITR_2025.pdf', 'Income_Certificate.pdf', 'BIR_Certificate.pdf'],
    'thesis_outline': ['Thesis_Proposal.pdf', 'Research_Outline.docx', 'Approved_Thesis.pdf'],
    'other': ['Document.pdf', 'Supporting_Doc.pdf', 'Additional_Requirement.pdf'],
    'recommendation_letter': ['Recommendation_Letter.pdf', 'Endorsement.pdf', 'Faculty_Letter.pdf']
  };
  const files = fileNames[docType] || fileNames['other'];
  return files[Math.floor(Math.random() * files.length)];
};

// Generate document array based on scholarship requirements
const generateDocuments = (requiredDocuments, uploadDate) => {
  return requiredDocuments.map(doc => {
    const docType = DocumentTypes[doc.name] || 'other';
    const isOptional = !doc.isRequired;
    const uploaded = isOptional ? Math.random() < 0.7 : true; // 70% chance to upload optional docs
    
    if (!uploaded && isOptional) return null;
    
    return {
      name: isOptional ? `${doc.name} (Optional)` : doc.name,
      documentType: docType,
      fileName: generateFileName(docType),
      fileSize: Math.floor(randomBetween(50000, 500000)),
      mimeType: docType.includes('photo') || docType.includes('id') ? 'image/jpeg' : 'application/pdf',
      uploadedAt: uploadDate,
      verified: false
    };
  }).filter(doc => doc !== null);
};

// Generate eligibility checks based on scholarship criteria and student profile
const generateEligibilityChecks = (scholarship, studentProfile) => {
  const checks = [];
  const criteria = scholarship.eligibilityCriteria || {};

  // GWA Check
  if (criteria.maxGWA) {
    const passed = studentProfile.gwa <= criteria.maxGWA && 
                   (!criteria.minGWA || studentProfile.gwa >= criteria.minGWA);
    checks.push({
      criterion: 'GWA Requirement',
      passed,
      applicantValue: studentProfile.gwa.toFixed(2),
      requiredValue: criteria.minGWA 
        ? `${criteria.minGWA.toFixed(2)} - ${criteria.maxGWA.toFixed(2)}`
        : `≤ ${criteria.maxGWA.toFixed(2)}`,
      weight: 1,
      notes: passed ? 'Meets GWA requirement' : 'Does not meet GWA requirement'
    });
  }

  // Income Check
  if (criteria.maxAnnualFamilyIncome) {
    const income = studentProfile.annualFamilyIncome || studentProfile.familyAnnualIncome;
    const passed = income <= criteria.maxAnnualFamilyIncome;
    checks.push({
      criterion: 'Annual Family Income',
      passed,
      applicantValue: `₱${income?.toLocaleString() || 'N/A'}`,
      requiredValue: `≤ ₱${criteria.maxAnnualFamilyIncome.toLocaleString()}`,
      weight: 1,
      notes: passed ? 'Within eligible income range' : 'Exceeds maximum income limit'
    });
  }

  // Units Enrolled Check
  if (criteria.minUnitsEnrolled) {
    const passed = studentProfile.unitsEnrolled >= criteria.minUnitsEnrolled;
    checks.push({
      criterion: 'Units Enrolled',
      passed,
      applicantValue: `${studentProfile.unitsEnrolled} units`,
      requiredValue: `≥ ${criteria.minUnitsEnrolled} units`,
      weight: 1,
      notes: passed ? 'Meets minimum units enrolled requirement' : 'Below minimum units enrolled'
    });
  }

  // Units Passed Check
  if (criteria.minUnitsPassed) {
    const passed = studentProfile.unitsPassed >= criteria.minUnitsPassed;
    checks.push({
      criterion: 'Units Passed',
      passed,
      applicantValue: `${studentProfile.unitsPassed} units`,
      requiredValue: `≥ ${criteria.minUnitsPassed} units`,
      weight: 1,
      notes: passed ? 'Meets minimum units passed requirement' : 'Below minimum units passed'
    });
  }

  // Year Level / Classification Check
  if (criteria.eligibleClassifications && criteria.eligibleClassifications.length > 0) {
    const passed = criteria.eligibleClassifications.includes(studentProfile.classification);
    checks.push({
      criterion: 'Year Level',
      passed,
      applicantValue: studentProfile.classification,
      requiredValue: criteria.eligibleClassifications.join(', '),
      weight: 1,
      notes: passed ? 'Year level is eligible for this scholarship' : 'Year level is not eligible'
    });
  }

  // College Check
  if (criteria.eligibleColleges && criteria.eligibleColleges.length > 0) {
    const passed = criteria.eligibleColleges.includes(studentProfile.college);
    checks.push({
      criterion: 'College',
      passed,
      applicantValue: studentProfile.college,
      requiredValue: `${criteria.eligibleColleges.length} eligible college(s)`,
      weight: 1,
      notes: passed ? 'College is eligible for this scholarship' : 'College is not eligible'
    });
  }

  // Course Check
  if (criteria.eligibleCourses && criteria.eligibleCourses.length > 0) {
    const passed = criteria.eligibleCourses.includes(studentProfile.course);
    checks.push({
      criterion: 'Course/Program',
      passed,
      applicantValue: studentProfile.course,
      requiredValue: `${criteria.eligibleCourses.length} eligible course(s)`,
      weight: 1,
      notes: passed ? 'Course is eligible for this scholarship' : 'Course is not eligible'
    });
  }

  // Citizenship Check
  if (criteria.eligibleCitizenship && criteria.eligibleCitizenship.length > 0) {
    const citizenship = studentProfile.citizenship || 'Filipino';
    const passed = criteria.eligibleCitizenship.includes(citizenship);
    checks.push({
      criterion: 'Citizenship',
      passed,
      applicantValue: citizenship,
      requiredValue: criteria.eligibleCitizenship.join(', '),
      weight: 1,
      notes: passed ? 'Citizenship is eligible for this scholarship' : 'Citizenship is not eligible'
    });
  }

  // No Failing Grade Check
  if (criteria.mustNotHaveFailingGrade) {
    const hasFailingGrade = studentProfile.hasFailingGrade || false;
    const passed = !hasFailingGrade;
    checks.push({
      criterion: 'No Failing Grade',
      passed,
      applicantValue: passed ? 'No failing grades' : 'Has failing grades',
      requiredValue: 'Must not have any failing grades (5.0)',
      weight: 1,
      notes: passed ? 'Academic record shows no failing grades' : 'Has failing grade on record'
    });
  }

  // No Disciplinary Action Check
  if (criteria.mustNotHaveDisciplinaryAction) {
    const hasDisciplinaryAction = studentProfile.hasDisciplinaryAction || false;
    const passed = !hasDisciplinaryAction;
    checks.push({
      criterion: 'No Disciplinary Action',
      passed,
      applicantValue: passed ? 'Clean record' : 'Has disciplinary action',
      requiredValue: 'Must be in good standing (no disciplinary action)',
      weight: 1,
      notes: passed ? 'No disciplinary records on file' : 'Has disciplinary record'
    });
  }

  // No Other Scholarship Check
  if (criteria.mustNotHaveOtherScholarship) {
    const hasExistingScholarship = studentProfile.hasExistingScholarship || false;
    const passed = !hasExistingScholarship;
    checks.push({
      criterion: 'No Other Scholarship',
      passed,
      applicantValue: passed ? 'No other scholarship' : 'Has other scholarship',
      requiredValue: 'Must not be receiving another scholarship',
      weight: 1,
      notes: passed ? 'Not receiving other scholarship grants' : 'Currently has another scholarship'
    });
  }

  // Thesis Outline Check
  if (criteria.requiresApprovedThesisOutline) {
    const hasThesisOutline = studentProfile.hasApprovedThesisOutline || false;
    const passed = hasThesisOutline;
    checks.push({
      criterion: 'Approved Thesis Outline',
      passed,
      applicantValue: passed ? 'Has approved thesis outline' : 'No approved thesis outline',
      requiredValue: 'Must have approved thesis outline',
      weight: 1,
      notes: passed ? 'Thesis outline has been approved' : 'Thesis outline not yet approved'
    });
  }

  return checks;
};

// Generate prediction data
const generatePrediction = (eligibilityChecks, studentProfile, eligibilityPercentage) => {
  // Calculate base probability from eligibility
  let probability = eligibilityPercentage / 100;
  
  // Adjust based on GWA
  if (studentProfile.gwa <= 1.5) probability += 0.1;
  else if (studentProfile.gwa <= 2.0) probability += 0.05;
  else if (studentProfile.gwa > 2.5) probability -= 0.05;
  
  // Adjust based on financial need
  const income = studentProfile.annualFamilyIncome || studentProfile.familyAnnualIncome;
  if (income && income <= 150000) probability += 0.05;
  else if (income && income <= 250000) probability += 0.02;
  
  // Clamp probability
  probability = Math.max(0.1, Math.min(0.95, probability));
  probability = Math.round(probability * 100) / 100;
  
  return {
    probability,
    predictedOutcome: probability >= 0.5 ? 'approved' : 'rejected',
    confidence: probability >= 0.75 ? 'high' : probability >= 0.5 ? 'medium' : 'low',
    featureContributions: {
      gwa: studentProfile.gwa <= 2.0 ? 0.15 : -0.05,
      financialNeed: income && income <= 250000 ? 0.1 : 0,
      yearLevel: 0.05,
      collegeMatch: 0.1,
      courseMatch: 0.1,
      locationMatch: 0.02,
      completenessScore: 0.1
    },
    generatedAt: new Date(),
    modelVersion: '2.1.0'
  };
};

// Generate status history
const generateStatusHistory = (currentStatus, applicantId, appliedDate) => {
  const history = [];
  
  // Always start with draft
  history.push({
    status: 'draft',
    changedBy: applicantId,
    changedAt: new Date(appliedDate.getTime() - 1000), // 1 second before submission
    notes: 'Application created'
  });
  
  if (currentStatus === 'draft') return history;
  
  // Submitted
  history.push({
    status: 'submitted',
    changedBy: applicantId,
    changedAt: appliedDate,
    notes: 'Application submitted by student'
  });
  
  if (currentStatus === 'submitted') return history;
  
  // Under Review
  if (['under_review', 'shortlisted', 'approved', 'rejected', 'interview_scheduled'].includes(currentStatus)) {
    history.push({
      status: 'under_review',
      changedBy: applicantId, // Will be replaced with admin ID
      changedAt: new Date(appliedDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days later
      notes: 'Application is now under review by scholarship committee'
    });
  }
  
  if (currentStatus === 'under_review') return history;
  
  // Shortlisted
  if (['shortlisted', 'approved', 'interview_scheduled'].includes(currentStatus)) {
    history.push({
      status: 'shortlisted',
      changedBy: applicantId,
      changedAt: new Date(appliedDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days later
      notes: 'Application has been shortlisted for final evaluation'
    });
  }
  
  if (currentStatus === 'shortlisted') return history;
  
  // Interview Scheduled
  if (currentStatus === 'interview_scheduled') {
    history.push({
      status: 'interview_scheduled',
      changedBy: applicantId,
      changedAt: new Date(appliedDate.getTime() + 10 * 24 * 60 * 60 * 1000),
      notes: 'Interview scheduled with scholarship committee'
    });
    return history;
  }
  
  // Approved
  if (currentStatus === 'approved') {
    history.push({
      status: 'approved',
      changedBy: applicantId,
      changedAt: new Date(appliedDate.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days later
      notes: 'Application approved! Congratulations!'
    });
    return history;
  }
  
  // Rejected
  if (currentStatus === 'rejected') {
    history.push({
      status: 'rejected',
      changedBy: applicantId,
      changedAt: new Date(appliedDate.getTime() + 14 * 24 * 60 * 60 * 1000),
      notes: 'Application did not meet eligibility requirements'
    });
    return history;
  }
  
  return history;
};

// =============================================================================
// Generate Comprehensive Applications
// =============================================================================

const generateComprehensiveApplications = (students, scholarships, adminUsers = []) => {
  const applications = [];
  const usedCombinations = new Set();
  
  // Get admin user for status history
  const adminUser = adminUsers.length > 0 ? adminUsers[0] : null;
  
  // Filter students with valid profiles
  const validStudents = students.filter(s => s.studentProfile);
  
  // Status distribution for realistic data
  const statusDistribution = [
    { status: ApplicationStatus.SUBMITTED, weight: 30 },
    { status: ApplicationStatus.UNDER_REVIEW, weight: 25 },
    { status: ApplicationStatus.SHORTLISTED, weight: 10 },
    { status: ApplicationStatus.APPROVED, weight: 15 },
    { status: ApplicationStatus.REJECTED, weight: 15 },
    { status: ApplicationStatus.DRAFT, weight: 5 }
  ];
  
  // Calculate total weight
  const totalWeight = statusDistribution.reduce((sum, s) => sum + s.weight, 0);
  
  // For each scholarship, create applications from eligible students
  scholarships.forEach((scholarship, scholarshipIndex) => {
    const eligibilityCriteria = scholarship.eligibilityCriteria || {};
    
    // Find eligible students
    const eligibleStudents = validStudents.filter(student => {
      const profile = student.studentProfile;
      
      // Check college
      if (eligibilityCriteria.eligibleColleges && eligibilityCriteria.eligibleColleges.length > 0) {
        if (!eligibilityCriteria.eligibleColleges.includes(profile.college)) return false;
      }
      
      // Check classification
      if (eligibilityCriteria.eligibleClassifications && eligibilityCriteria.eligibleClassifications.length > 0) {
        if (!eligibilityCriteria.eligibleClassifications.includes(profile.classification)) return false;
      }
      
      // Check course (if specific courses required)
      if (eligibilityCriteria.eligibleCourses && eligibilityCriteria.eligibleCourses.length > 0) {
        if (!eligibilityCriteria.eligibleCourses.includes(profile.course)) return false;
      }
      
      return true;
    });
    
    // Create applications for some eligible students (not all)
    const numApplications = Math.min(
      Math.floor(Math.random() * 5) + 2, // 2-6 applications per scholarship
      eligibleStudents.length
    );
    
    // Shuffle and pick students
    const shuffledStudents = [...eligibleStudents].sort(() => Math.random() - 0.5);
    const selectedStudents = shuffledStudents.slice(0, numApplications);
    
    selectedStudents.forEach((student, studentIndex) => {
      const combinationKey = `${student._id.toString()}_${scholarship._id.toString()}`;
      
      // Skip if already applied
      if (usedCombinations.has(combinationKey)) return;
      usedCombinations.add(combinationKey);
      
      const profile = student.studentProfile;
      
      // Determine status based on weighted distribution
      let statusRandom = Math.random() * totalWeight;
      let status = ApplicationStatus.SUBMITTED;
      for (const s of statusDistribution) {
        statusRandom -= s.weight;
        if (statusRandom <= 0) {
          status = s.status;
          break;
        }
      }
      
      // Generate application dates
      const appliedDate = daysAgo(Math.floor(Math.random() * 30) + 1); // 1-30 days ago
      const createdAt = new Date(appliedDate.getTime() - 1000);
      
      // Generate eligibility checks
      const eligibilityChecks = generateEligibilityChecks(scholarship, profile);
      const passedChecks = eligibilityChecks.filter(c => c.passed).length;
      const eligibilityPercentage = eligibilityChecks.length > 0 
        ? Math.round((passedChecks / eligibilityChecks.length) * 100)
        : 75;
      
      // Generate documents
      const documents = generateDocuments(
        scholarship.requiredDocuments || [],
        createdAt
      );
      
      // Generate status history
      const statusHistory = generateStatusHistory(status, student._id, appliedDate);
      
      // Generate prediction
      const prediction = generatePrediction(eligibilityChecks, profile, eligibilityPercentage);
      
      // Applicant snapshot
      const applicantSnapshot = {
        studentNumber: profile.studentNumber,
        firstName: profile.firstName,
        lastName: profile.lastName,
        gwa: profile.gwa,
        classification: profile.classification,
        college: profile.college,
        course: profile.course,
        major: profile.major || null,
        annualFamilyIncome: profile.annualFamilyIncome || profile.familyAnnualIncome,
        unitsEnrolled: profile.unitsEnrolled,
        unitsPassed: profile.unitsPassed,
        provinceOfOrigin: profile.provinceOfOrigin,
        citizenship: profile.citizenship || 'Filipino',
        stBracket: profile.stBracket,
        hasExistingScholarship: profile.hasExistingScholarship || false,
        hasThesisGrant: profile.hasThesisGrant || false,
        hasDisciplinaryAction: profile.hasDisciplinaryAction || false
      };
      
      // Personal statement (realistic)
      const personalStatements = [
        'I am deeply committed to academic excellence and believe this scholarship will help me achieve my educational goals while contributing to my community.',
        'Growing up in a financially challenged family, I have learned the value of hard work and perseverance. This scholarship would be instrumental in pursuing my dream career.',
        'My passion for my field of study drives me to excel academically. With this scholarship support, I can focus fully on my studies without financial burden.',
        'As a student dedicated to making a positive impact in my community, I believe education is the key to creating meaningful change.',
        'I am honored to apply for this scholarship as it aligns perfectly with my academic and career aspirations in service to the Filipino people.'
      ];
      
      const application = {
        applicant: student._id,
        scholarship: scholarship._id,
        status,
        statusHistory,
        documents,
        hasTranscript: documents.some(d => d.documentType === 'transcript'),
        hasIncomeCertificate: documents.some(d => d.documentType === 'income_certificate'),
        hasCertificateOfRegistration: documents.some(d => d.documentType === 'certificate_of_registration'),
        hasGradeReport: false,
        eligibilityChecks,
        passedAllEligibilityCriteria: passedChecks === eligibilityChecks.length,
        eligibilityPercentage,
        criteriaPassed: passedChecks,
        criteriaTotal: eligibilityChecks.length,
        applicantSnapshot,
        personalStatement: personalStatements[Math.floor(Math.random() * personalStatements.length)],
        additionalInfo: '',
        academicYear: scholarship.academicYear || '2026-2027',
        semester: scholarship.semester || 'First',
        isComplete: documents.length >= (scholarship.requiredDocuments?.filter(d => d.isRequired).length || 0),
        hasAllRequiredDocuments: true,
        flaggedForReview: false,
        priorityScore: 0,
        lastUpdatedAt: appliedDate,
        prediction,
        createdAt,
        updatedAt: appliedDate,
        appliedDate: status !== 'draft' ? appliedDate : null,
        submittedAt: status !== 'draft' ? appliedDate : null,
        reviewNotes: status === 'approved' 
          ? 'Meets all eligibility criteria. Recommended for scholarship award.'
          : status === 'rejected'
            ? 'Unfortunately, the application did not meet the minimum requirements.'
            : ''
      };
      
      applications.push(application);
    });
  });
  
  return { applications, usedCombinations };
};

// =============================================================================
// Generate Historical Applications (for ML Training)
// =============================================================================

const generateHistoricalApplications = (students, scholarships, count = 150) => {
  const applications = [];
  const usedCombinations = new Set();
  
  const validStudents = students.filter(s => s.studentProfile);
  
  for (let i = 0; i < count && validStudents.length > 0 && scholarships.length > 0; i++) {
    // Select random student and scholarship
    const student = validStudents[Math.floor(Math.random() * validStudents.length)];
    const scholarship = scholarships[Math.floor(Math.random() * scholarships.length)];
    
    const combinationKey = `${student._id.toString()}_${scholarship._id.toString()}`;
    if (usedCombinations.has(combinationKey)) continue;
    usedCombinations.add(combinationKey);
    
    const profile = student.studentProfile;
    
    // Historical applications are either approved or rejected
    const eligibilityChecks = generateEligibilityChecks(scholarship, profile);
    const passedChecks = eligibilityChecks.filter(c => c.passed).length;
    const eligibilityPercentage = eligibilityChecks.length > 0 
      ? Math.round((passedChecks / eligibilityChecks.length) * 100)
      : 50;
    
    // Determine status based on eligibility
    let status;
    if (eligibilityPercentage >= 80) {
      status = Math.random() < 0.8 ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
    } else if (eligibilityPercentage >= 60) {
      status = Math.random() < 0.5 ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
    } else {
      status = Math.random() < 0.2 ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
    }
    
    // Historical date (3-12 months ago)
    const appliedDate = daysAgo(Math.floor(Math.random() * 270) + 90);
    
    const prediction = generatePrediction(eligibilityChecks, profile, eligibilityPercentage);
    
    applications.push({
      applicant: student._id,
      scholarship: scholarship._id,
      status,
      statusHistory: generateStatusHistory(status, student._id, appliedDate),
      documents: generateDocuments(scholarship.requiredDocuments || [], appliedDate),
      hasTranscript: true,
      hasIncomeCertificate: true,
      hasCertificateOfRegistration: true,
      hasGradeReport: Math.random() < 0.7,
      eligibilityChecks,
      passedAllEligibilityCriteria: passedChecks === eligibilityChecks.length,
      eligibilityPercentage,
      criteriaPassed: passedChecks,
      criteriaTotal: eligibilityChecks.length,
      applicantSnapshot: {
        studentNumber: profile.studentNumber,
        firstName: profile.firstName,
        lastName: profile.lastName,
        gwa: profile.gwa,
        classification: profile.classification,
        college: profile.college,
        course: profile.course,
        major: profile.major || null,
        annualFamilyIncome: profile.annualFamilyIncome || profile.familyAnnualIncome,
        unitsEnrolled: profile.unitsEnrolled,
        unitsPassed: profile.unitsPassed,
        provinceOfOrigin: profile.provinceOfOrigin,
        citizenship: profile.citizenship || 'Filipino',
        stBracket: profile.stBracket,
        hasExistingScholarship: profile.hasExistingScholarship || false,
        hasThesisGrant: profile.hasThesisGrant || false,
        hasDisciplinaryAction: profile.hasDisciplinaryAction || false
      },
      personalStatement: 'Historical application - personal statement not available.',
      academicYear: '2025-2026',
      semester: 'Second',
      isComplete: true,
      hasAllRequiredDocuments: true,
      flaggedForReview: false,
      priorityScore: 0,
      lastUpdatedAt: appliedDate,
      prediction,
      createdAt: appliedDate,
      updatedAt: appliedDate,
      appliedDate,
      submittedAt: appliedDate,
      reviewNotes: status === ApplicationStatus.APPROVED 
        ? 'Historical: Meets all eligibility criteria. Approved.'
        : 'Historical: Did not meet minimum requirements.'
    });
  }
  
  return { applications, usedCombinations };
};

// =============================================================================
// Seed Function
// =============================================================================

const seedComprehensiveApplications = async (Application, students, scholarships, adminUsers = []) => {
  try {
    // Clear existing applications
    await Application.deleteMany({});
    console.log('   Cleared existing applications');
    
    // Generate historical applications first (for ML training)
    const { applications: historicalApps, usedCombinations: historicalCombinations } = 
      generateHistoricalApplications(students, scholarships, 150);
    console.log(`   Generated ${historicalApps.length} historical applications`);
    
    // Generate current comprehensive applications
    const { applications: currentApps } = 
      generateComprehensiveApplications(students, scholarships, adminUsers);
    
    // Filter out duplicates
    const filteredCurrentApps = currentApps.filter(app => {
      const key = `${app.applicant.toString()}_${app.scholarship.toString()}`;
      if (historicalCombinations.has(key)) return false;
      return true;
    });
    console.log(`   Generated ${filteredCurrentApps.length} current applications`);
    
    // Combine and insert
    const allApplications = [...historicalApps, ...filteredCurrentApps];
    const insertedApplications = await Application.insertMany(allApplications);
    
    // Calculate statistics
    const stats = {
      total: insertedApplications.length,
      draft: insertedApplications.filter(a => a.status === 'draft').length,
      submitted: insertedApplications.filter(a => a.status === 'submitted').length,
      underReview: insertedApplications.filter(a => a.status === 'under_review').length,
      shortlisted: insertedApplications.filter(a => a.status === 'shortlisted').length,
      approved: insertedApplications.filter(a => a.status === 'approved').length,
      rejected: insertedApplications.filter(a => a.status === 'rejected').length
    };
    
    console.log('   Application Statistics:');
    console.log(`      - Total: ${stats.total}`);
    console.log(`      - Draft: ${stats.draft}`);
    console.log(`      - Submitted: ${stats.submitted}`);
    console.log(`      - Under Review: ${stats.underReview}`);
    console.log(`      - Shortlisted: ${stats.shortlisted}`);
    console.log(`      - Approved: ${stats.approved}`);
    console.log(`      - Rejected: ${stats.rejected}`);
    
    return insertedApplications;
  } catch (error) {
    console.error('Error seeding comprehensive applications:', error);
    throw error;
  }
};

// =============================================================================
// Generate Training Data for ML
// =============================================================================

const generateTrainingData = (applications) => {
  return applications
    .filter(app => app.status === ApplicationStatus.APPROVED || app.status === ApplicationStatus.REJECTED)
    .map(app => ({
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
      label: app.status === ApplicationStatus.APPROVED ? 1 : 0
    }));
};

module.exports = {
  generateComprehensiveApplications,
  generateHistoricalApplications,
  generateEligibilityChecks,
  generatePrediction,
  generateStatusHistory,
  generateDocuments,
  generateTrainingData,
  seedComprehensiveApplications
};
