const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");
const cors = require("cors");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// ─── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.set('trust proxy', false);

// ✅ health check route (For Uptimerobot)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/status", (req, res) => {
  res.json({
    status: "online",
    time: new Date(),
    uptime: process.uptime()
  });
});

// ─── STATIC FILES ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../public"), {
  index: false
}));

// DEFAULT LANDING PAGE ROUTE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/landing.html"));
});

// ══════════════════════════════════════════════════════════════════════════
// ─── USERSPHERE ROUTES ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
app.use("/api/auth",      require("./routes/authRoutes"));
app.use("/api/protected", require("./routes/protectedRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/admin",     require("./routes/adminRoutes"));

// ══════════════════════════════════════════════════════════════════════════
// ─── CODELENS ROUTES ──────────────────────────────────────────────────────
// Note: /api/cl prefix use kiya hai UserSphere ke /api/auth se conflict na ho
// ══════════════════════════════════════════════════════════════════════════
app.use("/api/cl/auth",   require("./codelens/routes/auth"));
app.use("/api/cl/review", require("./codelens/routes/review"));

// ─── CODELENS HEALTH CHECK ─────────────────────────────────────────────────
app.get("/api/cl/health", (req, res) => {
  res.json({
    success: true,
    message: "CodeLens API is running 🚀",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// ══════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});