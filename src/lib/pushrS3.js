// lib/pushrS3.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Lazily read env vars so dotenv can be loaded BEFORE import
 * This avoids ESM import-order bugs.
 */
function getEnv() {
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
    throw new Error(
      "❌ Missing Pushr S3 env vars. Check .env.local or environment."
    );
  }

  return {
    PUSHR_ENDPOINT,
    PUSHR_ACCESS_KEY,
    PUSHR_SECRET_KEY,
    PUSHR_BUCKET_ID,
  };
}

/**
 * Create S3 client on demand
 * (safe for scripts + Next.js)
 */
function createS3Client() {
  const { PUSHR_ENDPOINT, PUSHR_ACCESS_KEY, PUSHR_SECRET_KEY } = getEnv();

  return new S3Client({
    region: "auto", // Pushr S3-compatible
    endpoint: PUSHR_ENDPOINT,
    credentials: {
      accessKeyId: PUSHR_ACCESS_KEY,
      secretAccessKey: PUSHR_SECRET_KEY,
    },
    forcePathStyle: true, // required for Pushr
  });
}

/**
 * Upload a file to Pushr S3
 * @param {Buffer|Uint8Array|Blob|string} fileData - File contents
 * @param {string} key - Object key (e.g. "testFull/full/video.mp4")
 * @param {string} contentType - MIME type
 * @param {boolean} isPublic - true = public-read, false = private
 * @returns {string} URL (public works immediately, private requires signed URL)
 */
export async function uploadToS3(fileData, key, contentType, isPublic = false) {
  if (!fileData) throw new Error("Missing fileData");
  if (!key) throw new Error("Missing S3 object key");

  const { PUSHR_ENDPOINT, PUSHR_BUCKET_ID } = getEnv();

  const s3 = createS3Client();

  const command = new PutObjectCommand({
    Bucket: PUSHR_BUCKET_ID,
    Key: key,
    Body: fileData,
    ContentType: contentType,
    ACL: isPublic ? "public-read" : "private",
  });

  await s3.send(command);

  return `${PUSHR_ENDPOINT.replace(/\/$/, "")}/${PUSHR_BUCKET_ID}/${key}`;
}
