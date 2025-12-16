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

    // -------------------------------
    // 🖼 Photo normalization (unchanged)
    // -------------------------------
    if (c.photo && !c.photo.startsWith("/")) {
      c.photo = "/" + c.photo;
    }

    if (CDN && c.photo?.startsWith("/")) {
      c.photo = CDN + c.photo;
    }

    // -------------------------------
    // 🔗 Socials normalization (NEW)
    // -------------------------------
    if (!Array.isArray(c.socials)) {
      c.socials = [];
    }

    c.socials = c.socials
      .filter(
        (s) => s && typeof s.type === "string" && typeof s.url === "string"
      )
      .map((s) => ({
        type: s.type,
        url: s.url,
      }));

    return new Response(JSON.stringify(c), { status: 200 });
  } catch (err) {
    console.error("❌ Creator GET error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
