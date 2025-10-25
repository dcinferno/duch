import { NextResponse } from "next/server";
import s3 from "../../../lib/pushrS3";
import { nanoid } from "nanoid"; // ✅ add this
const { PUSHR_CDN_URL } = process.env;

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

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder"); // optional

    if (!file)
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique file name
    const uniqueFileName = generateUniqueFileName(file.name);
    const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

    const params = {
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: "public-read",
    };

    // Upload to Pushr via S3 interface
    const data = await s3.upload(params).promise();

    // ✅ Return full CDN URL instead of storage endpoint
    const publicUrl = `${PUSHR_CDN_URL.replace(/\/$/, "")}/${key}`;

    return NextResponse.json({ url: publicUrl, key });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
