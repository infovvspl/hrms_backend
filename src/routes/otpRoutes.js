const express = require("express");

const router = express.Router();

const {
  sendOtp,
  verifyOtp,
  resendOtp
} = require("../controllers/otpController");

router.post("/send-otp", sendOtp);

router.post("/verify-otp", verifyOtp);

router.post("/resendOtp", resendOtp);

module.exports = router;