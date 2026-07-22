const express = require("express");
const router = express.Router();

const {
  getMyCompany,
  updateCompany,
  createCompany,
} = require("../controllers/CompanyController");

const authMiddleware = require("../middleware/authmiddleware");
const checkCompanyRole = require("../middleware/companyRoleMiddleware");
const logoUpload = require("../middleware/logoUpload");

// ====================================
// COMPANY PROFILE ROUTES
// ====================================

router.post("/register", logoUpload, createCompany);

// Get logged-in company
router.get("/me", authMiddleware, getMyCompany);

// Update logged-in company
router.put("/update", authMiddleware, checkCompanyRole, logoUpload, updateCompany);

module.exports = router;
