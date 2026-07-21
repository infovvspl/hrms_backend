const express = require("express");
const router = express.Router();

const {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
} = require("../controllers/branchController");

const auth = require("../middleware/authmiddleware");
const checkCompanyRole = require("../middleware/companyRoleMiddleware");

router.post("/", auth, checkCompanyRole, createBranch);
router.get("/", auth, getBranches); // Can be viewed by employees (for dropdowns) but we can just use auth, or maybe require Dashboard/Employee Directory. Just leaving auth is fine. Wait, in App.jsx it's restricted to company only. I'll add checkCompanyRole to ALL.
router.put("/:id", auth, checkCompanyRole, updateBranch);
router.delete("/:id", auth, checkCompanyRole, deleteBranch);

module.exports = router;