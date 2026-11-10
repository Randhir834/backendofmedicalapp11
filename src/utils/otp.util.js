/**
 * tpex-healthcare-backend\src\utils\otp.util.js
 *
 * Auto-generated documentation comments.
 */
 import crypto from "crypto";

 /**
  * generateOtp.
  */
 /**
  * generateOtp.
  */
 /**
  * generateOtp.
  */
 export function generateOtp() {
   const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
   return otp;
 }

 /**
  * hashOtp.
  */
 /**
  * hashOtp.
  */
 export function hashOtp(otp) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error("OTP_SECRET/JWT_SECRET is not configured");
    err.statusCode = 500;
    throw err;
  }
  return crypto.createHash("sha256").update(`${otp}.${secret}`).digest("hex");
 }

 /**
  * otpMatches — constant-time comparison of a submitted OTP against a stored hash.
  */
 export function otpMatches(otp, storedHash) {
  const a = Buffer.from(hashOtp(otp), "hex");
  const b = Buffer.from(String(storedHash || ""), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
 }
