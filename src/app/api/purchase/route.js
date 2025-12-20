export const runtime = "nodejs";

const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL;

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    },
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return new Response("Missing videoId", { status: 400 });
  }

  // 🔒 Server-to-server call (NOT exposed)
  const res = await fetch(`${process.env.PROCESS_SERVER_URL}/api/tg-purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "X-Internal-Token": process.env.INTERNAL_API_TOKEN,
      Vary: "Origin",
    },
    body: JSON.stringify({ videoId }),
  });

  if (!res.ok) {
    return new Response("Unable to create checkout", { status: 502 });
  }

  const { checkoutUrl } = await res.json();

  return Response.redirect(checkoutUrl, 302);
}
