/**
 * tpex-healthcare-backend\src\config\tempOtp.js
 *
 * TEMPORARY static-OTP login (development/testing only).
 *
 * While enabled:
 * - POST /auth/login does NOT generate or email an OTP.
 * - POST /auth/verify-otp accepts the fixed code below. Registered emails log in
 *   with their database role; new emails get isRegistered=false and the app
 *   shows the Patient / Doctor registration choice.
 * - The role is still resolved from the database, exactly as in the real flow.
 *
 * To restore the real email-OTP system, do ONE of:
 * - set TEMP_STATIC_OTP_ENABLED=false in the environment, or
 * - change TEMP_STATIC_OTP_DEFAULT_ENABLED below to false.
 * Then (optionally) delete this file and the `isTempOtpEnabled()` branches in
 * src/controllers/auth.controller.js — nothing else depends on it.
 */

// Default used when TEMP_STATIC_OTP_ENABLED is not set in the environment.
const TEMP_STATIC_OTP_DEFAULT_ENABLED = true;

export const TEMP_STATIC_OTP = "123456";

export function isTempOtpEnabled() {
  const raw = String(process.env.TEMP_STATIC_OTP_ENABLED ?? "").trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return TEMP_STATIC_OTP_DEFAULT_ENABLED;
}
