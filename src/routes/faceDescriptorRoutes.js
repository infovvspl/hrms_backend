const express = require("express");
const router = express.Router();

const {
  registerFaceDescriptor,
  getFaceDescriptorByUserId,
  getAllFaceDescriptors
} = require("../controllers/faceDescriptorController");

const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");

router.post("/", auth, registerFaceDescriptor);
router.get("/", auth, getAllFaceDescriptors);
router.get("/user/:user_id", auth, getFaceDescriptorByUserId);

module.exports = router;
