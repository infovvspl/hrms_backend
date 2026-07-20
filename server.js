// Force reload nodemon
const express = require("express");

const cors = require("cors");

const dotenv = require("dotenv");

const session = require("express-session");

const jwt = require("jsonwebtoken");

const passport = require("passport");

const path = require("path");

dotenv.config();

const app = express();

const PORT = process.env.SERVER_PORT || 5000;

// ================= DATABASE =================
require("./src/config/database");

// ================= PASSPORT =================
require("./src/config/passport");

// ================= BODY PARSER =================
app.use(express.json({ limit: "5mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "5mb",
  }),
);

// Serve uploads folder statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request is too large. Please upload a logo up to 2MB.",
    });
  }

  next(err);
});

// ================= CORS =================
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

// ================= SESSION =================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",

    resave: false,

    saveUninitialized: false,

    cookie: {
      secure: false,

      httpOnly: true,

      sameSite: "lax",
    },
  }),
);

// ================= PASSPORT =================
app.use(passport.initialize());

app.use(passport.session());

// ================= DEBUG =================
app.use((req, res, next) => {
  console.log(`\n🔥 Incoming Request: ${req.method} ${req.url}`);

  console.log("Content-Type:", req.headers["content-type"]);

  const bodyForLog = req.body?.logo
    ? { ...req.body, logo: "[logo data omitted]" }
    : req.body;

  console.log("BODY:", bodyForLog);

  next();
});

// ================= ROUTES =================

// OTP ROUTES
const otpRoutes = require("./src/routes/otpRoutes");

// AUTH ROUTES
const authRoutes = require("./src/routes/authRoutes");

const demoRoutes = require("./src/routes/demoRoutes");

const companyRoutes = require("./src/routes/companyRoutes");

const googleAuthRoutes = require("./src/routes/googleAuthRoutes");

const branchRoutes = require("./src/routes/branchRoutes");

const roleRoutes = require("./src/routes/roleRoutes");

const designationRoutes = require("./src/routes/designationRoutes");

const departmentRoutes = require("./src/routes/departmentRoutes");

const userRoutes = require("./src/routes/userRoutes");
const attendanceRoutes = require("./src/routes/attendanceRoutes");
const holidayRoutes = require("./src/routes/holidayRoutes");
const leaveTypeRoutes = require("./src/routes/leaveTypeRoutes");
const leaveRoutes = require("./src/routes/leaveRoutes");
const faceDescriptorRoutes = require("./src/routes/faceDescriptorRoutes");
const payrollRoutes = require("./src/routes/payrollRoutes");
const loginHistoryRoutes = require("./src/routes/loginHistoryRoutes");
const resumeAnalyserRoutes = require("./src/routes/resumeAnalyserRoutes");
const assetRoutes = require("./src/routes/assetRoutes");
const travelRoutes = require("./src/routes/travelRoutes");
const permissionRoutes = require("./src/routes/permissionRoutes");


// ================= API ROUTES =================

// OTP
app.use("/api/auth", otpRoutes);

// EMAIL LOGIN + GOOGLE LOGIN
app.use("/api/auth", authRoutes);

app.use("/api/demo", demoRoutes);

app.use("/api/company", companyRoutes);

app.use("/api/auth", googleAuthRoutes);

app.use("/api/branch", branchRoutes);

app.use("/api/roles", roleRoutes);

app.use("/api/designations", designationRoutes);

app.use("/api/departments", departmentRoutes);

app.use("/api/users", userRoutes);
app.use("/api/employees", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/holiday", holidayRoutes);
app.use("/api/leave-types", leaveTypeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/face-descriptor", faceDescriptorRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/login-history", loginHistoryRoutes);
app.use("/api/resume-analyser", resumeAnalyserRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/permissions", permissionRoutes);


// ================= PROFILE ROUTE =================
// app.get(
//   "/api/profile",

//   async (req, res) => {
//     try {
//       const authHeader = req.headers.authorization;

//       if (!authHeader) {
//         return res.status(401).json({
//           success: false,

//           message: "No token provided",
//         });
//       }

//       // TOKEN
//       const token = authHeader.split(" ")[1];

//       // VERIFY
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       res.status(200).json({
//         success: true,

//         user: decoded,
//       });
//     } catch (error) {
//       console.log(error);

//       res.status(401).json({
//         success: false,

//         message: "Invalid Token",
//       });
//     }
//   },
// );

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,

    message: "HRMS API Running Successfully",
  });
});

// ================= SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
