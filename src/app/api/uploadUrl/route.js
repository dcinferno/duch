import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const {
  PUSHR_ENDPOINT,
  PUSHR_ACCESS_KEY,
  PUSHR_SECRET_KEY,
  PUSHR_BUCKET_ID,
  UPLOAD_SECRET_KEY,
} = process.env;

// Reuse S3 client
const s3 = new S3Client({
  region: "auto",
  endpoint: PUSHR_ENDPOINT,
  credentials: {
    accessKeyId: PUSHR_ACCESS_KEY,
    secretAccessKey: PUSHR_SECRET_KEY,
  },
  forcePathStyle: true, // required for Pushr
});

export async function POST(req) {
  try {
    const { secret, fileName, contentType, folder } = await req.json();

    // Secret key check
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

    // Prepend folder if provided
    const key = folder ? `${folder}/${fileName}` : fileName;

    const command = new PutObjectCommand({
      Bucket: PUSHR_BUCKET_ID,
      Key: key,
      ContentType: contentType,
      ACL: "public-read", // make uploaded file public
    });

    // Generate presigned URL valid for 5 minutes
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    // Public URL for accessing uploaded file
    const publicUrl = `${PUSHR_ENDPOINT}/${PUSHR_BUCKET_ID}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error("❌ Failed to generate upload URL:", err);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
