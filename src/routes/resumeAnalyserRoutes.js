const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  analyseResumes,
  updateCandidateStatuses,
  getShortlistedCandidates,
  scheduleInterview,
  getInterviewHistory
} = require("../controllers/resumeAnalyserController");
const authMiddleware = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");

// ================= MULTER CONFIG =================
// Ensure uploads/resumes directory exists
const uploadDir = path.join(__dirname, "../../uploads/resumes");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Store files on disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".pdf", ".doc", ".docx", ".txt"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${ext}. Only PDF, DOC, DOCX, and TXT are allowed.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 20, // max 20 resumes at once
  },
});

// ================= ROUTES =================

// POST /api/resume-analyser/analyse
router.post("/analyse", authMiddleware, checkPermission("Recruitment & Screening"), upload.array("resumes", 20), analyseResumes);

// POST /api/resume-analyser/update-statuses
router.post("/update-statuses", authMiddleware, checkPermission("Recruitment & Screening"), updateCandidateStatuses);

// GET /api/resume-analyser/shortlisted
router.get("/shortlisted", authMiddleware, checkPermission("Recruitment & Screening"), getShortlistedCandidates);

// POST /api/resume-analyser/schedule-interview
router.post("/schedule-interview", authMiddleware, checkPermission("Recruitment & Screening"), scheduleInterview);

// GET /api/resume-analyser/interview-history
router.get("/interview-history", authMiddleware, checkPermission("Recruitment & Screening"), getInterviewHistory);

module.exports = router;
