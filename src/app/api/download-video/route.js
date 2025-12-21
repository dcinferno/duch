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
  // 2️⃣ Verify token + resolve videoId
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

  if (!result?.success || !result.videoId) {
    return Response.json(
      { error: "Invalid or expired access token" },
      { status: 403 }
    );
  }

  const videoId = result.videoId;

  // ----------------------------------
  // 3️⃣ Fetch video
  // ----------------------------------
  await connectToDB();

  const video = await Videos.findById(videoId).lean();
  if (!video || !video.fullKey) {
    return Response.json({ error: "No full video available" }, { status: 400 });
  }

  // ----------------------------------
  // 4️⃣ Generate signed Bunny URL
  // ----------------------------------
  const signedUrl = generateBunnySignedUrl(video.fullKey, 600);

  // ----------------------------------
  // 5️⃣ Return download info
  // ----------------------------------
  return Response.json({
    provider: "bunny",
    videoId,
    url: signedUrl,
  });
}
