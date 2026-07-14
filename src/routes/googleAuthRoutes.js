const express = require("express");
const passport = require("passport");

const router = express.Router();

// ================= STEP 1: Redirect to Google =================
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// ================= STEP 2: Google Callback =================
router.get(
  "/google/callback",
  // Use custom callback so BOTH errors AND auth failures redirect properly
  (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err) {
        console.error("❌ Google OAuth strategy error:", err);
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=server_error`
        );
      }

      if (!user) {
        console.warn("⚠️ Google OAuth: no user returned. Info:", info);
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=auth_failed`
        );
      }

      const { company, token } = user;

      console.log("✅ Google OAuth success for:", company?.email);
      console.log("✅ Token generated:", token ? "YES" : "NO");

      if (!token) {
        console.error("❌ Token missing in user object:", user);
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=token_missing`
        );
      }

      // Redirect to frontend with JWT token (URL-safe base64url, no encoding needed)
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/google/callback?token=${token}`
      );
    })(req, res, next);
  }
);

module.exports = router;
