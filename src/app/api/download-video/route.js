import { generateBunnySignedUrl } from "@/lib/bunnySignedUrl";
import Videos from "@/models/videos";
import { connectToDB } from "@/lib/mongodb";

export async function POST(req) {
  try {
    const { userId, videoId } = await req.json();

    if (!userId || !videoId) {
      return Response.json(
        { error: "Missing userId or videoId" },
        { status: 400 }
      );
    }

    await connectToDB();

    const video = await Videos.findById(videoId).lean();

    if (!video || !video.fullKey) {
      return Response.json(
        { error: "No full video available" },
        { status: 400 }
      );
    }

    // 🔐 verify purchase (unchanged)
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
      return Response.json({ error: "Not purchased" }, { status: 403 });
    }

    // ✅ REAL DATA → Bunny signed URL
    const signedUrl = generateBunnySignedUrl(
      video.fullKey, // "/test/sample-5s.mp4"
      600
    );

    return Response.json({ url: signedUrl });
  } catch (err) {
    console.error("download-video error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
