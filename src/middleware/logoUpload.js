const multer = require("multer");
const fs = require("fs");
const path = require("path");

const allowedLogoTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedLogoTypes.has(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, JPEG, and SVG files are supported"));
    }
    cb(null, true);
  },
});

const logoFields = [
  { name: "logo", maxCount: 1 },
  { name: "company_logo", maxCount: 1 },
  { name: "companyLogo", maxCount: 1 },
  { name: "logo_url", maxCount: 1 },
  { name: "logoUrl", maxCount: 1 },
  { name: "stamp", maxCount: 1 },
  { name: "signature", maxCount: 1 },
];

const saveBufferToDisk = (buffer, fieldName, companyName, originalName) => {
  const cleanCompName = (companyName || "company").replace(/[^a-zA-Z0-9]/g, "_");
  const targetDir = path.join(__dirname, "../../uploads", cleanCompName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const ext = path.extname(originalName) || ".png";
  const fileName = `${fieldName}_${Date.now()}${ext}`;
  const fullPath = path.join(targetDir, fileName);
  fs.writeFileSync(fullPath, buffer);
  return `uploads/${cleanCompName}/${fileName}`;
};

const logoUpload = (req, res, next) => {
  upload.fields(logoFields)(req, res, (error) => {
    if (error) {
      const isFileSizeError = error.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({
        success: false,
        message: isFileSizeError ? "File size must be 2MB or less" : error.message,
      });
    }

    const companyName = req.body.company_name || (req.user ? req.user.company_name : "company") || "company";

    // Process Logo
    let uploadedLogo = null;
    if (req.files) {
      const logoField = ["logo", "company_logo", "companyLogo", "logo_url", "logoUrl"].find(f => req.files[f] && req.files[f][0]);
      if (logoField) {
        uploadedLogo = req.files[logoField][0];
      }
    }

    if (uploadedLogo) {
      req.body.logo = saveBufferToDisk(uploadedLogo.buffer, "logo", companyName, uploadedLogo.originalname);
    } else {
      req.body.logo =
        req.body.logo ||
        req.body.company_logo ||
        req.body.companyLogo ||
        req.body.logo_url ||
        req.body.logoUrl;
    }

    // Process Stamp
    if (req.files && req.files["stamp"] && req.files["stamp"][0]) {
      const uploadedStamp = req.files["stamp"][0];
      req.body.stamp = saveBufferToDisk(uploadedStamp.buffer, "stamp", companyName, uploadedStamp.originalname);
    }

    // Process Signature
    if (req.files && req.files["signature"] && req.files["signature"][0]) {
      const uploadedSignature = req.files["signature"][0];
      req.body.signature = saveBufferToDisk(uploadedSignature.buffer, "signature", companyName, uploadedSignature.originalname);
    }

    next();
  });
};

module.exports = logoUpload;
