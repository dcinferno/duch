import { connectToDB } from "@/lib/mongodb";
import VideoViews from "@/models/videoViews";

/**
 * 📊 GET — Fetch video views
 * - Supports: /api/video-views?videoIds=id1,id2,id3
 * - Also supports: /api/video-views?videoId=id1
 */
export async function GET(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    const videoIdsParam = searchParams.get("videoIds");
    const videoId = searchParams.get("videoId");

    // 🧩 Multiple video IDs (batch request)
    if (videoIdsParam) {
      const videoIds = videoIdsParam.split(",").map((id) => id.trim());
      const results = await VideoViews.aggregate([
        {
          $match: {
            videoId: { $in: videoIds.map((id) => String(id)) },
          },
        },
        {
          $group: {
            _id: "$videoId",
            totalViews: { $sum: 1 },
          },
        },
      ]);

      // Convert array → object map
      const viewsMap = Object.fromEntries(
        results.map((r) => [r._id, r.totalViews])
      );

      // Ensure all IDs exist in the map (even if 0)
      videoIds.forEach((id) => {
        if (!viewsMap[id]) viewsMap[id] = 0;
      });

      return new Response(JSON.stringify(viewsMap), { status: 200 });
    }

    // 🔹 Single videoId fallback
    if (videoId) {
      const totalViews = await VideoViews.countDocuments({
        videoId: String(videoId),
      });
      return new Response(JSON.stringify({ totalViews }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Missing videoId(s)" }), {
      status: 400,
    });
  } catch (err) {
    console.error("❌ Error fetching video views:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch video views" }),
      { status: 500 }
    );
  }
}

/**
 * 📈 POST — Log a new video view
 * - Body: { "videoId": "abc123" }
 */
export async function POST(req) {
  try {
    await connectToDB();

    const { videoId } = await req.json();

    if (!videoId) {
      return new Response(JSON.stringify({ error: "Missing videoId" }), {
        status: 400,
      });
    }

    // Normalize to string for consistent grouping
    await VideoViews.create({ videoId: String(videoId) });

    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (err) {
    console.error("❌ Error recording video view:", err);
    return new Response(
      JSON.stringify({ error: "Failed to record video view" }),
      { status: 500 }
    );
  }
}
