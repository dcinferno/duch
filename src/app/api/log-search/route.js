export const runtime = "nodejs";

import { connectToDB } from "@/lib/mongodb";
import SearchTerm from "@/models/searchterms";

const normalize = (s = "") => s.toLowerCase().trim().replace(/\s+/g, " ");

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      query,
      resultsCount = null,
      source = "unknown",
      filters = {},
    } = body || {};

    if (!query || query.trim().length < 2) {
      return Response.json({ ok: true });
    }

    const term = normalize(query);

    await connectToDB();

    const update = {
      $inc: {
        count: 1,
        ...(resultsCount === 0 ? { zeroResultCount: 1 } : {}),
        [`sources.${source}`]: 1,
      },
      $set: {
        lastSearchedAt: new Date(),
        lastContext: {
          resultsCount,
          filters,
        },
      },
    };

    await SearchTerm.updateOne({ term }, update, { upsert: true });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("❌ log-search failed", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
