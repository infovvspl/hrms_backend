const express = require("express");
const router = express.Router();
const auth = require("../middleware/authmiddleware");
const {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  deleteLeaveRequest,
  getRemainingLeaves,
  recalculateBalances,
} = require("../controllers/leaveController");

router.get("/", auth, getLeaveRequests);
router.post("/", auth, createLeaveRequest);
router.put("/:id/status", auth, updateLeaveStatus);
router.delete("/:id", auth, deleteLeaveRequest);
router.get("/remaining", auth, getRemainingLeaves);
router.post("/recalculate", auth, recalculateBalances);

module.exports = router;
