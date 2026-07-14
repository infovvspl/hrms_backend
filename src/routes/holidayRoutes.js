const express = require("express");
const router = express.Router();

const {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/holidayController");

const auth = require("../middleware/authmiddleware");

router.post("/", auth, createHoliday);
router.get("/", auth, getHolidays);
router.put("/:id", auth, updateHoliday);
router.delete("/:id", auth, deleteHoliday);

module.exports = router;
