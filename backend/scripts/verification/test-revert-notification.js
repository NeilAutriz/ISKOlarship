// One-off verification: prove revert notification emits both an in-app
// notification record AND attempts an email send. Safe to run repeatedly.
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const { User } = require('../../src/models');
  const { Notification } = require('../../src/models/Notification.model');
  const { notifyApplicationStatusChange } = require('../../src/services/email/notification.service');

  const student = await User.findOne({ role: 'student', email: { $ne: null } })
    .select('email studentProfile.firstName notificationPreferences')
    .lean();
  if (!student) { console.log('No student found'); process.exit(1); }

  console.log('Test target email :', student.email);
  console.log('Test target id    :', student._id.toString());
  console.log('emailEnabled      :', student.notificationPreferences?.emailEnabled);
  console.log('applicationUpdates:', student.notificationPreferences?.applicationUpdates);

  const before = await Notification.countDocuments({ user: student._id, type: 'application_reverted' });
  console.log('Existing application_reverted notifs:', before);

  notifyApplicationStatusChange(
    student._id.toString(),
    'reverted',
    'TEST - CDC Communication Arts Scholarship',
    'Verification test - re-evaluation requested'
  );

  await new Promise(r => setTimeout(r, 5000));

  const after = await Notification.countDocuments({ user: student._id, type: 'application_reverted' });
  console.log('After application_reverted notifs   :', after, '(delta:', after - before, ')');

  const latest = await Notification.findOne({ user: student._id, type: 'application_reverted' })
    .sort({ createdAt: -1 })
    .lean();
  if (latest) {
    console.log('---- Latest in-app notification ----');
    console.log('title   :', latest.title);
    console.log('message :', latest.message);
    console.log('metadata:', latest.metadata);
    console.log('created :', latest.createdAt);
  } else {
    console.log('!! No in-app notification was created');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
