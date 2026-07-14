const express = require("express");
const router = express.Router();
const auth = require("../middleware/authmiddleware");
const {
  createLeaveType,
  getLeaveTypes,
  updateLeaveType,
  deleteLeaveType,
} = require("../controllers/leaveTypeController");

router.post("/", auth, createLeaveType);
router.get("/", auth, getLeaveTypes);
router.put("/:id", auth, updateLeaveType);
router.delete("/:id", auth, deleteLeaveType);

module.exports = router;
