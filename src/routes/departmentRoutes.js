const express = require("express");

const router = express.Router();

const {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");

const authMiddleware = require("../middleware/authmiddleware");

router.post("/", authMiddleware, createDepartment);

router.get("/", authMiddleware, getDepartments);

router.put("/:id", authMiddleware, updateDepartment);

router.delete("/:id", authMiddleware, deleteDepartment);

module.exports = router;