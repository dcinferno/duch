export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendTelegramMessage } from "../../../../lib/telegram";
import { bot } from "@/lib/telegramBot.js";
/* --------------------------------------------------
   GET — Repost Telegram message for a video
   URL: /api/telegram/:videoId
-------------------------------------------------- */
export async function GET(req, { params }) {
  try {
    const { videoId } = (await params) || {};

    if (!videoId) {
      return new NextResponse("Missing videoId", { status: 400 });
    }

    // --------------------------------------------------
    // Fetch fully-computed video (discounts + pricing)
    // --------------------------------------------------
    const { origin } = new URL(req.url);

    const res = await fetch(`${origin}/api/videos/${videoId}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Video fetch failed: ${res.status} ${text}`);
    }

    const video = await res.json();

    if (!video || !video._id) {
      return new NextResponse("Invalid video response", { status: 500 });
    }

    // --------------------------------------------------
    // Send Telegram post (existing logic)
    // --------------------------------------------------
    await sendTelegramMessage(video);

    return new NextResponse(`✅ Telegram post sent for "${video.title}"`, {
      status: 200,
    });
  } catch (err) {
    console.error("Telegram repost error:", err);
    return new NextResponse("Failed to send Telegram post", {
      status: 500,
    });
  }
}
