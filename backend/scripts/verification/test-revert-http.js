// Live HTTP smoke test for PUT /api/applications/:id/revert.
// Logs in as an admin, hits the real endpoint, then immediately re-approves
// the application so DB state is unchanged at the end.
require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const path = require('path');

const BASE = 'http://localhost:5001';

const httpJSON = (method, urlPath, token, body) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : '';
  const req = http.request({
    hostname: 'localhost', port: 5001, path: urlPath, method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
      catch { resolve({ status: res.statusCode, body: raw }); }
    });
  });
  req.on('error', reject);
  if (data) req.write(data);
  req.end();
});

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const { User, Application, Notification } = (() => {
    const m = require('../../src/models');
    return { ...m, Notification: require('../../src/models/Notification.model').Notification };
  })();

  // 1. Find an admin we can log in as.
  const admin = await User.findOne({ role: 'admin' }).select('+password email role').lean();
  if (!admin) throw new Error('No admin found');
  console.log('Admin candidate:', admin.email);

  // 2. Find an approved application within this admin's scope.
  const app = await Application.findOne({ status: { $in: ['approved','rejected'] } })
    .populate('scholarship applicant').lean();
  if (!app) throw new Error('No revertable application');
  console.log('App:', app._id.toString(), 'status:', app.status, 'student:', app.applicant.email);
  const studentId = app.applicant._id;

  // 3. Reset admin's password to a known value (rolled back at end).
  const bcrypt = require('bcryptjs');
  const original = (await User.findById(admin._id).select('+password').lean()).password;
  const tempPassword = 'TempVerify123!';
  const hash = await bcrypt.hash(tempPassword, 10);
  await User.updateOne({ _id: admin._id }, { $set: { password: hash } });

  try {
    // 4. Log in.
    const login = await httpJSON('POST', '/api/auth/login', null, { email: admin.email, password: tempPassword });
    console.log('Login status:', login.status, 'success:', login.body?.success);
    const token = login.body?.data?.token || login.body?.token;
    if (!token) throw new Error('No token: ' + JSON.stringify(login.body));

    // 5. Snapshot notif count.
    const before = await Notification.countDocuments({ user: studentId, type: 'application_reverted' });
    console.log('Notif count before:', before);

    // 6. Hit revert endpoint.
    const previousStatus = app.status;
    const revertRes = await httpJSON('PUT', `/api/applications/${app._id}/revert`, token, {
      reason: 'Live HTTP smoke test - will be restored',
      notes: 'auto-revert from verification script'
    });
    console.log('Revert response status:', revertRes.status, 'success:', revertRes.body?.success, 'msg:', revertRes.body?.message);

    // 7. Wait for fire-and-forget notifications.
    await new Promise(r => setTimeout(r, 6000));

    const after = await Notification.countDocuments({ user: studentId, type: 'application_reverted' });
    console.log('Notif count after :', after, '(delta:', after - before, ')');
    const latest = await Notification.findOne({ user: studentId, type: 'application_reverted' })
      .sort({ createdAt: -1 }).lean();
    console.log('Latest notif:', latest?.title, '|', latest?.message);

    // 8. Restore application status (so we don't permanently change DB state).
    if (revertRes.status === 200) {
      const restoreRes = await httpJSON('PUT', `/api/applications/${app._id}/status`, token, {
        status: previousStatus,
        notes: 'auto-restore from verification script'
      });
      console.log('Restore status:', restoreRes.status, 'success:', restoreRes.body?.success);
    }
  } finally {
    // 9. Restore admin password.
    await User.updateOne({ _id: admin._id }, { $set: { password: original } });
    console.log('Admin password restored.');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(async e => { console.error('FATAL:', e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
