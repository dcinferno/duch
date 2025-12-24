// app/api/videos/[id]/route.js
export const runtime = "nodejs";

import { connectToDB } from "../../../../lib/mongodb.js";
import Videos from "../../../../models/videos";
import Creators from "../../../../models/creators";

export async function GET(req, { params }) {
  await connectToDB();

  const { id } = await params;

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  // 1️⃣ Fetch video by ID (NO FILTERING)
  const video = await Videos.findById(id).lean();

  if (!video) {
    return new Response("Not found", { status: 404 });
  }

  // 2️⃣ Attach creator flags (denormalized)
  const creator = await Creators.findOne(
    { name: video.creatorName },
    { premium: 1, pay: 1 }
  ).lean();

  // 3️⃣ Normalize pricing (ALWAYS present)
  const basePrice = Number(video.price) || 0;
  const finalPrice =
    typeof video.finalPrice === "number" ? video.finalPrice : basePrice;

  // 4️⃣ Return authoritative object
  return Response.json({
    ...video,
    premium: Boolean(creator?.premium),
    pay: Boolean(creator?.pay),
    basePrice,
    finalPrice,
  });
}
