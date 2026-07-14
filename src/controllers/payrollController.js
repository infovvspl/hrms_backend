const pool = require("../config/database");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { generatePayslipHtml } = require("../utils/documentGenerator");

let sharedBrowser = null;
const getSharedBrowser = async () => {
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }
  sharedBrowser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return sharedBrowser;
};

const htmlToPayslipPdf = async (html, employeeId, payrollId) => {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const uploadDir = path.join(__dirname, "../../uploads/payslips");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `payslip_${employeeId}_${payrollId}_${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
    });

    return `/uploads/payslips/${fileName}`;
  } finally {
    await page.close();
  }
};

// =====================================
// GET SALARY DETAILS FOR ALL EMPLOYEES
// =====================================
exports.getSalaryDetails = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    
    const result = await pool.query(`
      SELECT 
        u.id AS user_id,
        u.company_employee_id,
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        u.email,
        sd.basic,
        sd.hra,
        sd.da,
        sd.ta,
        sd.allowance,
        sd.pf,
        sd.esic,
        sd.tax
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN salary_details sd ON u.id = sd.user_id
      WHERE u.company_id = $1
      ORDER BY u.id ASC
    `, [company_id]);

    const formatted = result.rows.map(r => ({
      user_id: r.user_id,
      company_employee_id: r.company_employee_id,
      name: r.name,
      email: r.email,
      basic: r.basic || "0.00",
      hra: r.hra || "0.00",
      da: r.da || "0.00",
      ta: r.ta || "0.00",
      allowance: r.allowance || "0.00",
      pf: r.pf || "0.00",
      esic: r.esic || "0.00",
      tax: r.tax || "0.00"
    }));

    res.status(200).json({
      success: true,
      salaryDetails: formatted
    });
  } catch (error) {
    console.error("GET SALARY DETAILS ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =====================================
// SAVE/UPDATE SALARY DETAILS FOR EMPLOYEE
// =====================================
exports.updateSalaryDetails = async (req, res) => {
  try {
    const { user_id, basic, hra, da, ta, allowance, pf, esic, tax } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const checkResult = await pool.query(`SELECT id FROM salary_details WHERE user_id = $1`, [user_id]);

    if (checkResult.rows.length > 0) {
      await pool.query(`
        UPDATE salary_details SET
          basic = $1,
          hra = $2,
          da = $3,
          ta = $4,
          allowance = $5,
          pf = $6,
          esic = $7,
          tax = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $9
      `, [basic, hra, da, ta, allowance, pf, esic, tax, user_id]);
    } else {
      await pool.query(`
        INSERT INTO salary_details (user_id, basic, hra, da, ta, allowance, pf, esic, tax)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [user_id, basic, hra, da, ta, allowance, pf, esic, tax]);
    }

    res.status(200).json({
      success: true,
      message: "Salary details saved successfully"
    });
  } catch (error) {
    console.error("SAVE SALARY DETAILS ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =====================================
// AUTOMATIC PAYROLL CALCULATION FOR MONTH
// =====================================
exports.calculatePayroll = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and Year are required" });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    // Calculate total working days (excluding weekends)
    let weekends = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(yearNum, monthNum - 1, d).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekends++;
      }
    }
    const totalWorkingDays = daysInMonth - weekends;

    // Get all employees
    const empResult = await pool.query(`
      SELECT u.id, u.company_employee_id, CONCAT(u.first_name, ' ', u.last_name) AS name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.company_id = $1
    `, [company_id]);
    const employees = empResult.rows;

    const todayMidnight = new Date();
    todayMidnight.setHours(0,0,0,0);

    for (const emp of employees) {
      // 1. Get salary config
      const salRes = await pool.query(`SELECT * FROM salary_details WHERE user_id = $1`, [emp.id]);
      const sal = salRes.rows[0] || { basic: 0, hra: 0, da: 0, ta: 0, allowance: 0, pf: 0, esic: 0, tax: 0 };

      const basic = parseFloat(sal.basic || 0);
      const hra = parseFloat(sal.hra || 0);
      const da = parseFloat(sal.da || 0);
      const ta = parseFloat(sal.ta || 0);
      const allowance = parseFloat(sal.allowance || 0);
      const pf = parseFloat(sal.pf || 0);
      const esic = parseFloat(sal.esic || 0);
      const tax = parseFloat(sal.tax || 0);

      // 2. Fetch logs for employee in target month
      const logRes = await pool.query(`
        SELECT punch_in_at, punch_out_at, total_time FROM attendance
        WHERE user_id = $1 
          AND EXTRACT(MONTH FROM punch_in_at) = $2
          AND EXTRACT(YEAR FROM punch_in_at) = $3
      `, [emp.id, monthNum, yearNum]);
      const logs = logRes.rows;

      const punchInDays = new Set();
      logs.forEach(l => {
        if (l.punch_in_at) {
          const dateStr = new Date(l.punch_in_at).toISOString().split("T")[0];
          punchInDays.add(dateStr);
        }
      });

      // 3. Fetch approved leaves
      const leaveRes = await pool.query(`
        SELECT l.from_date, l.to_date, lt.name AS leave_type_name
        FROM leave l
        JOIN leave_types lt ON l.leave_types = lt.id
        WHERE l.user_id = $1
          AND l.status = 'Approved'
          AND (
            (EXTRACT(MONTH FROM l.from_date) = $2 AND EXTRACT(YEAR FROM l.from_date) = $3) OR
            (EXTRACT(MONTH FROM l.to_date) = $2 AND EXTRACT(YEAR FROM l.to_date) = $3)
          )
      `, [emp.id, monthNum, yearNum]);
      const leaves = leaveRes.rows;

      let presentDays = 0;
      let leaveDays = 0;
      let lopDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const cellDate = new Date(yearNum, monthNum - 1, d);
        if (cellDate > todayMidnight) continue; // Skip future

        const dayOfWeek = cellDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

        const dateStr = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        if (punchInDays.has(dateStr)) {
          presentDays++;
        } else {
          // Check approved leaves
          const approvedLeave = leaves.find(l => {
            const from = new Date(l.from_date);
            const to = new Date(l.to_date);
            from.setHours(0,0,0,0);
            to.setHours(0,0,0,0);
            cellDate.setHours(0,0,0,0);
            return cellDate >= from && cellDate <= to;
          });

          if (approvedLeave) {
            const nameLower = approvedLeave.leave_type_name.toLowerCase();
            if (nameLower.includes("unpaid") || nameLower.includes("loss of pay") || nameLower.includes("lop")) {
              lopDays++;
            } else {
              leaveDays++;
            }
          } else {
            lopDays++;
          }
        }
      }

      // Compute salary values
      const dailyRate = totalWorkingDays > 0 ? (basic / totalWorkingDays) : 0;
      const lopDeduction = dailyRate * lopDays;

      const grossSalary = basic + hra + da + ta + allowance;
      const totalDeductions = pf + esic + tax + lopDeduction;
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      // Save/Update payroll row
      const payrollCheck = await pool.query(`
        SELECT id FROM payroll WHERE user_id = $1 AND month = $2 AND year = $3
      `, [emp.id, String(monthNum), yearNum]);

      if (payrollCheck.rows.length > 0) {
        await pool.query(`
          UPDATE payroll SET
            total_working_days = $1,
            present_days = $2,
            leave_days = $3,
            lop_days = $4,
            gross_salary = $5,
            total_deductions = $6,
            net_salary = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
        `, [totalWorkingDays, presentDays, leaveDays, lopDays, grossSalary, totalDeductions, netSalary, payrollCheck.rows[0].id]);
      } else {
        await pool.query(`
          INSERT INTO payroll (user_id, month, year, total_working_days, present_days, leave_days, lop_days, gross_salary, total_deductions, net_salary)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [emp.id, String(monthNum), yearNum, totalWorkingDays, presentDays, leaveDays, lopDays, grossSalary, totalDeductions, netSalary]);
      }
    }

    res.status(200).json({
      success: true,
      message: "Monthly payroll computed successfully for all active employees"
    });
  } catch (error) {
    console.error("CALCULATE PAYROLL ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =====================================
// GET CALCULATED MONTHLY PAYROLL RECORDS
// =====================================
exports.getCalculatedPayroll = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and Year are required" });
    }

    const result = await pool.query(`
      SELECT 
        p.*,
        u.company_employee_id,
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        u.email,
        sd.basic,
        sd.hra,
        sd.da,
        sd.ta,
        sd.allowance,
        sd.pf,
        sd.esic,
        sd.tax
      FROM payroll p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN salary_details sd ON u.id = sd.user_id
      WHERE u.company_id = $1 AND p.month = $2 AND p.year = $3
      ORDER BY u.id ASC
    `, [company_id, String(parseInt(month, 10)), parseInt(year, 10)]);

    res.status(200).json({
      success: true,
      payrollRecords: result.rows
    });
  } catch (error) {
    console.error("GET CALCULATED PAYROLL ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const runSinglePayrollCalculation = async (userId, month, year) => {
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  // Calculate total working days (excluding weekends)
  let weekends = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(yearNum, monthNum - 1, d).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends++;
    }
  }
  const totalWorkingDays = daysInMonth - weekends;

  // 1. Get salary config
  const salRes = await pool.query(`SELECT * FROM salary_details WHERE user_id = $1`, [userId]);
  const sal = salRes.rows[0] || { basic: 0, hra: 0, da: 0, ta: 0, allowance: 0, pf: 0, esic: 0, tax: 0 };

  const basic = parseFloat(sal.basic || 0);
  const hra = parseFloat(sal.hra || 0);
  const da = parseFloat(sal.da || 0);
  const ta = parseFloat(sal.ta || 0);
  const allowance = parseFloat(sal.allowance || 0);
  const pf = parseFloat(sal.pf || 0);
  const esic = parseFloat(sal.esic || 0);
  const tax = parseFloat(sal.tax || 0);

  // 2. Fetch logs for employee in target month
  const logRes = await pool.query(`
    SELECT punch_in_at, punch_out_at, total_time FROM attendance
    WHERE user_id = $1 
      AND EXTRACT(MONTH FROM punch_in_at) = $2
      AND EXTRACT(YEAR FROM punch_in_at) = $3
  `, [userId, monthNum, yearNum]);
  const logs = logRes.rows;

  const punchInDays = new Set();
  logs.forEach(l => {
    if (l.punch_in_at) {
      const dateStr = new Date(l.punch_in_at).toISOString().split("T")[0];
      punchInDays.add(dateStr);
    }
  });

  // 3. Fetch approved leaves
  const leaveRes = await pool.query(`
    SELECT l.from_date, l.to_date, lt.name AS leave_type_name
    FROM leave l
    JOIN leave_types lt ON l.leave_types = lt.id
    WHERE l.user_id = $1
      AND l.status = 'Approved'
      AND (
        (EXTRACT(MONTH FROM l.from_date) = $2 AND EXTRACT(YEAR FROM l.from_date) = $3) OR
        (EXTRACT(MONTH FROM l.to_date) = $2 AND EXTRACT(YEAR FROM l.to_date) = $3)
      )
  `, [userId, monthNum, yearNum]);
  const leaves = leaveRes.rows;

  let presentDays = 0;
  let leaveDays = 0;
  let lopDays = 0;

  const todayMidnight = new Date();
  todayMidnight.setHours(0,0,0,0);

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(yearNum, monthNum - 1, d);
    if (cellDate > todayMidnight) continue; // Skip future

    const dayOfWeek = cellDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    const dateStr = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    if (punchInDays.has(dateStr)) {
      presentDays++;
    } else {
      // Check approved leaves
      const approvedLeave = leaves.find(l => {
        const from = new Date(l.from_date);
        const to = new Date(l.to_date);
        from.setHours(0,0,0,0);
        to.setHours(0,0,0,0);
        cellDate.setHours(0,0,0,0);
        return cellDate >= from && cellDate <= to;
      });

      if (approvedLeave) {
        const nameLower = approvedLeave.leave_type_name.toLowerCase();
        if (nameLower.includes("unpaid") || nameLower.includes("loss of pay") || nameLower.includes("lop")) {
          lopDays++;
        } else {
          leaveDays++;
        }
      } else {
        lopDays++;
      }
    }
  }

  // Compute salary values
  const dailyRate = totalWorkingDays > 0 ? (basic / totalWorkingDays) : 0;
  const lopDeduction = dailyRate * lopDays;

  const grossSalary = basic + hra + da + ta + allowance;
  const totalDeductions = pf + esic + tax + lopDeduction;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  // Update payroll row
  await pool.query(`
    UPDATE payroll SET
      total_working_days = $1,
      present_days = $2,
      leave_days = $3,
      lop_days = $4,
      gross_salary = $5,
      total_deductions = $6,
      net_salary = $7,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $8 AND month = $9 AND year = $10
  `, [totalWorkingDays, presentDays, leaveDays, lopDays, grossSalary, totalDeductions, netSalary, userId, String(monthNum), yearNum]);
};

// =====================================
// GENERATE & PUBLISH PAYSLIP
// =====================================
exports.generatePayslip = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: "Payroll ID is required" });
    }

    // 1. Fetch initial payroll record to extract userId, month, and year for auto-calculation
    const initialRes = await pool.query(`SELECT user_id, month, year FROM payroll WHERE id = $1`, [id]);
    if (initialRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }
    const initialPayroll = initialRes.rows[0];

    // 2. Automatically calculate payroll for the target employee/month/year to catch latest info
    await runSinglePayrollCalculation(initialPayroll.user_id, initialPayroll.month, initialPayroll.year);

    // 3. Fetch the updated payroll record containing computed salary details
    const payrollRes = await pool.query(`SELECT * FROM payroll WHERE id = $1`, [id]);
    const payroll = payrollRes.rows[0];

    // 4. Fetch employee details
    const userRes = await pool.query(`
      SELECT u.*, d.title as designation_title, dept.department_name, b.name as branch_name
      FROM users u
      LEFT JOIN designations d ON u.designation_id = d.id
      LEFT JOIN departments dept ON u.department_id = dept.id
      LEFT JOIN branch b ON u.branch_id = b.id
      WHERE u.id = $1
    `, [payroll.user_id]);
    const employee = userRes.rows[0];

    // 5. Fetch company details
    const companyRes = await pool.query(`SELECT * FROM company WHERE id = $1`, [employee.company_id]);
    const company = companyRes.rows[0];

    // 6. Fetch salary details config
    const salaryRes = await pool.query(`SELECT * FROM salary_details WHERE user_id = $1`, [payroll.user_id]);
    const salary = salaryRes.rows[0] || { basic: 0, hra: 0, da: 0, ta: 0, allowance: 0, pf: 0, esic: 0, tax: 0 };

    // 7. Fetch YTD (Year to Date) totals
    const ytdRes = await pool.query(`
      SELECT 
        SUM(gross_salary) as ytd_gross,
        SUM(total_deductions) as ytd_deductions,
        SUM(net_salary) as ytd_net
      FROM payroll
      WHERE user_id = $1 AND year = $2 AND CAST(month AS INTEGER) <= CAST($3 AS INTEGER)
    `, [payroll.user_id, payroll.year, payroll.month]);
    const ytd = ytdRes.rows[0] || { ytd_gross: 0, ytd_deductions: 0, ytd_net: 0 };

    // 8. Fetch paid months count for component YTD scaling
    const countRes = await pool.query(`
      SELECT COUNT(*)::integer as count 
      FROM payroll 
      WHERE user_id = $1 AND year = $2 AND CAST(month AS INTEGER) <= CAST($3 AS INTEGER)
    `, [payroll.user_id, payroll.year, payroll.month]);
    const paidMonthsCount = countRes.rows[0]?.count || 1;

    // 9. Generate Zoho-style HTML
    const htmlContent = generatePayslipHtml(employee, payroll, company, salary, paidMonthsCount, ytd);

    // 10. Convert HTML to PDF using Puppeteer
    const pdfRelativePath = await htmlToPayslipPdf(htmlContent, payroll.user_id, payroll.id);

    // 11. Update payroll record with the PDF path
    await pool.query(`
      UPDATE payroll 
      SET 
        payslip_path = $1, 
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [pdfRelativePath, id]);

    res.status(200).json({
      success: true,
      message: "Payslip generated successfully",
      payslip_path: pdfRelativePath
    });
  } catch (error) {
    console.error("GENERATE PAYSLIP ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// =====================================
// GET PAYSLIPS FOR LOGGED IN EMPLOYEE
// =====================================
exports.getMyPayslips = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(`
      SELECT 
        p.*,
        u.company_employee_id,
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        u.email,
        sd.basic,
        sd.hra,
        sd.da,
        sd.ta,
        sd.allowance,
        sd.pf,
        sd.esic,
        sd.tax,
        c.company_name,
        c.logo AS company_logo
      FROM payroll p
      JOIN users u ON p.user_id = u.id
      JOIN company c ON u.company_id = c.id
      LEFT JOIN salary_details sd ON u.id = sd.user_id
      WHERE p.user_id = $1
      ORDER BY p.year DESC, CAST(p.month AS INTEGER) DESC
    `, [user_id]);

    res.status(200).json({
      success: true,
      payslips: result.rows
    });
  } catch (error) {
    console.error("GET MY PAYSLIPS ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
