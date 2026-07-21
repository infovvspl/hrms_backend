const express = require("express");
const router = express.Router();
const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");
const {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  deleteLeaveRequest,
  getRemainingLeaves,
  recalculateBalances,
} = require("../controllers/leaveController");

router.get("/", auth, checkPermission("Leave Management"), getLeaveRequests);
router.post("/", auth, checkPermission("Leave Management"), createLeaveRequest);
router.put("/:id/status", auth, checkPermission("Leave Management"), updateLeaveStatus);
router.delete("/:id", auth, checkPermission("Leave Management"), deleteLeaveRequest);
router.get("/remaining", auth, checkPermission("Leave Management"), getRemainingLeaves);
router.post("/recalculate", auth, checkPermission("Leave Management"), recalculateBalances);

module.exports = router;
