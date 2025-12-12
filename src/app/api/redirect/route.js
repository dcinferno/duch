import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import VideoViews from "../../../models/videoViewCounts.js";

export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return Response.json({ error: "No videoId provided" }, { status: 400 });
    }

    const video = await Videos.findById(videoId);
    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    try {
      await VideoViews.findOneAndUpdate(
        { videoId: String(videoId) },
        {
          $inc: {
            totalViews: 1,
            "sources.telegram": 1,
          },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("Error logging view:", err);
    }

    const CDN = process.env.CDN_URL || "";
    const redirectUrl = video.url.startsWith("http")
      ? video.url
      : `${CDN}${video.url}`;

    return Response.redirect(redirectUrl, 302);
  } catch (err) {
    console.error("Redirect error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
