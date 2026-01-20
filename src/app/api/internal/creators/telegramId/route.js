// creators-repo/src/app/api/internal/creators/telegramId/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongodb";
import Creators from "@/models/creators";

export async function GET(req) {
  // 🔐 Internal service auth
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const telegramId = Number(searchParams.get("telegramId"));

  if (!telegramId) {
    return NextResponse.json({ found: false });
  }

  await connectToDB();

  const creator = await Creators.findOne(
    { telegramId }, // numeric match (your schema is Number ✅)
    { _id: 1, name: 1, urlHandle: 1, suspended: 1 }
  ).lean();

  if (!creator) {
    return NextResponse.json({ found: false });
  }

  // 🔒 Optional future: block suspended creators
  if (creator.suspended) {
    return NextResponse.json({ found: false, suspended: true });
  }

  return NextResponse.json({
    found: true,
    creator: {
      id: String(creator._id),
      name: creator.name,
      urlHandle: creator.urlHandle,
    },
  });
}
