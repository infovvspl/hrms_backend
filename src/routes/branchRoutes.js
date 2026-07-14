const express = require("express");
const router = express.Router();

const {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
} = require("../controllers/branchController");

const auth = require("../middleware/authmiddleware");

router.post("/", auth, createBranch);
router.get("/", auth, getBranches);
router.put("/:id", auth, updateBranch);
router.delete("/:id", auth, deleteBranch);

module.exports = router;