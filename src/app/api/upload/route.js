import { NextResponse } from "next/server";
import s3 from "../../../lib/pushrS3";

// Utility to generate unique filename
function generateUniqueFileName(originalName) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const safeName = originalName.replace(/\s+/g, "_");
  return `${timestamp}_${random}_${safeName}`;
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

    const data = await s3.upload(params).promise();
    return NextResponse.json({ url: data.Location });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
