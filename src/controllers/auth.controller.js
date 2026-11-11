/**
 * tpex-healthcare-backend\src\controllers\auth.controller.js
 *
 * Auto-generated documentation comments.
 */
import User from "../models/user.model.js";
import Patient from "../models/patient.model.js";
import Doctor from "../models/doctor.model.js";
import Admin from "../models/admin.model.js";
import OtpSession from "../models/otpSession.model.js";
import { generateOtp, hashOtp, otpMatches } from "../utils/otp.util.js";
import { sendOtpEmail } from "../services/email.service.js";
import { signAccessToken } from "../config/jwt.js";
import { isTempOtpEnabled, TEMP_STATIC_OTP } from "../config/tempOtp.js";

// Normalize email to lowercase
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Validate email format
function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function isLocked(session) {
  const until = session?.lockedUntil ? new Date(session.lockedUntil).getTime() : null;
  return until != null && Number.isFinite(until) && until > Date.now();
}

function lockoutRetryAfterSeconds(session) {
  const until = session?.lockedUntil ? new Date(session.lockedUntil).getTime() : null;
  if (until == null || !Number.isFinite(until)) return 0;
  const ms = until - Date.now();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

function intEnv(name, fallback) {
  const n = Number.parseInt(String(process.env[name] ?? "").trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

// Create the bootstrap admin (ADMIN_EMAIL) if it doesn't exist yet.
async function ensureBootstrapAdmin() {
  const bootstrapAdminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  if (!bootstrapAdminEmail) return;
  await Admin.findOneAndUpdate(
    { email: bootstrapAdminEmail },
    { $setOnInsert: { email: bootstrapAdminEmail, createdByEmail: bootstrapAdminEmail } },
    { upsert: true, new: true }
  );
}

// Resolve the user's role from the database. Precedence: admin > patient > doctor.
// Returns null when the email isn't registered under any role.
async function findRegisteredRole(email) {
  const [admin, patient, doctor] = await Promise.all([
    Admin.findOne({ email }).select({ _id: 1 }).lean(),
    Patient.findOne({ email }).select({ _id: 1 }).lean(),
    Doctor.findOne({ email }).select({ _id: 1 }).lean(),
  ]);
  return admin ? "admin" : patient ? "patient" : doctor ? "doctor" : null;
}

function lockedResponse(res, session) {
  const retryAfterSeconds = lockoutRetryAfterSeconds(session);
  return res.status(429).json({
    success: false,
    code: "OTP_LOCKED",
    message: retryAfterSeconds
      ? `Too many failed attempts. Please try again in ${retryAfterSeconds} seconds.`
      : "Too many failed attempts. Please try again later.",
    retryAfterSeconds,
  });
}

/**
 * requestOtp — POST /auth/login { email }
 *
 * Generates a 6-digit OTP, stores only its hash, and emails it. The response is
 * sent only after the email provider has accepted the message, so the app never
 * shows "OTP sent" when delivery actually failed.
 */
export async function requestOtp(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    // TEMPORARY: static OTP mode — no OTP is generated or emailed.
    if (isTempOtpEnabled()) {
      // New (unregistered) emails are allowed too: after verification the app
      // sends them to the Patient / Doctor role selection.
      await ensureBootstrapAdmin();
      const role = await findRegisteredRole(email);
      return res.status(200).json({
        success: true,
        message: "Enter the temporary login code to continue",
        email,
        tempOtpMode: true,
        tempOtp: TEMP_STATIC_OTP,
        isRegistered: Boolean(role),
        cooldownSeconds: 0,
      });
    }

    const existingSession = await OtpSession.findOne({ email, verifiedAt: null }).sort({ updatedAt: -1 });

    if (isLocked(existingSession)) {
      return lockedResponse(res, existingSession);
    }

    // Resend cooldown, measured from when the last email was actually sent.
    const cooldownSeconds = Math.max(0, intEnv("OTP_RESEND_COOLDOWN_SECONDS", 30));
    const lastSentAt = existingSession?.lastSentAt ? existingSession.lastSentAt.getTime() : null;
    if (cooldownSeconds > 0 && lastSentAt != null) {
      const elapsedMs = Date.now() - lastSentAt;
      const cooldownMs = cooldownSeconds * 1000;
      if (elapsedMs >= 0 && elapsedMs < cooldownMs) {
        const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          code: "OTP_COOLDOWN",
          message: `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,
          retryAfterSeconds,
          email,
        });
      }
    }

    // Generate OTP and store only a hash in DB.
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    const expireMinutes = Math.max(1, intEnv("OTP_EXPIRE_MINUTES", 5));
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

    const session = await OtpSession.findOneAndUpdate(
      { email, verifiedAt: null },
      {
        $set: {
          otpHash,
          expiresAt,
          verifiedAt: null,
          attemptCount: 0,
          lockedUntil: null,
          lastSentAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    try {
      await sendOtpEmail({ to: email, otp });
    } catch (err) {
      console.error("[OTP Email Failed]", {
        email,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
      // Remove the unusable session so the user can retry immediately.
      await OtpSession.deleteOne({ _id: session._id }).catch(() => {});
      return res.status(502).json({
        success: false,
        code: "OTP_SEND_FAILED",
        message: "We couldn't send the OTP email right now. Please try again in a moment.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      email,
      cooldownSeconds,
      expiresInSeconds: expireMinutes * 60,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * verifyOtp
 */
export async function verifyOtp(req, res, next) {
  try {
    // Validate the email + OTP format.
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    // Dev-only escape hatch. Never honoured in production.
    const skipOtpVerification =
      process.env.NODE_ENV !== "production" && String(process.env.SKIP_OTP_VERIFICATION).trim() === "true";

    const tempOtpMode = isTempOtpEnabled();

    if (tempOtpMode) {
      // TEMPORARY: accept the fixed code. Unregistered emails continue to role
      // selection (isRegistered: false), exactly like the real OTP flow.
      if (otp !== TEMP_STATIC_OTP) {
        return res.status(400).json({ success: false, code: "OTP_INVALID", message: "Invalid OTP." });
      }
    } else if (!skipOtpVerification) {
      if (!/^[0-9]{6}$/.test(otp)) {
        return res.status(400).json({ success: false, code: "OTP_FORMAT", message: "Valid 6-digit OTP is required" });
      }

      // Find the latest unverified OTP session.
      const session = await OtpSession.findOne({ email, verifiedAt: null }).sort({ updatedAt: -1 });
      if (!session) {
        return res
          .status(400)
          .json({ success: false, code: "OTP_NOT_FOUND", message: "OTP not found. Please request a new one." });
      }

      if (isLocked(session)) {
        return lockedResponse(res, session);
      }

      if (session.expiresAt.getTime() < Date.now()) {
        return res
          .status(400)
          .json({ success: false, code: "OTP_EXPIRED", message: "OTP expired. Please request a new one." });
      }

      if (!otpMatches(otp, session.otpHash)) {
        const maxAttempts = Math.max(1, intEnv("OTP_MAX_VERIFY_ATTEMPTS", 5));
        const lockoutSeconds = Math.max(1, intEnv("OTP_LOCKOUT_SECONDS", 300));
        const nextAttempt = Number(session.attemptCount || 0) + 1;

        session.attemptCount = nextAttempt;
        if (nextAttempt >= maxAttempts) {
          session.lockedUntil = new Date(Date.now() + lockoutSeconds * 1000);
        }
        await session.save();

        if (isLocked(session)) {
          return lockedResponse(res, session);
        }

        const attemptsLeft = maxAttempts - nextAttempt;
        return res.status(400).json({
          success: false,
          code: "OTP_INVALID",
          message: `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`,
          attemptsLeft,
        });
      }

      // Mark as used atomically so the same OTP can't be redeemed twice concurrently.
      const consumed = await OtpSession.findOneAndUpdate(
        { _id: session._id, verifiedAt: null },
        { $set: { verifiedAt: new Date(), attemptCount: 0, lockedUntil: null } },
        { new: true }
      );
      if (!consumed) {
        return res
          .status(400)
          .json({ success: false, code: "OTP_NOT_FOUND", message: "OTP already used. Please request a new one." });
      }
    }

    // Ensure User record exists
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { lastLoginAt: new Date() } },
      { upsert: true, new: true }
    );

    // Bootstrap the admin account if needed
    await ensureBootstrapAdmin();

    // Determine role from the database (admin > patient > doctor)
    const role = await findRegisteredRole(email);
    const isRegistered = Boolean(role);

    // Generate access token
    const accessToken = signAccessToken({ sub: user._id.toString(), email: user.email });

    return res.status(200).json({
      success: true,
      accessToken,
      isRegistered,
      role,
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Phone-based login WITHOUT OTP
 * If phone is registered -> login
 * If phone is not registered -> return needsRegistration flag
 */
export async function emailLogin(req, res, next) {
  // This endpoint issues a token for any email with no proof of ownership, so it
  // is disabled unless explicitly re-enabled. The app uses /auth/login + /auth/verify-otp.
  if (String(process.env.ALLOW_EMAIL_LOGIN_WITHOUT_OTP).trim() !== "true") {
    return res.status(410).json({
      success: false,
      code: "OTP_REQUIRED",
      message: "Login now requires an email OTP. Please update the app to the latest version.",
    });
  }
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    // Check if email is admin first (priority check)
    const admin = await Admin.findOne({ email: normalizeEmail(email) }).select({ _id: 1, email: 1 }).lean();
    
    if (admin) {
      // Email belongs to an admin
      // Get or create user record for admin
      let user = await User.findOne({ email: normalizeEmail(email) });
      
      if (!user) {
        user = await User.create({
          email: normalizeEmail(email),
          lastLoginAt: new Date(),
        });
      } else {
        // Update last login
        user.lastLoginAt = new Date();
        await user.save();
      }

      // Generate access token
      const accessToken = signAccessToken({ sub: user._id.toString(), email: user.email });

      return res.status(200).json({
        success: true,
        accessToken,
        isRegistered: true,
        needsRegistration: false,
        role: "admin",
        email: normalizeEmail(email),
        user: {
          id: user._id.toString(),
          email: user.email,
        },
        message: "Admin login successful",
      });
    }

    // Check if email is registered with any patient or doctor
    const [patient, doctor] = await Promise.all([
      Patient.findOne({ email: normalizeEmail(email) }).select({ _id: 1, userId: 1, email: 1 }).lean(),
      Doctor.findOne({ email: normalizeEmail(email) }).select({ _id: 1, userId: 1, email: 1 }).lean(),
    ]);

    // If email is not registered, create a temporary user and token for registration
    if (!patient && !doctor) {
      // Create temporary user record for registration flow
      const tempUser = await User.create({
        email: normalizeEmail(email),
        createdAt: new Date(),
      });

      // Generate access token for registration
      const accessToken = signAccessToken({ 
        sub: tempUser._id.toString(), 
        email: tempUser.email,
        isNewUser: true 
      });

      return res.status(200).json({
        success: true,
        needsRegistration: true,
        isRegistered: false,
        email,
        accessToken, // Token so user can register
        user: {
          id: tempUser._id.toString(),
          email: tempUser.email,
        },
        message: "Email not registered. Please complete registration.",
      });
    }

    // Email is registered - log the user in
    const profile = patient || doctor;
    const role = patient ? "patient" : "doctor";
    
    // Get or create user record
    let user;
    if (profile.userId) {
      user = await User.findById(profile.userId);
    }
    
    if (!user && profile.email) {
      user = await User.findOneAndUpdate(
        { email: normalizeEmail(profile.email) },
        { $set: { lastLoginAt: new Date() } },
        { upsert: true, new: true }
      );
    }

    if (!user) {
      // Create user with email as identifier
      user = await User.create({
        email: normalizeEmail(email),
        lastLoginAt: new Date(),
      });
      
      // Update profile with userId
      if (patient) {
        await Patient.findByIdAndUpdate(profile._id, { userId: user._id });
      } else {
        await Doctor.findByIdAndUpdate(profile._id, { userId: user._id });
      }
    } else {
      // Update last login
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Generate access token
    const accessToken = signAccessToken({ sub: user._id.toString(), email: user.email });

      return res.status(200).json({
        success: true,
        accessToken,
        isRegistered: true,
        needsRegistration: false,
        role,
        email: normalizeEmail(profile.email),
        user: {
          id: user._id.toString(),
          email: user.email,
        },
      });
  } catch (err) {
    return next(err);
  }
}
