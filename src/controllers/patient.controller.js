/**
 * tpex-healthcare-backend\src\controllers\patient.controller.js
 *
 * Auto-generated documentation comments.
 */
 import Patient from "../models/patient.model.js";

 // patient.controller.js
 //
 // Patient profile endpoints.
 //
 // All endpoints use req.user (set by authMiddleware) to identify the current user.
 // - registerPatient: creates/updates patient profile for the logged-in user
 // - getMyPatientProfile: returns current patient's profile
 // - updateMyPatientProfile: updates editable fields for current patient

 function normalizeEmail(email) {
   return String(email || "").trim().toLowerCase();
 }

/**
 * isValidEmail.
 */
/**
 * isValidEmail.
 */
/**
 * isValidEmail.
 */
function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/**
 * isValidPhone.
 */
/**
 * isValidPhone.
 */
/**
 * isValidPhone.
 */
function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

// Helper function to parse date of birth.
function parseDob(dob) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// Register patient endpoint.
// Creates or updates patient profile for the logged-in user.
// Validates token identity, full name, phone, email, gender, date of birth, and current location.
export async function registerPatient(req, res, next) {
  try {
    // Validate token identity.
    const userId = req.user?.sub;
    const tokenEmail = normalizeEmail(req.user?.email);

    if (!userId || !tokenEmail) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Read and validate request body.
    const fullName = String(req.body?.fullName || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const email = normalizeEmail(req.body?.email);
    const gender = String(req.body?.gender || "").trim();
    const dobParsed = parseDob(req.body?.dob);
    const currentLocation = String(req.body?.currentLocation || "").trim();

    // Validate full name.
    if (!fullName) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    // Validate phone number.
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Valid 10-digit phone is required" });
    }

    // Validate email address.
    const effectiveEmail = email || tokenEmail;
    if (!effectiveEmail || !isValidEmail(effectiveEmail)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }
    if (effectiveEmail !== tokenEmail) {
      return res.status(400).json({
        success: false,
        message: "Email must match the verified login email",
      });
    }

    // Validate gender.
    if (!gender || !["Male", "Female", "Other"].includes(gender)) {
      return res.status(400).json({ success: false, message: "Valid gender is required" });
    }

    // Validate date of birth.
    if (!dobParsed) {
      return res.status(400).json({ success: false, message: "Valid date of birth is required" });
    }
    if (dobParsed.getTime() > Date.now()) {
      return res.status(400).json({ success: false, message: "Date of birth cannot be in the future" });
    }

    // Validate current location.
    if (!currentLocation) {
      return res.status(400).json({ success: false, message: "Current location is required" });
    }

    // Check for existing phone number.
    const existingPhone = await Patient.findOne({ phone, userId: { $ne: userId } });
    if (existingPhone) {
      return res.status(409).json({ success: false, message: "Phone number already in use" });
    }

    // Upsert patient profile keyed by userId.
    const patient = await Patient.findOneAndUpdate(
      { userId },
      {
        $set: {
          fullName,
          phone,
          email: tokenEmail,
          dob: dobParsed,
          gender,
          currentLocation,
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      patient: {
        id: patient._id.toString(),
        userId: patient.userId.toString(),
        fullName: patient.fullName,
        phone: patient.phone,
        email: patient.email,
        dob: patient.dob,
        gender: patient.gender,
        currentLocation: patient.currentLocation,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// Get my patient profile endpoint.
// Returns current patient's profile.
export async function getMyPatientProfile(req, res, next) {
  try {
    // Load patient profile for the logged-in user.
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    return res.status(200).json({
      success: true,
      patient: {
        id: patient._id.toString(),
        userId: patient.userId.toString(),
        fullName: patient.fullName,
        email: patient.email,
        dob: patient.dob,
        gender: patient.gender,
        currentLocation: patient.currentLocation,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// Update my patient profile endpoint.
// Updates editable fields for current patient.
// Validates full name, phone, gender, date of birth, and current location.
export async function updateMyPatientProfile(req, res, next) {
  try {
    // Update patient profile for the logged-in user.
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const fullName = String(req.body?.fullName || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const gender = String(req.body?.gender || "").trim();
    const dobParsed = parseDob(req.body?.dob);
    const currentLocationRaw = req.body?.currentLocation;
    const currentLocation = currentLocationRaw == null ? null : String(currentLocationRaw).trim();

    if (!fullName) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Valid 10-digit phone is required" });
    }

    if (!gender || !["Male", "Female", "Other"].includes(gender)) {
      return res.status(400).json({ success: false, message: "Valid gender is required" });
    }
    if (!dobParsed) {
      return res.status(400).json({ success: false, message: "Valid date of birth is required" });
    }
    if (dobParsed.getTime() > Date.now()) {
      return res.status(400).json({ success: false, message: "Date of birth cannot be in the future" });
    }

    if (currentLocation != null && !currentLocation) {
      return res.status(400).json({ success: false, message: "Current location is required" });
    }

    const existingPhoneForUpdate = await Patient.findOne({ phone, userId: { $ne: userId } });
    if (existingPhoneForUpdate) {
      return res.status(409).json({ success: false, message: "Phone number already in use" });
    }

    patient.fullName = fullName;
    patient.phone = phone;
    patient.gender = gender;
    patient.dob = dobParsed;
    if (currentLocation != null) {
      patient.currentLocation = currentLocation;
    }
    await patient.save();

    return res.status(200).json({
      success: true,
      patient: {
        id: patient._id.toString(),
        userId: patient.userId.toString(),
        fullName: patient.fullName,
        phone: patient.phone,
        email: patient.email,
        dob: patient.dob,
        gender: patient.gender,
        currentLocation: patient.currentLocation,
      },
    });
  } catch (err) {
    return next(err);
  }
}
