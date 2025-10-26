import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const { UPLOAD_SECRET_KEY } = process.env;

export async function POST(req) {
  try {
    const { secret, videoUrl } = await req.json();

    if (secret !== UPLOAD_SECRET_KEY) {
      return NextResponse.json(
        { error: "Unauthorized: invalid upload key" },
        { status: 403 }
      );
    }

    if (!videoUrl) {
      return NextResponse.json({ error: "Missing videoUrl" }, { status: 400 });
    }

    // Download the video temporarily (serverless functions have /tmp directory)
    const tmpDir = "/tmp";
    const tmpFile = path.join(tmpDir, `${nanoid(10)}.mp4`);

    const res = await fetch(videoUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(tmpFile, buffer);

    const outputFile = path.join(tmpDir, `${nanoid(10)}.mp4`);

    // Transcode / move moov atom to start for faststart
    await new Promise((resolve, reject) => {
      ffmpeg(tmpFile)
        .outputOptions(["-movflags +faststart"])
        .on("end", resolve)
        .on("error", reject)
        .save(outputFile);
    });

    // Read processed file back
    const processedBuffer = await fs.promises.readFile(outputFile);

    // Clean up temp files
    fs.unlink(tmpFile, () => {});
    fs.unlink(outputFile, () => {});

    // Return processed video as base64 (or upload to S3/CDN here)
    const base64Video = processedBuffer.toString("base64");

    return NextResponse.json({
      message: "Video processed successfully",
      videoBase64: base64Video,
    });
  } catch (err) {
    console.error("❌ Video processing failed:", err);
    return NextResponse.json(
      { error: "Video processing failed", details: err.message },
      { status: 500 }
    );
  }
}
