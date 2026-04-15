/**
 * tpex-healthcare-backend\src\config\jwt.js
 *
 * Auto-generated documentation comments.
 */
import jwt from "jsonwebtoken";

/**
 * signAccessToken.
 */
/**
 * signAccessToken.
 */
export function signAccessToken(payload) {
  // Keep JWT payload minimal (e.g., user id + role). Avoid sensitive data
  // because JWTs are readable by anyone who possesses the token.
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error("JWT_SECRET is not configured");
    err.statusCode = 500;
    throw err;
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "30d";
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * verifyAccessToken.
 */
/**
 * verifyAccessToken.
 */
export function verifyAccessToken(token) {
  // Throws on invalid/expired tokens (jsonwebtoken errors are caught by
  // middleware higher up in the request pipeline).
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error("JWT_SECRET is not configured");
    err.statusCode = 500;
    throw err;
  }

  return jwt.verify(token, secret);
}
