const nodemailer = require('nodemailer');
require('dotenv').config();

// Using 'service: "gmail"' automatically sets port to 465 and secure to true
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER, 
    pass: process.env.MAIL_PASS, 
  }
});

/**
 * Send an email using the configured transporter
 */
async function sendMail({ to, subject, text, html, attachments }) {
  try {
    // Optional: Verify connection before sending
    // await transporter.verify(); 
    
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
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
