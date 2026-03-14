const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Scholarship } = require('../src/models/Scholarship.model');

async function update() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const result = await Scholarship.findOneAndUpdate(
    { name: /Foundation For Philippine Progress/i },
    {
      $set: {
        description: 'The Foundation For Philippine Progress Undergraduate Fellowship Grant provides financial support to deserving UPLB students with Sophomore, Junior, or Senior classification. It is open to any student from the College of Agriculture and Food Sciences (CAFS), OR BS Industrial Engineering students, OR BS Computer Science students. Applicants must have a minimum GWA of 2.50 and belong to a family whose gross income does not exceed \u20B1300,000.00 per annum.',
        'eligibilityCriteria.eligibleColleges': ['College of Agriculture and Food Science'],
        'eligibilityCriteria.eligibleCourses': ['BS Industrial Engineering', 'BS Computer Science', 'BS Agriculture'],
        'eligibilityCriteria.additionalRequirements': [
          { description: 'Must be any CAFS student, OR a BS Industrial Engineering student, OR a BS Computer Science student', isRequired: true },
          { description: 'Must have a minimum GWA of 2.50', isRequired: true },
          { description: 'Family gross income must not exceed \u20B1300,000.00 per annum', isRequired: true }
        ]
      }
    },
    { new: true }
  );

  console.log('Updated:', result.name);
  console.log('Description:', result.description.substring(0, 120) + '...');
  console.log('Additional Reqs:', result.eligibilityCriteria.additionalRequirements.map(r => r.description));
  console.log('Eligible Colleges:', result.eligibilityCriteria.eligibleColleges);
  console.log('Eligible Courses:', result.eligibilityCriteria.eligibleCourses);
  
  await mongoose.disconnect();
  console.log('\nDone!');
}

update().catch(err => { console.error(err); process.exit(1); });
