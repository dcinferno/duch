import { generateBunnySignedUrl } from "@/lib/bunnySignedUrl";
import Videos from "@/models/videos";
import Purchase from "@/lib/models/Purchase";
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
  // 1️⃣ Try normal site purchase verification
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
      const signedUrl = generateBunnySignedUrl(video.fullKey, 600);
      return Response.json({ provider: "bunny", url: signedUrl });
    }
  }

  // ----------------------------------------
  // 2️⃣ Fallback: Telegram purchase (time-based)
  // ----------------------------------------
  const recentTG = await Purchase.findOne({
    videoId,
    site: "TG",
    status: "paid",
    purchasedAt: { $gte: new Date(Date.now() - TG_WINDOW_MS) },
  }).lean();

  if (!recentTG) {
    return Response.json({ error: "Not purchased" }, { status: 403 });
  }

  // ----------------------------------------
  // 3️⃣ Grant access
  // ----------------------------------------
  const signedUrl = generateBunnySignedUrl(video.fullKey, 600);

  return Response.json({
    provider: "bunny",
    url: signedUrl,
  });
}
