// app/api/bundle/route.js
import { connectToDB } from "@/lib/mongodb";
import Bundle from "@/models/bundles";
import Video from "@/models/videos";
import Creator from "@/models/creators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/bundle?id=...
 * GET /api/bundle?creatorId=...
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const bundleId = searchParams.get("id");
  const creatorId = searchParams.get("creatorId");

  if (!bundleId && !creatorId) {
    return Response.json([], { status: 200 });
  }

  await connectToDB();

  // --------------------------------------------------
  // 1️⃣ Fetch bundle(s)
  // --------------------------------------------------
  const query = {
    active: true,
    ...(bundleId ? { _id: bundleId } : { creatorId }),
  };

  const bundles = await Bundle.find(query).lean();

  if (!bundles.length) {
    return Response.json(bundleId ? null : [], { status: 200 });
  }

  // --------------------------------------------------
  // 2️⃣ Fetch creator ONCE (single creator per request)
  // --------------------------------------------------
  const creator = await Creator.findById(bundles[0].creatorId, {
    name: 1,
    telegramId: 1,
    url: 1,
  }).lean();

  // --------------------------------------------------
  // 3️⃣ Fetch videos (titles only)
  // --------------------------------------------------
  const allVideoIds = bundles.flatMap((b) => b.videoIds);
  const videos = await Video.find(
    { _id: { $in: allVideoIds } },
    { title: 1 }
  ).lean();

  const videoMap = Object.fromEntries(videos.map((v) => [v._id.toString(), v]));

  // --------------------------------------------------
  // 4️⃣ Shape response (SINGLE SHAPE, ALWAYS)
  // --------------------------------------------------
  const shaped = bundles.map((b) => ({
    _id: b._id,
    name: b.name,
    description: b.description,
    price: b.price,
    creatorId: b.creatorId,

    creatorName: creator?.name || "",
    creatorTelegramId: creator?.telegramId || "",
    creatorUrl: creator?.url || "",

    videoIds: b.videoIds, // ✅ PUBLIC (safe)
    videoCount: b.videoIds.length,

    videos: b.videoIds.map((id) => videoMap[id.toString()]).filter(Boolean),
  }));

  // --------------------------------------------------
  // 5️⃣ Return correct shape
  // --------------------------------------------------
  if (bundleId) {
    return Response.json(shaped[0]);
  }

  return Response.json(shaped);
}
