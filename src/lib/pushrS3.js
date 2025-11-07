// lib/pushrS3.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const {
  PUSHR_ENDPOINT,
  PUSHR_ACCESS_KEY,
  PUSHR_SECRET_KEY,
  PUSHR_BUCKET_ID, // e.g. "6182"
} = process.env;

if (
  !PUSHR_ENDPOINT ||
  !PUSHR_ACCESS_KEY ||
  !PUSHR_SECRET_KEY ||
  !PUSHR_BUCKET_ID
) {
  console.warn("⚠️ Missing S3 environment variables in .env.local");
}

// S3 client for Pushr
const s3 = new S3Client({
  region: "auto", // Pushr uses S3-compatible API
  endpoint: PUSHR_ENDPOINT,
  credentials: {
    accessKeyId: PUSHR_ACCESS_KEY,
    secretAccessKey: PUSHR_SECRET_KEY,
  },
  forcePathStyle: true, // required for Pushr and many S3-compatible endpoints
});

export default s3;
export const BUCKET_ID = PUSHR_BUCKET_ID;

/**
 * Upload a file to Pushr S3
 * @param {Buffer|Uint8Array|Blob|string} fileData - File content
 * @param {string} key - S3 object key (e.g., "videos/video.mp4")
 * @param {string} contentType - MIME type (e.g., "video/mp4", "image/jpeg")
 * @returns {string} public URL to the uploaded file
 */
export async function uploadToS3(fileData, key, contentType) {
  if (!fileData || !key) throw new Error("Missing fileData or key");

  const command = new PutObjectCommand({
    Bucket: BUCKET_ID,
    Key: key,
    Body: fileData,
    ContentType: contentType,
    ACL: "public-read",
  });

  await s3.send(command);

  // Construct public URL for Pushr
  return `${PUSHR_ENDPOINT.replace(/\/$/, "")}/${BUCKET_ID}/${key}`;
}
