const {sendEmail} = require('./nodemailer');

const mail = async (user,PO) => {
    try {
        const emailSubject = `AILS | PO Approval Required - PO# ${PO.PONumber}`;
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header {
                        background-color: #4A90E2;
                        color: white;
                        text-align: center;
                        padding: 10px;
                        font-size: 18px;
                        font-weight: bold;
                        border-radius: 8px 8px 0 0;
                    }
                    .content {
                        padding: 20px;
                        color: #333;
                        font-size: 16px;
                        line-height: 1.6;
                    }
                    .content strong {
                        color: #4A90E2;
                    }
                    .footer {
                        margin-top: 20px;
                        font-size: 14px;
                        text-align: center;
                        color: #888;
                    }
                    .button {
                        display: inline-block;
                        padding: 10px 20px;
                        color: white;
                        background-color: #4A90E2;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>

            <div class="container">
                <div class="header">
                    AILS | PO Approval Notification
                </div>
                <div class="content">
                    <p>Hello ${user.name},</p>
                    <p>The Purchase Order <strong>#${PO.PONumber}</strong> requires your review and approval.</p>
                    
                    <p>Please review and approve the PO at your earliest convenience.</p>
                    
                    <a href="https://your-approval-system.com/po/${PO.PONumber}" class="button">Review & Approve</a>
                </div>
                <div class="footer">
                    <p>Thank you,</p>
                    <p><strong>AILS PO Approval System</strong></p>
                </div>
            </div>

            </body>
            </html>
        `;

        // ✅ Send Email Asynchronously
        await sendEmail(user.email, emailSubject, emailHtml);
        console.log(`Email successfully sent to ${user.email}`);
        
    } catch (error) {
        console.error(`Error sending email to ${user.email}:`, error);
    }
};


module.exports = {mail};