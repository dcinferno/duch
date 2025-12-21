import { generateBunnySignedUrl } from "@/lib/bunnySignedUrl";
import Videos from "@/models/videos";
import { connectToDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TG_WINDOW_MS = 1000 * 60 * 30; // 30 minutes

export async function POST(req) {
  const { userId, videoId } = await req.json();

  if (!videoId) {
    return Response.json({ error: "Missing videoId" }, { status: 400 });
  }

  await connectToDB();

  const video = await Videos.findById(videoId).lean();
  if (!video || !video.fullKey) {
    return Response.json({ error: "No full video available" }, { status: 400 });
  }

  // ----------------------------------------
  // 1️⃣ Site purchase (ONLY if userId exists)
  // ----------------------------------------
  if (userId) {
    const verify = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/check-purchase`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, videoId }),
      }
    );

    const result = await verify.json();
    if (result?.success) {
      return Response.json({
        provider: "bunny",
        url: generateBunnySignedUrl(video.fullKey, 600),
      });
    }
  }

  // ----------------------------------------
  // 2️⃣ Telegram fallback (NO userId)
  // ----------------------------------------
  const recentTG = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/check-purchase`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        site: "TG",
        windowMs: TG_WINDOW_MS,
      }),
    }
  );

  const tgResult = await recentTG.json();
  if (!tgResult?.success) {
    return Response.json({ error: "Not purchased" }, { status: 403 });
  }

  // ----------------------------------------
  // 3️⃣ Grant access
  // ----------------------------------------
  return Response.json({
    provider: "bunny",
    url: generateBunnySignedUrl(video.fullKey, 600),
  });
}
