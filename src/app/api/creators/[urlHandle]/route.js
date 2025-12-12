import { connectToDB } from "@/lib/mongodb";
import Creators from "@/models/creators";

export async function GET(req, { params }) {
  await connectToDB();
  const { urlHandle } = await params;

  try {
    const CDN = process.env.CDN_URL || ""; // always prepend when defined

    const creator = await Creators.findOne({ urlHandle });

    if (!creator) {
      return new Response(JSON.stringify({ error: "Creator not found" }), {
        status: 404,
      });
    }

    const c = creator.toObject();

    // Normalize missing slash
    if (c.photo && !c.photo.startsWith("/")) {
      c.photo = "/" + c.photo;
    }

    // Always prepend CDN if photo is a relative path
    if (CDN && c.photo?.startsWith("/")) {
      c.photo = CDN + c.photo;
    }

    return new Response(JSON.stringify(c), { status: 200 });
  } catch (err) {
    console.error("❌ Creator GET error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
