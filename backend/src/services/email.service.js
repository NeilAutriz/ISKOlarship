// =============================================================================
// ISKOlarship - Email Service
// Handles OTP delivery for 2FA login and email verification
//
// CLOUD SMTP FIX: Railway and other cloud platforms often have issues with
// direct SMTP connections (IPv6 routing, port blocking, etc.). This service
// uses a multi-strategy approach:
//   1. Resolve smtp.gmail.com to IPv4 addresses (avoid IPv6 timeout)
//   2. Try port 587 (STARTTLS) first — most commonly allowed by cloud firewalls
//   3. Fall back to port 465 (implicit TLS)
//   4. Try multiple resolved IPs
//   5. Fresh transporter per send (no stale cached connections)
// =============================================================================

const nodemailer = require('nodemailer');
const dns = require('dns');
const { promisify } = require('util');

const resolve4 = promisify(dns.resolve4);

// =============================================================================
// SMTP Configuration
// =============================================================================

const GMAIL_SMTP_HOST = 'smtp.gmail.com';

// Port strategies to try, in order
const PORT_STRATEGIES = [
  { port: 587, secure: false, requireTLS: true, label: 'STARTTLS' },
  { port: 465, secure: true, requireTLS: false, label: 'TLS' },
];

// Per-attempt timeouts (short so we can retry different IPs/ports quickly)
const ATTEMPT_TIMEOUTS = {
  connectionTimeout: 8000,   // 8s to establish TCP
  greetingTimeout: 8000,     // 8s for SMTP greeting
  socketTimeout: 15000,      // 15s for socket inactivity
};

// =============================================================================
// IPv4 DNS Resolution
// =============================================================================

/**
 * Resolve smtp.gmail.com to IPv4 addresses.
 * Returns array of IPv4 IPs, or ['smtp.gmail.com'] as fallback.
 */
const resolveGmailIPv4 = async () => {
  try {
    const addresses = await resolve4(GMAIL_SMTP_HOST);
    if (addresses && addresses.length > 0) {
      console.log(`📧 DNS: smtp.gmail.com → [${addresses.slice(0, 3).join(', ')}] (IPv4)`);
      return addresses.slice(0, 3); // Use up to 3 IPs
    }
  } catch (err) {
    console.warn('⚠️ DNS resolve4 failed:', err.message);
  }
  return [GMAIL_SMTP_HOST]; // Fallback to hostname
};

// =============================================================================
// Core Send Function with Multi-Strategy Retry
// =============================================================================

/**
 * Try to send an email via Gmail SMTP, attempting multiple ports and IPs.
 * Creates a fresh transporter for each attempt to avoid stale connections.
 *
 * Attempt order: IP1:587 → IP1:465 → IP2:587 → IP2:465 → ...
 *
 * @param {object} mailOptions - nodemailer mail options
 * @returns {Promise<object>} - nodemailer send info
 * @throws {Error} - if all attempts fail
 */
const sendViaGmailSMTP = async (mailOptions) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null; // No credentials configured
  }

  const hosts = await resolveGmailIPv4();
  const errors = [];

  for (const host of hosts) {
    for (const strategy of PORT_STRATEGIES) {
      const transportConfig = {
        host,
        port: strategy.port,
        secure: strategy.secure,
        auth: { user, pass },
        ...ATTEMPT_TIMEOUTS,
        tls: {
          // SNI: when connecting via IP, the cert is for 'smtp.gmail.com'
          servername: GMAIL_SMTP_HOST,
          rejectUnauthorized: true,
        },
      };

      if (strategy.requireTLS) {
        transportConfig.requireTLS = true;
      }

      try {
        const transport = nodemailer.createTransport(transportConfig);
        const info = await transport.sendMail(mailOptions);
        transport.close();
        console.log(`📧 Email sent via ${host}:${strategy.port} (${strategy.label}) → ${info.messageId}`);
        return info;
      } catch (err) {
        const msg = `${host}:${strategy.port}/${strategy.label} → ${err.message}`;
        errors.push(msg);
        console.warn(`⚠️ SMTP attempt failed: ${msg}`);
      }
    }
  }

  throw new Error(`All SMTP attempts failed:\n  ${errors.join('\n  ')}`);
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
  const mailOptions = {
    from: `"ISKOlarship" <${process.env.EMAIL_USER || 'noreply@iskolarship.ph'}>`,
    to: email,
    subject: `${otp} is your ISKOlarship verification code`,
    html: getOTPEmailHTML(otp, firstName),
  };

  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
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
    await sendViaGmailSMTP(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('   → Authentication failed. Your EMAIL_PASS is likely wrong.');
      console.error('   → For Gmail, use an App Password: https://myaccount.google.com/apppasswords');
    }
    // Log OTP as fallback so login isn't completely blocked
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

  const mailOptions = {
    from: `"ISKOlarship" <${process.env.EMAIL_USER || 'noreply@iskolarship.ph'}>`,
    to: email,
    subject: 'Verify your ISKOlarship email address',
    html: getVerificationEmailHTML(verifyUrl, firstName),
  };

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('═══════════════════════════════════════');
    console.log(`📧 Verification Email (console fallback)`);
    console.log(`   To: ${email}`);
    console.log(`   Link: ${verifyUrl}`);
    console.log('═══════════════════════════════════════');
    return true;
  }

  try {
    await sendViaGmailSMTP(mailOptions);
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
