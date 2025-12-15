import crypto from "crypto";

export function generateBunnySignedUrl(
  path,
  expiresInSeconds = 600 // 10 minutes
) {
  const base = process.env.BUNNY_PULL_ZONE_URL; // https://mysite-full-beta.b-cdn.net
  const secret = process.env.BUNNY_SIGNING_KEY;

  if (!base || !secret) {
    throw new Error("Missing Bunny env vars");
  }

  const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // Bunny signing format
  const stringToSign = `${path}${expiry}${secret}`;

  const token = crypto.createHash("md5").update(stringToSign).digest("hex");

  return `${base}${path}?expires=${expiry}&token=${token}`;
}
