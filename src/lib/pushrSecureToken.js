// lib/pushrSecureToken.js
import crypto from "crypto";

/**
 * Generate a Pushr Secure Token URL
 *
 * @param {string} path - object path, e.g. "testFull/full/video.mp4"
 * @param {number} expiresInSeconds - default 1 hour
 */
export function generatePushrSecureUrl(path, expiresInSeconds = 60 * 60) {
  if (!path) throw new Error("Missing path");

  const base = process.env.PUSHR_SECURE_CDN_BASE;
  const secret = process.env.PUSHR_SECRET_TOKEN;

  if (!base || !secret) {
    throw new Error("Missing Pushr secure token env vars");
  }

  // MUST start with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(`${normalizedPath}?expires=${expires}`)
    .digest("hex");

  return `${base}${normalizedPath}?token=${hash}&expires=${expires}`;
}
