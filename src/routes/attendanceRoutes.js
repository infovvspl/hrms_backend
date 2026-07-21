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

router.get("/shifts", auth, checkPermission("Attendance Management"), getShifts);
router.get("/logs", auth, checkPermission("Attendance Management"), getAttendanceLogs);
router.post("/punch", auth, checkPermission("Attendance Management"), punchAttendance);
router.post("/assign", auth, checkPermission("Attendance Management"), assignShift);
router.get("/assignments", auth, checkPermission("Attendance Management"), getShiftAssignments);
router.post("/manual", auth, checkPermission("Attendance Management"), addManualAttendance);

module.exports = router;
