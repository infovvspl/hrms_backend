const express = require("express");
const router = express.Router();
const {
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
  getMyPermissions,
} = require("../controllers/permissionController");

const auth = require("../middleware/authmiddleware");
const checkCompanyRole = require("../middleware/companyRoleMiddleware");

router.get("/", auth, checkCompanyRole, getPermissions);
router.get("/my-permissions", auth, getMyPermissions);
router.get("/role/:roleId", auth, checkCompanyRole, getRolePermissions);
router.post("/role/:roleId", auth, checkCompanyRole, updateRolePermissions);

module.exports = router;
