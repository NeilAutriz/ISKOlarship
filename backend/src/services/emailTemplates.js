// =============================================================================
// ISKOlarship - Email Notification Templates
// Branded HTML emails for application & document status notifications
// =============================================================================

const YEAR = new Date().getFullYear();

// Shared layout wrapper
const layout = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISKOlarship - ${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">🎓 ISKOlarship</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Scholarship Management Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                &copy; ${YEAR} ISKOlarship &mdash; UPLB Scholarship Platform
              </p>
              <p style="margin:6px 0 0;color:#94a3b8;font-size:11px;">
                You received this email because of your ISKOlarship account notification preferences.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------
const badge = (label, bgColor, textColor) =>
  `<span style="display:inline-block;padding:6px 16px;border-radius:8px;background:${bgColor};color:${textColor};font-size:14px;font-weight:700;">${label}</span>`;

// =============================================================================
// Application Status Templates
// =============================================================================

const applicationApproved = ({ firstName, scholarshipName }) => ({
  subject: `Congratulations! Your application for ${scholarshipName} has been approved`,
  html: layout('Application Approved', `
    <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Great news! Your scholarship application has been <strong>approved</strong>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Application Status</p>
      ${badge('✓ Approved', '#dcfce7', '#166534')}
      <p style="margin:12px 0 0;color:#166534;font-size:15px;font-weight:600;">${scholarshipName}</p>
    </div>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      Please check your ISKOlarship dashboard for further instructions and any next steps from the scholarship provider.
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${process.env.FRONTEND_URL || 'https://iskolarship.vercel.app'}/applications" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        View My Applications
      </a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;">Congratulations and keep up the great work! 🎉</p>
  `),
});

const applicationRejected = ({ firstName, scholarshipName, reason }) => ({
  subject: `Update on your ${scholarshipName} application`,
  html: layout('Application Update', `
    <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      We regret to inform you that your application was <strong>not approved</strong> this time.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Application Status</p>
      ${badge('Not Approved', '#fee2e2', '#991b1b')}
      <p style="margin:12px 0 0;color:#991b1b;font-size:15px;font-weight:600;">${scholarshipName}</p>
    </div>
    ${reason ? `<div style="background:#f8fafc;border-left:4px solid #cbd5e1;padding:12px 16px;margin:0 0 20px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">Reason</p>
      <p style="margin:0;color:#334155;font-size:14px;">${reason}</p>
    </div>` : ''}
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      Don't be discouraged — there are other scholarships available on ISKOlarship. Keep exploring and applying!
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${process.env.FRONTEND_URL || 'https://iskolarship.vercel.app'}/scholarships" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        Browse Scholarships
      </a>
    </div>
  `),
});

const applicationUnderReview = ({ firstName, scholarshipName }) => ({
  subject: `Your ${scholarshipName} application is now under review`,
  html: layout('Application Under Review', `
    <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Your scholarship application is now being reviewed by the administrators.
    </p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Application Status</p>
      ${badge('Under Review', '#dbeafe', '#1e40af')}
      <p style="margin:12px 0 0;color:#1e40af;font-size:15px;font-weight:600;">${scholarshipName}</p>
    </div>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      You'll receive another email once a decision has been made. In the meantime, you can track the status of your application on your dashboard.
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${process.env.FRONTEND_URL || 'https://iskolarship.vercel.app'}/applications" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        Track My Application
      </a>
    </div>
  `),
});

const applicationWaitlisted = ({ firstName, scholarshipName }) => ({
  subject: `Your ${scholarshipName} application has been waitlisted`,
  html: layout('Application Waitlisted', `
    <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Your application has been placed on the <strong>waitlist</strong>. This means you may still be selected if a slot becomes available.
    </p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Application Status</p>
      ${badge('Waitlisted', '#fef3c7', '#92400e')}
      <p style="margin:12px 0 0;color:#92400e;font-size:15px;font-weight:600;">${scholarshipName}</p>
    </div>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      We will notify you if the status of your application changes. Keep an eye on your dashboard for updates.
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${process.env.FRONTEND_URL || 'https://iskolarship.vercel.app'}/applications" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        View My Applications
      </a>
    </div>
  `),
});

// =============================================================================
// Document Verification Templates
// =============================================================================

const documentVerified = ({ firstName, documentName }) => ({
  subject: `Your document "${documentName}" has been verified`,
  html: layout('Document Verified', `
    <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Your uploaded document has been <strong>verified</strong> by an administrator.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Document Status</p>
      ${badge('✓ Verified', '#dcfce7', '#166534')}
      <p style="margin:12px 0 0;color:#166534;font-size:15px;font-weight:600;">${documentName}</p>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;">No further action is needed for this document.</p>
  `),
});

const documentRejected = ({ firstName, documentName, remarks }) => ({
  subject: `Your document "${documentName}" was not approved`,
  html: layout('Document Not Approved', `
    <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Unfortunately, your uploaded document was <strong>not approved</strong> by an administrator.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Document Status</p>
      ${badge('Rejected', '#fee2e2', '#991b1b')}
      <p style="margin:12px 0 0;color:#991b1b;font-size:15px;font-weight:600;">${documentName}</p>
    </div>
    ${remarks ? `<div style="background:#f8fafc;border-left:4px solid #cbd5e1;padding:12px 16px;margin:0 0 20px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">Admin Remarks</p>
      <p style="margin:0;color:#334155;font-size:14px;">${remarks}</p>
    </div>` : ''}
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      Please check your profile for details and upload a corrected version if needed.
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${process.env.FRONTEND_URL || 'https://iskolarship.vercel.app'}/profile" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        Go to My Profile
      </a>
    </div>
  `),
});

const documentResubmit = ({ firstName, documentName, remarks }) => ({
  subject: `Resubmission required for "${documentName}"`,
  html: layout('Document Resubmission Required', `
    <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      An administrator has requested that you <strong>resubmit</strong> one of your documents.
    </p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Document Status</p>
      ${badge('Resubmission Required', '#fef3c7', '#92400e')}
      <p style="margin:12px 0 0;color:#92400e;font-size:15px;font-weight:600;">${documentName}</p>
    </div>
    ${remarks ? `<div style="background:#f8fafc;border-left:4px solid #cbd5e1;padding:12px 16px;margin:0 0 20px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">Admin Remarks</p>
      <p style="margin:0;color:#334155;font-size:14px;">${remarks}</p>
    </div>` : ''}
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      Please log in and upload a corrected version of this document at your earliest convenience.
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${process.env.FRONTEND_URL || 'https://iskolarship.vercel.app'}/profile" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        Go to My Profile
      </a>
    </div>
  `),
});

const allDocumentsVerified = ({ firstName }) => ({
  subject: 'All your documents have been verified!',
  html: layout('All Documents Verified', `
    <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      All of your uploaded profile documents have been <strong>verified</strong>. Your profile is now fully verified!
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Profile Status</p>
      ${badge('✓ All Documents Verified', '#dcfce7', '#166534')}
    </div>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      You're all set! You can now confidently apply for scholarships on ISKOlarship.
    </p>
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${process.env.FRONTEND_URL || 'https://iskolarship.vercel.app'}/scholarships" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        Browse Scholarships
      </a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;">Keep your documents up to date each semester for the best experience.</p>
  `),
});

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  applicationApproved,
  applicationRejected,
  applicationUnderReview,
  applicationWaitlisted,
  documentVerified,
  documentRejected,
  documentResubmit,
  allDocumentsVerified,
};
