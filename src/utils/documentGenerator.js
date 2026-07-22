const renderSignaturesAndStamp = (signatures, stamp, companyName) => {
  let html = `<div style="display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; margin-top: 40px; gap: 20px; width: 100%;">`;

  let signatureArray = [];
  if (Array.isArray(signatures)) {
    signatureArray = signatures;
  } else if (typeof signatures === 'string' && signatures.trim()) {
    try {
      const trimmed = signatures.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        signatureArray = JSON.parse(trimmed);
      } else {
        signatureArray = [{ label: 'Authorized Signatory', signature_path: trimmed }];
      }
    } catch (e) {
      signatureArray = [{ label: 'Authorized Signatory', signature_path: signatures }];
    }
  }

  html += `<div style="display: flex; align-items: flex-end; gap: 30px; flex-wrap: wrap;">`;
  if (signatureArray.length > 0) {
    signatureArray.forEach(sig => {
      let sigSrc = '';
      if (sig.signature_path) {
        const cleanSigPath = sig.signature_path.startsWith('/') ? sig.signature_path.substring(1) : sig.signature_path;
        sigSrc = sig.signature_path.startsWith('http') ? sig.signature_path : `http://localhost:5000/${cleanSigPath}`;
      }
      html += `
        <div style="text-align: center; min-width: 120px;">
          ${sigSrc ? `<img src="${sigSrc}" style="height: 50px; max-width: 140px; object-fit: contain; display: block; margin: 0 auto 5px;" />` : `<div style="height: 50px;"></div>`}
          <div style="font-size: 11px; font-weight: 700; color: #1e293b; border-top: 1px solid #cbd5e1; padding-top: 4px; display: inline-block; min-width: 100px;">${sig.label || 'Authorized Signatory'}</div>
          <div style="font-size: 9px; color: #64748b;">${companyName}</div>
        </div>
      `;
    });
  } else {
    html += `
      <div style="text-align: left; min-width: 150px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 30px;">Sincerely,</div>
        <div style="font-size: 11px; font-weight: 700; color: #1e293b; border-top: 1px solid #cbd5e1; padding-top: 4px; display: inline-block; min-width: 100px;">Authorized Signatory</div>
        <div style="font-size: 9px; color: #64748b;">${companyName}</div>
      </div>
    `;
  }
  html += `</div>`;

  if (stamp) {
    const cleanStampPath = stamp.startsWith('/') ? stamp.substring(1) : stamp;
    const stampSrc = stamp.startsWith('http') ? stamp : `http://localhost:5000/${cleanStampPath}`;
    html += `
      <div style="text-align: center; margin-left: auto; padding-right: 20px;">
        <img src="${stampSrc}" style="height: 75px; width: 75px; object-fit: contain; opacity: 0.85;" />
        <div style="font-size: 8px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-top: 2px;">Official Stamp</div>
      </div>
    `;
  }
  html += `</div>`;
  return html;
};

const generateOfferLetter = async (client, employeeDetails) => {
  const {
    first_name,
    middle_name,
    last_name,
    email,
    mobile,
    doj,
    company_id,
    branch_id,
    role_id,
    employment_type,
    department_id,
    designation_id,
    signatures,
    template
  } = employeeDetails;

  const fullName = [first_name, middle_name, last_name].filter(Boolean).join(" ");
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const dateOfJoining = doj
    ? new Date(doj).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
    : "To Be Announced";

  // Fetch Company Details
  let companyName = "the Company";
  let companyLogo = null;
  let companyEmail = "hello@reallygreatsite.com";
  let companyPhone = "123-456-7890";
  let companyAddress = "123 Anywhere St., Any City";
  let companyStamp = null;
  let companySignatures = [];
  if (company_id) {
    const res = await client.query(
      "SELECT company_name, logo, stamp, email, phone, address1, address2, city, state, pincode FROM company WHERE id = $1",
      [company_id]
    );
    if (res.rows.length > 0) {
      companyName = res.rows[0].company_name;
      companyLogo = res.rows[0].logo;
      if (companyLogo && companyLogo.startsWith("uploads/")) {
        companyLogo = `http://localhost:5000/${companyLogo}`;
      }
      companyStamp = res.rows[0].stamp;
      companySignatures = res.rows[0].signatures || [];
      companyEmail = res.rows[0].email || companyEmail;
      companyPhone = res.rows[0].phone || companyPhone;

      const addrParts = [
        res.rows[0].address1,
        res.rows[0].address2,
        res.rows[0].city,
        res.rows[0].state
      ].filter(Boolean);

      if (addrParts.length > 0) {
        companyAddress = addrParts.join(", ");
        if (res.rows[0].pincode) {
          companyAddress += ` - ${res.rows[0].pincode}`;
        }
      }
    }
  }

  // Filter personal email and generate professional corporate domain email
  const publicDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "aol.com"];
  const companyEmailDomain = companyEmail.split("@")[1]?.toLowerCase();
  if (publicDomains.includes(companyEmailDomain) || companyEmail.includes("prayoswini")) {
    const domainName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 30);
    companyEmail = `info@${domainName || "company"}.com`;
  }

  // Fetch Branch Name
  let branchName = "Corporate Office";
  if (branch_id) {
    const res = await client.query("SELECT name FROM branch WHERE id = $1", [branch_id]);
    if (res.rows.length > 0) {
      branchName = res.rows[0].name;
    }
  }

  // Fetch Role Name
  let roleName = "Employee";
  if (role_id) {
    const res = await client.query("SELECT role_name FROM roles WHERE id = $1", [role_id]);
    if (res.rows.length > 0) {
      roleName = res.rows[0].role_name;
    }
  }

  // Fetch Department Name
  let departmentName = "N/A";
  if (department_id) {
    const res = await client.query("SELECT department_name FROM departments WHERE id = $1", [department_id]);
    if (res.rows.length > 0) {
      departmentName = res.rows[0].department_name;
    }
  }

  // Fetch Designation Title
  let designationName = "N/A";
  if (designation_id) {
    const res = await client.query("SELECT title FROM designations WHERE id = $1", [designation_id]);
    if (res.rows.length > 0) {
      designationName = res.rows[0].title;
    }
  }

  // Fetch Employment Type Name
  let employmentTypeName = "Full-Time";
  if (employment_type) {
    const res = await client.query("SELECT employment_type_name FROM employment_type WHERE id = $1", [employment_type]);
    if (res.rows.length > 0) {
      employmentTypeName = res.rows[0].employment_type_name;
    }
  }

  // If Template 2 is selected
  if (String(template) === "2") {
    const genderLower = (employeeDetails.gender || "").toLowerCase();
    const prefix = genderLower === "female" ? "Ms." : genderLower === "male" ? "Mr." : "Ms./Mr.";

    let relationPrefix = "S/o";
    if (genderLower === "female") {
      relationPrefix = "D/o";
    }

    let relationLine = "";
    if (employeeDetails.emergency_contact_name) {
      relationLine = `\n    <div>${relationPrefix} ${employeeDetails.emergency_contact_name}</div>`;
    }

    const addrParts = [
      employeeDetails.present_address1,
      employeeDetails.present_address2,
      employeeDetails.present_city,
      employeeDetails.present_state,
      employeeDetails.present_pincode ? `${employeeDetails.present_pincode}` : null
    ].filter(Boolean);
    const addressHtml = addrParts.join("<br>\n    ") || companyAddress;

    const salaryVal = parseFloat(employeeDetails.salary || 0);
    const salaryFormatted = salaryVal.toLocaleString("en-IN");
    const salaryWords = salaryVal > 0 ? numberToWords(Math.round(salaryVal)) : "Zero";

    const renderTemplate2Signatures = (signatures, stamp, companyName) => {
      let signatureHtml = "";
      if (signatures && signatures.length > 0) {
        signatures.forEach(sig => {
          let sigSrc = "";
          if (sig.signature_path) {
            const cleanSigPath = sig.signature_path.startsWith('/') ? sig.signature_path.substring(1) : sig.signature_path;
            sigSrc = sig.signature_path.startsWith('http') ? sig.signature_path : `http://localhost:5000/${cleanSigPath}`;
          }
          signatureHtml += `
            <div style="margin-top: 10px; min-width: 150px; margin-right: 35px; display: inline-block; vertical-align: bottom;">
              <div style="height: 45px; margin-top: 5px;">
                ${sigSrc ? `<img src="${sigSrc}" style="height: 45px; max-width: 150px; object-fit: contain;" />` : ''}
              </div>
              <div style="font-weight: 700; font-size: 13px; color: #000000; margin-top: 5px; border-top: 1px solid #cbd5e1; padding-top: 2px;">(${sig.label || 'Authorized Signatory'})</div>
              <div style="font-size: 11px; color: #475569;">Authorized Signatory</div>
            </div>
          `;
        });
      } else {
        signatureHtml = `
          <div style="margin-top: 10px; font-size: 13px; color: #000000; display: inline-block; vertical-align: bottom;">
            <div style="height: 45px; margin-top: 5px;"></div>
            <div style="font-weight: 700; border-top: 1px solid #cbd5e1; padding-top: 2px;">(Authorized Signatory)</div>
            <div style="font-size: 11px; color: #475569;">Managing Director</div>
          </div>
        `;
      }

      let stampHtml = "";
      if (stamp) {
        const cleanStampPath = stamp.startsWith('/') ? stamp.substring(1) : stamp;
        const stampSrc = stamp.startsWith('http') ? stamp : `http://localhost:5000/${cleanStampPath}`;
        stampHtml = `
          <div style="text-align: center; margin-left: auto; align-self: flex-end; padding-right: 20px; display: inline-block;">
            <img src="${stampSrc}" style="height: 65px; width: 65px; object-fit: contain; opacity: 0.85;" />
            <div style="font-size: 8px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-top: 2px;">Official Stamp</div>
          </div>
        `;
      }

      return `
        <div style="margin-top: 25px; width: 100%;">
          <div style="font-size: 13px; color: #000000;">For <strong>${companyName}</strong></div>
          <div style="display: flex; align-items: flex-end; justify-content: flex-start; flex-wrap: wrap;">
            ${signatureHtml}
            ${stampHtml}
          </div>
        </div>
      `;
    };

    const formattedDoj = doj
      ? new Date(doj).toLocaleDateString("en-GB").replace(/\//g, ".")
      : "To Be Announced";

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  body {
    font-family: 'Inter', sans-serif;
    color: #000000;
    line-height: 1.5;
    padding: 0;
    margin: 0;
    background-color: #f1f5f9;
  }
  .container {
    width: 800px;
    height: 1120px;
    margin: 0 auto;
    background: #ffffff;
    padding: 40px 50px 30px 50px;
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
  }
  @media screen and (max-width: 820px) {
    body {
      zoom: 0.8;
      background-color: #ffffff;
    }
    .container {
      margin: 0 auto;
      box-shadow: none;
      padding: 30px 40px;
    }
  }
  @media screen and (max-width: 650px) {
    body {
      zoom: 0.65;
    }
  }
  @media screen and (max-width: 500px) {
    body {
      zoom: 0.5;
    }
  }
  @media print {
    body {
      background-color: #ffffff;
      padding: 0;
    }
    .container {
      margin: 0;
      box-shadow: none;
      width: 100%;
      height: 1120px;
      padding: 40px 50px 30px 50px;
      overflow: hidden;
    }
  }
</style>
</head>
<body>
<div class="container">
  <div style="font-size: 13px; line-height: 1.4; color: #000000; margin-bottom: 15px;">
    <strong>To</strong><br>
    <strong>${prefix} ${fullName}</strong>${relationLine}<br>
    ${addressHtml}
  </div>

  <div style="font-weight: 700; font-size: 13.5px; margin-bottom: 12px;">
    Sub: Offer Letter
  </div>

  <div style="font-size: 12.5px; line-height: 1.5; text-align: justify; margin-bottom: 10px;">
    We are pleased to offer you appointment with our company <strong>${companyName}</strong> as <strong>${designationName !== "N/A" ? designationName : roleName}</strong>.
  </div>

  <div style="font-size: 12.5px; line-height: 1.5; margin-bottom: 10px;">
    This offer letter is issued after your interview on the terms and conditions detailed as follows: -
  </div>

  <table style="margin: 10px 0 10px 30px; border-collapse: collapse; font-size: 12.5px; line-height: 1.5; color: #000000; width: auto;">
    <tr>
      <td style="font-weight: 700; width: 220px; padding: 2px 0; vertical-align: top;">Date of Joining</td>
      <td style="padding: 2px 10px; vertical-align: top;">:</td>
      <td style="font-weight: 700; padding: 2px 0; vertical-align: top;">${formattedDoj}</td>
    </tr>
    <tr>
      <td style="font-weight: 700; padding: 2px 0; vertical-align: top;">Location</td>
      <td style="padding: 2px 10px; vertical-align: top;">:</td>
      <td style="padding: 2px 0; vertical-align: top;"><strong>${companyName}</strong><br>${branchName}</td>
    </tr>
    <tr>
      <td style="font-weight: 700; padding: 2px 0; vertical-align: top;">Department</td>
      <td style="padding: 2px 10px; vertical-align: top;">:</td>
      <td style="padding: 2px 0; vertical-align: top;"><strong>${departmentName !== "N/A" ? departmentName : "assigned"}</strong></td>
    </tr>
    <tr>
      <td style="font-weight: 700; padding: 2px 0; vertical-align: top;">Salary Per Month (in hand)</td>
      <td style="padding: 2px 10px; vertical-align: top;">:</td>
      <td style="font-weight: 700; padding: 2px 0; vertical-align: top;">Rs.${salaryFormatted}/- <span style="font-weight: normal; color: #374151;">(Rupees ${salaryWords})</span></td>
    </tr>
  </table>

  <div style="font-weight: 700; text-decoration: underline; margin-top: 15px; margin-bottom: 8px; font-size: 13px;">Terms of the Job Offer:-</div>
  <ol style="padding-left: 20px; margin: 0; font-size: 12.5px; line-height: 1.4; color: #000000;">
    <li style="margin-bottom: 6px; text-align: justify;">You will be under probation for <strong>3 months</strong> from the date of joining. No leaves are allowed during the probation period.</li>
    <li style="margin-bottom: 6px; text-align: justify;">After successful completion of your probation period, your name will be entered in statutory records pertaining to your employment in the organization, making you eligible for P.F., ESIC and other social security schemes as mandated by the Government of India.</li>
    <li style="margin-bottom: 6px; text-align: justify;">Detailed service rules and regulation including conduct, discipline and up-to-date administrative orders shall be provided to you along with the appointment letter.</li>
    <li style="margin-bottom: 6px; text-align: justify;">You have to be present yourself on the joining date with all originals and self-attested 1 (one) photocopy set of academic credentials (Matriculation to Professional Qualifications), PAN, Aadhar Card.</li>
    <li style="margin-bottom: 6px; text-align: justify;">You are required to give a minimum notice of one month or one month’s salary, in case you wish to leave the organization any time during the tenure of your employment.</li>
  </ol>

  <div style="font-size: 12.5px; line-height: 1.4; text-align: justify; margin-top: 12px; margin-bottom: 8px;">
    You will be covered by the service rules and regulations including conduct, discipline and administrative orders and any such other rules or orders of the company that may come in force from time to time. Please sign one copy of this letter and return it to our office to formalize your acceptance of this offer.
  </div>

  <div style="font-size: 12.5px; line-height: 1.4; margin-bottom: 15px;">
    I look forward to have a mutually rewarding working relationship.
  </div>

  ${renderTemplate2Signatures(signatures, companyStamp, companyName)}
</div>
</body>
</html>`;
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  body {
    font-family: 'Inter', sans-serif;
    color: #334155;
    line-height: 1.5;
    padding: 0;
    margin: 0;
    background-color: #f1f5f9;
  }
  .container {
    width: 800px;
    height: 1120px;
    margin: 0 auto;
    background: #ffffff;
    border-top: 8px solid #1e3b8b;
    padding: 60px 60px 40px 60px;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
  }
  .content-wrapper {
    position: relative;
    z-index: 10;
  }
  
  /* Decorative SVGs */
  .top-right-decor {
    position: absolute;
    top: 0;
    right: 0;
    width: 240px;
    height: auto;
    pointer-events: none;
    z-index: 1;
  }
  .bottom-decor {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    pointer-events: none;
    z-index: 1;
  }
  
  /* Header Section */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    position: relative;
    z-index: 10;
  }
  .logo-container {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .header-logo-svg {
    width: 44px;
    height: 44px;
  }
  .company-logo-img {
    height: 44px;
    width: auto;
    max-width: 120px;
    object-fit: contain;
  }
  .company-info-text {
    display: flex;
    flex-direction: column;
  }
  .logo-name {
    font-size: 18px;
    font-weight: 800;
    color: #1e3b8b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.1;
    white-space: nowrap;
  }
  .logo-tagline {
    font-size: 11px;
    color: #64748b;
    font-weight: 500;
    margin-top: 2px;
  }
  .contact-info {
    text-align: right;
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
  }
  
  .header-line {
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #1d4ed8 0%, #60a5fa 100%);
    margin-top: 15px;
    margin-bottom: 25px;
    border: none;
  }
  
  /* Document Title */
  .document-title {
    text-align: center;
    font-size: 24px;
    font-weight: 800;
    color: #1e3b8b;
    letter-spacing: 1.5px;
    margin-bottom: 25px;
    text-transform: uppercase;
  }
  
  /* Recipient & Date Section */
  .meta-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 25px;
  }
  .recipient-info {
    font-size: 13.5px;
    color: #334155;
    line-height: 1.4;
  }
  .meta-label {
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }
  .recipient-name {
    font-weight: 600;
    color: #0f172a;
  }
  .recipient-address {
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
  }
  .date-info {
    font-size: 13.5px;
    color: #475569;
    font-weight: 500;
  }
  
  /* Letter Content */
  .salutation {
    font-weight: 700;
    color: #0f172a;
    font-size: 14.5px;
    margin-bottom: 12px;
  }
  .body-text {
    font-size: 13.5px;
    color: #334155;
    text-align: justify;
    margin-bottom: 18px;
    line-height: 1.6;
  }
  
  /* Details List */
  .details-section {
    margin: 20px 0;
  }
  .details-title {
    font-weight: 700;
    color: #0f172a;
    font-size: 14px;
    margin-bottom: 8px;
  }
  .details-list {
    list-style-type: disc;
    padding-left: 20px;
    margin: 0;
  }
  .details-list li {
    font-size: 13.5px;
    color: #334155;
    margin-bottom: 6px;
  }
  
  /* Closing Signatures */
  .closing-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 35px;
  }
  .signature-block {
    text-align: left;
    width: 200px;
  }
  .sig-title {
    font-size: 13.5px;
    color: #0f172a;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .sig-placeholder {
    height: 40px;
    display: flex;
    align-items: center;
    margin-bottom: 4px;
  }
  .sig-svg {
    width: 80px;
    height: auto;
    opacity: 0.8;
  }
  .sig-name {
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .sig-company {
    font-size: 11px;
    color: #64748b;
    margin-top: 1px;
  }

  @media screen and (max-width: 820px) {
    body {
      zoom: 0.8;
      background-color: #ffffff;
    }
    .page, .container {
      margin: 0 auto;
      box-shadow: none;
      border-top: none;
    }
  }
  @media screen and (max-width: 650px) {
    body {
      zoom: 0.65;
    }
  }
  @media screen and (max-width: 500px) {
    body {
      zoom: 0.5;
    }
  }

  @media print {
    body {
      background-color: #ffffff;
      padding: 0;
    }
    .container {
      margin: 0;
      box-shadow: none;
      border: none;
      padding: 40px 50px 60px 50px;
      width: 100%;
      min-height: auto;
    }
  }
</style>
</head>
<body>
<div class="container">
  <!-- Top decorative wave pattern -->
  <svg class="top-right-decor" viewBox="0 0 250 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 0 C 100 80, 180 50, 250 110 L 250 0 Z" fill="#60a5fa" opacity="0.3"/>
    <path d="M50 0 C 120 90, 190 40, 250 130 L 250 0 Z" fill="#2563eb" opacity="0.75"/>
    <path d="M110 0 C 160 70, 200 30, 250 100 L 250 0 Z" fill="#1d4ed8"/>
  </svg>

  <div class="content-wrapper">
    <div class="header">
      <div class="logo-container">
        ${companyLogo
      ? `<img src="${companyLogo}" alt="Company Logo" class="company-logo-img" />`
      : `<svg class="header-logo-svg" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 36H36" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M8 36V16C8 14.8954 8.89543 14 10 14H18V36" stroke="#1d4ed8" stroke-width="2.5" stroke-linejoin="round"/>
              <path d="M18 36V6C18 4.89543 18.8954 4 20 4H28C29.1046 4 30 4.89543 30 6V36" stroke="#1d4ed8" stroke-width="2.5" stroke-linejoin="round"/>
              <path d="M12 20H14" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 26H14" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round"/>
              <path d="M22 10H26" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round"/>
              <path d="M22 16H26" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round"/>
              <path d="M22 22H26" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round"/>
              <path d="M22 28H26" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round"/>
            </svg>`
    }
        <div class="company-info-text">
          ${(companyName.toLowerCase().includes("technova") && companyLogo) ? '' : `<div class="logo-name">${companyName}</div>`}
          <div class="logo-tagline">www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com</div>
        </div>
      </div>
      <div class="contact-info">
        ${companyPhone}<br>
        ${companyEmail}<br>
        ${companyAddress}
      </div>
    </div>
    
    <div class="header-line"></div>
    
    <div class="document-title"> OFFER LETTER</div>
    
    <div class="meta-section">
      <div class="recipient-info">
        <div class="meta-label">To:</div>
        <div class="recipient-name">${fullName}</div>
        <div class="recipient-address">Email: ${email}<br>Mobile: ${mobile || "N/A"}</div>
      </div>
      <div class="date-info">
        ${currentDate}
      </div>
    </div>
    
    <p class="salutation">Dear ${first_name},</p>
    
    <p class="body-text">On behalf of <strong>${companyName}</strong>, we are pleased to offer you employment as a <strong>${designationName !== "N/A" ? designationName : roleName}</strong> in our <strong>${departmentName !== "N/A" ? departmentName : "assigned"}</strong> department at our <strong>${branchName}</strong> branch. We believe your skills and experience will be a valuable addition to our team.</p>
    
    <div class="details-section">
      <div class="details-title">Details of the Offer:</div>
      <ul class="details-list">
        <li><strong>Position / Designation:</strong> ${designationName}</li>
        <li><strong>Department:</strong> ${departmentName}</li>
        <li><strong>Work Location (Branch):</strong> ${branchName}</li>
        <li><strong>Employment Type:</strong> ${employmentTypeName}</li>
        <li><strong>Start Date (Date of Joining):</strong> ${dateOfJoining}</li>
      </ul>
    </div>
    
    <p class="body-text">We look forward to your contribution and growth with us. Please confirm your acceptance of this offer by returning a signed copy of this letter on or before your date of joining.</p>
    
    ${renderSignaturesAndStamp(signatures, companyStamp, companyName)}
  </div>

  <!-- Bottom decorative wave pattern -->
  <svg class="bottom-decor" viewBox="0 0 800 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 160 C 200 100, 400 120, 800 160" stroke="#93c5fd" stroke-width="1" opacity="0.3"/>
    <path d="M0 160 C 180 80, 420 100, 800 160" stroke="#60a5fa" stroke-width="1" opacity="0.3"/>
    
    <path d="M400 160 C 550 110, 680 130, 800 80 L 800 160 Z" fill="#60a5fa" opacity="0.25"/>
    <path d="M480 160 C 600 90, 700 110, 800 50 L 800 160 Z" fill="#2563eb" opacity="0.75"/>
    <path d="M560 160 C 660 70, 730 90, 800 30 L 800 160 Z" fill="#1d4ed8"/>
    
    <path d="M0 120 C 100 130, 200 110, 300 160 L 0 160 Z" fill="#1e3b8b" opacity="0.8"/>
    <path d="M0 135 C 80 140, 160 130, 240 160 L 0 160 Z" fill="#3b82f6"/>
  </svg>
</div>
</body>
</html>`;

  // const base64Html = Buffer.from(htmlContent).toString("base64");
  // return `data:text/html;base64,${base64Html}`;

  return htmlContent;
};

// =================================
// GENERATE EXPERIENCE LETTER
// =================================
const generateExperienceLetter = async (client, employeeDetails) => {
  const {
    first_name,
    middle_name,
    last_name,
    email,
    mobile,
    doj,
    doe,
    company_id,
    branch_id,
    role_id,
    employment_type,
    department_id,
    designation_id,
    current_experience,
    total_experience,
    signatures
  } = employeeDetails;

  const fullName = [first_name, middle_name, last_name].filter(Boolean).join(" ");
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const dateOfJoining = doj
    ? new Date(doj).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  const dateOfExit = doe
    ? new Date(doe).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Calculate experience duration
  let experienceStr = "";
  if (doj) {
    const start = new Date(doj);
    const end = doe ? new Date(doe) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years > 0 && remMonths > 0) experienceStr = `${years} year${years > 1 ? "s" : ""} and ${remMonths} month${remMonths > 1 ? "s" : ""}`;
    else if (years > 0) experienceStr = `${years} year${years > 1 ? "s" : ""}`;
    else experienceStr = `${remMonths} month${remMonths > 1 ? "s" : ""}`;
  } else if (current_experience) {
    experienceStr = `${current_experience} year${current_experience > 1 ? "s" : ""}`;
  } else {
    experienceStr = "the duration of employment";
  }

  // Generate document ref number
  const refNumber = `EXP/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`;

  // Fetch Company Details
  let companyName = "the Company";
  let companyLogo = null;
  let companyEmail = "info@company.com";
  let companyPhone = "N/A";
  let companyAddress = "Corporate Headquarters";
  let companyStamp = null;
  let companySignatures = [];
  if (company_id) {
    const res = await client.query(
      "SELECT company_name, logo, stamp, email, phone, address1, address2, city, state, pincode FROM company WHERE id = $1",
      [company_id]
    );
    if (res.rows.length > 0) {
      companyName = res.rows[0].company_name;
      companyLogo = res.rows[0].logo;
      if (companyLogo && companyLogo.startsWith("uploads/")) {
        companyLogo = `http://localhost:5000/${companyLogo}`;
      }
      companyStamp = res.rows[0].stamp;
      companySignatures = res.rows[0].signatures || [];
      companyEmail = res.rows[0].email || companyEmail;
      companyPhone = res.rows[0].phone || companyPhone;
      const addrParts = [res.rows[0].address1, res.rows[0].address2, res.rows[0].city, res.rows[0].state].filter(Boolean);
      if (addrParts.length > 0) {
        companyAddress = addrParts.join(", ");
        if (res.rows[0].pincode) companyAddress += ` - ${res.rows[0].pincode}`;
      }
    }
  }

  const publicDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "aol.com"];
  const companyEmailDomain = companyEmail.split("@")[1]?.toLowerCase();
  if (publicDomains.includes(companyEmailDomain)) {
    const domainName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 30);
    companyEmail = `info@${domainName || "company"}.com`;
  }

  let departmentName = "N/A";
  if (department_id) {
    const res = await client.query("SELECT department_name FROM departments WHERE id = $1", [department_id]);
    if (res.rows.length > 0) departmentName = res.rows[0].department_name;
  }

  let designationName = "N/A";
  if (designation_id) {
    const res = await client.query("SELECT title FROM designations WHERE id = $1", [designation_id]);
    if (res.rows.length > 0) designationName = res.rows[0].title;
  }

  let roleName = "Employee";
  if (role_id) {
    const res = await client.query("SELECT role_name FROM roles WHERE id = $1", [role_id]);
    if (res.rows.length > 0) roleName = res.rows[0].role_name;
  }

  const finalDesignation = designationName !== "N/A" ? designationName : roleName;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', sans-serif;
    background: #f0faf8;
    color: #1a2e2a;
  }
  .page {
    width: 800px;
    height: 1120px;
    margin: 0 auto;
    background: #ffffff;
    position: relative;
    overflow: hidden;
  }
  /* === TOP HEADER BAND === */
  .header-band {
    background: linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%);
    padding: 32px 48px 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
  }
  .header-band::after {
    content: '';
    position: absolute;
    top: -40px;
    right: -40px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: rgba(255,255,255,0.07);
  }
  .header-band::before {
    content: '';
    position: absolute;
    bottom: -30px;
    left: 120px;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: rgba(255,255,255,0.05);
  }
  .logo-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    z-index: 2;
  }
  .company-logo-img {
    height: 48px;
    width: auto;
    max-width: 130px;
    object-fit: contain;
    background: rgba(255,255,255,0.15);
    border-radius: 8px;
    padding: 4px;
  }
  .logo-text .company-name {
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: 0.5px;
    line-height: 1.1;
  }
  .logo-text .company-tagline {
    font-size: 10px;
    color: rgba(255,255,255,0.7);
    font-weight: 500;
    margin-top: 3px;
    letter-spacing: 0.3px;
  }
  .header-contact {
    text-align: right;
    font-size: 10px;
    color: rgba(255,255,255,0.8);
    line-height: 1.7;
    position: relative;
    z-index: 2;
  }
  /* === DOCUMENT TYPE STRIPE === */
  .doc-type-stripe {
    background: #f0fdf4;
    border-bottom: 2px solid #d1fae5;
    padding: 14px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .doc-label {
    font-size: 11px;
    font-weight: 700;
    color: #065f46;
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }
  .doc-ref {
    font-size: 10px;
    color: #6b7280;
    font-weight: 600;
  }
  /* === BODY === */
  .body-wrap {
    padding: 32px 48px 24px;
  }
  .date-line {
    font-size: 12px;
    color: #4b5563;
    font-weight: 500;
    margin-bottom: 22px;
  }
  .to-block {
    margin-bottom: 20px;
  }
  .to-block .to-label {
    font-size: 10px;
    font-weight: 700;
    color: #9ca3af;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .to-block .to-name {
    font-size: 16px;
    font-weight: 800;
    color: #0f766e;
  }
  .to-block .to-meta {
    font-size: 11px;
    color: #6b7280;
    margin-top: 2px;
  }
  /* === SUBJECT LINE === */
  .subject-line {
    background: linear-gradient(90deg, #0f766e 0%, transparent 100%);
    height: 3px;
    border-radius: 2px;
    margin-bottom: 18px;
  }
  .subject-text {
    font-size: 13px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 20px;
  }
  .subject-text span {
    color: #0f766e;
    font-weight: 800;
  }
  /* === BODY TEXT === */
  .body-para {
    font-size: 12.5px;
    color: #374151;
    line-height: 1.75;
    margin-bottom: 16px;
    text-align: justify;
  }
  /* === DETAIL TABLE === */
  .detail-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #d1fae5;
  }
  .detail-table thead tr {
    background: linear-gradient(90deg, #0f766e, #0d9488);
  }
  .detail-table thead th {
    padding: 10px 16px;
    font-size: 10px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-align: left;
  }
  .detail-table tbody tr:nth-child(odd) {
    background: #f0fdf4;
  }
  .detail-table tbody tr:nth-child(even) {
    background: #ffffff;
  }
  .detail-table tbody td {
    padding: 9px 16px;
    font-size: 11.5px;
    color: #374151;
    border-bottom: 1px solid #d1fae5;
  }
  .detail-table tbody td:first-child {
    font-weight: 700;
    color: #065f46;
    width: 45%;
  }
  /* === EXPERIENCE BADGE === */
  .exp-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #0f766e, #0d9488);
    color: #ffffff;
    padding: 8px 18px;
    border-radius: 30px;
    font-size: 12px;
    font-weight: 700;
    margin: 10px 0 16px;
    box-shadow: 0 4px 12px rgba(15,118,110,0.3);
  }
  /* === SIGNATURE === */
  .sig-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 28px;
  }
  .sig-block {
    text-align: left;
  }
  .sig-svg-wrap {
    height: 36px;
    margin-bottom: 6px;
  }
  .sig-name {
    font-size: 13px;
    font-weight: 800;
    color: #111827;
  }
  .sig-title {
    font-size: 10px;
    color: #6b7280;
    font-weight: 600;
    margin-top: 2px;
  }
  /* === SEAL === */
  .seal-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .seal-text {
    font-size: 9px;
    color: #9ca3af;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  /* === FOOTER === */
  .footer-band {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #0f766e, #0d9488);
    padding: 12px 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-text {
    font-size: 9.5px;
    color: rgba(255,255,255,0.85);
    font-weight: 500;
  }
  .footer-divider {
    color: rgba(255,255,255,0.4);
    font-size: 9px;
  }
  @media screen and (max-width: 820px) {
    body {
      zoom: 0.8;
      background-color: #ffffff;
    }
    .page, .container {
      margin: 0 auto;
      box-shadow: none;
      border-top: none;
    }
  }
  @media screen and (max-width: 650px) {
    body {
      zoom: 0.65;
    }
  }
  @media screen and (max-width: 500px) {
    body {
      zoom: 0.5;
    }
  }

  @media print {
    body { background: #ffffff; }
    .page { margin: 0; box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header Band -->
  <div class="header-band">
    <div class="logo-wrap">
      ${companyLogo
      ? `<img src="${companyLogo}" alt="Logo" class="company-logo-img" />`
      : `<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="44" height="44" rx="10" fill="rgba(255,255,255,0.15)"/>
            <path d="M8 36H36" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M12 36V18C12 16.9 12.9 16 14 16H20V36" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M20 36V8C20 6.9 20.9 6 22 6H28C29.1 6 30 6.9 30 8V36" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
          </svg>`
    }
      <div class="logo-text">
        <div class="company-name">${companyName}</div>
        <div class="company-tagline">${companyAddress}</div>
      </div>
    </div>
    <div class="header-contact">
      ${companyPhone}<br/>
      ${companyEmail}
    </div>
  </div>

  <!-- Doc Type Stripe -->
  <div class="doc-type-stripe">
    <div class="doc-label">Experience Certificate</div>
    <div class="doc-ref">Ref: ${refNumber} &nbsp;|&nbsp; Date: ${currentDate}</div>
  </div>

  <!-- Body -->
  <div class="body-wrap">

    <div class="to-block">
      <div class="to-label">Issued To</div>
      <div class="to-name">${fullName}</div>
      <div class="to-meta">${email}${mobile ? "  ·  " + mobile : ""}</div>
    </div>

    <div class="subject-line"></div>

    <div class="subject-text">Subject: <span>Experience Certificate — ${fullName}</span></div>

    <p class="body-para">This is to certify that <strong>${fullName}</strong> was employed with <strong>${companyName}</strong> as a <strong>${finalDesignation}</strong> in the <strong>${departmentName !== "N/A" ? departmentName : "respective"}</strong> department.</p>

    <div class="exp-badge">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="white"/></svg>
      Total Service Duration: ${experienceStr}
    </div>

    <!-- Detail Table -->
    <table class="detail-table">
      <thead>
        <tr><th>Field</th><th>Details</th></tr>
      </thead>
      <tbody>
        <tr><td>Employee Name</td><td>${fullName}</td></tr>
        <tr><td>Designation</td><td>${finalDesignation}</td></tr>
        <tr><td>Department</td><td>${departmentName}</td></tr>
        <tr><td>Date of Joining</td><td>${dateOfJoining}</td></tr>
        <tr><td>Last Working Day</td><td>${dateOfExit}</td></tr>
        <tr><td>Employment Duration</td><td>${experienceStr}</td></tr>
      </tbody>
    </table>

    <p class="body-para">During the tenure, <strong>${first_name}</strong> demonstrated exceptional dedication, professionalism, and a strong commitment to excellence. We sincerely appreciate their valuable contributions to the organization and wish them continued success in all future endeavours.</p>

    <p class="body-para">This certificate is issued upon request and for the purpose stated therein, without any liability on the part of the issuing organization.</p>

    <!-- Signature Section -->
    ${renderSignaturesAndStamp(signatures, companyStamp, companyName)}
  </div>

  <!-- Footer -->
  <div class="footer-band">
    <div class="footer-text">${companyName} &nbsp;·&nbsp; ${companyAddress}</div>
    <div class="footer-divider">|</div>
    <div class="footer-text">${companyEmail} &nbsp;·&nbsp; ${companyPhone}</div>
  </div>

</div>
</body>
</html>`;

  // const base64Html = Buffer.from(htmlContent).toString("base64");
  // return `data:text/html;base64,${base64Html}`;

  return htmlContent;
};

// =================================
// GENERATE RELIEVING LETTER
// =================================
const generateRelievingLetter = async (client, employeeDetails) => {
  const {
    first_name,
    middle_name,
    last_name,
    email,
    mobile,
    doj,
    doe,
    company_id,
    branch_id,
    role_id,
    employment_type,
    department_id,
    designation_id,
    signatures
  } = employeeDetails;

  const fullName = [first_name, middle_name, last_name].filter(Boolean).join(" ");
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const dateOfJoining = doj
    ? new Date(doj).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  const lastWorkingDay = doe
    ? new Date(doe).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Calculate tenure
  let tenureStr = "";
  if (doj) {
    const start = new Date(doj);
    const end = doe ? new Date(doe) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years > 0 && remMonths > 0) tenureStr = `${years} year${years > 1 ? "s" : ""} and ${remMonths} month${remMonths > 1 ? "s" : ""}`;
    else if (years > 0) tenureStr = `${years} year${years > 1 ? "s" : ""}`;
    else tenureStr = `${remMonths} month${remMonths > 1 ? "s" : ""}`;
  } else {
    tenureStr = "the period of employment";
  }

  const refNumber = `REL/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`;

  // Fetch Company Details
  let companyName = "the Company";
  let companyLogo = null;
  let companyEmail = "info@company.com";
  let companyPhone = "N/A";
  let companyAddress = "Corporate Headquarters";
  let companyStamp = null;
  let companySignatures = [];
  if (company_id) {
    const res = await client.query(
      "SELECT company_name, logo, stamp, email, phone, address1, address2, city, state, pincode FROM company WHERE id = $1",
      [company_id]
    );
    if (res.rows.length > 0) {
      companyName = res.rows[0].company_name;
      companyLogo = res.rows[0].logo;
      if (companyLogo && companyLogo.startsWith("uploads/")) {
        companyLogo = `http://localhost:5000/${companyLogo}`;
      }
      companyStamp = res.rows[0].stamp;
      companySignatures = res.rows[0].signatures || [];
      companyEmail = res.rows[0].email || companyEmail;
      companyPhone = res.rows[0].phone || companyPhone;
      const addrParts = [res.rows[0].address1, res.rows[0].address2, res.rows[0].city, res.rows[0].state].filter(Boolean);
      if (addrParts.length > 0) {
        companyAddress = addrParts.join(", ");
        if (res.rows[0].pincode) companyAddress += ` - ${res.rows[0].pincode}`;
      }
    }
  }

  const publicDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "aol.com"];
  const companyEmailDomain = companyEmail.split("@")[1]?.toLowerCase();
  if (publicDomains.includes(companyEmailDomain)) {
    const domainName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 30);
    companyEmail = `info@${domainName || "company"}.com`;
  }

  let departmentName = "N/A";
  if (department_id) {
    const res = await client.query("SELECT department_name FROM departments WHERE id = $1", [department_id]);
    if (res.rows.length > 0) departmentName = res.rows[0].department_name;
  }

  let designationName = "N/A";
  if (designation_id) {
    const res = await client.query("SELECT title FROM designations WHERE id = $1", [designation_id]);
    if (res.rows.length > 0) designationName = res.rows[0].title;
  }

  let roleName = "Employee";
  if (role_id) {
    const res = await client.query("SELECT role_name FROM roles WHERE id = $1", [role_id]);
    if (res.rows.length > 0) roleName = res.rows[0].role_name;
  }

  let branchName = "Corporate Office";
  if (branch_id) {
    const res = await client.query("SELECT name FROM branch WHERE id = $1", [branch_id]);
    if (res.rows.length > 0) branchName = res.rows[0].name;
  }

  const finalDesignation = designationName !== "N/A" ? designationName : roleName;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', sans-serif;
    background: #f8f6f0;
    color: #1a1a2e;
  }
  .page {
    width: 800px;
    height: 1120px;
    margin: 0 auto;
    background: #ffffff;
    position: relative;
    overflow: hidden;
  }
  /* Gold top accent */
  .gold-top {
    height: 5px;
    background: linear-gradient(90deg, #c9a227 0%, #f5d06e 50%, #c9a227 100%);
  }
  /* === HEADER === */
  .header-area {
    background: #1e3a5f;
    padding: 28px 48px 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
  }
  .header-area::after {
    content: '';
    position: absolute;
    right: -60px;
    top: -60px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: rgba(201,162,39,0.08);
  }
  .header-area::before {
    content: '';
    position: absolute;
    left: 200px;
    bottom: -50px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: rgba(255,255,255,0.03);
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 14px;
    z-index: 2;
  }
  .logo-img {
    height: 46px;
    width: auto;
    max-width: 130px;
    object-fit: contain;
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 4px;
  }
  .company-name-text {
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: 0.5px;
  }
  .company-sub {
    font-size: 10px;
    color: rgba(255,255,255,0.6);
    margin-top: 3px;
  }
  .header-right {
    text-align: right;
    font-size: 10.5px;
    color: rgba(255,255,255,0.75);
    line-height: 1.7;
    z-index: 2;
  }
  /* Gold divider */
  .gold-divider {
    height: 3px;
    background: linear-gradient(90deg, #c9a227, #f5d06e, #c9a227);
  }
  /* === TITLE BLOCK === */
  .title-block {
    text-align: center;
    padding: 22px 48px 14px;
    border-bottom: 1px solid #e5e7eb;
    position: relative;
  }
  .title-block .doc-heading {
    font-size: 22px;
    font-weight: 800;
    color: #1e3a5f;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .title-block .ref-row {
    font-size: 10px;
    color: #9ca3af;
    font-weight: 600;
    margin-top: 5px;
    letter-spacing: 1px;
  }
  /* Corner badge */
  .corner-badge {
    position: absolute;
    top: 12px;
    right: 48px;
    background: linear-gradient(135deg, #c9a227, #f5d06e);
    color: #7a5800;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 30px;
    box-shadow: 0 2px 8px rgba(201,162,39,0.35);
  }
  /* === BODY === */
  .body-area {
    padding: 24px 48px 16px;
  }
  .date-ref {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 20px;
    font-weight: 500;
  }
  .to-section {
    margin-bottom: 20px;
  }
  .to-section .to-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 4px;
  }
  .to-section .emp-name {
    font-size: 17px;
    font-weight: 800;
    color: #1e3a5f;
  }
  .to-section .emp-meta {
    font-size: 11px;
    color: #6b7280;
    margin-top: 2px;
  }
  /* Gold subject underline */
  .subject-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .subject-bar .bar-line {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, #c9a227, transparent);
  }
  .subject-bar .sub-text {
    font-size: 11.5px;
    font-weight: 700;
    color: #1e3a5f;
    white-space: nowrap;
  }
  /* Body paragraphs */
  .body-para {
    font-size: 12.5px;
    color: #374151;
    line-height: 1.8;
    margin-bottom: 15px;
    text-align: justify;
  }
  /* === DETAIL BOX === */
  .detail-box {
    border: 1.5px solid #c9a227;
    border-radius: 12px;
    overflow: hidden;
    margin: 18px 0;
  }
  .detail-box-header {
    background: linear-gradient(90deg, #1e3a5f, #2a4f7c);
    padding: 10px 18px;
    font-size: 10px;
    font-weight: 700;
    color: #f5d06e;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }
  .detail-cell {
    padding: 10px 18px;
    border-bottom: 1px solid #e9e2cc;
    border-right: 1px solid #e9e2cc;
  }
  .detail-cell:nth-child(even) {
    border-right: none;
  }
  .detail-cell:last-child, .detail-cell:nth-last-child(2) {
    border-bottom: none;
  }
  .cell-label {
    font-size: 9.5px;
    font-weight: 700;
    color: #9ca3af;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .cell-value {
    font-size: 12px;
    font-weight: 700;
    color: #1e3a5f;
  }
  .cell-value.highlight {
    color: #c9a227;
    font-size: 13px;
  }
  /* Relieving callout */
  .relieving-callout {
    background: linear-gradient(135deg, #1e3a5f 0%, #2a4f7c 100%);
    border-left: 4px solid #c9a227;
    border-radius: 0 10px 10px 0;
    padding: 14px 20px;
    margin: 16px 0;
  }
  .relieving-callout p {
    font-size: 12px;
    color: rgba(255,255,255,0.9);
    line-height: 1.7;
    font-style: italic;
  }
  .relieving-callout strong {
    color: #f5d06e;
  }
  /* Signature section */
  .sig-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 24px;
  }
  .sig-name {
    font-size: 13px;
    font-weight: 800;
    color: #1e3a5f;
  }
  .sig-sub {
    font-size: 10px;
    color: #9ca3af;
    font-weight: 600;
    margin-top: 2px;
  }
  /* Footer */
  .footer-area {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }
  .footer-gold {
    height: 3px;
    background: linear-gradient(90deg, #c9a227, #f5d06e, #c9a227);
  }
  .footer-navy {
    background: #1e3a5f;
    padding: 10px 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-txt {
    font-size: 9.5px;
    color: rgba(255,255,255,0.75);
    font-weight: 500;
  }
  @media screen and (max-width: 820px) {
    body {
      zoom: 0.8;
      background-color: #ffffff;
    }
    .page, .container {
      margin: 0 auto;
      box-shadow: none;
      border-top: none;
    }
  }
  @media screen and (max-width: 650px) {
    body {
      zoom: 0.65;
    }
  }
  @media screen and (max-width: 500px) {
    body {
      zoom: 0.5;
    }
  }

  @media print {
    body { background: #ffffff; }
    .page { margin: 0; box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Gold top line -->
  <div class="gold-top"></div>

  <!-- Header -->
  <div class="header-area">
    <div class="logo-area">
      ${companyLogo
      ? `<img src="${companyLogo}" alt="Logo" class="logo-img" />`
      : `<svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="10" fill="rgba(201,162,39,0.15)"/>
            <path d="M8 36H36" stroke="#c9a227" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M12 36V18C12 16.9 12.9 16 14 16H20V36" stroke="#c9a227" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M20 36V8C20 6.9 20.9 6 22 6H28C29.1 6 30 6.9 30 8V36" stroke="#c9a227" stroke-width="2.5" stroke-linejoin="round"/>
          </svg>`
    }
      <div>
        <div class="company-name-text">${companyName}</div>
        <div class="company-sub">${companyAddress}</div>
      </div>
    </div>
    <div class="header-right">
      ${companyPhone}<br/>${companyEmail}
    </div>
  </div>

  <!-- Gold divider -->
  <div class="gold-divider"></div>

  <!-- Title Block -->
  <div class="title-block">
    <div class="corner-badge">Official</div>
    <div class="doc-heading">Relieving Letter</div>
    <div class="ref-row">Ref: ${refNumber} &nbsp;·&nbsp; Issued: ${currentDate}</div>
  </div>

  <!-- Body -->
  <div class="body-area">

    <div class="date-ref">Date: ${currentDate}</div>

    <div class="to-section">
      <div class="to-label">Addressed To</div>
      <div class="emp-name">${fullName}</div>
      <div class="emp-meta">${email}${mobile ? "  ·  " + mobile : ""}</div>
    </div>

    <div class="subject-bar">
      <div class="bar-line"></div>
      <div class="sub-text">Subject: Relieving Letter — ${fullName}</div>
      <div class="bar-line" style="background: linear-gradient(90deg, transparent, #c9a227);"></div>
    </div>

    <p class="body-para">Dear <strong>${first_name}</strong>,</p>

    <p class="body-para">This is to formally confirm that <strong>${fullName}</strong> has been relieved from the services of <strong>${companyName}</strong> with effect from <strong>${lastWorkingDay}</strong>, upon the acceptance of their resignation.</p>

    <!-- Detail Box -->
    <div class="detail-box">
      <div class="detail-box-header">Employment Details</div>
      <div class="detail-grid">
        <div class="detail-cell">
          <div class="cell-label">Employee Name</div>
          <div class="cell-value">${fullName}</div>
        </div>
        <div class="detail-cell">
          <div class="cell-label">Designation</div>
          <div class="cell-value">${finalDesignation}</div>
        </div>
        <div class="detail-cell">
          <div class="cell-label">Department</div>
          <div class="cell-value">${departmentName}</div>
        </div>
        <div class="detail-cell">
          <div class="cell-label">Branch</div>
          <div class="cell-value">${branchName}</div>
        </div>
        <div class="detail-cell">
          <div class="cell-label">Date of Joining</div>
          <div class="cell-value">${dateOfJoining}</div>
        </div>
        <div class="detail-cell">
          <div class="cell-label">Last Working Day</div>
          <div class="cell-value highlight">${lastWorkingDay}</div>
        </div>
        <div class="detail-cell" style="grid-column: span 2;">
          <div class="cell-label">Total Tenure</div>
          <div class="cell-value">${tenureStr}</div>
        </div>
      </div>
    </div>

    <!-- Official Relieving Statement -->
    <div class="relieving-callout">
      <p>It is hereby confirmed that <strong>${fullName}</strong> has been officially relieved from all duties and responsibilities associated with the position of <strong>${finalDesignation}</strong> in the <strong>${departmentName !== "N/A" ? departmentName : "respective"}</strong> department, effective <strong>${lastWorkingDay}</strong>. All company property and dues have been duly settled.</p>
    </div>

    <p class="body-para">We acknowledge <strong>${first_name}</strong>'s contributions during their tenure of ${tenureStr} and wish them the very best in their future professional endeavours. They are free to pursue opportunities elsewhere without any encumbrance from this organization.</p>

    <!-- Signatures -->
    ${renderSignaturesAndStamp(signatures, companyStamp, companyName)}
  </div>

  <!-- Footer -->
  <div class="footer-area">
    <div class="footer-gold"></div>
    <div class="footer-navy">
      <div class="footer-txt">${companyName} &nbsp;·&nbsp; ${companyAddress}</div>
      <div class="footer-txt">${companyEmail} &nbsp;·&nbsp; ${companyPhone}</div>
    </div>
  </div>

</div>
</body>
</html>`;

  // const base64Html = Buffer.from(htmlContent).toString("base64");
  // return `data:text/html;base64,${base64Html}`;

  return htmlContent;
};

const numberToWords = (num) => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function g(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : '');
  }

  function h(n) {
    if (n === 0) return '';
    if (n < 100) return g(n);
    const rem = n % 100;
    return a[Math.floor(n / 100)] + ' Hundred' + (rem ? ' and ' + h(rem) : '');
  }

  if (num === 0) return 'Zero';
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  if (crore) words += h(crore) + ' Crore ';

  const lakh = Math.floor(num / 100000);
  num %= 100000;
  if (lakh) words += h(lakh) + ' Lakh ';

  const thousand = Math.floor(num / 1000);
  num %= 1000;
  if (thousand) words += h(thousand) + ' Thousand ';

  const remaining = Math.floor(num);
  if (remaining) words += h(remaining);

  return (words.trim() + ' Only').replace(/\s+/g, ' ');
};

const generatePayslipHtml = (employee, payroll, company, salary, paidMonthsCount, ytd) => {
  const fullName = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" ");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[parseInt(payroll.month, 10) - 1] || payroll.month;

  const dojStr = employee.doj
    ? new Date(employee.doj).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "To Be Announced";

  // Calculate Pay Date as the last day of the given month/year
  const payDate = new Date(payroll.year, parseInt(payroll.month, 10), 0);
  const payDateStr = payDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  let companyName = company ? company.company_name : "Zenova Systems";
  let companyLogo = company && company.logo ? company.logo : null;
  if (companyLogo && companyLogo.startsWith("uploads/")) {
    companyLogo = `http://localhost:5000/${companyLogo}`;
  }
  let companyAddress = "HRMS Corporate HQ";
  if (company) {
    const parts = [company.address1, company.address2, company.city, company.state].filter(Boolean);
    if (parts.length > 0) companyAddress = parts.join(", ");
  }

  const basic = parseFloat(salary.basic || 0);
  const hra = parseFloat(salary.hra || 0);
  const da = parseFloat(salary.da || 0);
  const ta = parseFloat(salary.ta || 0);
  const allowance = parseFloat(salary.allowance || 0);
  const pf = parseFloat(salary.pf || 0);
  const esic = parseFloat(salary.esic || 0);
  const tax = parseFloat(salary.tax || 0);

  const lopDeduction = Math.max(0, parseFloat(payroll.total_deductions || 0) - pf - tax - esic);
  const ytdLopDeductions = Math.max(0, parseFloat(ytd.ytd_deductions || 0) - (pf + tax + esic) * paidMonthsCount);
  const amountInWords = numberToWords(Math.round(parseFloat(payroll.net_salary || 0)));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  body {
    font-family: 'Inter', sans-serif;
    color: #1e293b;
    line-height: 1.4;
    padding: 0;
    margin: 0;
    background-color: #ffffff;
    box-sizing: border-box;
  }
  .container {
    width: 800px;
    margin: 0 auto;
    padding: 40px;
    box-sizing: border-box;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 20px;
    margin-bottom: 25px;
  }
  .company-info {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .company-logo {
    max-height: 45px;
    width: auto;
    object-fit: contain;
  }
  .company-text {
    text-align: left;
  }
  .company-name {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
  }
  .company-address {
    font-size: 11px;
    color: #64748b;
    margin: 2px 0 0 0;
    font-weight: 500;
  }
  .payslip-title-info {
    text-align: right;
  }
  .payslip-subtitle {
    font-size: 11px;
    color: #64748b;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
  }
  .payslip-period {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    margin: 5px 0 0 0;
  }
  .summary-section {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    gap: 30px;
    margin-bottom: 25px;
  }
  .employee-summary {
    flex: 1.3;
  }
  .section-title {
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
    text-align: left;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    row-gap: 8px;
    column-gap: 15px;
    font-size: 12px;
  }
  .summary-label {
    color: #64748b;
    font-weight: 500;
    text-align: left;
  }
  .summary-value {
    color: #0f172a;
    font-weight: 700;
    text-align: left;
  }
  .net-pay-card {
    flex: 0.7;
    background-color: #f0fdf4;
    border: 1px solid #dcfce7;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .net-pay-amount-box {
    text-align: left;
    margin-bottom: 15px;
  }
  .net-pay-label {
    font-size: 10px;
    color: #166534;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .net-pay-amount {
    font-size: 26px;
    font-weight: 900;
    color: #15803d;
    margin-top: 5px;
  }
  .days-breakdown {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    border-top: 1px dashed #bbf7d0;
    padding-top: 12px;
  }
  .days-item {
    text-align: left;
  }
  .days-label {
    color: #166534;
    font-weight: 600;
  }
  .days-value {
    font-size: 13px;
    font-weight: 800;
    color: #15803d;
    margin-top: 2px;
  }
  .statutory-section {
    font-size: 12px;
    display: flex;
    gap: 40px;
    border-top: 1px dashed #e2e8f0;
    border-bottom: 1px dashed #e2e8f0;
    padding: 12px 0;
    margin-bottom: 25px;
  }
  .statutory-item {
    display: flex;
    gap: 10px;
  }
  .statutory-label {
    color: #64748b;
    font-weight: 600;
  }
  .statutory-value {
    color: #0f172a;
    font-weight: 700;
  }
  .ledger-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 25px;
    font-size: 12px;
  }
  .ledger-table th {
    background-color: #f8fafc;
    color: #64748b;
    font-weight: 800;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 15px;
    border-top: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
  }
  .ledger-table td {
    padding: 10px 15px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  .ledger-table tr.total-row td {
    background-color: #f8fafc;
    font-weight: 800;
    color: #0f172a;
    border-top: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
  }
  .text-right {
    text-align: right;
  }
  .text-left {
    text-align: left;
  }
  .font-bold {
    font-weight: 700;
    color: #0f172a;
  }
  .net-payable-section {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 15px 25px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .net-payable-text {
    text-align: left;
  }
  .net-payable-title {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
  }
  .net-payable-subtitle {
    font-size: 10px;
    color: #64748b;
    margin-top: 2px;
    font-weight: 500;
  }
  .net-payable-amount-box {
    font-size: 20px;
    font-weight: 900;
    color: #0f172a;
    background-color: #f0fdf4;
    border: 1px solid #dcfce7;
    padding: 8px 20px;
    border-radius: 8px;
  }
  .words-section {
    font-size: 11px;
    color: #64748b;
    text-align: right;
    font-weight: 600;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="company-info">
      ${companyLogo ? `<img class="company-logo" src="${companyLogo}" alt="Logo">` : `
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="36" height="36" rx="8" fill="#4f46e5"/>
          <path d="M10 26V10H14L21 20V10H25V26H21L14 16V26H10Z" fill="white"/>
        </svg>
      `}
      <div class="company-text">
        <h1 class="company-name">${companyName}</h1>
        <p class="company-address">${companyAddress}</p>
      </div>
    </div>
    <div class="payslip-title-info">
      <p class="payslip-subtitle">Payslip For the Month</p>
      <p class="payslip-period">${monthName} ${payroll.year}</p>
    </div>
  </div>

  <div class="summary-section">
    <div class="employee-summary">
      <div class="section-title">Employee Summary</div>
      <div class="summary-grid">
        <span class="summary-label">Employee Name</span>
        <span class="summary-value">: &nbsp;${fullName}</span>
        
        <span class="summary-label">Designation</span>
        <span class="summary-value">: &nbsp;${employee.designation_title || 'N/A'}</span>
        
        <span class="summary-label">Employee ID</span>
        <span class="summary-value">: &nbsp;${employee.company_employee_id || `EMP-${employee.id}`}</span>
        
        <span class="summary-label">Date of Joining</span>
        <span class="summary-value">: &nbsp;${dojStr}</span>
        
        <span class="summary-label">Pay Period</span>
        <span class="summary-value">: &nbsp;${monthName} ${payroll.year}</span>
        
        <span class="summary-label">Pay Date</span>
        <span class="summary-value">: &nbsp;${payDateStr}</span>
      </div>
    </div>

    <div class="net-pay-card">
      <div class="net-pay-amount-box">
        <div class="net-pay-label">Employee Net Pay</div>
        <div class="net-pay-amount">₹${parseFloat(payroll.net_salary).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="days-breakdown">
        <div class="days-item">
          <div class="days-label">Paid Days</div>
          <div class="days-value">${parseFloat(payroll.present_days) + parseFloat(payroll.leave_days)}</div>
        </div>
        <div class="days-item">
          <div class="days-label">LOP Days</div>
          <div class="days-value" style="color: #ef4444;">${payroll.lop_days}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="statutory-section">
    <div class="statutory-item">
      <span class="statutory-label">PF A/C Number</span>
      <span class="statutory-value">: &nbsp;${employee.pf_number || 'N/A'}</span>
    </div>
    <div class="statutory-item">
      <span class="statutory-label">UAN</span>
      <span class="statutory-value">: &nbsp;${employee.uan_number || 'N/A'}</span>
    </div>
  </div>

  <table class="ledger-table">
    <thead>
      <tr>
        <th class="text-left" style="width: 35%;">Earnings</th>
        <th class="text-right" style="width: 15%;">Amount</th>
        <th class="text-right" style="width: 15%;">YTD</th>
        <th class="text-left" style="width: 35%; border-left: 1px solid #e2e8f0; padding-left: 20px;">Deductions</th>
        <th class="text-right" style="width: 15%;">Amount</th>
        <th class="text-right" style="width: 15%;">YTD</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-left">Basic</td>
        <td class="text-right font-bold">₹${basic.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${(basic * paidMonthsCount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        
        <td class="text-left" style="border-left: 1px solid #e2e8f0; padding-left: 20px;">EPF Contribution</td>
        <td class="text-right font-bold">₹${pf.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${(pf * paidMonthsCount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td class="text-left">House Rent Allowance</td>
        <td class="text-right font-bold">₹${hra.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${(hra * paidMonthsCount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        
        <td class="text-left" style="border-left: 1px solid #e2e8f0; padding-left: 20px;">Professional Tax / TDS</td>
        <td class="text-right font-bold">₹${tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${(tax * paidMonthsCount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td class="text-left">Conveyance (DA + TA)</td>
        <td class="text-right font-bold">₹${(da + ta).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${((da + ta) * paidMonthsCount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        
        <td class="text-left" style="border-left: 1px solid #e2e8f0; padding-left: 20px;">Loss of Pay (LOP)</td>
        <td class="text-right font-bold" style="color: #ef4444;">₹${lopDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${ytdLopDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td class="text-left">Other Allowances</td>
        <td class="text-right font-bold">₹${allowance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${(allowance * paidMonthsCount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        
        <td class="text-left" style="border-left: 1px solid #e2e8f0; padding-left: 20px;">ESIC</td>
        <td class="text-right font-bold">₹${esic.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${(esic * paidMonthsCount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr class="total-row">
        <td class="text-left">Gross Earnings</td>
        <td class="text-right">₹${parseFloat(payroll.gross_salary).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${(parseFloat(payroll.gross_salary) * paidMonthsCount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        
        <td class="text-left" style="border-left: 1px solid #e2e8f0; padding-left: 20px;">Total Deductions</td>
        <td class="text-right">₹${parseFloat(payroll.total_deductions).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₹${(parseFloat(payroll.total_deductions) * paidMonthsCount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <div class="net-payable-section">
    <div class="net-payable-text">
      <div class="net-payable-title">TOTAL NET PAYABLE</div>
      <div class="net-payable-subtitle">Gross Earnings - Total Deductions</div>
    </div>
    <div class="net-payable-amount-box">
      ₹${parseFloat(payroll.net_salary).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
    </div>
  </div>

  <div class="words-section">
    Amount In Words : &nbsp;<strong>Indian Rupee ${amountInWords}</strong>
  </div>
</div>
</body>
</html>`;
};

module.exports = { generateOfferLetter, generateExperienceLetter, generateRelievingLetter, generatePayslipHtml };
