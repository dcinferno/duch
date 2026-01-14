// app/api/bundle/route.js
import { connectToDB } from "@/lib/mongodb";
import Bundle from "@/models/bundles";
import Video from "@/models/videos";
import Creator from "@/models/creators";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");

  if (!creatorId) {
    return Response.json([], { status: 200 });
  }

  await connectToDB();

  // 1️⃣ Fetch creator ONCE
  const creator = await Creator.findById(creatorId).lean();

  if (!creator) {
    return Response.json([], { status: 200 });
  }

  // 2️⃣ Fetch bundles
  const bundles = await Bundle.find({
    creatorId,
    active: true,
  }).lean();

  if (!bundles.length) {
    return Response.json([], { status: 200 });
  }

  // 3️⃣ Fetch all videos used in bundles
  const allVideoIds = bundles.flatMap((b) => b.videoIds);

  const videos = await Video.find(
    { _id: { $in: allVideoIds } },
    { title: 1, thumbnail: 1 }
  ).lean();

  const videoMap = Object.fromEntries(videos.map((v) => [v._id.toString(), v]));

  // 4️⃣ Merge everything (API-level composition)
  return Response.json(
    bundles.map((b) => ({
      _id: b._id,
      name: b.name,
      description: b.description,
      price: b.price,

      // ✅ merged creator snapshot (NOT stored)
      creatorName: creator.name,
      creatorTelegramId: creator.telegramId || "",
      creatorUrl: creator.url || "",

      videoCount: b.videoIds.length,
      videos: b.videoIds.map((id) => videoMap[id.toString()]).filter(Boolean),
    }))
  );
}
