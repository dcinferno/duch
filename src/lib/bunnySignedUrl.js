import crypto from "crypto";

export function generateBunnySignedUrl(
  path,
  expiresInSeconds = 3600 // ✅ 1 hour (safe for video)
) {
  const base = process.env.BUNNY_PULL_ZONE_URL; // https://mysite-full-beta.b-cdn.net
  const secret = process.env.BUNNY_SIGNING_KEY;

  if (!base || !secret) {
    throw new Error("Missing Bunny env vars");
  }

  if (!path.startsWith("/")) {
    throw new Error("Path must start with /");
  }

  const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // ✅ CORRECT ORDER
  const stringToSign = `${secret}${path}${expiry}`;

  const token = crypto.createHash("md5").update(stringToSign).digest("hex");

  return `${base}${path}?token=${token}&expires=${expiry}`;
}
