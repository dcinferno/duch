// lib/pushrS3.js
import AWS from "aws-sdk";

// Make sure these are set in your .env.local
const {
  PUSHR_ENDPOINT,
  PUSHR_ACCESS_KEY,
  PUSHR_SECRET_KEY,
  PUSHR_BUCKET_ID, // e.g., 6182
} = process.env;

// Initialize S3 client
const s3 = new AWS.S3({
  endpoint: PUSHR_ENDPOINT,
  accessKeyId: PUSHR_ACCESS_KEY,
  secretAccessKey: PUSHR_SECRET_KEY,
  s3BucketEndpoint: false, // Pushr uses bucket in path-style
  region: "de01", // optional; depends on your zone
  params: { Bucket: PUSHR_BUCKET_ID }, // numeric bucket ID
});

export default s3;
