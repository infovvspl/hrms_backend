const express = require("express");
const router = express.Router();

const {
  // Asset
  createAsset,
  getAssets,
  getAsset,
  updateAsset,
  deleteAsset,
  // Asset Assign
  assignAsset,
  getAssignments,
  getMyAssets,
  updateAssignment,
  deleteAssignment,
  // Asset Repair
  createRepair,
  getRepairs,
  updateRepair,
  deleteRepair,
} = require("../controllers/assetController");

const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");
const billUpload = require("../middleware/billUpload");

// ============================
// ASSET ASSIGN ROUTES  (must be before /:id to avoid collision)
// ============================
router.get("/assign/me", auth, getMyAssets);
router.post("/assign/create", auth, checkPermission("Asset Management"), assignAsset);
router.get("/assign/list", auth, checkPermission("Asset Management"), getAssignments);
router.put("/assign/:id", auth, checkPermission("Asset Management"), updateAssignment);
router.delete("/assign/:id", auth, checkPermission("Asset Management"), deleteAssignment);

// ============================
// ASSET REPAIR ROUTES  (must be before /:id to avoid collision)
// ============================
router.post("/repair/create", auth, checkPermission("Asset Management"), createRepair);
router.get("/repair/list", auth, checkPermission("Asset Management"), getRepairs);
router.put("/repair/:id", auth, checkPermission("Asset Management"), updateRepair);
router.delete("/repair/:id", auth, checkPermission("Asset Management"), deleteRepair);

// ============================
// ASSET ROUTES
// ============================
router.post("/", auth, checkPermission("Asset Management"), billUpload, createAsset);
router.get("/", auth, checkPermission("Asset Management"), getAssets);
router.get("/:id", auth, checkPermission("Asset Management"), getAsset);
router.put("/:id", auth, checkPermission("Asset Management"), billUpload, updateAsset);
router.delete("/:id", auth, checkPermission("Asset Management"), deleteAsset);

module.exports = router;
