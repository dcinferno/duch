import crypto from "crypto";

/**
 * Generate a Pushr Secure Token URL
 *
 * @param {string} path - e.g. "/uploads/videos/123.mp4"
 * @param {number} expiresInSeconds - default 1 hour
 * @param {string} ip - visitor IP (from request)
 */
export function generatePushrSecureUrl(path, expiresInSeconds = 60 * 60, ip) {
  if (!path) throw new Error("Missing path");

  const base = process.env.PUSHR_SECURE_CDN_BASE;
  const secret = process.env.PUSHR_SECRET_TOKEN;

  if (!base || !secret) {
    throw new Error("Missing Pushr env vars");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // ⚠️ INCLUDE secret, expires, path, and IP exactly in this order
  const toHash = `${secret}${expires}${normalizedPath}${ip}`;

  const hash = crypto.createHash("md5").update(toHash).digest("base64");

  // URL-safe transform
  const safeHash = hash
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Pushr’s format (hash and expires go in the *path*, not query)
  return `${base}/${safeHash}/${expires}${normalizedPath}`;
}
