// =============================================================================
// Refresh expired scholarship deadlines
// -----------------------------------------------------------------------------
// The seed data generates application deadlines relative to when the seed was
// run (see seeds/scholarships-realistic.seed.js -> createDeadline). Once those
// dates pass, the public GET /api/scholarships route (which filters
// `applicationDeadline: { $gte: now }`) returns zero results and the app shows
// "no scholarships".
//
// This script shifts every ACTIVE scholarship whose deadline is in the past
// forward by a single, uniform delta so that the earliest deadline lands a
// short buffer from today. The start-date -> deadline spacing (and the relative
// ordering between scholarships) is preserved because the same delta is applied
// to both applicationStartDate and applicationDeadline.
//
// It is safe to re-run: if no active scholarship has an expired deadline, it
// makes no changes.
//
// Run with: node scripts/refresh-scholarship-deadlines.js
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

// Buffer applied to the EARLIEST expired deadline (in days). After the shift,
// the soonest scholarship deadline will be roughly this many days in the future.
const BUFFER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolaship';
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('scholarships');

  const now = new Date();
  const activeFilter = { status: 'active' };

  const [stats] = await col
    .aggregate([
      { $match: activeFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          expired: {
            $sum: { $cond: [{ $lt: ['$applicationDeadline', now] }, 1, 0] },
          },
          minDeadline: { $min: '$applicationDeadline' },
          maxDeadline: { $max: '$applicationDeadline' },
        },
      },
    ])
    .toArray();

  if (!stats || stats.total === 0) {
    console.log('ℹ️  No active scholarships found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`📊 Active scholarships: ${stats.total}`);
  console.log(`   Expired deadlines : ${stats.expired}`);
  console.log(`   Deadline range    : ${stats.minDeadline.toISOString()} -> ${stats.maxDeadline.toISOString()}`);

  if (stats.expired === 0) {
    console.log('✅ No expired active scholarships. No changes needed.');
    await mongoose.disconnect();
    return;
  }

  // Shift so the earliest deadline lands BUFFER_DAYS from now. The same delta is
  // applied to every active scholarship to preserve relative spacing.
  const target = now.getTime() + BUFFER_DAYS * DAY_MS;
  const deltaMs = Math.round(target - stats.minDeadline.getTime());

  console.log(`🕒 Shifting active scholarship dates forward by ${Math.round(deltaMs / DAY_MS)} days`);

  const result = await col.updateMany(activeFilter, [
    {
      $set: {
        applicationDeadline: { $add: ['$applicationDeadline', deltaMs] },
        applicationStartDate: {
          $cond: [
            { $ifNull: ['$applicationStartDate', false] },
            { $add: ['$applicationStartDate', deltaMs] },
            '$applicationStartDate',
          ],
        },
        updatedAt: '$$NOW',
      },
    },
  ]);

  const [after] = await col
    .aggregate([
      { $match: activeFilter },
      {
        $group: {
          _id: null,
          future: { $sum: { $cond: [{ $gte: ['$applicationDeadline', now] }, 1, 0] } },
          minDeadline: { $min: '$applicationDeadline' },
          maxDeadline: { $max: '$applicationDeadline' },
        },
      },
    ])
    .toArray();

  console.log(`✅ Updated ${result.modifiedCount} scholarships`);
  console.log(`   Active with future deadline: ${after.future}`);
  console.log(`   New deadline range         : ${after.minDeadline.toISOString()} -> ${after.maxDeadline.toISOString()}`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error('❌ Failed to refresh scholarship deadlines:', err.message);
  process.exit(1);
});
