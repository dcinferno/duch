import crypto from "crypto";

/**
 * Generate a Pushr Secure Token URL (IP-agnostic by default)
 *
 * @param {string} path - e.g. "/uploads/videos/123.mp4"
 * @param {number} expiresInSeconds - default 1 hour
 * @param {string} ip - visitor IP (default: 0.0.0.0 = not IP-bound)
 */
export function generatePushrSecureUrl(path, expiresInSeconds = 60 * 60, ip) {
  if (!path) throw new Error("Missing path");

  const base = process.env.PUSHR_SECURE_CDN_BASE;
  const secret = process.env.PUSHR_SECRET_TOKEN;

  if (!base || !secret) {
    throw new Error("Missing Pushr env vars");
  }
  const url = new URL(path);
  const host = `${url.protocol}//${url.host}`;
  const pathname = url.pathname; // /uploads/.../video.mp4
  const lastSlash = pathname.lastIndexOf("/");
  const path = pathname.slice(0, lastSlash + 1); // trailing slash REQUIRED
  const file = pathname.slice(lastSlash + 1);
  const expiresInSeconds = 3600;
  if (!path || !file) {
    throw new Error("Invalid asset URL path");
  }
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const stringToSign = `${secret}${exp}${path}${file}${ip}`;

  // md5(..., true) → raw binary digest
  const md5Raw = crypto.createHash("md5").update(stringToSign).digest();

  // base64-url encode
  const token = md5Raw
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${host}/${token}/${exp}${path}${file}`;
}
