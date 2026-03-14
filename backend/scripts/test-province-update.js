/**
 * Check ALL students: can each one be saved with a province change?
 * Also checks if any have existing validation issues.
 */
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function checkAllStudents() {
  await mongoose.connect(MONGO_URI);
  const { User } = require('../src/models');

  const students = await User.find({ role: 'student' });
  console.log(`Found ${students.length} students\n`);

  for (const s of students) {
    const sp = s.studentProfile || {};
    const origProvince = sp.provinceOfOrigin;
    const testProvince = origProvince === 'Quezon' ? 'Laguna' : 'Quezon';

    s.studentProfile.provinceOfOrigin = testProvince;
    s.markModified('studentProfile');

    try {
      await s.save();
      // Restore
      s.studentProfile.provinceOfOrigin = origProvince;
      s.markModified('studentProfile');
      await s.save();
      console.log(`✅ ${s.email} — save OK (${origProvince} → ${testProvince} → restored)`);
    } catch (err) {
      console.log(`❌ ${s.email} — SAVE FAILED: ${err.message}`);
      if (err.errors) {
        for (const [field, e] of Object.entries(err.errors)) {
          console.log(`   ${field}: ${e.message}`);
        }
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

checkAllStudents();
