// app/api/unlock-jonus/route.js
import { connectToDB } from "@/lib/mongodb"; // adjust path to your DB helper
import { NextResponse } from "next/server";
import Videos from "../../../models/videos.js";

export async function POST(req) {
  try {
    const body = await req.json();
    const { videoId, password } = body;
    console.log(videoId, password);
    if (!videoId || !password) {
      return NextResponse.json(
        { error: "Missing videoId or password" },
        { status: 400 }
      );
    }

    await connectToDB();
    const video = await Videos.findOne({ _id: videoId });
    if (!video || video.type != "image" || !video.locked) {
      return NextResponse.json(
        { error: "Video not found or not locked" },
        { status: 404 }
      );
    }

    if (video.password === password) {
      // Password correct, return unlocked URL
      return NextResponse.json({ unlockedUrl: video.url });
    } else {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
