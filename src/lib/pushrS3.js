// lib/pushrS3.js
import { S3Client } from "@aws-sdk/client-s3";

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

const s3 = new S3Client({
  region: "auto", // Pushr uses S3-compatible API; region often doesn't matter
  endpoint: PUSHR_ENDPOINT,
  credentials: {
    accessKeyId: PUSHR_ACCESS_KEY,
    secretAccessKey: PUSHR_SECRET_KEY,
  },
  forcePathStyle: true, // required for Pushr and many S3-compatible endpoints
});

export default s3;
export const BUCKET_ID = PUSHR_BUCKET_ID;
