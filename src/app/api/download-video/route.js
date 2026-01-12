import { generateBunnySignedUrl } from "@/lib/bunnySignedUrl";
import Videos from "@/models/videos";
import { connectToDB } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const { token } = await req.json();

  // ----------------------------------
  // 1️⃣ Require token (only)
  // ----------------------------------
  if (!token) {
    return Response.json({ error: "Missing access token" }, { status: 400 });
  }

  // ----------------------------------
  // 2️⃣ Verify token + resolve videoId(s)
  // ----------------------------------
  const verify = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/check-purchase`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": process.env.INTERNAL_API_TOKEN,
      },
      body: JSON.stringify({ token }),
    }
  );

  let result;
  try {
    result = await verify.json();
  } catch {
    return Response.json(
      { error: "Purchase verification failed" },
      { status: 502 }
    );
  }

  if (!result?.success) {
    return Response.json(
      { error: "Invalid or expired access token" },
      { status: 403 }
    );
  }

  // ✅ NEW: normalize to array (non-breaking)
  const videoIds = Array.isArray(result.videoIds)
    ? result.videoIds
    : result.videoId
    ? [result.videoId]
    : [];

  if (videoIds.length === 0) {
    return Response.json({ error: "No videos unlocked" }, { status: 400 });
  }

  // ----------------------------------
  // 3️⃣ Fetch video(s)
  // ----------------------------------
  await connectToDB();

  const videos = await Videos.find(
    { _id: { $in: videoIds } },
    { fullKey: 1 }
  ).lean();

  if (!videos.length) {
    return Response.json(
      { error: "No full videos available" },
      { status: 400 }
    );
  }

  // ----------------------------------
  // 4️⃣ Generate signed Bunny URLs
  // ----------------------------------
  const resolved = videos.map((video) => ({
    provider: "bunny",
    videoId: video._id.toString(),
    url: generateBunnySignedUrl(video.fullKey, 600),
  }));

  // ----------------------------------
  // 5️⃣ NON-BREAKING RESPONSE
  // ----------------------------------
  // ✅ Single video → old shape
  if (resolved.length === 1) {
    return Response.json(resolved[0]);
  }

  // ✅ Multiple videos → new shape
  return Response.json({ videos: resolved });
}
