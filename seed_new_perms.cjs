const dotenv = require("dotenv");
dotenv.config();

const pool = require("./src/config/database.js");

const newPerms = [
  { name: "Dashboard View", desc: "Access the main company dashboard and summaries" },
  { name: "My Dashboard View", desc: "Access employee personal dashboard" },
  { name: "My Profile View", desc: "Access own profile details" },
  { name: "Update My Profile", desc: "Ability to edit and update own profile details" },
  { name: "My Attendance View", desc: "Access own attendance records" },
  { name: "My Leaves View", desc: "Access own leave overview" },
  { name: "Apply Leave", desc: "Ability to apply for leave" },
  { name: "My Leave History", desc: "Access own leave history" },
  { name: "My Payroll View", desc: "Access own payroll and payslips" },
  { name: "My Assets View", desc: "Access own assigned assets" },
  { name: "My Travel View", desc: "Access own travel requests" },
  { name: "Travel Reimbursement", desc: "Access own travel requests and submit reimbursement requests" },
  { name: "My Documents View", desc: "Access own documents" },
  { name: "My Login History View", desc: "Access own login history" },
  { name: "Resignation Apply", desc: "Ability to apply for resignation" },
  { name: "Employee List View", desc: "View all employees" },
  { name: "Offer Letters Admin", desc: "Manage offer letters" },
  { name: "Experience Letters Admin", desc: "Manage experience letters" },
  { name: "Relieving Letters Admin", desc: "Manage relieving letters" },
  { name: "Warning Letters Admin", desc: "Manage warning letters" },
  { name: "Termination Letters Admin", desc: "Manage termination letters" },
  { name: "Attendance Admin Dashboard", desc: "View attendance admin dashboard" },
  { name: "Daily Tracking Admin", desc: "Manage daily tracking of employees" },
  { name: "Shifts Admin", desc: "Manage company shifts" },
  { name: "Holidays Admin", desc: "Manage company holidays" },
  { name: "Holiday Calendar View", desc: "View holiday calendar" },
  { name: "Leave Admin Dashboard", desc: "View leave admin dashboard" },
  { name: "Leave Requests Admin", desc: "Manage employee leave requests" },
  { name: "Leave Types Admin", desc: "Manage leave types configuration" },
  { name: "Payroll Admin Dashboard", desc: "View payroll admin dashboard" },
  { name: "Salary Details Admin", desc: "Manage employee salary details" },
  { name: "Payslips Admin", desc: "Manage and generate payslips" },
  { name: "Resume Analyser", desc: "Use resume analyser tool" },
  { name: "Interview Scheduler", desc: "Schedule and manage interviews" },
  { name: "Assets Admin", desc: "Manage company assets" },
  { name: "Travel Admin", desc: "Manage travel requests" },
  { name: "Company Login History", desc: "View company-wide login history" },
];

async function seed() {
  try {
    const companies = await pool.query("SELECT DISTINCT company_id FROM permissions");
    for (const company of companies.rows) {
      const companyId = company.company_id;
      
      const existing = await pool.query("SELECT name FROM permissions WHERE company_id = $1", [companyId]);
      const existingNames = new Set(existing.rows.map(r => r.name));

      for (const p of newPerms) {
        if (!existingNames.has(p.name)) {
          await pool.query(
            "INSERT INTO permissions (company_id, name, description) VALUES ($1, $2, $3)",
            [companyId, p.name, p.desc]
          );
          console.log("Inserted " + p.name + " for company " + companyId);
        }
      }
    }
    console.log("Migration complete");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

seed();
