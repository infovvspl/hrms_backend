const express = require("express");
const router = express.Router();

const {
  getSalaryDetails,
  updateSalaryDetails,
  calculatePayroll,
  getCalculatedPayroll,
  generatePayslip,
  getMyPayslips
} = require("../controllers/payrollController");

const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");

// Routing structure
router.get("/salary-details", auth, checkPermission("Payroll & Invoicing"), getSalaryDetails);
router.post("/salary-details", auth, checkPermission("Payroll & Invoicing"), updateSalaryDetails);
router.post("/calculate", auth, checkPermission("Payroll & Invoicing"), calculatePayroll);
router.get("/records", auth, checkPermission("Payroll & Invoicing"), getCalculatedPayroll);
router.post("/generate", auth, checkPermission("Payroll & Invoicing"), generatePayslip);
router.get("/my-payslips", auth, checkPermission("Payroll & Invoicing"), getMyPayslips);

module.exports = router;
