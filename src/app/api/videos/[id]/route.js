// app/api/videos/[id]/route.js
export const runtime = "nodejs";

import { connectToDB } from "../../../../lib/mongodb.js";
import Videos from "../../../../models/videos";
import Creators from "../../../../models/creators";
import { fetchActiveDiscounts } from "../../../../lib/fetchActiveDiscounts";
const normalize = (s) => s?.trim().toLowerCase();

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(normalize);
}

function discountAppliesToVideo(discount, video) {
  if (!Array.isArray(discount.tags) || discount.tags.length === 0) {
    return true;
  }

  const videoTags = normalizeTags(video.tags);
  return discount.tags.some((t) => videoTags.includes(t));
}

function getDiscountsForVideo(video, safeDiscounts) {
  const list = [];

  if (
    safeDiscounts.global &&
    discountAppliesToVideo(safeDiscounts.global, video)
  ) {
    list.push(safeDiscounts.global);
  }

  const creatorKey = normalize(video.creatorName);
  const creatorDiscounts = safeDiscounts.creators?.[creatorKey];

  if (Array.isArray(creatorDiscounts)) {
    for (const d of creatorDiscounts) {
      if (discountAppliesToVideo(d, video)) {
        list.push(d);
      }
    }
  }

  return list;
}

function applyDiscount({ basePrice, discounts = [] }) {
  let best = null;

  for (const d of discounts) {
    if (!d || !d.type) continue;

    if (d.type === "percentage" && Number.isFinite(d.percentOff)) {
      if (
        !best ||
        (best.type === "percentage" && d.percentOff > best.percentOff)
      ) {
        best = d;
      }
      continue;
    }

    if (d.type === "fixed" && Number.isFinite(d.amount)) {
      if (!best || (best.type === "fixed" && d.amount < best.amount)) {
        best = d;
      }
    }
  }

  let finalPrice = basePrice;

  if (best?.type === "percentage") {
    finalPrice = Math.round(basePrice * (1 - best.percentOff / 100));
  } else if (best?.type === "fixed") {
    finalPrice = best.amount;
  }

  return {
    basePrice,
    finalPrice,
    appliedDiscount: best,
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

  const basePrice = Number(video.price) || 0;
  const discountsForVideo = getDiscountsForVideo(video, discounts);

  const pricing = applyDiscount({
    basePrice,
    discounts: discountsForVideo,
  });

  return Response.json({
    ...video,
    premium: Boolean(creator?.premium),
    pay: Boolean(creator?.pay),
    ...pricing,
  });
}
