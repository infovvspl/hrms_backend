const express = require("express");
const router = express.Router();
const {
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
  getMyPermissions,
} = require("../controllers/permissionController");

const auth = require("../middleware/authmiddleware");

router.get("/", auth, getPermissions);
router.get("/my-permissions", auth, getMyPermissions);
router.get("/role/:roleId", auth, getRolePermissions);
router.post("/role/:roleId", auth, updateRolePermissions);

module.exports = router;
