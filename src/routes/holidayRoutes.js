const express = require("express");
const router = express.Router();

const {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/holidayController");

const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");
const checkCompanyRole = require("../middleware/companyRoleMiddleware");

router.post("/", auth, checkCompanyRole, createHoliday);
router.get("/", auth, checkPermission("Leave Management"), getHolidays);
router.put("/:id", auth, checkCompanyRole, updateHoliday);
router.delete("/:id", auth, checkCompanyRole, deleteHoliday);

module.exports = router;
