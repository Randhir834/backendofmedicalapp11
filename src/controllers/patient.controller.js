/**
 * tpex-healthcare-backend\src\controllers\patient.controller.js
 *
 * Auto-generated documentation comments.
 */
 import Patient from "../models/patient.model.js";
 import User from "../models/user.model.js";

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
// Creates patient profile with the provided data.
// Simple: email + data → save to MongoDB
export async function registerPatient(req, res, next) {
  try {
    console.log('[registerPatient] Registration request received:', Object.keys(req.body));

    // Read and validate request body.
    const fullName = String(req.body?.fullName || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const tokenEmail = normalizeEmail(req.user?.email);
    if (!req.user?.sub || !tokenEmail) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const email = normalizeEmail(req.body?.email) || tokenEmail;
    const gender = String(req.body?.gender || "").trim();
    const dobParsed = parseDob(req.body?.dob);
    const currentLocation = String(req.body?.currentLocation || "").trim();

    // Validate required fields
    if (!fullName) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Valid 10-digit phone is required" });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }
    if (email !== tokenEmail) {
      return res.status(400).json({ success: false, message: "Email must match the verified login email" });
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

    if (!currentLocation) {
      return res.status(400).json({ success: false, message: "Current location is required" });
    }

    // Check for existing phone number
    const existingPhone = await Patient.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({ success: false, message: "Phone number already in use" });
    }

    // Check for existing email
    const existingEmail = await Patient.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    console.log('[registerPatient] Creating new patient for email:', email);

    // Create or find User record first
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        createdAt: new Date(),
      });
      console.log('[registerPatient] Created new user:', user._id.toString());
    }

    // Create patient profile
    const patient = await Patient.create({
      userId: user._id,
      fullName,
      phone,
      email,
      dob: dobParsed,
      gender,
      currentLocation,
    });

    console.log('[registerPatient] Patient created successfully:', patient._id.toString());

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
