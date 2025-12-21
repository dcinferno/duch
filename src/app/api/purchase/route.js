export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return new Response("Missing videoId", { status: 400 });
  }

  // 🔒 Server-to-server call
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/tg-purchase`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": process.env.INTERNAL_API_TOKEN,
      },
      body: JSON.stringify({ videoId }),
    }
  );

  if (!res.ok) {
    return new Response("Unable to create checkout", { status: 502 });
  }

  const { checkoutUrl } = await res.json();

  // Browser navigation → redirect (no CORS involved)
  return Response.redirect(checkoutUrl, 302);
}
