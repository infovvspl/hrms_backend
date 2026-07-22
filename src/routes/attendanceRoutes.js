const express = require("express");
const router = express.Router();

const {
  getShifts,
  getAttendanceLogs,
  punchAttendance,
  assignShift,
  getShiftAssignments,
  addManualAttendance
} = require("../controllers/attendanceController");

const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");

router.get("/shifts", auth, getShifts);
router.get("/logs", auth, getAttendanceLogs);
router.post("/punch", auth, punchAttendance);
router.post("/assign", auth, checkPermission("Attendance Management"), assignShift);
router.get("/assignments", auth, checkPermission("Attendance Management"), getShiftAssignments);
router.post("/manual", auth, checkPermission("Attendance Management"), addManualAttendance);

module.exports = router;
