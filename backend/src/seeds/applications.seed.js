// =============================================================================
// ISKOlarship - Historical Applications Seed Data
// Creates sample application data for logistic regression training
// Based on research paper methodology
// =============================================================================

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Application, ApplicationStatus } = require('../models/Application.model');
const { User } = require('../models/User.model');
const { Scholarship } = require('../models/Scholarship.model');

// =============================================================================
// Helper function to generate random applications
// =============================================================================

const generateHistoricalApplications = async (users, scholarships, adminId) => {
  const applications = [];

  // For each student, create 1-3 historical applications
  for (const user of users) {
    if (user.role !== 'student') continue;
    
    const numApplications = Math.floor(Math.random() * 3) + 1;
    const usedScholarships = new Set();

    for (let i = 0; i < numApplications; i++) {
      // Pick a random scholarship (avoid duplicates for same user)
      let scholarship;
      let attempts = 0;
      do {
        scholarship = scholarships[Math.floor(Math.random() * scholarships.length)];
        attempts++;
      } while (usedScholarships.has(scholarship._id.toString()) && attempts < 10);
      
      if (usedScholarships.has(scholarship._id.toString())) continue;
      usedScholarships.add(scholarship._id.toString());

      // Check eligibility based on student profile
      const student = user.studentProfile;
      const criteria = scholarship.eligibilityCriteria || {};
      
      // Calculate eligibility
      const meetsGWA = !criteria.minGWA || student.gwa <= criteria.minGWA;
      const meetsIncome = !criteria.maxAnnualFamilyIncome || 
                          student.annualFamilyIncome <= criteria.maxAnnualFamilyIncome;
      const meetsYearLevel = !criteria.requiredYearLevels?.length || 
                             criteria.requiredYearLevels.includes(student.yearLevel);
      const meetsCollege = !criteria.eligibleColleges?.length || 
                           criteria.eligibleColleges.includes(student.college);
      const noFailingGrade = !criteria.mustNotHaveFailingGrade || !student.hasFailingGrade;
      const noDisciplinary = !criteria.mustNotHaveDisciplinaryAction || !student.hasDisciplinaryAction;
      const noOtherScholarship = !criteria.mustNotHaveOtherScholarship || !student.hasExistingScholarship;

      // Determine outcome based on eligibility
      const isEligible = meetsGWA && meetsIncome && meetsYearLevel && 
                         meetsCollege && noFailingGrade && noDisciplinary && noOtherScholarship;

      // Add some randomness for rejected applications
      let status;
      if (!isEligible) {
        status = ApplicationStatus.REJECTED;
      } else {
        // High GWA students have higher approval rate
        const approvalChance = student.gwa <= 1.5 ? 0.9 : 
                               student.gwa <= 2.0 ? 0.75 : 
                               student.gwa <= 2.5 ? 0.6 : 0.4;
        status = Math.random() < approvalChance ? 
                 ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
      }

      // Calculate prediction score (simulated)
      const predictionScore = isEligible ? 
        0.5 + (Math.random() * 0.45) + ((2.0 - Math.min(student.gwa, 2.0)) * 0.1) :
        0.1 + (Math.random() * 0.3);
      
      // Determine confidence level based on score
      const confidenceLevel = predictionScore >= 0.7 ? 'high' : 
                              predictionScore >= 0.4 ? 'medium' : 'low';

      // Generate application date (last 2 academic years)
      const daysAgo = Math.floor(Math.random() * 730) + 30; // 30-760 days ago
      const applicationDate = new Date();
      applicationDate.setDate(applicationDate.getDate() - daysAgo);

      // Generate decision date (7-30 days after application)
      const processingDays = Math.floor(Math.random() * 23) + 7;
      const decisionDate = new Date(applicationDate);
      decisionDate.setDate(decisionDate.getDate() + processingDays);

      const application = {
        applicant: user._id,
        scholarship: scholarship._id,
        academicYear: daysAgo > 365 ? '2023-2024' : '2024-2025',
        semester: Math.random() > 0.5 ? 'First' : 'Second',
        status: status,
        
        // Snapshot of student profile at time of application
        applicantSnapshot: {
          studentNumber: student.studentNumber,
          course: student.course,
          college: student.college,
          yearLevel: student.yearLevel,
          gwa: student.gwa,
          totalUnitsEarned: student.totalUnitsEarned,
          currentUnitsEnrolled: student.currentUnitsEnrolled,
          stBracket: student.stBracket,
          annualFamilyIncome: student.annualFamilyIncome
        },

        // Eligibility results
        eligibilityResults: {
          isEligible: isEligible,
          stage1Passed: meetsGWA && meetsYearLevel && meetsCollege,
          stage2Passed: meetsIncome,
          stage3Passed: noFailingGrade && noDisciplinary && noOtherScholarship,
          checks: [
            { criterion: 'Minimum GWA', passed: meetsGWA, applicantValue: student.gwa, requiredValue: criteria.minGWA },
            { criterion: 'Year Level', passed: meetsYearLevel, applicantValue: student.yearLevel, requiredValue: criteria.requiredYearLevels },
            { criterion: 'College Eligibility', passed: meetsCollege, applicantValue: student.college, requiredValue: criteria.eligibleColleges },
            { criterion: 'Income Requirement', passed: meetsIncome, applicantValue: student.annualFamilyIncome, requiredValue: criteria.maxAnnualFamilyIncome },
            { criterion: 'No Failing Grade', passed: noFailingGrade, applicantValue: student.hasFailingGrade, requiredValue: false },
            { criterion: 'No Disciplinary Action', passed: noDisciplinary, applicantValue: student.hasDisciplinaryAction, requiredValue: false }
          ],
          checkedAt: applicationDate
        },

        // Prediction results
        prediction: {
          probability: Math.round(predictionScore * 100) / 100,
          predictedOutcome: predictionScore >= 0.5 ? 'approved' : 'rejected',
          confidence: confidenceLevel,
          featureContributions: {
            gwa: (2.0 - Math.min(student.gwa, 2.0)) / 2.0,
            financialNeed: 1 - Math.min(student.annualFamilyIncome, 500000) / 500000,
            yearLevel: ['Senior', 'Junior'].includes(student.yearLevel) ? 0.8 : 0.6,
            collegeMatch: meetsCollege ? 1.0 : 0.0,
            completenessScore: 0.9
          },
          predictedAt: applicationDate
        },

        // Status history
        statusHistory: [
          {
            status: ApplicationStatus.SUBMITTED,
            changedBy: user._id,
            changedAt: applicationDate,
            notes: 'Application submitted online'
          },
          {
            status: ApplicationStatus.UNDER_REVIEW,
            changedBy: adminId,
            changedAt: new Date(applicationDate.getTime() + 86400000 * 3),
            notes: 'Application under review by committee'
          },
          {
            status: status,
            changedBy: adminId,
            changedAt: decisionDate,
            notes: status === ApplicationStatus.APPROVED ? 
                  'Application approved by scholarship committee' :
                  'Application did not meet all requirements'
          }
        ],

        // Simulated documents
        documents: [
          {
            name: 'Certified True Copy of Grades',
            type: 'grades',
            url: `/uploads/${user._id}/ctcg.pdf`,
            uploadedAt: new Date(applicationDate.getTime() - 86400000),
            verified: true,
            verifiedBy: adminId,
            verifiedAt: new Date(applicationDate.getTime() + 86400000 * 2)
          },
          {
            name: 'Certificate of Registration',
            type: 'registration',
            url: `/uploads/${user._id}/cor.pdf`,
            uploadedAt: new Date(applicationDate.getTime() - 86400000),
            verified: true,
            verifiedBy: adminId,
            verifiedAt: new Date(applicationDate.getTime() + 86400000 * 2)
          }
        ],

        createdAt: applicationDate,
        updatedAt: decisionDate
      };

      // Add remarks for rejected applications
      if (status === ApplicationStatus.REJECTED && !isEligible) {
        application.adminRemarks = 'Application did not meet eligibility requirements.';
      }

      applications.push(application);
    }
  }

  return applications;
};

// =============================================================================
// Seed Function
// =============================================================================

const seedApplications = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users and scholarships
    console.log('📥 Fetching users and scholarships...');
    const students = await User.find({ role: 'student' });
    const admin = await User.findOne({ role: 'admin' });
    const scholarships = await Scholarship.find();

    console.log(`   Found ${students.length} students`);
    console.log(`   Found ${scholarships.length} scholarships`);
    console.log(`   Admin ID: ${admin?._id}`);

    if (students.length === 0 || scholarships.length === 0 || !admin) {
      console.log('❌ Please seed users and scholarships first!');
      return;
    }

    // Clear existing applications
    console.log('🗑️  Clearing existing applications...');
    await Application.deleteMany({});
    console.log('✅ Cleared existing applications');

    // Generate applications
    console.log('📝 Generating historical applications...');
    const applicationsData = await generateHistoricalApplications(students, scholarships, admin._id);
    console.log(`   Generated ${applicationsData.length} applications`);

    // Insert applications
    console.log('💾 Inserting applications...');
    const result = await Application.insertMany(applicationsData);
    console.log(`✅ Successfully inserted ${result.length} applications`);

    // Summary
    console.log('\n📊 Application Summary:');
    const statusStats = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    statusStats.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    // Calculate approval rate
    const approved = statusStats.find(s => s._id === 'approved')?.count || 0;
    const total = result.length;
    console.log(`\n📈 Approval Rate: ${((approved / total) * 100).toFixed(1)}%`);

    // Applications by scholarship type
    console.log('\n🎓 Applications by Scholarship Type:');
    const typeStats = await Application.aggregate([
      {
        $lookup: {
          from: 'scholarships',
          localField: 'scholarship',
          foreignField: '_id',
          as: 'scholarshipInfo'
        }
      },
      { $unwind: '$scholarshipInfo' },
      { $group: { _id: '$scholarshipInfo.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    typeStats.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    console.log('\n🎉 Application seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding applications:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the seed
seedApplications();
