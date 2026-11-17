// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Email Utility (Nodemailer)
//  Used for Password Reset and Official Notifications
// ═══════════════════════════════════════════════════════

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let emailTransporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  emailTransporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  logger.info('✅ Email transporter initialized');
} else {
  logger.info('⚠️ Email service not configured (EMAIL_USER / EMAIL_PASSWORD missing)');
}

async function sendPasswordReset(email, resetCode, userName = 'Farmer') {
  if (!emailTransporter) {
    logger.warn({ email }, 'Email service disabled - skipping password reset dispatch');
    return false;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Krishi Sarthi <noreply@krishisarthi.in>',
    to: email,
    subject: 'OTP for Password Reset - Krishi Sarthi',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background: #1B5E20; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0;">
          <h2 style="margin: 0;">🌾 कृषि सारथी — Krishi Sarthi</h2>
          <p style="margin: 5px 0 0; opacity: 0.9;">बिहार एडिशन (Bihar Edition)</p>
        </div>
        <div style="padding: 24px; background: #ffffff;">
          <p>नमस्ते <strong>${userName}</strong>,</p>
          <p>आपके कृषि सारथी खाते के पासवर्ड रीसेट का अनुरोध प्राप्त हुआ है।</p>
          <div style="background: #F0FDF4; border: 2px dashed #2E7D32; padding: 16px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1B5E20;">${resetCode}</span>
          </div>
          <p style="color: #64748B; font-size: 14px;">यह कोड 30 मिनट में समाप्त हो जाएगा। यदि आपने यह अनुरोध नहीं किया था, तो कृपया इसे अनदेखा करें।</p>
        </div>
        <div style="text-align: center; padding: 12px; font-size: 12px; color: #94A3B8; border-top: 1px solid #e2e8f0;">
          © ${new Date().getFullYear()} Krishi Sarthi. बिहार के किसानों का सच्चा साथी।
        </div>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    logger.info({ email }, 'Password reset email successfully sent');
    return true;
  } catch (error) {
    logger.error({ err: error, email }, 'Failed to send password reset email');
    return false;
  }
}

module.exports = {
  sendPasswordReset,
  isConfigured: !!emailTransporter
};
