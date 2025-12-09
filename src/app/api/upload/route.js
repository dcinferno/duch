import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "@/lib/pushrS3";

export async function POST(req) {
  try {
    const {
      secret,
      fileName,
      contentType,
      folder,
      isPublic = true,
    } = await req.json();

    // Validate secret
    if (secret !== process.env.UPLOAD_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "Missing fileName or contentType" },
        { status: 400 }
      );
    }

    // Unique S3 filename
    const uniqueName = `${nanoid(10)}-${fileName}`;
    const key = folder ? `${folder}/${uniqueName}` : uniqueName;

    // Generate S3 "signed" upload URL (Pushr accepts PUT without signing)
    const uploadUrl = `${process.env.PUSHR_ENDPOINT}/${process.env.PUSHR_BUCKET_ID}/${key}`;

    const aclValue = isPublic ? "public-read" : "private";

    // Preflight object so PUT works later
    const command = new PutObjectCommand({
      Bucket: process.env.PUSHR_BUCKET_ID,
      Key: key,
      Body: new Uint8Array(), // 0-byte placeholder to reserve key
      ContentType: contentType,
      ACL: aclValue,
    });

    await s3.send(command);

    // Construct URL exactly like your CDN expects
    const publicUrl = `${process.env.PUSHR_CDN_URL.replace(/\/$/, "")}/${key}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      acl: aclValue,
    });
  } catch (err) {
    console.error("❌ uploadUrl error:", err);
    return NextResponse.json(
      { error: "Upload URL generation failed" },
      { status: 500 }
    );
  }
}
