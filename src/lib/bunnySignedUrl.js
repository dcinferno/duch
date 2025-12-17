import crypto from "crypto";

export function generateBunnySignedUrl(path, expiresInSeconds = 60 * 60) {
  const base = process.env.BUNNY_PULL_ZONE_URL; // https://mysite-full-beta.b-cdn.net
  const key = process.env.BUNNY_SIGNING_KEY; // Pull Zone → Security → Token Auth Key

  if (!base || !key) {
    throw new Error("Missing Bunny env vars");
  }

  if (!path.startsWith("/")) {
    throw new Error("Path must start with /");
  }

  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // Bunny REQUIRED format
  const hash = crypto
    .createHash("md5")
    .update(`${path}${expires}${key}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${base}${path}?expires=${expires}&token=${hash}`;
}
