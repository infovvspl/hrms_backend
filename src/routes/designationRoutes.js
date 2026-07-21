const express = require("express");
const router = express.Router();

const {
  createDesignation,
  getDesignations,
  updateDesignation,
  deleteDesignation
} = require("../controllers/designationController");

const auth = require("../middleware/authmiddleware");
const checkCompanyRole = require("../middleware/companyRoleMiddleware");

router.post("/", auth, checkCompanyRole, createDesignation);
router.get("/", auth, getDesignations);
router.put("/:id", auth, checkCompanyRole, updateDesignation);
router.delete("/:id", auth, checkCompanyRole, deleteDesignation);

module.exports = router;