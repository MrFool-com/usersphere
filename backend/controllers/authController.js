const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Node built-in
const { Resend } = require("resend");

// =======================
// REGISTER USER
// =======================
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // Agar user hai but verified nahi — naya OTP bhej do
      if (!existingUser.isVerified) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        existingUser.emailOtp       = otp;
        existingUser.emailOtpExpire = Date.now() + 10 * 60 * 1000; // 10 min
        await existingUser.save();
        await sendOtpEmail(existingUser.email, existingUser.name, otp);
        return res.status(200).json({
          message: "OTP resent. Please verify your email.",
          email: existingUser.email
        });
      }
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // create user (unverified)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      emailOtp: otp,
      emailOtpExpire: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Send OTP email
    await sendOtpEmail(user.email, user.name, otp);

    res.status(201).json({
      message: "OTP sent to your email. Please verify to complete signup.",
      email: user.email
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// VERIFY OTP
// =======================
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified. Please login." });
    }

    // Check OTP expiry
    if (!user.emailOtp || !user.emailOtpExpire || Date.now() > user.emailOtpExpire) {
      return res.status(400).json({ message: "OTP has expired. Please sign up again to get a new OTP." });
    }

    // Check OTP match
    if (user.emailOtp !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    // Mark verified + clear OTP fields
    user.isVerified     = true;
    user.emailOtp       = null;
    user.emailOtpExpire = null;
    await user.save();

    res.status(200).json({ message: "Email verified successfully! You can now log in." });

  } catch (error) {
    console.error("OTP verify error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// LOGIN USER
// =======================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Block login if email not verified
    // strictly false check — purane users (null/undefined) ko block nahi karega
    if (user.isVerified === false) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        unverified: true,
        email: user.email
      });
    }

    // update last login time
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// FORGOT PASSWORD
// =======================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        message: "If this email is registered, a reset link has been sent."
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken  = hashedToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password.html?token=${rawToken}`;
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "UserSphere <noreply@mail.spacego.online>",
      to: user.email,
      subject: "Reset Your Password — UserSphere",
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f9f7f4; border-radius: 12px; overflow: hidden;">
          <div style="background: #0d1117; padding: 32px 40px; text-align: center;">
            <h1 style="font-family: Georgia, serif; color: #fff; font-size: 22px; margin: 0; letter-spacing: -0.3px;">
              <span style="color: #b03a30;">●</span> UserSphere
            </h1>
          </div>
          <div style="padding: 40px 40px 32px;">
            <h2 style="font-family: Georgia, serif; font-size: 24px; color: #1a1a1a; margin: 0 0 12px; letter-spacing: -0.3px;">Reset your password</h2>
            <p style="font-size: 14px; color: #9a9590; line-height: 1.7; margin: 0 0 28px;">
              Hi <strong style="color: #1a1a1a;">${user.name}</strong>, we received a request to reset your password.
              Click the button below to set a new one.
            </p>
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: #8f2c24; color: #fff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; letter-spacing: 0.2px;">
              Reset Password →
            </a>
            <div style="margin-top: 28px; padding: 14px 16px; background: rgba(143,44,36,0.06); border-left: 3px solid #8f2c24; border-radius: 0 8px 8px 0;">
              <p style="font-size: 12.5px; color: #9a9590; margin: 0; line-height: 1.6;">
                ⏰ This link expires in <strong style="color: #1a1a1a;">30 minutes</strong>.<br/>
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>

            <!-- Raw link fallback -->
            <p style="font-size: 11px; color: #bbb; margin-top: 24px; line-height: 1.6;">
              If the button doesn't work, copy this link:<br/>
              <a href="${resetUrl}" style="color: #8f2c24; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          <div style="padding: 20px 40px; border-top: 1px solid #e5e0d8; text-align: center;">
            <p style="font-size: 11px; color: #ccc; margin: 0; font-family: monospace;">© 2026 UserSphere · This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    });

    res.status(200).json({ message: "If this email is registered, a reset link has been sent." });

  } catch (error) {
    console.error("Forgot password error:", error);
    if (req.body.email) {
      await User.findOneAndUpdate(
        { email: req.body.email },
        { resetPasswordToken: null, resetPasswordExpire: null }
      );
    }
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// =======================
// RESET PASSWORD
// =======================
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken:  hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken  = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now log in." });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// =======================
// HELPER: Send OTP Email
// =======================
async function sendOtpEmail(email, name, otp) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "UserSphere <noreply@mail.spacego.online>",
    to: email,
    subject: "Your Verification Code — UserSphere",
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f9f7f4; border-radius: 12px; overflow: hidden;">

        <!-- Header -->
        <div style="background: #0d1117; padding: 32px 40px; text-align: center;">
          <h1 style="font-family: Georgia, serif; color: #fff; font-size: 22px; margin: 0; letter-spacing: -0.3px;">
            <span style="color: #b03a30;">●</span> UserSphere
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 40px 40px 32px;">
          <h2 style="font-family: Georgia, serif; font-size: 24px; color: #1a1a1a; margin: 0 0 12px; letter-spacing: -0.3px;">
            Verify your email
          </h2>
          <p style="font-size: 14px; color: #9a9590; line-height: 1.7; margin: 0 0 28px;">
            Hi <strong style="color: #1a1a1a;">${name}</strong>, enter the code below to complete your signup.
          </p>

          <!-- OTP Box -->
          <div style="text-align: center; margin: 0 0 28px;">
            <div style="display: inline-block; padding: 22px 40px; background: #0d1117; border-radius: 14px;">
              <span style="font-family: 'Courier New', monospace; font-size: 38px; font-weight: 700; letter-spacing: 10px; color: #fff;">
                ${otp}
              </span>
            </div>
          </div>

          <!-- Warning -->
          <div style="padding: 14px 16px; background: rgba(143,44,36,0.06); border-left: 3px solid #8f2c24; border-radius: 0 8px 8px 0;">
            <p style="font-size: 12.5px; color: #9a9590; margin: 0; line-height: 1.6;">
              ⏰ This code expires in <strong style="color: #1a1a1a;">10 minutes</strong>.<br/>
              If you didn't create a UserSphere account, you can safely ignore this email.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 40px; border-top: 1px solid #e5e0d8; text-align: center;">
          <p style="font-size: 11px; color: #ccc; margin: 0; font-family: monospace;">
            © 2026 UserSphere · This is an automated email, please do not reply.
          </p>
        </div>

      </div>
    `
  });
}