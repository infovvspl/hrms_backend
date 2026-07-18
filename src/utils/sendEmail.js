const nodemailer = require("nodemailer");

// Admin transporter — used for OTP, warning, termination, resignation emails
const adminTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER_ADMIN,
    pass: process.env.EMAIL_PASS_ADMIN,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// HR transporter — used for interview scheduling emails
const hrTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER_HR,
    pass: process.env.EMAIL_PASS_HR,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

adminTransporter.verify((error) => {
  if (error) {
    console.log("Admin SMTP Error:", error);
  } else {
    console.log("Admin SMTP Server is ready.");
  }
});

hrTransporter.verify((error) => {
  if (error) {
    console.log("HR SMTP Error:", error);
  } else {
    console.log("HR SMTP Server is ready.");
  }
});
const sendOtpEmail = async (email, otp) => {

  await adminTransporter.sendMail({

    from: `"Zenova HR" <${process.env.EMAIL_USER_ADMIN}>`,

    to: email,

    subject: "Verify Your Email - Zenova HR",

    html: `
    
    <div style="
      max-width:600px;
      margin:auto;
      padding:30px;
      font-family:Arial,sans-serif;
      background:#f4f7fb;
      border-radius:12px;
    ">

      <div style="
        text-align:center;
        margin-bottom:30px;
      ">
        <h1 style="
          color:#2563eb;
          margin:0;
        ">
          Zenova HR
        </h1>

        <p style="
          color:#555;
          margin-top:8px;
        ">
          Secure Email Verification
        </p>
      </div>

      <div style="
        background:white;
        padding:30px;
        border-radius:10px;
      ">

        <h2 style="
          color:#111827;
        ">
          Verify Your Email
        </h2>

        <p style="
          color:#4b5563;
          line-height:1.6;
        ">
          Welcome to Zenova HR.
          Use the OTP below to verify your email address.
        </p>

        <div style="
          text-align:center;
          margin:30px 0;
        ">

          <span style="
            display:inline-block;
            background:#2563eb;
            color:white;
            font-size:32px;
            letter-spacing:8px;
            padding:16px 30px;
            border-radius:10px;
            font-weight:bold;
          ">
            ${otp}
          </span>

        </div>

        <p style="
          color:#ef4444;
          font-size:14px;
        ">
          This OTP will expire in 5 minutes.
        </p>

      </div>

      <div style="
        text-align:center;
        margin-top:25px;
        color:#9ca3af;
        font-size:13px;
      ">
        © 2026 Zenova HR. All rights reserved.
      </div>

    </div>
    `,
  });

};

const sendWarningEmail = async ({
  email,
  employeeName,
  companyName,
  companyLogo,
  companyAddress,
  companyEmail,
  companyPhone,
  subject,
  description,
  warningDate,
  issuedBy,
}) => {
  await adminTransporter.sendMail({

    from: `"${companyName} HR" <${process.env.EMAIL_USER_ADMIN}>`,
    to: email,
    subject: subject,
    html: description
  });

};
const sendTerminationEmail = async ({
  email,
  companyName,
  subject,
  description,
}) => {
  await adminTransporter.sendMail({
    from: `"${companyName} HR" <${process.env.EMAIL_USER_ADMIN}>`,
    to: email,
    subject: subject,
    html: description
  });
};

const sendResignationEmail = async ({
  toEmail,
  employeeName,
  employeeEmail,
  companyName,
  subject,
  description,
}) => {
  await adminTransporter.sendMail({
    from: `"${employeeName} (via ${companyName})" <${process.env.EMAIL_USER_ADMIN}>`,
    to: toEmail,
    replyTo: employeeEmail,
    subject: subject,
    html: description
  });
};

const sendInterviewEmail = async ({
  email,
  companyName,
  hrName,
  fromEmail,
  subject,
  description,
}) => {
  const fromName = hrName ? hrName : `${companyName} HR`;
  const senderEmail = fromEmail || process.env.EMAIL_USER_HR;
  await hrTransporter.sendMail({
    from: `"${fromName}" <${process.env.EMAIL_USER_HR}>`,
    to: email,
    subject: subject,
    html: description
  });
};

sendOtpEmail.sendWarningEmail = sendWarningEmail;
sendOtpEmail.sendTerminationEmail = sendTerminationEmail;
sendOtpEmail.sendResignationEmail = sendResignationEmail;
sendOtpEmail.sendInterviewEmail = sendInterviewEmail;

module.exports = sendOtpEmail;