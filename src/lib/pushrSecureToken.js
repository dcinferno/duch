import crypto from "crypto";

/**
 * Generate a Pushr Secure Token URL (IP-agnostic by default)
 *
 * @param {string} path - e.g. "/uploads/videos/123.mp4"
 * @param {number} expiresInSeconds - default 1 hour
 * @param {string} ip - visitor IP (default: 0.0.0.0 = not IP-bound)
 */
export function generatePushrSecureUrl(
  path,
  expiresInSeconds = 60 * 60,
  ip = "0.0.0.0"
) {
  if (!path) throw new Error("Missing path");

  const base = process.env.PUSHR_SECURE_CDN_BASE;
  const secret = process.env.PUSHR_SECRET_TOKEN;

  if (!base || !secret) {
    throw new Error("Missing Pushr env vars");
  }

  // Pushr expects a leading slash
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Unix timestamp (seconds)
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  /**
   * Pushr signing format:
   *   md5( secret + expires + path + ip )
   *   base64 → URL-safe
   */
  const stringToSign = `${secret}${expires}${normalizedPath}${ip}`;

  const token = crypto
    .createHash("md5")
    .update(stringToSign)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${base}/${token}/${expires}${normalizedPath}`;
}
