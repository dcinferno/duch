// app/api/redirect/route.js
import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import VideoViews from "../../../models/videoViews.js";

export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return Response.json({ error: "No videoId provided" }, { status: 400 });
    }

    // Check video exists
    const video = await Videos.findById(videoId);
    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    // 🔹 Log a new view directly using the VideoViews model
    await VideoViews.create({ videoId: String(videoId) });

    // Redirect user to the real video URL
    return Response.redirect(video.url, 302);
  } catch (err) {
    console.error("❌ Redirect error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
