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
  getEmployeeResignationLetters,
  createEmployeeResignationLetter,
  getEmployeeHrManager,
  getAllResignationLetters,
  getResignationLetterById,
  getLoggedBranding
} = require("../controllers/userController");

const auth = require("../middleware/authmiddleware");
const checkPermission = require("../middleware/rbacMiddleware");
const employeeUpload = require("../middleware/employeeUpload");

// All user routes are protected by authentication middleware
router.post("/", auth, checkPermission("Employee Directory"), employeeUpload, createEmployee);
router.get("/", auth, checkPermission("Employee Directory"), getEmployees);
router.get("/:id", auth, getEmployeeById);
router.put("/:id", auth, (req, res, next) => {
  // If user is updating their own profile, require 'Update My Profile' permission
  if (String(req.params.id) === String(req.user.id)) {
    return checkPermission("Update My Profile")(req, res, next);
  }
  // Otherwise, require 'Employee Directory' permission to edit other profiles
  return checkPermission("Employee Directory")(req, res, next);
}, employeeUpload, updateEmployee);
router.delete("/:id", auth, checkPermission("Employee Directory"), deleteEmployee);
router.get("/me/branding", auth, getLoggedBranding);

// Offer Letter
router.post("/:id/generate-offer-letter", auth, checkPermission("Document Manager"), generateEmployeeOfferLetter);
router.get("/:id/download-offer-letter", auth, checkPermission("Document Manager"), downloadEmployeeOfferLetterPdf);
router.get("/:id/view-offer-letter", auth, checkPermission("Document Manager"), getEmployeeOfferLetterHtml);

// Experience Letter
router.post("/:id/generate-experience-letter", auth, checkPermission("Document Manager"), generateEmployeeExperienceLetter);
router.get("/:id/download-experience-letter", auth, checkPermission("Document Manager"), downloadEmployeeExperienceLetterPdf);
router.get("/:id/view-experience-letter", auth, checkPermission("Document Manager"), getEmployeeExperienceLetterHtml);

// Relieving Letter
router.post("/:id/generate-relieving-letter", auth, checkPermission("Document Manager"), generateEmployeeRelievingLetter);
router.get("/:id/download-relieving-letter", auth, checkPermission("Document Manager"), downloadEmployeeRelievingLetterPdf);
router.get("/:id/view-relieving-letter", auth, checkPermission("Document Manager"), getEmployeeRelievingLetterHtml);

// Warning Letters
router.get("/:id/warning-letters", auth, checkPermission("Document Manager"), getEmployeeWarningLetters);
router.post("/:id/warning-letter", auth, checkPermission("Document Manager"), createEmployeeWarningLetter);
router.get("/warning-letter/:letterId/download", downloadEmployeeWarningLetterPdf);

// Termination Letters
router.get("/:id/termination-letters", auth, checkPermission("Document Manager"), getEmployeeTerminationLetters);
router.post("/:id/termination-letter", auth, checkPermission("Document Manager"), createEmployeeTerminationLetter);
router.get("/termination-letter/:letterId/download", downloadEmployeeTerminationLetterPdf);

// Resignation Letters
router.get("/:id/resignation-letters", auth, checkPermission("Document Manager"), getEmployeeResignationLetters);
router.post("/:id/resignation-letter", auth, checkPermission("Document Manager"), createEmployeeResignationLetter);
router.get("/:id/hr-manager", auth, checkPermission("Document Manager"), getEmployeeHrManager);
router.get("/resignations/all", auth, checkPermission("Document Manager"), getAllResignationLetters);
router.get("/resignation/:letterId", auth, checkPermission("Document Manager"), getResignationLetterById);

module.exports = router;
