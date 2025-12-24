// app/api/videos/[id]/route.js
export const runtime = "nodejs";

import { connectToDB } from "../../../../lib/mongodb.js";
import Videos from "../../../../models/videos";
import Creators from "../../../../models/creators";
import { fetchActiveDiscounts } from "../../../../lib/fetchActiveDiscounts";
function applyDiscountToVideo(video, discounts) {
  const basePrice = Number(video.price) || 0;

  if (basePrice <= 0) {
    return { basePrice, finalPrice: basePrice, discount: null };
  }

  const creatorKey = video.creatorName?.trim().toLowerCase();

  const discount = discounts.creators?.[creatorKey] || discounts.global || null;

  if (!discount) {
    return { basePrice, finalPrice: basePrice, discount: null };
  }

  const finalPrice = discount.percentOff
    ? basePrice * (1 - discount.percentOff / 100)
    : basePrice;

  return {
    basePrice,
    finalPrice: Number(finalPrice.toFixed(2)),
    discount: {
      name: discount.name,
      percentOff: discount.percentOff,
    },
  };
}

export async function GET(req, { params }) {
  await connectToDB();
  const { id } = await params;

  const video = await Videos.findById(id).lean();
  if (!video) {
    return new Response("Not found", { status: 404 });
  }

  const creator = await Creators.findOne(
    { name: video.creatorName },
    { premium: 1, pay: 1 }
  ).lean();

  // 🔑 FETCH DISCOUNTS HERE
  const discounts = await fetchActiveDiscounts();

  const pricing = applyDiscountToVideo(video, discounts);

  return Response.json({
    ...video,
    premium: Boolean(creator?.premium),
    pay: Boolean(creator?.pay),
    ...pricing,
  });
}
