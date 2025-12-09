import { getSignedVideoUrl } from "@/lib/getSignedVideoUrl";

export async function POST(req) {
  const { userId, videoId, key } = await req.json();

  if (!userId || !videoId || !key) {
    return new Response(
      JSON.stringify({ error: "Missing userId, videoId, or key" }),
      { status: 400 }
    );
  }

  // 1️⃣ Verify purchase on process-server
  const verify = await fetch(
    "https://process-server.vercel.app/api/check-purchase",
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

  // 2️⃣ Purchased — generate signed download URL
  const signedUrl = await getSignedVideoUrl(key, 3600); // 1 hour expiry

  return new Response(JSON.stringify({ url: signedUrl }), {
    headers: { "Content-Type": "application/json" },
  });
}
