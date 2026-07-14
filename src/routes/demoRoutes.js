const express = require("express");

const router = express.Router();

const { createDemo } = require("../controllers/demoController");

router.post("/book-demo", createDemo);

module.exports = router;
