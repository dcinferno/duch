import { connectToDB } from "@/lib/mongodb";
import VideoViews from "@/models/videoViews";

export async function GET(req) {
  await connectToDB();
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return new Response(JSON.stringify({ error: "Missing videoId" }), {
      status: 400,
    });
  }

  const totalViews = await VideoViews.countDocuments({ videoId });
  return new Response(JSON.stringify({ totalViews }), { status: 200 });
}

export async function POST(req) {
  await connectToDB();
  const { videoId } = await req.json();

  if (!videoId) {
    return new Response(JSON.stringify({ error: "Missing videoId" }), {
      status: 400,
    });
  }

  await VideoViews.create({ videoId });
  return new Response(JSON.stringify({ success: true }), { status: 201 });
}
