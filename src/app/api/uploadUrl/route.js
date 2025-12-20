import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

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
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req) {
  try {
    const {
      secret,
      fileName,
      contentType,
      folder,
      customKey,
      isPublic = true,
    } = await req.json();

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

    // Determine extension
    const ext = fileName.includes(".")
      ? fileName.substring(fileName.lastIndexOf("."))
      : "";

    // SUPPORT BOTH:
    // - customKey → exact full video path
    // - folder → for thumbnails & previews
    let key;

    if (customKey) {
      // EXAMPLE: "angel/full/fullvideo.mp4"
      key = customKey;
    } else {
      const uniqueName = `${nanoid(10)}${ext}`;
      key = folder ? `${folder}/${uniqueName}` : uniqueName;
    }

    // ACL: public or private
    const aclSetting = isPublic ? "public-read" : "private";

    const command = new PutObjectCommand({
      Bucket: PUSHR_BUCKET_ID,
      Key: key,
      ContentType: contentType,
      ACL: aclSetting,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    // Only public assets get a CDN URL
    const publicUrl = isPublic
      ? `${PUSHR_CDN_URL.replace(/\/$/, "")}/${key}`
      : null;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      isPublic,
    });
  } catch (err) {
    console.error("❌ Failed to generate upload URL:", err);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
