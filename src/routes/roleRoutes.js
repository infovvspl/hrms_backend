const express = require("express");

const router = express.Router();

const auth = require("../middleware/authmiddleware");

const {
  createRole,
  getRoles,
  updateRole,
  deleteRole
} = require("../controllers/roleController");

router.post("/", auth, createRole);

router.get("/", auth, getRoles);

router.put("/:id", auth, updateRole);

router.delete("/:id", auth, deleteRole);

module.exports = router;