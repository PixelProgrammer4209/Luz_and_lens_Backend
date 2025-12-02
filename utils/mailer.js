const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter with robust Gmail settings
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com', // Default to Gmail if missing
  port: process.env.MAIL_PORT || 587,
  secure: process.env.MAIL_PORT == 465, // True for 465, false for 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  // This setting fixes "self signed certificate" issues often seen on Render
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Send an email using the configured transporter
 */
async function sendMail({ to, subject, text, html, attachments }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER, // Fallback to user if FROM is missing
      to,
      subject,
      text,
      html,
      attachments,
    });
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = { sendMail };
