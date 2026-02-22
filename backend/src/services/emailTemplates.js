// =============================================================================
// ISKOlarship - Email Notification Templates
// Branded HTML emails for application & document status notifications
// =============================================================================

const YEAR = new Date().getFullYear();
const FRONTEND = process.env.FRONTEND_URL || 'https://iskolarship.vercel.app';

// ---------------------------------------------------------------------------
// Shared layout wrapper — solid primary #2563eb header
// ---------------------------------------------------------------------------
const layout = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISKOlarship - ${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(37,99,235,0.10),0 2px 8px rgba(0,0,0,0.05);">
          <!-- Brand header -->
          <tr>
            <td style="background:#2563eb;padding:36px 40px 28px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🎓 ISKOlarship</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:500;">UPLB Scholarship Management Platform</p>
              <div style="margin:16px auto 0;width:40px;height:2px;background:rgba(255,255,255,0.3);border-radius:1px;"></div>
              <p style="margin:12px 0 0;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:0.5px;">${title}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="text-align:center;padding-bottom:10px;"><span style="display:inline-block;width:40px;height:2px;background:#2563eb;border-radius:1px;"></span></td></tr>
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;font-weight:500;">
                      &copy; ${YEAR} ISKOlarship &mdash; UPLB Scholarship Platform
                    </p>
                    <p style="margin:0;color:#cbd5e1;font-size:11px;">
                      You received this email because of your ISKOlarship account notification preferences.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const svgCheck = (color) =>
  `<img src="https://img.icons8.com/fluency-systems-filled/20/${color.replace('#','')}/checkmark.png" width="14" height="14" alt="" style="display:inline-block;vertical-align:middle;margin-right:6px;" />`;

const svgX = (color) =>
  `<img src="https://img.icons8.com/fluency-systems-filled/20/${color.replace('#','')}/multiply.png" width="14" height="14" alt="" style="display:inline-block;vertical-align:middle;margin-right:6px;" />`;

const badge = (label, bgColor, textColor) =>
  `<span style="display:inline-block;padding:8px 20px;border-radius:20px;background:${bgColor};color:${textColor};font-size:13px;font-weight:700;letter-spacing:0.3px;">${label}</span>`;

const cta = (label, path) =>
  `<div style="text-align:center;margin:4px 0 24px;">
    <a href="${FRONTEND}${path}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
      ${label}
    </a>
  </div>`;

// =============================================================================
// Application Status Templates
// =============================================================================

const applicationApproved = ({ firstName, scholarshipName = 'a scholarship' }) => ({
  subject: `Congratulations! Your application for ${scholarshipName} has been approved`,
  html: layout('Application Approved', `
    <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Great news! Your scholarship application has been <strong>approved</strong>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Application Status</p>
      ${badge(`${svgCheck('#166534')}Approved`, '#dcfce7', '#166534')}
      <p style="margin:14px 0 0;color:#166534;font-size:15px;font-weight:600;">${scholarshipName}</p>
    </div>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      Please check your ISKOlarship dashboard for further instructions and any next steps from the scholarship provider.
    </p>
    ${cta('View My Applications', '/applications')}
    <p style="margin:0;color:#94a3b8;font-size:13px;">Congratulations and keep up the great work! 🎉</p>
  `),
});

const applicationRejected = ({ firstName, scholarshipName = 'a scholarship', reason = '' }) => ({
  subject: `Update on your ${scholarshipName} application`,
  html: layout('Application Update', `
    <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      We regret to inform you that your application was <strong>not approved</strong> this time.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Application Status</p>
      ${badge(`${svgX('#991b1b')}Not Approved`, '#fee2e2', '#991b1b')}
      <p style="margin:14px 0 0;color:#991b1b;font-size:15px;font-weight:600;">${scholarshipName}</p>
    </div>
    ${reason ? `<div style="background:#f8fafc;border-left:4px solid #cbd5e1;padding:12px 16px;margin:0 0 20px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">Reason</p>
      <p style="margin:0;color:#334155;font-size:14px;">${reason}</p>
    </div>` : ''}
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      Don't be discouraged — there are other scholarships available on ISKOlarship. Keep exploring and applying!
    </p>
    ${cta('Browse Scholarships', '/scholarships')}
  `),
});

const applicationUnderReview = ({ firstName, scholarshipName = 'a scholarship' }) => ({
  subject: `Your ${scholarshipName} application is now under review`,
  html: layout('Application Under Review', `
    <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Your scholarship application is now being reviewed by the administrators.
    </p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Application Status</p>
      ${badge('&#128269; Under Review', '#dbeafe', '#1e40af')}
      <p style="margin:14px 0 0;color:#1e40af;font-size:15px;font-weight:600;">${scholarshipName}</p>
    </div>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      You'll receive another email once a decision has been made. In the meantime, you can track the status of your application on your dashboard.
    </p>
    ${cta('Track My Application', '/applications')}
  `),
});


// =============================================================================
// Document Verification Templates
// =============================================================================

const documentVerified = ({ firstName, documentName = 'a document' }) => ({
  subject: `Your document "${documentName}" has been verified`,
  html: layout('Document Verified', `
    <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Your uploaded document has been <strong>verified</strong> by an administrator.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Document Status</p>
      ${badge(`${svgCheck('#166534')}Verified`, '#dcfce7', '#166534')}
      <p style="margin:14px 0 0;color:#166534;font-size:15px;font-weight:600;">${documentName}</p>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;">No further action is needed for this document.</p>
  `),
});

const documentRejected = ({ firstName, documentName = 'a document', remarks = '' }) => ({
  subject: `Your document "${documentName}" was not approved`,
  html: layout('Document Not Approved', `
    <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      Unfortunately, your uploaded document was <strong>not approved</strong> by an administrator.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Document Status</p>
      ${badge(`${svgX('#991b1b')}Rejected`, '#fee2e2', '#991b1b')}
      <p style="margin:14px 0 0;color:#991b1b;font-size:15px;font-weight:600;">${documentName}</p>
    </div>
    ${remarks ? `<div style="background:#f8fafc;border-left:4px solid #cbd5e1;padding:12px 16px;margin:0 0 20px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">Admin Remarks</p>
      <p style="margin:0;color:#334155;font-size:14px;">${remarks}</p>
    </div>` : ''}
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      Please check your profile for details and upload a corrected version if needed.
    </p>
    ${cta('Go to My Profile', '/profile')}
  `),
});

const documentResubmit = ({ firstName, documentName = 'a document', remarks = '' }) => ({
  subject: `Resubmission required for "${documentName}"`,
  html: layout('Document Resubmission Required', `
    <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      An administrator has requested that you <strong>resubmit</strong> one of your documents.
    </p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Document Status</p>
      ${badge(`&#9888; Resubmission Required`, '#fef3c7', '#92400e')}
      <p style="margin:14px 0 0;color:#92400e;font-size:15px;font-weight:600;">${documentName}</p>
    </div>
    ${remarks ? `<div style="background:#f8fafc;border-left:4px solid #cbd5e1;padding:12px 16px;margin:0 0 20px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">Admin Remarks</p>
      <p style="margin:0;color:#334155;font-size:14px;">${remarks}</p>
    </div>` : ''}
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      Please log in and upload a corrected version of this document at your earliest convenience.
    </p>
    ${cta('Go to My Profile', '/profile')}
  `),
});

const allDocumentsVerified = ({ firstName }) => ({
  subject: 'All your documents have been verified!',
  html: layout('All Documents Verified', `
    <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
      All of your uploaded profile documents have been <strong>verified</strong>. Your profile is now fully verified!
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Profile Status</p>
      ${badge(`${svgCheck('#166534')}All Documents Verified`, '#dcfce7', '#166534')}
    </div>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
      You're all set! You can now confidently apply for scholarships on ISKOlarship.
    </p>
    ${cta('Browse Scholarships', '/scholarships')}
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
  documentVerified,
  documentRejected,
  documentResubmit,
  allDocumentsVerified,
};
