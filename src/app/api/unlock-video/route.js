export const runtime = "nodejs";

import { getSignedVideoUrl } from "@/lib/getSignedVideoUrl";
import Videos from "@/models/videos";
import { connectToDB } from "@/lib/mongodb";

const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL;

// -----------------------------
// OPTIONS — Preflight for CORS
// -----------------------------
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    },
  });
}

// -----------------------------
// POST — Unlock video
// -----------------------------
export async function POST(req) {
  try {
    const { userId, videoId } = await req.json();

    if (!userId || !videoId) {
      return new Response("Missing userId or videoId", {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Credentials": "true",
          Vary: "Origin",
        },
      });
    }

    await connectToDB();

    // 1. Verify purchase on process server
    const verify = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/check-purchase`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, videoId }),
      }
    );

    if (!verify.ok) {
      return new Response("Error verifying purchase", {
        status: verify.status,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Credentials": "true",
          Vary: "Origin",
        },
      });
    }

    const { success } = await verify.json();
    if (!success) {
      return new Response("Not purchased", {
        status: 403,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Credentials": "true",
          Vary: "Origin",
        },
      });
    }

    // 2. Fetch video details
    const video = await Videos.findById(videoId).lean();

    if (!video || !video.fullKey) {
      return new Response("Missing full video key", {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Credentials": "true",
          Vary: "Origin",
        },
      });
    }

    // 3. Generate signed URL
    const signedUrl = await getSignedVideoUrl(video.fullKey);

    return new Response(JSON.stringify({ url: signedUrl }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
      },
    });
  } catch (err) {
    console.error("unlock-video error:", err);

    return new Response("Unlock error", {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
      },
    });
  }
}
