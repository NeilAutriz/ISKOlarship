// =============================================================================
// ISKOlarship - Extended Historical Data Seed
// Creates additional historical application data for better analytics
// =============================================================================

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Application, ApplicationStatus } = require('../models/Application.model');
const { User } = require('../models/User.model');
const { Scholarship } = require('../models/Scholarship.model');

// =============================================================================
// Generate More Historical Data
// =============================================================================

const generateExtendedHistoricalData = async (adminId) => {
  const applications = [];
  const scholarships = await Scholarship.find();
  const students = await User.find({ role: 'student' });
  
  // Generate data for past 3 academic years
  const academicYears = ['2022-2023', '2023-2024', '2024-2025'];
  const semesters = ['First', 'Second'];
  
  for (const academicYear of academicYears) {
    for (const semester of semesters) {
      // Generate 15-25 applications per semester
      const numApplications = Math.floor(Math.random() * 11) + 15;
      
      for (let i = 0; i < numApplications; i++) {
        const student = students[Math.floor(Math.random() * students.length)];
        const scholarship = scholarships[Math.floor(Math.random() * scholarships.length)];
        const profile = student.studentProfile;
        
        if (!profile) continue;
        
        // Calculate application date based on academic year
        const yearStart = parseInt(academicYear.split('-')[0]);
        const monthOffset = semester === 'First' ? 8 : 1; // Aug for 1st sem, Jan for 2nd sem
        const dayOffset = Math.floor(Math.random() * 60);
        const applicationDate = new Date(yearStart + (semester === 'Second' ? 1 : 0), monthOffset - 1, 1 + dayOffset);
        
        // Determine approval based on profile quality
        const gwaScore = (2.0 - Math.min(profile.gwa || 2.0, 2.0)) / 2.0;
        const incomeScore = 1 - Math.min((profile.annualFamilyIncome || 300000), 500000) / 500000;
        const baseApprovalChance = (gwaScore * 0.5 + incomeScore * 0.3 + Math.random() * 0.2);
        const isApproved = baseApprovalChance > 0.45;
        
        const status = isApproved ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
        const predictionScore = baseApprovalChance;
        const confidenceLevel = predictionScore >= 0.7 ? 'high' : predictionScore >= 0.4 ? 'medium' : 'low';
        
        const decisionDate = new Date(applicationDate);
        decisionDate.setDate(decisionDate.getDate() + Math.floor(Math.random() * 30) + 7);
        
        applications.push({
          applicant: student._id,
          scholarship: scholarship._id,
          academicYear,
          semester,
          status,
          applicantSnapshot: {
            studentNumber: profile.studentNumber,
            course: profile.course,
            college: profile.college,
            yearLevel: profile.yearLevel,
            gwa: profile.gwa,
            totalUnitsEarned: profile.totalUnitsEarned,
            currentUnitsEnrolled: profile.currentUnitsEnrolled,
            stBracket: profile.stBracket,
            annualFamilyIncome: profile.annualFamilyIncome
          },
          eligibilityResults: {
            isEligible: true,
            stage1Passed: true,
            stage2Passed: true,
            stage3Passed: true,
            checks: [
              { criterion: 'GWA Requirement', passed: true, applicantValue: profile.gwa },
              { criterion: 'Year Level', passed: true, applicantValue: profile.yearLevel },
              { criterion: 'Income Requirement', passed: true, applicantValue: profile.annualFamilyIncome }
            ],
            checkedAt: applicationDate
          },
          prediction: {
            probability: Math.round(predictionScore * 100) / 100,
            predictedOutcome: predictionScore >= 0.5 ? 'approved' : 'rejected',
            confidence: confidenceLevel,
            featureContributions: {
              gwa: gwaScore,
              financialNeed: incomeScore,
              yearLevel: 0.7,
              collegeMatch: 0.9,
              completenessScore: 0.95
            },
            predictedAt: applicationDate
          },
          statusHistory: [
            {
              status: ApplicationStatus.SUBMITTED,
              changedBy: student._id,
              changedAt: applicationDate,
              notes: 'Application submitted'
            },
            {
              status: ApplicationStatus.UNDER_REVIEW,
              changedBy: adminId,
              changedAt: new Date(applicationDate.getTime() + 86400000 * 5),
              notes: 'Under committee review'
            },
            {
              status,
              changedBy: adminId,
              changedAt: decisionDate,
              notes: isApproved ? 'Application approved' : 'Did not meet requirements'
            }
          ],
          documents: [
            {
              name: 'Certified True Copy of Grades',
              type: 'grades',
              url: `/uploads/${student._id}/ctcg.pdf`,
              uploadedAt: applicationDate,
              verified: true,
              verifiedBy: adminId,
              verifiedAt: new Date(applicationDate.getTime() + 86400000 * 3)
            }
          ],
          createdAt: applicationDate,
          updatedAt: decisionDate
        });
      }
    }
  }
  
  return applications;
};

// =============================================================================
// Seed Function
// =============================================================================

const seedExtendedHistory = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ No admin found. Please seed users first.');
      return;
    }

    console.log('📝 Generating extended historical data...');
    const applications = await generateExtendedHistoricalData(admin._id);
    console.log(`   Generated ${applications.length} additional applications`);

    // Filter out duplicates by checking existing applicant-scholarship combinations
    console.log('🔍 Checking for existing applications...');
    const existingApps = await Application.find({}, { applicant: 1, scholarship: 1 });
    const existingKeys = new Set(existingApps.map(a => `${a.applicant}-${a.scholarship}`));
    
    const newApplications = applications.filter(app => {
      const key = `${app.applicant}-${app.scholarship}`;
      if (existingKeys.has(key)) {
        return false;
      }
      existingKeys.add(key); // Also prevent duplicates within the new batch
      return true;
    });
    
    console.log(`   ${applications.length - newApplications.length} duplicates filtered out`);
    console.log(`   ${newApplications.length} new applications to insert`);

    if (newApplications.length > 0) {
      console.log('💾 Inserting applications...');
      const result = await Application.insertMany(newApplications, { ordered: false });
      console.log(`✅ Successfully inserted ${result.length} applications`);
    } else {
      console.log('⚠️  No new applications to insert');
    }

    // Updated summary
    console.log('\n📊 Updated Application Statistics:');
    const stats = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    stats.forEach(s => console.log(`   ${s._id}: ${s.count}`));

    const yearlyStats = await Application.aggregate([
      { $group: { _id: '$academicYear', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('\n📅 Applications by Academic Year:');
    yearlyStats.forEach(y => console.log(`   ${y._id}: ${y.count}`));

    const total = await Application.countDocuments();
    const approved = await Application.countDocuments({ status: 'approved' });
    console.log(`\n📈 Overall: ${total} applications, ${((approved/total)*100).toFixed(1)}% approval rate`);

    console.log('\n🎉 Extended history seeding completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the seed
seedExtendedHistory();
