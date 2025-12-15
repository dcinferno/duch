import crypto from "crypto";

export function generatePushrSecureUrl(path, expiresInSeconds = 3600, ip) {
  if (!path) throw new Error("Missing path");

  const base = process.env.PUSHR_SECURE_CDN_BASE;
  const secret = process.env.PUSHR_SECRET_TOKEN;

  if (!base || !secret) {
    throw new Error("Missing Pushr env vars");
  }

  // Build URL properly
  const url = new URL(base + path);
  const host = `${url.protocol}//${url.host}`;

  const pathname = url.pathname; // /test/sample.mp4
  const lastSlash = pathname.lastIndexOf("/");

  const pathUrl = pathname.slice(0, lastSlash + 1); // "/test/"
  const file = pathname.slice(lastSlash + 1); // "sample.mp4"

  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // ✅ THIS MUST MATCH PHP EXACTLY
  const stringToSign = `${secret}${exp}${pathUrl}${file}${ip}`;

  const md5Raw = crypto.createHash("md5").update(stringToSign).digest(); // raw binary

  const token = md5Raw
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${host}/${token}/${exp}${pathUrl}${file}`;
}
