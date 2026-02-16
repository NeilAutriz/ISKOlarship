// =============================================================================
// ISKOlarship - Email Service
// Handles OTP delivery for 2FA login and email verification
//
// TRANSPORT STRATEGY:
//   1. Resend API (HTTP) — works on Railway/cloud platforms where SMTP is blocked
//      Set RESEND_API_KEY in env vars. Free: 100 emails/day at resend.com
//   2. Gmail SMTP — works locally and on platforms that allow outbound SMTP
//      Set EMAIL_USER + EMAIL_PASS in env vars.
//   3. Console fallback — prints OTP to server logs when no email service
// =============================================================================

const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const dns = require('dns');
const { promisify } = require('util');

const resolve4 = promisify(dns.resolve4);

// =============================================================================
// Transport Selection
// =============================================================================

/**
 * Determine which email transport to use based on available env vars.
 * Priority: Resend API → Gmail SMTP → Console fallback
 */
const getTransportType = () => {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) return 'smtp';
  return 'console';
};

// =============================================================================
// Resend (HTTP API) Transport
// =============================================================================

/**
 * Send email via Resend HTTP API.
 * Uses port 443 (HTTPS) — never blocked by cloud platforms.
 */
const sendViaResend = async (mailOptions) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Resend free tier sends from 'onboarding@resend.dev'
  // To use a custom domain, verify it in the Resend dashboard
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'ISKOlarship <onboarding@resend.dev>';

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [mailOptions.to],
    subject: mailOptions.subject,
    html: mailOptions.html,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }

  console.log(`📧 Email sent via Resend API → ${data.id}`);
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
 * Falls through: Resend → SMTP → throws error
 */
const sendEmail = async (mailOptions) => {
  const type = getTransportType();

  if (type === 'console') {
    return null; // Caller handles console fallback
  }

  if (type === 'resend') {
    return sendViaResend(mailOptions);
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
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">🎓 ISKOlarship</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Scholarship Management Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                Use the verification code below to complete your sign-in. This code is valid for <strong>10 minutes</strong>.
              </p>
              <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
                <p style="margin:0;color:#1e40af;font-size:36px;font-weight:800;letter-spacing:8px;font-family:'Courier New',monospace;">${otp}</p>
              </div>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
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
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">🎓 ISKOlarship</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Scholarship Management Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#334155;font-size:16px;">Hi <strong>${firstName || 'there'}</strong>,</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                Thank you for creating an ISKOlarship account! Please verify your email address by clicking the button below.
              </p>
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
    console.log('║  Set RESEND_API_KEY or EMAIL_USER+EMAIL_PASS to      ║');
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

// =============================================================================
// Startup Logging
// =============================================================================

const type = getTransportType();
if (type === 'resend') {
  console.log('✅ Email transport: Resend API (HTTP)');
} else if (type === 'smtp') {
  console.log('✅ Email transport: Gmail SMTP');
} else {
  console.warn('⚠️ No email transport configured. OTPs will print to console.');
  console.warn('   → For Railway/cloud: set RESEND_API_KEY (get one at resend.com)');
  console.warn('   → For local dev: set EMAIL_USER + EMAIL_PASS in .env');
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendVerificationEmail,
};
