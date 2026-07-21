const express = require("express");

const router = express.Router();

const {
  createLoginHistory,
  getLoginHistory,
  getLoginHistoryByUser,
  getLoginHistoryById,
  updateLogoutTime,
  deleteLoginHistory,
} = require("../controllers/loginHistoryController");

const authmiddleware = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");

// ===============================
// CREATE LOGIN HISTORY (log a login event)
// ===============================
router.post("/", createLoginHistory);

// ===============================
// GET ALL LOGIN HISTORY (company-scoped)
// ===============================
router.get("/", authmiddleware, checkPermission("Login History logs"), getLoginHistory);

// ===============================
// GET LOGIN HISTORY BY USER ID
// ===============================
router.get("/user/:user_id", authmiddleware, checkPermission("Login History logs"), getLoginHistoryByUser);

// ===============================
// GET SINGLE LOGIN HISTORY RECORD
// ===============================
router.get("/:id", authmiddleware, checkPermission("Login History logs"), getLoginHistoryById);

// ===============================
// UPDATE LOGOUT TIME
// ===============================
router.put("/:id/logout", authmiddleware, updateLogoutTime);

// ===============================
// DELETE LOGIN HISTORY RECORD
// ===============================
router.delete("/:id", authmiddleware, checkPermission("Login History logs"), deleteLoginHistory);

module.exports = router;
