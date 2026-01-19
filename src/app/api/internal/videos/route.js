export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "../../../../lib/mongodb";
import Videos from "../../../../models/videos";

export async function GET(req) {
  // 🔐 Internal auth
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");

  await connectToDB();

  let filter = {};

  // Creator scoped query
  if (creatorId) {
    filter._id= creatorId;
  }

  const videos = await Videos.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({ videos });
}
