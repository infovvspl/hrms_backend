const express = require("express");

const router = express.Router();

const { login, logout } = require("../controllers/authController");
const authmiddleware = require("../middleware/authmiddleware");

// ===============================
// EMAIL LOGIN
// ===============================
router.post("/login", login);



// ===============================
// LOGOUT (POST - JWT)
// ===============================
router.post("/logout", authmiddleware, logout);

// ===============================
// LOGOUT (GET - Passport Session)
// ===============================
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log("Logout Error:", err);
    }
    res.redirect(`${process.env.FRONTEND_URL}/login`);
  });
});

module.exports = router;
