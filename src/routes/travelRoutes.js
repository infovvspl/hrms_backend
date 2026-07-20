const express = require("express");
const router = express.Router();
const {
  createTravel,
  getMyTravelRequests,
  getCompanyTravelRequests,
  updateTravelStatus,
} = require("../controllers/travelController");

const auth = require("../middleware/authmiddleware");
const billUpload = require("../middleware/billUpload");

// Travel Reimbursement routes
router.post("/", auth, billUpload, createTravel);
router.get("/me", auth, getMyTravelRequests);
router.get("/", auth, getCompanyTravelRequests);
router.put("/:id/status", auth, updateTravelStatus);

module.exports = router;
