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

// Routing structure
router.get("/salary-details", auth, getSalaryDetails);
router.post("/salary-details", auth, updateSalaryDetails);
router.post("/calculate", auth, calculatePayroll);
router.get("/records", auth, getCalculatedPayroll);
router.post("/generate", auth, generatePayslip);
router.get("/my-payslips", auth, getMyPayslips);

module.exports = router;
