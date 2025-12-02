const nodemailer = require('nodemailer');
require('dotenv').config();

// We are switching to explicit host/port configuration for better stability
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER, 
    pass: process.env.MAIL_PASS, 
  },
  // Adding connection timeout settings to fail faster if issues persist
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000
});

/**
 * Send an email using the configured transporter
 */
async function sendMail({ to, subject, text, html, attachments }) {
  try {
    // Verify connection configuration
    await transporter.verify(); 
    console.log("✅ SMTP Connection Established");

    const info = await transporter.sendMail({
      from: `Luz & Lens <${process.env.MAIL_USER}>`, // Professional formatting
      to,
      subject,
      text,
      html,
      attachments,
    });
    return info;
  } catch (error) {
    console.error('❌ Email Transporter Error:', error.message);
    throw error;
  }
}

module.exports = { sendMail };
