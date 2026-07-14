const multer = require("multer");
const path = require("path");
const fs = require("fs");

const allowedDocTypes = new Set(["image/png", "image/jpeg", "image/jpg", "application/pdf"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!allowedDocTypes.has(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, JPEG, and PDF files are supported"));
    }
    cb(null, true);
  },
});

const employeeFields = [
  { name: "image", maxCount: 1 },
  { name: "aadhar_card", maxCount: 1 },
  { name: "voter_card", maxCount: 1 },
  { name: "passport", maxCount: 1 },
  { name: "pan_card", maxCount: 1 },
  { name: "pancard", maxCount: 1 },
  { name: "signatures", maxCount: 1 },
];

const employeeUpload = (req, res, next) => {
  upload.fields(employeeFields)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Save relative file paths on server to req.body
    if (req.files) {
      employeeFields.forEach((field) => {
        const fileList = req.files[field.name];
        if (fileList && fileList.length > 0) {
          const file = fileList[0];
          const BASE_URL = "http://localhost:5000";
          req.body[field.name] = `${BASE_URL}/uploads/${file.filename}`;
        }
      });
    }

    // Sanitize empty strings to null for PostgreSQL fields that are not text type or have unique constraints
    const fieldsToSanitize = [
      "branch_id",
      "role_id",
      "department_id",
      "designation_id",
      "employment_type",
      "reporting_manager",
      "building_name",
      "floor_number",
      "extension",
      "seat_number",
      "current_experience",
      "total_experience",
      "dob",
      "doj",
      "doe",
      "aadhaar_number",
      "voter_id",
      "pan_number",
      "passport_number",
      "uan_number",
      "pf_number",
      "work_email",
      "middle_name",
      "mobile",
      "work_phone_number",
      "image",
      "aadhar_card",
      "voter_card",
      "passport",
      "pan_card",
      "pancard",
      "signatures"
    ];

    fieldsToSanitize.forEach((field) => {
      if (req.body[field] === "" || req.body[field] === "null" || req.body[field] === "undefined") {
        req.body[field] = null;
      }
    });

    next();
  });
};

module.exports = employeeUpload;
