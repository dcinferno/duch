// app/api/redirect/route.js
import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";

export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return Response.json({ error: "No videoId provided" }, { status: 400 });
    }

    // Increment the view count
    await Videos.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    // Fetch the video URL to redirect
    const video = await Videos.findById(videoId);
    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    // Redirect to the actual video
    return Response.redirect(video.url, 302);
  } catch (err) {
    console.error("❌ Redirect error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
