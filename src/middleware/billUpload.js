const multer = require("multer");
const path = require("path");
const fs = require("fs");

const allowedBillTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/bills");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "bill-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!allowedBillTypes.has(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, JPEG, and PDF files are supported for bills"));
    }
    cb(null, true);
  },
});

const billUpload = (req, res, next) => {
  upload.single("bill")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (req.file) {
      const BASE_URL = process.env.SERVER_ADDRESS
        ? `http://${process.env.SERVER_ADDRESS}:${process.env.SERVER_PORT || 5000}`
        : "http://localhost:5000";
      req.body.bill = `${BASE_URL}/uploads/bills/${req.file.filename}`;
    }

    next();
  });
};

module.exports = billUpload;
