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

router.get("/shifts", auth, getShifts);
router.get("/logs", auth, getAttendanceLogs);
router.post("/punch", auth, punchAttendance);
router.post("/assign", auth, assignShift);
router.get("/assignments", auth, getShiftAssignments);
router.post("/manual", auth, addManualAttendance);

module.exports = router;
