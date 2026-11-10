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
 // Email OTP login flow:
 // - POST /auth/login      -> generate + email a 6-digit OTP
 // - POST /auth/verify-otp -> verify OTP and issue an access token
 // - POST /auth/email-login -> legacy login WITHOUT OTP; returns 410 unless
 //                             ALLOW_EMAIL_LOGIN_WITHOUT_OTP=true

 const router = Router();

 router.post("/login", requestOtp);
 router.post("/verify-otp", verifyOtp);
 router.post("/email-login", emailLogin);

 export default router;
