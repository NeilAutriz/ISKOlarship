// =============================================================================
// Activate scholarships with far-future deadlines (through 2030)
// -----------------------------------------------------------------------------
// The public GET /api/scholarships route only returns scholarships that are
// `isActive: true`, `status: 'active'`, and have `applicationDeadline >= now`.
// Seed data uses dates relative to seed time, so deadlines expire and the list
// eventually shows nothing.
//
// This script makes the catalog "active until 2030" and realistic:
//   * ALL scholarships become active EXCEPT a small number left inactive
//     (INACTIVE_KEEP) so the data still looks real (some closed/archived).
//   * Active scholarships get future deadlines staggered between a short buffer
//     from today and END_YEAR-12-31, preserving their existing relative order.
//   * applicationStartDate is kept before the deadline (existing gap preserved,
//     or defaulted to ~90 days before).
//
// It is safe to re-run. It does NOT touch users, applications, or other data.
//
// Run with: node scripts/activate-scholarships-through-2030.js
// =============================================================================

require('dotenv').config();
const mongoose = require('mongoose');

// ---- Configuration ----------------------------------------------------------
const END_YEAR = 2030;            // latest deadlines land at END_YEAR-12-31
const BUFFER_DAYS = 14;           // soonest active deadline = today + this
const INACTIVE_KEEP = 6;          // how many scholarships stay inactive
const DEFAULT_START_GAP_DAYS = 90; // fallback start-date gap if none exists
const DAY_MS = 24 * 60 * 60 * 1000;

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iskolaship';
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('scholarships');

  const now = new Date();
  const windowStart = now.getTime() + BUFFER_DAYS * DAY_MS;
  const windowEnd = new Date(`${END_YEAR}-12-31T23:59:59.000Z`).getTime();

  const all = await col
    .find({}, { projection: { _id: 1, status: 1, applicationDeadline: 1, applicationStartDate: 1 } })
    .toArray();

  const total = all.length;
  if (total === 0) {
    console.log('ℹ️  No scholarships found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`📊 Total scholarships: ${total}`);

  // --- Choose which stay INACTIVE (for realism) ------------------------------
  // Prefer scholarships that are already non-active (closed/archived/draft) so
  // the inactive set looks natural. If there aren't enough, fall back to the
  // ones with the latest current deadlines.
  const inactivePreference = { closed: 0, archived: 1, draft: 2, active: 3 };
  const sortedForInactive = [...all].sort((a, b) => {
    const pa = inactivePreference[a.status] ?? 9;
    const pb = inactivePreference[b.status] ?? 9;
    if (pa !== pb) return pa - pb;
    // tie-breaker: keep the later-deadline ones inactive
    return new Date(b.applicationDeadline || 0) - new Date(a.applicationDeadline || 0);
  });

  const keepInactiveCount = Math.min(INACTIVE_KEEP, total);
  const inactiveIds = new Set(sortedForInactive.slice(0, keepInactiveCount).map((s) => String(s._id)));

  // --- Prepare ACTIVE set with staggered future deadlines --------------------
  const activeDocs = all.filter((s) => !inactiveIds.has(String(s._id)));

  // Preserve existing relative ordering by current deadline; docs with no
  // deadline sort last but still get a slot.
  activeDocs.sort(
    (a, b) => new Date(a.applicationDeadline || 0) - new Date(b.applicationDeadline || 0)
  );

  const n = activeDocs.length;
  const span = Math.max(windowEnd - windowStart, DAY_MS);

  const bulk = [];

  activeDocs.forEach((doc, i) => {
    // Evenly stagger across [windowStart, windowEnd].
    const fraction = n === 1 ? 0 : i / (n - 1);
    const deadlineMs = Math.round(windowStart + fraction * span);

    // Keep the original start->deadline gap; default if missing/invalid.
    let gapMs = DEFAULT_START_GAP_DAYS * DAY_MS;
    if (doc.applicationStartDate && doc.applicationDeadline) {
      const existingGap =
        new Date(doc.applicationDeadline).getTime() - new Date(doc.applicationStartDate).getTime();
      if (existingGap > 0) gapMs = existingGap;
    }
    let startMs = deadlineMs - gapMs;
    // Ensure the application window is open now (start <= today) for realism.
    if (startMs > now.getTime()) startMs = now.getTime() - DAY_MS;

    bulk.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            status: 'active',
            isActive: true,
            applicationDeadline: new Date(deadlineMs),
            applicationStartDate: new Date(startMs),
            updatedAt: now,
          },
        },
      },
    });
  });

  // --- Ensure the INACTIVE set is genuinely inactive -------------------------
  for (const id of inactiveIds) {
    const doc = all.find((s) => String(s._id) === id);
    // If it was 'active', flip it to 'closed' so it's realistically inactive.
    const newStatus = doc.status === 'active' ? 'closed' : doc.status;
    bulk.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { status: newStatus, isActive: false, updatedAt: now } },
      },
    });
  }

  const result = await col.bulkWrite(bulk, { ordered: false });
  console.log(`✅ Modified ${result.modifiedCount} scholarships`);

  // --- Verify ---------------------------------------------------------------
  const activeFuture = await col.countDocuments({
    isActive: true,
    status: 'active',
    applicationDeadline: { $gte: now },
  });
  const inactive = await col.countDocuments({ isActive: false });
  const [range] = await col
    .aggregate([
      { $match: { isActive: true, status: 'active' } },
      { $group: { _id: null, min: { $min: '$applicationDeadline' }, max: { $max: '$applicationDeadline' } } },
    ])
    .toArray();

  console.log('────────────────────────────────────────');
  console.log(`   Active (future deadline): ${activeFuture}`);
  console.log(`   Inactive (kept realistic): ${inactive}`);
  if (range) {
    console.log(`   Deadline range: ${range.min.toISOString()} -> ${range.max.toISOString()}`);
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error('❌ Failed to activate scholarships:', err.message);
  process.exit(1);
});
