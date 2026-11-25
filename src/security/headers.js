// Header policy is applied centrally in src/utils/response.js.
// This module exports a small policy description for tests/documentation.
export const SECURITY_HEADER_POLICY = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
});
