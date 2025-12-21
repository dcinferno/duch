import { connectToDB } from "@/lib/mongodb";
import VideoViews from "@/models/videoViewCounts";

/**
 * 📊 GET — Fetch video views
 * - Supports batch: /api/video-views?videoIds=id1,id2,id3
 * - Supports single: /api/video-views?videoId=id1
 */
export async function GET(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);

    const videoIdsParam = searchParams.get("videoIds");
    const videoId = searchParams.get("videoId");

    // 🧩 Batch request: fetch many video view counts
    if (videoIdsParam) {
      const videoIds = videoIdsParam.split(",").map((id) => id.trim());

      const docs = await VideoViews.find({
        videoId: { $in: videoIds },
      })
        .select({ videoId: 1, totalViews: 1 })
        .lean();

      const viewsMap = {};

      // Fill map with existing stored counts
      docs.forEach((doc) => {
        viewsMap[doc.videoId] = doc.totalViews ?? 0;
      });

      // Ensure IDs missing in DB still return 0
      videoIds.forEach((id) => {
        if (!(id in viewsMap)) viewsMap[id] = 0;
      });

      return new Response(JSON.stringify(viewsMap), { status: 200 });
    }

    // 🔹 Single video lookup
    if (videoId) {
      const doc = await VideoViews.findOne({
        videoId: String(videoId),
      }).lean();

      return new Response(
        JSON.stringify({
          totalViews: doc?.totalViews ?? 0,
        }),
        { status: 200 }
      );
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
 * 📈 POST — Record a video view
 * - Body: { videoId: "abc123", viewedAt: "2025-12-07T20:11:00Z" }
 *
 * This version:
 *   - Stores ONE document per video
 *   - Increments totalViews atomically
 *   - Updates lastViewedAt
 *   - Does NOT create thousands of rows anymore
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

    await VideoViews.updateOne(
      { videoId: String(videoId) },
      {
        $inc: { totalViews: 1 },
        $set: { lastViewedAt: new Date() },
      },
      { upsert: true }
    );

    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (err) {
    console.error("❌ Error recording video view:", err);
    return new Response(
      JSON.stringify({ error: "Failed to record video view" }),
      { status: 500 }
    );
  }
}
