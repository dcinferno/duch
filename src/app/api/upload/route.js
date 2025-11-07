// lib/telegramUpload.js
import { nanoid } from "nanoid";
import fetch from "node-fetch";

/**
 * Upload a file (image/video) to S3 using your /api/upload route
 * Preserves original file extension.
 * @param {string} fileUrl - URL of file (from Telegram)
 * @param {string} folder - S3 folder to upload to
 */
export async function uploadToS3(fileUrl, folder = "videos") {
  // Fetch the file from Telegram
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  const buffer = await res.arrayBuffer();

  // Determine file extension from URL
  const urlParts = new URL(fileUrl);
  const pathname = urlParts.pathname;
  const ext = pathname.includes(".")
    ? pathname.substring(pathname.lastIndexOf("."))
    : ".mp4"; // default to mp4

  // Generate unique filename
  const fileName = `${nanoid(10)}${ext}`;

  // Determine content type
  const contentType =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".png"
      ? "image/png"
      : ext === ".mp4" || ext === ".mov" || ext === ".mkv"
      ? "video/mp4"
      : "application/octet-stream";

  // Request signed URL from server
  const signRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.UPLOAD_SECRET_KEY,
      fileName,
      contentType,
      folder,
    }),
  });

  const { uploadUrl, publicUrl } = await signRes.json();
  if (!uploadUrl) throw new Error("Failed to get upload URL from server");

  // Upload to S3
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buffer,
  });

  return publicUrl;
}
