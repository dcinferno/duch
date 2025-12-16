"use server"; // ensures Next.js never tries to bundle this client-side

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { PUSHR_ENDPOINT, PUSHR_ACCESS_KEY, PUSHR_SECRET_KEY, PUSHR_BUCKET_ID } =
  process.env;

// 🟦 Node-compatible S3 client
const s3 = new S3Client({
  region: "auto",
  endpoint: PUSHR_ENDPOINT,
  credentials: {
    accessKeyId: PUSHR_ACCESS_KEY,
    secretAccessKey: PUSHR_SECRET_KEY,
  },
  forcePathStyle: true, // required for many S3-compatible providers
});

/**
 * Generate a signed URL for private S3 video files.
 * @param {string} key - The S3 object key (e.g. `creator/full/abc123.mp4`)
 * @param {number} expiresInSeconds - Expiration time (default: 1 hour)
 */
export async function getSignedVideoUrl(key, expiresInSeconds = 3600) {
  if (!key) throw new Error("getSignedVideoUrl: missing S3 key");

  const command = new GetObjectCommand({
    Bucket: PUSHR_BUCKET_ID,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: expiresInSeconds,
  });

  return signedUrl;
}
