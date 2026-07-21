const express = require("express");

const router = express.Router();

const auth = require("../middleware/authmiddleware");
const checkCompanyRole = require("../middleware/companyRoleMiddleware");

const {
  createRole,
  getRoles,
  updateRole,
  deleteRole
} = require("../controllers/roleController");

router.post("/", auth, checkCompanyRole, createRole);
router.get("/", auth, getRoles);
router.put("/:id", auth, checkCompanyRole, updateRole);
router.delete("/:id", auth, checkCompanyRole, deleteRole);

module.exports = router;