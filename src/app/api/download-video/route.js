import { generatePushrSecureUrl } from "@/lib/pushrSecureToken";
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
      return new Response(
        JSON.stringify({ error: "Missing userId or videoId" }),
        { status: 400 }
      );
    }

    await connectToDB();

    const video = await Videos.findById(videoId).lean();

    if (!video || !video.fullKey) {
      return new Response(
        JSON.stringify({ error: "No full video available" }),
        { status: 400 }
      );
    }

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
      return new Response(JSON.stringify({ error: "Not purchased" }), {
        status: 403,
      });
    }

    // ✅ Generate Pushr Secure Token URL (WITH IP)
    const secureUrl = generatePushrSecureUrl(video.fullKey, 60 * 60);

    return new Response(JSON.stringify({ url: secureUrl }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        Vary: "Origin",
      },
    });
  } catch (err) {
    console.error("download-video error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500 }
    );
  }
}
