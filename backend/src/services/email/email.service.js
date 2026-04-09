// =============================================================================
// ISKOlarship - Email Service
// Handles OTP delivery for 2FA login and email verification
//
// TRANSPORT STRATEGY:
//   1. Brevo API (HTTP) — works on Railway/cloud platforms where SMTP is blocked
//      Set BREVO_API_KEY + BREVO_SENDER_EMAIL in env vars.
//      Free: 300 emails/day at brevo.com (formerly Sendinblue)
//   2. Gmail SMTP — works locally and on platforms that allow outbound SMTP
//      Set EMAIL_USER + EMAIL_PASS in env vars.
//   3. Console fallback — prints OTP to server logs when no email service
// =============================================================================

const nodemailer = require('nodemailer');
const dns = require('dns');
const { promisify } = require('util');

const resolve4 = promisify(dns.resolve4);

// =============================================================================
// Transport Selection
// =============================================================================

/**
 * Determine which email transport to use based on available env vars.
 * Priority: Brevo API → Gmail SMTP → Console fallback
 */
const getTransportType = () => {
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) return 'smtp';
  return 'console';
};

// =============================================================================
// Brevo (HTTP API) Transport — formerly Sendinblue
// =============================================================================

/**
 * Send email via Brevo HTTP API.
 * Uses port 443 (HTTPS) — never blocked by cloud platforms.
 * Free tier: 300 emails/day. Only requires sender email verification (no domain needed).
 */
const sendViaBrevo = async (mailOptions) => {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'noreply@iskolarship.ph';
  const senderName = process.env.BREVO_SENDER_NAME || 'ISKOlarship';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: mailOptions.to }],
      subject: mailOptions.subject,
      htmlContent: mailOptions.html,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Brevo API error (${response.status}): ${data.message || JSON.stringify(data)}`);
  }

  console.log(`📧 Email sent via Brevo API → messageId: ${data.messageId}`);
  return data;
};

// =============================================================================
// Gmail SMTP Transport (fallback for local development)
// =============================================================================

const GMAIL_SMTP_HOST = 'smtp.gmail.com';

const PORT_STRATEGIES = [
  { port: 587, secure: false, requireTLS: true, label: 'STARTTLS' },
  { port: 465, secure: true, requireTLS: false, label: 'TLS' },
];

const ATTEMPT_TIMEOUTS = {
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 15000,
};

/**
 * Resolve smtp.gmail.com to IPv4 addresses.
 */
const resolveGmailIPv4 = async () => {
  try {
    const addresses = await resolve4(GMAIL_SMTP_HOST);
    if (addresses && addresses.length > 0) {
      return addresses.slice(0, 3);
    }
  } catch (err) {
    console.warn('⚠️ DNS resolve4 failed:', err.message);
  }
  return [GMAIL_SMTP_HOST];
};

/**
 * Send email via Gmail SMTP, trying multiple ports and IPs.
 */
const sendViaGmailSMTP = async (mailOptions) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const hosts = await resolveGmailIPv4();
  const errors = [];

  for (const host of hosts) {
    for (const strategy of PORT_STRATEGIES) {
      const config = {
        host,
        port: strategy.port,
        secure: strategy.secure,
        auth: { user, pass },
        ...ATTEMPT_TIMEOUTS,
        tls: { servername: GMAIL_SMTP_HOST, rejectUnauthorized: true },
      };
      if (strategy.requireTLS) config.requireTLS = true;

      try {
        const transport = nodemailer.createTransport(config);
        const info = await transport.sendMail(mailOptions);
        transport.close();
        console.log(`📧 Email sent via SMTP ${host}:${strategy.port} (${strategy.label}) → ${info.messageId}`);
        return info;
      } catch (err) {
        errors.push(`${host}:${strategy.port}/${strategy.label} → ${err.message}`);
      }
    }
  }

  throw new Error(`All SMTP attempts failed:\n  ${errors.join('\n  ')}`);
};

// =============================================================================
// Unified Email Send
// =============================================================================

/**
 * Send an email using the best available transport.
 * Falls through: Brevo → SMTP → throws error
 */
const sendEmail = async (mailOptions) => {
  const type = getTransportType();

  if (type === 'console') {
    return null; // Caller handles console fallback
  }

  if (type === 'brevo') {
    return sendViaBrevo(mailOptions);
  }

  // type === 'smtp'
  return sendViaGmailSMTP(mailOptions);
};

// =============================================================================
// OTP Generation
// =============================================================================

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// =============================================================================
// Email Templates
// =============================================================================

const getOTPEmailHTML = (otp, firstName) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISKOlarship - Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(37,99,235,0.10),0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:#2563eb;padding:36px 40px 28px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🎓 ISKOlarship</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:500;">UPLB Scholarship Management Platform</p>
              <div style="margin:16px auto 0;width:40px;height:2px;background:rgba(255,255,255,0.3);border-radius:1px;"></div>
              <p style="margin:12px 0 0;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:0.5px;">Verification Code</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 28px;">
              <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                Use the verification code below to complete your sign-in. This code is valid for <strong>10 minutes</strong>.
              </p>
              <div style="background:#eff6ff;border:2px dashed #bfdbfe;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your Verification Code</p>
                <p style="margin:0;color:#2563eb;font-size:36px;font-weight:800;letter-spacing:8px;font-family:'Courier New',monospace;">${otp}</p>
              </div>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="text-align:center;padding-bottom:10px;"><span style="display:inline-block;width:40px;height:2px;background:#2563eb;border-radius:1px;"></span></td></tr>
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;font-weight:500;">
                      &copy; ${new Date().getFullYear()} ISKOlarship &mdash; UPLB Scholarship Platform
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
};

const getVerificationEmailHTML = (verifyUrl, firstName) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISKOlarship - Verify Your Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(37,99,235,0.10),0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:#2563eb;padding:36px 40px 28px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🎓 ISKOlarship</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:500;">UPLB Scholarship Management Platform</p>
              <div style="margin:16px auto 0;width:40px;height:2px;background:rgba(255,255,255,0.3);border-radius:1px;"></div>
              <p style="margin:12px 0 0;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:0.5px;">Verify Your Email</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 28px;">
              <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                Thank you for creating an ISKOlarship account! Please verify your email address by clicking the button below.
              </p>
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                  Verify Email Address
                </a>
              </div>
              <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;line-height:1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;color:#2563eb;font-size:12px;word-break:break-all;">
                ${verifyUrl}
              </p>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="text-align:center;padding-bottom:10px;"><span style="display:inline-block;width:40px;height:2px;background:#2563eb;border-radius:1px;"></span></td></tr>
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;font-weight:500;">
                      &copy; ${new Date().getFullYear()} ISKOlarship &mdash; UPLB Scholarship Platform
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
};

// =============================================================================
// Email Sending Functions
// =============================================================================

/**
 * Send an OTP code to the user's email for 2FA login
 */
const sendOTPEmail = async (email, otp, firstName) => {
  const mailOptions = {
    from: `"ISKOlarship" <${process.env.EMAIL_USER || 'noreply@iskolarship.ph'}>`,
    to: email,
    subject: `${otp} is your ISKOlarship verification code`,
    html: getOTPEmailHTML(otp, firstName),
  };

  const type = getTransportType();

  if (type === 'console') {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║              📧 OTP CODE (No email configured)       ║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  To:   ${email}`);
    console.log(`║  Code: ${otp}`);
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log('║  Set BREVO_API_KEY or EMAIL_USER+EMAIL_PASS to        ║');
    console.log('║  enable real emails.                                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    return true;
  }

  try {
    await sendEmail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    console.log(`📧 FALLBACK — OTP for ${email}: ${otp}`);
    return false;
  }
};

/**
 * Send a verification email after registration
 */
const sendVerificationEmail = async (email, token, firstName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://iskolarship.vercel.app';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"ISKOlarship" <${process.env.EMAIL_USER || 'noreply@iskolarship.ph'}>`,
    to: email,
    subject: 'Verify your ISKOlarship email address',
    html: getVerificationEmailHTML(verifyUrl, firstName),
  };

  const type = getTransportType();

  if (type === 'console') {
    console.log('═══════════════════════════════════════');
    console.log(`📧 Verification Email (console fallback)`);
    console.log(`   To: ${email}`);
    console.log(`   Link: ${verifyUrl}`);
    console.log('═══════════════════════════════════════');
    return true;
  }

  try {
    await sendEmail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    console.log(`📧 Verification link for ${email}: ${verifyUrl}`);
    return false;
  }
};

/**
 * Generate password reset email HTML template
 */
const getPasswordResetEmailHTML = (resetUrl, firstName) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISKOlarship - Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(37,99,235,0.10),0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:#2563eb;padding:36px 40px 28px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🎓 ISKOlarship</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:500;">UPLB Scholarship Management Platform</p>
              <div style="margin:16px auto 0;width:40px;height:2px;background:rgba(255,255,255,0.3);border-radius:1px;"></div>
              <p style="margin:12px 0 0;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:0.5px;">Reset Your Password</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 28px;">
              <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                  Reset Password
                </a>
              </div>
              <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;line-height:1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;color:#2563eb;font-size:12px;word-break:break-all;">
                ${resetUrl}
              </p>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="text-align:center;padding-bottom:10px;"><span style="display:inline-block;width:40px;height:2px;background:#2563eb;border-radius:1px;"></span></td></tr>
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;font-weight:500;">
                      &copy; ${new Date().getFullYear()} ISKOlarship &mdash; UPLB Scholarship Platform
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
};

/**
 * Send a password reset email
 */
const sendPasswordResetEmail = async (email, resetToken, firstName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://iskolarship.vercel.app';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"ISKOlarship" <${process.env.EMAIL_USER || 'noreply@iskolarship.ph'}>`,
    to: email,
    subject: 'Reset your ISKOlarship password',
    html: getPasswordResetEmailHTML(resetUrl, firstName),
  };

  const type = getTransportType();

  if (type === 'console') {
    console.log('═══════════════════════════════════════');
    console.log(`📧 Password Reset (console fallback)`);
    console.log(`   To: ${email}`);
    console.log(`   Link: ${resetUrl}`);
    console.log('═══════════════════════════════════════');
    return true;
  }

  try {
    await sendEmail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    // Do NOT log the reset URL/token to console in production
    return false;
  }
};

// =============================================================================
// Startup Logging
// =============================================================================

const type = getTransportType();
if (type === 'brevo') {
  console.log('✅ Email transport: Brevo API (HTTP)');
} else if (type === 'smtp') {
  console.log('✅ Email transport: Gmail SMTP');
} else {
  console.warn('⚠️ No email transport configured. OTPs will print to console.');
  console.warn('   → For Railway/cloud: set BREVO_API_KEY (get one at brevo.com)');
  console.warn('   → For local dev: set EMAIL_USER + EMAIL_PASS in .env');
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  generateOTP,
  sendEmail,
  sendOTPEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
