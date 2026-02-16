// =============================================================================
// ISKOlarship - Email Service
// Handles OTP delivery for 2FA login and email verification
// =============================================================================

const nodemailer = require('nodemailer');

// =============================================================================
// Transporter Configuration
// =============================================================================

/**
 * Create a nodemailer transporter for Gmail.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to your Google Account → Security → 2-Step Verification (enable it)
 * 2. Go to https://myaccount.google.com/apppasswords
 * 3. Select "Mail" as the app, then "Other" and name it "ISKOlarship"
 * 4. Google gives you a 16-character password like "abcd efgh ijkl mnop"
 * 5. Set these in your .env file:
 *    EMAIL_USER=yourgmail@gmail.com
 *    EMAIL_PASS=abcdefghijklmnop   (remove the spaces)
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('');
    console.warn('⚠️  ══════════════════════════════════════════════════════════════');
    console.warn('⚠️  EMAIL_USER or EMAIL_PASS not set in .env file.');
    console.warn('⚠️  OTP codes will be printed to this console instead of emailed.');
    console.warn('⚠️  To enable real emails, follow the setup instructions in:');
    console.warn('⚠️  backend/src/services/email.service.js');
    console.warn('⚠️  ══════════════════════════════════════════════════════════════');
    console.warn('');
    return null;
  }

  // Determine transport config
  const host = process.env.EMAIL_HOST;
  
  let transportConfig;
  
  // Timeouts to prevent hanging — critical for production (Railway)
  const timeouts = {
    connectionTimeout: 15000,  // 15s to establish TCP connection
    greetingTimeout: 15000,    // 15s for SMTP greeting
    socketTimeout: 30000,      // 30s for socket inactivity
  };

  if (!host || host.includes('gmail')) {
    // Gmail shorthand — auto-configures host, port, TLS
    transportConfig = {
      service: 'gmail',
      auth: { user, pass },
      ...timeouts,
    };
  } else {
    // Custom SMTP server
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    transportConfig = {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      ...timeouts,
    };
  }

  const transport = nodemailer.createTransport(transportConfig);
  
  // Verify connection on startup (non-blocking)
  transport.verify()
    .then(() => console.log('✅ Email service connected successfully'))
    .catch((err) => {
      console.error('❌ Email service connection failed:', err.message);
      console.error('   Check EMAIL_USER and EMAIL_PASS in your .env file.');
      console.error('   For Gmail, make sure you are using an App Password, NOT your regular password.');
    });

  return transport;
};

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

// =============================================================================
// Timeout Helper
// =============================================================================

/**
 * Wrap a promise with a timeout to prevent hanging.
 * If the promise doesn't resolve/reject within `ms`, it rejects.
 */
const withTimeout = (promise, ms, label = 'Operation') => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
};

// =============================================================================
// OTP Generation
// =============================================================================

/**
 * Generate a 6-digit numeric OTP
 */
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
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">🎓 ISKOlarship</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Scholarship Management Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                Use the verification code below to complete your sign-in. This code is valid for <strong>10 minutes</strong>.
              </p>
              <!-- OTP Box -->
              <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
                <p style="margin:0;color:#1e40af;font-size:36px;font-weight:800;letter-spacing:8px;font-family:'Courier New',monospace;">${otp}</p>
              </div>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                If you didn't request this code, you can safely ignore this email. Someone may have typed your email address by mistake.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                &copy; ${new Date().getFullYear()} ISKOlarship &mdash; UPLB Scholarship Platform
              </p>
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
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">🎓 ISKOlarship</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Scholarship Management Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                Thank you for creating an ISKOlarship account! Please verify your email address by clicking the button below.
              </p>
              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                  Verify Email Address
                </a>
              </div>
              <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;line-height:1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;color:#3b82f6;font-size:12px;word-break:break-all;">
                ${verifyUrl}
              </p>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                &copy; ${new Date().getFullYear()} ISKOlarship &mdash; UPLB Scholarship Platform
              </p>
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
 * @param {string} email - Recipient email
 * @param {string} otp - The 6-digit OTP code
 * @param {string} firstName - User's first name for personalization
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
const sendOTPEmail = async (email, otp, firstName) => {
  const transport = getTransporter();

  const mailOptions = {
    from: `"ISKOlarship" <${process.env.EMAIL_USER || 'noreply@iskolarship.ph'}>`,
    to: email,
    subject: `${otp} is your ISKOlarship verification code`,
    html: getOTPEmailHTML(otp, firstName),
  };

  if (!transport) {
    // Fallback: log to console when no email service configured
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║              📧 OTP CODE (No email configured)       ║');
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log(`║  To:   ${email}`);
    console.log(`║  Code: ${otp}`);
    console.log('╠═══════════════════════════════════════════════════════╣');
    console.log('║  Set EMAIL_USER & EMAIL_PASS in .env to send real    ║');
    console.log('║  emails. For now, use the code above to log in.      ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    return true;
  }

  try {
    const info = await withTimeout(transport.sendMail(mailOptions), 20000, 'OTP email send');
    console.log(`📧 OTP email sent to ${email} (messageId: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('   → Authentication failed. Your EMAIL_PASS is likely wrong.');
      console.error('   → For Gmail, use an App Password: https://myaccount.google.com/apppasswords');
    }
    // Still log the OTP so login isn't completely blocked during development
    console.log(`📧 FALLBACK — OTP for ${email}: ${otp}`);
    return false;
  }
};

/**
 * Send a verification email after registration
 * @param {string} email - Recipient email
 * @param {string} token - JWT verification token
 * @param {string} firstName - User's first name for personalization
 * @returns {Promise<boolean>}
 */
const sendVerificationEmail = async (email, token, firstName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://iskolarship.vercel.app';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  const transport = getTransporter();

  const mailOptions = {
    from: `"ISKOlarship" <${process.env.EMAIL_USER || 'noreply@iskolarship.ph'}>`,
    to: email,
    subject: 'Verify your ISKOlarship email address',
    html: getVerificationEmailHTML(verifyUrl, firstName),
  };

  if (!transport) {
    console.log('═══════════════════════════════════════');
    console.log(`📧 Verification Email (console fallback)`);
    console.log(`   To: ${email}`);
    console.log(`   Link: ${verifyUrl}`);
    console.log('═══════════════════════════════════════');
    return true;
  }

  try {
    await withTimeout(transport.sendMail(mailOptions), 20000, 'Verification email send');
    console.log(`📧 Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    console.log(`📧 Verification link for ${email}: ${verifyUrl}`);
    return false;
  }
};

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendVerificationEmail,
};
