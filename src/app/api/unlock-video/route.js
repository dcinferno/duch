export const runtime = "nodejs";

import { getSignedVideoUrl } from "@/lib/getSignedVideoUrl";
import Videos from "@/models/videos";
import { connectToDB } from "@/lib/mongodb";

export async function POST(req) {
  const { userId, videoId } = await req.json();

  await connectToDB();

  // 1. Verify purchase via process-server
  const verify = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/check-purchase`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, videoId }),
    }
  );
  if (!verify.ok) {
    return new Response("Error verifying purchase", { status: verify.status });
  }
  const { success } = await verify.json();
  if (!success) return new Response("Not purchased", { status: 403 });

  // 2. Fetch the video to get fullKey (server-side only)
  const video = await Videos.findById(videoId).lean();

  if (!video || !video.fullKey) {
    return new Response("Missing full video key", { status: 400 });
  }

  // 3. Generate signed S3 URL for the full video
  const signedUrl = await getSignedVideoUrl(video.fullKey);

  return new Response(JSON.stringify({ url: signedUrl }), {
    headers: { "Content-Type": "application/json" },
  });
}
