export const runtime = "nodejs";

import { getSignedVideoUrl } from "@/lib/getSignedVideoUrl";
import Videos from "@/models/videos";
import { connectToDB } from "@/lib/mongodb";

const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL;

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    },
  });
}

export async function POST(req) {
  try {
    const { userId, videoId } = await req.json();

    if (!userId || !videoId) {
      return new Response("Missing userId or videoId", {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          Vary: "Origin",
        },
      });
    }

    await connectToDB();

    // Verify purchase
    const verify = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/check-purchase`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, videoId }),
      }
    );

    if (!verify.ok)
      return new Response("Error verifying purchase", {
        status: verify.status,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          Vary: "Origin",
        },
      });

    const { success } = await verify.json();

    if (!success) {
      return new Response("Not purchased", {
        status: 403,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          Vary: "Origin",
        },
      });
    }

    // Load video
    const video = await Videos.findById(videoId).lean();

    if (!video || !video.fullKey) {
      return new Response("Missing full video key", {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          Vary: "Origin",
        },
      });
    }

    // Generate signed URL (expires in 1 hour)
    const signedUrl = await getSignedVideoUrl(video.fullKey, 3600);

    return new Response(JSON.stringify({ url: signedUrl }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        Vary: "Origin",
      },
    });
  } catch {
    return new Response("Unlock error", {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        Vary: "Origin",
      },
    });
  }
}
