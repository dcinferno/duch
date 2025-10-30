import { connectToDB } from "@/lib/mongodb";
import VideoViews from "@/models/videoViews";

export async function GET(req) {
  await connectToDB();
  const { searchParams } = new URL(req.url);

  const videoIdsParam = searchParams.get("videoIds"); // e.g. ?videoIds=abc,def,ghi
  const singleVideoId = searchParams.get("videoId");

  // ✅ Batch fetch: ?videoIds=abc,def,ghi
  if (videoIdsParam) {
    const ids = videoIdsParam.split(",").filter(Boolean);

    // Aggregate counts for all requested IDs
    const results = await VideoViews.aggregate([
      { $match: { videoId: { $in: ids } } },
      { $group: { _id: "$videoId", totalViews: { $sum: 1 } } },
    ]);

    // Convert to { videoId: totalViews } map
    const viewMap = {};
    for (const r of results) {
      viewMap[r._id] = r.totalViews;
    }

    // Ensure every ID is present (even if 0 views)
    for (const id of ids) {
      if (!(id in viewMap)) viewMap[id] = 0;
    }

    return new Response(JSON.stringify(viewMap), { status: 200 });
  }

  // ✅ Single video: ?videoId=abc123
  if (singleVideoId) {
    const totalViews = await VideoViews.countDocuments({
      videoId: singleVideoId,
    });
    return new Response(JSON.stringify({ totalViews }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Missing videoId(s)" }), {
    status: 400,
  });
}

export async function POST(req) {
  await connectToDB();
  const { videoId } = await req.json();

  if (!videoId) {
    return new Response(JSON.stringify({ error: "Missing videoId" }), {
      status: 400,
    });
  }

  // Simply create one record per view
  await VideoViews.create({ videoId });
  return new Response(JSON.stringify({ success: true }), { status: 201 });
}
