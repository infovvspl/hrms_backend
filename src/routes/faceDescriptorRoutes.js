const express = require("express");
const router = express.Router();

const {
  registerFaceDescriptor,
  getFaceDescriptorByUserId,
  getAllFaceDescriptors
} = require("../controllers/faceDescriptorController");

const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");

router.post("/", auth, checkPermission("Attendance Management"), registerFaceDescriptor);
router.get("/", auth, checkPermission("Attendance Management"), getAllFaceDescriptors);
router.get("/user/:user_id", auth, checkPermission("Attendance Management"), getFaceDescriptorByUserId);

module.exports = router;
