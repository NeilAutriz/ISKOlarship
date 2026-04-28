// =============================================================================
// Backfill scholarshipSnapshot for existing applications
// Run with: node scripts/backfill-scholarship-snapshot.js
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const { Application, Scholarship } = require('../src/models');

  // Build a map of all scholarships in one query (avoids N+1)
  const scholarships = await Scholarship.find({})
    .select('name sponsor type academicYear semester')
    .lean();
  const scholarshipMap = new Map(scholarships.map((s) => [s._id.toString(), s]));
  console.log(`📚 Loaded ${scholarships.length} scholarships`);

  const apps = await Application.find({
    $or: [
      { scholarshipSnapshot: { $exists: false } },
      { 'scholarshipSnapshot.name': { $in: [null, ''] } },
    ],
  })
    .select('_id scholarship')
    .lean();

  console.log(`🔎 Found ${apps.length} applications needing backfill`);

  let backfilled = 0;
  let orphan = 0;
  const ops = [];

  for (const a of apps) {
    if (!a.scholarship) {
      orphan++;
      continue;
    }
    const s = scholarshipMap.get(a.scholarship.toString());
    if (s) {
      ops.push({
        updateOne: {
          filter: { _id: a._id },
          update: {
            $set: {
              scholarshipSnapshot: {
                name: s.name,
                sponsor: s.sponsor,
                type: s.type,
                academicYear: s.academicYear,
                semester: s.semester,
              },
            },
          },
        },
      });
      backfilled++;
    } else {
      orphan++;
    }
    if (ops.length >= 500) {
      await Application.bulkWrite(ops, { ordered: false });
      ops.length = 0;
      console.log(`  …${backfilled} backfilled so far`);
    }
  }
  if (ops.length) await Application.bulkWrite(ops, { ordered: false });

  console.log(`✅ Backfilled: ${backfilled}`);
  console.log(`⚠️  Orphan apps (referenced scholarship missing, snapshot unavailable): ${orphan}`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
