/**
 * tpex-healthcare-backend\src\routes\patient.routes.js
 *
 * Auto-generated documentation comments.
 */
 import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { getMyPatientProfile, registerPatient, updateMyPatientProfile } from "../controllers/patient.controller.js";

// patient.routes.js
//
// Patient profile routes.
// All endpoints require authMiddleware (OTP login) because they operate
// on the currently logged-in user.
const router = Router();

// Register a new patient (requires the token from OTP verification)
router.post("/register", authMiddleware, registerPatient);
// Get the currently logged-in patient's profile
router.get("/me", authMiddleware, getMyPatientProfile);
// Update the currently logged-in patient's profile
router.put("/me", authMiddleware, updateMyPatientProfile);

export default router;
