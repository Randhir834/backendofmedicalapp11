/**
 * tpex-healthcare-backend\src\routes\auth.routes.js
 *
 * Auto-generated documentation comments.
 */
 import { Router } from "express";
 import { requestOtp, verifyOtp, emailLogin } from "../controllers/auth.controller.js";

 // auth.routes.js
 //
 // Authentication routes.
 // This backend uses email-based login flow:
 // - POST /auth/login -> request OTP for an email (legacy)
 // - POST /auth/verify-otp -> verify OTP and create a session/token (legacy)
 // - POST /auth/email-login -> email-based login WITHOUT OTP

 const router = Router();

 router.post("/login", requestOtp);
 router.post("/verify-otp", verifyOtp);
 router.post("/email-login", emailLogin);

 export default router;
