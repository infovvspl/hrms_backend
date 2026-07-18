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
  updateAssignment,
  deleteAssignment,
  // Asset Repair
  createRepair,
  getRepairs,
  updateRepair,
  deleteRepair,
} = require("../controllers/assetController");

const auth = require("../middleware/authmiddleware");
const billUpload = require("../middleware/billUpload");

// ============================
// ASSET ASSIGN ROUTES  (must be before /:id to avoid collision)
// ============================
router.post("/assign/create", auth, assignAsset);
router.get("/assign/list", auth, getAssignments);
router.put("/assign/:id", auth, updateAssignment);
router.delete("/assign/:id", auth, deleteAssignment);

// ============================
// ASSET REPAIR ROUTES  (must be before /:id to avoid collision)
// ============================
router.post("/repair/create", auth, createRepair);
router.get("/repair/list", auth, getRepairs);
router.put("/repair/:id", auth, updateRepair);
router.delete("/repair/:id", auth, deleteRepair);

// ============================
// ASSET ROUTES
// ============================
router.post("/", auth, billUpload, createAsset);
router.get("/", auth, getAssets);
router.get("/:id", auth, getAsset);
router.put("/:id", auth, billUpload, updateAsset);
router.delete("/:id", auth, deleteAsset);

module.exports = router;
