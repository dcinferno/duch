// app/api/bundle/route.js
import { connectToDB } from "@/lib/mongodb";
import Bundle from "@/models/bundles";
import Video from "@/models/videos";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const creatorId = searchParams.get("creatorId");

  if (!id && !creatorId) {
    return Response.json([], { status: 200 });
  }

  await connectToDB();

  const query = {
    active: true,
    ...(id ? { _id: id } : { creatorId }),
  };

  const bundles = await Bundle.find(query).lean();

  if (!bundles.length) {
    return Response.json([], { status: 200 });
  }

  const allVideoIds = bundles.flatMap((b) => b.videoIds);
  const videos = await Video.find(
    { _id: { $in: allVideoIds } },
    { title: 1 }
  ).lean();

  const videoMap = Object.fromEntries(videos.map((v) => [v._id.toString(), v]));

  return Response.json(
    bundles.map((b) => ({
      _id: b._id,
      name: b.name,
      description: b.description,
      price: Number(b.price),
      creatorId: b.creatorId,
      videoIds: b.videoIds.map((id) => id.toString()),
      videoCount: b.videoIds.length,
      videos: b.videoIds.map((id) => videoMap[id.toString()]).filter(Boolean),
    }))
  );
}
