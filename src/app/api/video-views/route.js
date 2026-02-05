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
        .select({ videoId: 1, totalViews: 1, viewedAt: 1 })
        .lean();

      const viewsMap = {};

      // Fill map with existing stored counts
      docs.forEach((doc) => {
        viewsMap[doc.videoId] = { totalViews: doc.totalViews ?? 0, viewedAt: doc.viewedAt ?? null };
      });

      // Ensure IDs missing in DB still return 0
      videoIds.forEach((id) => {
        if (!(id in viewsMap)) viewsMap[id] = { totalViews: 0, viewedAt: null };
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
 * 📈 POST — Record a video view OR fetch batch views
 * - Record view: { videoId: "abc123" }
 * - Batch fetch: { videoIds: ["id1", "id2", ...] }
 */
export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { videoId, videoIds } = body;

    // 🧩 Batch fetch: return view counts for multiple videos
    if (videoIds && Array.isArray(videoIds)) {
      const docs = await VideoViews.find({
        videoId: { $in: videoIds },
      })
        .select({ videoId: 1, totalViews: 1, viewedAt: 1 })
        .lean();

      const viewsMap = {};

      docs.forEach((doc) => {
        viewsMap[doc.videoId] = { totalViews: doc.totalViews ?? 0, viewedAt: doc.viewedAt ?? null };
      });

      videoIds.forEach((id) => {
        if (!(id in viewsMap)) viewsMap[id] = { totalViews: 0, viewedAt: null };
      });

      return new Response(JSON.stringify(viewsMap), { status: 200 });
    }

    // 🔹 Record a single view
    if (videoId) {
      await VideoViews.updateOne(
        { videoId: String(videoId) },
        {
          $inc: { totalViews: 1 },
          $set: { viewedAt: new Date() },
        },
        { upsert: true }
      );

      return new Response(JSON.stringify({ success: true }), { status: 201 });
    }

    return new Response(JSON.stringify({ error: "Missing videoId or videoIds" }), {
      status: 400,
    });
  } catch (err) {
    console.error("❌ Error in video views POST:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500 }
    );
  }
}
