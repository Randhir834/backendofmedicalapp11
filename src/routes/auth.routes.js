/**
 * tpex-healthcare-backend\src\routes\auth.routes.js
 *
 * Auto-generated documentation comments.
 */
 import { Router } from "express";
 import { requestOtp, verifyOtp, phoneLogin } from "../controllers/auth.controller.js";

 // auth.routes.js
 //
 // Authentication routes.
 // This backend uses an OTP-based login flow:
 // - POST /auth/login -> request OTP for an email
 // - POST /auth/verify-otp -> verify OTP and create a session/token
 // - POST /auth/phone-login -> phone-based login WITHOUT OTP

 const router = Router();

 router.post("/login", requestOtp);
 router.post("/verify-otp", verifyOtp);
 router.post("/phone-login", phoneLogin);

 export default router;
