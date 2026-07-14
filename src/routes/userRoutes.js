const express = require("express");
const router = express.Router();

const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  generateEmployeeOfferLetter,
  downloadEmployeeOfferLetterPdf,
  getEmployeeOfferLetterHtml,
  generateEmployeeExperienceLetter,
  downloadEmployeeExperienceLetterPdf,
  getEmployeeExperienceLetterHtml,
  generateEmployeeRelievingLetter,
  downloadEmployeeRelievingLetterPdf,
  getEmployeeRelievingLetterHtml,
  getEmployeeWarningLetters,
  createEmployeeWarningLetter,
  downloadEmployeeWarningLetterPdf,
  getEmployeeTerminationLetters,
  createEmployeeTerminationLetter,
  downloadEmployeeTerminationLetterPdf,
  getLoggedBranding
} = require("../controllers/userController");

const auth = require("../middleware/authmiddleware");
const employeeUpload = require("../middleware/employeeUpload");

// All user routes are protected by authentication middleware
router.post("/", auth, employeeUpload, createEmployee);
router.get("/", auth, getEmployees);
router.get("/:id", auth, getEmployeeById);
router.put("/:id", auth, employeeUpload, updateEmployee);
router.delete("/:id", auth, deleteEmployee);
router.get("/me/branding", auth, getLoggedBranding);

// Offer Letter
router.post("/:id/generate-offer-letter", auth, generateEmployeeOfferLetter);
router.get("/:id/download-offer-letter", auth, downloadEmployeeOfferLetterPdf);
router.get("/:id/view-offer-letter", auth, getEmployeeOfferLetterHtml);

// Experience Letter
router.post("/:id/generate-experience-letter", auth, generateEmployeeExperienceLetter);
router.get("/:id/download-experience-letter", auth, downloadEmployeeExperienceLetterPdf);
router.get("/:id/view-experience-letter", auth, getEmployeeExperienceLetterHtml);

// Relieving Letter
router.post("/:id/generate-relieving-letter", auth, generateEmployeeRelievingLetter);
router.get("/:id/download-relieving-letter", auth, downloadEmployeeRelievingLetterPdf);
router.get("/:id/view-relieving-letter", auth, getEmployeeRelievingLetterHtml);

// Warning Letters
router.get("/:id/warning-letters", auth, getEmployeeWarningLetters);
router.post("/:id/warning-letter", auth, createEmployeeWarningLetter);
router.get("/warning-letter/:letterId/download", downloadEmployeeWarningLetterPdf);

// Termination Letters
router.get("/:id/termination-letters", auth, getEmployeeTerminationLetters);
router.post("/:id/termination-letter", auth, createEmployeeTerminationLetter);
router.get("/termination-letter/:letterId/download", downloadEmployeeTerminationLetterPdf);

module.exports = router;
