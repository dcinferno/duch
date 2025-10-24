// app/api/uploadUrl/route.js
import { NextResponse } from "next/server";
import AWS from "aws-sdk";

export async function POST(req) {
  try {
    const { secret, fileName, contentType } = await req.json();

    // Check secret key
    if (secret !== process.env.UPLOAD_SECRET_KEY) {
      return NextResponse.json(
        { error: "Unauthorized: invalid upload key" },
        { status: 403 },
      );
    }

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Missing fileName or contentType" },
        { status: 400 },
      );
    }

    const s3 = new AWS.S3({
      endpoint: process.env.PUSHR_ENDPOINT,
      accessKeyId: process.env.PUSHR_ACCESS_KEY,
      secretAccessKey: process.env.PUSHR_SECRET_KEY,
      signatureVersion: "v4",
    });

    const params = {
      Bucket: process.env.PUSHR_BUCKET,
      Key: fileName,
      ContentType: contentType,
      ACL: "public-read",
    };

    const signedUrl = await s3.getSignedUrlPromise("putObject", {
      ...params,
      Expires: 300, // 5 minutes
    });

    return NextResponse.json({ url: signedUrl });
  } catch (err) {
    console.error("Failed to get signed URL:", err);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
