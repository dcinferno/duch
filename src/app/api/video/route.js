import { NextResponse } from "next/server";
import { connectToDB } from "../../../lib/mongodb";
import Video from "../../../models/videos";
import fs from "fs";
import path from "path";
import Busboy from "busboy";

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category");

    const filter = categoryId ? { category: categoryId } : {};

    const videos = await Video.find(filter).populate("category");
    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const uploadDir = path.join(process.cwd(), "public/uploads");

  await connectToDB();

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    let fileName = "";

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      const uniqueName = `${Date.now()}-${filename}`;
      fileName = uniqueName;

      const saveTo = path.join(uploadDir, uniqueName);
      const stream = fs.createWriteStream(saveTo);
      file.pipe(stream);
    });

    busboy.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on("finish", async () => {
      try {
        const video = await Video.create({
          title: fields.title,
          description: fields.description,
          category: fields.category,
          filename: fileName,
        });

        resolve(NextResponse.json({ success: true, video }, { status: 200 }));
      } catch (error) {
        reject(NextResponse.json({ error: error.message }, { status: 500 }));
      }
    });

    req.body.pipe(busboy);
  });
}
