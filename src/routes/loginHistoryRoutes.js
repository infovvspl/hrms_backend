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

// ===============================
// CREATE LOGIN HISTORY (log a login event)
// ===============================
router.post("/", createLoginHistory);

// ===============================
// GET ALL LOGIN HISTORY (company-scoped)
// ===============================
router.get("/", authmiddleware, getLoginHistory);

// ===============================
// GET LOGIN HISTORY BY USER ID
// ===============================
router.get("/user/:user_id", authmiddleware, getLoginHistoryByUser);

// ===============================
// GET SINGLE LOGIN HISTORY RECORD
// ===============================
router.get("/:id", authmiddleware, getLoginHistoryById);

// ===============================
// UPDATE LOGOUT TIME
// ===============================
router.put("/:id/logout", authmiddleware, updateLogoutTime);

// ===============================
// DELETE LOGIN HISTORY RECORD
// ===============================
router.delete("/:id", authmiddleware, deleteLoginHistory);

module.exports = router;
