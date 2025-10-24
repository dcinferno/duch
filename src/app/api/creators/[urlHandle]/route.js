import { connectToDB } from "@/lib/mongodb"; // absolute import is cleaner
import Creators from "@/models/creators";

export async function GET(req, { params }) {
  const { urlHandle } = await params;
  await connectToDB();

  try {
    const creator = await Creators.findOne({ urlHandle });

    if (!creator) {
      return new Response(JSON.stringify({ error: "Creator not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify(creator), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
