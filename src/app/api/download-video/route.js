import { generateBunnySignedUrl } from "@/lib/bunnySignedUrl";
import Videos from "@/models/videos";
import { connectToDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const { userId, videoId } = await req.json();

  await connectToDB();

  const video = await Videos.findById(videoId).lean();

  if (!video || !video.fullKey) {
    return Response.json({ error: "No full video available" }, { status: 400 });
  }

  // 🔐 purchase verification (unchanged)
  const verify = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/check-purchase`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, videoId }),
    }
  );

  const result = await verify.json();
  if (!result.success) {
    return Response.json({ error: "Not purchased" }, { status: 403 });
  }

  // ✅ Bunny signed URL
  const signedUrl = generateBunnySignedUrl(video.fullKey, 600);

  return Response.json({
    provider: "bunny",
    url: signedUrl,
  });
}
