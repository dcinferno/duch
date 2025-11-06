import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../../../lib/pushrS3";
import { nanoid } from "nanoid";

const { PUSHR_CDN_URL } = process.env;

function generateUniqueFileName(originalName) {
  const ext = originalName.includes(".")
    ? originalName.substring(originalName.lastIndexOf("."))
    : "";
  const base = originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");
  return `${nanoid(10)}_${base}${ext}`;
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

    const publicUrl = `${PUSHR_CDN_URL.replace(/\/$/, "")}/${key}`;

    return NextResponse.json({ url: publicUrl, key });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
