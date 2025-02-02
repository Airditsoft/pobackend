const nodemailer = require("nodemailer");

/**
 * Send an email using Nodemailer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML template for the email body
 */
const sendEmail = async (to, subject, htmlContent) => {
  try {
    console.log("Sending email to:", to);

    // ✅ Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail", // ✅ Email provider (can be "outlook", "mailgun", etc.)
      auth: {
        user: process.env.EMAIL_USER, // ✅ Your email address
        pass: process.env.EMAIL_PASS, // ✅ App password (not your real password)
      },
    });

    // ✅ Define email options
    const mailOptions = {
      from: `"PO Approval System" <${process.env.EMAIL_USER}>`, // ✅ Sender email
      to, // ✅ Recipient email
      subject, // ✅ Email subject
      html: htmlContent, // ✅ HTML email content
    };

    // ✅ Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response);
    
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return { success: false, message: "Failed to send email", error };
  }
};

module.exports = { sendEmail };
