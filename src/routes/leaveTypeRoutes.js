const express = require("express");
const router = express.Router();
const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");
const checkCompanyRole = require("../middleware/companyRoleMiddleware");

const {
  createLeaveType,
  getLeaveTypes,
  updateLeaveType,
  deleteLeaveType,
} = require("../controllers/leaveTypeController");

router.post("/", auth, checkCompanyRole, createLeaveType);
router.get("/", auth, checkPermission("Leave Management"), getLeaveTypes);
router.put("/:id", auth, checkCompanyRole, updateLeaveType);
router.delete("/:id", auth, checkCompanyRole, deleteLeaveType);

module.exports = router;
