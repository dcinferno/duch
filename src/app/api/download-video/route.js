import { generateBunnySignedUrl } from "@/lib/bunnySignedUrl";
import Videos from "@/models/videos";
import { connectToDB } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const { videoId, token } = await req.json();

  if (!videoId || !token) {
    return Response.json({ error: "Missing parameters" }, { status: 400 });
  }

  await connectToDB();

  const video = await Videos.findById(videoId).lean();
  if (!video || !video.fullKey) {
    return Response.json({ error: "No full video available" }, { status: 400 });
  }

  // 🔐 verify purchase via process server
  const verify = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/check-purchase`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": process.env.INTERNAL_API_TOKEN,
      },
      body: JSON.stringify({ videoId, accessToken }),
    }
  );

  const result = await verify.json();
  if (!result?.success) {
    return Response.json({ error: "Not purchased" }, { status: 403 });
  }

  const signedUrl = generateBunnySignedUrl(video.fullKey, 600);

  return Response.json({
    provider: "bunny",
    url: signedUrl,
  });
}
