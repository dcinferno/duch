// lib/telegramUpload.js
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import fetch from "node-fetch";
import s3 from "../../../lib/pushrS3";

// Utility to generate unique filename
function generateUniqueFileName(originalName) {
  // Extract extension (e.g. ".mp4", ".png")
  const ext = originalName.includes(".")
    ? originalName.substring(originalName.lastIndexOf("."))
    : "";

  // Clean base name (remove extension + spaces)
  const base = originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

  // ✅ Combine with nanoid for uniqueness
  return `${nanoid(10)}_${base}${ext}`;
}
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

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!file)
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueFileName = generateUniqueFileName(file.name);
    const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

    const params = {
      Bucket: process.env.PUSHR_BUCKET_ID, // 🔹 include bucket name
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: "public-read",
    };

    await s3.send(new PutObjectCommand(params));

    const publicUrl = `${process.env.PUSHR_CDN_URL.replace(/\/$/, "")}/${key}`;

    return NextResponse.json({ url: publicUrl, key });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
