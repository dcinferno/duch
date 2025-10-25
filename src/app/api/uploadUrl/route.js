import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid"; // ✅ for unique file names

const {
  PUSHR_ENDPOINT,
  PUSHR_ACCESS_KEY,
  PUSHR_SECRET_KEY,
  PUSHR_BUCKET_ID,
  PUSHR_CDN_URL,
  UPLOAD_SECRET_KEY,
} = process.env;

const s3 = new S3Client({
  region: "auto",
  endpoint: PUSHR_ENDPOINT,
  credentials: {
    accessKeyId: PUSHR_ACCESS_KEY,
    secretAccessKey: PUSHR_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function POST(req) {
  try {
    const { secret, fileName, contentType, folder } = await req.json();

    // Validate secret key
    if (secret !== UPLOAD_SECRET_KEY) {
      return NextResponse.json(
        { error: "Unauthorized: invalid upload key" },
        { status: 403 }
      );
    }

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Missing fileName or contentType" },
        { status: 400 }
      );
    }

    // ✅ Generate unique filename
    const ext = fileName.includes(".")
      ? fileName.substring(fileName.lastIndexOf("."))
      : "";
    const uniqueName = `${nanoid(10)}${ext}`;

    // Build the full key (folder + unique name)
    const key = folder ? `${folder}/${uniqueName}` : uniqueName;

    const command = new PutObjectCommand({
      Bucket: PUSHR_BUCKET_ID,
      Key: key,
      ContentType: contentType,
      ACL: "public-read",
    });

    // Generate presigned PUT URL
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    // ✅ Build public CDN URL
    const publicUrl = `${PUSHR_CDN_URL.replace(/\/$/, "")}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error("❌ Failed to generate upload URL:", err);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
