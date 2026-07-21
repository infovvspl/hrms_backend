const express = require("express");
const router = express.Router();
const {
  createTravel,
  getMyTravelRequests,
  getCompanyTravelRequests,
  updateTravelStatus,
} = require("../controllers/travelController");

const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");
const billUpload = require("../middleware/billUpload");

// Travel Reimbursement routes
router.post("/", auth, checkPermission("Travel Reimbursement"), billUpload, createTravel);
router.get("/me", auth, checkPermission("Travel Reimbursement"), getMyTravelRequests);
router.get("/", auth, checkPermission("Travel Reimbursement"), getCompanyTravelRequests);
router.put("/:id/status", auth, checkPermission("Travel Reimbursement"), updateTravelStatus);

module.exports = router;
