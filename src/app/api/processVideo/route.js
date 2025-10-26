import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { PUSHR_ENDPOINT, PUSHR_ACCESS_KEY, PUSHR_SECRET_KEY, PUSHR_BUCKET_ID } =
  process.env;

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
    const { key } = await req.json(); // <-- key of the uploaded video
    if (!key)
      return NextResponse.json({ error: "Missing key" }, { status: 400 });

    // Download from S3 to /tmp (Vercel serverless temp)
    const tempPath = path.join("/tmp", path.basename(key));
    const data = await s3.send(
      new GetObjectCommand({ Bucket: PUSHR_BUCKET_ID, Key: key })
    );
    const writeStream = fs.createWriteStream(tempPath);
    data.Body.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Re-encode with ffmpeg
    const optimizedPath = path.join("/tmp", "optimized-" + path.basename(key));
    await new Promise((resolve, reject) => {
      ffmpeg(tempPath)
        .outputOptions("-movflags +faststart") // make video start faster
        .on("end", resolve)
        .on("error", reject)
        .save(optimizedPath);
    });

    // Upload optimized video back to S3 (overwrite original or new key)
    const optimizedKey = key.replace(/(\.[^.]+)$/, "-optimized$1");
    const fileBuffer = fs.readFileSync(optimizedPath);
    await s3.send(
      new PutObjectCommand({
        Bucket: PUSHR_BUCKET_ID,
        Key: optimizedKey,
        Body: fileBuffer,
        ContentType: "video/mp4",
        ACL: "public-read",
      })
    );

    return NextResponse.json({ optimizedKey });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to process video" },
      { status: 500 }
    );
  }
}
