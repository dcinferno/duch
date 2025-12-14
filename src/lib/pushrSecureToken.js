import crypto from "crypto";

export function generatePushrSecureUrl(path, expiresInSeconds = 60 * 60) {
  if (!path) throw new Error("Missing path");

  const base = process.env.PUSHR_SECURE_CDN_BASE;
  const secret = process.env.PUSHR_SECRET_TOKEN;

  if (!base || !secret) {
    throw new Error("Missing Pushr secure token env vars");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const stringToSign = `${normalizedPath}?expires=${expires}`;

  const token = crypto
    .createHmac("sha256", secret)
    .update(stringToSign)
    .digest("hex");

  return `${base}${normalizedPath}?token=${token}&expires=${expires}`;
}
