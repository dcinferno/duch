// app/api/upload/route.js
import { NextResponse } from "next/server";
import s3 from "../../../lib/pushrS3";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file)
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    const params = {
      Key: file.name, // file path in bucket
      Body: buffer,
      ContentType: file.type,
      ACL: "public-read", // optional
    };

    const data = await s3.upload(params).promise();
    return NextResponse.json({ url: data.Location });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
