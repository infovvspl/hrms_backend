const express = require("express");

const router = express.Router();

const {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");

const authMiddleware = require("../middleware/authmiddleware");
const checkCompanyRole = require("../middleware/companyRoleMiddleware");

router.post("/", authMiddleware, checkCompanyRole, createDepartment);
router.get("/", authMiddleware, getDepartments);
router.put("/:id", authMiddleware, checkCompanyRole, updateDepartment);
router.delete("/:id", authMiddleware, checkCompanyRole, deleteDepartment);

module.exports = router;