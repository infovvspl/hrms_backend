const express = require("express");
const router = express.Router();

const {
  createDesignation,
  getDesignations,
  updateDesignation,
  deleteDesignation
} = require("../controllers/designationController");

const auth = require("../middleware/authmiddleware");

router.post("/", auth, createDesignation);
router.get("/", auth, getDesignations);
router.put("/:id", auth, updateDesignation);
router.delete("/:id", auth, deleteDesignation);

module.exports = router;